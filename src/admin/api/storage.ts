import { supabase } from '../../services/supabaseClient'
import { ASSETS_BUCKET as BUCKET } from '../../lib/assets'

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

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Storage object keys are picky about anything beyond ASCII letters/digits/._- (accents,
// ñ, parentheses, emoji in a phone-camera filename, etc. can make Supabase reject the
// upload outright with a bare 400 and no useful body) — strip it all before it gets there.
function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf('.')
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name
  const ext = dotIndex > 0 ? name.slice(dotIndex) : ''
  const cleanBase =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'archivo'
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '')
  return `${cleanBase}${cleanExt}`
}

function describeStorageError(error: { message?: string; name?: string; status?: number; statusCode?: string | number }): string {
  const parts = [error.message, error.statusCode ? `código ${error.statusCode}` : null, error.status ? `HTTP ${error.status}` : null]
    .filter(Boolean)
    .join(' — ')
  return parts || 'Supabase devolvió un error sin detalles (revisa la consola, se ha volcado el objeto completo).'
}

export async function uploadAsset(folder: string, file: File): Promise<AssetEntry> {
  const uploadName = sanitizeFileName(file.name)
  const fullPath = folder ? `${folder}/${uploadName}` : uploadName

  let uploadError: { message?: string; name?: string; status?: number; statusCode?: string | number } | null = null
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    uploadError = error
  } catch (err) {
    // A network/CORS-level failure can reject instead of resolving with { error } — treat it the same way.
    uploadError = err as typeof uploadError
  }

  if (uploadError) {
    console.error('Fallo al subir a Supabase Storage:', { fullPath, contentType: file.type, size: file.size, error: uploadError })
    if (/exceeded the maximum allowed size|too large/i.test(uploadError.message ?? '')) {
      throw new Error(
        `Supabase rechazó "${file.name}" por tamaño (${formatMB(file.size)}). El plan gratuito de Supabase limita cada archivo a 50 MB — reduce el archivo de origen e inténtalo de nuevo.`,
      )
    }
    throw new Error(`No se pudo subir "${file.name}": ${describeStorageError(uploadError)}`)
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
