import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Job } from '@/models/Job'
import { createRunpodPod } from '@/lib/runpod'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    pdbBlobUrl,
    pdbFileName,
    designCount = 100,
    cfg_scale = 2.0,
    step_scale = 1.5,
    num_timesteps = 200,
    sampling_temp = 0.1,
  } = body

  if (!pdbBlobUrl) return NextResponse.json({ error: 'pdbBlobUrl required' }, { status: 400 })

  await connectDB()

  const job = await Job.create({
    userId,
    pdbFileName: pdbFileName ?? 'input.pdb',
    pdbBlobUrl,
    designCount,
    parameters: { cfg_scale, step_scale, num_timesteps, sampling_temp, diffusion_batch_size: 10 },
    stage: 'queued',
  })

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${job._id}/callback`
  const scriptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/pipeline_runner.sh`

  // All pipeline variables passed as proper env vars — container runs the script via dockerArgs
  const env = {
    PDB_URL: pdbBlobUrl,
    DESIGN_COUNT: String(designCount),
    CFG_SCALE: String(cfg_scale),
    STEP_SCALE: String(step_scale),
    NUM_TIMESTEPS: String(num_timesteps),
    SAMPLING_TEMP: String(sampling_temp),
    BATCH_SIZE: '10',
    JOB_ID: String(job._id),
    CALLBACK_URL: callbackUrl,
    BLOB_TOKEN: process.env.BLOB_READ_WRITE_TOKEN!,
    CALLBACK_SECRET: `${job._id}-${process.env.CRON_SECRET}`,
    SCRIPT_URL: scriptUrl,
  }

  try {
    const podId = await createRunpodPod({
      name: `pipeline-${job._id}`,
      imageName: 'runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04',
      gpuTypeIds: [
        'NVIDIA GeForce RTX 3090',
        'NVIDIA GeForce RTX 4090',
        'NVIDIA RTX A5000',
        'NVIDIA RTX A6000',
        'NVIDIA A40',
      ],
      containerDiskInGb: 50,
      env,
    })

    await Job.findByIdAndUpdate(job._id, { runpodJobId: podId, stage: 'rfd3' })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('RunPod error:', errMsg)
    await Job.findByIdAndUpdate(job._id, { stage: 'failed', errorMessage: errMsg })
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  return NextResponse.json({ jobId: job._id.toString() })
}
