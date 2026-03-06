const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return BASE ? `${BASE}/api/v1${p}` : `/api/v1${p}`
}

export async function fetchApi(path, opts = {}) {
  const url = buildUrl(path)
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    })
    const text = await res.text()
    const body = text ? (() => { try { return JSON.parse(text) } catch { return null } })() : null
    if (!res.ok) {
      if (res.status === 404 && text && text.includes('Cannot GET'))
        throw new Error('Ruta no encontrada. Reinicia el backend: en la carpeta backend ejecuta "npm run dev".')
      const msg = body?.reply || body?.error || body?.message || (typeof text === 'string' && text.length < 200 ? text : null) || res.statusText
      throw new Error(typeof msg === 'string' ? msg : 'Error en el servidor')
    }
    return body ?? {}
  } catch (e) {
    const msg = e?.message || ''
    const isNetwork = e.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Load failed') || msg.includes('Failed to fetch'))
    if (isNetwork) {
      const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname)
      if (isProd) {
        throw new Error('No se pudo conectar con el backend. Si acabas de abrir la app, el servidor puede estar iniciando en Render (espera 1 minuto y recarga). Si sigue fallando, revisa que el backend en Render esté en estado "Live".')
      }
      throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend? En la carpeta backend ejecuta: npm run dev')
    }
    throw e
  }
}

export async function postApi(path, body) {
  return fetchApi(path, { method: 'POST', body: JSON.stringify(body) })
}

export async function putApi(path, body) {
  return fetchApi(path, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteApi(path) {
  return fetchApi(path, { method: 'DELETE' })
}
