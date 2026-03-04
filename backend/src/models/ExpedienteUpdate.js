import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  entityType: { type: String, enum: ['cliente', 'prospecto'], required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  prospectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prospecto' },
  docType: { type: String, required: true },
  status: { type: String, enum: ['pendiente', 'en_proceso', 'completo', 'rechazado'], required: true },
  requestedAt: Date,
  updatedAt: Date,
  riskNotes: String,
}, { timestamps: true })

export default mongoose.model('ExpedienteUpdate', schema)
