import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { Design } from '@/models/Design'
import { submitToAF3, getAF3Result } from '@/lib/pipeline/af3'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const jobs = await Job.find({ stage: 'af3' }).limit(5)
  let totalSubmitted = 0
  let totalCompleted = 0
  let globalAF3Submissions = 0
  const MAX_AF3_PER_CRON = 20

  for (const job of jobs) {
    const jobIdStr = job._id.toString()

    // Submit pending sequences to AF3 (global daily server limit)
    const remainingSubmitSlots = MAX_AF3_PER_CRON - globalAF3Submissions
    if (remainingSubmitSlots <= 0) break // global limit reached

    const pending = await Design.find({
      jobId: jobIdStr,
      stage: 'mpnn',
      sequence: { $ne: null },
      'meta.af3PredictionName': { $exists: false },
    }).limit(remainingSubmitSlots)

    for (const design of pending) {
      if (!design.sequence) continue
      try {
        const predName = await submitToAF3(
          design.sequence,
          `${jobIdStr}-${design.designIndex}`
        )
        await Design.findByIdAndUpdate(design._id, {
          stage: 'af3',
          'meta.af3PredictionName': predName,
        })
        globalAF3Submissions++
        totalSubmitted++
      } catch (e) {
        console.error('AF3 submit error:', e)
      }
    }

    // Poll for completed AF3 predictions
    const submitted = await Design.find({ jobId: jobIdStr, stage: 'af3' })
    let bestPlddt = job.stats.bestPlddt ?? 0
    let validatedCount = job.stats.af3Validated ?? 0

    for (const design of submitted) {
      const predName = design.meta?.af3PredictionName as string | undefined
      if (!predName) continue

      const result = await getAF3Result(predName)
      if (!result) continue

      const isValidated = result.plddt > 70
      await Design.findByIdAndUpdate(design._id, {
        stage: isValidated ? 'validated' : 'filtered_out',
        isValidated,
        'scores.plddt': result.plddt,
      })
      if (result.plddt > bestPlddt) bestPlddt = result.plddt
      if (isValidated) validatedCount++
      totalCompleted++
    }

    // Update job stats
    const remaining = await Design.countDocuments({
      jobId: jobIdStr,
      stage: { $in: ['rfd3', 'mpnn', 'af3'] },
    })

    await Job.findByIdAndUpdate(job._id, {
      stage: remaining === 0 ? 'complete' : 'af3',
      'stats.af3Validated': validatedCount,
      'stats.bestPlddt': bestPlddt,
    })
  }

  return NextResponse.json({ ok: true, processed: jobs.length, submitted: totalSubmitted, completed: totalCompleted })
}
