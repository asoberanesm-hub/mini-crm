import { Router } from 'express'
import { z } from 'zod'
import AgendaEvent from '../models/AgendaEvent.js'
import Activity from '../models/Activity.js'
import Prospecto from '../models/Prospecto.js'
import ProductoActivo from '../models/ProductoActivo.js'
import CursoAna from '../models/CursoAna.js'
import { isConnected } from '../lib/db.js'
import { startOfDayLocalUTC, endOfDayLocalUTC, dateTo9LocalUTC } from '../lib/tz.js'

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

/** Eventos de seguimiento: usamos la fecha/hora ya guardada en prospecto (10:00 México = 16:00 UTC). */
function buildProspectFollowUpEvents(_y, _m, _d) {
  return (prospect) => ({
    id: `prospect-${prospect._id}`,
    dateTime: prospect.fechaSeguimiento,
    title: prospect.name || 'Prospecto',
    details: 'Seguimiento (Prospección) — comunicarse con la empresa',
    eventType: 'PROSP',
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

/** Eventos VMTO: por cada ProductoActivo, cada fecha de vencimiento en el rango. 9:00 hora local = 15:00 UTC. */
function buildVmtoEvents(productos, start, end) {
  const events = []
  for (const doc of productos) {
    const name = doc.name || 'Cliente'
    for (const [key, label] of Object.entries(PRODUCTO_LABELS)) {
      const d = doc[key]
      if (!isDateValue(d)) continue
      const date = new Date(d)
      if (Number.isNaN(date.getTime()) || date < start || date > end) continue
      const dateTime = dateTo9LocalUTC(date)
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

/** Eventos de cursos ANA: por cada CursoAna con fechaLimite en rango. 9:00 hora local = 15:00 UTC. */
function buildCursoEvents(cursos, start, end) {
  const events = []
  for (const c of cursos) {
    if (!c.fechaLimite) continue
    const date = new Date(c.fechaLimite)
    if (Number.isNaN(date.getTime()) || date < start || date > end) continue
    const dateTime = dateTo9LocalUTC(date)
    events.push({
      id: `curso-${c._id}`,
      dateTime,
      title: c.nombreCurso || 'Curso',
      details: c.tipoCurso ? `Curso · ${c.tipoCurso}` : 'Curso',
      eventType: 'CURSO',
      cursoId: c._id,
    })
  }
  return events
}

/**
 * GET /api/v1/agenda/kpis?date=YYYY-MM-DD
 * KPIs del día: seguimientos hoy, prospectos activos, vencimientos hoy, eventos hoy.
 */
router.get('/kpis', async (req, res, next) => {
  try {
    if (!isConnected()) {
      return res.json({ seguimientosHoy: 0, prospectosActivos: 0, vencimientosHoy: 0, eventosHoy: 0 })
    }
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const dateStr = req.query.date && dateRegex.test(String(req.query.date)) ? String(req.query.date) : todayStr
    const [y, m, d] = dateStr.split('-').map(Number)
    const start = startOfDayLocalUTC(y, m, d)
    const end = endOfDayLocalUTC(y, m, d)

    const [seguimientosHoy, prospectosActivos, productos, agendaDocs] = await Promise.all([
      Prospecto.countDocuments({ promotorId: null, fechaSeguimiento: { $gte: start, $lte: end } }),
      Prospecto.countDocuments({ promotorId: null, stage: { $ne: 'perdido' } }),
      ProductoActivo.find({}).lean(),
      AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).lean(),
    ])

    const vmtoHoy = buildVmtoEvents(productos, start, end)
    const vencimientosHoy = vmtoHoy.length
    const eventosHoy = agendaDocs.length + seguimientosHoy + vencimientosHoy

    return res.json({
      seguimientosHoy,
      prospectosActivos,
      vencimientosHoy,
      eventosHoy,
    })
  } catch (e) {
    next(e)
  }
})

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
      const start = startOfDayLocalUTC(y, m, d)
      const end = endOfDayLocalUTC(y, m, d)
      const [agendaDocs, prospectos, productos, cursos] = await Promise.all([
        AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean(),
        Prospecto.find({ promotorId: null, fechaSeguimiento: { $gte: start, $lte: end } }).lean(),
        ProductoActivo.find({}).lean(),
        CursoAna.find({ fechaLimite: { $gte: start, $lte: end } }).lean(),
      ])
      const agendaEvents = agendaDocs.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        endTime: e.endTime || null,
        title: e.title,
        details: e.details || '',
        eventType: e.eventType || 'ANA',
        realizado: !!e.realizado,
        nota: e.nota || '',
        clienteId: e.clienteId || null,
        prospectoId: e.prospectoId || null,
      }))
      const followUpEvents = prospectos.map(buildProspectFollowUpEvents(y, m, d))
      const vmtoEvents = buildVmtoEvents(productos, start, end)
      const cursoEvents = buildCursoEvents(cursos, start, end)
      const all = [...agendaEvents, ...followUpEvents, ...vmtoEvents, ...cursoEvents].sort(
        (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
      )
      return res.json(all)
    }

    if (from && to && dateRegex.test(String(from)) && dateRegex.test(String(to))) {
      const [y1, m1, d1] = String(from).split('-').map(Number)
      const [y2, m2, d2] = String(to).split('-').map(Number)
      const start = startOfDayLocalUTC(y1, m1, d1)
      const end = endOfDayLocalUTC(y2, m2, d2)
      const [agendaDocs, prospectos, productos, cursos] = await Promise.all([
        AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean(),
        Prospecto.find({ promotorId: null, fechaSeguimiento: { $gte: start, $lte: end } }).lean(),
        ProductoActivo.find({}).lean(),
        CursoAna.find({ fechaLimite: { $gte: start, $lte: end } }).lean(),
      ])
      const agendaEvents = agendaDocs.map((e) => ({
        id: e._id,
        dateTime: e.dateTime,
        endTime: e.endTime || null,
        title: e.title,
        details: e.details || '',
        eventType: e.eventType || 'ANA',
        realizado: !!e.realizado,
        nota: e.nota || '',
        clienteId: e.clienteId || null,
        prospectoId: e.prospectoId || null,
      }))
      const followUpEvents = prospectos.map((p) => ({
        id: `prospect-${p._id}`,
        dateTime: p.fechaSeguimiento,
        title: p.name || 'Prospecto',
        details: 'Seguimiento (Prospección)',
        eventType: 'PROSP',
        isProspectFollowUp: true,
      }))
      const vmtoEvents = buildVmtoEvents(productos, start, end)
      const cursoEvents = buildCursoEvents(cursos, start, end)
      const all = [...agendaEvents, ...followUpEvents, ...vmtoEvents, ...cursoEvents].sort(
        (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
      )
      return res.json(all)
    }

    return res.json([])
  } catch (e) {
    next(e)
  }
})

