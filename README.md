# Cascade — Automated Protein Design Pipeline

**Live:** https://cascade-protein.vercel.app  
**GitHub:** https://github.com/dhruvxsethi/cascade-protein

Cascade automates the full protein design pipeline: **RFDiffusion3 → ProteinMPNN → AlphaFold3**. Upload a PDB file, set how many designs you want, click Run — the system handles all GPU computation, filters results at each step, and gives you validated sequences ready for wet lab testing.

Built for PhD research on cis-intein protein design (mxe_gyra, PDB 4OZ6). General enough for any protein design task.

---

## What "100 designs" actually means

When you pick 100 designs, here is what the pipeline does step by step:

**Step 1 — RFDiffusion3 generates 100 backbone structures**
The model diffuses through structure space, constrained to keep your active site intact. Each output is a .cif file — a backbone scaffold with no sequence yet. Out of 100, roughly 50–80 will pass the active site RMSD filter (< 1.0Å deviation from the original).

**Step 2 — ProteinMPNN designs sequences for each structure**
For each backbone that passed, ProteinMPNN generates 8 amino acid sequences that would fold into that shape. So 60 structures × 8 = ~480 candidate sequences. Each gets a perplexity-like score. Those scoring below 0.80 are kept — usually 200–300 sequences.

**Step 3 — AlphaFold3 validates the sequences**
Each sequence is submitted to the AlphaFold3 Server, which predicts what it would actually fold into and gives a pLDDT confidence score (0–100). Sequences scoring above 70 are flagged "validated" — meaning AlphaFold thinks they'd actually fold into the right structure.

**Typical yield from 100 designs:** 5–30 validated sequences  
**Typical yield from 1000 designs:** 50–300 validated sequences

The best validated sequences are your candidates for wet lab synthesis and testing.

---

## What to do right now to get it working end-to-end

### Step 1 — Fix MongoDB (most likely your current blocker)

You got `querySrv ENOTFOUND` because the connection string had the placeholder URL. Here's the correct process:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click your cluster → **Connect** button → **Drivers**
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://cascade:<password>@cluster0.ab1cd2ef.mongodb.net/
   ```
   The `ab1cd2ef` part is YOUR actual cluster ID — unique letters/numbers, not "xxxxx"
4. Replace `<password>` with your real password, add `proteindesign` at the end:
   ```
   mongodb+srv://cascade:yourpassword@cluster0.ab1cd2ef.mongodb.net/proteindesign
   ```
5. Vercel → your project → **Settings → Environment Variables** → update `MONGODB_URI`
6. Also check Atlas → **Network Access** → must have `0.0.0.0/0` (Allow from anywhere)

### Step 2 — Redeploy

```bash
cd /Users/dhruvsethi/Downloads/Anika-Project/pipeline-app
vercel --prod
```

### Step 3 — Do a test run with 100 designs

1. Open [cascade-protein.vercel.app](https://cascade-protein.vercel.app)
2. Sign in
3. Upload `mxe_gyra.pdb` from `/Users/dhruvsethi/Downloads/Anika-Project/mxe_gyra.pdb`
4. Select **100 designs** (smallest, cheapest, fastest — good for testing)
5. Click **Run Pipeline →**

You'll see loading steps:
- `Uploading PDB to cloud storage...`
- `Creating pipeline job...`
- `Spinning up GPU on RunPod...`

Then you'll land on the dashboard automatically.

### Step 4 — What to expect on the dashboard

**RFDiffusion3 + ProteinMPNN** runs on a RunPod GPU. For 100 designs this takes ~20–60 minutes. The dashboard polls every 10 seconds and shows:
- Which stage is running
- Structures generated / sequences generated / validated count
- Best pLDDT score as results come in

When the GPU job finishes, the pod sends a callback to the app and terminates itself automatically (no cost after that).

**AlphaFold3** validation then starts. The cron job polls AF3 results — once daily on Vercel Hobby, every 5 minutes on Vercel Pro.

If you want to cancel at any point, scroll to the bottom of the dashboard and click **Cancel run**.

### Step 5 — View and download results

When complete, click **View Results →**:
- Designs sorted by pLDDT score
- Green = validated (pLDDT > 70), amber = 50–70, red = < 50
- Download all validated sequences as a `.fa` FASTA file
- Copy individual sequences to paste into AlphaFold Server manually

---

## Environment variables

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | clerk.com → your app |
| `CLERK_SECRET_KEY` | clerk.com → your app |
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers (full string with password) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → your Blob → .env.local tab |
| `RUNPOD_API_KEY` | runpod.io → Settings → API Keys |
| `AF3_API_KEY` | alphafoldserver.com (invite-only — leave as placeholder for now) |
| `CRON_SECRET` | any random string — `openssl rand -hex 16` |
| `NEXT_PUBLIC_APP_URL` | `https://cascade-protein.vercel.app` |

---

## Costs

| Run size | Approx GPU time | Approx cost |
|----------|----------------|-------------|
| 100 designs | ~45 min | ~$0.50 |
| 500 designs | ~3.5 hours | ~$2.50 |
| 1000 designs | ~7 hours | ~$5.00 |
| 5000 designs | ~35 hours | ~$25.00 |

RunPod RTX 3090 costs ~$0.74/hr. Pod terminates automatically when done — no ongoing cost.

---

## Known limitations

**AlphaFold3 API** — invite-only. Without it, the pipeline stops after ProteinMPNN and you get the sequences but no pLDDT validation. You can manually submit your best sequences at [alphafoldserver.com](https://alphafoldserver.com) (20 free predictions/day).

**Cron frequency** — Vercel Hobby runs cron once daily. For 5-minute AF3 polling, upgrade to Vercel Pro and change `vercel.json`:
```json
"schedule": "*/5 * * * *"
```
Then `git push && vercel --prod`.

**GPU availability** — RTX 3090 and RTX A6000 are the most available on RunPod. The app defaults to RTX 3090.

---

## Deploying changes

```bash
cd /Users/dhruvsethi/Downloads/Anika-Project/pipeline-app
git add .
git commit -m "your message"
git push
vercel --prod
```

Connect GitHub in Vercel dashboard (Settings → Git → Connect Repository to `cascade-protein`) for auto-deploys on every push.

---

## What's next (Phase 2)

- **Within-run learning** — auto-adjust `cfg_scale` and `step_scale` based on early results
- **Cross-run recommendations** — "based on 47 similar runs, try cfg_scale=2.5"
- **History page** — all past runs, pLDDT trend over time
- **3D structure viewer** — Mol* embedded in results page

---

## Full technical documentation

See [WHAT_WE_BUILT.md](../WHAT_WE_BUILT.md) for complete technical reference: architecture, API routes, database schema, RunPod manual setup, and everything else.

---

## The science

**Protein:** mxe_gyra — cis-intein from *Mycobacterium xenopi* (GyrA intein)  
**Goal:** Design new cis-intein sequences with the same catalytic active site but novel backbone  
**Why:** New inteins = new tools for protein splicing, chemical biology, synthetic biology  
**Method:** Computational design → sequence generation → structure validation → wet lab synthesis

The active site is held fixed by 14 catalytic residues defined in `enzyme.json`. RFDiffusion3 designs everything around them while keeping those residues intact.
