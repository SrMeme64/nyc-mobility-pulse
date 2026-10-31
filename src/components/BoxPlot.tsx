import type { BoxRow, Year } from '../lib/types'
import { fmtInt } from '../lib/format'

interface Props {
  rows: BoxRow[]
  year: Year
}

const GROUPS = ['Hora pico', 'Valle', 'Fin de semana', 'Madrugada']
const COLORS: Record<string, string> = {
  'Hora pico': '#ffd23f',
  Valle: '#34d3c0',
  'Fin de semana': '#5b8cff',
  Madrugada: '#ff5c8a',
}

export function BoxPlot({ rows, year }: Props) {
  const data = GROUPS.map((g) => rows.find((r) => r.grp === g && String(r.year) === String(year))).filter(
    (r): r is BoxRow => Boolean(r),
  )
  if (!data.length) return <p className="empty">Sin datos para este año.</p>

  const max = Math.max(...data.map((d) => d.p95)) * 1.12
  const top = 12
  const bottom = 42
  const left = 44
  const right = 16
  const width = 560
  const height = 250
  const plotW = width - left - right
  const plotH = height - top - bottom
  const step = plotW / data.length
  const y = (v: number) => top + plotH - (v / max) * plotH

  const ticks = Array.from({ length: 5 }, (_, i) => (max / 4) * i)

  return (
    <div className="boxplot">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Distribución de la duración por franja horaria">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" className="bp-tick">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text x={12} y={top + plotH / 2} transform={`rotate(-90 12 ${top + plotH / 2})`} className="bp-axis">
          minutos
        </text>

        {data.map((d, i) => {
          const cx = left + step * i + step / 2
          const bw = Math.min(58, step * 0.5)
          const color = COLORS[d.grp] ?? '#ffd23f'
          return (
            <g key={d.grp}>
              <title>{`${d.grp}: mediana ${d.median} min · p25 ${d.p25} · p75 ${d.p75} · n=${fmtInt(d.n)}`}</title>
              <line x1={cx} x2={cx} y1={y(d.p05)} y2={y(d.p95)} stroke={color} strokeWidth={1.4} opacity={0.7} />
              <line x1={cx - 9} x2={cx + 9} y1={y(d.p05)} y2={y(d.p05)} stroke={color} strokeWidth={1.4} opacity={0.7} />
              <line x1={cx - 9} x2={cx + 9} y1={y(d.p95)} y2={y(d.p95)} stroke={color} strokeWidth={1.4} opacity={0.7} />
              <rect
                x={cx - bw / 2}
                y={y(d.p75)}
                width={bw}
                height={Math.max(2, y(d.p25) - y(d.p75))}
                rx={4}
                fill={color}
                fillOpacity={0.22}
                stroke={color}
                strokeWidth={1.5}
              />
              <line
                x1={cx - bw / 2}
                x2={cx + bw / 2}
                y1={y(d.median)}
                y2={y(d.median)}
                stroke={color}
                strokeWidth={3}
              />
              <text x={cx} y={y(d.median) - 6} textAnchor="middle" className="bp-median">
                {d.median}′
              </text>
              <text x={cx} y={height - 22} textAnchor="middle" className="bp-label">
                {d.grp}
              </text>
              <text x={cx} y={height - 8} textAnchor="middle" className="bp-n">
                n = {fmtInt(d.n)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="chart-note">
        Caja = rango intercuartílico (p25–p75); línea = mediana; bigotes = p05–p95.
      </p>
    </div>
  )
}
