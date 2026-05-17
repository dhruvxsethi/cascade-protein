import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { Design } from '@/models/Design'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const job = await Job.findOne({ _id: params.jobId, userId }).lean()
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const designs = await Design.find({ jobId: params.jobId })
    .sort({ 'scores.plddt': -1 })
    .limit(100)
    .lean()

  return NextResponse.json({ job, designs })
}
