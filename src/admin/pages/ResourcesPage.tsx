import { useEffect, useState } from 'react'
import type { ResourcePanel } from '../../lib/types'
import { deleteResource, fetchQuestNames, fetchResources, saveResource } from '../api/adminApi'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'
import { DataTable } from '../components/DataTable'
import { useConfirm } from '../components/useConfirm'

function emptyResource(): PanelFormValue {
  return { id: '', type: 'markdown', title: '', content: [], pinned: true }
}

export function ResourcesPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [resources, setResources] = useState<ResourcePanel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [editing, setEditing] = useState<PanelFormValue | null>(null)
  const [loading, setLoading] = useState(true)
  const confirmDialog = useConfirm()

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
    const ok = await confirmDialog({
      title: 'Eliminar recurso',
      message: `¿Eliminar "${editing.id}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
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
        <DataTable
          rows={resources}
          getRowKey={(resource) => resource.id}
          onRowClick={setEditing}
          emptyMessage="No hay recursos todavía."
          columns={[
            { key: 'id', header: 'Id', render: (resource) => resource.id },
            { key: 'title', header: 'Título', render: (resource) => resource.title ?? '—' },
            { key: 'amount', header: 'Cantidad', render: (resource) => resource.amount ?? '—' },
            { key: 'pinned', header: 'Fijado', render: (resource) => (resource.pinned !== false ? 'Sí' : 'No') },
          ]}
        />
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
