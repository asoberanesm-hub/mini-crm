import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../lib/api'
import Chatbot from './Chatbot'

// Mantener despierto el backend en Render: ping a /health cada 10 min mientras la app esté abierta
const KEEP_ALIVE_MINUTES = 10
const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname)

const modulos = [
  { to: '/', label: 'Dashboard' },
  {
    label: 'ANA SOBERANES',
    sub: [
      { to: '/ana/clientes-activos', label: 'Clientes Activos' },
      { to: '/ana/productos-activos', label: 'Productos Activos' },
      { to: '/ana/prospeccion', label: 'Prospección' },
      { to: '/ana/cursos', label: 'Cursos' },
    ],
  },
  {
    label: 'PROMOTORES',
    sub: [
      { to: '/promotores/clientes-nuevos', label: 'Clientes nuevos' },
      { to: '/promotores/prospectos', label: 'Prospectos' },
      { to: '/promotores/productos', label: 'Productos' },
    ],
  },
  {
    label: 'AGENDA',
    sub: [
      { to: '/agenda', label: 'Calendario' },
    ],
  },
]

// Prefetch: al pasar el ratón por un enlace, cargamos los datos de ese módulo para que al hacer clic ya estén (o casi).
const prefetchConfig = {
  '/': { queryKey: ['metrics', 'overview'], queryFn: () => fetchApi('/metrics/overview') },
  '/ana/clientes-activos': { queryKey: ['ana', 'clientes-activos'], queryFn: () => fetchApi('/ana/clientes-activos') },
  '/ana/productos-activos': { queryKey: ['ana', 'productos-activos'], queryFn: () => fetchApi('/productos-activos') },
  '/ana/prospeccion': { queryKey: ['ana', 'prospeccion'], queryFn: () => fetchApi('/ana/prospeccion') },
  '/ana/cursos': { queryKey: ['ana', 'cursos'], queryFn: () => fetchApi('/ana/cursos') },
  '/promotores/clientes-nuevos': { queryKey: ['promotores-vistas', 'clientes-nuevos'], queryFn: () => fetchApi('/promotores-vistas/clientes-nuevos') },
  '/promotores/prospectos': { queryKey: ['promotores-vistas', 'prospectos'], queryFn: () => fetchApi('/promotores-vistas/prospectos') },
  '/promotores/productos': { queryKey: ['promotores-vistas', 'productos'], queryFn: () => fetchApi('/promotores-vistas/productos') },
  '/agenda': (() => {
    const today = new Date().toISOString().slice(0, 10)
    return { queryKey: ['agenda', today], queryFn: () => fetchApi(`/agenda?date=${today}`) }
  })(),
}

export default function Layout() {
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState({ 'ANA SOBERANES': true, PROMOTORES: true, AGENDA: true })

  useEffect(() => {
    if (!isProd) return
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    if (!base) return
    const ping = () => fetch(`${base}/health`, { method: 'GET' }).catch(() => {})
    const id = setInterval(ping, KEEP_ALIVE_MINUTES * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const toggle = (label) => {
    setAbierto((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const onPrefetch = (to) => {
    const config = prefetchConfig[to]
    if (config) queryClient.prefetchQuery({ queryKey: config.queryKey, queryFn: config.queryFn })
  }

  const navLinkProps = (to) => ({
    onMouseEnter: () => onPrefetch(to),
    onFocus: () => onPrefetch(to),
  })

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-slate-800 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-semibold text-lg">Aysa</h1>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {modulos.map((item) => {
            if (item.to) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  {...navLinkProps(item.to)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md mb-1 ${isActive ? 'bg-slate-600' : 'hover:bg-slate-700'}`
                  }
                >
                  {item.label}
                </NavLink>
              )
            }
            const isOpen = abierto[item.label]
            return (
              <div key={item.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(item.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-700 text-left"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-400 text-sm">{isOpen ? '▼' : '▶'}</span>
                </button>
                {isOpen && (
                  <div className="ml-3 mt-1 border-l border-slate-600 pl-2">
                    {item.sub.map((s) => (
                      <NavLink
                        key={s.to}
                        to={s.to}
                        {...navLinkProps(s.to)}
                        className={({ isActive }) =>
                          `block py-1.5 px-2 rounded text-sm mb-0.5 ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`
                        }
                      >
                        {s.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Chatbot />
    </div>
  )
}
