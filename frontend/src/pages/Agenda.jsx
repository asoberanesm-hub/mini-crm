import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchApi, postApi, putApi, deleteApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'
import LoadingModule from '../components/LoadingModule'

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

function formatTime(d) {
  if (!d) return '-'
  const date = new Date(d)
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function Agenda() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(today)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoDetalles, setNuevoDetalles] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(today)
  const [nuevaHora, setNuevaHora] = useState('09:00')
  const [editingId, setEditingId] = useState(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editDetalles, setEditDetalles] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editHora, setEditHora] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agenda', fecha],
    queryFn: () => fetchApi(`/agenda?date=${fecha}`),
    placeholderData: keepPreviousData,
  })

  const crear = useMutation({
    mutationFn: (payload) => postApi('/agenda', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', fecha] })
      setNuevoTitulo('')
      setNuevoDetalles('')
      setNuevaFecha(fecha)
      setNuevaHora('09:00')
    },
  })

  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/agenda/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', fecha] })
      setEditingId(null)
    },
  })

  const eliminar = useMutation({
    mutationFn: (id) => deleteApi(`/agenda/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', fecha] })
      setEditingId(null)
    },
  })

  const handleCrear = (e) => {
    e.preventDefault()
    if (!nuevoTitulo.trim()) return
    const dateTime = `${nuevaFecha}T${nuevaHora}:00`
    crear.mutate({ dateTime, title: nuevoTitulo.trim(), details: nuevoDetalles.trim() || '' })
  }

  const startEdit = (event) => {
    setEditingId(event.id)
    setEditTitulo(event.title)
    setEditDetalles(event.details || '')
    setEditFecha(toInputDate(event.dateTime))
    setEditHora(toInputTime(event.dateTime))
  }

  const handleGuardarEdit = (e) => {
    e.preventDefault()
    if (!editingId || !editTitulo.trim()) return
    const dateTime = `${editFecha}T${editHora}:00`
    actualizar.mutate({
      id: editingId,
      payload: { dateTime, title: editTitulo.trim(), details: editDetalles.trim() || '' },
    })
  }

  const handleEliminar = (event) => {
    if (!window.confirm(`¿Eliminar el evento "${event.title}"?`)) return
    eliminar.mutate(event.id)
  }

  const list = Array.isArray(data) ? data : []

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Agenda</h1>
      <p className="text-slate-600 text-sm mb-4">Consulta y gestiona tus eventos por día.</p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-slate-700 font-medium">Fecha:</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        />
      </div>

      <form onSubmit={handleCrear} className="bg-slate-50 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        />
        <input
          type="time"
          value={nuevaHora}
          onChange={(e) => setNuevaHora(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        />
        <input
          type="text"
          placeholder="Título *"
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]"
          required
        />
        <input
          type="text"
          placeholder="Detalles"
          value={nuevoDetalles}
          onChange={(e) => setNuevoDetalles(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[140px]"
        />
        <button
          type="submit"
          disabled={crear.isPending || !nuevoTitulo.trim()}
          className="px-4 py-2 bg-sky-600 text-white rounded text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {crear.isPending ? 'Guardando...' : 'Agregar evento'}
        </button>
        {crear.isError && <span className="text-red-600 text-sm">{crear.error?.message}</span>}
        {crear.isSuccess && <span className="text-green-600 text-sm">Guardado.</span>}
      </form>

      {editingId && (
        <form onSubmit={handleGuardarEdit} className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <span className="w-full text-sm font-medium text-amber-800">Editando evento</span>
          <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm" />
          <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm" />
          <input
            type="text"
            placeholder="Título *"
            value={editTitulo}
            onChange={(e) => setEditTitulo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]"
            required
          />
          <input
            type="text"
            placeholder="Detalles"
            value={editDetalles}
            onChange={(e) => setEditDetalles(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[140px]"
          />
          <button type="submit" disabled={actualizar.isPending} className="px-4 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            Guardar
          </button>
          <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300">
            Cancelar
          </button>
          {actualizar.isError && <span className="text-red-600 text-sm">{actualizar.error?.message}</span>}
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <div className="p-6 text-slate-500">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Hora</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Título</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Detalles</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.length ? (
                list.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatTime(event.dateTime)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{event.title}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={event.details}>{event.details || '-'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(event)}
                        className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded text-sm font-medium hover:bg-sky-200 border border-sky-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(event)}
                        disabled={eliminar.isPending && eliminar.variables === event.id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 border border-red-200 disabled:opacity-50"
                      >
                        {eliminar.isPending && eliminar.variables === event.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No hay eventos para esta fecha. Agrega uno arriba o pregúntale a Aysa que anote algo en la agenda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {eliminar.isError && <p className="text-red-600 text-sm mt-2">{eliminar.error?.message}</p>}
    </div>
  )
}
