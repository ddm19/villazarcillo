import { useEffect, useMemo, useState } from 'react'
import { CampHub } from './components/CampHub'
import { loadData } from './lib/dataLoader'
import type { DataBundle, HubElement, Scene } from './lib/types'
import { parseQuery } from './lib/queryParams'

const query = parseQuery(window.location.search)

function App() {
  const [data, setData] = useState<DataBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="camp-hub__empty-state">Cargando campamento...</div>
  }

  if (error || !data) {
    return <div className="camp-hub__empty-state">{error ?? 'No se encontró contenido.'}</div>
  }

  const focusElement = data.elements.find((element) => element.id === query.focus)
  const preferredSceneId = focusElement?.sceneId ?? query.scene ?? data.config.defaultScene
  const initialScene = scenesMap.get(preferredSceneId) ?? data.scenes[0]

  const initialLayers = computeInitialLayers(initialScene, focusElement, query.layer)

  return (
    <CampHub
      config={data.config}
      scenes={data.scenes}
      elements={data.elements}
      panels={data.panels}
      initialSceneId={initialScene.id}
      initialLayers={initialLayers}
      initialFocus={focusElement?.id}
    />
  )
}

function computeInitialLayers(scene: Scene, focusElement: HubElement | undefined, forcedLayers: string[] | undefined) {
  const defaults = scene.layers.filter((layer) => layer.visible).map((layer) => layer.id)
  const forced = forcedLayers?.filter((layerId) => scene.layers.some((layer) => layer.id === layerId)) ?? []
  const merged = new Set([...defaults, ...forced])
  if (focusElement && focusElement.sceneId === scene.id) {
    merged.add(focusElement.layerId)
  }
  return Array.from(merged)
}

export default App
