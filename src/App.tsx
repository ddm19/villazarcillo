import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CampHub } from './components/CampHub'
import { loadData } from './lib/dataLoader'
import type { DataBundle, HubElement, Scene, SceneLayer } from './lib/types'
import { parseQuery } from './lib/queryParams'

type RouteParams = {
  sceneId?: string
  focusId?: string
  layerIds?: string
}

type LayerState = {
  set: Set<string>
  explicitEmpty: boolean
}

function App() {
  const [data, setData] = useState<DataBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<RouteParams>()
  const queryHydratedRef = useRef(false)

  useEffect(() => {
    loadData()
      .then((bundle) => {
        setData(bundle)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'No se pudo cargar la configuración.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  const scenesMap = useMemo(() => {
    return data ? new Map<string, Scene>(data.scenes.map((scene) => [scene.id, scene])) : new Map()
  }, [data])

  const elementsMap = useMemo(() => {
    return data ? new Map<string, HubElement>(data.elements.map((element) => [element.id, element])) : new Map()
  }, [data])

  useEffect(() => {
    if (!data || queryHydratedRef.current) {
      return
    }

    const query = parseQuery(location.search)
    const hasQuery = Boolean(query.scene || query.focus || (query.layer && query.layer.length > 0))
    const defaultScene = data.scenes[0]
    if (!defaultScene) {
      return
    }

    const sceneFromConfig = scenesMap.get(data.config.defaultScene) ?? defaultScene

    if (hasQuery) {
      const focusElement = query.focus ? elementsMap.get(query.focus) : undefined
      const requestedScene = query.scene ? scenesMap.get(query.scene) : undefined
      const targetScene = focusElement ? scenesMap.get(focusElement.sceneId) ?? requestedScene : requestedScene
      const finalScene = targetScene ?? sceneFromConfig
      const sanitizedLayers = sanitizeLayersFromArray(finalScene, query.layer)
      navigate(
        buildRoute({
          sceneId: finalScene.id,
          focusId: focusElement?.id ?? query.focus ?? undefined,
          layers: serializeLayers(finalScene, sanitizedLayers.set, sanitizedLayers.explicitEmpty),
        }),
        { replace: true },
      )
      queryHydratedRef.current = true
      return
    }

    if (!params.sceneId) {
      navigate(buildRoute({ sceneId: sceneFromConfig.id }), { replace: true })
    }

    queryHydratedRef.current = true
  }, [data, elementsMap, location.search, navigate, params.sceneId, scenesMap])

  useEffect(() => {
    if (!data || !queryHydratedRef.current) {
      return
    }

    const routeSceneId = params.sceneId
    if (!routeSceneId) {
      return
    }

    const defaultScene = scenesMap.get(data.config.defaultScene) ?? data.scenes[0]
    const currentScene = scenesMap.get(routeSceneId)

    if (!currentScene) {
      const fallback = defaultScene ?? data.scenes[0]
      if (fallback) {
        navigate(buildRoute({ sceneId: fallback.id }), { replace: true })
      }
      return
    }

    if (params.focusId) {
      const focusElement = elementsMap.get(params.focusId)
      if (!focusElement) {
        const layerState = deriveLayerState(currentScene, params.layerIds)
        navigate(
          buildRoute({
            sceneId: currentScene.id,
            layers: serializeLayers(currentScene, layerState.set, layerState.explicitEmpty),
          }),
          { replace: true },
        )
        return
      }

      if (focusElement.sceneId !== currentScene.id) {
        const focusScene = scenesMap.get(focusElement.sceneId)
        if (focusScene) {
          const layerState = deriveLayerState(focusScene, undefined)
          navigate(
            buildRoute({
              sceneId: focusScene.id,
              focusId: focusElement.id,
              layers: serializeLayers(focusScene, layerState.set, layerState.explicitEmpty),
            }),
            { replace: true },
          )
        }
        return
      }
    }
  }, [data, elementsMap, navigate, params.focusId, params.layerIds, params.sceneId, scenesMap])

  if (loading) {
    return <div className="camp-hub__empty-state">Cargando campamento...</div>
  }

  if (error || !data || data.scenes.length === 0) {
    return <div className="camp-hub__empty-state">{error ?? 'No se encontró contenido.'}</div>
  }

  const defaultScene = scenesMap.get(data.config.defaultScene) ?? data.scenes[0]
  const routeScene = params.sceneId ? scenesMap.get(params.sceneId) : undefined
  const activeScene = routeScene ?? defaultScene
  const layerState = deriveLayerState(activeScene, params.layerIds)
  const focusElement = params.focusId ? elementsMap.get(params.focusId) : undefined

  const handleSceneChange = (sceneId: string) => {
    const scene = scenesMap.get(sceneId)
    if (!scene) {
      return
    }
    const defaults = getDefaultLayers(scene)
    navigate(
      buildRoute({
        sceneId: scene.id,
        layers: serializeLayers(scene, defaults, false),
      }),
    )
  }

  const handleLayerChange = (next: Set<string>) => {
    const validIds = new Set(
      Array.from(next).filter((layerId) =>
        activeScene.layers.some((layer: SceneLayer) => layer.id === layerId),
      ),
    )
    const defaults = getDefaultLayers(activeScene)
    const explicitEmpty = validIds.size === 0 && defaults.size > 0
    navigate(
      buildRoute({
        sceneId: activeScene.id,
        focusId: focusElement?.id,
        layers: serializeLayers(activeScene, validIds, explicitEmpty),
      }),
    )
  }

  const handleFocusChange = (elementId?: string) => {
    if (!elementId) {
      navigate(
        buildRoute({
          sceneId: activeScene.id,
          layers: serializeLayers(
            activeScene,
            layerState.set,
            layerState.explicitEmpty && layerState.set.size === 0,
          ),
        }),
      )
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

    const isSameScene = scene.id === activeScene.id
    const targetLayers = isSameScene ? layerState.set : getDefaultLayers(scene)
    const targetExplicitEmpty = isSameScene ? layerState.explicitEmpty : false

    navigate(
      buildRoute({
        sceneId: scene.id,
        focusId: element.id,
        layers: serializeLayers(scene, targetLayers, targetExplicitEmpty && targetLayers.size === 0),
      }),
    )
  }

  return (
    <CampHub
      config={data.config}
      scenes={data.scenes}
      elements={data.elements}
      panels={data.panels}
      sceneId={activeScene.id}
      activeLayers={layerState.set}
      focusElementId={focusElement?.id}
      onSceneChange={handleSceneChange}
      onLayerChange={handleLayerChange}
      onFocusChange={handleFocusChange}
    />
  )
}

function getDefaultLayers(scene: Scene) {
  return new Set(scene.layers.filter((layer) => layer.visible).map((layer) => layer.id))
}

function deriveLayerState(scene: Scene, layerParam: string | undefined): LayerState {
  const parsed = parseRouteLayers(layerParam)
  const valid = parsed.values.filter((layerId) => scene.layers.some((layer) => layer.id === layerId))

  if (valid.length > 0) {
    return { set: new Set(valid), explicitEmpty: false }
  }

  if (parsed.explicitEmpty) {
    return { set: new Set(), explicitEmpty: true }
  }

  return { set: getDefaultLayers(scene), explicitEmpty: false }
}

function sanitizeLayersFromArray(scene: Scene, layers: string[] | undefined): LayerState {
  if (!layers || layers.length === 0) {
    return { set: getDefaultLayers(scene), explicitEmpty: false }
  }
  const valid = layers.filter((layerId) => scene.layers.some((layer) => layer.id === layerId))
  if (valid.length === 0) {
    return { set: getDefaultLayers(scene), explicitEmpty: false }
  }
  return { set: new Set(valid), explicitEmpty: false }
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

type RouteState = {
  sceneId: string
  focusId?: string
  layers?: string[] | null
}

function serializeLayers(scene: Scene, layers: Set<string>, explicitEmpty: boolean): string[] | null | undefined {
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

function buildRoute({ sceneId, focusId, layers }: RouteState) {
  let path = `scene/${encodeURIComponent(sceneId)}`

  if (focusId) {
    path += `/focus/${encodeURIComponent(focusId)}`
  }

  if (layers !== undefined) {
    if (layers === null || layers.length === 0) {
      path += '/layers/_'
    } else {
      const serialized = layers.map((layer) => encodeURIComponent(layer)).join(',')
      path += `/layers/${serialized}`
    }
  }

  return path
}

export default App
