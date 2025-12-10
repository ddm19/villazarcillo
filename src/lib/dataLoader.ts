import axios from 'axios'
import type { DataBundle, HubElement, HubConfig, Panel, Scene } from './types'
import { supabase } from '../services/supabaseClient'

const BASE_URL = normalizeBase(import.meta.env.BASE_URL ?? '/')
const CONFIG_URL = `${BASE_URL}data/config.json`
const SCENES_URL = `${BASE_URL}data/scenes.json`
const ELEMENTS_URL = `${BASE_URL}data/elements.json`
const PANELS_URL = `${BASE_URL}data/panels.json`

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
  const [configRes, scenesRes, elementsRes, panelsRes] = await Promise.all([
    axios.get<HubConfig>(CONFIG_URL),
    axios.get<{ scenes: Scene[] }>(SCENES_URL),
    axios.get<{ elements: HubElement[] }>(ELEMENTS_URL),
    axios.get<{ panels: Panel[] }>(PANELS_URL),
  ])

  const config = configRes.data
  const scenes = scenesRes.data.scenes ?? []
  const elements = elementsRes.data.elements ?? []
  const panels = panelsRes.data.panels ?? []

  for (const panel of panels) {
    if (panel.cta?.quest) {
      panel.questPlayers = await getQuestPlayers(panel.cta.quest)
    }
  }

  validateScenes(scenes)

  return { config, scenes, elements, panels }
}

function normalizeBase(base: string) {
  if (!base.endsWith('/')) {
    return `${base}/`
  }
  return base
}

function validateScenes(scenes: Scene[]) {
  scenes.forEach((scene) => {
    if (!scene.size || typeof scene.size.width !== 'number' || typeof scene.size.height !== 'number') {
      throw new Error(`Scene "${scene.id}" is missing size definition`)
    }
  })
}
