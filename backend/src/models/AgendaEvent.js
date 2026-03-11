import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  dateTime: { type: Date, required: true, index: true },
  endTime: { type: Date, default: null },
  title: { type: String, required: true },
  details: { type: String, default: '' },
  eventType: { type: String, enum: ['MONEX', 'ANA', 'PROSP', 'CITA'], default: 'ANA' },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  prospectoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prospecto', default: null },
  realizado: { type: Boolean, default: false },
  nota: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('AgendaEvent', schema)
