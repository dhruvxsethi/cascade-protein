#!/bin/bash
set -euo pipefail

export WORKDIR=/tmp/pipeline_$$
mkdir -p "$WORKDIR/inputs" "$WORKDIR/outputs/rfd3" "$WORKDIR/outputs/mpnn/seqs" "$WORKDIR/outputs/boltz"

send_callback() {
  local payload="$1"
  curl -sf -X POST "$CALLBACK_URL" \
    -H "Content-Type: application/json" \
    -H "x-callback-secret: $CALLBACK_SECRET" \
    -d "$payload" || echo "Callback failed (non-fatal)"
}

on_error() {
  local line=$1
  local cmd=$2
  echo "ERROR at line $line: $cmd"
  send_callback "{\"jobId\":\"$JOB_ID\",\"stage\":\"failed\",\"error\":\"Line $line failed: $cmd\"}"
}
trap 'on_error $LINENO "$BASH_COMMAND"' ERR

echo "=== Pipeline starting — Job $JOB_ID ==="
echo "Designs: $DESIGN_COUNT | GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'unknown')"

# ── Download PDB ─────────────────────────────────────────────────
echo "Downloading PDB from $PDB_URL"
curl -fsSL "$PDB_URL" -o "$WORKDIR/inputs/input.pdb"
echo "PDB downloaded: $(wc -c < "$WORKDIR/inputs/input.pdb") bytes"

# ── Install ProteinMPNN ──────────────────────────────────────────
echo "Setting up ProteinMPNN..."
pip install -q torch torchvision --index-url https://download.pytorch.org/whl/cu121 2>/dev/null || true
cd /tmp
git clone -q https://github.com/dauparas/ProteinMPNN.git 2>/dev/null || true

# ── Stage 1: RFDiffusion (placeholder — copies input PDB) ────────
# TODO: Replace with real RFDiffusion once Docker image is ready.
echo "=== Stage 1: Generating backbone scaffolds ==="
N=$((${DESIGN_COUNT:-3} < 10 ? ${DESIGN_COUNT:-3} : 10))
for i in $(seq 1 "$N"); do
  cp "$WORKDIR/inputs/input.pdb" "$WORKDIR/outputs/rfd3/design_${i}.pdb"
done
export RFD3_COUNT=$N
echo "Stage 1 complete: $RFD3_COUNT scaffolds"

