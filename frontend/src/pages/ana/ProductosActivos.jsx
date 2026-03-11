import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchApi, postApi, putApi, deleteApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

// Claves de productos en orden (PFAE primero). Usar en state, payload y tabla.
const PRODUCT_KEYS = ['pfae', 'derivados', 'tN', 'inversion', 'captacion', 'pyme', 'intradia', 'corporativoFiduciario']

// Solo para formularios y payload: orden y metadatos (PFAE primero, luego derivados, etc.)
const PRODUCTOS = [
  { key: 'pfae', label: 'PFAE', color: 'bg-gray-100 text-gray-900' },
  { key: 'derivados', label: 'DERIVADOS', color: 'bg-red-100 text-red-900' },
  { key: 'tN', label: 'T+N', color: 'bg-orange-100 text-orange-900' },
  { key: 'inversion', label: 'INVERSION', color: 'bg-yellow-100 text-yellow-900' },
  { key: 'captacion', label: 'CAPTACION', color: 'bg-green-100 text-green-900' },
  { key: 'pyme', label: 'PYME', color: 'bg-sky-100 text-sky-900' },
  { key: 'intradia', label: 'INTRADIA', color: 'bg-[#febeac] text-[#4b1e27]' },
  { key: 'corporativoFiduciario', label: 'CORPORATIVO', color: 'bg-violet-100 text-violet-900' },
]

/** State inicial de productos: cada clave con { tipo: '', fecha: '' } (incluye PFAE). */
function getInitialValores() {
  return Object.fromEntries(PRODUCT_KEYS.map((k) => [k, { tipo: '', fecha: '' }]))
}

// Colores fijos por columna (para tabla con celdas explícitas)
const COLOR_PFAE = 'bg-gray-100 text-gray-900'
const COLOR_DERIVADOS = 'bg-red-100 text-red-900'
const COLOR_TN = 'bg-orange-100 text-orange-900'
const COLOR_INVERSION = 'bg-yellow-100 text-yellow-900'
const COLOR_CAPTACION = 'bg-green-100 text-green-900'
const COLOR_PYME = 'bg-sky-100 text-sky-900'
const COLOR_INTRADIA = 'bg-[#febeac] text-[#4b1e27]'
const COLOR_CORPORATIVO = 'bg-violet-100 text-violet-900'

const TIPO_VACIO = ''
const TIPO_TRAMITE = 'tramite'
const TIPO_ACTIVO = 'activo'
const TIPO_FECHA = 'fecha'

/** Valor a string para enviar al backend: '', 'tramite', 'activo', o 'YYYY-MM-DD'. */
function valorToPayload(tipo, fechaInput) {
  if (tipo === TIPO_FECHA && fechaInput) return fechaInput
  if (tipo === TIPO_TRAMITE) return 'tramite'
  if (tipo === TIPO_ACTIVO) return 'activo'
  return ''
}

/** Valor del backend a tipo + fecha para el formulario. Acepta Date, ISO string o YYYY-MM-DD. */
function payloadToTipo(val) {
  if (isDateValue(val)) {
    const date = new Date(val)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return { tipo: TIPO_FECHA, fecha: `${y}-${m}-${d}` }
  }
  if (!val || typeof val !== 'string') return { tipo: TIPO_VACIO, fecha: '' }
  const v = val.trim().toLowerCase()
  if (v === 'tramite' || v === 'trámite' || v === 'pendiente') return { tipo: TIPO_TRAMITE, fecha: '' }
  if (v === 'activo' || v === 'sí' || v === 'si') return { tipo: TIPO_ACTIVO, fecha: '' }
  return { tipo: TIPO_VACIO, fecha: '' }
}

/** Formato corto dd/mm/aa para tabla. Nunca ISO. Acepta Date, YYYY-MM-DD o ISO string. */
function toShortDate(val) {
  if (val == null || val === '') return ''
  const date = new Date(val)
  if (Number.isNaN(date.getTime())) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear()).slice(-2)
  return `${d}/${m}/${y}`
}

/** True si el valor es una fecha (Date o string YYYY-MM-DD o ISO). */
function isDateValue(val) {
  if (!val) return false
  if (val instanceof Date) return !Number.isNaN(val.getTime())
  const date = new Date(val)
  return !Number.isNaN(date.getTime())
}

