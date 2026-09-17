import type { MarkdownBlock, MarkdownContent } from '../../lib/types'
import { TableGridEditor } from './TableGridEditor'
import { renderMarkdownContent } from '../../lib/markdownRenderer'

type MarkdownBlockEditorProps = {
  blocks: MarkdownBlock[]
  assetsBaseUrl: string
  onChange: (blocks: MarkdownBlock[]) => void
}

function textToString(text: MarkdownContent): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(textToString).join('\n')
  if (text.type === 'paragraph' || text.type === 'heading') return textToString(text.text)
  return ''
}

function itemsToLines(items: MarkdownContent[]): string {
  return items.map(textToString).join('\n')
}

function linesToItems(text: string): string[] {
  return text.split('\n')
}

const BLOCK_LABELS: Record<MarkdownBlock['type'], string> = {
  paragraph: 'Párrafo',
  heading: 'Encabezado',
  list: 'Lista',
  quote: 'Cita',
  code: 'Código',
  table: 'Tabla',
}

function newBlock(type: MarkdownBlock['type']): MarkdownBlock {
  switch (type) {
    case 'paragraph':
      return { type: 'paragraph', text: '' }
    case 'heading':
      return { type: 'heading', level: 2, text: '' }
    case 'list':
      return { type: 'list', items: [''] }
    case 'quote':
      return { type: 'quote', items: [''] }
    case 'code':
      return { type: 'code', value: '', language: '' }
    case 'table':
      return { type: 'table', columns: ['Columna 1'], rows: [['']] }
  }
}

export function MarkdownBlockEditor({ blocks, assetsBaseUrl, onChange }: MarkdownBlockEditorProps) {
  const addBlock = (type: MarkdownBlock['type']) => {
    onChange([...blocks, newBlock(type)])
  }

  const updateBlock = (index: number, block: MarkdownBlock) => {
    const next = blocks.slice()
    next[index] = block
    onChange(next)
  }

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = blocks.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="admin-markdown-editor">
      {blocks.map((block, index) => (
        <div key={index} className="admin-markdown-editor__block">
          <div className="admin-markdown-editor__block-header">
            <span className="admin-tag">{BLOCK_LABELS[block.type]}</span>
            <div className="admin-markdown-editor__block-actions">
              <button type="button" className="admin-icon-button" onClick={() => moveBlock(index, -1)} title="Subir">▲</button>
              <button type="button" className="admin-icon-button" onClick={() => moveBlock(index, 1)} title="Bajar">▼</button>
              <button type="button" className="admin-icon-button" onClick={() => removeBlock(index)} title="Eliminar">🗑</button>
            </div>
          </div>

          {(block.type === 'paragraph' || block.type === 'heading') && (
            <div className="admin-markdown-editor__block-body">
              {block.type === 'heading' && (
                <select
                  value={block.level ?? 2}
                  onChange={(e) => updateBlock(index, { ...block, level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })}
                >
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <option key={level} value={level}>H{level}</option>
                  ))}
                </select>
              )}
              <textarea
                rows={3}
                value={textToString(block.text)}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                placeholder="Admite markdown y HTML simple (<span style='...'>)"
              />
              <div className="admin-markdown-editor__preview">{renderMarkdownContent(block.text)}</div>
            </div>
          )}

          {(block.type === 'list' || block.type === 'quote') && (
            <div className="admin-markdown-editor__block-body">
              {block.type === 'list' && (
                <label className="admin-inline-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(block.ordered)}
                    onChange={(e) => updateBlock(index, { ...block, ordered: e.target.checked })}
                  />
                  Lista numerada
                </label>
              )}
              <textarea
                rows={4}
                value={itemsToLines(block.items)}
                onChange={(e) => updateBlock(index, { ...block, items: linesToItems(e.target.value) })}
                placeholder="Un elemento por línea"
              />
            </div>
          )}

          {block.type === 'code' && (
            <div className="admin-markdown-editor__block-body">
              <input
                value={block.language ?? ''}
                onChange={(e) => updateBlock(index, { ...block, language: e.target.value })}
                placeholder="Lenguaje (opcional)"
              />
              <textarea
                rows={4}
                value={block.value}
                onChange={(e) => updateBlock(index, { ...block, value: e.target.value })}
              />
            </div>
          )}

          {block.type === 'table' && (
            <TableGridEditor
              columns={block.columns}
              rows={block.rows}
              assetsBaseUrl={assetsBaseUrl}
              onChange={(columns, rows) => updateBlock(index, { ...block, columns, rows })}
            />
          )}
        </div>
      ))}

      <div className="admin-markdown-editor__toolbar">
        {(Object.keys(BLOCK_LABELS) as MarkdownBlock['type'][]).map((type) => (
          <button key={type} type="button" className="admin-button" onClick={() => addBlock(type)}>
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
