import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useRoutes } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import { CampHub } from './components/CampHub'
import { loadData } from './lib/dataLoader'
import type {
  DataBundle,
  HubElement,
  HubNavigationTarget,
  Scene,
  SceneLayer,
} from './lib/types'
import { useUser } from './contexts/UserContext'
import { supabase } from './services/supabaseClient'

type RouteParams = {
  sceneId?: string
  [key: string]: string | undefined
}

type LayerState = {
  set: Set<string>
  explicitEmpty: boolean
}

type HubViewState = {
  scene: Scene
  layerState: LayerState
  focusElement?: HubElement
}

function HubExperience() {
  const [data, setData] = useState<DataBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewState, setViewState] = useState<HubViewState | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<RouteParams>()

  const load = async () => {
    loadData()
      .then((bundle) => {
        setData(bundle)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'No se pudo cargar la configuración.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load();

  }, [])

  const scenesMap = useMemo(() => {
    return data ? new Map<string, Scene>(data.scenes.map((scene) => [scene.id, scene])) : new Map()
  }, [data])

  const elementsMap = useMemo(() => {
    return data ? new Map<string, HubElement>(data.elements.map((element) => [element.id, element])) : new Map()
  }, [data])

  const legacyFocus = getLegacySegment(params['*'], 'focus')
  const legacyLayers = getLegacySegment(params['*'], 'layers')
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const focusParam = searchParams.get('focus') ?? legacyFocus ?? undefined
  const layersParam = searchParams.get('layers') ?? searchParams.get('layer') ?? legacyLayers ?? undefined

  useEffect(() => {
    if (!data || data.scenes.length === 0) {
      return
    }

    const sanitized = sanitizeRoute({
      data,
      scenesMap,
      elementsMap,
      requestedSceneId: params.sceneId,
      focusId: focusParam,
      layersParam,
    })

    setViewState({
      scene: sanitized.scene,
      layerState: sanitized.layerState,
      focusElement: sanitized.focusElement,
    })

    const canonicalSearch = sanitized.search
    const currentSearch = location.search.startsWith('?')
      ? location.search.slice(1)
      : location.search
    const needsRedirect =
      params.sceneId !== sanitized.scene.id ||
      canonicalSearch !== currentSearch ||
      Boolean(params['*'])

    if (needsRedirect) {
      const target = buildPath(sanitized.scene.id, canonicalSearch)
      navigate(target, { replace: true })
    }
  }, [
    data,
    elementsMap,
    focusParam,
    layersParam,
    location.search,
    navigate,
    params.sceneId,
    params['*'],
    scenesMap,
  ])

  const sceneElements = useMemo<HubElement[]>(() => {
    if (!data || !viewState) {
      return []
    }
    return data.elements.filter((element) => element.sceneId === viewState.scene.id)
  }, [data, viewState])

  if (loading) {
    return <div className="camp-hub__empty-state">Cargando campamento...</div>
  }

  if (error || !data || data.scenes.length === 0) {
    return <div className="camp-hub__empty-state">{error ?? 'No se encontró contenido.'}</div>
  }

  if (!viewState) {
    return <div className="camp-hub__empty-state">Preparando mapa...</div>
  }

  const handleFocusChange = (elementId?: string) => {
    if (!elementId) {
      pushRoute(navigate, viewState.scene, viewState.layerState, undefined)
      return
    }

    const element = elementsMap.get(elementId)
    if (!element) {
      return
    }

    const scene = scenesMap.get(element.sceneId)
    if (!scene) {
      return
    }

    const sameScene = scene.id === viewState.scene.id
    const nextLayerState = sameScene
      ? viewState.layerState
      : { set: getDefaultLayers(scene), explicitEmpty: false }

    pushRoute(navigate, scene, nextLayerState, element.id)
  }

  const handleNavigate = (target: HubNavigationTarget) => {
    const scene = scenesMap.get(target.sceneId)
    if (!scene) {
      return
    }

    let nextSet: Set<string>
    let explicitEmpty = false

    if (target.layers === undefined) {
      nextSet = getDefaultLayers(scene)
    } else if (target.layers === null) {
      nextSet = new Set()
      explicitEmpty = true
    } else {
      const valid = target.layers.filter((layerId) =>
        scene.layers.some((layer: SceneLayer) => layer.id === layerId),
      )
      nextSet = valid.length > 0 ? new Set(valid) : getDefaultLayers(scene)
    }

    pushRoute(navigate, scene, { set: nextSet, explicitEmpty }, target.focusId)
  }

  return (
    <CampHub
      config={data.config}
      scene={viewState.scene}
      elements={sceneElements}
      panels={data.panels}
      activeLayers={viewState.layerState.set}
      focusElementId={viewState.focusElement?.id}
      onFocusChange={handleFocusChange}
      onNavigate={handleNavigate}
    />
  )
}

