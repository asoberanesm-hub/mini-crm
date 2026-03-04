import { Router } from 'express'
import Prospecto from '../models/Prospecto.js'
import { isConnected } from '../lib/db.js'
import { z } from 'zod'

const router = Router()
const stages = ['lead', 'perfilado', 'propuesta', 'negociación', 'autorizado', 'activado', 'perdido']

// Parsea "YYYY-MM-DD" como mediodía UTC para que no cambie de día en zonas como México
function parseDateOnly(s) {
  if (!s || typeof s !== 'string') return undefined
  const trimmed = s.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined
  return new Date(trimmed + 'T12:00:00.000Z')
}

const bodySchema = z.object({
  name: z.string().min(1),
  promotorId: z.string().min(24).nullable().optional(),
  stage: z.enum(stages),
  probability: z.number().min(0).max(100).optional(),
  estimatedAmount: z.number().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().transform(s => parseDateOnly(s)).optional(),
  exim: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  contacto: z.string().optional(),
  fase1: z.string().optional(),
  fechaFase1: z.string().transform(s => parseDateOnly(s)).optional(),
  comentarioFase1: z.string().optional(),
  fase2: z.string().optional(),
  comentarioFase2: z.string().optional(),
  fase3: z.string().optional(),
  comentarioFase3: z.string().optional(),
  fechaSeguimiento: z.string().transform(s => parseDateOnly(s)).optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.origen === 'propio') q.promotorId = null
    else if (req.query.promotorId) q.promotorId = req.query.promotorId
    const list = await Prospecto.find(q)
      .populate('promotorId', 'name')
      .sort({ nextActionDate: 1, name: 1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Prospecto.findById(req.params.id).populate('promotorId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada. Revisa MONGODB_URI en backend/.env y que MongoDB Atlas esté accesible.' })
    const data = bodySchema.parse(req.body)
    const payload = { ...data }
    if (payload.promotorId === null) delete payload.promotorId
    const doc = await Prospecto.create(payload)
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: Array.isArray(e.errors) ? e.errors.map((err) => err.message).join(', ') : e.message })
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body)
    const doc = await Prospecto.findByIdAndUpdate(req.params.id, data, { new: true }).populate('promotorId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Prospecto.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
