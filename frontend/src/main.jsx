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

ReactDOM.createRoot(document.getElementById('root')).render(
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
