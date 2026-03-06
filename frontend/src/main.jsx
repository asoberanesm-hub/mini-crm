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

const root = document.getElementById('root')
if (!root) {
  console.error('No #root')
} else if (!clerkPublishableKey || !apiUrl) {
  const missing = []
  if (!clerkPublishableKey) missing.push('VITE_CLERK_PUBLISHABLE_KEY')
  if (!apiUrl) missing.push('VITE_API_URL')
  root.innerHTML = ''
  ReactDOM.createRoot(root).render(
    <ConfigError message={`Faltan variables de entorno en el build: ${missing.join(', ')}.`} />
  )
} else {
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
}
