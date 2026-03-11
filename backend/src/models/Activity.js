import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

schema.index({ createdAt: -1 })

export default mongoose.model('Activity', schema)
