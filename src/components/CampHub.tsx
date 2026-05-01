import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, ImageOverlay, Marker, Tooltip, useMap, VideoOverlay } from 'react-leaflet';
import L, { CRS, type LeafletKeyboardEvent } from 'leaflet';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import type {
  HubConfig,
  HubElement,
  HubNavigationTarget,
  Panel,
  Scene,
} from '../lib/types';
import { useFocusTrap } from '../lib/useFocusTrap';
import 'leaflet/dist/leaflet.css';
import rehypeRaw from 'rehype-raw';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';
import { QuestJoiner } from './QuestJoiner';
import QuestChatModal from './QuestChatModal';
import { TableView } from './TableView';
import { renderMarkdownContent } from '../lib/markdownRenderer';
import { useNavigate } from 'react-router-dom';
import '../styles/_quest.scss';

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

const pinIcon = (colorVar?: string, disabled?: boolean, scale = 1) => {
  const baseSize = 32 * scale
  const radius = baseSize / 2

  return L.divIcon({
    className: 'camp-hub__pin-icon',
    html: `<div class="camp-hub__pin${disabled ? ' camp-hub__pin--disabled' : ''}" style="--pin-color: ${colorVar ?? 'var(--pin-generic)'}; --pin-size: ${baseSize}px; --pin-radius: ${radius}px;"></div>`,
    iconSize: [baseSize, baseSize],
    iconAnchor: [radius, radius],
  })
}

