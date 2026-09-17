import { supabase } from '../../services/supabaseClient'

const BUCKET = 'villazarcillo-assets'

export const ASSET_FOLDERS = ['maps', 'pins', 'portraits', 'boards/notes', 'resources', 'misc'] as const

export type AssetEntry = {
  path: string
  publicUrl: string
  size: number
  updatedAt: string
}

export function getPublicUrl(assetPath: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(assetPath).data.publicUrl
}

export async function listAssets(folder: string): Promise<AssetEntry[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter((entry) => entry.id !== null) // skip "placeholder" folder markers
    .map((entry) => {
      const fullPath = folder ? `${folder}/${entry.name}` : entry.name
      return {
        path: fullPath,
        publicUrl: getPublicUrl(fullPath),
        size: entry.metadata?.size ?? 0,
        updatedAt: entry.updated_at ?? '',
      }
    })
}

export async function uploadAsset(folder: string, file: File): Promise<AssetEntry> {
  const cleanName = file.name.replace(/\s+/g, '_')
  const fullPath = folder ? `${folder}/${cleanName}` : cleanName
  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    upsert: true,
    contentType: file.type || undefined,
  })
  if (error) throw new Error(error.message)

  return {
    path: fullPath,
    publicUrl: getPublicUrl(fullPath),
    size: file.size,
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteAsset(assetPath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([assetPath])
  if (error) throw new Error(error.message)
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}
