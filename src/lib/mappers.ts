import type {
  ElementIcon,
  HubConfig,
  HubElement,
  HubNavigationTarget,
  MarkdownContent,
  MarkdownPanel,
  Panel,
  PinIcon,
  ResourcePanel,
  Scene,
  SceneLayer,
  SpriteIcon,
  TableCell,
  TablePanel,
  ImagePanel,
} from './types'
import { getSupabaseAssetsBaseUrl } from './assets'

// ---------------------------------------------------------------------------
// Row shapes as they come back from Supabase (snake_case, flat columns)
// ---------------------------------------------------------------------------

export type ConfigRow = {
  id: number
  title: string
  default_scene_id: string
  assets_base_url: string
  feature_flags: Record<string, unknown> | null
}

export type SceneLayerRow = {
  scene_id: string
  id: string
  name: string
  visible: boolean
  sort_order: number
}

export type SceneRow = {
  id: string
  name: string
  background: string
  background_video: string | null
  width: number
  height: number
  center_x: number
  center_y: number
  zoom: number
  min_zoom: number | null
  max_zoom: number | null
  sort_order: number
  villazarcillo_scene_layers?: SceneLayerRow[]
}

export type ElementRow = {
  id: string
  scene_id: string
  layer_id: string
  type: HubElement['type']
  name: string
  position_x: number
  position_y: number
  icon: PinIcon | null
  sprite: SpriteIcon | null
  panel_id: string | null
  badge_label: string | null
  nav_scene_id: string | null
  nav_focus_id: string | null
  nav_layers: string[] | null
  completed: boolean
  is_dangerous: boolean
  sort_order: number
}

export type PanelRow = {
  id: string
  type: Panel['type']
  title: string | null
  portrait: string | null
  subtitle: string | null
  content: MarkdownContent | null
  columns: string[] | null
  rows: TableCell[][] | null
  image: string | null
  cta: { label: string; href: string; quest?: string } | null
}

export type ResourceRow = PanelRow & {
  icon: string | null
  amount: string | null
  pinned: boolean
}

// ---------------------------------------------------------------------------
// Row -> domain object
// ---------------------------------------------------------------------------

export function rowToConfig(row: ConfigRow): HubConfig {
  return {
    title: row.title,
    defaultScene: row.default_scene_id,
    // Ignores row.assets_base_url on purpose — see getSupabaseAssetsBaseUrl's doc comment.
    assetsBaseUrl: getSupabaseAssetsBaseUrl(),
    featureFlags: (row.feature_flags ?? undefined) as HubConfig['featureFlags'],
  }
}