/**
 * GET /api/v1/agenda/activity?limit=20
 * Actividad reciente (eventos marcados como realizados, etc.).
 */
router.get('/activity', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const docs = await Activity.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    const items = docs.map((d) => ({
      id: d._id,
      type: d.type,
      payload: d.payload || {},
      createdAt: d.createdAt,
    }))
    return res.json(items)
  } catch (e) {
    next(e)
  }
})

const eventTypeEnum = z.enum(['MONEX', 'ANA', 'PROSP', 'CITA'])
const postSchema = z.object({
  dateTime: z.string().min(1),
  endTime: z.string().optional(),
  title: z.string().min(1),
  details: z.string().optional().default(''),
  eventType: eventTypeEnum.optional().default('ANA'),
  clienteId: z.string().optional(),
  prospectoId: z.string().optional(),
}).transform((data) => {
  const d = new Date(data.dateTime)
  if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
  if (process.env.NODE_ENV !== 'production') {
    console.log('[agenda POST] dateTime recibido:', data.dateTime, '→ guardado como:', d.toISOString())
  }
  const out = { dateTime: d, title: data.title.trim(), details: (data.details || '').trim(), eventType: data.eventType || 'ANA' }
  if (data.endTime) {
    const end = new Date(data.endTime)
    if (!Number.isNaN(end.getTime())) out.endTime = end
  }
  if (data.clienteId) out.clienteId = data.clienteId
  if (data.prospectoId) out.prospectoId = data.prospectoId
  return out
})

router.post('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const data = postSchema.parse(req.body)
    const doc = await AgendaEvent.create({
      dateTime: data.dateTime,
      endTime: data.endTime || undefined,
      title: data.title,
      details: data.details || '',
      eventType: data.eventType || 'ANA',
      clienteId: data.clienteId || undefined,
      prospectoId: data.prospectoId || undefined,
    })
    res.status(201).json({
      id: doc._id,
      dateTime: doc.dateTime,
      endTime: doc.endTime || null,
      title: doc.title,
      details: doc.details || '',
      eventType: doc.eventType || 'ANA',
      clienteId: doc.clienteId || null,
      prospectoId: doc.prospectoId || null,
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
  endTime: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  details: z.string().optional(),
  eventType: eventTypeEnum.optional(),
  realizado: z.boolean().optional(),
  nota: z.string().optional(),
}).transform((data) => {
  const out = {}
  if (data.dateTime !== undefined) {
    const d = new Date(data.dateTime)
    if (Number.isNaN(d.getTime())) throw new Error('dateTime inválido')
    if (process.env.NODE_ENV !== 'production') {
      console.log('[agenda PUT] dateTime recibido:', data.dateTime, '→ guardado como:', d.toISOString())
    }
    out.dateTime = d
  }
  if (data.endTime !== undefined) {
    out.endTime = data.endTime === null || data.endTime === '' ? null : (() => { const e = new Date(data.endTime); return Number.isNaN(e.getTime()) ? undefined : e })()
  }
  if (data.title !== undefined) out.title = data.title.trim()
  if (data.details !== undefined) out.details = data.details.trim()
  if (data.eventType !== undefined) out.eventType = data.eventType
  if (data.realizado !== undefined) out.realizado = data.realizado
  if (data.nota !== undefined) out.nota = (data.nota || '').trim()
  return out
})

router.put('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const data = putSchema.parse(req.body)
    const doc = await AgendaEvent.findByIdAndUpdate(req.params.id, data, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Evento no encontrado' })
    if (data.realizado === true) {
      const payload = {
        eventId: String(doc._id),
        title: doc.title,
        dateTime: doc.dateTime,
        note: doc.nota || '',
      }
      if (doc.clienteId) payload.clienteId = String(doc.clienteId)
      if (doc.prospectoId) payload.prospectoId = String(doc.prospectoId)
      await Activity.create({ type: 'evento_realizado', payload })
    }
    res.json({
      id: doc._id,
      dateTime: doc.dateTime,
      endTime: doc.endTime || null,
      title: doc.title,
      details: doc.details || '',
      eventType: doc.eventType || 'ANA',
      realizado: !!doc.realizado,
      nota: doc.nota || '',
      clienteId: doc.clienteId || null,
      prospectoId: doc.prospectoId || null,
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
