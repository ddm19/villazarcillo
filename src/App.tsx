import { useEffect, useMemo, useState } from 'react'
import { CampHub } from './components/CampHub'
import { loadData } from './lib/dataLoader'
import type { DataBundle, HubElement, Scene, SceneLayer } from './lib/types'
import { parseQuery } from './lib/queryParams'

type LayerState = {
  set: Set<string>
  explicitEmpty: boolean
}

function App() {
  const [data, setData] = useState<DataBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [focusElementId, setFocusElementId] = useState<string | undefined>(undefined)
  const [layerState, setLayerState] = useState<LayerState | null>(null)

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

  const defaultScene = useMemo(() => {
    if (!data || data.scenes.length === 0) {
      return undefined
    }
    return scenesMap.get(data.config.defaultScene) ?? data.scenes[0]
  }, [data, scenesMap])

  useEffect(() => {
    if (!data || !defaultScene) {
      return
    }

    const applyQueryToState = (search: string, options?: { replace?: boolean }) => {
      const query = parseQuery(search)
      let focusElement = query.focus ? elementsMap.get(query.focus) : undefined
      if (focusElement && !scenesMap.has(focusElement.sceneId)) {
        focusElement = undefined
      }

      let scene = focusElement ? scenesMap.get(focusElement.sceneId) ?? undefined : undefined
      if (!scene && query.scene) {
        scene = scenesMap.get(query.scene) ?? undefined
      }
      if (!scene) {
        scene = defaultScene
      }

      const sanitizedLayers = sanitizeLayersFromArray(scene, query.layer)
      const nextState: LayerState = {
        set: new Set(sanitizedLayers.set),
        explicitEmpty: sanitizedLayers.explicitEmpty,
      }

      setSceneId(scene.id)
      setFocusElementId(focusElement?.id)
      setLayerState(nextState)

      const desiredSearch = buildSearch(scene, defaultScene.id, focusElement?.id, nextState)
      const currentSearch = search.startsWith('?') ? search.slice(1) : search
      if (desiredSearch !== currentSearch) {
        const url = `${window.location.pathname}${desiredSearch ? `?${desiredSearch}` : ''}`
        if (options?.replace) {
          window.history.replaceState(window.history.state, '', url)
        } else {
          window.history.pushState(window.history.state, '', url)
        }
      }
    }

    applyQueryToState(window.location.search, { replace: true })

    const handlePopstate = () => {
      applyQueryToState(window.location.search, { replace: true })
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [data, defaultScene, elementsMap, scenesMap])

  if (loading) {
    return <div className="camp-hub__empty-state">Cargando campamento...</div>
  }

  if (error || !data || data.scenes.length === 0) {
    return <div className="camp-hub__empty-state">{error ?? 'No se encontró contenido.'}</div>
  }

  if (!sceneId || !layerState) {
    return <div className="camp-hub__empty-state">Preparando campamento...</div>
  }

  const activeScene = scenesMap.get(sceneId)
  if (!activeScene) {
    return <div className="camp-hub__empty-state">No se encontró la escena solicitada.</div>
  }

  const focusElement = focusElementId ? elementsMap.get(focusElementId) : undefined

  const updateUrl = (scene: Scene, focusId: string | undefined, layers: LayerState, options?: { replace?: boolean }) => {
    const search = buildSearch(scene, defaultScene?.id, focusId, layers)
    const currentSearch = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search
    if (currentSearch === search) {
      return
    }
    const url = `${window.location.pathname}${search ? `?${search}` : ''}`
    if (options?.replace) {
      window.history.replaceState(window.history.state, '', url)
    } else {
      window.history.pushState(window.history.state, '', url)
    }
  }

  const handleSceneChange = (nextSceneId: string) => {
    const nextScene = scenesMap.get(nextSceneId)
    if (!nextScene) {
      return
    }
    const defaults = getDefaultLayers(nextScene)
    const nextState: LayerState = { set: defaults, explicitEmpty: false }
    setSceneId(nextScene.id)
    setLayerState({ set: new Set(nextState.set), explicitEmpty: nextState.explicitEmpty })
    setFocusElementId(undefined)
    updateUrl(nextScene, undefined, nextState)
  }

  const handleLayerChange = (next: Set<string>) => {
    const validIds = new Set(
      Array.from(next).filter((layerId) =>
        activeScene.layers.some((layer: SceneLayer) => layer.id === layerId),
      ),
    )
    const defaults = getDefaultLayers(activeScene)
    const explicitEmpty = validIds.size === 0 && defaults.size > 0
    const nextState: LayerState = { set: validIds, explicitEmpty }
    setLayerState({ set: new Set(nextState.set), explicitEmpty: nextState.explicitEmpty })
    updateUrl(activeScene, focusElement?.id, nextState)
  }

  const handleFocusChange = (elementId?: string) => {
    if (!elementId) {
      setFocusElementId(undefined)
      updateUrl(activeScene, undefined, layerState)
      return
    }

    const element = elementsMap.get(elementId)
    if (!element) {
      return
    }

    const elementScene = scenesMap.get(element.sceneId)
    if (!elementScene) {
      return
    }

    const isSameScene = elementScene.id === activeScene.id
    const targetLayers = isSameScene ? new Set(layerState.set) : getDefaultLayers(elementScene)
    const targetState: LayerState = {
      set: targetLayers,
      explicitEmpty: isSameScene ? layerState.explicitEmpty : false,
    }

    setSceneId(elementScene.id)
    setLayerState({ set: new Set(targetState.set), explicitEmpty: targetState.explicitEmpty })
    setFocusElementId(element.id)
    updateUrl(elementScene, element.id, targetState)
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

function sanitizeLayersFromArray(scene: Scene, layers: string[] | undefined): LayerState {
  if (!layers || layers.length === 0) {
    return { set: getDefaultLayers(scene), explicitEmpty: false }
  }

  if (layers.length === 1 && layers[0] === '_') {
    return { set: new Set(), explicitEmpty: true }
  }

  const valid = layers.filter((layerId) => scene.layers.some((layer) => layer.id === layerId))
  if (valid.length === 0) {
    return { set: getDefaultLayers(scene), explicitEmpty: false }
  }

  return { set: new Set(valid), explicitEmpty: false }
}

function buildSearch(scene: Scene, defaultSceneId: string | undefined, focusId: string | undefined, layers: LayerState) {
  const params = new URLSearchParams()

  if (!defaultSceneId || scene.id !== defaultSceneId) {
    params.set('scene', scene.id)
  }

  if (focusId) {
    params.set('focus', focusId)
  }

  const defaults = getDefaultLayers(scene)

  if (layers.explicitEmpty) {
    params.set('layer', '_')
  } else if (layers.set.size === 0) {
    if (defaults.size > 0) {
      params.set('layer', '_')
    }
  } else {
    const sameAsDefault =
      layers.set.size === defaults.size && Array.from(layers.set).every((layerId) => defaults.has(layerId))
    if (!sameAsDefault) {
      params.set('layer', Array.from(layers.set).sort().join(','))
    }
  }

  return params.toString()
}

export default App