function getDefaultLayers(scene: Scene) {
  return new Set(scene.layers.filter((layer) => layer.visible).map((layer) => layer.id))
}

function deriveLayerState(scene: Scene, layerParam: string | undefined): LayerState {
  const parsed = parseRouteLayers(layerParam)
  const valid = parsed.values.filter((layerId) =>
    scene.layers.some((layer: SceneLayer) => layer.id === layerId),
  )

  if (valid.length > 0) {
    return { set: new Set(valid), explicitEmpty: false }
  }

  if (parsed.explicitEmpty) {
    return { set: new Set(), explicitEmpty: true }
  }

  return { set: getDefaultLayers(scene), explicitEmpty: false }
}

function parseRouteLayers(layerParam: string | undefined) {
  if (!layerParam) {
    return { values: [], explicitEmpty: false }
  }
  if (layerParam === '_') {
    return { values: [], explicitEmpty: true }
  }
  return {
    values: layerParam.split(',').map(decodeURIComponent).filter(Boolean),
    explicitEmpty: false,
  }
}

function serializeLayers(
  scene: Scene,
  layers: Set<string>,
  explicitEmpty: boolean,
): string[] | null | undefined {
  if (explicitEmpty) {
    return null
  }

  if (layers.size === 0) {
    const defaults = getDefaultLayers(scene)
    if (defaults.size === 0) {
      return undefined
    }
    return null
  }

  const defaults = getDefaultLayers(scene)
  const sameAsDefault = layers.size === defaults.size && Array.from(layers).every((layerId) => defaults.has(layerId))

  if (sameAsDefault) {
    return undefined
  }

  return Array.from(layers).sort()
}

function buildSearch(scene: Scene, layerState: LayerState, focusId?: string) {
  const params = new URLSearchParams()
  const serializedLayers = serializeLayers(scene, layerState.set, layerState.explicitEmpty)

  if (focusId) {
    params.set('focus', focusId)
  }

  if (serializedLayers !== undefined) {
    params.set('layers', serializedLayers === null ? '_' : serializedLayers.join(','))
  }

  return params.toString()
}

function buildPath(sceneId: string, search: string) {
  const base = `/scene/${encodeURIComponent(sceneId)}`
  return search ? `${base}?${search}` : base
}

function pushRoute(
  navigate: NavigateFunction,
  scene: Scene,
  layerState: LayerState,
  focusId?: string,
) {
  const search = buildSearch(scene, layerState, focusId)
  const path = buildPath(scene.id, search)
  navigate(path)
}

type SanitizeInput = {
  data: DataBundle
  scenesMap: Map<string, Scene>
  elementsMap: Map<string, HubElement>
  requestedSceneId?: string
  focusId?: string
  layersParam?: string
}

function sanitizeRoute({
  data,
  scenesMap,
  elementsMap,
  requestedSceneId,
  focusId,
  layersParam,
}: SanitizeInput) {
  const fallbackScene = scenesMap.get(data.config.defaultScene) ?? data.scenes[0]
  let scene = requestedSceneId ? scenesMap.get(requestedSceneId) ?? fallbackScene : fallbackScene

  const focusElement = focusId ? elementsMap.get(focusId) : undefined
  if (focusElement) {
    const focusScene = scenesMap.get(focusElement.sceneId)
    if (focusScene) {
      scene = focusScene
    }
  }

  const layerState = deriveLayerState(scene, layersParam)
  const resolvedFocus = focusElement && focusElement.sceneId === scene.id ? focusElement : undefined
  const search = buildSearch(scene, layerState, resolvedFocus?.id)

  return {
    scene,
    focusElement: resolvedFocus,
    layerState,
    search,
  }
}

function getLegacySegment(remainder: string | undefined, key: string) {
  if (!remainder) {
    return undefined
  }

  const segments = remainder.split('/').filter(Boolean)
  for (let index = 0; index < segments.length; index += 2) {
    const segmentKey = segments[index]
    const segmentValue = segments[index + 1]
    if (segmentKey === key && segmentValue) {
      return decodeURIComponent(segmentValue)
    }
  }

  return undefined
}

function HubExperienceWrapper() {
  const navigate = useNavigate();
  const mainScene = 'hispania';
  return (
    <>
      <button className='buttonBack' onClick={() => navigate(`/scene/${mainScene}`)}>←</button>
      <HubExperience />
    </>
  )
}

function App() {
  const { setSession } = useUser()

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== 'https://villazarcillo.vercel.app' /* && event.origin !== 'http://localhost:5174' */) {
        return
      }

      const { type, session } = event.data
      if (type === 'supabase-session') {
        if (session) {
          setSession(session)
          await supabase.auth.setSession(session)
        } else {
          setSession(null)
          await supabase.auth.signOut()
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [setSession])

  const element = useRoutes([
    { path: '/', element: <HubExperienceWrapper /> },
    { path: 'scene/:sceneId/*', element: <HubExperienceWrapper /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ])

  return element
}

export default App
