export default function ErrorApi({ error }) {
  const msg = error?.message || ''
  const isNetwork = msg.includes('conectar') || msg.includes('fetch') || msg.includes('Load failed') || msg.includes('Failed to fetch')
  return (
    <div className="p-6 max-w-md">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="font-medium text-red-800">Error</p>
        <p className="text-sm text-red-700 mt-1">{msg}</p>
        {isNetwork && (
          <p className="text-xs text-red-600 mt-3">
            Comprueba que el backend esté en marcha. En la carpeta <code className="bg-red-100 px-1 rounded">backend</code> ejecuta: <code className="bg-red-100 px-1 rounded">npm run dev</code>
          </p>
        )}
      </div>
    </div>
  )
}
