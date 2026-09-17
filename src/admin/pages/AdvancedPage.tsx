import { useRef, useState } from 'react'
import type { DataBundle } from '../../lib/types'
import {
  fetchConfig,
  fetchElements,
  fetchPanels,
  fetchResources,
  fetchScenes,
  saveConfig,
  saveElement,
  savePanel,
  saveResource,
  saveScene,
} from '../api/adminApi'

export function AdvancedPage() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async () => {
    setBusy(true)
    setError(null)
    try {
      const [config, scenes, elements, panels, resources] = await Promise.all([
        fetchConfig(),
        fetchScenes(),
        fetchElements(),
        fetchPanels(),
        fetchResources(),
      ])
      const bundle: DataBundle = { config, scenes, elements, panels, resources }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `villazarcillo-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Backup descargado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (file: File) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const bundle = JSON.parse(await file.text()) as DataBundle
      if (!bundle.config || !Array.isArray(bundle.scenes)) {
        throw new Error('El archivo no tiene el formato esperado.')
      }

      await saveConfig(bundle.config)
      await Promise.all(bundle.scenes.map((scene, index) => saveScene(scene, index)))
      await Promise.all(bundle.panels.map((panel) => savePanel(panel)))
      await Promise.all(bundle.resources.map((resource) => saveResource(resource)))
      await Promise.all(bundle.elements.map((element, index) => saveElement(element, index)))

      setMessage(`Importado: ${bundle.scenes.length} escenas, ${bundle.elements.length} elementos, ${bundle.panels.length} paneles, ${bundle.resources.length} recursos.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="admin-page">
      <h1>Avanzado</h1>

      <section className="admin-advanced-section">
        <h2>Exportar todo</h2>
        <p>Descarga un único JSON con toda la configuración, escenas, elementos, paneles y recursos actuales. Úsalo como copia de seguridad manual.</p>
        <button type="button" className="admin-button admin-button--primary" onClick={handleExport} disabled={busy}>
          Descargar backup
        </button>
      </section>

      <section className="admin-advanced-section">
        <h2>Importar / restaurar</h2>
        <p>Sube un JSON exportado desde aquí para restaurar (o migrar) todo el contenido. Sobrescribe los registros con el mismo id.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
          }}
        />
      </section>

      {error && <p className="admin-form__error">{error}</p>}
      {message && <p className="admin-form__success">{message}</p>}
    </div>
  )
}
