import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'

export default function PromotorDetalle() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics', 'promotor', id],
    queryFn: () => fetchApi(`/metrics/promotor/${id}`),
  })

  if (isLoading) return <div className="p-6">Cargando...</div>
  if (error) return <ErrorApi error={error} />
  if (!data) return null

  const { promotor, generacionActual, metaMensual, avancePct, topClientes, pipeline, estancados } = data

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/promotores" className="text-slate-500 hover:text-slate-700">← Promotores</Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">{promotor.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card title="Generación actual" value={`$${generacionActual?.toLocaleString() ?? 0}`} />
        <Card title="Meta mensual" value={metaMensual ? `$${metaMensual.toLocaleString()}` : '-'} />
        <Card title="Avance" value={avancePct != null ? `${avancePct}%` : '-'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-slate-800 mb-3">Top clientes</h2>
          <ul className="space-y-2">
            {topClientes?.length ? topClientes.map((c, i) => (
              <li key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span>{c.cliente}</span>
                <span>${c.total?.toLocaleString()}</span>
              </li>
            )) : <li className="text-slate-500">Sin datos</li>}
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-slate-800 mb-3">Pipeline por etapa</h2>
          <ul className="space-y-2">
            {pipeline?.length ? pipeline.map((p, i) => (
              <li key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="capitalize">{p._id}</span>
                <span>{p.count}</span>
              </li>
            )) : <li className="text-slate-500">Sin contratos</li>}
          </ul>
        </section>
      </div>

      {estancados?.length > 0 && (
        <section className="mt-6 bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <h2 className="font-medium text-amber-800 mb-3">Alertas: productos estancados (+14 días)</h2>
          <ul className="space-y-2">
            {estancados.map((e) => (
              <li key={e._id} className="text-amber-900">
                {e.clientId?.name} - {e.productId?.name} en {e.stage}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}
