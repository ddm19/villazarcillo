import { useEffect, useRef, useState } from 'react'
import { ASSET_FOLDERS, listAssets, uploadAsset, type AssetEntry } from '../api/storage'
import { resolveAsset } from '../../lib/assets'
import { useFocusTrap } from '../../lib/useFocusTrap'

type AssetPickerModalProps = {
  initialFolder?: string
  onSelect: (path: string) => void
  onClose: () => void
}

function isVideo(path: string) {
  return /\.(mp4|webm)$/i.test(path)
}

function AssetPickerModal({ initialFolder, onSelect, onClose }: AssetPickerModalProps) {
  const [folder, setFolder] = useState(initialFolder ?? ASSET_FOLDERS[0])
  const [entries, setEntries] = useState<AssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const modalRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(true, modalRef)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAssets(folder)
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al listar assets')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [folder])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    setNotice(null)
    setUploadProgress(null)
    try {
      const notes: string[] = []
      for (const file of Array.from(files)) {
        const entry = await uploadAsset(folder, file, setUploadProgress)
        if (entry.conversionNote) notes.push(entry.conversionNote)
      }
      if (notes.length > 0) setNotice(notes.join(' '))
      const refreshed = await listAssets(folder)
      setEntries(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const filtered = entries.filter((entry) => entry.path.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-asset-picker" ref={modalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal__header">
          <h2>Seleccionar imagen</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="admin-asset-picker__toolbar">
          <div className="admin-asset-picker__folders">
            {ASSET_FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`admin-chip${f === folder ? ' admin-chip--active' : ''}`}
                onClick={() => setFolder(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="admin-asset-picker__search"
          />
          <label className="admin-button admin-button--primary admin-asset-picker__upload">
            {uploading
              ? uploadProgress !== null
                ? `Comprimiendo vídeo... ${Math.round(uploadProgress * 100)}%`
                : 'Subiendo...'
              : '+ Subir'}
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>

        {error && <p className="admin-form__error">{error}</p>}
        {notice && <p className="admin-form__success">{notice}</p>}

        <div className="admin-asset-picker__grid">
          {loading && <p>Cargando...</p>}
          {!loading && filtered.length === 0 && <p>No hay archivos en esta carpeta todavía.</p>}
          {filtered.map((entry) => (
            <button
              key={entry.path}
              type="button"
              className="admin-asset-picker__item"
              onClick={() => onSelect(entry.path)}
              title={entry.path}
            >
              {isVideo(entry.path) ? (
                <video src={entry.publicUrl} muted />
              ) : (
                <img src={entry.publicUrl} alt={entry.path} loading="lazy" />
              )}
              <span>{entry.path.split('/').pop()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

type AssetFieldProps = {
  label: string
  value?: string
  assetsBaseUrl: string
  folderHint?: string
  onChange: (path: string | undefined) => void
}

export function AssetField({ label, value, assetsBaseUrl, folderHint, onChange }: AssetFieldProps) {
  const [open, setOpen] = useState(false)
  const preview = value ? resolveAsset(assetsBaseUrl, value) : undefined

  return (
    <div className="admin-asset-field">
      <span className="admin-field__label">{label}</span>
      <div className="admin-asset-field__row">
        <div className="admin-asset-field__preview">
          {preview ? (
            isVideo(value ?? '') ? <video src={preview} muted /> : <img src={preview} alt="" />
          ) : (
            <span className="admin-asset-field__empty">Sin imagen</span>
          )}
        </div>
        <div className="admin-asset-field__actions">
          <span className="admin-asset-field__path">{value ?? '—'}</span>
          <div>
            <button type="button" className="admin-button" onClick={() => setOpen(true)}>
              Elegir...
            </button>
            {value && (
              <button type="button" className="admin-button admin-button--ghost" onClick={() => onChange(undefined)}>
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <AssetPickerModal
          initialFolder={folderHint}
          onClose={() => setOpen(false)}
          onSelect={(path) => {
            onChange(path)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
