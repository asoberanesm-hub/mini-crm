import { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchApi, postApi, putApi, deleteApi, buildApiUrl } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

const TIPO_OPCIONES = ['Compliance', 'Comercial', 'Liderazgo', 'Regulación', 'Certificación']

function fmtDate(d) {
  if (!d) return '-'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-MX')
}

function daysDiff(from, to) {
  const ms = to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0)
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function computeEstado(curso) {
  const today = new Date()
  const limite = curso.fechaLimite ? new Date(curso.fechaLimite) : null

  if (curso.realizado) {
    return { key: 'realizado', label: 'Realizado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  }
  if (!limite) {
    return { key: 'pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700 border-slate-200' }
  }
  const diff = daysDiff(today, limite)
  if (diff < 0) {
    return { key: 'vencido', label: 'Vencido', color: 'bg-rose-100 text-rose-800 border-rose-200' }
  }
  if (diff >= 0 && diff <= 7) {
    return { key: 'proximo', label: 'Próximo', color: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
  return { key: 'pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700 border-slate-200' }
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
        checked ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-200 border-slate-300'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function CursosAna() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenPor, setOrdenPor] = useState('fechaLimite')
  const [ordenAsc, setOrdenAsc] = useState(true)
  const [showNuevo, setShowNuevo] = useState(false)
  const [editingCurso, setEditingCurso] = useState(null)

  const [formNombre, setFormNombre] = useState('')
  const [formTipo, setFormTipo] = useState('Compliance')
  const [formFechaLimite, setFormFechaLimite] = useState('')
  const [formConstanciaFile, setFormConstanciaFile] = useState(null)
  const [editConstanciaFile, setEditConstanciaFile] = useState(null)
  const [uploadingConstancia, setUploadingConstancia] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const { data: cursos = [], isLoading, error, refetch } = useQuery({
    queryKey: ['ana', 'cursos'],
    queryFn: () => fetchApi('/ana/cursos'),
    placeholderData: keepPreviousData,
  })

  const invalidateCursos = () => {
    queryClient.invalidateQueries({ queryKey: ['ana', 'cursos'] })
  }

  const crear = useMutation({
    mutationFn: (payload) => postApi('/ana/cursos', payload),
    onSuccess: () => {
      invalidateCursos()
      setShowNuevo(false)
      setFormNombre('')
      setFormFechaLimite('')
      setFormConstanciaFile(null)
    },
  })

  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/ana/cursos/${id}`, payload),
    onSuccess: () => {
      invalidateCursos()
      setEditingCurso(null)
    },
  })

  const eliminar = useMutation({
    mutationFn: (id) => deleteApi(`/ana/cursos/${id}`),
    onSuccess: () => {
      invalidateCursos()
    },
  })

  const cursosEnriquecidos = useMemo(
    () =>
      cursos.map((c) => {
        const estado = computeEstado(c)
        return { ...c, _estado: estado }
      }),
    [cursos]
  )

  const cursosFiltrados = useMemo(() => {
    let list = cursosEnriquecidos
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      list = list.filter((c) => c.nombreCurso.toLowerCase().includes(q))
    }
    if (filtroEstado !== 'todos') {
      list = list.filter((c) => c._estado.key === filtroEstado)
    }
    list = [...list].sort((a, b) => {
      if (ordenPor === 'nombre') {
        return ordenAsc
          ? a.nombreCurso.localeCompare(b.nombreCurso)
          : b.nombreCurso.localeCompare(a.nombreCurso)
      }
      if (ordenPor === 'estado') {
        return ordenAsc
          ? a._estado.label.localeCompare(b._estado.label)
          : b._estado.label.localeCompare(a._estado.label)
      }
      // fechaLimite por defecto
      const da = a.fechaLimite ? new Date(a.fechaLimite).getTime() : 0
      const db = b.fechaLimite ? new Date(b.fechaLimite).getTime() : 0
      return ordenAsc ? da - db : db - da
    })
    return list
  }, [cursosEnriquecidos, filtroEstado, busqueda, ordenPor, ordenAsc])

  const resumen = useMemo(() => {
    const total = cursosEnriquecidos.length
    const pendientes = cursosEnriquecidos.filter((c) => c._estado.key === 'pendiente').length
    const realizados = cursosEnriquecidos.filter((c) => c._estado.key === 'realizado').length
    const vencidos = cursosEnriquecidos.filter((c) => c._estado.key === 'vencido').length
    return { total, pendientes, realizados, vencidos }
  }, [cursosEnriquecidos])

  const handleToggleRealizado = (curso, nuevoValor) => {
    actualizar.mutate({ id: curso._id, payload: { realizado: nuevoValor } })
  }

  const handleSubmitNuevo = async (e) => {
    e.preventDefault()
    if (!formNombre.trim() || !formFechaLimite) return
    try {
      const nuevo = await crear.mutateAsync({
      nombreCurso: formNombre.trim(),
      tipoCurso: formTipo,
      fechaLimite: formFechaLimite,
      constanciaPdfUrl: undefined,
    })
      if (formConstanciaFile && nuevo?._id) {
        const url = buildApiUrl(`/ana/cursos/${nuevo._id}/constancia`)
        const fd = new FormData()
        fd.append('file', formConstanciaFile)
        const res = await fetch(url, { method: 'POST', body: fd })
        if (!res.ok) {
          console.error('Error subiendo constancia', await res.text())
        } else {
          await invalidateCursos()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleGuardarEdit = (e) => {
    e.preventDefault()
    if (!editingCurso) return
    actualizar.mutate({
      id: editingCurso._id,
      payload: {
        nombreCurso: editingCurso.nombreCurso?.trim(),
        tipoCurso: editingCurso.tipoCurso,
        fechaLimite: editingCurso.fechaLimite ? editingCurso.fechaLimite : undefined,
        realizado: editingCurso.realizado,
        constanciaPdfUrl: editingCurso.constanciaPdfUrl?.trim() || '',
      },
    })
  }

  // Si venimos desde el calendario con un curso seleccionado, abrir directamente en edición
  useEffect(() => {
    const editId = location.state?.editCursoId
    if (!editId || !cursos.length) return
    const found = cursos.find((c) => String(c._id) === String(editId))
    if (found) setEditingCurso(found)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state?.editCursoId, location.pathname, cursos, navigate])

  const handleUploadConstanciaEdit = async () => {
    if (!editingCurso || !editConstanciaFile) return
    try {
      setUploadingConstancia(true)
      setUploadError(null)
      const url = buildApiUrl(`/ana/cursos/${editingCurso._id}/constancia`)
      const fd = new FormData()
      fd.append('file', editConstanciaFile)
      const res = await fetch(url, { method: 'POST', body: fd })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Error al subir PDF')
      }
      await invalidateCursos()
      setEditConstanciaFile(null)
    } catch (e) {
      setUploadError(e.message || 'Error al subir PDF')
    } finally {
      setUploadingConstancia(false)
    }
  }

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Cursos</h1>
          <p className="text-slate-600 text-sm mt-1">Control de cursos pendientes y realizados, con constancias.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNuevo(true)}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Nuevo curso
        </button>
      </div>

      {/* Resumen superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total de cursos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{resumen.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{resumen.pendientes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Realizados</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{resumen.realizados}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vencidos</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{resumen.vencidos}</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
          {[
            ['todos', 'Todos'],
            ['pendiente', 'Pendientes'],
            ['realizado', 'Realizados'],
            ['vencido', 'Vencidos'],
            ['proximo', 'Próximos'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltroEstado(key)}
              className={`px-2.5 py-1 rounded-md font-medium ${
                filtroEstado === key ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nombre del curso..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mr-2">Ordenar por</label>
          <select
            value={ordenPor}
            onChange={(e) => setOrdenPor(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="fechaLimite">Fecha límite</option>
            <option value="nombre">Nombre</option>
            <option value="estado">Estado</option>
          </select>
          <button
            type="button"
            onClick={() => setOrdenAsc((v) => !v)}
            className="ml-2 text-xs text-sky-700 hover:underline"
          >
            {ordenAsc ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {/* Formulario nuevo curso */}
      {showNuevo && (
        <form
          onSubmit={handleSubmitNuevo}
          className="mb-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del curso</label>
            <input
              type="text"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de curso</label>
            <select
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px]"
            >
              {TIPO_OPCIONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha límite</label>
            <input
              type="date"
              value={formFechaLimite}
              onChange={(e) => setFormFechaLimite(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Constancia PDF (opcional)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFormConstanciaFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={crear.isPending}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {crear.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setShowNuevo(false)}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
            >
              Cancelar
            </button>
          </div>
          {crear.isError && <p className="text-sm text-red-600">{crear.error?.message || 'Error al guardar'}</p>}
        </form>
      )}

      {/* Formulario edición */}
      {editingCurso && (
        <form
          onSubmit={handleGuardarEdit}
          className="mb-4 bg-white border border-amber-200 rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <span className="w-full text-sm font-medium text-amber-800">Editando curso</span>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del curso</label>
            <input
              type="text"
              value={editingCurso.nombreCurso || ''}
              onChange={(e) => setEditingCurso((c) => ({ ...c, nombreCurso: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de curso</label>
            <select
              value={editingCurso.tipoCurso || ''}
              onChange={(e) => setEditingCurso((c) => ({ ...c, tipoCurso: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px]"
            >
              {TIPO_OPCIONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha límite</label>
            <input
              type="date"
              value={editingCurso.fechaLimite ? new Date(editingCurso.fechaLimite).toISOString().slice(0, 10) : ''}
              onChange={(e) => setEditingCurso((c) => ({ ...c, fechaLimite: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Constancia PDF (URL directa)</label>
            <input
              type="url"
              value={editingCurso.constanciaPdfUrl || ''}
              onChange={(e) => setEditingCurso((c) => ({ ...c, constanciaPdfUrl: e.target.value }))}
              placeholder="/uploads/cursos/archivo.pdf o URL externa"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[200px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Subir / reemplazar constancia PDF</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setEditConstanciaFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600"
              />
              <button
                type="button"
                onClick={handleUploadConstanciaEdit}
                disabled={!editConstanciaFile || uploadingConstancia}
                className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {uploadingConstancia ? 'Subiendo...' : 'Subir PDF'}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={actualizar.isPending}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => setEditingCurso(null)}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
            >
              Cancelar
            </button>
          </div>
          {actualizar.isError && <p className="text-sm text-red-600">{actualizar.error?.message || 'Error al actualizar'}</p>}
        </form>
      )}

      {/* Tabla de cursos */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Nombre del curso</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Tipo</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha límite</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha realización</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Constancia PDF</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cursosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">No hay cursos para los filtros seleccionados.</td>
              </tr>
            ) : (
              cursosFiltrados.map((curso) => (
                <tr key={curso._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-800 font-medium">{curso.nombreCurso}</td>
                  <td className="px-4 py-2 text-slate-600">{curso.tipoCurso}</td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{fmtDate(curso.fechaLimite)}</td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{fmtDate(curso.fechaRealizacion)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={!!curso.realizado}
                        onChange={(val) => handleToggleRealizado(curso, val)}
                        disabled={actualizar.isPending}
                      />
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${curso._estado.color}`}
                      >
                        {curso._estado.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {curso.constanciaPdfUrl ? (
                      <a
                        href={curso.constanciaPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline"
                      >
                        <span className="inline-block w-2.5 h-3 bg-rose-200 border border-rose-400" />
                        <span>Ver PDF</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin constancia</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingCurso(curso)}
                      className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar el curso "${curso.nombreCurso}"?`)) return
                        eliminar.mutate(curso._id)
                      }}
                      className="text-xs font-medium text-rose-700 hover:text-rose-900 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
