import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import mongoose from 'mongoose'
import errorHandler from './middleware/errorHandler.js'

import promotoresRouter from './routes/promotores.js'
import clientesRouter from './routes/clientes.js'
import productosCatalogoRouter from './routes/productosCatalogo.js'
import productosContratosRouter from './routes/productosContratos.js'
import generacionRouter from './routes/generacion.js'
import prospectosRouter from './routes/prospectos.js'
import expedientesRouter from './routes/expedientes.js'
import metricsRouter from './routes/metrics.js'
import anaRouter from './routes/ana.js'
import promotoresVistasRouter from './routes/promotoresVistas.js'
import chatRouter from './routes/chat.js'
import agendaRouter from './routes/agenda.js'
import emailRouter from './routes/email.js'
import productosActivosRouter from './routes/productosActivos.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'https://mini-crm-frontend-yzpu.onrender.com',
  'https://monexaysa.lat',
  'https://www.monexaysa.lat',
]
if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.replace(/\/$/, '')
  if (url && !allowedOrigins.includes(url)) allowedOrigins.push(url)
}
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true)
    if (/\.onrender\.com$/.test(new URL(origin).hostname)) return cb(null, true)
    return cb(null, false)
  },
}))
app.use(morgan('dev'))
app.use(express.json())

app.get('/health', (_, res) => {
  const mongoConnected = mongoose.connection.readyState === 1
  res.json({
    ok: true,
    date: new Date().toISOString(),
    mongo: mongoConnected ? 'conectado' : 'desconectado',
  })
})

app.use('/api/v1/promotores', promotoresRouter)
app.use('/api/v1/clientes', clientesRouter)
app.use('/api/v1/productos/catalogo', productosCatalogoRouter)
app.use('/api/v1/productos/contratos', productosContratosRouter)
app.use('/api/v1/generacion', generacionRouter)
app.use('/api/v1/prospectos', prospectosRouter)
app.use('/api/v1/expedientes', expedientesRouter)
app.use('/api/v1/metrics', metricsRouter)
app.use('/api/v1/ana', anaRouter)
app.use('/api/v1/promotores-vistas', promotoresVistasRouter)
app.use('/api/v1/chat', chatRouter)
app.use('/api/v1/agenda', agendaRouter)
app.use('/api/v1/email', emailRouter)
app.use('/api/v1/productos-activos', productosActivosRouter)

app.use(errorHandler)

// Servidor arranca siempre; MongoDB se conecta en segundo plano (si falla, el resto de la API sigue disponible, p. ej. /email)
const MONGODB_URI = (process.env.MONGODB_URI || '').trim() || 'mongodb://localhost:27017/mini-crm'
mongoose.connection.on('disconnected', () => console.warn('MongoDB desconectado. Reconectando...'))
mongoose.connection.on('reconnected', () => console.log('MongoDB reconectado'))

app.listen(PORT, () => {
  console.log(`Server en http://localhost:${PORT}`)
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, retryWrites: true })
    .then(() => console.log('MongoDB conectado'))
    .catch((err) => {
      console.error('MongoDB error:', err.message)
      console.error('  → Revisa MONGODB_URI en backend/.env. La API responde pero las rutas que usan DB fallarán.')
    })
})
