import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'

const STAGES = ['lead', 'perfilado', 'propuesta', 'negociación', 'autorizado', 'activado', 'perdido']

export default function Pipeline() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => fetchApi('/productos/contratos'),
  })

  if (isLoading) return <div className="p-6">Cargando...</div>
  if (error) return <ErrorApi error={error} />

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = (data ?? []).filter((c) => c.stage === s)
    return acc
  }, {})

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[260px] bg-slate-100 rounded-lg p-3 flex-shrink-0">
            <h3 className="font-medium text-slate-700 mb-3 capitalize">{stage}</h3>
            <ul className="space-y-2">
              {byStage[stage]?.map((c) => (
                <li key={c._id} className="bg-white rounded p-2 shadow-sm text-sm">
                  <p className="font-medium text-slate-800">{c.clientId?.name ?? '-'}</p>
                  <p className="text-slate-500">{c.productId?.name ?? '-'}</p>
                  <p className="text-xs text-slate-400">{c.promotorId?.name ?? '-'}</p>
                </li>
              )) ?? <li className="text-slate-500 text-sm">Sin registros</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
