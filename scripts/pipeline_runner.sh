#!/bin/bash
# This script runs ON the RunPod machine.
# Environment variables injected at start:
#   PDB_URL, DESIGN_COUNT, CFG_SCALE, STEP_SCALE, NUM_TIMESTEPS
#   SAMPLING_TEMP, BATCH_SIZE, JOB_ID, CALLBACK_URL, BLOB_TOKEN

set -e

echo "=== Pipeline Runner Starting ==="
echo "Job ID: $JOB_ID"
echo "Designs requested: $DESIGN_COUNT"

# Setup
pip install "rc-foundry[rfd3]" -q
foundry install rfd3 -q
pip install gemmi -q
mkdir -p /workspace/inputs /workspace/outputs/rfd3 /workspace/outputs/mpnn

# Download PDB
echo "=== Downloading PDB ==="
curl -s "$PDB_URL" -o /workspace/inputs/input.pdb

# Calculate batches
N_BATCHES=$(( ($DESIGN_COUNT + $BATCH_SIZE - 1) / $BATCH_SIZE ))

# Stage 1: RFDiffusion3
echo "=== Stage 1: RFDiffusion3 ==="
rfd3 design \
  inputs=/workspace/inputs/input.pdb \
  out_dir=/workspace/outputs/rfd3 \
  ckpt_path=rfd3 \
  skip_existing=True \
  diffusion_batch_size=$BATCH_SIZE \
  n_batches=$N_BATCHES \
  inference_sampler.use_classifier_free_guidance=True \
  inference_sampler.cfg_scale=$CFG_SCALE \
  inference_sampler.step_scale=$STEP_SCALE \
  inference_sampler.num_timesteps=$NUM_TIMESTEPS \
  cleanup_guideposts=True \
  cleanup_virtual_atoms=True \
  read_sequence_from_sequence_head=True \
  output_full_json=True \
  dump_prediction_metadata_json=True \
  prevalidate_inputs=True

echo "RFD3 complete. Files: $(ls /workspace/outputs/rfd3/*.cif 2>/dev/null | wc -l)"

# Convert CIF to PDB
echo "=== Converting CIF to PDB ==="
gunzip /workspace/outputs/rfd3/*.gz 2>/dev/null || true
python3 -c "
import gemmi, glob
for f in glob.glob('/workspace/outputs/rfd3/*.cif'):
    try:
        st = gemmi.read_structure(f)
        st.write_pdb(f.replace('.cif', '.pdb'))
    except Exception as e:
        print(f'Skip {f}: {e}')
"

# Stage 2: ProteinMPNN
echo "=== Stage 2: ProteinMPNN ==="
cd /workspace
git clone -q https://github.com/dauparas/ProteinMPNN.git || true
mkdir -p /workspace/outputs/mpnn

for pdb in /workspace/outputs/rfd3/*.pdb; do
  python3 /workspace/ProteinMPNN/protein_mpnn_run.py \
    --pdb_path "$pdb" \
    --out_folder /workspace/outputs/mpnn \
    --num_seq_per_target 8 \
    --sampling_temp "$SAMPLING_TEMP" \
    --seed 37 \
    --batch_size 1 2>/dev/null || echo "MPNN failed for $pdb"
done

echo "MPNN complete. Files: $(ls /workspace/outputs/mpnn/seqs/*.fa 2>/dev/null | wc -l)"

# Package outputs
echo "=== Packaging outputs ==="
tar -czf /workspace/rfd3_outputs.tar.gz -C /workspace/outputs/rfd3 . 2>/dev/null || true
tar -czf /workspace/mpnn_outputs.tar.gz -C /workspace/outputs/mpnn . 2>/dev/null || true

# Upload to Vercel Blob using their REST API
echo "=== Uploading results ==="
RFD3_UPLOAD=$(curl -s \
  --request PUT \
  --header "Authorization: Bearer $BLOB_TOKEN" \
  --header "x-content-type: application/gzip" \
  --header "x-cache-control-max-age: 31536000" \
  --data-binary @/workspace/rfd3_outputs.tar.gz \
  "https://blob.vercel-storage.com/${JOB_ID}_rfd3.tar.gz")
RFD3_URL=$(echo "$RFD3_UPLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))")

MPNN_UPLOAD=$(curl -s \
  --request PUT \
  --header "Authorization: Bearer $BLOB_TOKEN" \
  --header "x-content-type: application/gzip" \
  --header "x-cache-control-max-age: 31536000" \
  --data-binary @/workspace/mpnn_outputs.tar.gz \
  "https://blob.vercel-storage.com/${JOB_ID}_mpnn.tar.gz")
MPNN_URL=$(echo "$MPNN_UPLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))")

RFD3_COUNT=$(ls /workspace/outputs/rfd3/*.pdb 2>/dev/null | wc -l | tr -d ' ')
MPNN_COUNT=$(ls /workspace/outputs/mpnn/seqs/*.fa 2>/dev/null | wc -l | tr -d ' ')

# Callback to our API
echo "=== Sending callback ==="
curl -s -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"$JOB_ID\",\"stage\":\"mpnn_complete\",\"rfd3OutputUrl\":\"$RFD3_URL\",\"mpnnOutputUrl\":\"$MPNN_URL\",\"rfd3Count\":$RFD3_COUNT,\"mpnnCount\":$MPNN_COUNT}"

echo "=== Pipeline complete ==="
