import { Router } from 'express'
import OpenAI from 'openai'
import { z } from 'zod'
import Conversation from '../models/Conversation.js'
import AgendaEvent from '../models/AgendaEvent.js'
import { isConnected } from '../lib/db.js'

const router = Router()

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Siempre usa la fecha y hora real del servidor (ahora). Para pruebas puedes opcionalmente
// definir CHAT_REFERENCE_DATETIME en .env y descomentar la parte de abajo.
function getReferenceNow() {
  // const raw = (process.env.CHAT_REFERENCE_DATETIME || '').trim()
  // if (raw) { const d = new Date(raw); if (!Number.isNaN(d.getTime())) return d }
  return new Date()
}

function formatDateTime(d) {
  const dia = d.getDate()
  const mes = MESES[d.getMonth()]
  const anio = d.getFullYear()
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const minStr = m < 10 ? `0${m}` : String(m)
  return `${dia} de ${mes} de ${anio}, ${h12}:${minStr} ${ampm}`
}

function toDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function getAgendaForDay(date) {
  if (!isConnected()) return []
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  const events = await AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean()
  return events
}

/** Semana actual: lunes 00:00 a domingo 23:59:59 */
function getWeekStartEnd(now) {
  const d = new Date(now)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(mon.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { start: mon, end: sun }
}

async function getAgendaForRange(start, end) {
  if (!isConnected()) return []
  const events = await AgendaEvent.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: 1 }).lean()
  return events
}

const SYSTEM_PROMPT_BASE = `Eres el asistente de Aysa. Ayudas a los usuarios a navegar y usar la aplicación.

Módulos disponibles:
- **Dashboard**: resumen general (generación del mes, MoM, YoY, ranking de promotores, diversificación por producto).
- **ANA SOBERANES** > Clientes Activos: nombre, producto (Derivados, Captación, Pyme, T+N, Divisas, Reporto), fecha actualización, generación acumulada.
- **ANA SOBERANES** > Prospección: nombre, exim, ciudad, teléfono, contacto, fases 1/2/3 con fechas y comentarios, fecha seguimiento.
- **PROMOTORES** > Clientes nuevos: generación mensual desde 2025 y suma anual por promotor.
- **PROMOTORES** > Prospectos: por promotor, con mes de prospección inicial.
- **PROMOTORES** > Productos: por promotor (T+N, Derivados, Pyme, Corporativo, Fiduciario).

**Fecha y hora actual:**
- La fecha y hora que se te indica más abajo es la real del momento (se actualiza en cada mensaje). Cuando pregunten "¿qué fecha es?", "¿qué día es hoy?", "¿qué hora es?" o similar, responde con esa **fecha y hora actual**. No inventes: usa siempre la que se te indica.

**Agenda / calendario:**
- Puedes **agregar** eventos cuando el usuario diga "agenda una junta el martes a las 10", "anota que el 15 tengo reunión con Juan", "guarda en la agenda: llamada con cliente el viernes a las 15:00". Usa la herramienta create_event con fecha YYYY-MM-DD y opcionalmente hora HH:MM.
- **Eventos de hoy:** cuando pregunten "¿qué tengo hoy?", "¿qué hay en la agenda hoy?", "dime mis eventos de hoy", responde con la lista "Agenda de hoy" que se te indica abajo (solo el día actual).
- **Eventos de la semana:** cuando pregunten "¿qué tengo esta semana?", "dime la agenda de la semana", "¿qué eventos tengo entre el lunes y el viernes?", usa la sección "Agenda de esta semana" que se te indica abajo y responde con una lista clara por día y hora.
- Interpreta fechas en español: "mañana", "pasado mañana", "el 25 de marzo", "el lunes próximo", etc., usando la fecha actual de referencia.

Responde siempre en español, de forma breve y útil. Si preguntan cómo ir a una sección, indica la ruta en el menú (ej: "Ve a ANA SOBERANES y luego clic en Clientes Activos"). La aplicación se llama Aysa.`

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.union([z.string().min(24), z.null()]).optional().transform((v) => v || undefined),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().optional().default(''),
  })).optional().default([]),
})

router.get('/status', (_, res) => {
  const key = (process.env.OPENAI_API_KEY || '').trim()
  res.json({
    openaiConfigured: !!key,
    keyPrefix: key ? `${key.slice(0, 7)}...` : null,
  })
})

const CREATE_EVENT_TOOL = {
  type: 'function',
  function: {
    name: 'create_event',
    description: 'Guarda un evento en la agenda del usuario. Usar cuando pida guardar, anotar o agendar algo (fecha, hora, título, detalles).',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD (ej: 2026-03-25)' },
        time: { type: 'string', description: 'Hora opcional en formato HH:MM en 24h (ej: 10:00, 14:30)' },
        title: { type: 'string', description: 'Título corto del evento' },
        details: { type: 'string', description: 'Detalles opcionales' },
      },
      required: ['date', 'title'],
    },
  },
}

