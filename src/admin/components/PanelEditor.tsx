import { useRef, useState } from 'react'
import type { HubElement, MarkdownBlock, Panel, ResourcePanel, TableCell } from '../../lib/types'
import { MarkdownBlockEditor } from './MarkdownBlockEditor'
import { TableGridEditor } from './TableGridEditor'
import { AssetField } from './AssetPicker'
import { ToggleSwitch } from './ToggleSwitch'
import { JsonEscapeHatch } from './JsonEscapeHatch'
import { renderMarkdownContent } from '../../lib/markdownRenderer'
import { useFocusTrap } from '../../lib/useFocusTrap'

export type PanelFormValue = Panel & Partial<Pick<ResourcePanel, 'icon' | 'amount' | 'pinned'>>

type PanelEditorProps = {
  variant: 'panel' | 'resource'
  value: PanelFormValue
  assetsBaseUrl: string
  questNames: string[]
  usedBy?: HubElement[]
  onSave: (value: PanelFormValue) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

function withType(value: PanelFormValue, type: Panel['type']): PanelFormValue {
  const base = { id: value.id, title: 'title' in value ? value.title : undefined, portrait: 'portrait' in value ? value.portrait : undefined, cta: value.cta, icon: value.icon, amount: value.amount, pinned: value.pinned }
  if (type === 'markdown') {
    return { ...base, type, subtitle: 'subtitle' in value ? value.subtitle : undefined, content: 'content' in value ? value.content : [] } as PanelFormValue
  }
  if (type === 'table') {
    return {
      ...base,
      type,
      subtitle: 'subtitle' in value ? value.subtitle : undefined,
      columns: 'columns' in value ? value.columns : ['Columna 1'],
      rows: 'rows' in value ? value.rows : [['']],
    } as PanelFormValue
  }
  return { ...base, type, title: base.title ?? '', image: 'image' in value ? value.image : '' } as PanelFormValue
}

export function PanelEditor({ variant, value, assetsBaseUrl, questNames, usedBy, onSave, onDelete, onCancel }: PanelEditorProps) {
  const [form, setForm] = useState<PanelFormValue>(value)
  const [hasCta, setHasCta] = useState(Boolean(value.cta))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(true, drawerRef)

  const update = (patch: Partial<PanelFormValue>) => setForm((prev) => ({ ...prev, ...patch } as PanelFormValue))

  const handleSave = async () => {
    setError(null)
    if (!form.id.trim()) {
      setError('El id es obligatorio.')
      return
    }
    setSaving(true)
    try {
      await onSave(hasCta ? form : { ...form, cta: undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-drawer" ref={drawerRef}>
      <div className="admin-drawer__header">
        <h2>{variant === 'resource' ? 'Recurso' : 'Panel'}: {form.id || '(nuevo)'}</h2>
        <JsonEscapeHatch
          value={form}
          onApply={(next) => setForm(next)}
          validate={(obj) => {
            if (typeof obj !== 'object' || obj === null) return 'Debe ser un objeto JSON'
            const record = obj as Record<string, unknown>
            if (!record.id || typeof record.id !== 'string') return 'Falta el campo "id"'
            if (!['markdown', 'table', 'image'].includes(record.type as string)) return 'type debe ser markdown, table o image'
            return null
          }}
        />
      </div>

      <div className="admin-form">
        <label className="admin-field">
          <span>Id</span>
          <input value={form.id} onChange={(e) => update({ id: e.target.value })} placeholder="panel:mi_panel" />
        </label>

        <label className="admin-field">
          <span>Tipo</span>
          <select value={form.type} onChange={(e) => setForm(withType(form, e.target.value as Panel['type']))}>
            <option value="markdown">Texto (markdown)</option>
            <option value="table">Tabla / inventario</option>
            <option value="image">Imagen</option>
          </select>
        </label>

        <label className="admin-field">
          <span>Título</span>
          <input value={form.title ?? ''} onChange={(e) => update({ title: e.target.value })} />
        </label>

        {form.type !== 'image' && (
          <>
            <AssetField
              label="Retrato"
              assetsBaseUrl={assetsBaseUrl}
              folderHint="portraits"
              value={form.portrait}
              onChange={(portrait) => update({ portrait })}
            />
            <label className="admin-field">
              <span>Subtítulo (markdown/HTML corto)</span>
              <textarea rows={3} value={form.subtitle ?? ''} onChange={(e) => update({ subtitle: e.target.value })} />
              {form.subtitle && <div className="admin-markdown-editor__preview">{renderMarkdownContent(form.subtitle)}</div>}
            </label>
          </>
        )}

        {form.type === 'markdown' && (
          <div className="admin-field">
            <span>Contenido</span>
            <MarkdownBlockEditor
              blocks={(form.content as MarkdownBlock[]) ?? []}
              assetsBaseUrl={assetsBaseUrl}
              onChange={(content) => update({ content })}
            />
          </div>
        )}

        {form.type === 'table' && (
          <div className="admin-field">
            <span>Filas y columnas</span>
            <TableGridEditor
              columns={form.columns ?? []}
              rows={(form.rows as TableCell[][]) ?? []}
              assetsBaseUrl={assetsBaseUrl}
              onChange={(columns, rows) => update({ columns, rows })}
            />
          </div>
        )}

        {form.type === 'image' && (
          <AssetField
            label="Imagen"
            assetsBaseUrl={assetsBaseUrl}
            folderHint="boards/notes"
            value={form.image}
            onChange={(image) => update({ image: image ?? '' })}
          />
        )}

        {variant === 'resource' && (
          <>
            <AssetField
              label="Icono (HUD)"
              assetsBaseUrl={assetsBaseUrl}
              folderHint="pins"
              value={form.icon}
              onChange={(icon) => update({ icon })}
            />
            <label className="admin-field">
              <span>Cantidad (ej. "x2")</span>
              <input value={form.amount ?? ''} onChange={(e) => update({ amount: e.target.value })} />
            </label>
            <ToggleSwitch
              label="Fijado en la barra de recursos"
              checked={form.pinned !== false}
              onChange={(pinned) => update({ pinned })}
            />
          </>
        )}

        <ToggleSwitch label="Tiene botón de acción (CTA)" checked={hasCta} onChange={setHasCta} />
        {hasCta && (
          <div className="admin-cta-fields">
            <label className="admin-field">
              <span>Texto del botón</span>
              <input value={form.cta?.label ?? ''} onChange={(e) => update({ cta: { ...form.cta, label: e.target.value, href: form.cta?.href ?? '' } })} />
            </label>
            <label className="admin-field">
              <span>Enlace (href)</span>
              <input value={form.cta?.href ?? ''} onChange={(e) => update({ cta: { ...form.cta, href: e.target.value, label: form.cta?.label ?? '' } })} />
            </label>
            <label className="admin-field">
              <span>Nombre de misión (quest)</span>
              <input
                list="admin-quest-names"
                value={form.cta?.quest ?? ''}
                onChange={(e) => update({ cta: { label: form.cta?.label ?? '', href: form.cta?.href ?? '', quest: e.target.value } })}
              />
              <datalist id="admin-quest-names">
                {questNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>
        )}

        {usedBy && usedBy.length > 0 && (
          <div className="admin-field">
            <span>Usado por estos elementos del mapa</span>
            <ul className="admin-used-by">
              {usedBy.map((el) => (
                <li key={el.id}>{el.name} ({el.id})</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="admin-form__error">{error}</p>}

        <div className="admin-drawer__actions">
          <button type="button" className="admin-button admin-button--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="admin-button" onClick={onCancel}>Cancelar</button>
          {onDelete && (
            <button type="button" className="admin-button admin-button--danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
