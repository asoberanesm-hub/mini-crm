import { Router } from 'express'
import Promotor from '../models/Promotor.js'
import Cliente from '../models/Cliente.js'
import GeneracionMensual from '../models/GeneracionMensual.js'
import Prospecto from '../models/Prospecto.js'
import ProductoContrato from '../models/ProductoContrato.js'
import { isConnected } from '../lib/db.js'

const router = Router()
const DESDE_ANIO = 2025

router.get('/clientes-nuevos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const promotores = await Promotor.find({ active: true }).lean()
    const result = []
    for (const p of promotores) {
      const clientes = await Cliente.find({ promotorId: p._id }).lean()
      const clientIds = clientes.map((c) => c._id)
      const [gen, porAnio, contratos] = await Promise.all([
        GeneracionMensual.aggregate([
          { $match: { promotorId: p._id, year: { $gte: DESDE_ANIO } } },
          { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$amount' } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        GeneracionMensual.aggregate([
          { $match: { promotorId: p._id, year: { $gte: DESDE_ANIO } } },
          { $group: { _id: '$year', total: { $sum: '$amount' } } },
          { $sort: { _id: 1 } },
        ]),
        ProductoContrato.find({ promotorId: p._id, stage: 'activado' })
          .populate('clientId', 'name')
          .populate('productId', 'name')
          .lean(),
      ])
      const productosPorCliente = {}
      contratos.forEach((c) => {
        const cid = c.clientId?._id?.toString()
        const cname = c.clientId?.name || '-'
        if (!cid) return
        if (!productosPorCliente[cid]) {
          productosPorCliente[cid] = { nombreCliente: cname, productos: [] }
        }
        const activated = c.activatedAt ? new Date(c.activatedAt) : null
        productosPorCliente[cid].productos.push({
          producto: c.productId?.name || '-',
          mes: activated ? activated.getMonth() + 1 : null,
          año: activated ? activated.getFullYear() : null,
        })
      })
      const clientesConProductos = Object.values(productosPorCliente)
      result.push({
        promotorId: p._id,
        nombre: p.name,
        mensual: gen.map((g) => ({ year: g._id.year, month: g._id.month, generacion: g.total })),
        anual: porAnio.map((g) => ({ year: g._id, suma: g.total })),
        clientes: clientesConProductos,
      })
    }
    res.json(result)
  } catch (e) { next(e) }
})

router.get('/prospectos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const list = await Prospecto.find({ promotorId: { $ne: null } })
      .populate('promotorId', 'name')
      .sort({ createdAt: 1 })
      .lean()
    const byPromotor = {}
    list.forEach((pr) => {
      const id = pr.promotorId?._id?.toString() || 'sin-promotor'
      if (!byPromotor[id]) byPromotor[id] = { promotor: pr.promotorId?.name, prospectos: [] }
      const mesInicial = pr.createdAt ? new Date(pr.createdAt).toISOString().slice(0, 7) : '-'
      byPromotor[id].prospectos.push({ ...pr, mesProspeccionInicial: mesInicial })
    })
    res.json(Object.values(byPromotor))
  } catch (e) { next(e) }
})

router.get('/productos', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json([])
    const list = await ProductoContrato.find()
      .populate('promotorId', 'name')
      .populate('clientId', 'name')
      .populate('productId', 'name')
      .lean()
    const byPromotor = {}
    list.forEach((c) => {
      const pid = c.promotorId?._id?.toString()
      if (!pid) return
      if (!byPromotor[pid]) byPromotor[pid] = { promotor: c.promotorId?.name, filas: [] }
      byPromotor[pid].filas.push({
        nombreCliente: c.clientId?.name || '-',
        producto: c.productId?.name || '-',
      })
    })
    res.json(Object.values(byPromotor))
  } catch (e) { next(e) }
})

export default router
