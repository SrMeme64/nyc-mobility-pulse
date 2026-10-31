import { Clock3, Gauge, HandCoins, MapPin, TrendingUp } from 'lucide-react'
import type { Kpi, MonthlyRow, HourlyRow, ZoneRow, Year } from '../lib/types'
import { DAYS, MONTHS_LONG, fmtInt, fmtPct, percentChange } from '../lib/format'
import { hourlyFor, monthlyFor, zonesFor } from '../lib/data'
import { Delta } from './ui'

interface Props {
  kpi: Kpi
  previous?: Kpi
  monthly: MonthlyRow[]
  hourly: HourlyRow[]
  zones: ZoneRow[]
  year: Year
}

export function Insights({ kpi, previous, monthly, hourly, zones, year }: Props) {
  const months =
    year === 'all'
      ? (() => {
          const totals = new Map<number, number>()
          for (const r of monthly) totals.set(r.month, (totals.get(r.month) ?? 0) + r.trips)
          return [...totals.entries()]
            .map(([month, trips]) => ({ month, trips }))
            .sort((a, b) => b.trips - a.trips)
        })()
      : monthlyFor(monthly, year)
          .map((r) => ({ month: r.month, trips: r.trips }))
          .sort((a, b) => b.trips - a.trips)

  const busiestMonth = months[0]
  const monthShare = busiestMonth ? (busiestMonth.trips / kpi.trips) * 100 : null

  const hours = hourlyFor(hourly, year)
  const peak = [...hours].sort((a, b) => b.trips - a.trips)[0]

  const zs = zonesFor(zones, year).sort((a, b) => b.pickups - a.pickups)
  const top = zs[0]
  const zoneShare = top ? (top.pickups / kpi.trips) * 100 : null
  const zoneCount = zs.length

  const yoy = previous ? percentChange(kpi.trips, previous.trips) : null
  const tipDelta = previous ? percentChange(kpi.tip_pct, previous.tip_pct) : null

  return (
    <div className="insights">
      <div className="insight-hero">
        <span className="insight-kicker">
          <TrendingUp size={14} /> Lectura rápida
        </span>
        <p>
          {year === 'all' ? (
            <>
              La demanda se concentra en <strong>{top?.zone ?? '—'}</strong> y alcanza
              su pico los <strong>{peak ? `${DAYS[peak.dow]} a las ${peak.hour}:00` : '—'}</strong>.
              El viaje promedio dura <strong>{kpi.avg_duration.toFixed(1)} min</strong> a{' '}
              <strong>{kpi.avg_speed.toFixed(1)} mph</strong>.
            </>
          ) : (
            <>
              En <strong>{year}</strong> se analizaron <strong>{fmtInt(kpi.trips)}</strong> viajes
              {yoy != null && (
                <>
                  {' '}(<Delta value={yoy} /> vs. {previous?.year})
                </>
              )}
              . El mes más activo fue <strong>{MONTHS_LONG[(busiestMonth?.month ?? 1) - 1]}</strong>.
            </>
          )}
        </p>
      </div>

      <ul className="insight-list">
        <li>
          <span className="insight-icon yellow"><Clock3 size={17} /></span>
          <div>
            <span>Hora pico</span>
            <strong>
              {peak ? `${DAYS[peak.dow]} · ${peak.hour}:00` : '—'}
            </strong>
            <small>{peak ? `${fmtInt(peak.trips)} viajes en esa franja` : ''}</small>
          </div>
        </li>
        <li>
          <span className="insight-icon blue"><MapPin size={17} /></span>
          <div>
            <span>Zona con más demanda</span>
            <strong>{top?.zone ?? '—'}</strong>
            <small>
              {top
                ? `${fmtPct(zoneShare ?? 0)} de los viajes · ${top.borough}`
                : ''}
            </small>
          </div>
        </li>
        <li>
          <span className="insight-icon pink"><HandCoins size={17} /></span>
          <div>
            <span>Propina promedio</span>
            <strong>{fmtPct(kpi.tip_pct)}</strong>
            <small>
              {tipDelta != null ? (
                <>vs. {previous?.year}: <Delta value={tipDelta} /></>
              ) : (
                'sobre la tarifa base'
              )}
            </small>
          </div>
        </li>
        <li>
          <span className="insight-icon teal"><Gauge size={17} /></span>
          <div>
            <span>Velocidad media</span>
            <strong>{kpi.avg_speed.toFixed(1)} mph</strong>
            <small>{zoneCount} zonas activas · {fmtPct(monthShare ?? 0)} en el mes pico</small>
          </div>
        </li>
      </ul>
    </div>
  )
}
