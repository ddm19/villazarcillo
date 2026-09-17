type RotationDialProps = {
  value: number
  onChange: (degrees: number) => void
}

export function RotationDial({ value, onChange }: RotationDialProps) {
  return (
    <div className="admin-rotation">
      <div className="admin-rotation__preview" style={{ transform: `rotate(${value}deg)` }}>
        ▲
      </div>
      <input
        type="range"
        min={-180}
        max={180}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="admin-rotation__value">{value}°</span>
    </div>
  )
}
