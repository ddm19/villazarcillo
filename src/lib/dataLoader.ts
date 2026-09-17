import type { DataBundle, Scene } from './types'
import { supabase } from '../services/supabaseClient'
import {
  rowToConfig,
  rowToElement,
  rowToPanel,
  rowToResource,
  rowToScene,
  type ConfigRow,
  type ElementRow,
  type PanelRow,
  type ResourceRow,
  type SceneRow,
} from './mappers'

async function getQuestPlayers(questName: string): Promise<{ playerId: string; playerOwner: string }[]> {
  const { data, error } = await supabase
    .from('villazarcillo_quest_players')
    .select('player_id,player_owner')
    .eq('quest_name', questName)

  if (error) {
    console.error('Error fetching quest players:', error)
    return []
  }

  return(
    data?.map((entry) => ({
      playerId: entry.player_id,
      playerOwner: entry.player_owner,
    })) ?? []
  )
  
}

export async function loadData(): Promise<DataBundle> {
  const [configRes, scenesRes, elementsRes, panelsRes, resourcesRes] = await Promise.all([
    supabase.from('villazarcillo_config').select('*').eq('id', 1).single(),
    supabase
      .from('villazarcillo_scenes')
      .select('*, villazarcillo_scene_layers(*)')
      .order('sort_order', { ascending: true }),
    supabase.from('villazarcillo_elements').select('*').order('sort_order', { ascending: true }),
    supabase.from('villazarcillo_panels').select('*'),
    supabase.from('villazarcillo_resources').select('*'),
  ])

  if (configRes.error) throw configRes.error
  if (scenesRes.error) throw scenesRes.error
  if (elementsRes.error) throw elementsRes.error
  if (panelsRes.error) throw panelsRes.error
  if (resourcesRes.error) throw resourcesRes.error

  const config = rowToConfig(configRes.data as ConfigRow)
  const scenes = ((scenesRes.data ?? []) as SceneRow[]).map(rowToScene)
  const elements = ((elementsRes.data ?? []) as ElementRow[]).map(rowToElement)
  const panels = ((panelsRes.data ?? []) as PanelRow[]).map(rowToPanel)
  const resources = ((resourcesRes.data ?? []) as ResourceRow[]).map(rowToResource)

  await attachQuestPlayers(panels)
  await attachQuestPlayers(resources)

  validateScenes(scenes)

  return { config, scenes, elements, panels, resources }
}

async function attachQuestPlayers<
  T extends { cta?: { quest?: string }; questPlayers?: { playerId: string; playerOwner: string }[] },
>(items: T[]): Promise<void> {
  for (const item of items) {
    if (item.cta?.quest) {
      item.questPlayers = await getQuestPlayers(item.cta.quest)
    }
  }
}

function validateScenes(scenes: Scene[]) {
  scenes.forEach((scene) => {
    if (!scene.size || typeof scene.size.width !== 'number' || typeof scene.size.height !== 'number') {
      throw new Error(`Scene "${scene.id}" is missing size definition`)
    }
  })
}
