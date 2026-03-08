import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'

export default function ClientesNuevos() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['promotores-vistas', 'clientes-nuevos'],
    queryFn: () => fetchApi('/promotores-vistas/clientes-nuevos'),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <LoadingModule refetch={refetch} />
  if (error) return <ErrorApi error={error} />

  const list = Array.isArray(data) ? data : []
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Clientes nuevos</h1>
      <p className="text-slate-600 text-sm mb-6">
        Desde 2025: generación mensual, suma anual por promotor, y productos por cliente con mes/año de entrada (Pyme, T+N, Derivados, Corporativo).
      </p>
      <div className="space-y-8">
        {list.length ? list.map((item) => (
          <section key={item.promotorId} className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium text-slate-800 mb-4">{item.nombre}</h2>
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Generación mensual</h3>
                {item.mensual?.length ? (
                  <ul className="text-sm space-y-1">
                    {item.mensual.map((m, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{m.month}/{m.year}</span>
                        <span>${m.generacion?.toLocaleString() ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">Sin datos mensuales</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Suma anual</h3>
                {item.anual?.length ? (
                  <ul className="text-sm space-y-1">
                    {item.anual.map((a, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{a.year}</span>
                        <span>${a.suma?.toLocaleString() ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">Sin datos anuales</p>
                )}
              </div>
            </div>
            {item.clientes?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Productos por cliente (mes/año entrada)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4">Producto</th>
                        <th className="py-2">Mes / Año</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.clientes.map((cl, ci) =>
                        cl.productos?.map((pr, pi) => (
                          <tr key={`${ci}-${pi}`} className="border-b border-slate-100">
                            <td className="py-2 pr-4">{pi === 0 ? cl.nombreCliente : ''}</td>
                            <td className="py-2 pr-4">{pr.producto}</td>
                            <td className="py-2">{pr.mes && pr.año ? `${pr.mes}/${pr.año}` : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )) : (
          <p className="text-slate-500">No hay promotores con datos desde 2025.</p>
        )}
      </div>
    </div>
  )
}
