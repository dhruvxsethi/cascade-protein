import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PipelineProgress from '@/components/PipelineProgress'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const { jobId } = await params
  return <PipelineProgress jobId={jobId} />
}
