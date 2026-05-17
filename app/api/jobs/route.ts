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
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN!

  const startScript = [
    `export PDB_URL="${pdbBlobUrl}"`,
    `export DESIGN_COUNT="${designCount}"`,
    `export CFG_SCALE="${cfg_scale}"`,
    `export STEP_SCALE="${step_scale}"`,
    `export NUM_TIMESTEPS="${num_timesteps}"`,
    `export SAMPLING_TEMP="${sampling_temp}"`,
    `export BATCH_SIZE="10"`,
    `export JOB_ID="${job._id}"`,
    `export CALLBACK_URL="${callbackUrl}"`,
    `export BLOB_TOKEN="${blobToken}"`,
    `bash <(curl -fsSL ${process.env.NEXT_PUBLIC_APP_URL}/scripts/pipeline_runner.sh)`,
  ].join('\n')

  try {
    const podId = await createRunpodPod({
      name: `pipeline-${job._id}`,
      imageName: 'runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04',
      gpuTypeId: 'NVIDIA GeForce RTX 3090',
      containerDiskInGb: 20,
      volumeInGb: 50,
      startScript,
    })

    await Job.findByIdAndUpdate(job._id, { runpodJobId: podId, stage: 'rfd3' })
  } catch (err) {
    await Job.findByIdAndUpdate(job._id, {
      stage: 'failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to start RunPod job' }, { status: 500 })
  }

  return NextResponse.json({ jobId: job._id.toString() })
}
