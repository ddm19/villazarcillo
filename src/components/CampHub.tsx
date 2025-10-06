import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Tooltip, useMap } from 'react-leaflet'
import L, { CRS, type LeafletKeyboardEvent } from 'leaflet'
import classNames from 'classnames'
import ReactMarkdown from 'react-markdown'
import type { HubConfig, HubElement, Panel, Scene, TableCell } from '../lib/types'
import { markdownContentToString } from '../lib/markdown'
import { useFocusTrap } from '../lib/useFocusTrap'
import 'leaflet/dist/leaflet.css'

type CampHubProps = {
  config: HubConfig
  scenes: Scene[]
  elements: HubElement[]
  panels: Panel[]
  sceneId: string
  activeLayers: Set<string>
  focusElementId?: string
  onSceneChange: (sceneId: string) => void
  onLayerChange: (layers: Set<string>) => void
  onFocusChange: (elementId?: string) => void
}

type ActivePanel = {
  element: HubElement
  panel: Panel | undefined
}

const pinIcon = (colorVar?: string, disabled?: boolean) =>
  L.divIcon({
    className: 'camp-hub__pin-icon',
    html: `<div class="camp-hub__pin${disabled ? ' camp-hub__pin--disabled' : ''}" style="--pin-color: ${colorVar ?? 'var(--pin-generic)'}"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

const spriteIcon = (src: string, width: number, height: number, rotation?: number, disabled?: boolean) =>
  L.divIcon({
    className: 'camp-hub__sprite-icon',
    html: `<div class="camp-hub__sprite${disabled ? ' camp-hub__sprite--disabled' : ''}" style="width:${width}px;height:${height}px;--sprite-rotation:${rotation ?? 0}deg;"><img src="${src}" alt="" /></div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  })

type SceneCanvasProps = {
  scene: Scene
  elements: HubElement[]
  panelsMap: Map<string, Panel>
  activeLayers: Set<string>
  focusElementId?: string
  onElementFocus: (element: HubElement) => void
}

