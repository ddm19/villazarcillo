import { useEffect, useMemo, useState } from 'react'
import type { Panel } from '../../lib/types'
import { deletePanel, fetchElementsUsingPanel, fetchPanels, fetchQuestNames, savePanel } from '../api/adminApi'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'

function emptyPanel(): PanelFormValue {
  return { id: '', type: 'markdown', title: '', content: [] }
}

export function PanelsPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [panels, setPanels] = useState<Panel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<PanelFormValue | null>(null)
  const [usedBy, setUsedBy] = useState<Awaited<ReturnType<typeof fetchElementsUsingPanel>>>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [panelList, quests] = await Promise.all([fetchPanels(), fetchQuestNames()])
    setPanels(panelList)
    setQuestNames(quests)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return panels.filter(
      (p) => p.id.toLowerCase().includes(term) || (p.title ?? '').toLowerCase().includes(term) || p.type.includes(term),
    )
  }, [panels, search])

  const openEditor = async (panel: PanelFormValue) => {
    setEditing(panel)
    setUsedBy(panel.id ? await fetchElementsUsingPanel(panel.id) : [])
  }

  const handleSave = async (value: PanelFormValue) => {
    await savePanel(value)
    setEditing(null)
    await refresh()
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm('¿Eliminar este panel? Los elementos que lo usen dejarán de tener panel asociado.')) return
    await deletePanel(editing.id)
    setEditing(null)
    await refresh()
  }

  const handleDuplicate = (panel: Panel) => {
    openEditor({ ...panel, id: `${panel.id}_copia` })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Paneles</h1>
        <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="admin-button admin-button--primary" onClick={() => openEditor(emptyPanel())}>
          + Nuevo panel
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Id</th><th>Tipo</th><th>Título</th><th /></tr>
          </thead>
          <tbody>
            {filtered.map((panel) => (
              <tr key={panel.id}>
                <td>{panel.id}</td>
                <td>{panel.type}</td>
                <td>{panel.title ?? '—'}</td>
                <td>
                  <button type="button" className="admin-button" onClick={() => openEditor(panel)}>Editar</button>
                  <button type="button" className="admin-button" onClick={() => handleDuplicate(panel)}>Duplicar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <PanelEditor
          variant="panel"
          value={editing}
          assetsBaseUrl={assetsBaseUrl}
          questNames={questNames}
          usedBy={usedBy}
          onSave={handleSave}
          onDelete={editing.id ? handleDelete : undefined}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
