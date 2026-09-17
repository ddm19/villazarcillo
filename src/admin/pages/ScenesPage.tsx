import { useEffect, useRef, useState } from 'react'
import type { Scene, SceneLayer } from '../../lib/types'
import { deleteScene, fetchScenes, saveScene } from '../api/adminApi'
import { AssetField } from '../components/AssetPicker'
import { JsonEscapeHatch } from '../components/JsonEscapeHatch'
import { resolveAsset } from '../../lib/assets'

const EMPTY_SCENE = (): Scene => ({
  id: '',
  name: '',
  background: '',
  size: { width: 1920, height: 1080 },
  initialView: { center: [960, 540], zoom: 0 },
  layers: [{ id: 'poi', name: 'Puntos', visible: true }],
})

export function ScenesPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Scene | null>(null)
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      setScenes(await fetchScenes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar escenas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSave = async () => {
    if (!editing) return
    setError(null)
    try {
      await saveScene(editing, scenes.findIndex((s) => s.id === editing.id) ?? scenes.length)
      setEditing(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta escena? Los elementos que la usen quedarán huérfanos.')) return
    await deleteScene(id)
    await refresh()
  }

  const updateLayer = (index: number, patch: Partial<SceneLayer>) => {
    if (!editing) return
    const layers = editing.layers.slice()
    layers[index] = { ...layers[index], ...patch }
    setEditing({ ...editing, layers })
  }

  const addLayer = () => {
    if (!editing) return
    setEditing({ ...editing, layers: [...editing.layers, { id: `layer_${editing.layers.length + 1}`, name: 'Nueva capa', visible: true }] })
  }

  const removeLayer = (index: number) => {
    if (!editing) return
    setEditing({ ...editing, layers: editing.layers.filter((_, i) => i !== index) })
  }

  const handlePickCenter = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!editing || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = editing.size.width / rect.width
    const scaleY = editing.size.height / rect.height
    const x = Math.round((event.clientX - rect.left) * scaleX)
    const y = Math.round((event.clientY - rect.top) * scaleY)
    setEditing({ ...editing, initialView: { ...editing.initialView, center: [x, y] } })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Escenas</h1>
        <button type="button" className="admin-button admin-button--primary" onClick={() => setEditing(EMPTY_SCENE())}>
          + Nueva escena
        </button>
      </div>

      {error && <p className="admin-form__error">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Id</th><th>Nombre</th><th>Tamaño</th><th>Capas</th><th /></tr>
          </thead>
          <tbody>
            {scenes.map((scene) => (
              <tr key={scene.id}>
                <td>{scene.id}</td>
                <td>{scene.name}</td>
                <td>{scene.size.width}×{scene.size.height}</td>
                <td>{scene.layers.map((l) => l.name).join(', ')}</td>
                <td>
                  <button type="button" className="admin-button" onClick={() => setEditing(scene)}>Editar</button>
                  <button type="button" className="admin-button admin-button--danger" onClick={() => handleDelete(scene.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="admin-drawer">
          <div className="admin-drawer__header">
            <h2>Escena: {editing.id || '(nueva)'}</h2>
            <JsonEscapeHatch value={editing} onApply={setEditing} />
          </div>
          <div className="admin-form">
            <label className="admin-field">
              <span>Id</span>
              <input value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Nombre</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>

            <AssetField
              label="Fondo (imagen)"
              assetsBaseUrl={assetsBaseUrl}
              folderHint="maps"
              value={editing.background}
              onChange={(background) => setEditing({ ...editing, background: background ?? '' })}
            />
            <AssetField
              label="Fondo (vídeo, opcional)"
              assetsBaseUrl={assetsBaseUrl}
              folderHint="maps"
              value={editing.backgroundVideo}
              onChange={(backgroundVideo) => setEditing({ ...editing, backgroundVideo })}
            />

            <div className="admin-field-row">
              <label className="admin-field">
                <span>Ancho (px)</span>
                <input type="number" value={editing.size.width} onChange={(e) => setEditing({ ...editing, size: { ...editing.size, width: Number(e.target.value) } })} />
              </label>
              <label className="admin-field">
                <span>Alto (px)</span>
                <input type="number" value={editing.size.height} onChange={(e) => setEditing({ ...editing, size: { ...editing.size, height: Number(e.target.value) } })} />
              </label>
            </div>

            {editing.background && (
              <div className="admin-field">
                <span>Haz clic en la imagen para fijar el centro inicial de la vista</span>
                <div className="admin-scene-preview">
                  <img
                    ref={imgRef}
                    src={resolveAsset(assetsBaseUrl, editing.background)}
                    alt=""
                    onClick={handlePickCenter}
                  />
                  <div
                    className="admin-scene-preview__marker"
                    style={{
                      left: `${(editing.initialView.center[0] / editing.size.width) * 100}%`,
                      top: `${(editing.initialView.center[1] / editing.size.height) * 100}%`,
                    }}
                  />
                </div>
                <span className="admin-field__hint">Centro actual: {editing.initialView.center[0]}, {editing.initialView.center[1]}</span>
              </div>
            )}

            <div className="admin-field-row">
              <label className="admin-field">
                <span>Zoom inicial</span>
                <input type="number" value={editing.initialView.zoom} onChange={(e) => setEditing({ ...editing, initialView: { ...editing.initialView, zoom: Number(e.target.value) } })} />
              </label>
              <label className="admin-field">
                <span>Zoom mínimo</span>
                <input type="number" value={editing.minZoom ?? ''} onChange={(e) => setEditing({ ...editing, minZoom: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </label>
              <label className="admin-field">
                <span>Zoom máximo</span>
                <input type="number" value={editing.maxZoom ?? ''} onChange={(e) => setEditing({ ...editing, maxZoom: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </label>
            </div>

            <div className="admin-field">
              <span>Capas</span>
              {editing.layers.map((layer, index) => (
                <div key={index} className="admin-layer-row">
                  <input value={layer.id} onChange={(e) => updateLayer(index, { id: e.target.value })} placeholder="id" />
                  <input value={layer.name} onChange={(e) => updateLayer(index, { name: e.target.value })} placeholder="nombre" />
                  <label className="admin-inline-checkbox">
                    <input type="checkbox" checked={layer.visible} onChange={(e) => updateLayer(index, { visible: e.target.checked })} />
                    Visible por defecto
                  </label>
                  <button type="button" className="admin-icon-button" onClick={() => removeLayer(index)}>✕</button>
                </div>
              ))}
              <button type="button" className="admin-button" onClick={addLayer}>+ Capa</button>
            </div>

            <div className="admin-drawer__actions">
              <button type="button" className="admin-button admin-button--primary" onClick={handleSave}>Guardar</button>
              <button type="button" className="admin-button" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
