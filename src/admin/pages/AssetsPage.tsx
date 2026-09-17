import { useEffect, useState } from 'react'
import { ASSET_FOLDERS, deleteAsset, listAssets, uploadAsset, type AssetEntry } from '../api/storage'

export function AssetsPage() {
  const [folder, setFolder] = useState<string>(ASSET_FOLDERS[0])
  const [entries, setEntries] = useState<AssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      setEntries(await listAssets(folder))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al listar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        await uploadAsset(folder, file)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`¿Borrar "${path}"? Comprueba antes que ningún panel, elemento o escena lo esté usando.`)) return
    await deleteAsset(path)
    await refresh()
  }

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
    } catch {
      // clipboard permission denied; ignore silently, path is still visible on screen
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Assets</h1>
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
        <label className="admin-button admin-button--primary">
          {uploading ? 'Subiendo...' : '+ Subir'}
          <input type="file" accept="image/*,video/mp4" multiple hidden disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
        </label>
      </div>

      {error && <p className="admin-form__error">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="admin-asset-picker__grid">
          {entries.length === 0 && <p>No hay archivos en esta carpeta.</p>}
          {entries.map((entry) => (
            <div key={entry.path} className="admin-asset-picker__item admin-asset-picker__item--browse">
              {/\.(mp4|webm)$/i.test(entry.path) ? <video src={entry.publicUrl} muted /> : <img src={entry.publicUrl} alt={entry.path} loading="lazy" />}
              <span>{entry.path.split('/').pop()}</span>
              <div className="admin-asset-picker__item-actions">
                <button type="button" className="admin-button" onClick={() => copyPath(entry.path)}>Copiar ruta</button>
                <button type="button" className="admin-button admin-button--danger" onClick={() => handleDelete(entry.path)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
