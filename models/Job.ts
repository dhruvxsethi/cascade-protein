import mongoose, { Schema, Document } from 'mongoose'

export interface IJob extends Document {
  userId: string
  pdbFileName: string
  pdbBlobUrl: string
  designCount: number
  parameters: {
    cfg_scale: number
    step_scale: number
    num_timesteps: number
    sampling_temp: number
    diffusion_batch_size: number
  }
  stage: 'queued' | 'rfd3' | 'mpnn' | 'af3' | 'complete' | 'failed'
  runpodJobId: string | null
  rfd3OutputBlobUrl: string | null
  mpnnOutputBlobUrl: string | null
  stats: {
    rfd3Generated: number
    rfd3Passed: number
    mpnnGenerated: number
    mpnnPassed: number
    af3Validated: number
    bestPlddt: number
  }
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

const JobSchema = new Schema<IJob>({
  userId: { type: String, required: true },
  pdbFileName: { type: String, required: true },
  pdbBlobUrl: { type: String, required: true },
  designCount: { type: Number, required: true },
  parameters: {
    cfg_scale: { type: Number, default: 2.0 },
    step_scale: { type: Number, default: 1.5 },
    num_timesteps: { type: Number, default: 200 },
    sampling_temp: { type: Number, default: 0.1 },
    diffusion_batch_size: { type: Number, default: 10 },
  },
  stage: { type: String, default: 'queued' },
  runpodJobId: { type: String, default: null },
  rfd3OutputBlobUrl: { type: String, default: null },
  mpnnOutputBlobUrl: { type: String, default: null },
  stats: {
    rfd3Generated: { type: Number, default: 0 },
    rfd3Passed: { type: Number, default: 0 },
    mpnnGenerated: { type: Number, default: 0 },
    mpnnPassed: { type: Number, default: 0 },
    af3Validated: { type: Number, default: 0 },
    bestPlddt: { type: Number, default: 0 },
  },
  errorMessage: { type: String, default: null },
}, { timestamps: true })

export const Job = mongoose.models.Job ?? mongoose.model<IJob>('Job', JobSchema)
