import { Router } from 'express'
import { z } from 'zod'
import AgendaEvent from '../models/AgendaEvent.js'
import Prospecto from '../models/Prospecto.js'
import ProductoActivo from '../models/ProductoActivo.js'
import { isConnected } from '../lib/db.js'

const router = Router()

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const PRODUCTO_LABELS = {
  pfae: 'PFAE',
  derivados: 'Derivados',
  tN: 'T+N',
  inversion: 'Inversión',
  captacion: 'Captación',
  pyme: 'Pyme',
  corporativoFiduciario: 'Corporativo',
}

/** Eventos del día a las 10:00 por cada prospecto con fechaSeguimiento ese día (Prospección). */
function buildProspectFollowUpEvents(y, m, d) {
  const dateTime = new Date(y, m - 1, d, 10, 0, 0, 0)
  return (prospect) => ({
    id: `prospect-${prospect._id}`,
    dateTime,
    title: prospect.name || 'Prospecto',
    details: 'Seguimiento (Prospección) — comunicarse con la empresa',
    isProspectFollowUp: true,
  })
}

/** Solo considera valor como fecha si es Date o string YYYY-MM-DD (no "pendiente" ni "sí"). */
function isDateValue(d) {
  if (!d) return false
  if (d instanceof Date) return !Number.isNaN(d.getTime())
  const s = String(d).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** Formato corto de fecha para detalles VMTO (dd/mm/aa). */
function formatVmtoDate(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear()).slice(-2)
  return `${d}/${m}/${y}`
}

/** Eventos VMTO: por cada ProductoActivo, cada fecha de vencimiento en el rango. Incluye nombre, producto y fecha. */
function buildVmtoEvents(productos, start, end) {
  const events = []
  for (const doc of productos) {
    const name = doc.name || 'Cliente'
    for (const [key, label] of Object.entries(PRODUCTO_LABELS)) {
      const d = doc[key]
      if (!isDateValue(d)) continue
      const date = new Date(d)
      if (Number.isNaN(date.getTime()) || date < start || date > end) continue
      const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0)
      const fechaStr = formatVmtoDate(date)
      events.push({
        id: `vmto-${doc._id}-${key}`,
        dateTime,
        title: `${name} — ${label}`,
        details: `Vencimiento (${label}) · ${fechaStr}`,
        eventType: 'VMTO',
        vmtoNombre: name,
        vmtoProducto: label,
        vmtoFecha: fechaStr,
      })
    }
  }
  return events
}

/**
 * GET /api/v1/agenda?date=YYYY-MM-DD
 * Devuelve eventos del día (agenda + seguimientos de prospectos a las 10:00).
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
      const [agendaDocs, prospectos, productos] = await Promise.all([
        AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean(),
        Prospecto.find({ promotorId: null, fechaSeguimiento: { $gte: start, $lte: end } }).lean(),
        ProductoActivo.find({}).lean(),
      ])
      const agendaEvents = agendaDocs.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        title: e.title,
        details: e.details || '',
        eventType: e.eventType || 'ANA',
      }))
      const followUpEvents = prospectos.map(buildProspectFollowUpEvents(y, m, d))
      const vmtoEvents = buildVmtoEvents(productos, start, end)
      const all = [...agendaEvents, ...followUpEvents, ...vmtoEvents].sort(
        (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
      )
      return res.json(all)
    }

    if (from && to && dateRegex.test(String(from)) && dateRegex.test(String(to))) {
      const [y1, m1, d1] = String(from).split('-').map(Number)
      const [y2, m2, d2] = String(to).split('-').map(Number)
      const start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0)
      const end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999)
      const [agendaDocs, prospectos, productos] = await Promise.all([
        AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean(),
        Prospecto.find({ promotorId: null, fechaSeguimiento: { $gte: start, $lte: end } }).lean(),
        ProductoActivo.find({}).lean(),
      ])
      const agendaEvents = agendaDocs.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        title: e.title,
        details: e.details || '',
        eventType: e.eventType || 'ANA',
      }))
      const followUpEvents = prospectos.map((p) => {
        const d = new Date(p.fechaSeguimiento)
        const dateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0, 0)
        return {
          id: `prospect-${p._id}`,
          dateTime,
          title: p.name || 'Prospecto',
          details: 'Fecha de seguimiento',
          isProspectFollowUp: true,
        }
      })
      const vmtoEvents = buildVmtoEvents(productos, start, end)
      const all = [...agendaEvents, ...followUpEvents, ...vmtoEvents].sort(
        (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
      )
      return res.json(all)
    }

    return res.json([])
  } catch (e) {
    next(e)
  }
})

const eventTypeEnum = z.enum(['MONEX', 'ANA'])
const postSchema = z.object({
  dateTime: z.string().min(1),
  title: z.string().min(1),
  details: z.string().optional().default(''),
  eventType: eventTypeEnum.optional().default('ANA'),
}).transform((data) => {
  const d = new Date(data.dateTime)
  if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
  return { dateTime: d, title: data.title.trim(), details: (data.details || '').trim(), eventType: data.eventType || 'ANA' }
})

router.post('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const data = postSchema.parse(req.body)
    const doc = await AgendaEvent.create({
      dateTime: data.dateTime,
      title: data.title,
      details: data.details || '',
      eventType: data.eventType || 'ANA',
    })
    res.status(201).json({
      id: doc._id,
      dateTime: doc.dateTime,
      title: doc.title,
      details: doc.details || '',
      eventType: doc.eventType || 'ANA',
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
  eventType: eventTypeEnum.optional(),
}).transform((data) => {
  const out = {}
  if (data.dateTime !== undefined) {
    const d = new Date(data.dateTime)
    if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
    out.dateTime = d
  }
  if (data.title !== undefined) out.title = data.title.trim()
  if (data.details !== undefined) out.details = data.details.trim()
  if (data.eventType !== undefined) out.eventType = data.eventType
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
      eventType: doc.eventType || 'ANA',
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
