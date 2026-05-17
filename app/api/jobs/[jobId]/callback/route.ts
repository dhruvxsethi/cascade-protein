import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { terminatePod } from '@/lib/runpod'

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const callbackSecret = req.headers.get('x-callback-secret')
  const expectedSecret = `${params.jobId}-${process.env.CRON_SECRET}`
  if (callbackSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { stage, rfd3OutputUrl, mpnnOutputUrl, rfd3Count, mpnnCount, error } = body

  await connectDB()
  const job = await Job.findById(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (stage === 'failed') {
    await Job.findByIdAndUpdate(params.jobId, {
      stage: 'failed',
      errorMessage: error ?? 'Pipeline failed on RunPod',
    })
    if (job.runpodJobId) {
      try { await terminatePod(job.runpodJobId) } catch {}
    }
    return NextResponse.json({ ok: true })
  }

  if (stage === 'mpnn_complete') {
    await Job.findByIdAndUpdate(params.jobId, {
      stage: 'af3',
      rfd3OutputBlobUrl: rfd3OutputUrl ?? null,
      mpnnOutputBlobUrl: mpnnOutputUrl ?? null,
      'stats.rfd3Generated': Number(rfd3Count) || 0,
      'stats.mpnnGenerated': Number(mpnnCount) || 0,
    })
    if (job.runpodJobId) {
      try { await terminatePod(job.runpodJobId) } catch {}
    }
  }

  return NextResponse.json({ ok: true })
}
