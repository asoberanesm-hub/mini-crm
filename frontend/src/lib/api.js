const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// En producción, en consola (F12) verás qué API usa la app; si sale vacío, VITE_API_URL no se aplicó en el build
if (typeof window !== 'undefined') {
  console.log('[Aysa] API:', BASE || '(no configurada — peticiones irán al mismo origen)')
}

// En producción (Render) el backend puede estar "dormido"; darle hasta 90s y reintentar
const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname)
const REQUEST_TIMEOUT_MS = isProd ? 90000 : 15000
const RETRY_DELAYS_MS = isProd ? [8000, 20000] : []

function buildUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return BASE ? `${BASE}/api/v1${p}` : `/api/v1${p}`
}

function isNetworkError(e) {
  const msg = e?.message || ''
  return e?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Load failed') || msg.includes('Failed to fetch'))
}

function fetchWithTimeout(url, opts, timeoutMs) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id))
}

export function buildApiUrl(path) {
  return buildUrl(path)
}

async function doOneRequest(url, opts) {
  const res = await fetchWithTimeout(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  }, REQUEST_TIMEOUT_MS)
  const text = await res.text()
  const body = text ? (() => { try { return JSON.parse(text) } catch { return null } })() : null
  if (!res.ok) {
    if (res.status === 404 && text && text.includes('Cannot GET'))
      throw new Error('Ruta no encontrada. Reinicia el backend: en la carpeta backend ejecuta "npm run dev".')
    const msg = body?.reply || body?.error || body?.message || (typeof text === 'string' && text.length < 200 ? text : null) || res.statusText
    throw new Error(typeof msg === 'string' ? msg : 'Error en el servidor')
  }
  return body ?? {}
}

export async function fetchApi(path, opts = {}) {
  const url = buildUrl(path)
  const attempt = async (retryIndex = -1) => {
    try {
      return await doOneRequest(url, opts)
    } catch (e) {
      if (isNetworkError(e) && retryIndex < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[retryIndex]
        await new Promise(r => setTimeout(r, delay))
        return attempt(retryIndex + 1)
      }
      if (isNetworkError(e)) {
        if (isProd) {
          throw new Error('No se pudo conectar con el backend tras varios intentos. El servidor en Render puede estar caído o muy lento. Revisa el estado en Render o intenta de nuevo en un momento.')
        }
        throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend? En la carpeta backend ejecuta: npm run dev')
      }
      throw e
    }
  }
  return attempt()
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
