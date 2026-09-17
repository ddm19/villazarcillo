// One-time migration: public/data/*.json -> Supabase tables.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/migrate-json-to-supabase.mjs
//
// Requires the SERVICE ROLE key (bypasses RLS) — never commit it, never use it in the client bundle.
// Run supabase/schema.sql in the Supabase SQL editor before running this script.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../public/data')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function readJson(file) {
  const raw = await readFile(path.join(dataDir, file), 'utf-8')
  return JSON.parse(raw)
}

function panelRowFrom(panel) {
  return {
    id: panel.id,
    type: panel.type,
    title: panel.title ?? null,
    portrait: panel.portrait ?? null,
    subtitle: panel.subtitle ?? null,
    content: panel.type === 'markdown' ? panel.content ?? null : null,
    columns: panel.type === 'table' ? panel.columns ?? null : null,
    rows: panel.type === 'table' ? panel.rows ?? null : null,
    image: panel.type === 'image' ? panel.image ?? null : null,
    cta: panel.cta ?? null,
  }
}

async function upsert(table, rows, label) {
  if (rows.length === 0) {
    console.log(`- ${label}: nothing to insert`)
    return
  }
  const { error } = await supabase.from(table).upsert(rows)
  if (error) {
    throw new Error(`Failed to upsert into ${table}: ${error.message}`)
  }
  console.log(`- ${label}: upserted ${rows.length} row(s)`)
}

async function main() {
  console.log('Reading JSON files from', dataDir)

  const config = await readJson('config.json')
  const { scenes = [] } = await readJson('scenes.json')
  const { elements = [] } = await readJson('elements.json')
  const { panels = [] } = await readJson('panels.json')
  const resourcesJson = await readJson('resources.json').catch(() => ({ resources: [] }))
  const resources = resourcesJson.resources ?? []

  // 1. Config (single row)
  await upsert(
    'villazarcillo_config',
    [
      {
        id: 1,
        title: config.title,
        default_scene_id: config.defaultScene,
        assets_base_url: config.assetsBaseUrl,
        feature_flags: config.featureFlags ?? {},
      },
    ],
    'config',
  )

  // 2. Scenes
  const sceneRows = scenes.map((scene, index) => ({
    id: scene.id,
    name: scene.name,
    background: scene.background,
    background_video: scene.backgroundVideo ?? null,
    width: scene.size.width,
    height: scene.size.height,
    center_x: scene.initialView.center[0],
    center_y: scene.initialView.center[1],
    zoom: scene.initialView.zoom,
    min_zoom: scene.minZoom ?? null,
    max_zoom: scene.maxZoom ?? null,
    sort_order: index,
  }))
  await upsert('villazarcillo_scenes', sceneRows, 'scenes')

  // 3. Scene layers
  const layerRows = scenes.flatMap((scene) =>
    scene.layers.map((layer, index) => ({
      scene_id: scene.id,
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      sort_order: index,
    })),
  )
  await upsert('villazarcillo_scene_layers', layerRows, 'scene layers')

  // 4. Panels (must exist before elements reference them)
  const panelRows = panels.map(panelRowFrom)
  await upsert('villazarcillo_panels', panelRows, 'panels')

  // 5. Resources
  const resourceRows = resources.map((resource) => ({
    ...panelRowFrom(resource),
    icon: resource.icon ?? null,
    amount: resource.amount ?? null,
    pinned: resource.pinned ?? true,
  }))
  await upsert('villazarcillo_resources', resourceRows, 'resources')

  // 6. Elements
  const elementRows = elements.map((element, index) => ({
    id: element.id,
    scene_id: element.sceneId,
    layer_id: element.layerId,
    type: element.type,
    name: element.name ?? '',
    position_x: element.position[0],
    position_y: element.position[1],
    icon: element.icon ?? null,
    sprite: element.sprite ?? null,
    panel_id: element.panelId ?? null,
    badge_label: element.badge?.label ?? null,
    nav_scene_id: element.navigation?.sceneId ?? null,
    nav_focus_id: element.navigation?.focusId ?? null,
    nav_layers: element.navigation?.layers ?? null,
    completed: Boolean(element.completed),
    is_dangerous: Boolean(element.isDangerous),
    sort_order: index,
  }))
  await upsert('villazarcillo_elements', elementRows, 'elements')

  console.log('\nMigration complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
