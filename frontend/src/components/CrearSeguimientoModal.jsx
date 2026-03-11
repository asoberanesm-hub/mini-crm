import { useState, useEffect } from 'react'
import { postApi, putApi } from '../lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function toInputDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().slice(0, 10)
}

function nextWeekday() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  return d
}

export default function CrearSeguimientoModal({ open, onClose, tipo, entity }) {
  const queryClient = useQueryClient()
  const [fecha, setFecha] = useState(() => toInputDate(nextWeekday()))
  const [hora, setHora] = useState('10:00')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (open) {
      setFecha(toInputDate(nextWeekday()))
      setHora('10:00')
      setNotas('')
    }
  }, [open])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda'] })
    queryClient.invalidateQueries({ queryKey: ['ana', 'prospeccion'] })
  }

  const crearEventoCliente = useMutation({
    mutationFn: (payload) => postApi('/agenda', payload),
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const actualizarProspecto = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/prospectos/${id}`, payload),
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!entity?.id || !entity?.name) return
    if (!fecha.trim()) return

    if (tipo === 'cliente') {
      const dateTime = `${fecha}T${hora}:00`
      crearEventoCliente.mutate({
        dateTime,
        title: entity.name.trim(),
        details: notas.trim() || '',
        eventType: 'PROSP',
        clienteId: entity.id,
      })
    } else {
      actualizarProspecto.mutate({
        id: entity.id,
        payload: {
          fechaSeguimiento: fecha,
          horaSeguimiento: hora,
        },
      })
    }
  }

  if (!open) return null

  const label = tipo === 'cliente' ? 'Cliente' : 'Prospecto'
  const isPending = crearEventoCliente.isPending || actualizarProspecto.isPending
  const error = crearEventoCliente.error || actualizarProspecto.error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Crear seguimiento</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
              {entity?.name ?? '—'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha seguimiento</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error?.message ?? 'Error al guardar'}</p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
