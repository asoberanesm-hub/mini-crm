import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addHours, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { fetchApi, postApi, putApi, deleteApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'
import LoadingModule from '../components/LoadingModule'

const locales = { es }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

function toInputDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().slice(0, 10)
}

function toInputTime(d) {
  if (!d) return '12:00'
  const date = new Date(d)
  const h = date.getHours()
  const m = date.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatDateShort(d) {
  return d ? format(new Date(d), 'd/M/yyyy', { locale: es }) : '-'
}

function formatTime(d) {
  return d ? format(new Date(d), 'HH:mm', { locale: es }) : '-'
}

export default function Agenda() {
  const queryClient = useQueryClient()
  const now = useMemo(() => new Date(), [])
  const [rangeFrom] = useState(() => format(subMonths(now, 2), 'yyyy-MM-dd'))
  const [rangeTo] = useState(() => format(addMonths(now, 5), 'yyyy-MM-dd'))

  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoDetalles, setNuevoDetalles] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(toInputDate(now))
  const [nuevaHora, setNuevaHora] = useState('09:00')
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: rawEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['agenda', rangeFrom, rangeTo],
    queryFn: () => fetchApi(`/agenda?from=${rangeFrom}&to=${rangeTo}`),
    placeholderData: keepPreviousData,
  })

  const invalidateAgenda = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda'] })
  }

  const crear = useMutation({
    mutationFn: (payload) => postApi('/agenda', payload),
    onSuccess: () => {
      invalidateAgenda()
      setNuevoTitulo('')
      setNuevoDetalles('')
      setShowAddForm(false)
    },
  })

  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/agenda/${id}`, payload),
    onSuccess: () => {
      invalidateAgenda()
      setEditingEvent(null)
      setSelectedEvent(null)
    },
  })

  const eliminar = useMutation({
    mutationFn: (id) => deleteApi(`/agenda/${id}`),
    onSuccess: () => {
      invalidateAgenda()
      setEditingEvent(null)
      setSelectedEvent(null)
    },
  })

  const calendarEvents = useMemo(() => {
    return rawEvents.map((e) => {
      const start = new Date(e.dateTime)
      const end = addHours(start, 1)
      return {
        ...e,
        start,
        end,
      }
    })
  }, [rawEvents])

  const nowTime = useMemo(() => new Date(), [rawEvents])

  const vencidos = useMemo(() => {
    return rawEvents
      .filter((e) => new Date(e.dateTime) < nowTime)
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
  }, [rawEvents, nowTime])

  const proximosAll = useMemo(() => {
    return rawEvents
      .filter((e) => new Date(e.dateTime) >= nowTime)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  }, [rawEvents, nowTime])

  const proximosPanel = proximosAll.slice(0, 6)
  const proximosList = proximosAll.slice(0, 10)

  const handleCrear = (e) => {
    e.preventDefault()
    if (!nuevoTitulo.trim()) return
    const dateTime = `${nuevaFecha}T${nuevaHora}:00`
    crear.mutate({ dateTime, title: nuevoTitulo.trim(), details: nuevoDetalles.trim() || '' })
  }

  const handleGuardarEdit = (e) => {
    e.preventDefault()
    if (!editingEvent || !editingEvent.title?.trim()) return
    const d = typeof editingEvent.dateTime === 'string' ? editingEvent.dateTime : (toInputDate(editingEvent.dateTime) + 'T' + toInputTime(editingEvent.dateTime))
    const dateTime = d.length === 16 ? d + ':00' : d
    actualizar.mutate({
      id: editingEvent.id,
      payload: { dateTime, title: editingEvent.title.trim(), details: (editingEvent.details || '').trim() },
    })
  }

  const handleEliminar = (event) => {
    if (event.isProspectFollowUp) return
    if (!window.confirm(`¿Eliminar el evento "${event.title}"?`)) return
    eliminar.mutate(event.id)
  }

  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    if (event.isProspectFollowUp) {
      setEditingEvent(null)
    } else {
      setEditingEvent({ ...event, dateTime: event.start })
    }
  }

  const eventPropGetter = (event) => {
    if (event.isProspectFollowUp) {
      return { className: 'rbc-event-seguimiento' }
    }
    return {}
  }

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Agenda</h1>
        <p className="text-slate-600 text-sm mt-1">Calendario, recordatorios y seguimientos desde Prospección.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        {/* Panel Recordatorios (izquierda) */}
        <aside className="order-2 xl:order-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <h2 className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100 bg-slate-50/50">
              Recordatorios
            </h2>

            <div className="p-4 space-y-4">
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vencidos</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {vencidos.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No hay recordatorios vencidos</p>
                  ) : (
                    vencidos.map((e) => (
                      <div
                        key={e.id}
                        className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-slate-800 text-sm"
                      >
                        <div className="font-medium text-red-800">{e.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDateShort(e.dateTime)} · {formatTime(e.dateTime)}
                        </div>
                        {e.isProspectFollowUp && (
                          <span className="text-xs text-amber-700 mt-1 inline-block">Seguimiento</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Próximos</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {proximosPanel.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No hay recordatorios próximos</p>
                  ) : (
                    proximosPanel.map((e) => (
                      <div
                        key={e.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm hover:border-sky-200 cursor-pointer"
                        onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                      >
                        <div className="font-medium text-slate-800">{e.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDateShort(e.dateTime)} · {formatTime(e.dateTime)}
                        </div>
                        {e.isProspectFollowUp && (
                          <span className="text-xs text-amber-700 mt-1 inline-block">Seguimiento</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </aside>

        {/* Calendario principal (derecha) */}
        <main className="order-1 xl:order-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 shadow-sm"
              >
                {showAddForm ? 'Cerrar' : 'Agregar evento'}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCrear}
                className="bg-slate-50 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3 border border-slate-200"
              >
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={nuevaHora}
                  onChange={(e) => setNuevaHora(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Título *"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
                  required
                />
                <input
                  type="text"
                  placeholder="Detalles"
                  value={nuevoDetalles}
                  onChange={(e) => setNuevoDetalles(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[140px]"
                />
                <button
                  type="submit"
                  disabled={crear.isPending || !nuevoTitulo.trim()}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  {crear.isPending ? 'Guardando...' : 'Agregar'}
                </button>
                {crear.isError && <span className="text-red-600 text-sm">{crear.error?.message}</span>}
                {crear.isSuccess && <span className="text-green-600 text-sm">Guardado.</span>}
              </form>
            )}

            {editingEvent && !editingEvent.isProspectFollowUp && (
              <form
                onSubmit={handleGuardarEdit}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3"
              >
                <span className="w-full text-sm font-medium text-amber-800">Editando evento</span>
                <input
                  type="date"
                  value={toInputDate(editingEvent.dateTime)}
                  onChange={(e) => setEditingEvent((ev) => ({ ...ev, dateTime: e.target.value + 'T' + toInputTime(ev.dateTime) }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={toInputTime(editingEvent.dateTime)}
                  onChange={(e) => setEditingEvent((ev) => ({ ...ev, dateTime: toInputDate(ev.dateTime) + 'T' + e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Título *"
                  value={editingEvent.title || ''}
                  onChange={(e) => setEditingEvent((ev) => ({ ...ev, title: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
                  required
                />
                <input
                  type="text"
                  placeholder="Detalles"
                  value={editingEvent.details || ''}
                  onChange={(e) => setEditingEvent((ev) => ({ ...ev, details: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[140px]"
                />
                <button type="submit" disabled={actualizar.isPending} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingEvent(null); setSelectedEvent(null); }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => editingEvent && handleEliminar(editingEvent)}
                  disabled={eliminar.isPending}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  Eliminar
                </button>
                {actualizar.isError && <span className="text-red-600 text-sm">{actualizar.error?.message}</span>}
              </form>
            )}

            {selectedEvent && editingEvent === null && selectedEvent.isProspectFollowUp && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedEvent.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedEvent.details || 'Fecha de seguimiento'}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDateShort(selectedEvent.start)} · {formatTime(selectedEvent.start)}
                    </p>
                    <span className="inline-block mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">Seguimiento desde Prospección</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-[400px]">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
                views={['month', 'week']}
                defaultView="month"
                messages={{
                  today: 'Hoy',
                  previous: 'Ant',
                  next: 'Sig',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  agenda: 'Agenda',
                  date: 'Fecha',
                  time: 'Hora',
                  event: 'Evento',
                  noEventsInRange: 'No hay eventos en este rango.',
                }}
                culture="es"
              />
            </div>
          </div>

          {/* Próximos eventos (máx 10) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <h2 className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100 bg-slate-50/50">
              Próximos eventos
            </h2>
            <div className="p-4">
              {proximosList.length === 0 ? (
                <p className="text-slate-500 py-6 text-center text-sm">No hay eventos próximos</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {proximosList.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-sky-200 hover:bg-sky-50/30 transition-colors cursor-pointer"
                      onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                    >
                      <div className="text-xs font-medium text-sky-600">{formatTime(e.dateTime)}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDateShort(e.dateTime)}</div>
                      <div className="font-medium text-slate-800 mt-1.5 truncate" title={e.title}>{e.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate" title={e.details}>{e.details || '-'}</div>
                      {e.isProspectFollowUp && (
                        <span className="inline-block mt-1.5 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Seguimiento</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
