import { useEffect, useMemo, useState } from 'react'
import type { ResourcePanel } from '../../lib/types'
import { deleteResource, fetchQuestNames, fetchResources, saveResource } from '../api/adminApi'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'
import { DataTable } from '../components/DataTable'
import { useConfirm } from '../components/useConfirm'
import { usePersistedState } from '../usePersistedState'

function emptyResource(): PanelFormValue {
  return { id: '', type: 'markdown', title: '', content: [], pinned: true }
}

type PinnedFilter = 'all' | 'pinned' | 'unpinned'

type ResourceFilters = {
  search: string
  pinned: PinnedFilter
}

const DEFAULT_FILTERS: ResourceFilters = { search: '', pinned: 'all' }

export function ResourcesPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [resources, setResources] = useState<ResourcePanel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [filters, setFilters] = usePersistedState<ResourceFilters>('villazarcillo-admin:resources-filters', DEFAULT_FILTERS)
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

  const filtered = useMemo(() => {
    const term = filters.search.toLowerCase()
    return resources.filter((resource) => {
      if (term && !(resource.id.toLowerCase().includes(term) || (resource.title ?? '').toLowerCase().includes(term))) return false
      const isPinned = resource.pinned !== false
      if (filters.pinned === 'pinned' && !isPinned) return false
      if (filters.pinned === 'unpinned' && isPinned) return false
      return true
    })
  }, [resources, filters])

  const hasActiveFilters = filters.search !== '' || filters.pinned !== 'all'

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

      <div className="admin-filter-bar">
        <input
          placeholder="Buscar por id o título..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.pinned} onChange={(e) => setFilters({ ...filters, pinned: e.target.value as PinnedFilter })}>
          <option value="all">Fijado: todos</option>
          <option value="pinned">Fijados</option>
          <option value="unpinned">No fijados</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="admin-button admin-button--ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpiar filtros
          </button>
        )}
        <span className="admin-field__hint">{filtered.length} de {resources.length}</span>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <DataTable
          rows={filtered}
          getRowKey={(resource) => resource.id}
          onRowClick={setEditing}
          emptyMessage={resources.length === 0 ? 'No hay recursos todavía.' : 'Ningún recurso coincide con los filtros.'}
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
          key={editing.id || 'new'}
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
