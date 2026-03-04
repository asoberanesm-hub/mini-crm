import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'

export default function Expedientes() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['expedientes'],
    queryFn: () => fetchApi('/expedientes'),
  })

  if (isLoading) return <div className="p-6">Cargando...</div>
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Actualizaciones de expediente</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tipo doc.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Entidad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Estatus</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Riesgo / Obs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.length ? data.map((e) => (
              <tr key={e._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{e.docType}</td>
                <td className="px-4 py-3 text-slate-600">
                  {e.entityType === 'cliente' ? e.clientId?.name : e.prospectId?.name ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-slate-100 capitalize">{e.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.riskNotes || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No hay expedientes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
