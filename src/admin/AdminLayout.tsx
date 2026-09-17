import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
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
  const { session, setSession } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    rememberAdminPath(location.pathname + location.search)
  }, [location.pathname, location.search])

  const handleLogout = async () => {
    forgetAdminPath()
    await supabase.auth.signOut()
    setSession(null)
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
          <button type="button" className="admin-layout__logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
