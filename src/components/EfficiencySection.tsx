import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Activity } from 'lucide-react'
import type { BoxRow, ScatterRow, Year } from '../lib/types'
import { correlation, fmtDecimal, fmtInt, fmtMoney2, fmtPct } from '../lib/format'
import { BoxPlot } from './BoxPlot'
import { ANIMATE } from '../lib/motion'

interface Props {
  boxplot: BoxRow[]
  scatter: ScatterRow[]
  year: Year
}

const PAY_LABEL: Record<number, string> = {
  1: 'Tarjeta',
  2: 'Efectivo',
  3: 'Sin cargo',
  4: 'Disputa',
  5: 'Desconocido',
  6: 'Anulado',
}

const PAY_COLOR: Record<number, string> = {
  1: '#ffd23f',
  2: '#34d3c0',
  3: '#5b8cff',
  4: '#ff5c8a',
  5: '#8fa0b8',
  6: '#3a4a63',
}

function ScatterTip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: ScatterRow }[]
}) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  return (
    <div className="tooltip">
      <p className="tooltip-label">
        {p.distance.toFixed(1)} mi · {fmtMoney2(p.fare)}
      </p>
      <p className="tooltip-row">
        <span className="tooltip-name">Duración</span>
        <strong>{fmtDecimal(p.duration)} min</strong>
      </p>
      <p className="tooltip-row">
        <span className="tooltip-name">Propina</span>
        <strong>{fmtPct(p.tip_pct)}</strong>
      </p>
      <p className="tooltip-row">
        <span className="tooltip-name">Pago</span>
        <strong>{PAY_LABEL[p.payment_type] ?? 'Otro'}</strong>
      </p>
    </div>
  )
}

export function EfficiencySection({ boxplot, scatter, year }: Props) {
  const points = scatter.filter((r) => String(r.year) === String(year))
  const r = correlation(
    points.map((p) => p.distance),
    points.map((p) => p.fare),
  )
  const types = [...new Set(points.map((p) => p.payment_type))].sort()

  return (
    <div className="efficiency-grid">
      <section className="card" id="eficiencia">
        <header className="card-head">
          <div>
            <h3 className="card-title">Duración: pico vs. valle</h3>
            <p className="card-sub">
              Distribución del tiempo de viaje por franja horaria (minutos)
            </p>
          </div>
          <span className="card-badge">
            <Activity size={13} /> n = {fmtInt(points.length)}
          </span>
        </header>
        <BoxPlot rows={boxplot} year={year} />
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Distancia vs. tarifa</h3>
            <p className="card-sub">Cada punto es un viaje de la muestra</p>
          </div>
          <span className="card-badge">r = {r.toFixed(2)}</span>
        </header>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={268}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis
                type="number"
                dataKey="distance"
                name="Distancia"
                domain={[0, 20]}
                tick={{ fill: '#8fa0b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="fare"
                name="Tarifa"
                domain={[0, 80]}
                tick={{ fill: '#8fa0b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <ZAxis range={[26, 26]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                content={<ScatterTip />}
              />
              {types.map((t) => (
                <Scatter
                  key={t}
                  name={PAY_LABEL[t] ?? 'Otro'}
                  data={points.filter((p) => p.payment_type === t)}
                  fill={PAY_COLOR[t] ?? '#8fa0b8'}
                  fillOpacity={0.7}
                  isAnimationActive={ANIMATE}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="scatter-legend">
            {types.map((t) => (
              <span key={t}>
                <span className="dot" style={{ background: PAY_COLOR[t] ?? '#8fa0b8' }} />
                {PAY_LABEL[t] ?? 'Otro'}
              </span>
            ))}
            <span className="scatter-note">
              Correlación distancia–tarifa: <strong>{r.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
