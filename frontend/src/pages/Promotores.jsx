import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchApi } from '../lib/api'
import ErrorApi from '../components/ErrorApi'

export default function Promotores() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['promotores'],
    queryFn: () => fetchApi('/promotores'),
  })

  if (isLoading) return <div className="p-6">Cargando...</div>
  if (error) return <ErrorApi error={error} />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Promotores</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.length ? data.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/promotores/${p._id}`} className="text-sky-600 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/promotores/${p._id}`} className="text-sm text-sky-600 hover:underline">Ver</Link>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No hay promotores</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
