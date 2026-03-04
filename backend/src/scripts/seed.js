import 'dotenv/config'
import mongoose from 'mongoose'
import Promotor from '../models/Promotor.js'
import Cliente from '../models/Cliente.js'
import ProductoCatalogo from '../models/ProductoCatalogo.js'
import ProductoContrato from '../models/ProductoContrato.js'
import GeneracionMensual from '../models/GeneracionMensual.js'
import Prospecto from '../models/Prospecto.js'
import ExpedienteUpdate from '../models/ExpedienteUpdate.js'

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mini-crm'

async function seed() {
  await mongoose.connect(uri)

  await Promotor.deleteMany({})
  await Cliente.deleteMany({})
  await ProductoCatalogo.deleteMany({})
  await ProductoContrato.deleteMany({})
  await GeneracionMensual.deleteMany({})
  await Prospecto.deleteMany({})
  await ExpedienteUpdate.deleteMany({})

  const year = new Date().getFullYear()
  const month = new Date().getMonth() + 1

  const pAna = await Promotor.create({
    name: 'ANA SOBERANES',
    slug: 'ana-soberanes',
    email: 'ana@empresa.com',
    monthlyGoals: [{ amount: 80000, month, year }],
    annualGoal: { amount: 960000, year },
    active: true,
  })
  const p1 = await Promotor.create({
    name: 'María García',
    email: 'maria@empresa.com',
    monthlyGoals: [{ amount: 50000, month, year }],
    annualGoal: { amount: 600000, year },
    active: true,
  })
  const p2 = await Promotor.create({
    name: 'Carlos López',
    email: 'carlos@empresa.com',
    monthlyGoals: [{ amount: 45000, month, year }],
    annualGoal: { amount: 540000, year },
    active: true,
  })

  const cAna1 = await Cliente.create({ name: 'Inversiones Norte', promotorId: pAna._id, onboardedAt: new Date(year, 0, 10), status: 'activo' })
  const cAna2 = await Cliente.create({ name: 'Fondo Capital', promotorId: pAna._id, onboardedAt: new Date(year, 2, 1), status: 'activo' })
  const c1 = await Cliente.create({ name: 'Constructora ABC', promotorId: p1._id, onboardedAt: new Date(year, 0, 15), status: 'activo' })
  const c2 = await Cliente.create({ name: 'Distribuidora XYZ', promotorId: p1._id, onboardedAt: new Date(year, 1, 1), status: 'activo' })
  const c3 = await Cliente.create({ name: 'Retail Plus', promotorId: p2._id, onboardedAt: new Date(year - 1, 10, 20), status: 'activo' })

  const prod1 = await ProductoCatalogo.create({ name: 'Seguro Vida', category: 'Seguros' })
  const prod2 = await ProductoCatalogo.create({ name: 'Fondo Inversión', category: 'Inversiones' })
  const prod3 = await ProductoCatalogo.create({ name: 'Crédito PYME', category: 'Créditos' })

  await ProductoContrato.create([
    { promotorId: pAna._id, clientId: cAna1._id, productId: prod1._id, stage: 'activado', activatedAt: new Date(year, 0, 20) },
    { promotorId: pAna._id, clientId: cAna2._id, productId: prod2._id, stage: 'activado', activatedAt: new Date(year, 2, 15) },
    { promotorId: p1._id, clientId: c1._id, productId: prod1._id, stage: 'activado', activatedAt: new Date(year, 0, 20) },
    { promotorId: p1._id, clientId: c1._id, productId: prod2._id, stage: 'negociación' },
    { promotorId: p1._id, clientId: c2._id, productId: prod1._id, stage: 'activado', activatedAt: new Date(year, 2, 1) },
    { promotorId: p2._id, clientId: c3._id, productId: prod3._id, stage: 'propuesta' },
  ])

  await GeneracionMensual.insertMany([
    { promotorId: pAna._id, clientId: cAna1._id, year, month, amount: 40000, source: 'manual' },
    { promotorId: pAna._id, clientId: cAna2._id, year, month, amount: 25000, source: 'manual' },
    { promotorId: p1._id, clientId: c1._id, year, month, amount: 25000, source: 'manual' },
    { promotorId: p1._id, clientId: c2._id, year, month, amount: 15000, source: 'manual' },
    { promotorId: p2._id, clientId: c3._id, year, month, amount: 32000, source: 'manual' },
  ])

  await Prospecto.create([
    { name: 'Prospecto Ana 1', promotorId: null, stage: 'propuesta', ciudad: 'CDMX', telefono: '5551234567', contacto: 'Juan Pérez', fechaFase1: new Date(), comentarioFase1: 'Primer contacto', fechaSeguimiento: new Date() },
    { name: 'Hotel del Sur', promotorId: p1._id, stage: 'propuesta', probability: 70, estimatedAmount: 80000, nextAction: 'Enviar cotización', nextActionDate: new Date() },
    { name: 'Transportes Norte', promotorId: p2._id, stage: 'perfilado', probability: 40, estimatedAmount: 45000 },
  ])

  await ExpedienteUpdate.create([
    { entityType: 'cliente', clientId: c1._id, docType: 'Acta constitutiva', status: 'completo', requestedAt: new Date(year, 0, 10), updatedAt: new Date(year, 0, 12) },
    { entityType: 'prospecto', prospectId: (await Prospecto.findOne())._id, docType: 'Estados financieros', status: 'pendiente', riskNotes: 'Solicitar antes de cierre' },
  ])

  console.log('Seed completado')
  await mongoose.disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
