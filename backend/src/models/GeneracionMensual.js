import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  promotorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotor', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },
  amount: { type: Number, required: true },
  source: { type: String, enum: ['manual', 'sistema'], default: 'manual' },
}, { timestamps: true })

schema.index({ clientId: 1, year: 1, month: 1 }, { unique: true })

export default mongoose.model('GeneracionMensual', schema)