function SceneCanvas({
  scene,
  elements,
  panelsMap,
  activeLayers,
  focusElementId,
  onElementFocus,
}: SceneCanvasProps) {
  const filtered = useMemo(() => {
    return elements.filter((element) => activeLayers.has(element.layerId))
  }, [elements, activeLayers])

  return (
    <MapContainer
      center={[scene.initialView.center[1], scene.initialView.center[0]]}
      zoom={scene.initialView.zoom}
      minZoom={scene.minZoom}
      maxZoom={scene.maxZoom}
      crs={CRS.Simple}
      className="camp-hub__map"
      maxBounds={[
        [0, 0],
        [scene.size.height, scene.size.width],
      ]}
      maxBoundsViscosity={1}
    >
      <ImageOverlay
        url={scene.background}
        bounds={[
          [0, 0],
          [scene.size.height, scene.size.width],
        ]}
      />
      <SizeInvalidator width={scene.size.width} height={scene.size.height} />
      <FocusController focusElementId={focusElementId} elements={filtered} />
      {filtered.map((element) => {
        const panel = element.panelId ? panelsMap.get(element.panelId) : undefined
        const isClickable = Boolean(panel)
        const isPin = element.icon?.kind === 'pin'
        const icon = isPin
          ? pinIcon(element.icon?.colorVar ? `var(${element.icon.colorVar})` : undefined, !isClickable)
          : element.sprite
            ? spriteIcon(
                element.sprite.src,
                element.sprite.width,
                element.sprite.height,
                element.sprite.rotation,
                !isClickable,
              )
            : pinIcon(undefined, !isClickable)
        const tooltip = element.name

        return (
          <Marker
            key={element.id}
            position={[element.position[1], element.position[0]]}
            icon={icon}
            eventHandlers={
              isClickable
                ? {
                    click: () => {
                      onElementFocus(element)
                    },
                    keydown: (event: LeafletKeyboardEvent) => {
                      if (event.originalEvent.key === 'Enter') {
                        onElementFocus(element)
                      }
                    },
                  }
                : undefined
            }
            keyboard={isClickable}
            opacity={isClickable ? 1 : 0.6}
            title={tooltip}
            aria-label={tooltip}
          >
            <Tooltip direction="top" offset={[0, -18]} className="camp-hub__tooltip">
              {tooltip}
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

type FocusControllerProps = {
  focusElementId?: string
  elements: HubElement[]
}

function FocusController({ focusElementId, elements }: FocusControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!focusElementId) {
      return
    }
    const target = elements.find((element) => element.id === focusElementId)
    if (target) {
      const point: L.LatLngExpression = [target.position[1], target.position[0]]
      map.flyTo(point, Math.max(map.getZoom(), 0))
    }
  }, [focusElementId, elements, map])

  return null
}

type SizeInvalidatorProps = {
  width: number
  height: number
}

function SizeInvalidator({ width, height }: SizeInvalidatorProps) {
  const map = useMap()

  useEffect(() => {
    map.whenReady(() => {
      map.invalidateSize()
    })
  }, [map, width, height])

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [map])

  return null
}

export function CampHub({
  config,
  scenes,
  elements,
  panels,
  sceneId,
  activeLayers,
  focusElementId,
  onSceneChange,
  onLayerChange,
  onFocusChange,
}: CampHubProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const missingPanelsLogged = useRef(new Set<string>())
  const missingScenesLogged = useRef(new Set<string>())
  useFocusTrap(Boolean(activePanel), drawerRef)

  const scenesMap = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes])
  const panelsMap = useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels])

  const validElements = useMemo(() => {
    return elements.filter((element) => {
      const hasScene = scenesMap.has(element.sceneId)
      if (!hasScene && !missingScenesLogged.current.has(element.id)) {
        console.warn(`Elemento "${element.id}" ignorado: escena "${element.sceneId}" no existe`)
        missingScenesLogged.current.add(element.id)
      }
      return hasScene
    })
  }, [elements, scenesMap])

  const activeScene = scenesMap.get(sceneId) ?? scenes[0]
  const resolvedScene = activeScene
    ? {
        ...activeScene,
        background: resolveAsset(config.assetsBaseUrl, activeScene.background),
      }
    : undefined

  const sceneElements = useMemo(
    () => validElements.filter((element) => element.sceneId === activeScene?.id),
    [validElements, activeScene?.id],
  )

  const resolvedSceneElements = useMemo(() => {
    return sceneElements.map((element) => {
      if (element.panelId && !panelsMap.has(element.panelId) && !missingPanelsLogged.current.has(element.panelId)) {
        console.warn(`Panel "${element.panelId}" no existe para el elemento "${element.id}"`)
        missingPanelsLogged.current.add(element.panelId)
      }
      return {
        ...element,
        sprite: element.sprite
          ? {
              ...element.sprite,
              src: resolveAsset(config.assetsBaseUrl, element.sprite.src),
            }
          : undefined,
      }
    })
  }, [sceneElements, config.assetsBaseUrl, panelsMap])

  const focusElement = useMemo(() => {
    return focusElementId ? resolvedSceneElements.find((element) => element.id === focusElementId) : undefined
  }, [focusElementId, resolvedSceneElements])

  useEffect(() => {
    if (!focusElement) {
      setActivePanel(null)
      return
    }
    const panel = focusElement.panelId ? panelsMap.get(focusElement.panelId) : undefined
    setActivePanel({ element: focusElement, panel })
  }, [focusElement, panelsMap])

  const toggleLayer = (layerId: string) => {
    const next = new Set(activeLayers)
    if (next.has(layerId)) {
      next.delete(layerId)
    } else {
      next.add(layerId)
    }
    onLayerChange(next)
  }

  const handleElementFocus = (element: HubElement) => {
    const panel = element.panelId ? panelsMap.get(element.panelId) : undefined
    setActivePanel({ element, panel })
    onFocusChange(element.id)
  }

  const closeDrawer = () => {
    setActivePanel(null)
    onFocusChange(undefined)
  }

  if (!activeScene) {
    return <div className="camp-hub__empty-state">No hay escenas disponibles.</div>
  }

  return (
    <div className="camp-hub">
      <header className="camp-hub__toolbar">
        <h1 className="camp-hub__title">{config.title}</h1>
        <nav className="camp-hub__scenes" aria-label="Escenas">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={classNames('camp-hub__scene-chip', {
                'camp-hub__scene-chip--active': scene.id === activeScene.id,
              })}
              onClick={() => {
                setActivePanel(null)
                onFocusChange(undefined)
                onSceneChange(scene.id)
              }}
            >
              {scene.name}
            </button>
          ))}
        </nav>
        <nav className="camp-hub__layers" aria-label="Capas">
          {activeScene.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={classNames('camp-hub__layer-chip', {
                'camp-hub__layer-chip--active': activeLayers.has(layer.id),
              })}
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.name}
            </button>
          ))}
        </nav>
      </header>
      <main className="camp-hub__canvas">
        {resolvedScene && (
          <SceneCanvas
            key={resolvedScene.id}
            scene={resolvedScene}
            elements={resolvedSceneElements}
            panelsMap={panelsMap}
            activeLayers={activeLayers}
            focusElementId={focusElementId}
            onElementFocus={handleElementFocus}
          />
        )}
      </main>
      <aside
        className={classNames('camp-hub__drawer', { 'camp-hub__drawer--open': Boolean(activePanel) })}
        aria-hidden={!activePanel}
        ref={drawerRef}
      >
        {activePanel && (
          <>
            <div className="camp-hub__drawer-header">
              <h2 className="camp-hub__drawer-title">{activePanel.element.name}</h2>
              {activePanel.element.badge && (
                <span className="camp-hub__badge" aria-label={activePanel.element.badge.label}>
                  {activePanel.element.badge.label}
                </span>
              )}
              <button type="button" className="camp-hub__drawer-close" onClick={closeDrawer}>
                Cerrar
              </button>
            </div>
            <PanelContent config={config} panel={activePanel.panel} />
          </>
        )}
      </aside>
    </div>
  )
}

