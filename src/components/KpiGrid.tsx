import {
  CarTaxiFront,
  CircleDollarSign,
  Gauge,
  HandCoins,
  ReceiptText,
  Route,
} from 'lucide-react'
import type { Kpi, Year } from '../lib/types'
import { fmtCompact, fmtDecimal, fmtInt, fmtMoney2, fmtPct, percentChange } from '../lib/format'
import { Delta } from './ui'

interface Props {
  kpi: Kpi
  previous?: Kpi
  year: Year
}

export function KpiGrid({ kpi, previous, year }: Props) {
  const cards = [
    {
      label: 'Viajes analizados',
      value: fmtInt(kpi.trips),
      sub:
        year === 'all'
          ? 'muestra histórica completa'
          : `de ${fmtCompact(kpi.source_trips)} registros fuente`,
      icon: CarTaxiFront,
      delta:
        previous && kpi.source_trips && previous.source_trips
          ? percentChange(kpi.source_trips, previous.source_trips)
          : null,
      tone: 'yellow',
    },
    {
      label: 'Ingreso (muestra)',
      value: `$${fmtCompact(kpi.revenue)}`,
      sub: 'suma de total_amount',
      icon: CircleDollarSign,
      delta: null,
      tone: 'green',
    },
    {
      label: 'Tarifa promedio',
      value: fmtMoney2(kpi.avg_fare),
      sub: 'por viaje',
      icon: ReceiptText,
      delta: previous ? percentChange(kpi.avg_fare, previous.avg_fare) : null,
      tone: 'blue',
    },
    {
      label: 'Tarifa por milla',
      value: fmtMoney2(kpi.fare_per_mile),
      sub: 'ingreso por distancia recorrida',
      icon: Route,
      delta: previous ? percentChange(kpi.fare_per_mile, previous.fare_per_mile) : null,
      tone: 'orange',
    },
    {
      label: 'Propina promedio',
      value: fmtPct(kpi.tip_pct),
      sub: 'sobre la tarifa base',
      icon: HandCoins,
      delta: previous ? percentChange(kpi.tip_pct, previous.tip_pct) : null,
      tone: 'pink',
    },
    {
      label: 'Velocidad promedio',
      value: `${fmtDecimal(kpi.avg_speed)} mph`,
      sub: 'distancia / duración del viaje',
      icon: Gauge,
      delta: previous ? percentChange(kpi.avg_speed, previous.avg_speed) : null,
      tone: 'teal',
    },
  ]

  return (
    <section className="kpi-grid" aria-label="Indicadores clave">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <article className={`kpi-card tone-${c.tone}`} key={c.label}>
            <div className="kpi-top">
              <span className="kpi-icon"><Icon size={18} /></span>
              {c.delta != null && <Delta value={c.delta} />}
            </div>
            <p className="kpi-label">{c.label}</p>
            <p className="kpi-value">{c.value}</p>
            <p className="kpi-sub">{c.sub}</p>
          </article>
        )
      })}
    </section>
  )
}
