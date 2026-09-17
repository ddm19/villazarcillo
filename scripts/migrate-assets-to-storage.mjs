// One-time migration: public/assets/** -> Supabase Storage bucket "villazarcillo-assets".
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/migrate-assets-to-storage.mjs
//
// Requires the SERVICE ROLE key (bypasses RLS) — never commit it, never use it in the client bundle.
// Run supabase/schema.sql first (it creates the bucket + policies).
//
// After this finishes, update villazarcillo_config.assets_base_url to the printed public URL
// (either via the /admin > Config screen once it exists, or with a manual SQL update).

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(__dirname, '../public/assets')
const BUCKET = 'villazarcillo-assets'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else {
      files.push(full)
    }
  }
  return files
}

async function main() {
  const files = await walk(assetsDir)
  console.log(`Found ${files.length} file(s) under ${assetsDir}`)

  let uploaded = 0
  for (const filePath of files) {
    const relativePath = path.relative(assetsDir, filePath).split(path.sep).join('/')
    const ext = path.extname(filePath).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
    const buffer = await readFile(filePath)
    const size = (await stat(filePath)).size

    const { error } = await supabase.storage.from(BUCKET).upload(relativePath, buffer, {
      contentType,
      upsert: true,
    })

    if (error) {
      console.error(`FAILED  ${relativePath}: ${error.message}`)
      continue
    }

    uploaded += 1
    console.log(`OK      ${relativePath} (${(size / 1024).toFixed(1)} KB)`)
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl('')
  console.log(`\nUploaded ${uploaded}/${files.length} file(s).`)
  console.log(`Public base URL: ${publicUrlData.publicUrl}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
