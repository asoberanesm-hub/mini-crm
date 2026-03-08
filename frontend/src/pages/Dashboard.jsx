import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'
import LoadingModule from '../components/LoadingModule'

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['metrics', 'overview'],
    queryFn: () => fetchApi('/metrics/overview'),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />
  if (!data) return null

  const { generacionTotal, mom, yoy, ranking = [], diversificacion = [] } = data

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Generación del mes" value={`$${generacionTotal?.toLocaleString() ?? 0}`} />
        <Card title="MoM" value={mom != null ? `${mom}%` : '-'} subtitle="vs mes anterior" />
        <Card title="YoY" value={yoy != null ? `${yoy}%` : '-'} subtitle="vs mismo mes año anterior" />
        <Card title="Clientes activos" value={data.clientesNuevosEfectivos ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-slate-800 mb-3">Ranking promotores</h2>
          <ul className="space-y-2">
            {(ranking && ranking.length) ? ranking.map((r, i) => (
              <li key={r.promotor?._id ?? i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span><strong>{i + 1}.</strong> {r.promotor?.name ?? '-'}</span>
                <span className="text-slate-600">${r.total?.toLocaleString() ?? 0}</span>
              </li>
            )) : <li className="text-slate-500">Sin datos</li>}
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-slate-800 mb-3">Diversificación por producto</h2>
          <ul className="space-y-2">
            {(diversificacion && diversificacion.length) ? diversificacion.map((d, i) => (
              <li key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span>{d.name}</span>
                <span>{d.count} ({d.pct}%)</span>
              </li>
            )) : <li className="text-slate-500">Sin productos activados</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Card({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}
