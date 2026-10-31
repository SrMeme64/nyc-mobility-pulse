import { useState } from 'react'
import { Flame } from 'lucide-react'
import type { HourlyRow, Year } from '../lib/types'
import { DAYS, fmtInt, fmtMoney2, heatColor } from '../lib/format'
import { hourlyFor } from '../lib/data'

interface Props {
  rows: HourlyRow[]
  year: Year
}

export function Heatmap({ rows, year }: Props) {
  const [hover, setHover] = useState<HourlyRow | null>(null)
  const data = hourlyFor(rows, year)
  const map = new Map(data.map((r) => [`${r.dow}-${r.hour}`, r]))
  const max = Math.max(1, ...data.map((r) => r.trips))
  const peak = data.reduce<HourlyRow | null>(
    (acc, r) => (!acc || r.trips > acc.trips ? r : acc),
    null,
  )

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-status">
        {hover ? (
          <>
            <strong>{DAYS[hover.dow]} {String(hover.hour).padStart(2, '0')}:00</strong>
            <span>{fmtInt(hover.trips)} viajes</span>
            <span>tarifa media {fmtMoney2(hover.avg_fare)}</span>
            <span>{hover.avg_duration.toFixed(1)} min</span>
          </>
        ) : (
          <>
            <Flame size={15} />
            <span>
              Pico: <strong>{peak ? `${DAYS[peak.dow]} ${peak.hour}:00` : '—'}</strong> con{' '}
              {peak ? fmtInt(peak.trips) : '—'} viajes
            </span>
          </>
        )}
      </div>

      <div className="heatmap" role="img" aria-label="Mapa de calor de viajes por día y hora">
        <div className="hm-corner" />
        {Array.from({ length: 24 }, (_, h) => (
          <div className="hm-hour" key={`h${h}`}>
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}
        {DAYS.map((day, d) => (
          <div className="hm-row" key={day} style={{ display: 'contents' }}>
            <div className="hm-day">{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const cell = map.get(`${d}-${h}`)
              const t = cell ? cell.trips / max : 0
              const isPeak = peak && peak.dow === d && peak.hour === h
              return (
                <button
                  type="button"
                  key={`${d}-${h}`}
                  className={`hm-cell ${isPeak ? 'peak' : ''}`}
                  style={{ background: heatColor(t) }}
                  onMouseEnter={() => setHover(cell ?? null)}
                  onFocus={() => setHover(cell ?? null)}
                  onMouseLeave={() => setHover(null)}
                  aria-label={`${day} ${h}:00, ${cell ? fmtInt(cell.trips) : 0} viajes`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="hm-legend">
        <span>Menos viajes</span>
        <span className="hm-gradient" />
        <span>Más viajes</span>
      </div>
    </div>
  )
}
