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
import { ChartHelp } from './ChartHelp'

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

const payLabel = (t: number | null) =>
  t == null ? 'Sin dato' : (PAY_LABEL[t] ?? `Tipo ${t}`)
const payColor = (t: number | null) => (t == null ? '#64748b' : (PAY_COLOR[t] ?? '#8fa0b8'))

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
        <strong>{payLabel(p.payment_type)}</strong>
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
      <section className="card">
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
        <ChartHelp
          points={[
            'Cada caja resume la duración de los viajes de una franja: hora pico, valle, fin de semana y madrugada.',
            'La línea gruesa dentro de la caja es la mediana: el viaje típico de esa franja.',
            'La caja va del percentil 25 al 75 (el 50 % central de los viajes); los bigotes llegan al percentil 5 y 95.',
            'Si la mediana de «Hora pico» es mayor que la de «Valle», la congestión afecta al viaje típico, no solo a unos pocos.',
          ]}
          note="n indica cuántos viajes de la muestra caen en cada franja; cajas más altas significan duraciones más dispares."
        />
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
                ticks={[0, 5, 10, 15, 20]}
                allowDataOverflow
                tick={{ fill: '#8fa0b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="fare"
                name="Tarifa"
                domain={[0, 80]}
                ticks={[0, 20, 40, 60, 80]}
                allowDataOverflow
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
                  key={String(t)}
                  name={payLabel(t)}
                  data={points.filter((p) => p.payment_type === t)}
                  fill={payColor(t)}
                  fillOpacity={0.7}
                  isAnimationActive={ANIMATE}
                  animationDuration={700}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="scatter-legend">
            {types.map((t) => (
              <span key={String(t)}>
                <span className="dot" style={{ background: payColor(t) }} />
                {payLabel(t)}
              </span>
            ))}
            <span className="scatter-note">
              Correlación distancia–tarifa: <strong>{r.toFixed(2)}</strong>
            </span>
          </div>
          <p className="chart-axis">eje X: millas · eje Y: tarifa en USD · color: método de pago</p>
          <ChartHelp
            points={[
              'Cada punto es un viaje: su posición horizontal es la distancia y la vertical, lo que costó.',
              'Si la nube sube de izquierda a derecha, más distancia implica más tarifa.',
              'El coeficiente r va de -1 a 1; cerca de 1 indica una relación lineal fuerte.',
              'Los puntos altos con poca distancia suelen ser viajes con peajes, esperas o tarifas fijas.',
            ]}
            note="El gráfico recorta en 20 millas y 80 USD para que la nube sea legible; los valores extremos quedan fuera."
          />
        </div>
      </section>
    </div>
  )
}
