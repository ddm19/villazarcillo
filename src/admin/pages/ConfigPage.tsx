import { useEffect, useState } from 'react'
import type { HubConfig, Scene } from '../../lib/types'
import { fetchConfig, fetchScenes, saveConfig } from '../api/adminApi'

export function ConfigPage() {
  const [config, setConfig] = useState<HubConfig | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchConfig(), fetchScenes()]).then(([c, s]) => {
      setConfig(c)
      setScenes(s)
    })
  }, [])

  if (!config) return <div className="admin-page"><h1>Config</h1><p>Cargando...</p></div>

  const handleSave = async () => {
    setError(null)
    setSaved(false)
    try {
      await saveConfig(config)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <div className="admin-page">
      <h1>Configuración del hub</h1>
      <div className="admin-form">
        <label className="admin-field">
          <span>Título</span>
          <input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Escena por defecto</span>
          <select value={config.defaultScene} onChange={(e) => setConfig({ ...config, defaultScene: e.target.value })}>
            {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="admin-inline-checkbox">
          <input
            type="checkbox"
            checked={Boolean(config.featureFlags?.miniMap)}
            onChange={(e) => setConfig({ ...config, featureFlags: { ...config.featureFlags, miniMap: e.target.checked } })}
          />
          Minimapa activado
        </label>
        <details className="admin-advanced-field">
          <summary>Avanzado: URL base de assets</summary>
          <label className="admin-field">
            <span>Assets base URL</span>
            <input value={config.assetsBaseUrl} onChange={(e) => setConfig({ ...config, assetsBaseUrl: e.target.value })} />
          </label>
        </details>

        {error && <p className="admin-form__error">{error}</p>}
        {saved && <p className="admin-form__success">Guardado.</p>}

        <button type="button" className="admin-button admin-button--primary" onClick={handleSave}>Guardar</button>
      </div>
    </div>
  )
}
