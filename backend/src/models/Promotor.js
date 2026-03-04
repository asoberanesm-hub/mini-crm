import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, sparse: true, index: true }, // ej. 'ana-soberanes' para filtrar módulo Ana
  email: String,
  monthlyGoals: [{
    amount: Number,
    month: Number,
    year: Number,
  }],
  annualGoal: { amount: Number, year: Number },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Promotor', schema)