export function rowToScene(row: SceneRow): Scene {
  const layers: SceneLayer[] = (row.villazarcillo_scene_layers ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((layer) => ({ id: layer.id, name: layer.name, visible: layer.visible }))

  const scene: Scene = {
    id: row.id,
    name: row.name,
    background: row.background,
    size: { width: row.width, height: row.height },
    initialView: { center: [row.center_x, row.center_y], zoom: row.zoom },
    layers,
  }

  if (row.background_video) scene.backgroundVideo = row.background_video
  if (row.min_zoom !== null) scene.minZoom = row.min_zoom
  if (row.max_zoom !== null) scene.maxZoom = row.max_zoom

  return scene
}

export function rowToElement(row: ElementRow): HubElement {
  const element: HubElement = {
    id: row.id,
    sceneId: row.scene_id,
    layerId: row.layer_id,
    type: row.type,
    name: row.name,
    position: [row.position_x, row.position_y],
  }

  if (row.icon) element.icon = row.icon
  if (row.sprite) element.sprite = row.sprite
  if (row.panel_id) element.panelId = row.panel_id
  if (row.badge_label) element.badge = { label: row.badge_label }
  if (row.nav_scene_id) {
    const navigation: HubNavigationTarget = { sceneId: row.nav_scene_id }
    if (row.nav_focus_id) navigation.focusId = row.nav_focus_id
    if (row.nav_layers !== null) navigation.layers = row.nav_layers
    element.navigation = navigation
  }
  if (row.completed) element.completed = true
  if (row.is_dangerous) element.isDangerous = true

  return element
}

function basePanelFields(row: PanelRow) {
  const base: Record<string, unknown> = { id: row.id, type: row.type }
  if (row.title) base.title = row.title
  if (row.portrait) base.portrait = row.portrait
  if (row.subtitle) base.subtitle = row.subtitle
  if (row.cta) base.cta = row.cta
  return base
}

export function rowToPanel(row: PanelRow): Panel {
  const base = basePanelFields(row)

  if (row.type === 'markdown') {
    return { ...base, content: row.content ?? [] } as MarkdownPanel
  }
  if (row.type === 'table') {
    return { ...base, columns: row.columns ?? [], rows: row.rows ?? [] } as TablePanel
  }
  return { ...base, image: row.image ?? '' } as ImagePanel
}

export function rowToResource(row: ResourceRow): ResourcePanel {
  const panel = rowToPanel(row) as ResourcePanel
  if (row.icon) panel.icon = row.icon
  if (row.amount) panel.amount = row.amount
  panel.pinned = row.pinned
  return panel
}

// ---------------------------------------------------------------------------
// Domain object -> row (used by the admin write path)
// ---------------------------------------------------------------------------

export function configToRow(config: HubConfig): Omit<ConfigRow, 'id'> & { id: 1 } {
  return {
    id: 1,
    title: config.title,
    default_scene_id: config.defaultScene,
    assets_base_url: config.assetsBaseUrl,
    feature_flags: config.featureFlags ?? {},
  }
}

export function sceneToRow(scene: Scene, sortOrder: number): Omit<SceneRow, 'villazarcillo_scene_layers'> {
  return {
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
    sort_order: sortOrder,
  }
}

export function sceneLayersToRows(scene: Scene): SceneLayerRow[] {
  return scene.layers.map((layer, index) => ({
    scene_id: scene.id,
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    sort_order: index,
  }))
}

export function elementToRow(element: HubElement, sortOrder = 0): ElementRow {
  return {
    id: element.id,
    scene_id: element.sceneId,
    layer_id: element.layerId,
    type: element.type,
    name: element.name ?? '',
    position_x: element.position[0],
    position_y: element.position[1],
    icon: (element.icon as PinIcon) ?? null,
    sprite: (element.sprite as SpriteIcon) ?? null,
    panel_id: element.panelId ?? null,
    badge_label: element.badge?.label ?? null,
    nav_scene_id: element.navigation?.sceneId ?? null,
    nav_focus_id: element.navigation?.focusId ?? null,
    nav_layers: element.navigation?.layers ?? null,
    completed: Boolean(element.completed),
    is_dangerous: Boolean(element.isDangerous),
    sort_order: sortOrder,
  }
}

function panelToRowBase(panel: Panel): PanelRow {
  return {
    id: panel.id,
    type: panel.type,
    title: 'title' in panel ? panel.title ?? null : null,
    portrait: 'portrait' in panel ? panel.portrait ?? null : null,
    subtitle: 'subtitle' in panel ? panel.subtitle ?? null : null,
    content: panel.type === 'markdown' ? panel.content : null,
    columns: panel.type === 'table' ? panel.columns : null,
    rows: panel.type === 'table' ? panel.rows : null,
    image: panel.type === 'image' ? panel.image : null,
    cta: panel.cta ?? null,
  }
}

export function panelToRow(panel: Panel): PanelRow {
  return panelToRowBase(panel)
}

export function resourceToRow(resource: ResourcePanel): ResourceRow {
  return {
    ...panelToRowBase(resource),
    icon: resource.icon ?? null,
    amount: resource.amount ?? null,
    pinned: resource.pinned ?? true,
  }
}

export function elementIconIsPin(icon: ElementIcon | undefined): icon is PinIcon {
  return Boolean(icon) && icon!.kind === 'pin'
}
