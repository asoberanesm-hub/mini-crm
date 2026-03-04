import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import Chatbot from './Chatbot'

const modulos = [
  { to: '/', label: 'Dashboard' },
  {
    label: 'ANA SOBERANES',
    sub: [
      { to: '/ana/clientes-activos', label: 'Clientes Activos' },
      { to: '/ana/prospeccion', label: 'Prospección' },
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

export default function Layout() {
  const [abierto, setAbierto] = useState({ 'ANA SOBERANES': true, PROMOTORES: true, AGENDA: true })

  const toggle = (label) => {
    setAbierto((prev) => ({ ...prev, [label]: !prev[label] }))
  }

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
