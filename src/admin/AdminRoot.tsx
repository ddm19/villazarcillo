import { useEffect, useState } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { AdminDenied } from './AdminDenied'
import { AdminLayout } from './AdminLayout'
import { ScenesPage } from './pages/ScenesPage'
import { MapPage } from './pages/MapPage'
import { PanelsPage } from './pages/PanelsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { AssetsPage } from './pages/AssetsPage'
import { ConfigPage } from './pages/ConfigPage'
import { AdvancedPage } from './pages/AdvancedPage'
import { fetchConfig } from './api/adminApi'
import './admin.scss'

function AdminApp() {
  const [assetsBaseUrl, setAssetsBaseUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig().then((config) => setAssetsBaseUrl(config.assetsBaseUrl))
  }, [])

  const element = useRoutes([
    { path: '', element: <Navigate to="scenes" replace /> },
    {
      element: <AdminLayout />,
      children: [
        { path: 'scenes', element: assetsBaseUrl !== null ? <ScenesPage assetsBaseUrl={assetsBaseUrl} /> : null },
        { path: 'map', element: assetsBaseUrl !== null ? <MapPage assetsBaseUrl={assetsBaseUrl} /> : null },
        { path: 'panels', element: assetsBaseUrl !== null ? <PanelsPage assetsBaseUrl={assetsBaseUrl} /> : null },
        { path: 'resources', element: assetsBaseUrl !== null ? <ResourcesPage assetsBaseUrl={assetsBaseUrl} /> : null },
        { path: 'assets', element: <AssetsPage /> },
        { path: 'config', element: <ConfigPage /> },
        { path: 'avanzado', element: <AdvancedPage /> },
      ],
    },
  ])

  return element
}

export function AdminRoot() {
  const { session } = useUser()
  const isAdmin = session?.user.app_metadata?.role === 'admin'

  if (!isAdmin) {
    return <AdminDenied />
  }

  return <AdminApp />
}
