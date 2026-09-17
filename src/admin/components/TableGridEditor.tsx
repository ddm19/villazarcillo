import { useState } from 'react'
import type { TableCell } from '../../lib/types'
import { AssetField } from './AssetPicker'
import { resolveAsset } from '../../lib/assets'

type TableGridEditorProps = {
  columns: string[]
  rows: TableCell[][]
  assetsBaseUrl: string
  onChange: (columns: string[], rows: TableCell[][]) => void
}

type CellKind = 'text' | 'markdown' | 'link' | 'image'

function cellKind(cell: TableCell): CellKind {
  if (typeof cell === 'string') return 'text'
  if ('markdown' in cell) {
    return typeof cell.markdown === 'string' && /<img /i.test(cell.markdown) ? 'image' : 'markdown'
  }
  return 'link'
}

function cellPreview(cell: TableCell): string {
  if (typeof cell === 'string') return cell || '(vacío)'
  if ('href' in cell) return cell.text || cell.href || '(vacío)'
  if ('markdown' in cell) {
    const text = typeof cell.markdown === 'string' ? cell.markdown : JSON.stringify(cell.markdown)
    return /<img /i.test(text) ? '🖼️ Imagen' : text || '(vacío)'
  }
  return '(vacío)'
}

export function TableGridEditor({ columns, rows, assetsBaseUrl, onChange }: TableGridEditorProps) {
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)

  const updateColumn = (index: number, name: string) => {
    const next = columns.slice()
    next[index] = name
    onChange(next, rows)
  }

  const addColumn = () => {
    onChange([...columns, `Columna ${columns.length + 1}`], rows.map((row) => [...row, '']))
  }

  const removeColumn = (index: number) => {
    onChange(
      columns.filter((_, i) => i !== index),
      rows.map((row) => row.filter((_, i) => i !== index)),
    )
    setSelected(null)
  }

  const addRow = () => {
    onChange(columns, [...rows, columns.map(() => '')])
  }

  const duplicateRow = (index: number) => {
    const next = rows.slice()
    next.splice(index + 1, 0, JSON.parse(JSON.stringify(rows[index])))
    onChange(columns, next)
  }

  const removeRow = (index: number) => {
    onChange(columns, rows.filter((_, i) => i !== index))
    setSelected(null)
  }

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    const next = rows.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(columns, next)
  }

  const setCell = (rowIndex: number, colIndex: number, cell: TableCell) => {
    const next = rows.map((row) => row.slice())
    next[rowIndex][colIndex] = cell
    onChange(columns, next)
  }

  const selectedCell = selected ? rows[selected.row]?.[selected.col] : undefined

  return (
    <div className="admin-table-editor">
      <div className="admin-table-editor__scroll">
        <table>
          <thead>
            <tr>
              <th />
              {columns.map((col, colIndex) => (
                <th key={colIndex}>
                  <input value={col} onChange={(e) => updateColumn(colIndex, e.target.value)} />
                  <button type="button" className="admin-icon-button" onClick={() => removeColumn(colIndex)} title="Eliminar columna">
                    ✕
                  </button>
                </th>
              ))}
              <th>
                <button type="button" className="admin-button" onClick={addColumn}>+ Columna</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="admin-table-editor__row-controls">
                  <button type="button" className="admin-icon-button" onClick={() => moveRow(rowIndex, -1)} title="Subir">▲</button>
                  <button type="button" className="admin-icon-button" onClick={() => moveRow(rowIndex, 1)} title="Bajar">▼</button>
                  <button type="button" className="admin-icon-button" onClick={() => duplicateRow(rowIndex)} title="Duplicar">⎘</button>
                  <button type="button" className="admin-icon-button" onClick={() => removeRow(rowIndex)} title="Eliminar fila">✕</button>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex}>
                    <button
                      type="button"
                      className={`admin-table-editor__cell${selected?.row === rowIndex && selected?.col === colIndex ? ' admin-table-editor__cell--active' : ''}`}
                      onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                    >
                      {cellPreview(cell)}
                    </button>
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="admin-button" onClick={addRow}>+ Fila</button>

      {selected && selectedCell !== undefined && (
        <CellEditor
          cell={selectedCell}
          assetsBaseUrl={assetsBaseUrl}
          onChange={(cell) => setCell(selected.row, selected.col, cell)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

type CellEditorProps = {
  cell: TableCell
  assetsBaseUrl: string
  onChange: (cell: TableCell) => void
  onClose: () => void
}

function CellEditor({ cell, assetsBaseUrl, onChange, onClose }: CellEditorProps) {
  const [kind, setKind] = useState<CellKind>(cellKind(cell))

  const switchKind = (nextKind: CellKind) => {
    setKind(nextKind)
    const isString = typeof cell === 'string'
    if (nextKind === 'text') onChange(isString ? cell : '')
    else if (nextKind === 'markdown')
      onChange({ markdown: isString ? cell : 'markdown' in cell && typeof cell.markdown === 'string' ? cell.markdown : '' })
    else if (nextKind === 'link') onChange(!isString && 'href' in cell ? cell : { text: cellPreview(cell), href: '' })
    else onChange({ markdown: '' })
  }

  return (
    <div className="admin-cell-editor">
      <div className="admin-cell-editor__header">
        <span>Editar celda</span>
        <select value={kind} onChange={(e) => switchKind(e.target.value as CellKind)}>
          <option value="text">Texto plano</option>
          <option value="markdown">Texto con formato (markdown)</option>
          <option value="link">Enlace</option>
          <option value="image">Imagen</option>
        </select>
        <button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cerrar</button>
      </div>

      {kind === 'text' && (
        <input
          value={typeof cell === 'string' ? cell : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {kind === 'markdown' && (
        <textarea
          rows={4}
          value={typeof cell !== 'string' && 'markdown' in cell && typeof cell.markdown === 'string' ? cell.markdown : ''}
          onChange={(e) => onChange({ markdown: e.target.value })}
          placeholder="Admite **negrita**, *cursiva*, etc."
        />
      )}

      {kind === 'link' && typeof cell !== 'string' && 'href' in cell && (
        <div className="admin-cell-editor__link">
          <input
            placeholder="Texto visible"
            value={cell.text ?? ''}
            onChange={(e) => onChange({ ...cell, text: e.target.value })}
          />
          <input
            placeholder="https://..."
            value={cell.href ?? ''}
            onChange={(e) => onChange({ ...cell, href: e.target.value })}
          />
        </div>
      )}

      {kind === 'image' && (
        <AssetField
          label="Imagen de la celda"
          assetsBaseUrl={assetsBaseUrl}
          value={undefined}
          onChange={(path) => {
            if (!path) return
            const url = resolveAsset(assetsBaseUrl, path)
            onChange({
              markdown: `<img src='${url}' alt='' style='width: 100%; max-width: 100%; margin-top: 10px;border-radius: 5%;' />`,
            })
          }}
        />
      )}
    </div>
  )
}
