import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// Loaded lazily from a CDN, only when an oversized video actually needs re-encoding —
// this is a ~25 MB WASM binary and has no business being in the app's normal bundle.
const CORE_VERSION = '0.12.6'
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`

let ffmpegPromise: Promise<FFmpeg> | null = null

function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      return ffmpeg
    })()
  }
  return ffmpegPromise
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la duración del vídeo'))
    }
    video.src = url
  })
}

export type CompressResult = { blob: Blob; bitrateKbps: number }

/**
 * Re-encodes an oversized video to fit under `maxBytes`, backing off the bitrate only as
 * much as needed. Audio is always dropped: every video in this app is a muted scene
 * background (see CampHub's <VideoOverlay muted />), so the audio track is dead weight —
 * removing it frees its entire bitrate budget for picture quality at no real cost.
 */
export async function compressVideoToFit(
  file: File,
  maxBytes: number,
  onProgress?: (ratio: number) => void,
): Promise<CompressResult | null> {
  const duration = await getVideoDuration(file)
  if (!duration || !Number.isFinite(duration)) return null

  const ffmpeg = await loadFFmpeg()
  const handleProgress = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)))
  }
  ffmpeg.on('progress', handleProgress)

  const inputName = `input${file.name.match(/\.\w+$/)?.[0] ?? '.mp4'}`
  const outputName = 'output.mp4'

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    let videoBitrateKbps = Math.max(300, Math.floor(((maxBytes * 8) / duration / 1000) * 0.9))
    let result: CompressResult | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      await ffmpeg.exec([
        '-i', inputName,
        '-an',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', `${videoBitrateKbps}k`,
        '-maxrate', `${Math.round(videoBitrateKbps * 1.2)}k`,
        '-bufsize', `${videoBitrateKbps * 2}k`,
        '-movflags', '+faststart',
        '-y',
        outputName,
      ])

      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([(data as Uint8Array).slice()], { type: 'video/mp4' })
      await ffmpeg.deleteFile(outputName)

      if (blob.size <= maxBytes) {
        result = { blob, bitrateKbps: videoBitrateKbps }
        break
      }
      videoBitrateKbps = Math.floor(videoBitrateKbps * 0.65)
    }

    return result
  } finally {
    ffmpeg.off('progress', handleProgress)
    await ffmpeg.deleteFile(inputName).catch(() => {})
  }
}