type PanelContentProps = {
  config: HubConfig
  panel?: Panel
}

function PanelContent({ config, panel }: PanelContentProps) {
  if (!panel) {
    return (
      <div className="camp-hub__panel-content">
        <p className="camp-hub__panel-text">No hay información disponible para este elemento.</p>
      </div>
    )
  }

  if (panel.type === 'markdown') {
    const portraitUrl = panel.portrait ? resolveAsset(config.assetsBaseUrl, panel.portrait) : undefined
    const markdown = markdownContentToString(panel.content)
    return (
      <div className="camp-hub__panel-content">
        {portraitUrl && (
          <div className="camp-hub__panel-portrait">
            <img src={portraitUrl} alt="" />
          </div>
        )}
        <div className="camp-hub__panel-text camp-hub__markdown">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    )
  }

  if (panel.type === 'table') {
    return (
      <div className="camp-hub__panel-content">
        <header>
          <h3>{panel.title}</h3>
          {panel.subtitle && (
            <div className="camp-hub__markdown">
              <ReactMarkdown>{panel.subtitle}</ReactMarkdown>
            </div>
          )}
        </header>
        <table className="camp-hub__table">
          <thead>
            <tr>
              {panel.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {panel.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (panel.type === 'image') {
    const imageUrl = resolveAsset(config.assetsBaseUrl, panel.image)
    return (
      <div className="camp-hub__panel-content">
        <header>
          <h3>{panel.title}</h3>
        </header>
        <div className="camp-hub__panel-image">
          <img src={imageUrl} alt="" />
        </div>
        {panel.cta && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    )
  }

  return null
}

function renderCell(cell: TableCell) {
  if (typeof cell === 'string') {
    return cell
  }

  if ('markdown' in cell) {
    const content = markdownContentToString(cell.markdown)
    return (
      <div className="camp-hub__markdown">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }

  if (cell.href) {
    return (
      <a href={cell.href} target="_blank" rel="noreferrer">
        {cell.text}
      </a>
    )
  }

  return cell.text
}

function resolveAsset(base: string, assetPath?: string) {
  if (!assetPath) {
    return ''
  }
  if (/^(?:[a-z]+:)?\/\//i.test(assetPath)) {
    return assetPath
  }
  if (assetPath.startsWith('/')) {
    return assetPath
  }
  const normalizedBase = normalizeBase(base)
  return `${normalizedBase}${assetPath}`
}

function normalizeBase(base: string) {
  if (/^(?:[a-z]+:)?\/\//i.test(base)) {
    return base.endsWith('/') ? base : `${base}/`
  }
  if (base.startsWith('/')) {
    return base.endsWith('/') ? base : `${base}/`
  }
  const root = import.meta.env.BASE_URL ?? '/'
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`
  const trimmedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedRoot}${trimmedBase}`
}
