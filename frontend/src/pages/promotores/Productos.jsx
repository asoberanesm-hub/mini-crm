import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

export default function ProductosPromotores() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['promotores-vistas', 'productos'],
    queryFn: () => fetchApi('/promotores-vistas/productos'),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  const list = Array.isArray(data) ? data : []
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Productos</h1>
      <p className="text-slate-600 text-sm mb-6">
        Nombre del cliente, producto (T+N, Derivados, Pyme, Corporativo, Fiduciario) por promotor.
      </p>
      <div className="space-y-8">
        {list.length ? list.map((grupo, idx) => (
          <section key={idx} className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="font-medium text-slate-800 px-4 py-3 border-b border-slate-200">{grupo.promotor}</h2>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nombre del cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Producto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {grupo.filas?.length ? grupo.filas.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{f.nombreCliente}</td>
                    <td className="px-4 py-3 text-slate-600">{f.producto}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-500">Sin productos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )) : (
          <p className="text-slate-500">No hay datos de productos por promotor.</p>
        )}
      </div>
    </div>
  )
}
