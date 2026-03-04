import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
}, { _id: false })

const schema = new mongoose.Schema({
  messages: [messageSchema],
}, { timestamps: true })

export default mongoose.model('Conversation', schema)
