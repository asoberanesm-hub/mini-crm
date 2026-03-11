import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchApi, postApi, putApi, deleteApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'
import CrearSeguimientoModal from '../../components/CrearSeguimientoModal'

function fmt(d) {
  return d ? new Date(d).toLocaleDateString('es-MX') : '-'
}

function toInputDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().slice(0, 10)
}

const FaseSelect = ({ value, onChange, className }) => (
  <select value={value || ''} onChange={(e) => onChange(e.target.value || '')} className={className}>
    <option value="">—</option>
    <option value="X">X</option>
  </select>
)

const EximSelect = ({ value, onChange, className }) => (
  <select value={value || ''} onChange={(e) => onChange(e.target.value || '')} className={className}>
    <option value="">—</option>
    <option value="X">X</option>
  </select>
)

export default function Prospeccion() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [exim, setExim] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contacto, setContacto] = useState('')
  const [fechaSeguimiento, setFechaSeguimiento] = useState('')
  const [fase1, setFase1] = useState('')
  const [fechaFase1, setFechaFase1] = useState('')
  const [fase2, setFase2] = useState('')
  const [fase3, setFase3] = useState('')
  const [comentarioFase3, setComentarioFase3] = useState('')
  const [horaSeguimiento, setHoraSeguimiento] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [sortBy, setSortBy] = useState('fechaSeguimiento') // 'fechaSeguimiento' | 'nombre'
  const [seguimientoModal, setSeguimientoModal] = useState(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ana', 'prospeccion'],
    queryFn: () => fetchApi('/ana/prospeccion'),
    placeholderData: keepPreviousData,
  })

  const crear = useMutation({
    mutationFn: (payload) => postApi('/prospectos', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ana', 'prospeccion'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      resetAddForm()
    },
  })

  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/prospectos/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ana', 'prospeccion'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      setEditingRow(null)
    },
  })

  const eliminar = useMutation({
    mutationFn: (id) => deleteApi(`/prospectos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ana', 'prospeccion'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      if (editingRow) setEditingRow(null)
    },
  })

  const handleEliminar = (row) => {
    if (!window.confirm(`¿Eliminar el prospecto "${row.name}"?`)) return
    eliminar.mutate(row._id)
  }

  function resetAddForm() {
    setNombre('')
    setExim('')
    setCiudad('')
    setTelefono('')
    setContacto('')
    setFechaSeguimiento('')
    setFase1('')
    setFechaFase1('')
    setFase2('')
    setFase3('')
    setComentarioFase3('')
    setHoraSeguimiento('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    crear.mutate({
      name: nombre.trim(),
      stage: 'lead',
      promotorId: null,
      exim: exim || undefined,
      ciudad: ciudad.trim() || undefined,
      telefono: telefono.trim() || undefined,
      contacto: contacto.trim() || undefined,
      fechaSeguimiento: fechaSeguimiento || undefined,
      horaSeguimiento: horaSeguimiento.trim() || undefined,
      fase1: fase1 || undefined,
      fechaFase1: fechaFase1 || undefined,
      fase2: fase2 || undefined,
      fase3: fase3 || undefined,
      comentarioFase3: comentarioFase3.trim() || undefined,
    })
  }

  const handleEditSave = (e) => {
    e.preventDefault()
    if (!editingRow) return
    actualizar.mutate({
      id: editingRow._id,
      payload: {
        name: (editingRow.name || '').trim() || undefined,
        exim: editingRow.exim || undefined,
        ciudad: editingRow.ciudad?.trim() || undefined,
        telefono: editingRow.telefono?.trim() || undefined,
        contacto: editingRow.contacto?.trim() || undefined,
        fechaSeguimiento: editingRow.fechaSeguimiento || undefined,
        horaSeguimiento: editingRow.horaSeguimiento?.trim() || undefined,
        fase1: editingRow.fase1 || undefined,
        fechaFase1: editingRow.fechaFase1 || undefined,
        fase2: editingRow.fase2 || undefined,
        fase3: editingRow.fase3 || undefined,
        comentarioFase3: editingRow.comentarioFase3?.trim() || undefined,
      },
    })
  }

  const startEdit = (row) => {
    setEditingRow({
      ...row,
      fechaSeguimiento: toInputDate(row.fechaSeguimiento),
      fechaFase1: toInputDate(row.fechaFase1),
      horaSeguimiento: row.horaSeguimiento ?? '',
    })
  }

  const list = Array.isArray(data) ? data : []

  const sortedList = useMemo(() => {
    const arr = [...list]
    if (sortBy === 'nombre') {
      return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    // sortBy fechaSeguimiento (asc), luego nombre
    return arr.sort((a, b) => {
      const da = a.fechaSeguimiento ? new Date(a.fechaSeguimiento).getTime() : 0
      const db = b.fechaSeguimiento ? new Date(b.fechaSeguimiento).getTime() : 0
      if (da !== db) return da - db
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [list, sortBy])
  const openedEditIdRef = useRef(null)

  useEffect(() => {
    const editProspectId = location.state?.editProspectId
    if (!editProspectId || list.length === 0 || openedEditIdRef.current === editProspectId) return
    const row = list.find((r) => String(r._id) === String(editProspectId))
    if (row) {
      openedEditIdRef.current = editProspectId
      setEditingRow({
        ...row,
        fechaSeguimiento: toInputDate(row.fechaSeguimiento),
        fechaFase1: toInputDate(row.fechaFase1),
        horaSeguimiento: row.horaSeguimiento ?? '',
      })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [list, location.state?.editProspectId, location.pathname, navigate])

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />
  return (
    <div className="p-6">
      <CrearSeguimientoModal
        open={!!seguimientoModal}
        onClose={() => setSeguimientoModal(null)}
        tipo="prospecto"
        entity={seguimientoModal ? { id: seguimientoModal._id, name: seguimientoModal.name } : null}
      />
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Prospección</h1>
      <p className="text-slate-600 text-sm mb-4">Módulo ANA SOBERANES — contacto, fases y seguimiento.</p>

      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
        <input type="text" placeholder="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[140px]" required />
        <span className="text-slate-500 text-xs font-medium">Exim</span>
        <EximSelect value={exim} onChange={setExim} className="px-2 py-2 border border-slate-300 rounded text-sm min-w-[90px]" />
        <input type="text" placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
        <input type="text" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
        <input type="text" placeholder="Contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
        <span className="text-slate-500 text-xs font-medium">Fecha</span>
        <input type="date" value={fechaFase1} onChange={(e) => setFechaFase1(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Fecha" />
        <span className="text-slate-500 text-xs font-medium">Fase 1</span>
        <FaseSelect value={fase1} onChange={setFase1} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
        <span className="text-slate-500 text-xs font-medium">Fase 2</span>
        <FaseSelect value={fase2} onChange={setFase2} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
        <span className="text-slate-500 text-xs font-medium">Fase 3</span>
        <FaseSelect value={fase3} onChange={setFase3} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
        <input type="text" placeholder="Coment. F3" value={comentarioFase3} onChange={(e) => setComentarioFase3(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
        <span className="text-slate-500 text-xs font-medium">Hora</span>
        <input type="time" value={horaSeguimiento} onChange={(e) => setHoraSeguimiento(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Hora" />
        <input type="date" value={fechaSeguimiento} onChange={(e) => setFechaSeguimiento(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Fecha seguimiento" />
        <button type="submit" disabled={crear.isPending || !nombre.trim()} className="px-4 py-2 bg-sky-600 text-white rounded text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
          {crear.isPending ? 'Guardando...' : 'Agregar'}
        </button>
        {crear.isError && <span className="text-red-600 text-sm">{crear.error?.message}</span>}
        {crear.isSuccess && <span className="text-green-600 text-sm">Guardado.</span>}
      </form>

      {editingRow && (
        <form onSubmit={handleEditSave} className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <span className="w-full text-sm font-medium text-amber-800">Campos habilitados — Editando (modifica y guarda)</span>
          <span className="text-slate-600 text-xs">Nombre</span>
          <input type="text" placeholder="Nombre *" value={editingRow.name || ''} onChange={(e) => setEditingRow((r) => ({ ...r, name: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[140px]" required />
          <span className="text-slate-600 text-xs">Exim</span>
          <EximSelect value={editingRow.exim || ''} onChange={(v) => setEditingRow((r) => ({ ...r, exim: v }))} className="px-2 py-2 border border-slate-300 rounded text-sm min-w-[90px]" />
          <input type="text" placeholder="Ciudad" value={editingRow.ciudad || ''} onChange={(e) => setEditingRow((r) => ({ ...r, ciudad: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
          <input type="text" placeholder="Teléfono" value={editingRow.telefono || ''} onChange={(e) => setEditingRow((r) => ({ ...r, telefono: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
          <input type="text" placeholder="Contacto" value={editingRow.contacto || ''} onChange={(e) => setEditingRow((r) => ({ ...r, contacto: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[100px]" />
          <span className="text-slate-600 text-xs">Fecha</span>
          <input type="date" value={editingRow.fechaFase1 || ''} onChange={(e) => setEditingRow((r) => ({ ...r, fechaFase1: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Fecha" />
          <span className="text-slate-600 text-xs">F1</span>
          <FaseSelect value={editingRow.fase1 || ''} onChange={(v) => setEditingRow((r) => ({ ...r, fase1: v }))} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
          <span className="text-slate-600 text-xs">F2</span>
          <FaseSelect value={editingRow.fase2 || ''} onChange={(v) => setEditingRow((r) => ({ ...r, fase2: v }))} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
          <span className="text-slate-600 text-xs">F3</span>
          <FaseSelect value={editingRow.fase3 || ''} onChange={(v) => setEditingRow((r) => ({ ...r, fase3: v }))} className="px-2 py-2 border border-slate-300 rounded text-sm w-14" />
          <input type="text" placeholder="Coment. F3" value={editingRow.comentarioFase3 || ''} onChange={(e) => setEditingRow((r) => ({ ...r, comentarioFase3: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[90px]" />
          <span className="text-slate-600 text-xs">Hora</span>
          <input type="time" value={editingRow.horaSeguimiento || ''} onChange={(e) => setEditingRow((r) => ({ ...r, horaSeguimiento: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Hora" />
          <input type="date" value={editingRow.fechaSeguimiento || ''} onChange={(e) => setEditingRow((r) => ({ ...r, fechaSeguimiento: e.target.value }))} className="px-3 py-2 border border-slate-300 rounded text-sm" title="Fecha seguimiento" />
          <button type="submit" disabled={actualizar.isPending} className="px-4 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50">Guardar</button>
          <button type="button" onClick={() => setEditingRow(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300">Cancelar</button>
          {actualizar.isError && <span className="text-red-600 text-sm">{actualizar.error?.message}</span>}
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <p className="text-slate-500 text-sm">
          Para editar un registro ya agregado, haz clic en <strong>EDITAR</strong> en la fila; se habilitarán los campos arriba para modificar y guardar. Puedes <strong>Eliminar</strong> cualquier prospecto desde el botón en cada fila.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
          >
            <option value="fechaSeguimiento">Fecha seguimiento</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>
      </div>
      {eliminar.isError && <p className="text-red-600 text-sm mb-2">{eliminar.error?.message}</p>}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Exim</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Ciudad</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Teléfono</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Contacto</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Fase 1</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Fase 2</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Fase 3</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Comentario F3</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Fecha seguimiento</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Hora</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedList.length ? sortedList.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50 text-xs">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2 text-slate-600">{row.exim ?? '-'}</td>
                <td className="px-3 py-2 text-slate-600">{row.ciudad ?? '-'}</td>
                <td className="px-3 py-2 text-slate-600">{row.telefono ?? '-'}</td>
                <td className="px-3 py-2 text-slate-600">{row.contacto ?? '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmt(row.fechaFase1)}</td>
                <td className="px-3 py-2">{row.fase1 ?? '-'}</td>
                <td className="px-3 py-2">{row.fase2 ?? '-'}</td>
                <td className="px-3 py-2">{row.fase3 ?? '-'}</td>
                <td className="px-3 py-2 max-w-[120px] truncate" title={row.comentarioFase3}>{row.comentarioFase3 ?? '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmt(row.fechaSeguimiento)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.horaSeguimiento ?? '-'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                  <button type="button" onClick={() => setSeguimientoModal(row)} className="px-3 py-1.5 text-violet-600 hover:text-violet-800 font-medium text-xs">
                    Crear seguimiento
                  </button>
                  <button type="button" onClick={() => startEdit(row)} className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded text-xs font-medium hover:bg-sky-200 border border-sky-200">
                    EDITAR
                  </button>
                  <button type="button" onClick={() => handleEliminar(row)} disabled={eliminar.isPending && eliminar.variables === row._id} className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 border border-red-200 disabled:opacity-50">
                    {eliminar.isPending && eliminar.variables === row._id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                  No hay prospectos en prospección propia. Crea prospectos sin asignar promotor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
