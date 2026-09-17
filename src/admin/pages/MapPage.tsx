import { useEffect, useMemo, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, useMapEvents } from 'react-leaflet'
import L, { CRS } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HubElement, Panel, PinIcon, Scene, SpriteIcon } from '../../lib/types'
import { deleteElement, fetchElements, fetchPanels, fetchQuestNames, fetchScenes, saveElement, savePanel } from '../api/adminApi'
import { resolveAsset } from '../../lib/assets'
import { AssetField } from '../components/AssetPicker'
import { ColorSwatchPicker } from '../components/ColorSwatchPicker'
import { RotationDial } from '../components/RotationDial'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { JsonEscapeHatch } from '../components/JsonEscapeHatch'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'

const ELEMENT_TYPES: HubElement['type'][] = ['npc', 'shop', 'quest', 'image', 'note', 'generic']

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function markerIcon(element: HubElement, assetsBaseUrl: string) {
  if (element.sprite) {
    return L.divIcon({
      className: 'admin-map-icon',
      html: `<div class="admin-map-icon__sprite" style="width:${element.sprite.width}px;height:${element.sprite.height}px;transform:rotate(${element.sprite.rotation ?? 0}deg)"><img src="${resolveAsset(assetsBaseUrl, element.sprite.src)}" /></div>`,
      iconSize: [element.sprite.width, element.sprite.height],
      iconAnchor: [element.sprite.width / 2, element.sprite.height / 2],
    })
  }
  const color = element.icon?.kind === 'pin' && element.icon.colorVar ? `var(${element.icon.colorVar})` : 'var(--pin-generic)'
  return L.divIcon({
    className: 'admin-map-icon',
    html: `<div class="admin-map-icon__pin" style="--pin-color:${color}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

type ClickCatcherProps = { active: boolean; onPick: (x: number, y: number) => void }

function ClickCatcher({ active, onPick }: ClickCatcherProps) {
  useMapEvents({
    click(e) {
      if (active) onPick(Math.round(e.latlng.lng), Math.round(e.latlng.lat))
    },
  })
  return null
}

function emptyElement(sceneId: string, layerId: string, position: [number, number]): HubElement {
  return {
    id: '',
    sceneId,
    layerId,
    type: 'generic',
    name: '',
    position,
    icon: { kind: 'pin' },
  }
}

export function MapPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [sceneId, setSceneId] = useState<string>('')
  const [elements, setElements] = useState<HubElement[]>([])
  const [panels, setPanels] = useState<Panel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [addMode, setAddMode] = useState(false)
  const [editing, setEditing] = useState<HubElement | null>(null)
  const [panelMode, setPanelMode] = useState<'none' | 'existing' | 'new'>('none')
  const [newPanelDraft, setNewPanelDraft] = useState<PanelFormValue | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = async () => {
    const [sceneList, questList] = await Promise.all([fetchScenes(), fetchQuestNames()])
    setScenes(sceneList)
    setQuestNames(questList)
    if (!sceneId && sceneList.length > 0) setSceneId(sceneList[0].id)
  }

  useEffect(() => {
    refreshAll()
  }, [])

  const refreshSceneData = async () => {
    if (!sceneId) return
    const [els, pnls] = await Promise.all([fetchElements(sceneId), fetchPanels()])
    setElements(els)
    setPanels(pnls)
  }

  useEffect(() => {
    refreshSceneData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId])

  const scene = useMemo(() => scenes.find((s) => s.id === sceneId), [scenes, sceneId])

  const handlePick = (x: number, y: number) => {
    if (!scene) return
    setAddMode(false)
    setEditing(emptyElement(scene.id, scene.layers[0]?.id ?? '', [x, y]))
    setPanelMode('none')
    setNewPanelDraft(null)
  }

  const handleDragEnd = async (element: HubElement, latlng: L.LatLng) => {
    const updated = { ...element, position: [Math.round(latlng.lng), Math.round(latlng.lat)] as [number, number] }
    await saveElement(updated)
    await refreshSceneData()
  }

  const startEdit = (element: HubElement) => {
    setEditing(element)
    setPanelMode(element.panelId ? 'existing' : 'none')
    setNewPanelDraft(null)
  }

  const startCreatePanel = () => {
    if (!editing) return
    const suggestedId = editing.id ? `panel:${editing.id.split(':').pop()}` : `panel:${slug(editing.name || 'nuevo')}`
    setNewPanelDraft({ id: suggestedId, type: 'markdown', title: editing.name, content: [] })
    setPanelMode('new')
  }

  const handleSaveElement = async () => {
    if (!editing) return
    setError(null)
    if (!editing.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    let finalId = editing.id
    if (!finalId) {
      finalId = `${editing.type}:${slug(editing.name)}`
    }
    let panelId = editing.panelId
    try {
      if (panelMode === 'new' && newPanelDraft) {
        await savePanel(newPanelDraft)
        panelId = newPanelDraft.id
      }
      if (panelMode === 'none') {
        panelId = undefined
      }
      await saveElement({ ...editing, id: finalId, panelId }, elements.length)
      setEditing(null)
      setNewPanelDraft(null)
      await refreshSceneData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el elemento')
    }
  }

  const handleDeleteElement = async () => {
    if (!editing?.id) return
    if (!confirm('¿Eliminar este elemento del mapa?')) return
    await deleteElement(editing.id)
    setEditing(null)
    await refreshSceneData()
  }

  if (!scene) {
    return <div className="admin-page"><h1>Mapa / Elementos</h1><p>Cargando escenas...</p></div>
  }

  return (
    <div className="admin-page admin-page--map">
      <div className="admin-page__header">
        <h1>Mapa / Elementos</h1>
        <select value={sceneId} onChange={(e) => { setSceneId(e.target.value); setEditing(null) }}>
          {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          type="button"
          className={`admin-button${addMode ? ' admin-button--primary' : ''}`}
          onClick={() => setAddMode((v) => !v)}
        >
          {addMode ? 'Haz clic en el mapa...' : '+ Añadir elemento'}
        </button>
      </div>

      <div className="admin-map-layout">
        <div className={`admin-map-canvas${addMode ? ' admin-map-canvas--crosshair' : ''}`}>
          <MapContainer
            key={scene.id}
            center={[scene.initialView.center[1], scene.initialView.center[0]]}
            zoom={scene.initialView.zoom}
            minZoom={scene.minZoom}
            maxZoom={scene.maxZoom}
            crs={CRS.Simple}
            className="camp-hub__map"
            maxBounds={[[0, 0], [scene.size.height, scene.size.width]]}
          >
            <ImageOverlay
              url={resolveAsset(assetsBaseUrl, scene.background)}
              bounds={[[0, 0], [scene.size.height, scene.size.width]]}
            />
            <ClickCatcher active={addMode} onPick={handlePick} />
            {elements.map((element) => (
              <Marker
                key={element.id}
                position={[element.position[1], element.position[0]]}
                icon={markerIcon(element, assetsBaseUrl)}
                draggable
                eventHandlers={{
                  click: () => startEdit(element),
                  dragend: (e) => handleDragEnd(element, e.target.getLatLng()),
                }}
              />
            ))}
          </MapContainer>
        </div>

        {editing && (
          <div className="admin-drawer admin-drawer--map">
            <div className="admin-drawer__header">
              <h2>{editing.id || 'Nuevo elemento'}</h2>
              <JsonEscapeHatch value={editing} onApply={setEditing} />
            </div>
            <div className="admin-form">
              <label className="admin-field">
                <span>Nombre</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="admin-field">
                <span>Id {editing.id ? '' : '(se genera automáticamente si se deja vacío)'}</span>
                <input value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} placeholder={`${editing.type}:${slug(editing.name || 'id')}`} />
              </label>
              <label className="admin-field">
                <span>Tipo</span>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as HubElement['type'] })}>
                  {ELEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>Capa</span>
                <select value={editing.layerId} onChange={(e) => setEditing({ ...editing, layerId: e.target.value })}>
                  {scene.layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>

              <div className="admin-field">
                <span>Icono</span>
                <div className="admin-icon-choice">
                  <label className="admin-inline-checkbox">
                    <input
                      type="radio"
                      checked={!editing.sprite}
                      onChange={() => setEditing({ ...editing, sprite: undefined, icon: { kind: 'pin' } })}
                    />
                    Pin de color
                  </label>
                  <label className="admin-inline-checkbox">
                    <input
                      type="radio"
                      checked={Boolean(editing.sprite)}
                      onChange={() => setEditing({ ...editing, icon: undefined, sprite: { src: '', width: 64, height: 64, rotation: 0 } })}
                    />
                    Imagen (sprite)
                  </label>
                </div>
                {!editing.sprite ? (
                  <ColorSwatchPicker
                    value={(editing.icon as PinIcon | undefined)?.colorVar}
                    onChange={(colorVar) => setEditing({ ...editing, icon: { kind: 'pin', colorVar } })}
                  />
                ) : (
                  <div className="admin-sprite-fields">
                    <AssetField
                      label="Sprite"
                      assetsBaseUrl={assetsBaseUrl}
                      folderHint="pins"
                      value={editing.sprite?.src}
                      onChange={(src) => setEditing({ ...editing, sprite: { ...(editing.sprite as SpriteIcon), src: src ?? '' } })}
                    />
                    <div className="admin-field-row">
                      <label className="admin-field">
                        <span>Ancho</span>
                        <input type="number" value={editing.sprite?.width ?? 64} onChange={(e) => setEditing({ ...editing, sprite: { ...(editing.sprite as SpriteIcon), width: Number(e.target.value) } })} />
                      </label>
                      <label className="admin-field">
                        <span>Alto</span>
                        <input type="number" value={editing.sprite?.height ?? 64} onChange={(e) => setEditing({ ...editing, sprite: { ...(editing.sprite as SpriteIcon), height: Number(e.target.value) } })} />
                      </label>
                    </div>
                    <RotationDial
                      value={editing.sprite?.rotation ?? 0}
                      onChange={(rotation) => setEditing({ ...editing, sprite: { ...(editing.sprite as SpriteIcon), rotation } })}
                    />
                  </div>
                )}
              </div>

              <ToggleSwitch label="Misión completada" checked={Boolean(editing.completed)} onChange={(completed) => setEditing({ ...editing, completed })} />
              <ToggleSwitch label="Peligrosa" checked={Boolean(editing.isDangerous)} onChange={(isDangerous) => setEditing({ ...editing, isDangerous })} />

              <div className="admin-field">
                <span>Panel asociado</span>
                <div className="admin-icon-choice">
                  <label className="admin-inline-checkbox">
                    <input type="radio" checked={panelMode === 'none'} onChange={() => setPanelMode('none')} />
                    Sin panel (navegación directa)
                  </label>
                  <label className="admin-inline-checkbox">
                    <input type="radio" checked={panelMode === 'existing'} onChange={() => setPanelMode('existing')} />
                    Panel existente
                  </label>
                  <label className="admin-inline-checkbox">
                    <input type="radio" checked={panelMode === 'new'} onChange={startCreatePanel} />
                    Crear panel nuevo
                  </label>
                </div>
                {panelMode === 'existing' && (
                  <select value={editing.panelId ?? ''} onChange={(e) => setEditing({ ...editing, panelId: e.target.value || undefined })}>
                    <option value="">-- elegir --</option>
                    {panels.map((p) => <option key={p.id} value={p.id}>{p.id} ({p.title ?? p.type})</option>)}
                  </select>
                )}
              </div>

              {panelMode === 'none' && (
                <div className="admin-field">
                  <span>Navegación (portal a otra escena)</span>
                  <select
                    value={editing.navigation?.sceneId ?? ''}
                    onChange={(e) => setEditing({ ...editing, navigation: e.target.value ? { sceneId: e.target.value } : undefined })}
                  >
                    <option value="">-- sin navegación --</option>
                    {scenes.filter((s) => s.id !== scene.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <label className="admin-field">
                <span>Etiqueta (badge, opcional)</span>
                <input value={editing.badge?.label ?? ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value ? { label: e.target.value } : undefined })} />
              </label>

              {error && <p className="admin-form__error">{error}</p>}

              <div className="admin-drawer__actions">
                <button type="button" className="admin-button admin-button--primary" onClick={handleSaveElement}>Guardar</button>
                <button type="button" className="admin-button" onClick={() => { setEditing(null); setNewPanelDraft(null) }}>Cancelar</button>
                {editing.id && (
                  <button type="button" className="admin-button admin-button--danger" onClick={handleDeleteElement}>Eliminar</button>
                )}
              </div>
            </div>

            {panelMode === 'new' && newPanelDraft && (
              <PanelEditor
                variant="panel"
                value={newPanelDraft}
                assetsBaseUrl={assetsBaseUrl}
                questNames={questNames}
                onSave={async (value) => {
                  setNewPanelDraft(value)
                }}
                onCancel={() => setPanelMode('none')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
