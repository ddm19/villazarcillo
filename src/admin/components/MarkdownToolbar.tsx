import { useState, type RefObject } from 'react'

type MarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
}

const PROGRESS_COLOR_PRESETS: { label: string; primary?: string; secondary?: string }[] = [
  { label: 'Rojo (por defecto)' },
  { label: 'Verde', primary: '#83e377', secondary: '#58a64b' },
  { label: 'Azul', primary: '#7aa2ff', secondary: '#4d7de0' },
]

function replaceSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  before: string,
  after: string,
  placeholder: string,
) {
  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const selected = value.slice(start, end) || placeholder
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  onChange(next)

  const cursor = start + before.length + selected.length + after.length
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(cursor, cursor)
  })
}

function insertAtCursor(textarea: HTMLTextAreaElement, value: string, onChange: (next: string) => void, snippet: string) {
  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const next = value.slice(0, start) + snippet + value.slice(end)
  onChange(next)

  const cursor = start + snippet.length
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(cursor, cursor)
  })
}

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const [showProgressPicker, setShowProgressPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [progressValue, setProgressValue] = useState(50)
  const [progressPreset, setProgressPreset] = useState(0)
  const [textColor, setTextColor] = useState('#7aa2ff')

  const withTextarea = (fn: (textarea: HTMLTextAreaElement) => void) => {
    const textarea = textareaRef.current
    if (textarea) fn(textarea)
  }

  const insertProgressBar = () => {
    withTextarea((textarea) => {
      const preset = PROGRESS_COLOR_PRESETS[progressPreset]
      const styleAttr = preset.primary
        ? ` style='--fill-color-primary: ${preset.primary}; --fill-color-secondary: ${preset.secondary};'`
        : ''
      const snippet = `<span${styleAttr} class='progressBar progressBar__${progressValue}' role='progressbar'></span>`
      insertAtCursor(textarea, value, onChange, snippet)
      setShowProgressPicker(false)
    })
  }

  const insertColoredText = () => {
    withTextarea((textarea) => {
      replaceSelection(textarea, value, onChange, `<span style='color:${textColor};'>`, '</span>', 'texto')
      setShowColorPicker(false)
    })
  }

  return (
    <div className="admin-md-toolbar">
      <div className="admin-md-toolbar__row">
        <button
          type="button"
          className="admin-icon-button admin-md-toolbar__btn"
          title="Negrita"
          onClick={() => withTextarea((t) => replaceSelection(t, value, onChange, '**', '**', 'texto'))}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="admin-icon-button admin-md-toolbar__btn"
          title="Cursiva"
          onClick={() => withTextarea((t) => replaceSelection(t, value, onChange, '*', '*', 'texto'))}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="admin-icon-button admin-md-toolbar__btn"
          title="Texto de ayuda pequeño y gris"
          onClick={() =>
            withTextarea((t) =>
              replaceSelection(t, value, onChange, "<span style='font-size:0.9em;color:#888;'>", '</span>', 'nota'),
            )
          }
        >
          Nota
        </button>
        <button
          type="button"
          className="admin-icon-button admin-md-toolbar__btn"
          title="Texto de color"
          onClick={() => setShowColorPicker((v) => !v)}
        >
          Color
        </button>
        <button
          type="button"
          className="admin-icon-button admin-md-toolbar__btn"
          title="Insertar barra de progreso"
          onClick={() => setShowProgressPicker((v) => !v)}
        >
          ▰ Barra
        </button>
      </div>

      {showColorPicker && (
        <div className="admin-md-toolbar__popover">
          <label className="admin-inline-checkbox">
            Color
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
          </label>
          <button type="button" className="admin-button admin-button--primary" onClick={insertColoredText}>
            Insertar
          </button>
        </div>
      )}

      {showProgressPicker && (
        <div className="admin-md-toolbar__popover">
          <label className="admin-field">
            <span>Progreso: {progressValue}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressValue}
              onChange={(e) => setProgressValue(Number(e.target.value))}
            />
          </label>
          <label className="admin-field">
            <span>Color</span>
            <select value={progressPreset} onChange={(e) => setProgressPreset(Number(e.target.value))}>
              {PROGRESS_COLOR_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <div className="progressBar" style={{ '--fill-color-primary': PROGRESS_COLOR_PRESETS[progressPreset].primary, '--fill-color-secondary': PROGRESS_COLOR_PRESETS[progressPreset].secondary } as React.CSSProperties}>
            <div style={{ position: 'absolute', inset: 0, width: `${progressValue}%`, background: 'linear-gradient(to bottom, var(--fill-color-primary, var(--bar-background)), var(--fill-color-secondary, var(--bar-background)))' }} />
          </div>
          <button type="button" className="admin-button admin-button--primary" onClick={insertProgressBar}>
            Insertar
          </button>
        </div>
      )}
    </div>
  )
}
