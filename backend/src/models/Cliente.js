import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  promotorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotor', required: true, index: true },
  onboardedAt: { type: Date, required: true },
  status: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
}, { timestamps: true })

export default mongoose.model('Cliente', schema)
