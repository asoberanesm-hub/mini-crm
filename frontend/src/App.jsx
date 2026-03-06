import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClientesActivos from './pages/ana/ClientesActivos'
import ProspeccionAna from './pages/ana/Prospeccion'
import ClientesNuevos from './pages/promotores/ClientesNuevos'
import ProspectosPromotores from './pages/promotores/Prospectos'
import ProductosPromotores from './pages/promotores/Productos'
import Agenda from './pages/Agenda'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '0.75rem 1rem', background: '#0369a1', color: '#fff', fontFamily: 'sans-serif', fontSize: '1rem', fontWeight: 600 }}>
        Aysa CRM
      </header>
      <main style={{ flex: 1 }}>
    <Routes>
      {/* Rutas públicas para login/registro de Clerk */}
      <Route
        path="/sign-in/*"
        element={
          <SignedOut>
            <SignIn routing="path" path="/sign-in" />
          </SignedOut>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <SignedOut>
            <SignUp routing="path" path="/sign-up" />
          </SignedOut>
        }
      />

      {/* Rutas protegidas: solo usuarios autenticados */}
      <Route
        path="/*"
        element={
          <SignedIn>
            <Layout />
          </SignedIn>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="ana/clientes-activos" element={<ClientesActivos />} />
        <Route path="ana/prospeccion" element={<ProspeccionAna />} />
        <Route path="promotores/clientes-nuevos" element={<ClientesNuevos />} />
        <Route path="promotores/prospectos" element={<ProspectosPromotores />} />
        <Route path="promotores/productos" element={<ProductosPromotores />} />
        <Route path="agenda" element={<Agenda />} />
      </Route>

      {/* Cualquier ruta desconocida redirige al dashboard (si logueado) o al login */}
      <Route
        path="*"
        element={
          <SignedIn>
            <Navigate to="/" />
          </SignedIn>
        }
      />
      <Route
        path="*"
        element={
          <SignedOut>
            <Navigate to="/sign-in" />
          </SignedOut>
        }
      />
    </Routes>
      </main>
    </div>
  )
}
