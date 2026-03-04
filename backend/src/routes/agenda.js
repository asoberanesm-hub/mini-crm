import { Router } from 'express'
import { z } from 'zod'
import AgendaEvent from '../models/AgendaEvent.js'
import { isConnected } from '../lib/db.js'

const router = Router()

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/v1/agenda?date=YYYY-MM-DD
 * Devuelve eventos del día.
 *
 * GET /api/v1/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Devuelve eventos en el rango [from 00:00, to 23:59:59].
 */
router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const { date, from, to } = req.query

    if (date && dateRegex.test(String(date))) {
      const [y, m, d] = String(date).split('-').map(Number)
      const start = new Date(y, m - 1, d, 0, 0, 0, 0)
      const end = new Date(y, m - 1, d, 23, 59, 59, 999)
      const events = await AgendaEvent.find({
        dateTime: { $gte: start, $lte: end },
      }).sort({ dateTime: 1 }).lean()
      return res.json(events.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        title: e.title,
        details: e.details || '',
      })))
    }

    if (from && to && dateRegex.test(String(from)) && dateRegex.test(String(to))) {
      const [y1, m1, d1] = String(from).split('-').map(Number)
      const [y2, m2, d2] = String(to).split('-').map(Number)
      const start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0)
      const end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999)
      const events = await AgendaEvent.find({
        dateTime: { $gte: start, $lte: end },
      }).sort({ dateTime: 1 }).lean()
      return res.json(events.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        title: e.title,
        details: e.details || '',
      })))
    }

    return res.json([])
  } catch (e) {
    next(e)
  }
})

const postSchema = z.object({
  dateTime: z.string().min(1),
  title: z.string().min(1),
  details: z.string().optional().default(''),
}).transform((data) => {
  const d = new Date(data.dateTime)
  if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
  return { dateTime: d, title: data.title.trim(), details: (data.details || '').trim() }
})

router.post('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const data = postSchema.parse(req.body)
    const doc = await AgendaEvent.create({
      dateTime: data.dateTime,
      title: data.title,
      details: data.details || '',
    })
    res.status(201).json({
      id: doc._id,
      dateTime: doc.dateTime,
      title: doc.title,
      details: doc.details || '',
    })
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        error: e.errors?.map((err) => err.message).join(', ') || 'Datos inválidos',
      })
    }
    next(e)
  }
})

const putSchema = z.object({
  dateTime: z.string().optional(),
  title: z.string().min(1).optional(),
  details: z.string().optional(),
}).transform((data) => {
  const out = {}
  if (data.dateTime !== undefined) {
    const d = new Date(data.dateTime)
    if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
    out.dateTime = d
  }
  if (data.title !== undefined) out.title = data.title.trim()
  if (data.details !== undefined) out.details = data.details.trim()
  return out
})

router.put('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const data = putSchema.parse(req.body)
    const doc = await AgendaEvent.findByIdAndUpdate(req.params.id, data, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Evento no encontrado' })
    res.json({
      id: doc._id,
      dateTime: doc.dateTime,
      title: doc.title,
      details: doc.details || '',
    })
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        error: e.errors?.map((err) => err.message).join(', ') || 'Datos inválidos',
      })
    }
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await AgendaEvent.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Evento no encontrado' })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

export default router
