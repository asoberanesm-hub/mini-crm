import { Router } from 'express'
import GeneracionMensual from '../models/GeneracionMensual.js'
import { isConnected } from '../lib/db.js'
import { z } from 'zod'

const router = Router()
const bodySchema = z.object({
  promotorId: z.string().min(24),
  clientId: z.string().min(24),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().min(0),
  source: z.enum(['manual', 'sistema']).optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.promotorId) q.promotorId = req.query.promotorId
    if (req.query.clientId) q.clientId = req.query.clientId
    if (req.query.year) q.year = parseInt(req.query.year, 10)
    if (req.query.month) q.month = parseInt(req.query.month, 10)
    const list = await GeneracionMensual.find(q)
      .populate('promotorId', 'name')
      .populate('clientId', 'name')
      .sort({ year: -1, month: -1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body)
    const doc = await GeneracionMensual.findOneAndUpdate(
      { clientId: data.clientId, year: data.year, month: data.month },
      data,
      { upsert: true, new: true }
    ).populate('promotorId', 'name').populate('clientId', 'name')
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await GeneracionMensual.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
