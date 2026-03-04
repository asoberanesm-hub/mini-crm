import { Router } from 'express'
import Cliente from '../models/Cliente.js'
import { isConnected } from '../lib/db.js'
import { z } from 'zod'

const router = Router()
const bodySchema = z.object({
  name: z.string().min(1),
  promotorId: z.string().min(24),
  onboardedAt: z.string().transform(s => new Date(s)),
  status: z.enum(['activo', 'inactivo']).optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.promotorId) q.promotorId = req.query.promotorId
    if (req.query.slug) {
      const Promotor = (await import('../models/Promotor.js')).default
      const ana = await Promotor.findOne({ slug: req.query.slug })
      if (ana) q.promotorId = ana._id
    }
    const list = await Cliente.find(q).populate('promotorId', 'name slug').sort({ name: 1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada' })
    const doc = await Cliente.findById(req.params.id).populate('promotorId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body)
    const doc = await Cliente.create(data)
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body)
    const doc = await Cliente.findByIdAndUpdate(req.params.id, data, { new: true }).populate('promotorId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Cliente.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
