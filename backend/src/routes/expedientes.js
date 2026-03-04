import { Router } from 'express'
import ExpedienteUpdate from '../models/ExpedienteUpdate.js'
import { isConnected } from '../lib/db.js'
import { z } from 'zod'

const router = Router()
const bodySchema = z.object({
  entityType: z.enum(['cliente', 'prospecto']),
  clientId: z.string().min(24).optional(),
  prospectId: z.string().min(24).optional(),
  docType: z.string().min(1),
  status: z.enum(['pendiente', 'en_proceso', 'completo', 'rechazado']),
  requestedAt: z.string().transform(s => s ? new Date(s) : undefined).optional(),
  updatedAt: z.string().transform(s => s ? new Date(s) : undefined).optional(),
  riskNotes: z.string().optional(),
})

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const q = {}
    if (req.query.entityType) q.entityType = req.query.entityType
    if (req.query.clientId) q.clientId = req.query.clientId
    if (req.query.prospectId) q.prospectId = req.query.prospectId
    const list = await ExpedienteUpdate.find(q)
      .populate('clientId', 'name')
      .populate('prospectId', 'name')
      .sort({ createdAt: -1 })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await ExpedienteUpdate.findById(req.params.id)
      .populate('clientId', 'name')
      .populate('prospectId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body)
    const doc = await ExpedienteUpdate.create(data)
    res.status(201).json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body)
    const doc = await ExpedienteUpdate.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('clientId', 'name')
      .populate('prospectId', 'name')
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await ExpedienteUpdate.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
