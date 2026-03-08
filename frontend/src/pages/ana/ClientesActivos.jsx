import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

export default function ClientesActivos() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ana', 'clientes-activos'],
    queryFn: () => fetchApi('/ana/clientes-activos'),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  const list = Array.isArray(data) ? data : []
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Clientes Activos</h1>
      <p className="text-slate-600 text-sm mb-6">Nombre, Producto (Derivados, Corporativo, Pyme, T+N, Divisas, Reporto), Fecha actualización, Generación acumulada.</p>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Fecha actualización</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Generación acumulada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {list.length ? list.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{row.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{row.producto}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.fechaActualizacion ? new Date(row.fechaActualizacion).toLocaleDateString('es-MX') : '-'}
                </td>
                <td className="px-4 py-3 text-right">${(row.generacionAcumulada ?? 0).toLocaleString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No hay clientes activos. Crea un promotor con slug &quot;ana-soberanes&quot; y asígnale clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
