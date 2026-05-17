import mongoose, { Schema, Document } from 'mongoose'

export interface IDesign extends Document {
  jobId: string
  userId: string
  designIndex: number
  cifBlobUrl: string | null
  pdbBlobUrl: string | null
  sequence: string | null
  scores: {
    activeSiteRmsd: number | null
    mpnnScore: number | null
    plddt: number | null
  }
  parameters: {
    cfg_scale: number
    step_scale: number
    num_timesteps: number
    sampling_temp: number
  }
  stage: 'rfd3' | 'mpnn' | 'af3' | 'validated' | 'filtered_out'
  isValidated: boolean
  wetLabSelected: boolean
  meta: Record<string, any>
  createdAt: Date
}

const DesignSchema = new Schema<IDesign>({
  jobId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  designIndex: { type: Number, required: true },
  cifBlobUrl: { type: String, default: null },
  pdbBlobUrl: { type: String, default: null },
  sequence: { type: String, default: null },
  scores: {
    activeSiteRmsd: { type: Number, default: null },
    mpnnScore: { type: Number, default: null },
    plddt: { type: Number, default: null },
  },
  parameters: {
    cfg_scale: { type: Number, required: true },
    step_scale: { type: Number, required: true },
    num_timesteps: { type: Number, required: true },
    sampling_temp: { type: Number, required: true },
  },
  stage: { type: String, default: 'rfd3' },
  isValidated: { type: Boolean, default: false },
  wetLabSelected: { type: Boolean, default: false },
  meta: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export const Design = mongoose.models.Design ?? mongoose.model<IDesign>('Design', DesignSchema)
