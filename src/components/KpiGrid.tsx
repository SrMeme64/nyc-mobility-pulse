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
import { useCountUp } from '../hooks/useCountUp'

interface Props {
  kpi: Kpi
  previous?: Kpi
  year: Year
}

function KpiValue({ value, format }: { value: number; format: (n: number) => string }) {
  const animated = useCountUp(value)
  return <p className="kpi-value">{format(animated)}</p>
}

export function KpiGrid({ kpi, previous, year }: Props) {
  const cards = [
    {
      label: 'Viajes analizados',
      raw: kpi.trips,
      format: (n: number) => fmtInt(n),
      sub:
        year === 'all'
          ? 'muestra histórica completa'
          : `de ${fmtCompact(kpi.source_trips)} registros fuente`,
      hint: 'Viajes de la muestra que se están analizando. El total de la fuente aparece debajo.',
      icon: CarTaxiFront,
      delta:
        previous && kpi.source_trips && previous.source_trips
          ? percentChange(kpi.source_trips, previous.source_trips)
          : null,
      tone: 'yellow',
    },
    {
      label: 'Ingreso (muestra)',
      raw: kpi.revenue,
      format: (n: number) => `$${fmtCompact(n)}`,
      sub: 'suma de total_amount',
      hint: 'Suma de todo lo pagado por los viajes de la muestra: tarifa, extras, peajes y propina.',
      icon: CircleDollarSign,
      delta: null,
      tone: 'green',
    },
    {
      label: 'Tarifa promedio',
      raw: kpi.avg_fare,
      format: (n: number) => fmtMoney2(n),
      sub: 'por viaje',
      hint: 'Tarifa base media de un viaje, sin extras ni propina.',
      icon: ReceiptText,
      delta: previous ? percentChange(kpi.avg_fare, previous.avg_fare) : null,
      tone: 'blue',
    },
    {
      label: 'Tarifa por milla',
      raw: kpi.fare_per_mile,
      format: (n: number) => fmtMoney2(n),
      sub: 'ingreso por distancia recorrida',
      hint: 'Cuánto cuesta, en promedio, recorrer una milla. Sirve para comparar trayectos de distinta longitud.',
      icon: Route,
      delta: previous ? percentChange(kpi.fare_per_mile, previous.fare_per_mile) : null,
      tone: 'orange',
    },
    {
      label: 'Propina promedio',
      raw: kpi.tip_pct,
      format: (n: number) => fmtPct(n),
      sub: 'sobre la tarifa base',
      hint: 'Porcentaje medio de propina. Solo se registra en pagos electrónicos; en efectivo suele quedar en cero.',
      icon: HandCoins,
      delta: previous ? percentChange(kpi.tip_pct, previous.tip_pct) : null,
      tone: 'pink',
    },
    {
      label: 'Velocidad promedio',
      raw: kpi.avg_speed,
      format: (n: number) => `${fmtDecimal(n)} mph`,
      sub: 'distancia / duración del viaje',
      hint: 'Millas por hora efectivas del viaje, incluyendo semáforos y tráfico.',
      icon: Gauge,
      delta: previous ? percentChange(kpi.avg_speed, previous.avg_speed) : null,
      tone: 'teal',
    },
  ]

  return (
    <section className="kpi-grid" aria-label="Indicadores clave">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <article
            className={`kpi-card tone-${c.tone}`}
            key={c.label}
            style={{ animationDelay: `${i * 55}ms` }}
            title={c.hint}
          >
            <div className="kpi-top">
              <span className="kpi-icon"><Icon size={18} /></span>
              {c.delta != null && <Delta value={c.delta} />}
            </div>
            <p className="kpi-label">{c.label}</p>
            <KpiValue value={c.raw} format={c.format} />
            <p className="kpi-sub">{c.sub}</p>
          </article>
        )
      })}
    </section>
  )
}
