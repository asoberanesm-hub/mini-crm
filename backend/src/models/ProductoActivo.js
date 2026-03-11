import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Cada producto: '' (vacío), 'tramite', 'activo', o 'YYYY-MM-DD' (fecha vencimiento)
  pfae: { type: String, default: '' },
  derivados: { type: String, default: '' },
  tN: { type: String, default: '' },
  inversion: { type: String, default: '' },
  captacion: { type: String, default: '' },
  pyme: { type: String, default: '' },
  intradia: { type: String, default: '' },
  corporativoFiduciario: { type: String, default: '' },
  // Notas generales por cliente (no por producto)
  notas: { type: String, default: '' },
}, { timestamps: true })

schema.index({ name: 1 })

export default mongoose.model('ProductoActivo', schema)
