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
