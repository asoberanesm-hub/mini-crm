import { Routes, Route, Navigate } from 'react-router-dom'
// STAND-BY CLERK: imports desactivados. Para reactivar: descomentar y volver a usar SignedIn/SignedOut en las rutas.
// import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
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
      {/* STAND-BY CLERK: /sign-in y /sign-up redirigen al dashboard. Para reactivar: restaurar rutas con SignIn/SignUp y SignedOut. */}
      <Route path="/sign-in/*" element={<Navigate to="/" replace />} />
      <Route path="/sign-up/*" element={<Navigate to="/" replace />} />

      {/* CRM: acceso directo sin login (Clerk en stand-by). Para reactivar: envolver element en <SignedIn><Layout /></SignedIn> y añadir ruta * con <SignedOut><Navigate to="/sign-in" /></SignedOut>. */}
      <Route path="/*" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ana/clientes-activos" element={<ClientesActivos />} />
        <Route path="ana/prospeccion" element={<ProspeccionAna />} />
        <Route path="promotores/clientes-nuevos" element={<ClientesNuevos />} />
        <Route path="promotores/prospectos" element={<ProspectosPromotores />} />
        <Route path="promotores/productos" element={<ProductosPromotores />} />
        <Route path="agenda" element={<Agenda />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      </main>
    </div>
  )
}
