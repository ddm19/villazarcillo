import { supabase } from '../services/supabaseClient'

// Single source of truth for the Storage bucket name — admin/api/storage.ts imports this
// too, so it can never drift from what dataLoader/resolveAsset resolve against.
export const ASSETS_BUCKET = 'villazarcillo-assets'

/**
 * The public base URL for the assets bucket, computed straight from the Supabase client
 * (same call the Assets admin page uses to preview uploads) instead of trusting
 * villazarcillo_config.assets_base_url — a manually pasted string that's easy to typo or
 * leave stale, and when wrong produces exactly the "loads fine in Assets but broken (?)
 * everywhere else" symptom, since Assets always used this same computed URL already.
 */
export function getSupabaseAssetsBaseUrl(): string {
  return supabase.storage.from(ASSETS_BUCKET).getPublicUrl('').data.publicUrl
}

export function resolveAsset(base: string, assetPath?: string) {
  if (!assetPath) {
    return ''
  }
  if (/^(?:[a-z]+:)?\/\//i.test(assetPath)) {
    return assetPath
  }
  if (assetPath.startsWith('/')) {
    return assetPath
  }
  const normalizedBase = normalizeBase(base)
  return `${normalizedBase}${assetPath}`
}

export function normalizeBase(base: string) {
  if (/^(?:[a-z]+:)?\/\//i.test(base)) {
    return base.endsWith('/') ? base : `${base}/`
  }
  if (base.startsWith('/')) {
    return base.endsWith('/') ? base : `${base}/`
  }
  const root = import.meta.env.BASE_URL ?? '/'
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`
  const trimmedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedRoot}${trimmedBase}`
}
