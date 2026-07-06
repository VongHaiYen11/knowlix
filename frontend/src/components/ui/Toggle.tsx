interface ToggleProps {
  enabled: boolean
  onChange: (value: boolean) => void
  label: string
}

export function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      role="switch"
      aria-label={label}
      aria-checked={enabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}
