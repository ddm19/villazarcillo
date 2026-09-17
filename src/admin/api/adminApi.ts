import { supabase } from '../../services/supabaseClient'
import {
  configToRow,
  elementToRow,
  panelToRow,
  resourceToRow,
  rowToConfig,
  rowToElement,
  rowToPanel,
  rowToResource,
  rowToScene,
  sceneLayersToRows,
  sceneToRow,
  type ConfigRow,
  type ElementRow,
  type PanelRow,
  type ResourceRow,
  type SceneRow,
} from '../../lib/mappers'
import type { HubConfig, HubElement, Panel, ResourcePanel, Scene } from '../../lib/types'

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

// ---------------------------------------------------------------------------
// Admin check
// ---------------------------------------------------------------------------

/**
 * Checked live against villazarcillo_admins (auth.uid()) rather than the JWT's
 * app_metadata claim: that claim is baked into the token at login time and does NOT
 * refresh just because raw_app_meta_data changed afterwards, which used to leave the
 * write RLS policies rejecting saves for a user the UI still showed as admin.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('villazarcillo_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export async function fetchConfig(): Promise<HubConfig> {
  const res = await supabase.from('villazarcillo_config').select('*').eq('id', 1).single()
  return rowToConfig(unwrap<ConfigRow>(res))
}

export async function saveConfig(config: HubConfig): Promise<void> {
  const res = await supabase.from('villazarcillo_config').upsert(configToRow(config))
  if (res.error) throw new Error(res.error.message)
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export async function fetchScenes(): Promise<Scene[]> {
  const res = await supabase
    .from('villazarcillo_scenes')
    .select('*, villazarcillo_scene_layers(*)')
    .order('sort_order', { ascending: true })
  const rows = unwrap<SceneRow[]>(res)
  return rows.map(rowToScene)
}

export async function saveScene(scene: Scene, sortOrder: number): Promise<void> {
  const sceneRes = await supabase.from('villazarcillo_scenes').upsert(sceneToRow(scene, sortOrder))
  if (sceneRes.error) throw new Error(sceneRes.error.message)

  const layerRows = sceneLayersToRows(scene)
  const keepIds = layerRows.map((l) => l.id)

  const deleteQuery = supabase.from('villazarcillo_scene_layers').delete().eq('scene_id', scene.id)
  const delRes = keepIds.length > 0 ? await deleteQuery.not('id', 'in', `(${keepIds.join(',')})`) : await deleteQuery
  if (delRes.error) throw new Error(delRes.error.message)

  if (layerRows.length > 0) {
    const layerRes = await supabase.from('villazarcillo_scene_layers').upsert(layerRows)
    if (layerRes.error) throw new Error(layerRes.error.message)
  }
}

export async function deleteScene(id: string): Promise<void> {
  const res = await supabase.from('villazarcillo_scenes').delete().eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

export async function fetchElements(sceneId?: string): Promise<HubElement[]> {
  let query = supabase.from('villazarcillo_elements').select('*').order('sort_order', { ascending: true })
  if (sceneId) query = query.eq('scene_id', sceneId)
  const res = await query
  const rows = unwrap<ElementRow[]>(res)
  return rows.map(rowToElement)
}

export async function saveElement(element: HubElement, sortOrder = 0): Promise<void> {
  const res = await supabase.from('villazarcillo_elements').upsert(elementToRow(element, sortOrder))
  if (res.error) throw new Error(res.error.message)
}

export async function deleteElement(id: string): Promise<void> {
  const res = await supabase.from('villazarcillo_elements').delete().eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

export async function fetchPanels(): Promise<Panel[]> {
  const res = await supabase.from('villazarcillo_panels').select('*')
  const rows = unwrap<PanelRow[]>(res)
  return rows.map(rowToPanel)
}

export async function savePanel(panel: Panel): Promise<void> {
  const res = await supabase.from('villazarcillo_panels').upsert(panelToRow(panel))
  if (res.error) throw new Error(res.error.message)
}

export async function deletePanel(id: string): Promise<void> {
  const res = await supabase.from('villazarcillo_panels').delete().eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export async function fetchResources(): Promise<ResourcePanel[]> {
  const res = await supabase.from('villazarcillo_resources').select('*')
  const rows = unwrap<ResourceRow[]>(res)
  return rows.map(rowToResource)
}

export async function saveResource(resource: ResourcePanel): Promise<void> {
  const res = await supabase.from('villazarcillo_resources').upsert(resourceToRow(resource))
  if (res.error) throw new Error(res.error.message)
}

export async function deleteResource(id: string): Promise<void> {
  const res = await supabase.from('villazarcillo_resources').delete().eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

// ---------------------------------------------------------------------------
// Cross-entity helpers
// ---------------------------------------------------------------------------

export async function fetchQuestNames(): Promise<string[]> {
  const [panelsRes, resourcesRes] = await Promise.all([
    supabase.from('villazarcillo_panels').select('cta'),
    supabase.from('villazarcillo_resources').select('cta'),
  ])
  const rows = [...(panelsRes.data ?? []), ...(resourcesRes.data ?? [])] as { cta: { quest?: string } | null }[]
  const names = rows.map((row) => row.cta?.quest).filter((quest): quest is string => Boolean(quest))
  return Array.from(new Set(names)).sort()
}

export async function fetchElementsUsingPanel(panelId: string): Promise<HubElement[]> {
  const res = await supabase.from('villazarcillo_elements').select('*').eq('panel_id', panelId)
  const rows = unwrap<ElementRow[]>(res)
  return rows.map(rowToElement)
}
