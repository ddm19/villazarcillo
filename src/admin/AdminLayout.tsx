import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { forgetAdminPath, rememberAdminPath } from './adminRouteMemory'

const NAV_ITEMS = [
  { to: '/admin/scenes', label: 'Escenas' },
  { to: '/admin/map', label: 'Mapa / Elementos' },
  { to: '/admin/panels', label: 'Paneles' },
  { to: '/admin/resources', label: 'Recursos' },
  { to: '/admin/assets', label: 'Assets' },
  { to: '/admin/config', label: 'Config' },
  { to: '/admin/avanzado', label: 'Avanzado' },
]

export function AdminLayout() {
  const { session } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    rememberAdminPath(location.pathname + location.search)
  }, [location.pathname, location.search])

  // Not a "logout": this microfrontend never logs itself in (the session always comes
  // from the parent site via postMessage), so signing out here had no real counterpart —
  // it just left the session broken until the next reload. This is the actual exit: leave
  // the remembered /admin path so the auto-restore effect in App.tsx doesn't immediately
  // bounce you back here.
  const handleBackToCamp = () => {
    forgetAdminPath()
    navigate('/')
  }

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">Villazarcillo · Admin</div>
        <nav className="admin-layout__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-layout__nav-item${isActive ? ' admin-layout__nav-item--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-layout__footer">
          <span className="admin-layout__user">{session?.user.email}</span>
          <button type="button" className="admin-layout__logout" onClick={handleBackToCamp}>
            ← Volver al campamento
          </button>
        </div>
      </aside>
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
