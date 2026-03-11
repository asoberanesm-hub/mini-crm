import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'
import ErrorApi from '../../components/ErrorApi'
import LoadingModule from '../../components/LoadingModule'
import CrearSeguimientoModal from '../../components/CrearSeguimientoModal'

export default function ClientesActivos() {
  const [seguimientoModal, setSeguimientoModal] = useState(null)
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
      <CrearSeguimientoModal
        open={!!seguimientoModal}
        onClose={() => setSeguimientoModal(null)}
        tipo="cliente"
        entity={seguimientoModal ? { id: seguimientoModal._id, name: seguimientoModal.nombre } : null}
      />
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
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase w-40">Acciones</th>
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
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSeguimientoModal(row)}
                    className="text-sm font-medium text-violet-600 hover:text-violet-800"
                  >
                    Crear seguimiento
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
