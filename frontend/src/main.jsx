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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
)
