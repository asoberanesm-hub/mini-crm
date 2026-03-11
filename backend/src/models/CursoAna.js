import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  nombreCurso: { type: String, required: true, trim: true },
  tipoCurso: { type: String, required: true, trim: true },
  fechaLimite: { type: Date, required: true },
  realizado: { type: Boolean, default: false },
  fechaRealizacion: { type: Date, default: null },
  constanciaPdfUrl: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('CursoAna', schema)
