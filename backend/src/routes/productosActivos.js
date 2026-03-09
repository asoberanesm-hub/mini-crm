import { Router } from 'express'
import ProductoActivo from '../models/ProductoActivo.js'
import { isConnected } from '../lib/db.js'

const router = Router()

const PRODUCT_KEYS = ['pfae', 'derivados', 'tN', 'inversion', 'captacion', 'pyme', 'corporativoFiduciario']

/** Convierte Date a string YYYY-MM-DD. Evita enviar ISO al frontend. */
function toDateOnlyString(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return ''
}

/** Normaliza valor de producto para guardar: '', 'tramite', 'activo' o string de fecha. */
function normalizeProductValue(val) {
  if (val === undefined || val === null) return ''
  const s = String(val).trim()
  if (s === '') return ''
  const lower = s.toLowerCase()
  if (lower === 'tramite' || lower === 'trámite' || lower === 'pendiente') return 'tramite'
  if (lower === 'activo' || lower === 'sí' || lower === 'si') return 'activo'
  return s
}

/** Asegura que cada documento tenga todos los campos de producto; nunca devolver undefined. */
function normalizeDoc(doc) {
  const out = { ...doc }
  PRODUCT_KEYS.forEach((k) => {
    const val = out[k]
    if (val instanceof Date) out[k] = toDateOnlyString(val)
    else if (val === undefined || val === null) out[k] = ''
    else out[k] = String(val).trim()
  })
  return out
}

router.get('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const list = await ProductoActivo.find({}).sort({ name: 1 }).lean()
    const result = list.map(normalizeDoc)
    if (process.env.NODE_ENV !== 'production' && result.length > 0) {
      console.log('[productosActivos GET] primera fila raw.pfae:', list[0]?.pfae, 'normalizada:', result[0]?.pfae)
    }
    return res.json(result)
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const doc = await ProductoActivo.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    return res.json(normalizeDoc(doc))
  } catch (e) { next(e) }
})

// POST: cada producto (incluido PFAE) con el mismo tratamiento: leer body y normalizar.
router.post('/', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const body = req.body || {}
    if (process.env.NODE_ENV !== 'production') {
      console.log('[productosActivos POST] body.pfae recibido:', body.pfae)
    }
    const name = (body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Nombre requerido' })
    const toCreate = {
      name,
      pfae: normalizeProductValue(body.pfae),
      derivados: normalizeProductValue(body.derivados),
      tN: normalizeProductValue(body.tN),
      inversion: normalizeProductValue(body.inversion),
      captacion: normalizeProductValue(body.captacion),
      pyme: normalizeProductValue(body.pyme),
      corporativoFiduciario: normalizeProductValue(body.corporativoFiduciario),
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[productosActivos POST] toCreate.pfae:', toCreate.pfae)
    }
    const doc = await ProductoActivo.create(toCreate)
    const out = normalizeDoc(doc.toObject ? doc.toObject() : doc)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[productosActivos POST] doc guardado, out.pfae en respuesta:', out.pfae)
    }
    return res.status(201).json(out)
  } catch (e) {
    next(e)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const body = req.body || {}
    if (process.env.NODE_ENV !== 'production') {
      console.log('[productosActivos PUT] body.pfae recibido:', body.pfae)
    }
    const doc = await ProductoActivo.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.name = (body.name !== undefined && body.name !== null ? String(body.name) : doc.name || '').trim()
    doc.pfae = body.pfae !== undefined && body.pfae !== null ? normalizeProductValue(body.pfae) : normalizeProductValue(doc.pfae)
    doc.derivados = body.derivados !== undefined && body.derivados !== null ? normalizeProductValue(body.derivados) : normalizeProductValue(doc.derivados)
    doc.tN = body.tN !== undefined && body.tN !== null ? normalizeProductValue(body.tN) : normalizeProductValue(doc.tN)
    doc.inversion = body.inversion !== undefined && body.inversion !== null ? normalizeProductValue(body.inversion) : normalizeProductValue(doc.inversion)
    doc.captacion = body.captacion !== undefined && body.captacion !== null ? normalizeProductValue(body.captacion) : normalizeProductValue(doc.captacion)
    doc.pyme = body.pyme !== undefined && body.pyme !== null ? normalizeProductValue(body.pyme) : normalizeProductValue(doc.pyme)
    doc.corporativoFiduciario = body.corporativoFiduciario !== undefined && body.corporativoFiduciario !== null ? normalizeProductValue(body.corporativoFiduciario) : normalizeProductValue(doc.corporativoFiduciario)
    await doc.save()
    const out = normalizeDoc(doc.toObject ? doc.toObject() : doc)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[productosActivos PUT] doc guardado, out.pfae en respuesta:', out.pfae)
    }
    return res.json(out)
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await ProductoActivo.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.status(204).send()
  } catch (e) { next(e) }
})

export default router
