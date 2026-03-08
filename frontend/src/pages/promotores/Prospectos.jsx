import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

export default function ProspectosPromotores() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['promotores-vistas', 'prospectos'],
    queryFn: () => fetchApi('/promotores-vistas/prospectos'),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  const list = Array.isArray(data) ? data : []
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Prospectos</h1>
      <p className="text-slate-600 text-sm mb-6">Por promotor — mes de prospección inicial.</p>
      <div className="space-y-8">
        {list.length ? list.map((grupo, idx) => (
          <section key={idx} className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium text-slate-800 mb-4">{grupo.promotor}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Mes prospección inicial</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase">Etapa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {grupo.prospectos?.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-slate-600">{p.mesProspeccionInicial}</td>
                      <td className="px-4 py-2 capitalize">{p.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )) : (
          <p className="text-slate-500">No hay prospectos por promotor.</p>
        )}
      </div>
    </div>
  )
}
