import { Router } from 'express'
import Promotor from '../models/Promotor.js'
import { z } from 'zod'
import { isConnected } from '../lib/db.js'

const router = Router()
const bodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  monthlyGoals: z.array(z.object({ amount: z.number(), month: z.number(), year: z.number() })).optional(),
  annualGoal: z.object({ amount: z.number(), year: z.number() }).optional(),
  active: z.boolean().optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.slug) q.slug = req.query.slug
    const list = await Promotor.find(q).sort({ name: 1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada' })
    const doc = await Promotor.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body)
    const doc = await Promotor.create(data)
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body)
    const doc = await Promotor.findByIdAndUpdate(req.params.id, data, { new: true })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Promotor.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
