import { useEffect, useMemo, useState } from 'react'
import type { Panel } from '../../lib/types'
import { deletePanel, fetchElements, fetchElementsUsingPanel, fetchPanels, fetchQuestNames, savePanel } from '../api/adminApi'
import { PanelEditor, type PanelFormValue } from '../components/PanelEditor'
import { DataTable } from '../components/DataTable'
import { useConfirm } from '../components/useConfirm'
import { usePersistedState } from '../usePersistedState'

function emptyPanel(): PanelFormValue {
  return { id: '', type: 'markdown', title: '', content: [] }
}

type CtaFilter = 'all' | 'with' | 'without'
type UsageFilter = 'all' | 'used' | 'orphan'

type PanelFilters = {
  search: string
  cta: CtaFilter
  usage: UsageFilter
}

const DEFAULT_FILTERS: PanelFilters = { search: '', cta: 'all', usage: 'all' }

export function PanelsPage({ assetsBaseUrl }: { assetsBaseUrl: string }) {
  const [panels, setPanels] = useState<Panel[]>([])
  const [questNames, setQuestNames] = useState<string[]>([])
  const [usedPanelIds, setUsedPanelIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = usePersistedState<PanelFilters>('villazarcillo-admin:panels-filters', DEFAULT_FILTERS)
  const [editing, setEditing] = useState<PanelFormValue | null>(null)
  const [usedBy, setUsedBy] = useState<Awaited<ReturnType<typeof fetchElementsUsingPanel>>>([])
  const [loading, setLoading] = useState(true)
  const confirmDialog = useConfirm()

  const refresh = async () => {
    setLoading(true)
    const [panelList, quests, allElements] = await Promise.all([fetchPanels(), fetchQuestNames(), fetchElements()])
    setPanels(panelList)
    setQuestNames(quests)
    setUsedPanelIds(new Set(allElements.map((el) => el.panelId).filter((id): id is string => Boolean(id))))
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const term = filters.search.toLowerCase()
    return panels.filter((panel) => {
      if (term) {
        const matchesText =
          panel.id.toLowerCase().includes(term) || (panel.title ?? '').toLowerCase().includes(term) || panel.type.includes(term)
        if (!matchesText) return false
      }
      const hasCta = Boolean(panel.cta?.quest)
      if (filters.cta === 'with' && !hasCta) return false
      if (filters.cta === 'without' && hasCta) return false
      const isUsed = usedPanelIds.has(panel.id)
      if (filters.usage === 'used' && !isUsed) return false
      if (filters.usage === 'orphan' && isUsed) return false
      return true
    })
  }, [panels, filters, usedPanelIds])

  const hasActiveFilters = filters.search !== '' || filters.cta !== 'all' || filters.usage !== 'all'

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
    const ok = await confirmDialog({
      title: 'Eliminar panel',
      message: `¿Eliminar "${editing.id}"? Los elementos que lo usen dejarán de tener panel asociado.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
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
        <button type="button" className="admin-button admin-button--primary" onClick={() => openEditor(emptyPanel())}>
          + Nuevo panel
        </button>
      </div>

      <div className="admin-filter-bar">
        <input
          placeholder="Buscar por id, título o tipo..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.cta} onChange={(e) => setFilters({ ...filters, cta: e.target.value as CtaFilter })}>
          <option value="all">CTA: todos</option>
          <option value="with">Con misión (CTA)</option>
          <option value="without">Sin misión (CTA)</option>
        </select>
        <select value={filters.usage} onChange={(e) => setFilters({ ...filters, usage: e.target.value as UsageFilter })}>
          <option value="all">Uso: todos</option>
          <option value="used">Usados en el mapa</option>
          <option value="orphan">Huérfanos (no usados en ningún sitio)</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="admin-button admin-button--ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpiar filtros
          </button>
        )}
        <span className="admin-field__hint">{filtered.length} de {panels.length}</span>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <DataTable
          rows={filtered}
          getRowKey={(panel) => panel.id}
          onRowClick={openEditor}
          emptyMessage={panels.length === 0 ? 'No hay paneles todavía.' : 'Ningún panel coincide con los filtros.'}
          columns={[
            { key: 'id', header: 'Id', render: (panel) => panel.id },
            { key: 'type', header: 'Tipo', render: (panel) => panel.type },
            { key: 'title', header: 'Título', render: (panel) => panel.title ?? '—' },
            { key: 'cta', header: 'Misión', render: (panel) => panel.cta?.quest ?? '—' },
            {
              key: 'usage',
              header: 'Uso',
              render: (panel) =>
                usedPanelIds.has(panel.id) ? (
                  <span>en el mapa</span>
                ) : (
                  <span className="admin-tag admin-tag--warning">huérfano</span>
                ),
            },
            {
              key: 'actions',
              header: '',
              isActions: true,
              render: (panel) => (
                <button type="button" className="admin-button" onClick={() => handleDuplicate(panel)}>
                  Duplicar
                </button>
              ),
            },
          ]}
        />
      )}

      {editing && (
        <PanelEditor
          key={editing.id || 'new'}
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
