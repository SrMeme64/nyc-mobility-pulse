import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistRow, Kpi, PaymentRow, Year } from '../lib/types'
import { fmtCompact, fmtInt, fmtMoney2, fmtPct } from '../lib/format'
import { histFor, paymentFor } from '../lib/data'
import { ChartTooltip } from './ui'
import { ANIMATE } from '../lib/motion'

interface Props {
  fare: HistRow[]
  distance: HistRow[]
  payment: PaymentRow[]
  kpi: Kpi
  year: Year
}

const PAY_COLORS = ['#ffd23f', '#34d3c0', '#5b8cff', '#ff5c8a', '#8fa0b8', '#3a4a63']

function Histogram({
  rows,
  color,
  unit,
  reference,
  maxBin,
  step,
}: {
  rows: HistRow[]
  color: string
  unit: string
  reference: number
  maxBin: number
  step: number
}) {
  const data = rows.map((r) => ({
    ...r,
    label: r.bin >= maxBin ? `${maxBin}+` : String(r.bin),
  }))
  const ticks = data.filter((d) => d.bin % step === 0).map((d) => d.label)
  const nearest = data.length
    ? data.reduce((best, d) =>
        Math.abs(d.bin - reference) < Math.abs(best.bin - reference) ? d : best,
      )
    : null

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }} barCategoryGap={1}>
        <XAxis
          dataKey="label"
          ticks={ticks}
          tick={{ fill: '#8fa0b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => fmtCompact(v as number)}
          tick={{ fill: '#8fa0b8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v) => `${fmtInt(v)} viajes`}
              labelFormatter={(l) => `${unit} ${l}`}
            />
          }
        />
        {nearest && (
          <ReferenceLine
            x={nearest.label}
            stroke="#ffffff"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{ value: 'media', fill: '#e8eef8', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Bar
          dataKey="count"
          name="Viajes"
          fill={color}
          radius={[2, 2, 0, 0]}
          isAnimationActive={ANIMATE}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function EconomySection({ fare, distance, payment, kpi, year }: Props) {
  const fareData = histFor(fare, year)
  const distData = histFor(distance, year)
  const payData = paymentFor(payment, year)
  const total = payData.reduce((a, p) => a + p.trips, 0)

  return (
    <div className="economy-grid">
      <section className="card" id="economia">
        <header className="card-head">
          <div>
            <h3 className="card-title">Distribución de tarifas</h3>
            <p className="card-sub">Viajes por rango de tarifa base (USD)</p>
          </div>
          <span className="card-badge">media {fmtMoney2(kpi.avg_fare)}</span>
        </header>
        <Histogram
          rows={fareData}
          color="#ffd23f"
          unit="Tarifa"
          reference={kpi.avg_fare}
          maxBin={80}
          step={10}
        />
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Distancias recorridas</h3>
            <p className="card-sub">Viajes por millas (mi)</p>
          </div>
          <span className="card-badge">media {kpi.avg_distance.toFixed(1)} mi</span>
        </header>
        <Histogram
          rows={distData}
          color="#34d3c0"
          unit="Distancia"
          reference={kpi.avg_distance}
          maxBin={30}
          step={5}
        />
      </section>

      <section className="card payment-card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Método de pago</h3>
            <p className="card-sub">Participación y propina declarada</p>
          </div>
        </header>
        <div className="payment-body">
          <div className="donut">
            <ResponsiveContainer width="100%" height={168}>
              <PieChart>
                <Pie
                  data={payData}
                  dataKey="trips"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={ANIMATE}
                >
                  {payData.map((p, i) => (
                    <Cell key={p.type} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v) => `${fmtInt(v)} viajes`}
                      labelFormatter={(l) => String(l)}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{fmtInt(total)}</strong>
              <span>viajes</span>
            </div>
          </div>
          <ul className="payment-list">
            {payData.map((p, i) => (
              <li key={p.type}>
                <span className="dot" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} />
                <span className="pay-name">{p.name}</span>
                <span className="pay-share">{fmtPct((p.trips / Math.max(1, total)) * 100, 1)}</span>
                <span className="pay-tip" title={`Propina media ${fmtPct(p.tip_pct)}`}>
                  <span style={{ width: `${Math.min(100, p.tip_pct * 4)}%` }} />
                </span>
                <span className="pay-tip-value">{fmtPct(p.tip_pct, 0)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="chart-note">
          La propina solo se registra en pagos electrónicos; en efectivo suele quedar en cero.
        </p>
      </section>
    </div>
  )
}
