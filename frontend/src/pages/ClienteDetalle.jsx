import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'
import CrearSeguimientoModal from '../components/CrearSeguimientoModal'

export default function ClienteDetalle() {
  const { id } = useParams()
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false)
  const clienteQ = useQuery({
    queryKey: ['clientes', id],
    queryFn: () => fetchApi(`/clientes/${id}`),
  })
  const contratosQ = useQuery({
    queryKey: ['contratos', { clientId: id }],
    queryFn: () => fetchApi(`/productos/contratos?clientId=${id}`),
    enabled: !!id,
  })
  const generacionQ = useQuery({
    queryKey: ['generacion', { clientId: id }],
    queryFn: () => fetchApi(`/generacion?clientId=${id}`),
    enabled: !!id,
  })

  const cliente = clienteQ.data
  const contratos = contratosQ.data ?? []
  const generacion = generacionQ.data ?? []

  if (clienteQ.isLoading || !cliente) return <div className="p-6">Cargando...</div>
  if (clienteQ.error) return <ErrorApi error={clienteQ.error} />

  const totalGen = generacion.reduce((s, g) => s + g.amount, 0)

  return (
    <div className="p-6">
      <CrearSeguimientoModal
        open={showSeguimientoModal}
        onClose={() => setShowSeguimientoModal(false)}
        tipo="cliente"
        entity={{ id: cliente._id, name: cliente.name }}
      />
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to="/clientes" className="text-slate-500 hover:text-slate-700">← Clientes</Link>
        <button
          type="button"
          onClick={() => setShowSeguimientoModal(true)}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
        >
          Crear seguimiento
        </button>
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">{cliente.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">Promotor</p>
          <p className="font-medium">{cliente.promotorId?.name ?? '-'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">Fecha alta</p>
          <p>{cliente.onboardedAt ? new Date(cliente.onboardedAt).toLocaleDateString('es-MX') : '-'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">Generación acumulada</p>
          <p className="font-semibold">${totalGen.toLocaleString()}</p>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-medium text-slate-800 mb-3">Productos contratados</h2>
        <ul className="space-y-2">
          {contratos.length ? contratos.map((c) => (
            <li key={c._id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span>{c.productId?.name ?? '-'}</span>
              <span className={`px-2 py-1 rounded text-xs capitalize ${c.stage === 'activado' ? 'bg-green-100' : c.stage === 'perdido' ? 'bg-red-100' : 'bg-slate-100'}`}>
                {c.stage}
              </span>
              {c.activatedAt && <span className="text-slate-500 text-sm">{new Date(c.activatedAt).toLocaleDateString('es-MX')}</span>}
            </li>
          )) : <li className="text-slate-500">Sin productos</li>}
        </ul>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium text-slate-800 mb-3">Generación mensual</h2>
        <ul className="space-y-2">
          {generacion.length ? generacion.slice(0, 12).map((g) => (
            <li key={g._id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span>{g.month}/{g.year}</span>
              <span>${g.amount?.toLocaleString()}</span>
            </li>
          )) : <li className="text-slate-500">Sin registros</li>}
        </ul>
      </section>
    </div>
  )
}
