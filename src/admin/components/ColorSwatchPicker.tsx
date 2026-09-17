const SWATCHES: { var: string; label: string }[] = [
  { var: '--pin-npc', label: 'NPC (azul)' },
  { var: '--pin-quest', label: 'Misión (dorado)' },
  { var: '--pin-shop', label: 'Tienda (verde)' },
  { var: '--pin-generic', label: 'Genérico (rojo)' },
]

type ColorSwatchPickerProps = {
  value?: string
  onChange: (colorVar: string | undefined) => void
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="admin-swatches">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch.var}
          type="button"
          className={`admin-swatches__item${value === swatch.var ? ' admin-swatches__item--active' : ''}`}
          style={{ '--swatch-color': `var(${swatch.var})` } as React.CSSProperties}
          onClick={() => onChange(swatch.var)}
          title={swatch.label}
        >
          <span className="admin-swatches__dot" />
          {swatch.label}
        </button>
      ))}
      <button
        type="button"
        className={`admin-swatches__item${!value ? ' admin-swatches__item--active' : ''}`}
        onClick={() => onChange(undefined)}
      >
        Por defecto
      </button>
    </div>
  )
}
