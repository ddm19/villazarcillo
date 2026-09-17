import { useState } from 'react'

type JsonEscapeHatchProps<T> = {
  value: T
  onApply: (next: T) => void
  validate?: (obj: unknown) => string | null
}

/**
 * "</> Editar JSON" toggle: shows the current record as raw JSON so the master
 * can hand-edit anything the visual form doesn't cover yet, mirroring the same
 * write path the form uses (onApply receives a plain parsed object).
 */
export function JsonEscapeHatch<T>({ value, onApply, validate }: JsonEscapeHatchProps<T>) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [error, setError] = useState<string | null>(null)

  const handleOpen = () => {
    setText(JSON.stringify(value, null, 2))
    setError(null)
    setOpen(true)
  }

  const handleSave = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError('JSON inválido: revisa la sintaxis.')
      return
    }
    if (validate) {
      const validationError = validate(parsed)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    onApply(parsed as T)
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="admin-button admin-button--ghost admin-json-toggle" onClick={handleOpen}>
        {'</> Editar JSON'}
      </button>
    )
  }

  return (
    <div className="admin-json-editor">
      <div className="admin-json-editor__header">
        <span>Edición manual (JSON)</span>
        <button type="button" className="admin-button admin-button--ghost" onClick={() => setOpen(false)}>
          Volver al formulario
        </button>
      </div>
      <textarea
        className="admin-json-editor__textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={18}
      />
      {error && <p className="admin-form__error">{error}</p>}
      <button type="button" className="admin-button admin-button--primary" onClick={handleSave}>
        Guardar JSON
      </button>
    </div>
  )
}
