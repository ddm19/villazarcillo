export type FeatureFlags = {
  miniMap?: boolean
}

export type HubConfig = {
  title: string
  defaultScene: string
  assetsBaseUrl: string
  featureFlags?: FeatureFlags
}

export type SceneLayer = {
  id: string
  name: string
  visible: boolean
}

export type Scene = {
  id: string
  name: string
  background: string
  size: {
    width: number
    height: number
  }
  initialView: {
    center: [number, number]
    zoom: number
  }
  minZoom?: number
  maxZoom?: number
  layers: SceneLayer[]
}

export type PinIcon = {
  kind: 'pin'
  colorVar?: string
}

export type SpriteIcon = {
  kind?: 'sprite'
  src: string
  width: number
  height: number
  rotation?: number
}

export type ElementIcon = PinIcon | SpriteIcon

export type HubElement = {
  id: string
  sceneId: string
  layerId: string
  type: 'npc' | 'shop' | 'quest' | 'image' | 'note' | 'generic'
  name: string
  position: [number, number]
  icon?: PinIcon
  sprite?: SpriteIcon
  panelId?: string
  badge?: {
    label: string
  }
}

export type MarkdownPanel = {
  id: string
  type: 'markdown'
  title: string
  portrait?: string
  content: string
}

export type TableCell =
  | string
  | {
      text: string
      href?: string
    }

export type TablePanel = {
  id: string
  type: 'table'
  title: string
  subtitle?: string
  columns: string[]
  rows: TableCell[][]
}

export type ImagePanel = {
  id: string
  type: 'image'
  title: string
  image: string
  cta?: {
    label: string
    href: string
  }
}

export type Panel = MarkdownPanel | TablePanel | ImagePanel

export type DataBundle = {
  config: HubConfig
  scenes: Scene[]
  elements: HubElement[]
  panels: Panel[]
}
