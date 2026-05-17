import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { Design } from '@/models/Design'
import ResultsTable from '@/components/ResultsTable'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { jobId } = await params

  await connectDB()
  const job = await Job.findOne({ _id: jobId, userId }).lean()
  if (!job) redirect('/')

  const designs = await Design.find({ jobId })
    .sort({ 'scores.plddt': -1 })
    .lean()

  return (
    <ResultsTable
      designs={JSON.parse(JSON.stringify(designs))}
      jobId={jobId}
    />
  )
}
