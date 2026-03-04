import { Router } from 'express'
import ProductoContrato from '../models/ProductoContrato.js'
import { isConnected } from '../lib/db.js'
import { z } from 'zod'

const router = Router()
const stages = ['lead', 'perfilado', 'propuesta', 'negociación', 'autorizado', 'activado', 'perdido']
const bodySchema = z.object({
  promotorId: z.string().min(24),
  clientId: z.string().min(24),
  productId: z.string().min(24),
  stage: z.enum(stages),
  activatedAt: z.string().transform(s => s ? new Date(s) : undefined).optional(),
  lostReason: z.string().optional(),
  estimatedMonthlyGeneration: z.number().optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.promotorId) q.promotorId = req.query.promotorId
    if (req.query.clientId) q.clientId = req.query.clientId
    const list = await ProductoContrato.find(q)
      .populate('promotorId', 'name')
      .populate('clientId', 'name')
      .populate('productId', 'name category')
      .sort({ createdAt: -1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await ProductoContrato.findById(req.params.id)
      .populate('promotorId', 'name')
      .populate('clientId', 'name')
      .populate('productId', 'name category')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body)
    const doc = await ProductoContrato.create(data)
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body)
    if (data.stage) data.createdAtStage = new Date()
    const doc = await ProductoContrato.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('promotorId', 'name')
      .populate('clientId', 'name')
      .populate('productId', 'name category')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await ProductoContrato.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
