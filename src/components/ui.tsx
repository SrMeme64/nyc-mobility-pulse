import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

export function Card({ title, subtitle, action, children, className = '', id }: CardProps) {
  return (
    <section className={`card ${className}`} id={id}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Delta({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return <span className="delta muted">—</span>
  const positive = value >= 0
  return (
    <span className={`delta ${positive ? 'up' : 'down'}`}>
      {positive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }[]
  label?: string | number
  formatter?: (v: number, name?: string, row?: Record<string, unknown>) => string
  labelFormatter?: (l: string | number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      {label != null && <p className="tooltip-label">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="tooltip-row">
          <span className="dot" style={{ background: p.color }} />
          <span className="tooltip-name">{p.name}</span>
          <strong>
            {formatter && typeof p.value === 'number'
              ? formatter(p.value, p.name, p.payload)
              : String(p.value ?? '—')}
          </strong>
        </p>
      ))}
    </div>
  )
}
