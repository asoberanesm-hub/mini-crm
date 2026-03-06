import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 },
  },
})

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const apiUrl = import.meta.env.VITE_API_URL

function ConfigError({ message }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', maxWidth: '400px', margin: '2rem auto' }}>
      <h1 style={{ color: '#b91c1c', fontSize: '1.25rem' }}>Configuración en Render</h1>
      <p style={{ color: '#555' }}>{message}</p>
      <p style={{ fontSize: '0.875rem', color: '#666' }}>En Render → mini-crm-frontend → Environment, añade las variables y haz "Save and rebuild".</p>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h1>Algo falló al cargar</h1>
          <p style={{ color: '#666' }}>{this.state.error?.message || 'Error desconocido'}</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      )
    }
    return this.props.children
  }
}

function hideFallback() {
  const el = document.getElementById('fallback')
  if (el) el.style.display = 'none'
}

function showErrorInRoot(message) {
  const root = document.getElementById('root')
  if (!root) return
  hideFallback()
  root.innerHTML = '<div data-error-overlay="1" style="padding:2rem;font-family:sans-serif;max-width:500px;margin:2rem auto;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;"><h2 style="color:#b91c1c;">Error al cargar</h2><pre style="white-space:pre-wrap;font-size:12px;color:#555;">' + String(message).replace(/</g, '&lt;') + '</pre><a href="/" style="display:inline-block;margin-top:1rem;padding:0.5rem 1rem;background:#0369a1;color:#fff;text-decoration:none;border-radius:6px;">Recargar</a></div>'
}

window.addEventListener('error', (e) => {
  if (!document.getElementById('root')?.querySelector('[data-error-overlay]')) {
    showErrorInRoot(e.message || e)
  }
})
window.addEventListener('unhandledrejection', (e) => {
  if (!document.getElementById('root')?.querySelector('[data-error-overlay]')) {
    showErrorInRoot(e.reason?.message || String(e.reason))
  }
})

const root = document.getElementById('root')
if (!root) {
  console.error('No #root')
} else {
  const useSimple = typeof window !== 'undefined' && window.location.search.includes('simple=1')
  if (useSimple) {
    hideFallback()
    ReactDOM.createRoot(root).render(
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>Aysa CRM</h1>
        <p style={{ color: '#555' }}>La app está desplegada correctamente.</p>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>Quita <code>?simple=1</code> de la URL para usar el login con Clerk.</p>
        <a href="/" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: '#0369a1', color: '#fff', textDecoration: 'none', borderRadius: 6 }}>Ir al CRM</a>
      </div>
    )
  } else if (!clerkPublishableKey || !apiUrl) {
    const missing = []
    if (!clerkPublishableKey) missing.push('VITE_CLERK_PUBLISHABLE_KEY')
    if (!apiUrl) missing.push('VITE_API_URL')
    hideFallback()
    ReactDOM.createRoot(root).render(
      <ConfigError message={`Faltan variables de entorno en el build: ${missing.join(', ')}.`} />
    )
  } else {
    try {
      hideFallback()
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ErrorBoundary>
            <BrowserRouter>
              <ClerkProvider publishableKey={clerkPublishableKey} telemetry={false}>
                <QueryClientProvider client={queryClient}>
                  <App />
                </QueryClientProvider>
              </ClerkProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </React.StrictMode>
      )
    } catch (e) {
      showErrorInRoot(e?.message || String(e))
    }
  }
}
