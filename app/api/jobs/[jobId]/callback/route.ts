import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { Design } from '@/models/Design'
import { terminatePod } from '@/lib/runpod'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const callbackSecret = req.headers.get('x-callback-secret')
  const expectedSecret = `${jobId}-${process.env.CRON_SECRET}`
  if (callbackSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    stage,
    rfd3OutputUrl, mpnnOutputUrl,
    rfd3Count, mpnnCount,
    validatedCount, bestPlddt,
    designs,
    error,
  } = body

  await connectDB()
  const job = await Job.findById(jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Failed ────────────────────────────────────────────────────────
  if (stage === 'failed') {
    await Job.findByIdAndUpdate(jobId, {
      stage: 'failed',
      errorMessage: error ?? 'Pipeline failed on RunPod',
    })
    if (job.runpodJobId) {
      try { await terminatePod(job.runpodJobId) } catch {}
    }
    return NextResponse.json({ ok: true })
  }

  // ── MPNN complete (progress update) ──────────────────────────────
  // Stage moves to 'af3' in the UI. Pod stays alive — Boltz-2 is next.
  if (stage === 'mpnn_complete') {
    await Job.findByIdAndUpdate(jobId, {
      stage: 'af3',
      rfd3OutputBlobUrl: rfd3OutputUrl ?? null,
      mpnnOutputBlobUrl: mpnnOutputUrl ?? null,
      'stats.rfd3Generated': Number(rfd3Count) || 0,
      'stats.mpnnGenerated': Number(mpnnCount) || 0,
    })
    // Do NOT terminate pod — Boltz-2 validation still running
    return NextResponse.json({ ok: true })
  }

  // ── Pipeline complete ─────────────────────────────────────────────
  if (stage === 'complete') {
    // Update job to complete
    await Job.findByIdAndUpdate(jobId, {
      stage: 'complete',
      'stats.af3Validated': Number(validatedCount) || 0,
      'stats.bestPlddt':    Number(bestPlddt)     || 0,
    })

    // Create Design documents for every sequence Boltz-2 ran on
    if (Array.isArray(designs) && designs.length > 0) {
      const docs = designs.map((d: {
        designIndex: number
        sequence:    string | null
        mpnnScore:   number | null
        backbone:    string | null
        plddt:       number | null
        isValidated: boolean
        cifBlobUrl:  string | null
      }) => ({
        jobId,
        userId:      job.userId,
        designIndex: d.designIndex,
        sequence:    d.sequence    ?? null,
        cifBlobUrl:  d.cifBlobUrl  ?? null,
        scores: {
          activeSiteRmsd: null,           // Phase 2
          mpnnScore:      d.mpnnScore     ?? null,
          plddt:          d.plddt         ?? null,
        },
        parameters: {
          cfg_scale:     job.parameters.cfg_scale,
          step_scale:    job.parameters.step_scale,
          num_timesteps: job.parameters.num_timesteps,
          sampling_temp: job.parameters.sampling_temp,
        },
        stage:        d.isValidated ? 'validated' : 'filtered_out',
        isValidated:  d.isValidated ?? false,
        wetLabSelected: false,
        meta: { backbone: d.backbone ?? null },
      }))

      await Design.insertMany(docs)
    }

    // Terminate the RunPod pod now that we're fully done
    if (job.runpodJobId) {
      try { await terminatePod(job.runpodJobId) } catch {}
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
