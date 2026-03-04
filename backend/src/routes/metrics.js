import { Router } from 'express'
import Promotor from '../models/Promotor.js'
import { isConnected } from '../lib/db.js'
import GeneracionMensual from '../models/GeneracionMensual.js'
import ProductoContrato from '../models/ProductoContrato.js'
import Cliente from '../models/Cliente.js'

const router = Router()

router.get('/overview', async (req, res, next) => {
  try {
    if (!isConnected()) {
      return res.json({ generacionTotal: 0, mom: null, yoy: null, ranking: [], clientesNuevosEfectivos: 0, diversificacion: [], year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
    }
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10)
    const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10)

    const gen = await GeneracionMensual.aggregate([
      { $match: { year, month } },
      { $group: { _id: '$promotorId', total: { $sum: '$amount' } } },
    ])

    const totalGen = gen.reduce((s, g) => s + g.total, 0)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevGen = await GeneracionMensual.aggregate([
      { $match: { year: prevYear, month: prevMonth } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const prevTotal = prevGen[0]?.total ?? 0
    const mom = prevTotal ? ((totalGen - prevTotal) / prevTotal * 100).toFixed(1) : null

    const prevYearGen = await GeneracionMensual.aggregate([
      { $match: { year: year - 1, month } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const prevYearTotal = prevYearGen[0]?.total ?? 0
    const yoy = prevYearTotal ? ((totalGen - prevYearTotal) / prevYearTotal * 100).toFixed(1) : null

    const promotores = await Promotor.find({ active: true }).lean()
    const ranking = promotores.map(p => ({
      promotor: p,
      total: gen.find(g => g._id?.toString() === p._id.toString())?.total ?? 0,
    })).sort((a, b) => b.total - a.total)

    const activados = await ProductoContrato.countDocuments({ stage: 'activado', activatedAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } })
    const clientesConGen = await GeneracionMensual.distinct('clientId', { year, month, amount: { $gt: 0 } })

    const byProduct = await ProductoContrato.aggregate([
      { $match: { stage: 'activado' } },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
      { $lookup: { from: 'productocatalogos', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { name: '$product.name', count: 1 } },
    ])
    const totalProd = byProduct.reduce((s, p) => s + p.count, 0)
    const diversificacion = byProduct.map(p => ({ ...p, pct: totalProd ? (p.count / totalProd * 100).toFixed(1) : 0 }))

    res.json({
      year,
      month,
      generacionTotal: totalGen,
      mom,
      yoy,
      ranking,
      clientesNuevosEfectivos: clientesConGen.length,
      productosActivados: activados,
      diversificacion,
    })
  } catch (e) { next(e) }
})

router.get('/promotor/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Base de datos no conectada' })
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10)
    const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10)
    const pid = req.params.id

    const promotor = await Promotor.findById(pid)
    if (!promotor) return res.status(404).json({ error: 'No encontrado' })

    const genActual = await GeneracionMensual.aggregate([
      { $match: { promotorId: promotor._id, year, month } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const totalGen = genActual[0]?.total ?? 0

    const metaMensual = promotor.monthlyGoals?.find(g => g.year === year && g.month === month)?.amount ??
      promotor.monthlyGoals?.find(g => g.year === year)?.amount
    const metaAnual = promotor.annualGoal?.year === year ? promotor.annualGoal.amount : null

    const genPorCliente = await GeneracionMensual.aggregate([
      { $match: { promotorId: promotor._id, year, month } },
      { $group: { _id: '$clientId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $lookup: { from: 'clientes', localField: '_id', foreignField: '_id', as: 'client' } },
      { $unwind: '$client' },
      { $project: { cliente: '$client.name', total: 1 } },
    ])

    const pipeline = await ProductoContrato.aggregate([
      { $match: { promotorId: promotor._id } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ])

    const estancados = await ProductoContrato.find({
      promotorId: promotor._id,
      stage: { $nin: ['activado', 'perdido'] },
      createdAtStage: { $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    }).populate('clientId', 'name').populate('productId', 'name').lean()

    const byProduct = await ProductoContrato.aggregate([
      { $match: { promotorId: promotor._id, stage: 'activado' } },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
      { $lookup: { from: 'productocatalogos', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { name: '$product.name', count: 1 } },
    ])

    res.json({
      promotor,
      year,
      month,
      generacionActual: totalGen,
      metaMensual: metaMensual ?? null,
      metaAnual: metaAnual ?? null,
      avancePct: metaMensual ? (totalGen / metaMensual * 100).toFixed(1) : null,
      topClientes: genPorCliente.slice(0, 5),
      pipeline,
      estancados,
      diversificacion: byProduct,
    })
  } catch (e) { next(e) }
})

export default router
