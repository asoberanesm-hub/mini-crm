import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  dateTime: { type: Date, required: true, index: true },
  title: { type: String, required: true },
  details: { type: String, default: '' },
  eventType: { type: String, enum: ['MONEX', 'ANA'], default: 'ANA' },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
}, { timestamps: true })

schema.index({ dateTime: 1 })

export default mongoose.model('AgendaEvent', schema)