const spriteIcon = (
  src: string,
  width: number,
  height: number,
  rotation?: number,
  disabled?: boolean,
  scale = 1,
  completed?: boolean,
  isDangerous?: boolean,
) => {
  const scaledWidth = Math.round(width * scale)
  const scaledHeight = Math.round(height * scale)

  const randomRotation = Math.floor(Math.random() * 40) - 20

  return L.divIcon({
    className: 'camp-hub__sprite-icon',
    html: `<div class="camp-hub__sprite${disabled ? ' camp-hub__sprite--disabled' : ''}" style="width:${scaledWidth}px;height:${scaledHeight}px;--sprite-rotation:${rotation ?? 0
      }deg;">
            ${completed ? `
          <img src="/assets/boards/notes/complete.png" alt="Misión completada" class="campHub__spriteIcon campHub__spriteIcon-completed" style="transform: rotate(${randomRotation}deg);" />
        ` : ''}
            ${isDangerous ? `
          <img src="/assets/boards/notes/danger.png" alt="Peligrosa" class="campHub__spriteIcon campHub__spriteIcon-dangerous" />
        ` : ''}
          
      <img src="${src}" alt="" /></div>`,
    iconSize: [scaledWidth, scaledHeight],
    iconAnchor: [scaledWidth / 2, scaledHeight / 2],
  })
}


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
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const filtered = useMemo(() => {
    return elements.filter((element) => activeLayers.has(element.layerId))
  }, [elements, activeLayers])
  const isMobile = viewportWidth <= 768
  const iconScale = isMobile ? Math.max(0.5, Math.min(1, viewportWidth / 768)) : 1
  return (
    <MapContainer
      center={[scene.initialView.center[1], scene.initialView.center[0]]}
      zoom={scene.initialView.zoom}
      minZoom={isMobile ? -1 : scene.minZoom}
      maxZoom={isMobile ? 2 : scene.maxZoom}
      crs={CRS.Simple}
      className="camp-hub__map"
      maxBounds={[
        [0, 0],
        [scene.size.height, scene.size.width],
      ]}
      maxBoundsViscosity={1}
    >
      {!scene.backgroundVideo ?
        <ImageOverlay
          url={scene.background}
          bounds={[
            [0, 0],
            [scene.size.height, scene.size.width],
          ]}
        />
        :
        <VideoOverlay
          url={scene.backgroundVideo}
          bounds={[
            [0, 0],
            [scene.size.height, scene.size.width],
          ]}
          autoplay
          loop
          muted
        />
      }
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
            iconScale,
          )
          : element.sprite
            ? spriteIcon(
              element.sprite.src,
              element.sprite.width,
              element.sprite.height,
              element.sprite.rotation,
              !isInteractive,
              iconScale,
              element.completed,
              element.isDangerous,
            )
            : pinIcon(undefined, !isInteractive, iconScale)
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
            {tooltip && tooltip !== '' ? (
              <Tooltip direction="top" permanent={isMobile} offset={[-30, -55]} className="camp-hub__tooltip">
                {tooltip}
              </Tooltip>
            ) : null}
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
  const [showQuestJoiner, setShowQuestJoiner] = useState(false);
  const [questToJoin, setQuestToJoin] = useState<string | null>(null);
  const [chatQuest, setChatQuest] = useState<string | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null)
  const missingPanelsLogged = useRef(new Set<string>())
  useFocusTrap(Boolean(activePanel), drawerRef)

  const panelsMap = useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels])

  const resolvedScene = useMemo(() => {
    return {
      ...scene,
      background: resolveAsset(config.assetsBaseUrl, scene.background),
      backgroundVideo: resolveAsset(config.assetsBaseUrl, scene.backgroundVideo),
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
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setActivePanel(null)
    onFocusChange(undefined)
  }
  const fullScreenModeToggle = (drawerRef: HTMLElement | null) => {
    if (!drawerRef) return;
    if (!document.fullscreenElement) {
      drawerRef.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };



  const { session } = useUser()

  const handleJoinQuest = async (playerId: string) => {
    if (!session || !questToJoin) {
      alert('Error inesperado.');
      return;
    }

    const { error } = await supabase
      .from('villazarcillo_quest_players')
      .insert({
        quest_name: questToJoin,
        player_id: playerId,
        player_owner: session.user.id,
      });

    if (error) {
      alert('Error al unirse a la misión');
    } else {
      setShowQuestJoiner(false);
      setQuestToJoin(null);
      window.location.reload();
    }
  };



  const openQuestJoiner = (questName: string) => {
    setQuestToJoin(questName);
    setShowQuestJoiner(true);
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
        <div className="camp-hub__drawer__content">

          {activePanel && !showQuestJoiner && (
            <>
              <div className="camp-hub__drawer-header">
                <h2 className="camp-hub__drawer-title">{activePanel.element.name}</h2>
                {activePanel.element.badge && (
                  <span className="camp-hub__badge" aria-label={activePanel.element.badge.label}>
                    {activePanel.element.badge.label}
                  </span>
                )}

                <button type="button" className="camp-hub__drawer-close" onClick={() => fullScreenModeToggle(drawerRef.current)}>
                  <span className="camp-hub__drawer-fullscreen-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                      <path d="M21 9V8C21 5.79086 18.9853 4 16.5 4H15.25M21 15V16C21 18.2091 18.9853 20 16.5 20H15.25M3 15V16C3 18.2091 5.01472 20 7.5 20H8.75M3 9V8C3 5.79086 5.01472 4 7.5 4H8.75" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </button>
                <button type="button" className="camp-hub__drawer-close" onClick={closeDrawer}>
                  <span className="camp-hub__drawer-close-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </span>
                </button>

              </div>
              <PanelContent config={config} panel={activePanel.panel} onJoinQuest={openQuestJoiner} onOpenChat={(q) => setChatQuest(q)} />
            </>
          )}
          {showQuestJoiner && questToJoin && (
            <QuestJoiner
              questName={questToJoin}
              onJoin={handleJoinQuest}
              onCancel={() => setShowQuestJoiner(false)}
            />
          )}
        </div>
      </aside >
      {chatQuest && (
        <QuestChatModal questName={chatQuest} open={Boolean(chatQuest)} onClose={() => setChatQuest(null)} />
      )}
    </div >
  )
}

type PanelContentProps = {
  config: HubConfig
  panel?: Panel,
  onJoinQuest: (questName: string) => void
  onOpenChat: (questName: string) => void
}

function PanelContent({ config, panel, onJoinQuest, onOpenChat }: PanelContentProps) {
  const { session } = useUser()

  const navigate = useNavigate();

  function reconnect() {
    navigate(0);
  }

  const handleLeaveQuest = async (playerId: string) => {
    if (!session) {
      alert('Error inesperado.');
      return;
    }
    const { error } = await supabase
      .from('villazarcillo_quest_players')
      .delete()
      .eq('player_id', playerId)
      .eq('player_owner', session.user.id);

    if (error) {
      alert('Error al salir de la misión ');
    } else {
      window.location.reload();
    }
  };

  if (!panel) {
    return (
      <div className="camp-hub__panel-content">
        <p className="camp-hub__panel-text">No hay información disponible para este elemento.</p>
      </div>
    )
  }

  if (panel.type === 'markdown') {
    const portraitUrl = panel.portrait ? resolveAsset(config.assetsBaseUrl, panel.portrait) : undefined;
    return (
      <div className="camp-hub__panel-content">
        {portraitUrl && (
          <div className="camp-hub__panel-portrait">
            <img src={portraitUrl} alt="" />
          </div>
        )}
        <div className="camp-hub__panel-text camp-hub__markdown">
          {renderMarkdownContent(panel.content)}
        </div>
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
          </div>
        )}
        {session == null && panel.cta ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    );
  }

  if (panel.type === 'table') {
    const portraitUrl = panel.portrait ? resolveAsset(config.assetsBaseUrl, panel.portrait) : undefined;
    return (
      <div className="camp-hub__panel-content">
        {portraitUrl && (
          <div className="camp-hub__panel-portrait">
            <img src={portraitUrl} alt="" />
          </div>
        )}
        {panel.title || panel.subtitle ? (
          <header>
            {panel.title && <h3>{panel.title}</h3>}
            {panel.subtitle && (
              <div className="camp-hub__markdown">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{panel.subtitle}</ReactMarkdown>
              </div>
            )}
          </header>
        ) : null}
        <TableView columns={panel.columns} rows={panel.rows} />
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
          </div>
        )}
        {session == null ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    );
  }

  if (panel.type === 'image') {
    const imageUrl = resolveAsset(config.assetsBaseUrl, panel.image)
    const [isFullScreen, setIsFullScreen] = useState(false);
    return (
      <div className="camp-hub__panel-content">
        {panel.title && (
          <header>
            <h3>{panel.title}</h3>
          </header>
        )}

        <div className="camp-hub__panel-image" onClick={() => setIsFullScreen(true)}>
          <img src={imageUrl} alt="" />
        </div>

        {isFullScreen && (
          <>
            <div className='fullscreen_close'>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>

            <div className="fullscreen-modal" onClick={() => setIsFullScreen(false)}>
              <img src={imageUrl} alt="" />

            </div>


          </>
        )}
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId} {player.playerOwner == session?.user.id && <span className="camp-hub__quest-player-remove" onClick={() => {
                  handleLeaveQuest(player.playerId);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" >
                    <polyline points="40 44 40 56 8 56 8 8 40 8 40 20" />
                    <polyline points="48 40 56 32 48 24" />
                    <line x1="28" y1="32" x2="56" y2="32" />
                  </svg>
                </span>}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {(panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id)) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
            {(panel.questPlayers && session && session?.user?.app_metadata?.role === 'admin') && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ver Chat
              </button>
            )}

          </div>
        )}
        {session == null ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    )
  }

  return null
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


