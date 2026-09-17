import { useEffect, useState } from 'react'
import type { ResourcePanel } from '../../lib/types'
import { deleteResource, fetchQuestNames, fetchResources, saveResource } from '../api/adminApi'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'

function emptyResource(): PanelFormValue {
  return { id: '', type: 'markdown', title: '', content: [], pinned: true }
}

export function ResourcesPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [resources, setResources] = useState<ResourcePanel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [editing, setEditing] = useState<PanelFormValue | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [list, quests] = await Promise.all([fetchResources(), fetchQuestNames()])
    setResources(list)
    setQuestNames(quests)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSave = async (value: PanelFormValue) => {
    await saveResource(value as ResourcePanel)
    setEditing(null)
    await refresh()
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm('¿Eliminar este recurso?')) return
    await deleteResource(editing.id)
    setEditing(null)
    await refresh()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Recursos del campamento</h1>
        <button type="button" className="admin-button admin-button--primary" onClick={() => setEditing(emptyResource())}>
          + Nuevo recurso
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Id</th><th>Título</th><th>Cantidad</th><th>Fijado</th><th /></tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.id}</td>
                <td>{resource.title ?? '—'}</td>
                <td>{resource.amount ?? '—'}</td>
                <td>{resource.pinned !== false ? 'Sí' : 'No'}</td>
                <td>
                  <button type="button" className="admin-button" onClick={() => setEditing(resource)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <PanelEditor
          variant="resource"
          value={editing}
          assetsBaseUrl={assetsBaseUrl}
          questNames={questNames}
          onSave={handleSave}
          onDelete={editing.id ? handleDelete : undefined}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
