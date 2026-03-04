import mongoose from 'mongoose'

const stages = ['lead', 'perfilado', 'propuesta', 'negociación', 'autorizado', 'activado', 'perdido']

const schema = new mongoose.Schema({
  promotorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotor', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductoCatalogo', required: true },
  stage: { type: String, enum: stages, required: true },
  createdAtStage: { type: Date, default: Date.now },
  activatedAt: Date,
  lostReason: String,
  estimatedMonthlyGeneration: Number,
}, { timestamps: true })

export default mongoose.model('ProductoContrato', schema)
