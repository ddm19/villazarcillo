import { supabase } from '../../services/supabaseClient'
import { compressVideoToFit } from './videoCompress'

const BUCKET = 'villazarcillo-assets'

export const ASSET_FOLDERS = ['maps', 'pins', 'portraits', 'boards/notes', 'resources', 'misc'] as const

export type AssetEntry = {
  path: string
  publicUrl: string
  size: number
  updatedAt: string
  /** Set when uploadAsset had to re-encode the file to fit under Supabase's size limit. */
  conversionNote?: string
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

// Matches the bucket's file_size_limit in supabase/schema.sql. Relevant if/when the
// project moves off the free plan; raise both together.
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

// Supabase's free-tier plan hard-caps every uploaded file at 50 MB, regardless of the
// bucket's own file_size_limit — this cannot be raised from the client or from schema.sql.
const FREE_TIER_HARD_LIMIT = 50 * 1024 * 1024

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Re-encodes an oversized image as WebP, reducing quality first and only shrinking
 * resolution as a last resort, so we lose as little visual quality as possible while
 * getting under `maxBytes`. Returns null if it still doesn't fit after every attempt.
 */
async function reencodeImageToFit(
  file: File,
  maxBytes: number,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  const bitmap = await createImageBitmap(file)
  const qualitySteps = [0.92, 0.85, 0.75, 0.65, 0.5]
  const scaleSteps = [1, 0.75, 0.55, 0.4]

  try {
    for (const scale of scaleSteps) {
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(bitmap, 0, 0, width, height)

      for (const quality of qualitySteps) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
        if (blob && blob.size <= maxBytes) {
          return { blob, width, height }
        }
      }
    }
    return null
  } finally {
    bitmap.close()
  }
}

export async function uploadAsset(
  folder: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<AssetEntry> {
  let uploadBody: File | Blob = file
  let uploadName = file.name.replace(/\s+/g, '_')
  let conversionNote: string | undefined

  if (file.type.startsWith('image/') && file.size > FREE_TIER_HARD_LIMIT) {
    const result = await reencodeImageToFit(file, FREE_TIER_HARD_LIMIT)
    if (!result) {
      throw new Error(
        `"${file.name}" pesa ${formatMB(file.size)}. El plan gratuito de Supabase limita cada archivo a 50 MB y no se ha podido bajar de ahí conservando una calidad razonable. Reduce la resolución de origen e inténtalo de nuevo.`,
      )
    }
    uploadBody = result.blob
    uploadName = uploadName.replace(/\.\w+$/, '') + '.webp'
    conversionNote = `Convertida automáticamente a WebP para caber en el límite de 50 MB del plan gratuito de Supabase: ${formatMB(file.size)} → ${formatMB(result.blob.size)} (se mantiene la resolución original, ${result.width}×${result.height}).`
  } else if (file.type.startsWith('video/') && file.size > FREE_TIER_HARD_LIMIT) {
    const result = await compressVideoToFit(file, FREE_TIER_HARD_LIMIT, onProgress)
    if (!result) {
      throw new Error(
        `"${file.name}" pesa ${formatMB(file.size)}. El plan gratuito de Supabase limita cada archivo a 50 MB y no se ha podido bajar de ahí ni reduciendo el bitrate al mínimo razonable. Recorta la duración o la resolución del vídeo de origen e inténtalo de nuevo.`,
      )
    }
    uploadBody = result.blob
    uploadName = uploadName.replace(/\.\w+$/, '') + '.mp4'
    conversionNote = `Recomprimida automáticamente a ~${result.bitrateKbps} kbps para caber en el límite de 50 MB del plan gratuito de Supabase: ${formatMB(file.size)} → ${formatMB(result.blob.size)}. Se eliminó el audio (los vídeos de fondo se reproducen siempre en silencio).`
  } else if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `"${file.name}" pesa ${formatMB(file.size)}, supera el límite configurado de ${formatMB(MAX_UPLOAD_BYTES)}. Sube el límite del bucket en supabase/schema.sql (file_size_limit) y en Supabase Dashboard → Storage → Settings.`,
    )
  }

  const fullPath = folder ? `${folder}/${uploadName}` : uploadName
  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, uploadBody, {
    upsert: true,
    contentType: uploadBody instanceof Blob && uploadBody.type ? uploadBody.type : file.type || undefined,
  })
  if (error) {
    if (/exceeded the maximum allowed size|too large/i.test(error.message)) {
      throw new Error(
        `Supabase rechazó "${file.name}" por tamaño (${formatMB(uploadBody.size)}) aunque ya se había reducido automáticamente. Sube el límite del plan de Supabase o reduce el archivo de origen manualmente.`,
      )
    }
    throw new Error(error.message)
  }

  return {
    path: fullPath,
    publicUrl: getPublicUrl(fullPath),
    size: uploadBody.size,
    updatedAt: new Date().toISOString(),
    conversionNote,
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
