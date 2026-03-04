import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'

export default function Prospectos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['prospectos'],
    queryFn: () => fetchApi('/prospectos'),
  })

  if (isLoading) return <div className="p-6">Cargando...</div>
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Prospectos</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Promotor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Etapa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Prob.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Monto est.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Próxima acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.length ? data.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.promotorId?.name ?? '-'}</td>
                <td className="px-4 py-3 capitalize">{p.stage}</td>
                <td className="px-4 py-3">{p.probability ?? '-'}%</td>
                <td className="px-4 py-3">{p.estimatedAmount != null ? `$${p.estimatedAmount.toLocaleString()}` : '-'}</td>
                <td className="px-4 py-3 text-slate-600">{p.nextAction || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay prospectos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
