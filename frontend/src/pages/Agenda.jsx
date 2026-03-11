import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addHours, addDays, isSameDay, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { fetchApi, postApi, putApi, deleteApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'
import LoadingModule from '../components/LoadingModule'

const TODAY = format(new Date(), 'yyyy-MM-dd')

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

/** Paleta ejecutiva única para el módulo Agenda (calendario, badges, bloques, leyenda). */
const AGENDA_PALETTE = {
  proximos: { main: '#44749D', soft: '#C6D4E1' },
  pfae: { main: '#3E3742', soft: '#E6E0C5' },
  prospeccion: { main: '#260D33', soft: '#B3ACA4' },
  monex: { main: '#003F69', soft: '#C6D4E1' },
  actualizaciones: { main: '#825E65', soft: '#EBC4A9' },
  ana: { main: '#6f0550', soft: '#d78fa3' },
  realizado: { main: '#6B7280', soft: '#F3F4F6' },
}

function getEventPalette(event) {
  if (event?.realizado) return AGENDA_PALETTE.realizado
  if (event?.isProspectFollowUp || event?.eventType === 'PROSP') return AGENDA_PALETTE.prospeccion
  if (event?.eventType === 'VMTO') return AGENDA_PALETTE.pfae
  if (event?.eventType === 'MONEX') return AGENDA_PALETTE.monex
  if (event?.eventType === 'CURSO') return { main: '#666163', soft: '#99cccc' }
  return AGENDA_PALETTE.ana
}

/** Estilo de badge por tipo (fondo suave + color principal, pill). */
function getEventBadgeStyle(event) {
  const { main, soft } = getEventPalette(event)
  return { backgroundColor: soft, color: main, borderRadius: 999, padding: '4px 10px', fontWeight: 500 }
}

/** Estilo de badge por sección del tablero (clave de AGENDA_PALETTE). */
function getSectionBadgeStyle(sectionKey) {
  const { main, soft } = AGENDA_PALETTE[sectionKey] || AGENDA_PALETTE.ana
  return { backgroundColor: soft, color: main, borderRadius: 999, padding: '4px 10px', fontWeight: 500 }
}

function eventTypeLabel(e) {
  if (e.isProspectFollowUp || e.eventType === 'PROSP') return 'PROSP'
  if (e.eventType === 'VMTO') return 'VMTO'
  if (e.eventType === 'MONEX') return 'MONEX'
  if (e.eventType === 'CURSO') return 'CURSO'
  return 'ANA'
}

/** Devuelve el enlace para editar el evento en su origen (Prospección, Productos Activos, Cliente o panel en Agenda). */
function getEventEditTarget(e) {
  if (e.isProspectFollowUp || (e.eventType === 'PROSP' && !e.clienteId)) {
    const prospectId = String(e.id).replace(/^prospect-/, '')
    return { type: 'link', to: '/ana/prospeccion', state: { editProspectId: prospectId }, label: 'Editar en Prospección' }
  }
  if (e.eventType === 'PROSP' && e.clienteId) {
    return { type: 'link', to: `/clientes/${String(e.clienteId)}`, state: null, label: 'Ver cliente' }
  }
  if (e.eventType === 'VMTO') {
    return { type: 'link', to: '/ana/productos-activos', state: null, label: 'Editar en Productos' }
  }
  if (e.eventType === 'CURSO') {
    const cursoId = e.cursoId ? String(e.cursoId) : String(e.id).replace(/^curso-/, '')
    return { type: 'link', to: '/ana/cursos', state: { editCursoId: cursoId }, label: 'Editar curso' }
  }
  return { type: 'panel', label: 'Editar' }
}

/** Carga del día: ligero (verde oliva), medio (mostaza), saturado (terracota). */
function loadLevel(count) {
  // Colores sobrios y poco saturados para el indicador de carga
  if (count <= 2) {
    return {
      label: 'ligero',
      barColor: '#6B7B53', // verde oliva apagado
      dotColor: '#6B7B53',
    }
  }
  if (count <= 5) {
    return {
      label: 'medio',
      barColor: '#A8763E', // mostaza / ocre suave
      dotColor: '#A8763E',
    }
  }
  return {
    label: 'saturado',
    barColor: '#B3544F', // terracota / ladrillo suave
    dotColor: '#B3544F',
  }
}

export default function Agenda() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const scrollToSeven = useMemo(() => new Date(1970, 0, 1, 7, 0, 0, 0), [])
  const [rangeFrom] = useState(() => format(subMonths(now, 2), 'yyyy-MM-dd'))
  const [rangeTo] = useState(() => format(addMonths(now, 5), 'yyyy-MM-dd'))

  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoDetalles, setNuevoDetalles] = useState('')
  const [nuevoEventType, setNuevoEventType] = useState('ANA')
  const [nuevaFecha, setNuevaFecha] = useState(toInputDate(now))
  const [nuevaHora, setNuevaHora] = useState('09:00')
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showNotaInput, setShowNotaInput] = useState(false)
  const [notaTexto, setNotaTexto] = useState('')
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date())
  const [currentView, setCurrentView] = useState('week')

  const { data: rawEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['agenda', rangeFrom, rangeTo],
    queryFn: () => fetchApi(`/agenda?from=${rangeFrom}&to=${rangeTo}`),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    const selectId = location.state?.selectEventId
    if (!selectId || !rawEvents.length) return
    const ev = rawEvents.find((x) => String(x.id) === String(selectId))
    if (ev) {
      const eventWithDates = { ...ev, start: new Date(ev.dateTime), end: addHours(new Date(ev.dateTime), 1) }
      setSelectedEvent(eventWithDates)
      setShowNotaInput(false)
      setNotaTexto(ev.nota || '')
      setEditingEvent(null)
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [rawEvents, location.state?.selectEventId, location.pathname, navigate])

  const { data: kpis = {} } = useQuery({
    queryKey: ['agenda', 'kpis', TODAY],
    queryFn: () => fetchApi(`/agenda/kpis?date=${TODAY}`),
    placeholderData: keepPreviousData,
  })

  const { data: activityList = [] } = useQuery({
    queryKey: ['agenda', 'activity'],
    queryFn: () => fetchApi('/agenda/activity?limit=20'),
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
    onSuccess: (_data, { payload }) => {
      invalidateAgenda()
      queryClient.invalidateQueries({ queryKey: ['agenda', 'activity'] })
      setEditingEvent(null)
      setSelectedEvent(null)
      if (payload.realizado !== true) setShowNotaInput(false)
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
        eventType: e.eventType || (e.isProspectFollowUp ? 'PROSP' : 'ANA'),
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

  /** Panel vertical: MONEX, PROSP y VMTO (máx 6). */
  const proximosPanel = useMemo(() => {
    return proximosAll
      .filter((e) => e.isProspectFollowUp || e.eventType === 'PROSP' || e.eventType === 'MONEX' || e.eventType === 'VMTO')
      .slice(0, 6)
  }, [proximosAll])

  /** Lista horizontal: solo ANA (máx 10). */
  const proximosList = useMemo(() => {
    return proximosAll
      .filter((e) => !e.isProspectFollowUp && e.eventType === 'ANA')
      .slice(0, 10)
  }, [proximosAll])

  /** Próximos 10 eventos (todos los tipos) para bloque ejecutivo. */
  const proximosDiez = useMemo(() => proximosAll.slice(0, 10), [proximosAll])

  /** Tablero de actividades: listas filtradas por categoría (solo próximos). */
  const tableroProximos = useMemo(() => [...proximosAll].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)), [proximosAll])
  const tableroPFAE = useMemo(() => proximosAll.filter((e) => e.eventType === 'VMTO' && e.vmtoProducto === 'PFAE'), [proximosAll])
  const tableroProspeccion = useMemo(() => proximosAll.filter((e) => e.isProspectFollowUp || e.eventType === 'PROSP'), [proximosAll])
  const tableroMonex = useMemo(() => proximosAll.filter((e) => e.eventType === 'MONEX'), [proximosAll])
  const tableroANA = useMemo(() => proximosAll.filter((e) => !e.isProspectFollowUp && e.eventType === 'ANA'), [proximosAll])

  /** Resumen de carga por día de la semana visible (solo en vista semana). */
  const weekLoadSummary = useMemo(() => {
    if (currentView !== 'week') return []
    const weekStart = startOfWeek(currentCalendarDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const count = calendarEvents.filter((ev) => isSameDay(ev.start, day)).length
      const level = loadLevel(count)
      return {
        date: day,
        dayName: format(day, 'EEEE', { locale: es }),
        dayNameShort: format(day, 'EEE', { locale: es }),
        count,
        level,
        isToday: isSameDay(day, new Date()),
      }
    })
  }, [currentView, currentCalendarDate, calendarEvents])

  const handleCrear = (e) => {
    e.preventDefault()
    if (!nuevoTitulo.trim()) return
    const dateTime = `${nuevaFecha}T${nuevaHora}:00`
    crear.mutate({ dateTime, title: nuevoTitulo.trim(), details: nuevoDetalles.trim() || '', eventType: nuevoEventType })
  }

  const handleGuardarEdit = (e) => {
    e.preventDefault()
    if (!editingEvent || !editingEvent.title?.trim()) return
    const d = typeof editingEvent.dateTime === 'string' ? editingEvent.dateTime : (toInputDate(editingEvent.dateTime) + 'T' + toInputTime(editingEvent.dateTime))
    const dateTime = d.length === 16 ? d + ':00' : d
    actualizar.mutate({
      id: editingEvent.id,
      payload: {
        dateTime,
        title: editingEvent.title.trim(),
        details: (editingEvent.details || '').trim(),
        eventType: editingEvent.eventType || 'ANA',
      },
    })
  }

  const handleEliminar = (event) => {
    if (event.isProspectFollowUp || (event.eventType === 'PROSP' && !event.clienteId) || event.eventType === 'VMTO') return
    if (!window.confirm(`¿Eliminar el evento "${event.title}"?`)) return
    eliminar.mutate(event.id)
  }

  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setShowNotaInput(false)
    setNotaTexto(event.nota || '')

    // Para eventos ANA / MONEX y PROSP con clienteId, habilitar formulario de reprogramación.
    // Para PROSP de Prospección y VMTO, la edición profunda se hace en sus módulos origen
    // (doble clic navega ahí), por eso aquí no abrimos el formulario.
    if (event.isProspectFollowUp || (event.eventType === 'PROSP' && !event.clienteId) || event.eventType === 'VMTO') {
      setEditingEvent(null)
    } else {
      setEditingEvent({
        ...event,
        dateTime: event.start,
        eventType: event.eventType || 'ANA',
        details: event.details || '',
      })
    }
  }

  const handleDoubleClickEvent = (event) => {
    // PROSP desde Prospección → navegar a Prospección con el prospecto en edición
    if (event.isProspectFollowUp || (event.eventType === 'PROSP' && !event.clienteId)) {
      const prospectId = String(event.id).replace(/^prospect-/, '')
      navigate('/ana/prospeccion', { state: { editProspectId: prospectId } })
      return
    }

    // VMTO → navegar a Productos Activos
    if (event.eventType === 'VMTO') {
      navigate('/ana/productos-activos')
      return
    }

    // CURSO → navegar a Cursos con curso seleccionado
    if (event.eventType === 'CURSO') {
      const cursoId = event.cursoId ? String(event.cursoId) : String(event.id).replace(/^curso-/, '')
      navigate('/ana/cursos', { state: { editCursoId: cursoId } })
      return
    }

    // ANA, MONEX o PROSP con clienteId → abrir panel de edición en Agenda
    handleSelectEvent(event)
  }

  const handleMarcarRealizado = (event) => {
    if (!event.id || event.isProspectFollowUp || event.eventType === 'VMTO') return
    if (event.eventType === 'PROSP' && !event.clienteId) return
    actualizar.mutate({ id: event.id, payload: { realizado: true, nota: event.nota || '' } })
  }

  const handleReprogramar = (event) => {
    setEditingEvent({ ...event, dateTime: event.start, eventType: event.eventType || 'ANA', details: event.details || '' })
  }

  const handleGuardarNota = (e) => {
    e.preventDefault()
    if (!selectedEvent?.id || selectedEvent.isProspectFollowUp || selectedEvent.eventType === 'VMTO') return
    if (selectedEvent.eventType === 'PROSP' && !selectedEvent.clienteId) return
    actualizar.mutate({
      id: selectedEvent.id,
      payload: { nota: notaTexto.trim() },
    })
    setShowNotaInput(false)
  }

  const eventPropGetter = (event) => {
    const { main, soft } = getEventPalette(event)
    return {
      style: {
        backgroundColor: soft,
        borderLeft: `4px solid ${main}`,
        color: main,
      },
    }
  }

  const EventComponent = ({ event }) => {
    const label = eventTypeLabel(event)
    const title = event.title || ''
    return (
      <span className="block truncate" title={title}>
        <span className="opacity-90 font-semibold text-[10px] uppercase tracking-wide mr-1">[{label}]</span>
        {title}
      </span>
    )
  }

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Agenda</h1>
        <p className="text-slate-600 text-sm mt-1">Dashboard ejecutivo · Calendario, recordatorios y seguimientos.</p>
      </div>

      {/* 1. KPIs DEL DÍA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg">{kpis.seguimientosHoy ?? 0}</div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Seguimientos hoy</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.seguimientosHoy ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg">{kpis.prospectosActivos ?? 0}</div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Prospectos activos</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.prospectosActivos ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">{kpis.vencimientosHoy ?? 0}</div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vencimientos hoy</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.vencimientosHoy ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-lg">{kpis.eventosHoy ?? 0}</div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Eventos hoy</p>
            <p className="text-xl font-semibold text-slate-800">{kpis.eventosHoy ?? 0}</p>
          </div>
        </div>
      </div>

      {/* 2. RECORDATORIOS | CALENDARIO */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 mb-6">
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
                        className={`p-2.5 rounded-lg bg-red-50 border border-red-100 text-slate-800 text-sm flex items-start justify-between gap-2 ${!e.isProspectFollowUp ? 'cursor-pointer hover:bg-red-100' : ''}`}
                        onClick={!e.isProspectFollowUp ? () => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) }) : undefined}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-red-800">{e.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDateShort(e.dateTime)} · {formatTime(e.dateTime)}
                          </div>
                          <span className="text-xs mt-1 inline-block" style={getEventBadgeStyle(e)}>{eventTypeLabel(e)}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5">
                          {e.eventType === 'VMTO' ? (
                            <Link
                              to="/ana/productos-activos"
                              className="px-2 py-1 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              Ver
                            </Link>
                          ) : e.isProspectFollowUp ? (
                            <Link
                              to="/ana/prospeccion"
                              state={{ editProspectId: String(e.id).replace(/^prospect-/, '') }}
                              className="px-2 py-1 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              Editar
                            </Link>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(ev) => { ev.stopPropagation(); handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) }); }}
                                className="px-2 py-1 text-xs font-medium text-sky-600 hover:underline"
                                title="Editar evento"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(ev) => { ev.stopPropagation(); if (window.confirm(`¿Eliminar "${e.title}"?`)) eliminar.mutate(e.id); }}
                                disabled={eliminar.isPending && eliminar.variables === e.id}
                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Eliminar"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Próximos</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {proximosPanel.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No hay próximos MONEX, PROSP o VMTO</p>
                  ) : (
                    proximosPanel.map((e) => (
                      <div
                        key={e.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm hover:border-sky-200 cursor-pointer flex items-start justify-between gap-2"
                        onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-800">{e.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDateShort(e.dateTime)} · {formatTime(e.dateTime)}
                          </div>
                          <span className="text-xs mt-1 inline-block" style={getEventBadgeStyle(e)}>{eventTypeLabel(e)}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-0.5" onClick={(ev) => ev.stopPropagation()}>
                          {e.eventType === 'VMTO' ? (
                            <Link
                              to="/ana/productos-activos"
                              className="px-2 py-1 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              Ver
                            </Link>
                          ) : e.isProspectFollowUp ? (
                            <Link
                              to="/ana/prospeccion"
                              state={{ editProspectId: String(e.id).replace(/^prospect-/, '') }}
                              className="px-2 py-1 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              Editar
                            </Link>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                                className="px-2 py-1 text-xs font-medium text-sky-600 hover:underline"
                                title="Editar evento"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => { if (window.confirm(`¿Eliminar "${e.title}"?`)) eliminar.mutate(e.id); }}
                                disabled={eliminar.isPending && eliminar.variables === e.id}
                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Eliminar"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
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
                className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200 space-y-4"
              >
                <div className="w-full">
                  <p className="text-sm font-semibold text-slate-700 mb-2">¿Evento MONEX o personal (ANA)?</p>
                  <div className="flex flex-wrap gap-2">
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${nuevoEventType === 'MONEX' ? 'border-sky-600 bg-sky-50' : 'bg-white border-slate-300 hover:border-sky-300'}`}>
                      <input type="radio" name="nuevoEventType" value="MONEX" checked={nuevoEventType === 'MONEX'} onChange={(e) => setNuevoEventType(e.target.value)} className="text-sky-600" />
                      <span className="font-medium text-slate-800">MONEX</span>
                      <span className="text-slate-500 text-sm">(evento MONEX)</span>
                    </label>
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${nuevoEventType === 'ANA' ? 'border-sky-600 bg-sky-50' : 'bg-white border-slate-300 hover:border-sky-300'}`}>
                      <input type="radio" name="nuevoEventType" value="ANA" checked={nuevoEventType === 'ANA'} onChange={(e) => setNuevoEventType(e.target.value)} className="text-sky-600" />
                      <span className="font-medium text-slate-800">ANA</span>
                      <span className="text-slate-500 text-sm">(evento personal)</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
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
                </div>
              </form>
            )}

            {selectedEvent && editingEvent === null && selectedEvent.eventType !== 'VMTO' && (selectedEvent.eventType !== 'PROSP' || selectedEvent.clienteId) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedEvent.title}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{selectedEvent.details || '—'}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDateShort(selectedEvent.start)} · {formatTime(selectedEvent.start)}
                    </p>
                    <span className="inline-block mt-2 text-xs" style={getEventBadgeStyle(selectedEvent)}>{eventTypeLabel(selectedEvent)}</span>
                    {selectedEvent.realizado && (
                      <span className="inline-block mt-2 ml-2 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-1 rounded border border-emerald-200">
                        Realizado
                      </span>
                    )}
                    {selectedEvent.nota && (
                      <p className="text-sm text-slate-600 mt-2 border-l-2 border-slate-300 pl-2">Nota: {selectedEvent.nota}</p>
                    )}
                    {selectedEvent.clienteId && (
                      <div className="mt-3">
                        <Link
                          to={`/clientes/${String(selectedEvent.clienteId)}`}
                          className="inline-block px-3 py-1.5 text-sm font-medium text-sky-600 bg-sky-100 rounded-lg hover:bg-sky-200"
                        >
                          Ver cliente
                        </Link>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedEvent(null); setShowNotaInput(false); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!selectedEvent.realizado && (
                    <button
                      type="button"
                      onClick={() => handleMarcarRealizado(selectedEvent)}
                      disabled={actualizar.isPending}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Marcar como realizado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleReprogramar(selectedEvent)}
                    className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-200"
                  >
                    Reprogramar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotaInput((v) => !v)}
                    className="px-3 py-1.5 bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-sm font-medium hover:bg-sky-200"
                  >
                    Agregar nota
                  </button>
                </div>
                {showNotaInput && (
                  <form onSubmit={handleGuardarNota} className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2 items-end">
                    <label className="w-full text-sm font-medium text-slate-600">Nota</label>
                    <input
                      type="text"
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Escribir nota..."
                      className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <button
                      type="submit"
                      disabled={actualizar.isPending}
                      className="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
                    >
                      Guardar nota
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNotaInput(false); setNotaTexto(selectedEvent.nota || ''); }}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            )}

            {editingEvent && !editingEvent.isProspectFollowUp && (
              <form
                onSubmit={handleGuardarEdit}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3"
              >
                <span className="w-full text-sm font-medium text-amber-800">Reprogramar: elige nueva fecha y hora</span>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                  <select
                    value={editingEvent.eventType || 'ANA'}
                    onChange={(e) => setEditingEvent((ev) => ({ ...ev, eventType: e.target.value }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[140px]"
                  >
                    <option value="MONEX">MONEX</option>
                    <option value="ANA">ANA</option>
                    <option value="PROSP">PROSP</option>
                  </select>
                </div>
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
                  onClick={() => setEditingEvent(null)}
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

            {selectedEvent && editingEvent === null && (selectedEvent.isProspectFollowUp || (selectedEvent.eventType === 'PROSP' && !selectedEvent.clienteId)) && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedEvent.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedEvent.details || 'Fecha de seguimiento'}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDateShort(selectedEvent.start)} · {formatTime(selectedEvent.start)}
                    </p>
                    <span className="inline-block mt-2 text-xs font-semibold text-violet-800 bg-violet-100 px-2 py-1 rounded">PROSP — desde Prospección</span>
                    <div className="mt-3">
                      <Link
                        to="/ana/prospeccion"
                        state={{ editProspectId: String(selectedEvent.id).replace(/^prospect-/, '') }}
                        className="inline-block px-3 py-1.5 text-sm font-medium text-sky-600 bg-sky-100 rounded-lg hover:bg-sky-200"
                      >
                        Editar en Prospección
                      </Link>
                    </div>
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

            {selectedEvent && editingEvent === null && selectedEvent.eventType === 'VMTO' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">Vencimiento (VMTO)</h3>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div>
                        <dt className="text-slate-500 inline">Nombre: </dt>
                        <dd className="inline font-medium text-slate-800">{selectedEvent.vmtoNombre ?? (selectedEvent.title?.split(' — ')[0] ?? '—')}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 inline">Producto: </dt>
                        <dd className="inline font-medium text-slate-800">{selectedEvent.vmtoProducto ?? (selectedEvent.title?.split(' — ')[1] ?? '—')}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 inline">Fecha: </dt>
                        <dd className="inline font-medium text-slate-800">{selectedEvent.vmtoFecha ?? formatDateShort(selectedEvent.start)}</dd>
                      </div>
                    </dl>
                    <span className="inline-block mt-2 text-xs font-semibold text-orange-800 bg-orange-100 px-2 py-1 rounded">VMTO — desde Productos Activos</span>
                    <div className="mt-3">
                      <Link
                        to="/ana/productos-activos"
                        className="inline-block px-3 py-1.5 text-sm font-medium text-sky-600 bg-sky-100 rounded-lg hover:bg-sky-200"
                      >
                        Ver en Productos Activos
                      </Link>
                    </div>
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

            {/* Leyenda de colores arriba del calendario */}
            <div className="flex flex-wrap items-center gap-4 mb-3 text-sm" style={{ color: '#6B7280' }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.proximos.main }} />
                Próximos eventos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.pfae.main }} />
                PFAE
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.prospeccion.main }} />
                Prospección
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.monex.main }} />
                Monex
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.actualizaciones.main }} />
                Actualizaciones
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.ana.main }} />
                ANA
              </span>
            </div>

            <div className="rounded-lg border border-slate-200">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onSelectEvent={handleSelectEvent}
                onDoubleClickEvent={handleDoubleClickEvent}
                eventPropGetter={eventPropGetter}
                components={{ event: EventComponent }}
                views={['month', 'week']}
                view={currentView}
                onView={setCurrentView}
                date={currentCalendarDate}
                onNavigate={setCurrentCalendarDate}
                scrollToTime={scrollToSeven}
                style={{ height: 520 }}
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
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200 text-sm" style={{ color: '#6B7280' }}>
              <span className="font-medium" style={{ color: '#374151' }}>Leyenda:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.proximos.main }} />
                Próximos eventos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.pfae.main }} />
                PFAE
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.prospeccion.main }} />
                Prospección
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.monex.main }} />
                Monex
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.actualizaciones.main }} />
                Actualizaciones
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: AGENDA_PALETTE.ana.main }} />
                ANA
              </span>
            </div>
          </div>

        </main>
      </div>

      {/* CARGA DE LA SEMANA (debajo del calendario) */}
      {currentView === 'week' && weekLoadSummary.length > 0 && (
        <div className="mb-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Carga de la semana</h3>
              <span className="text-xs" style={{ color: '#6B7280' }}>Eventos por día</span>
            </div>
            <div className="grid grid-cols-7 gap-2 p-4">
              {weekLoadSummary.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 flex flex-col"
                >
                  <span className="text-xs font-semibold capitalize" style={{ color: '#4B5563' }}>
                    {day.dayNameShort}
                  </span>
                  <span className="text-lg font-semibold mt-1" style={{ color: '#111827' }}>
                    {day.count}
                  </span>
                  <span className="text-[11px]" style={{ color: '#6B7280' }}>
                    {day.count === 1 ? 'evento' : 'eventos'}
                  </span>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, 10 + day.count * 12)}%`,
                        backgroundColor: day.level.barColor,
                      }}
                      title={`${day.dayName}: ${day.count} eventos — ${day.level.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 px-4 pb-3 pt-1 text-xs" style={{ color: '#6B7280' }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B7B53' }} /> Ligero (0–2)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A8763E' }} /> Medio (3–5)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#B3544F' }} /> Saturado (6+)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TABLERO DE ACTIVIDADES — grid 2 columnas, paleta azul/gris */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 1. Próximos eventos */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.proximos.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Próximos eventos</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {tableroProximos.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>No hay próximos eventos</p>
            ) : (
              tableroProximos.map((e) => {
                const editTarget = getEventEditTarget(e)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
                    onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                  >
                    <span className="text-xs font-medium shrink-0 w-10" style={{ color: '#6B7280' }}>{formatTime(e.dateTime)}</span>
                    <span className="text-xs shrink-0 w-16" style={{ color: '#6B7280' }}>{formatDateShort(e.dateTime)}</span>
                    <span className="font-medium truncate min-w-0 flex-1" style={{ color: '#111827' }} title={e.title}>{e.title}</span>
                    <span className="text-xs font-medium shrink-0" style={getEventBadgeStyle(e)}>{eventTypeLabel(e)}</span>
                    <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {editTarget.type === 'link' ? (
                        <Link to={editTarget.to} state={editTarget.state} className="text-xs font-medium hover:underline" style={{ color: '#3B82F6' }}>{editTarget.label}</Link>
                      ) : (
                        <button type="button" onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })} className="text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer p-0" style={{ color: '#3B82F6' }}>Editar</button>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 2. Vencimientos PFAE */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.pfae.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Vencimientos PFAE</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {tableroPFAE.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>No hay vencimientos PFAE</p>
            ) : (
              tableroPFAE.map((e) => {
                const editTarget = getEventEditTarget(e)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
                    onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                  >
                    <span className="text-xs font-medium shrink-0 w-10" style={{ color: '#6B7280' }}>{formatTime(e.dateTime)}</span>
                    <span className="text-xs shrink-0 w-16" style={{ color: '#6B7280' }}>{formatDateShort(e.dateTime)}</span>
                    <span className="font-medium truncate min-w-0 flex-1" style={{ color: '#111827' }} title={e.title}>{e.title}</span>
                    <span className="text-xs font-medium shrink-0" style={getSectionBadgeStyle('pfae')}>PFAE</span>
                    <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {editTarget.type === 'link' ? (
                        <Link to={editTarget.to} state={editTarget.state} className="text-xs font-medium hover:underline" style={{ color: '#3B82F6' }}>{editTarget.label}</Link>
                      ) : (
                        <button type="button" onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })} className="text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer p-0" style={{ color: '#3B82F6' }}>Editar</button>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 3. Prospección */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.prospeccion.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Prospección</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {tableroProspeccion.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>No hay eventos de prospección</p>
            ) : (
              tableroProspeccion.map((e) => {
                const editTarget = getEventEditTarget(e)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
                    onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                  >
                    <span className="text-xs font-medium shrink-0 w-10" style={{ color: '#6B7280' }}>{formatTime(e.dateTime)}</span>
                    <span className="text-xs shrink-0 w-16" style={{ color: '#6B7280' }}>{formatDateShort(e.dateTime)}</span>
                    <span className="font-medium truncate min-w-0 flex-1" style={{ color: '#111827' }} title={e.title}>{e.title}</span>
                    <span className="text-xs font-medium shrink-0" style={getSectionBadgeStyle('prospeccion')}>PROSP</span>
                    <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {editTarget.type === 'link' ? (
                        <Link to={editTarget.to} state={editTarget.state} className="text-xs font-medium hover:underline" style={{ color: '#3B82F6' }}>{editTarget.label}</Link>
                      ) : (
                        <button type="button" onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })} className="text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer p-0" style={{ color: '#3B82F6' }}>Editar</button>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 4. Monex */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.monex.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Monex</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {tableroMonex.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>No hay eventos Monex</p>
            ) : (
              tableroMonex.map((e) => {
                const editTarget = getEventEditTarget(e)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
                    onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                  >
                    <span className="text-xs font-medium shrink-0 w-10" style={{ color: '#6B7280' }}>{formatTime(e.dateTime)}</span>
                    <span className="text-xs shrink-0 w-16" style={{ color: '#6B7280' }}>{formatDateShort(e.dateTime)}</span>
                    <span className="font-medium truncate min-w-0 flex-1" style={{ color: '#111827' }} title={e.title}>{e.title}</span>
                    <span className="text-xs font-medium shrink-0" style={getSectionBadgeStyle('monex')}>MONEX</span>
                    <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {editTarget.type === 'link' ? (
                        <Link to={editTarget.to} state={editTarget.state} className="text-xs font-medium hover:underline" style={{ color: '#3B82F6' }}>{editTarget.label}</Link>
                      ) : (
                        <button type="button" onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })} className="text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer p-0" style={{ color: '#3B82F6' }}>Editar</button>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 5. Actualizaciones */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.actualizaciones.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>Actualizaciones</h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>Pendiente de cargar módulo</p>
        </div>

        {/* 6. ANA */}
        <div className="rounded-xl border p-4 bg-white" style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: AGENDA_PALETTE.ana.main }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>ANA</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {tableroANA.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>No hay eventos personales</p>
            ) : (
              tableroANA.map((e) => {
                const editTarget = getEventEditTarget(e)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#F3F4F6] cursor-pointer transition-colors"
                    onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })}
                  >
                    <span className="text-xs font-medium shrink-0 w-10" style={{ color: '#6B7280' }}>{formatTime(e.dateTime)}</span>
                    <span className="text-xs shrink-0 w-16" style={{ color: '#6B7280' }}>{formatDateShort(e.dateTime)}</span>
                    <span className="font-medium truncate min-w-0 flex-1" style={{ color: '#111827' }} title={e.title}>{e.title}</span>
                    <span className="text-xs font-medium shrink-0" style={getSectionBadgeStyle('ana')}>ANA</span>
                    <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {editTarget.type === 'link' ? (
                        <Link to={editTarget.to} state={editTarget.state} className="text-xs font-medium hover:underline" style={{ color: '#3B82F6' }}>{editTarget.label}</Link>
                      ) : (
                        <button type="button" onClick={() => handleSelectEvent({ ...e, start: new Date(e.dateTime), end: addHours(new Date(e.dateTime), 1) })} className="text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer p-0" style={{ color: '#3B82F6' }}>Editar</button>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
