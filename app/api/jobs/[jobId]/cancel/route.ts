import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { terminatePod } from '@/lib/runpod'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  await connectDB()
  const job = await Job.findOne({ _id: jobId, userId })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (job.stage === 'complete' || job.stage === 'failed') {
    return NextResponse.json({ error: 'Job already finished' }, { status: 400 })
  }

  if (job.runpodJobId) {
    try { await terminatePod(job.runpodJobId) } catch {}
  }

  await Job.findByIdAndUpdate(jobId, {
    stage: 'failed',
    errorMessage: 'Cancelled by user',
  })

  return NextResponse.json({ ok: true })
}