# ── Stage 2: ProteinMPNN ─────────────────────────────────────────
echo "=== Stage 2: ProteinMPNN sequence design ==="
export MPNN_COUNT=0
for pdb in "$WORKDIR/outputs/rfd3"/*.pdb; do
  base=$(basename "$pdb" .pdb)
  if python3 /tmp/ProteinMPNN/protein_mpnn_run.py \
    --pdb_path "$pdb" \
    --out_folder "$WORKDIR/outputs/mpnn" \
    --num_seq_per_target 8 \
    --sampling_temp "${SAMPLING_TEMP:-0.1}" \
    --seed 37 \
    --batch_size 1 2>/dev/null; then
    MPNN_COUNT=$((MPNN_COUNT + 1))
  else
    echo "MPNN skipped for $base"
  fi
done
export MPNN_COUNT
echo "Stage 2 complete: $MPNN_COUNT sequence files"

# ── Upload MPNN results to Vercel Blob ───────────────────────────
echo "=== Uploading MPNN results ==="
tar -czf "$WORKDIR/rfd3.tar.gz" -C "$WORKDIR/outputs/rfd3" . 2>/dev/null || true
tar -czf "$WORKDIR/mpnn.tar.gz" -C "$WORKDIR/outputs/mpnn" . 2>/dev/null || true

upload_blob() {
  local file="$1" key="$2"
  curl -sf \
    -X PUT \
    -H "Authorization: Bearer $BLOB_TOKEN" \
    -H "Content-Type: application/gzip" \
    -H "x-cache-control-max-age: 31536000" \
    --data-binary @"$file" \
    "https://blob.vercel-storage.com/${key}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null || echo ""
}

RFD3_URL=$(upload_blob "$WORKDIR/rfd3.tar.gz" "${JOB_ID}_rfd3.tar.gz")
MPNN_URL=$(upload_blob "$WORKDIR/mpnn.tar.gz" "${JOB_ID}_mpnn.tar.gz")

# ── Progress callback (MPNN complete, Boltz-2 starting) ──────────
# This moves the UI to the "af3" stage. Pod stays alive for Stage 3.
echo "=== Sending MPNN progress update ==="
send_callback "{\"jobId\":\"$JOB_ID\",\"stage\":\"mpnn_complete\",\"rfd3OutputUrl\":\"$RFD3_URL\",\"mpnnOutputUrl\":\"$MPNN_URL\",\"rfd3Count\":$RFD3_COUNT,\"mpnnCount\":$MPNN_COUNT}"

# ── Install Boltz-2 ──────────────────────────────────────────────
echo "Installing Boltz-2..."
pip install -q "boltz[cuda]" -U 2>/dev/null || pip install -q boltz -U 2>/dev/null || echo "Boltz install warning (continuing)"

# ── Stage 3: Boltz-2 structure validation ────────────────────────
echo "=== Stage 3: Boltz-2 structure validation ==="
python3 - <<'PYEOF'
import os, json, glob, subprocess, sys

WORKDIR     = os.environ['WORKDIR']
seqs_dir    = os.path.join(WORKDIR, 'outputs', 'mpnn', 'seqs')
boltz_dir   = os.path.join(WORKDIR, 'outputs', 'boltz')
os.makedirs(boltz_dir, exist_ok=True)

PLDDT_THRESHOLD  = 70.0
MAX_DESIGNS      = 12
MAX_PER_BACKBONE = 2

# ── Parse MPNN .fa files ─────────────────────────────────────────
all_seqs = []
fa_files  = sorted(glob.glob(os.path.join(seqs_dir, '*.fa')))

if not fa_files:
    print("No MPNN sequence files found — skipping Boltz-2", file=sys.stderr)
    summary = {'total': 0, 'validated': 0, 'bestPlddt': 0.0, 'results': []}
    with open(os.path.join(boltz_dir, 'boltz_summary.json'), 'w') as f:
        json.dump(summary, f)
    sys.exit(0)

for fa_file in fa_files:
    backbone = os.path.splitext(os.path.basename(fa_file))[0]
    content  = open(fa_file).read().strip()

    # Split into (header, sequence) pairs
    entries = []
    for block in ('\n' + content).split('\n>'):
        block = block.strip()
        if not block:
            continue
        lines  = block.split('\n')
        header = lines[0].lstrip('>')
        seq    = ''.join(lines[1:]).upper().replace(' ', '')
        if seq:
            entries.append((header, seq))

    # Skip entry 0 (native/reference sequence from MPNN)
    for j, (header, seq) in enumerate(entries[1:], 1):
        score = 999.0
        for part in header.split(','):
            part = part.strip()
            # Match "score=-1.2345" but not "global_score=..."
            if part.startswith('score='):
                try:
                    score = float(part.split('=', 1)[1])
                    break
                except ValueError:
                    pass
        all_seqs.append({'score': score, 'backbone': backbone, 'idx': j, 'seq': seq})

# Sort ascending — lower MPNN score = higher per-residue log prob = better
all_seqs.sort(key=lambda x: x['score'])

# Select top sequences: at most MAX_PER_BACKBONE per backbone, MAX_DESIGNS total
taken    = {}
selected = []
for s in all_seqs:
    b = s['backbone']
    if taken.get(b, 0) < MAX_PER_BACKBONE and len(selected) < MAX_DESIGNS:
        selected.append(s)
        taken[b] = taken.get(b, 0) + 1

print(f"Selected {len(selected)} sequences for Boltz-2 validation")

# ── Run Boltz-2 on each sequence ─────────────────────────────────
results = []
for i, s in enumerate(selected):
    name       = f"design_{i+1:03d}"
    fasta_path = os.path.join(boltz_dir, f"{name}.fasta")
    out_dir    = os.path.join(boltz_dir, f"out_{name}")

    # Boltz-2 FASTA format: >chainId|type|msa_mode
    # "empty" msa_mode means no MSA — single-sequence prediction
    with open(fasta_path, 'w') as f:
        f.write(f">A|protein|empty\n{s['seq']}\n")

    print(f"Running Boltz-2: {name}  (len={len(s['seq'])}) ...", flush=True)

    plddt    = None
    cif_path = None

    try:
        proc = subprocess.run(
            [
                'boltz', 'predict', fasta_path,
                '--out_dir',          out_dir,
                '--cache',            '/tmp/boltz_cache',
                '--recycling_steps',  '1',
                '--diffusion_samples','1',
                '--sampling_steps',   '200',
            ],
            capture_output=True, text=True, timeout=600
        )
        if proc.returncode != 0:
            tail = proc.stderr[-400:] if proc.stderr else '(no stderr)'
            print(f"  boltz exited {proc.returncode}: {tail}", file=sys.stderr)

        # Confidence JSON: boltz_results_<name>/predictions/confidence_<name>_model_0.json
        conf_files = glob.glob(
            os.path.join(out_dir, '**', 'confidence_*.json'), recursive=True
        )
        if conf_files:
            with open(conf_files[0]) as cf:
                conf = json.load(cf)
            raw = conf.get('complex_plddt', conf.get('plddt'))
            if raw is not None:
                raw   = float(raw)
                plddt = raw * 100.0 if raw <= 1.0 else raw   # normalise 0–1 → 0–100

        # CIF structure file (for potential future blob upload)
        cif_files = glob.glob(
            os.path.join(out_dir, '**', '*.cif'), recursive=True
        )
        if cif_files:
            cif_path = cif_files[0]

    except subprocess.TimeoutExpired:
        print(f"  {name}: timed out (>10 min) — skipping", file=sys.stderr)
    except FileNotFoundError:
        print("  boltz binary not found — Boltz-2 not installed correctly", file=sys.stderr)
        break
    except Exception as e:
        print(f"  {name}: unexpected error: {e}", file=sys.stderr)

    is_validated = plddt is not None and plddt >= PLDDT_THRESHOLD
    results.append({
        'designIndex': i + 1,
        'sequence':    s['seq'],
        'mpnnScore':   round(s['score'], 4),
        'backbone':    s['backbone'],
        'plddt':       round(plddt, 2) if plddt is not None else None,
        'isValidated': is_validated,
        'cifBlobUrl':  None,   # Phase 2: upload CIF to Vercel Blob
    })

    score_str = f"pLDDT={plddt:.1f}" if plddt is not None else "pLDDT=n/a"
    tick      = "✓" if is_validated else "✗"
    print(f"  {name}: {score_str} {tick}", flush=True)

# ── Write summary ─────────────────────────────────────────────────
plddts     = [r['plddt'] for r in results if r['plddt'] is not None]
best_plddt = max(plddts) if plddts else 0.0
validated  = [r for r in results if r['isValidated']]

summary = {
    'total':     len(results),
    'validated': len(validated),
    'bestPlddt': round(best_plddt, 2),
    'results':   results,
}
with open(os.path.join(boltz_dir, 'boltz_summary.json'), 'w') as f:
    json.dump(summary, f)

print(
    f"Boltz-2 complete: {len(validated)}/{len(results)} validated, "
    f"best pLDDT={best_plddt:.1f}",
    flush=True,
)
PYEOF

# ── Final callback with all design results ────────────────────────
echo "=== Sending completion callback ==="
python3 - <<'CBEOF'
import json, os, urllib.request, urllib.error

WORKDIR      = os.environ['WORKDIR']
callback_url = os.environ['CALLBACK_URL']
secret       = os.environ['CALLBACK_SECRET']
job_id       = os.environ['JOB_ID']
rfd3_count   = int(os.environ.get('RFD3_COUNT', '0'))
mpnn_count   = int(os.environ.get('MPNN_COUNT', '0'))

summary_path = os.path.join(WORKDIR, 'outputs', 'boltz', 'boltz_summary.json')

try:
    with open(summary_path) as f:
        summary = json.load(f)
except Exception as e:
    print(f"Could not read boltz_summary.json: {e}", flush=True)
    summary = {'total': 0, 'validated': 0, 'bestPlddt': 0.0, 'results': []}

# Build design payloads — strip local cifPath (not useful for API)
designs = [
    {
        'designIndex': r['designIndex'],
        'sequence':    r['sequence'],
        'mpnnScore':   r['mpnnScore'],
        'backbone':    r.get('backbone'),
        'plddt':       r['plddt'],
        'isValidated': r['isValidated'],
        'cifBlobUrl':  r.get('cifBlobUrl'),
    }
    for r in summary.get('results', [])
]

payload = {
    'jobId':          job_id,
    'stage':          'complete',
    'rfd3Count':      rfd3_count,
    'mpnnCount':      mpnn_count,
    'validatedCount': summary['validated'],
    'bestPlddt':      summary['bestPlddt'],
    'designs':        designs,
}

data = json.dumps(payload).encode('utf-8')
req  = urllib.request.Request(
    callback_url,
    data=data,
    headers={
        'Content-Type':     'application/json',
        'x-callback-secret': secret,
    },
    method='POST',
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"Completion callback sent: HTTP {resp.status}", flush=True)
except urllib.error.HTTPError as e:
    print(f"Callback HTTP error {e.code}: {e.read()[:200]}", flush=True)
except Exception as e:
    print(f"Callback failed (non-fatal): {e}", flush=True)
CBEOF

echo "=== Pipeline complete ==="
