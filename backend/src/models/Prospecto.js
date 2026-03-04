import mongoose from 'mongoose'

const stages = ['lead', 'perfilado', 'propuesta', 'negociación', 'autorizado', 'activado', 'perdido']

const schema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  promotorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotor', default: null, index: true },
  stage: { type: String, enum: stages, required: true },
  probability: Number,
  estimatedAmount: Number,
  nextAction: String,
  nextActionDate: Date,
  // Prospección Ana: contacto y fases
  exim: String,
  ciudad: String,
  telefono: String,
  contacto: String,
  fase1: String,
  fechaFase1: Date,
  comentarioFase1: String,
  fase2: String,
  comentarioFase2: String,
  fase3: String,
  comentarioFase3: String,
  fechaSeguimiento: Date,
}, { timestamps: true })

export default mongoose.model('Prospecto', schema)
