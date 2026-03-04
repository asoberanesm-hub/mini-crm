import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: String,
}, { timestamps: true })

export default mongoose.model('ProductoCatalogo', schema)
