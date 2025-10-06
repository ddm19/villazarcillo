export type HubQuery = {
  scene?: string
  focus?: string
  layer?: string[]
}

export function parseQuery(search: string): HubQuery {
  const params = new URLSearchParams(search)
  const layerRaw = params.get('layer')
  return {
    scene: params.get('scene') ?? undefined,
    focus: params.get('focus') ?? undefined,
    layer: layerRaw ? layerRaw.split(',').filter(Boolean) : undefined,
  }
}

export function updateQuery(updates: Partial<HubQuery>) {
  const params = new URLSearchParams(window.location.search)
  Object.entries(updates).forEach(([key, value]) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      params.delete(key)
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','))
    } else {
      params.set(key, value)
    }
  })
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}
