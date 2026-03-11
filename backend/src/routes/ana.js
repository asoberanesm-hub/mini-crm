import { Router } from 'express'
import Promotor from '../models/Promotor.js'
import Cliente from '../models/Cliente.js'
import ProductoContrato from '../models/ProductoContrato.js'
import GeneracionMensual from '../models/GeneracionMensual.js'
import Prospecto from '../models/Prospecto.js'
import CursoAna from '../models/CursoAna.js'
import { isConnected } from '../lib/db.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const ANA_SLUG = 'ana-soberanes'

// Configuración para subir constancias PDF de cursos
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../../uploads/cursos')
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = String(file.originalname || 'constancia').replace(/[^a-zA-Z0-9._-]/g, '_')
    const ts = Date.now()
    cb(null, `${ts}-${safeName}`)
  },
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'))
    }
    cb(null, true)
  },
})

router.get('/clientes-activos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const ana = await Promotor.findOne({ slug: ANA_SLUG })
    if (!ana) return res.json([])
    const clientes = await Cliente.find({ promotorId: ana._id, status: 'activo' }).lean()
    const clientIds = clientes.map((c) => c._id)
    if (clientIds.length === 0) return res.json([])
    const [contratos, generacion] = await Promise.all([
      ProductoContrato.find({ clientId: { $in: clientIds } }).populate('productId', 'name').lean(),
      GeneracionMensual.aggregate([{ $match: { clientId: { $in: clientIds } } }, { $group: { _id: '$clientId', total: { $sum: '$amount' } } }]),
    ])
    const genMap = Object.fromEntries(generacion.map((g) => [g._id.toString(), g.total]))
    const byClient = {}
    contratos.forEach((c) => {
      const id = c.clientId.toString()
      if (!byClient[id]) byClient[id] = { productos: [], lastUpdate: c.updatedAt }
      byClient[id].productos.push(c.productId?.name || '-')
      if (c.updatedAt > byClient[id].lastUpdate) byClient[id].lastUpdate = c.updatedAt
    })
    const list = clientes.map((c) => {
      const id = c._id.toString()
      const extra = byClient[id] || { productos: [], lastUpdate: c.updatedAt }
      const lastUpdate = extra.lastUpdate && c.updatedAt
        ? new Date(Math.max(new Date(extra.lastUpdate), new Date(c.updatedAt)))
        : (extra.lastUpdate || c.updatedAt)
      return {
        _id: c._id,
        nombre: c.name,
        producto: extra.productos.length ? extra.productos.join(', ') : '-',
        fechaActualizacion: lastUpdate,
        generacionAcumulada: genMap[id] ?? 0,
      }
    })
    res.json(list)
  } catch (e) { next(e) }
})

router.get('/prospeccion', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const list = await Prospecto.find({ promotorId: null })
      .sort({ fechaSeguimiento: 1, name: 1 })
      .lean()
    res.json(list)
  } catch (e) { next(e) }
})

// CURSOS ANA — CRUD simple sin subir archivos (se guarda constanciaPdfUrl como string/url)

router.get('/cursos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const list = await CursoAna.find({}).sort({ fechaLimite: 1, nombreCurso: 1 }).lean()
    res.json(list)
  } catch (e) {
    next(e)
  }
})

router.post('/cursos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const { nombreCurso, tipoCurso, fechaLimite, constanciaPdfUrl } = req.body || {}
    if (!nombreCurso || !tipoCurso || !fechaLimite) {
      return res.status(400).json({ error: 'nombreCurso, tipoCurso y fechaLimite son obligatorios.' })
    }
    const doc = await CursoAna.create({
      nombreCurso: String(nombreCurso).trim(),
      tipoCurso: String(tipoCurso).trim(),
      fechaLimite: new Date(fechaLimite),
      constanciaPdfUrl: constanciaPdfUrl ? String(constanciaPdfUrl).trim() : '',
    })
    res.status(201).json(doc)
  } catch (e) {
    next(e)
  }
})

router.put('/cursos/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const updates = {}
    const { nombreCurso, tipoCurso, fechaLimite, realizado, fechaRealizacion, constanciaPdfUrl } = req.body || {}
    if (nombreCurso !== undefined) updates.nombreCurso = String(nombreCurso).trim()
    if (tipoCurso !== undefined) updates.tipoCurso = String(tipoCurso).trim()
    if (fechaLimite !== undefined) updates.fechaLimite = new Date(fechaLimite)
    if (constanciaPdfUrl !== undefined) updates.constanciaPdfUrl = String(constanciaPdfUrl).trim()

    if (realizado !== undefined) {
      updates.realizado = !!realizado
      if (updates.realizado) {
        updates.fechaRealizacion = fechaRealizacion ? new Date(fechaRealizacion) : new Date()
      } else {
        updates.fechaRealizacion = fechaRealizacion ? new Date(fechaRealizacion) : null
      }
    }

    const doc = await CursoAna.findByIdAndUpdate(req.params.id, updates, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Curso no encontrado' })
    res.json(doc)
  } catch (e) {
    next(e)
  }
})

router.delete('/cursos/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    const doc = await CursoAna.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Curso no encontrado' })
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

// Subir / reemplazar constancia PDF para un curso
router.post('/cursos/:id/constancia', upload.single('file'), async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada.' })
    if (!req.file) return res.status(400).json({ error: 'Archivo PDF requerido' })
    const relativePath = `/uploads/cursos/${req.file.filename}`
    const doc = await CursoAna.findByIdAndUpdate(
      req.params.id,
      { constanciaPdfUrl: relativePath },
      { new: true }
    ).lean()
    if (!doc) return res.status(404).json({ error: 'Curso no encontrado' })
    res.json(doc)
  } catch (e) {
    if (e.message && e.message.includes('Solo se permiten archivos PDF')) {
      return res.status(400).json({ error: e.message })
    }
    next(e)
  }
})

export default router
