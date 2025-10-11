import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Tooltip, useMap } from 'react-leaflet'
import L, { CRS, type LeafletKeyboardEvent } from 'leaflet'
import classNames from 'classnames'
import ReactMarkdown from 'react-markdown'
import type {
  HubConfig,
  HubElement,
  HubNavigationTarget,
  Panel,
  Scene,
  TableCell,
} from '../lib/types'
import { markdownContentToString } from '../lib/markdown'
import { useFocusTrap } from '../lib/useFocusTrap'
import 'leaflet/dist/leaflet.css'

type CampHubProps = {
  config: HubConfig
  scene: Scene
  elements: HubElement[]
  panels: Panel[]
  activeLayers: Set<string>
  focusElementId?: string
  onFocusChange: (elementId?: string) => void
  onNavigate: (target: HubNavigationTarget) => void
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
  onElementActivate: (element: HubElement) => void
}

function SceneCanvas({
  scene,
  elements,
  panelsMap,
  activeLayers,
  focusElementId,
  onElementActivate,
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
        const hasNavigation = Boolean(element.navigation)
        const isInteractive = Boolean(panel || hasNavigation)
        const isPin = element.icon?.kind === 'pin'
        const icon = isPin
          ? pinIcon(
              element.icon?.colorVar ? `var(${element.icon.colorVar})` : undefined,
              !isInteractive,
            )
          : element.sprite
            ? spriteIcon(
                element.sprite.src,
                element.sprite.width,
                element.sprite.height,
                element.sprite.rotation,
                !isInteractive,
              )
            : pinIcon(undefined, !isInteractive)
        const tooltip = element.name

        return (
          <Marker
            key={element.id}
            position={[element.position[1], element.position[0]]}
            icon={icon}
            eventHandlers={
              isInteractive
                ? {
                    click: () => {
                      onElementActivate(element)
                    },
                    keydown: (event: LeafletKeyboardEvent) => {
                      if (event.originalEvent.key === 'Enter') {
                        onElementActivate(element)
                      }
                    },
                  }
                : undefined
            }
            keyboard={isInteractive}
            opacity={isInteractive ? 1 : 0.6}
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
  scene,
  elements,
  panels,
  activeLayers,
  focusElementId,
  onFocusChange,
  onNavigate,
}: CampHubProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const missingPanelsLogged = useRef(new Set<string>())
  useFocusTrap(Boolean(activePanel), drawerRef)

  const panelsMap = useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels])

  const resolvedScene = useMemo(() => {
    return {
      ...scene,
      background: resolveAsset(config.assetsBaseUrl, scene.background),
    }
  }, [scene, config.assetsBaseUrl])

  const resolvedSceneElements = useMemo(() => {
    return elements
      .filter((element) => element.sceneId === scene.id)
      .map((element) => {
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
  }, [elements, scene.id, config.assetsBaseUrl, panelsMap])

  const focusElement = useMemo(() => {
    return focusElementId ? resolvedSceneElements.find((element) => element.id === focusElementId) : undefined
  }, [focusElementId, resolvedSceneElements])

  useEffect(() => {
    if (!focusElement) {
      setActivePanel(null)
      return
    }
    const panel = focusElement.panelId ? panelsMap.get(focusElement.panelId) : undefined
    if (!panel) {
      setActivePanel(null)
      return
    }
    setActivePanel({ element: focusElement, panel })
  }, [focusElement, panelsMap])

  const handleElementActivate = (element: HubElement) => {
    if (element.navigation) {
      setActivePanel(null)
      onNavigate(element.navigation)
      return
    }

    const panel = element.panelId ? panelsMap.get(element.panelId) : undefined
    if (!panel) {
      return
    }

    setActivePanel({ element, panel })
    onFocusChange(element.id)
  }

  const closeDrawer = () => {
    setActivePanel(null)
    onFocusChange(undefined)
  }

  return (
    <div className="camp-hub">
      <main className="camp-hub__canvas">
        <SceneCanvas
          key={resolvedScene.id}
          scene={resolvedScene}
          elements={resolvedSceneElements}
          panelsMap={panelsMap}
          activeLayers={activeLayers}
          focusElementId={focusElementId}
          onElementActivate={handleElementActivate}
        />
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
