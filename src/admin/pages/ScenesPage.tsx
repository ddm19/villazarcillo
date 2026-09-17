import { useEffect, useRef, useState } from 'react'
import type { Scene, SceneLayer } from '../../lib/types'
import { deleteScene, fetchScenes, saveScene } from '../api/adminApi'
import { AssetField } from '../components/AssetPicker'
import { JsonEscapeHatch } from '../components/JsonEscapeHatch'
import { DataTable } from '../components/DataTable'
import { useConfirm } from '../components/useConfirm'
import { resolveAsset } from '../../lib/assets'
import { useFocusTrap } from '../../lib/useFocusTrap'

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
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const confirmDialog = useConfirm()
  useFocusTrap(Boolean(editing), drawerRef)

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
    const ok = await confirmDialog({
      title: 'Eliminar escena',
      message: `¿Eliminar "${id}"? Los elementos que la usen quedarán huérfanos.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
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
        <DataTable
          rows={scenes}
          getRowKey={(scene) => scene.id}
          onRowClick={setEditing}
          emptyMessage="No hay escenas todavía."
          columns={[
            { key: 'id', header: 'Id', render: (scene) => scene.id },
            { key: 'name', header: 'Nombre', render: (scene) => scene.name },
            { key: 'size', header: 'Tamaño', render: (scene) => `${scene.size.width}×${scene.size.height}` },
            { key: 'layers', header: 'Capas', render: (scene) => scene.layers.map((l) => l.name).join(', ') },
            {
              key: 'actions',
              header: '',
              isActions: true,
              render: (scene) => (
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  onClick={() => handleDelete(scene.id)}
                >
                  Eliminar
                </button>
              ),
            },
          ]}
        />
      )}

      {editing && (
        <div className="admin-drawer" ref={drawerRef}>
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
