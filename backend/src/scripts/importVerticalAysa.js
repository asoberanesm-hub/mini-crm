/**
 * Importa el Excel "vertical para aysa.xlsx" a la BD:
 * - Promotores (por nombre)
 * - Clientes (por nombre + promotor)
 * - ProductoCatalogo: CB, BANCO, PYME, T+N, CORPO, DERVI, FIDU
 * - GeneracionMensual (por fila con generación)
 * - ProductoContrato (por fila con STARTMES = producto de entrada ese mes)
 *
 * Uso: node src/scripts/importVerticalAysa.js
 * El archivo debe estar en: ../vertical para aysa.xlsx (respecto a backend)
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import Promotor from '../models/Promotor.js'
import Cliente from '../models/Cliente.js'
import ProductoCatalogo from '../models/ProductoCatalogo.js'
import ProductoContrato from '../models/ProductoContrato.js'
import GeneracionMensual from '../models/GeneracionMensual.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MES_A_NUM = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}

const PRODUCTOS_EXCEL = ['CB', 'BANCO', 'PYME', 'T+N', 'CORPO', 'DERVI', 'FIDU']
// Índices en la fila (header): 7=CB, 9=BANCO, 11=PYME, 12=T+N, 13=CORPO, 14=DERVI, 15=FIDU
const COL_STARTMES = 5
const COL_ANIO = 6
const COL_PRODUCTOS = [7, 9, 11, 12, 13, 14, 15] // CB, BANCO, PYME, T+N, CORPO, DERVI, FIDU

function mesANum(mesStr) {
  if (!mesStr || typeof mesStr !== 'string') return null
  const key = mesStr.trim().toUpperCase().replace(/\s+/g, ' ')
  return MES_A_NUM[key] ?? null
}

async function ensureProductos(catalog) {
  const created = {}
  for (const name of PRODUCTOS_EXCEL) {
    let p = await ProductoCatalogo.findOne({ name }).lean()
    if (!p) {
      p = await ProductoCatalogo.create({ name, category: 'Aysa' })
    }
    created[name] = p._id
  }
  return created
}

async function ensurePromotor(name, byName) {
  const n = (name || '').toString().trim()
  if (!n) return null
  if (byName[n]) return byName[n]
  let p = await Promotor.findOne({ name: new RegExp(`^${n}$`, 'i') }).lean()
  if (!p) {
    p = await Promotor.create({ name: n, active: true })
  }
  byName[n] = p._id
  return p._id
}

async function ensureCliente(nombreCliente, promotorId, byKey) {
  const name = (nombreCliente || '').toString().trim()
  if (!name || !promotorId) return null
  const key = `${promotorId}-${name}`
  if (byKey[key]) return byKey[key]
  let c = await Cliente.findOne({ promotorId, name }).lean()
  if (!c) {
    c = await Cliente.create({
      name,
      promotorId,
      onboardedAt: new Date(2025, 0, 1),
      status: 'activo',
    })
  }
  byKey[key] = c._id
  return c._id
}

async function run() {
  // Excel en la raíz del proyecto (mini crm/vertical para aysa.xlsx)
const excelPath = path.resolve(__dirname, '../../../vertical para aysa.xlsx')
  console.log('Leyendo:', excelPath)
  const wb = XLSX.readFile(excelPath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mini-crm'
  await mongoose.connect(uri)

  const productIds = await ensureProductos()
  const promotorById = {}
  const clienteByKey = {}

  let genInserted = 0
  let contratosInserted = 0
  const contratosSeen = new Set() // clientId|productId para no duplicar

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const mesStr = row[0]
    const promotorName = row[1]
    const nombreCliente = row[2]
    const generacion = typeof row[4] === 'number' ? row[4] : null
    const startMesProducto = (row[COL_STARTMES] || '').toString().trim().toUpperCase()
    const anio = typeof row[COL_ANIO] === 'number' ? row[COL_ANIO] : parseInt(row[COL_ANIO], 10)

    const mes = mesANum(mesStr)
    if (!mes || !anio) continue

    const promotorId = await ensurePromotor(promotorName, promotorById)
    const clientId = await ensureCliente(nombreCliente, promotorId, clienteByKey)
    if (!clientId) continue

    if (generacion != null && generacion > 0) {
      await GeneracionMensual.findOneAndUpdate(
        { clientId, year: anio, month: mes },
        { $set: { promotorId, clientId, year: anio, month: mes, amount: generacion, source: 'sistema' } },
        { upsert: true }
      )
      genInserted++
    }

    const productName = startMesProducto && PRODUCTOS_EXCEL.includes(startMesProducto) ? startMesProducto : null
    if (productName) {
      const productId = productIds[productName]
      const key = `${clientId}-${productId}`
      if (!contratosSeen.has(key)) {
        contratosSeen.add(key)
        const activatedAt = new Date(anio, mes - 1, 1)
        await ProductoContrato.findOneAndUpdate(
          { promotorId, clientId, productId },
          { $set: { stage: 'activado' }, $setOnInsert: { promotorId, clientId, productId, activatedAt } },
          { upsert: true }
        )
        contratosInserted++
      }
    }

    // Productos por columnas X (PYME, T+N, etc.)
    for (let j = 0; j < COL_PRODUCTOS.length; j++) {
      const val = row[COL_PRODUCTOS[j]]
      const hasProduct = val === 'X' || val === 'x' || (typeof val === 'number' && val > 0)
      if (!hasProduct) continue
      const pName = PRODUCTOS_EXCEL[j]
      const pid = productIds[pName]
      const key = `${clientId}-${pid}`
      if (contratosSeen.has(key)) continue
      contratosSeen.add(key)
      const activatedAt = new Date(anio, mes - 1, 1)
      await ProductoContrato.findOneAndUpdate(
        { promotorId, clientId, productId: pid },
        { $set: { stage: 'activado' }, $setOnInsert: { promotorId, clientId, productId: pid, activatedAt } },
        { upsert: true }
      )
      contratosInserted++
    }
  }

  console.log('Importación completada.')
  console.log('GeneracionMensual registros actualizados/insertados:', genInserted)
  console.log('ProductoContrato registros insertados/actualizados:', contratosInserted)
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
