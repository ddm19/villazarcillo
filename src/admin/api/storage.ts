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

// Matches the bucket's file_size_limit in supabase/schema.sql. Keep both in sync.
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export async function uploadAsset(folder: string, file: File): Promise<AssetEntry> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `"${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB, supera el límite configurado de ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Sube el límite del bucket en supabase/schema.sql (file_size_limit) y en Supabase Dashboard → Storage → Settings.`,
    )
  }

  const cleanName = file.name.replace(/\s+/g, '_')
  const fullPath = folder ? `${folder}/${cleanName}` : cleanName
  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    upsert: true,
    contentType: file.type || undefined,
  })
  if (error) {
    if (/exceeded the maximum allowed size|too large/i.test(error.message)) {
      throw new Error(
        `Supabase rechazó "${file.name}" por tamaño. Sube el límite global del proyecto en Supabase Dashboard → Storage → Settings (debe ser ≥ ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`,
      )
    }
    throw new Error(error.message)
  }

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