async function runCreateEvent(args, conversationId) {
  const dateStr = args.date
  const timeStr = args.time || '12:00'
  const title = (args.title || '').trim() || 'Sin título'
  const details = (args.details || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { ok: false, error: 'Fecha debe ser YYYY-MM-DD' }
  const [y, m, d] = dateStr.split('-').map(Number)
  let h = 12
  let min = 0
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [th, tm] = timeStr.split(':').map(Number)
    h = th
    min = tm
  }
  const dateTime = new Date(y, m - 1, d, h, min, 0, 0)
  if (Number.isNaN(dateTime.getTime())) return { ok: false, error: 'Fecha u hora inválida' }
  if (!isConnected()) return { ok: false, error: 'Base de datos no disponible' }
  await AgendaEvent.create({
    dateTime,
    title,
    details,
    conversationId: conversationId || undefined,
  })
  return { ok: true, message: `Evento guardado: ${title} el ${d}/${m}/${y}${timeStr !== '12:00' ? ` a las ${timeStr}` : ''}.` }
}

router.post('/', async (req, res) => {
  const sendReply = (reply) => res.json({ reply })
  try {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim()
    if (!apiKey) {
      return sendReply('El chat aún no está configurado. Agrega OPENAI_API_KEY en backend/.env y reinicia el backend (npm run dev).')
    }

    let data
    try {
      data = bodySchema.parse(req.body)
    } catch (zErr) {
      return sendReply('Mensaje no válido. Escribe de nuevo.')
    }

    const now = getReferenceNow()
    const dateLabel = formatDateTime(now)
    const todayStr = toDateString(now)
    const agendaHoy = await getAgendaForDay(now)
    const agendaText = agendaHoy.length
      ? agendaHoy.map((e) => {
          const h = e.dateTime.getHours()
          const m = e.dateTime.getMinutes()
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          return `- ${timeStr} ${e.title}${e.details ? ` (${e.details})` : ''}`
        }).join('\n')
      : '- Sin eventos para hoy.'

    const { start: weekStart, end: weekEnd } = getWeekStartEnd(now)
    const agendaSemana = await getAgendaForRange(weekStart, weekEnd)
    const byDay = {}
    agendaSemana.forEach((e) => {
      const dayStr = toDateString(e.dateTime)
      if (!byDay[dayStr]) byDay[dayStr] = []
      byDay[dayStr].push(e)
    })
    const weekDays = [weekStart].concat(Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i + 1)
      return d
    }))
    const agendaSemanaText = weekDays.map((d) => {
      const ds = toDateString(d)
      const events = byDay[ds] || []
      const dayLabel = `${d.getDate()} ${MESES[d.getMonth()]}`
      const eventsStr = events.length
        ? events.map((e) => {
            const h = e.dateTime.getHours()
            const m = e.dateTime.getMinutes()
            return `  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${e.title}${e.details ? ` (${e.details})` : ''}`
          }).join('\n')
        : '  (sin eventos)'
      return `${dayLabel} (${ds}):\n${eventsStr}`
    }).join('\n\n')

    const systemContent = `${SYSTEM_PROMPT_BASE}

**Fecha y hora actual del sistema (es la de ahora; "hoy" y "mañana" se interpretan con base en esta):** ${dateLabel}

**Agenda de hoy (${todayStr}):**
${agendaText}

**Agenda de esta semana (lunes a domingo):**
${agendaSemanaText}

(La fecha/hora de arriba es la actual del sistema; "hoy" y "ahora" se refieren a ese momento.)`

    const openai = new OpenAI({ apiKey })
    let messages = [
      { role: 'system', content: systemContent },
      ...(data.history || []).slice(-12).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: data.message },
    ]

    const tools = [CREATE_EVENT_TOOL]
    let reply = ''
    let conversationId = data.conversationId
    const maxToolRounds = 3
    let round = 0

    while (round < maxToolRounds) {
      const completion = await openai.chat.completions.create({
        model: (process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini').trim(),
        messages,
        max_tokens: 500,
        temperature: 0.6,
        tools: round === 0 ? tools : undefined,
        tool_choice: round === 0 ? 'auto' : undefined,
      })

      const msg = completion.choices[0]?.message
      const content = msg?.content?.trim()
      const toolCalls = msg?.tool_calls

      if (toolCalls?.length) {
        for (const tc of toolCalls) {
          if (tc.function?.name === 'create_event') {
            let args = {}
            try {
              args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
            } catch (_) {}
            const result = await runCreateEvent(args, conversationId || null)
            messages.push({
              role: 'assistant',
              content: content || null,
              tool_calls: [{ id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } }],
            })
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            })
          }
        }
        round++
        continue
      }

      reply = content || 'No pude generar una respuesta.'
      break
    }

    if (!reply && round >= maxToolRounds) reply = 'Listo. ¿Necesitas algo más?'

    if (isConnected()) {
      try {
        if (conversationId) {
          await Conversation.findByIdAndUpdate(conversationId, {
            $push: { messages: [{ role: 'user', content: data.message }, { role: 'assistant', content: reply }] },
          })
        } else {
          const doc = await Conversation.create({
            messages: [{ role: 'user', content: data.message }, { role: 'assistant', content: reply }],
          })
          conversationId = doc._id.toString()
        }
      } catch (_) { /* ignorar fallo al guardar conversación */ }
    }

    return res.json({ reply, conversationId })
  } catch (e) {
    console.error('Chat error:', e)
    return sendReply(
      e.message?.includes('API key') || e.message?.includes('invalid')
        ? 'La API key de OpenAI no es válida o expiró. Revisa OPENAI_API_KEY en backend/.env y reinicia el backend.'
        : 'No pude conectar con el asistente. Reinicia el backend (npm run dev) y vuelve a intentar.'
    )
  }
})

export default router