export default function ProductosActivos() {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [valores, setValores] = useState(() => getInitialValores())
  const [editingRow, setEditingRow] = useState(null)
  const [notas, setNotas] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ana', 'productos-activos'],
    queryFn: () => fetchApi('/productos-activos'),
    placeholderData: keepPreviousData,
  })

  const crear = useMutation({
    mutationFn: (payload) => postApi('/productos-activos', payload),
    onSuccess: (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProductosActivos] respuesta tras guardar:', data)
        console.log('[ProductosActivos] registro.pfae en respuesta:', data?.pfae)
      }
      queryClient.invalidateQueries({ queryKey: ['ana', 'productos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      resetAddForm()
    },
  })

  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => putApi(`/productos-activos/${id}`, payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['ana', 'productos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      setEditingRow(null)
    },
  })

  const eliminar = useMutation({
    mutationFn: (id) => deleteApi(`/productos-activos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ana', 'productos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      if (editingRow) setEditingRow(null)
    },
  })

  const handleEliminar = (row) => {
    if (!window.confirm(`¿Eliminar el registro "${row.name}"?`)) return
    eliminar.mutate(row._id)
  }

  function resetAddForm() {
    setNombre('')
    setValores(getInitialValores())
    setNotas('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const name = nombre.trim()
    if (!name) return
    const v = (key) => valores[key] ?? { tipo: '', fecha: '' }
    const payload = { name, notas: notas.trim() || '' }
    PRODUCT_KEYS.forEach((key) => {
      payload[key] = valorToPayload(v(key).tipo, v(key).fecha)
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductosActivos] form.pfae antes de guardar:', valores.pfae)
      console.log('[ProductosActivos] payload enviado:', payload)
    }
    crear.mutate(payload)
  }

  const handleEditSave = (e) => {
    e.preventDefault()
    if (!editingRow) return
    const payload = { name: (editingRow.name ?? '').trim(), notas: (editingRow.notas ?? '').trim() }
    PRODUCT_KEYS.forEach((key) => {
      payload[key] = valorToPayload(editingRow[`${key}_tipo`] ?? '', editingRow[`${key}_fecha`] ?? '')
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductosActivos] edit payload (incl. PFAE):', payload)
    }
    actualizar.mutate({ id: editingRow._id, payload })
  }

  const setValor = (key, tipo, fecha = '') => {
    setValores((prev) => ({ ...prev, [key]: { tipo, fecha } }))
  }

  const setEditingValor = (key, tipo, fecha = '') => {
    setEditingRow((r) => (r ? { ...r, [`${key}_tipo`]: tipo, [`${key}_fecha`]: fecha } : null))
  }

  const startEdit = (row) => {
    const next = { ...row }
    PRODUCTOS.forEach((p) => {
      const { tipo, fecha } = payloadToTipo(row[p.key])
      next[`${p.key}_tipo`] = tipo
      next[`${p.key}_fecha`] = fecha
    })
    setEditingRow(next)
  }

  const list = Array.isArray(data) ? data : []

  /**
   * Renderiza cada celda de producto. Tres tipos de contenido visible (siempre como badge):
   * 1. Texto "ACTIVO"
   * 2. Texto "TRAMITE"
   * 3. Fecha formateada (dd/mm/aa)
   * Se comprueba primero ACTIVO/TRAMITE como string; luego fecha.
   */
  function cellDisplay(val, colorClass) {
    if (val === undefined || val === null) return { className: '', text: '' }
    const v = typeof val === 'string' ? val.trim() : val
    if (v === '') return { className: '', text: '' }

    const s = String(v).toLowerCase()
    // 1. ACTIVO (badge)
    if (s === 'activo' || s === 'sí' || s === 'si') return { className: colorClass, text: 'ACTIVO' }
    // 2. TRAMITE (badge)
    if (s === 'tramite' || s === 'trámite' || s === 'pendiente') return { className: colorClass, text: 'TRAMITE' }
    // 3. Fecha formateada (badge)
    if (isDateValue(val)) return { className: colorClass, text: toShortDate(val) }

    return { className: '', text: '' }
  }

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Productos Activos</h1>
      <p className="text-slate-600 text-sm mb-4">
        Cada producto admite: <strong>vacío</strong>, <strong>TRAMITE</strong>, <strong>ACTIVO</strong> o <strong>fecha</strong> (vencimiento). El color es fijo por producto. Las fechas se muestran en formato dd/mm/aa y en el calendario como VMTO.
      </p>

      <form name="formAdd" onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[160px]"
          required
        />
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
          <input
            type="text"
            name="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas generales del cliente"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        {PRODUCTOS.map((p) => {
          const val = valores[p.key] ?? { tipo: '', fecha: '' }
          return (
            <div key={p.key} className="flex flex-col gap-0.5">
              <label className="text-slate-500 text-xs font-medium">{p.label}</label>
              <div className="flex items-center gap-1">
                <select
                  name={`tipo_${p.key}`}
                  value={val.tipo}
                  onChange={(e) => {
                    const t = e.target.value
                    setValor(p.key, t, t === TIPO_FECHA ? val.fecha : '')
                  }}
                  className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[100px]"
                >
                  <option value={TIPO_VACIO}>vacío</option>
                  <option value={TIPO_TRAMITE}>TRAMITE</option>
                  <option value={TIPO_ACTIVO}>ACTIVO</option>
                  <option value={TIPO_FECHA}>fecha</option>
                </select>
                {val.tipo === TIPO_FECHA && (
                  <input
                    type="date"
                    name={`fecha_${p.key}`}
                    value={val.fecha}
                    onChange={(e) => setValor(p.key, TIPO_FECHA, e.target.value)}
                    className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
          )
        })}
        <button
          type="submit"
          disabled={crear.isPending || !nombre.trim()}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {crear.isPending ? 'Guardando...' : 'Agregar'}
        </button>
        {crear.isError && <span className="text-red-600 text-sm">{crear.error?.message}</span>}
        {crear.isSuccess && <span className="text-green-600 text-sm">Guardado.</span>}
      </form>

      {editingRow && (
        <form name="formEdit" onSubmit={handleEditSave} className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <span className="w-full text-sm font-medium text-amber-800">Editando — modifica y guarda</span>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
            <input
              type="text"
              name="nombre_edit"
              value={editingRow.name || ''}
              onChange={(e) => setEditingRow((r) => (r ? { ...r, name: e.target.value } : null))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[160px]"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
            <input
              type="text"
              name="notas_edit"
              value={editingRow.notas || ''}
              onChange={(e) => setEditingRow((r) => (r ? { ...r, notas: e.target.value } : null))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Notas generales del cliente"
            />
          </div>
          {PRODUCTOS.map((p) => (
            <div key={p.key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{p.label}</label>
              <div className="flex items-center gap-1">
                <select
                  name={`tipo_edit_${p.key}`}
                  value={editingRow[`${p.key}_tipo`] ?? TIPO_VACIO}
                  onChange={(e) => {
                    const t = e.target.value
                    setEditingValor(p.key, t, t === TIPO_FECHA ? (editingRow[`${p.key}_fecha`] ?? '') : '')
                  }}
                  className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[100px]"
                >
                  <option value={TIPO_VACIO}>vacío</option>
                  <option value={TIPO_TRAMITE}>TRAMITE</option>
                  <option value={TIPO_ACTIVO}>ACTIVO</option>
                  <option value={TIPO_FECHA}>fecha</option>
                </select>
                {(editingRow[`${p.key}_tipo`] ?? '') === TIPO_FECHA && (
                  <input
                    type="date"
                    name={`fecha_edit_${p.key}`}
                    value={editingRow[`${p.key}_fecha`] ?? ''}
                    onChange={(e) => setEditingValor(p.key, TIPO_FECHA, e.target.value)}
                    className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
          ))}
          <button type="submit" disabled={actualizar.isPending} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            Guardar
          </button>
          <button type="button" onClick={() => setEditingRow(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">
            Cancelar
          </button>
          {actualizar.isError && <span className="text-red-600 text-sm">{actualizar.error?.message}</span>}
        </form>
      )}

      <p className="text-slate-500 text-sm mb-2">
        Cada celda con valor se muestra como badge con el color del producto. Haz clic en <strong>EDITAR</strong> para cambiar.
      </p>
      {eliminar.isError && <p className="text-red-600 text-sm mb-2">{eliminar.error?.message}</p>}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">PFAE</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Derivados</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">T+N</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Inversion</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Captacion</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Pyme</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Intradia</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Corporativo</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase">Notas</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {list.length ? (
              list.map((row, idx) => {
                if (process.env.NODE_ENV === 'development' && idx === 0) {
                  console.log('[ProductosActivos] primera fila renderizada row.pfae:', row.pfae, 'row:', row)
                }
                const dPfae = cellDisplay(row.pfae, COLOR_PFAE)
                const dDerivados = cellDisplay(row.derivados, COLOR_DERIVADOS)
                const dTn = cellDisplay(row.tN, COLOR_TN)
                const dInversion = cellDisplay(row.inversion, COLOR_INVERSION)
                const dCaptacion = cellDisplay(row.captacion, COLOR_CAPTACION)
                const dPyme = cellDisplay(row.pyme, COLOR_PYME)
                const dIntradia = cellDisplay(row.intradia, COLOR_INTRADIA)
                const dCorp = cellDisplay(row.corporativoFiduciario, COLOR_CORPORATIVO)
                const badge = (d) => d.text ? <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${d.className}`} title={d.text}>{d.text}</span> : null
                return (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                    <td className="px-2 py-2 align-middle">{badge(dPfae)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dDerivados)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dTn)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dInversion)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dCaptacion)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dPyme)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dIntradia)}</td>
                    <td className="px-2 py-2 align-middle">{badge(dCorp)}</td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-600 max-w-[200px] truncate" title={row.notas || ''}>
                      {row.notas || ''}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-200 border border-sky-200"
                      >
                        EDITAR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(row)}
                        disabled={eliminar.isPending && eliminar.variables === row._id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 border border-red-200 disabled:opacity-50"
                      >
                        {eliminar.isPending && eliminar.variables === row._id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                  No hay registros. Agrega uno con el formulario de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
