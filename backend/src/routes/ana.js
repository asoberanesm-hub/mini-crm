import { Router } from 'express'
import Promotor from '../models/Promotor.js'
import Cliente from '../models/Cliente.js'
import ProductoContrato from '../models/ProductoContrato.js'
import GeneracionMensual from '../models/GeneracionMensual.js'
import Prospecto from '../models/Prospecto.js'
import { isConnected } from '../lib/db.js'

const router = Router()
const ANA_SLUG = 'ana-soberanes'

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

export default router
