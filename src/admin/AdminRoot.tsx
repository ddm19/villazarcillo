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
import { checkIsAdmin, fetchConfig } from './api/adminApi'
import { ConfirmProvider } from './components/ConfirmDialog'
import './admin.scss'

function AdminApp() {
  const [assetsBaseUrl, setAssetsBaseUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
      .then((config) => setAssetsBaseUrl(config.assetsBaseUrl))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error al cargar la configuración'))
  }, [])

  const loadingPage = (
    <div className="admin-page">
      <p>Cargando configuración...</p>
    </div>
  )

  const element = useRoutes([
    { path: '', element: <Navigate to="scenes" replace /> },
    {
      element: <AdminLayout />,
      children: [
        { path: 'scenes', element: assetsBaseUrl !== null ? <ScenesPage assetsBaseUrl={assetsBaseUrl} /> : loadingPage },
        { path: 'map', element: assetsBaseUrl !== null ? <MapPage assetsBaseUrl={assetsBaseUrl} /> : loadingPage },
        { path: 'panels', element: assetsBaseUrl !== null ? <PanelsPage assetsBaseUrl={assetsBaseUrl} /> : loadingPage },
        { path: 'resources', element: assetsBaseUrl !== null ? <ResourcesPage assetsBaseUrl={assetsBaseUrl} /> : loadingPage },
        { path: 'assets', element: <AssetsPage /> },
        { path: 'config', element: <ConfigPage /> },
        { path: 'avanzado', element: <AdvancedPage /> },
      ],
    },
  ])

  if (error) {
    return (
      <div className="admin-denied">
        <div className="admin-denied__card">
          <p className="admin-denied__emoji" aria-hidden="true">⚠️</p>
          <p>No se pudo cargar la configuración: {error}</p>
        </div>
      </div>
    )
  }

  return <ConfirmProvider>{element}</ConfirmProvider>
}

export function AdminRoot() {
  const { session } = useUser()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    checkIsAdmin(session.user.id)
      .then((result) => {
        if (!cancelled) setIsAdmin(result)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  if (isAdmin === null) {
    return null
  }

  if (!isAdmin) {
    return <AdminDenied />
  }

  return <AdminApp />
}
