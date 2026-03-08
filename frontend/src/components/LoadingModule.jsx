import { useState, useEffect } from 'react'

const SLOW_SECONDS = 8

/**
 * Pantalla de carga para módulos. Si tarda más de SLOW_SECONDS segundos,
 * muestra un mensaje explicando que el servidor (p. ej. Render) puede estar despertando.
 */
export default function LoadingModule({ refetch }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-600">
        <p className="text-lg font-medium">Cargando...</p>
        {slow && (
          <div className="mt-4 max-w-sm text-center">
            <p className="text-sm text-slate-500">
              El servidor puede tardar hasta 1 minuto si estaba en reposo (Render).
            </p>
            {refetch && (
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-sky-100 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-200"
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
