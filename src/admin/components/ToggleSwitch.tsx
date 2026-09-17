type ToggleSwitchProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}

export function ToggleSwitch({ label, checked, onChange, hint }: ToggleSwitchProps) {
  return (
    <label className="admin-toggle">
      <span className="admin-toggle__text">
        <span className="admin-toggle__label">{label}</span>
        {hint && <span className="admin-toggle__hint">{hint}</span>}
      </span>
      <span className={`admin-toggle__track${checked ? ' admin-toggle__track--on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="admin-toggle__thumb" />
      </span>
    </label>
  )
}
