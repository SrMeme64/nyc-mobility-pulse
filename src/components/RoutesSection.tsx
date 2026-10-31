import { ArrowRight, Route as RouteIcon } from 'lucide-react'
import type { RouteRow, Year } from '../lib/types'
import { fmtInt, fmtMoney2 } from '../lib/format'
import { ChartHelp } from './ChartHelp'

interface Props {
  rows: RouteRow[]
  year: Year
}

function aggregate(rows: RouteRow[]): RouteRow[] {
  const map = new Map<string, RouteRow>()
  for (const r of rows) {
    const key = `${r.pu_zone}-${r.do_zone}`
    const acc = map.get(key)
    if (!acc) {
      map.set(key, { ...r, year: 0 })
    } else {
      const total = acc.trips + r.trips
      acc.avg_fare = (acc.avg_fare * acc.trips + r.avg_fare * r.trips) / total
      acc.avg_duration =
        (acc.avg_duration * acc.trips + r.avg_duration * r.trips) / total
      acc.trips = total
    }
  }
  return [...map.values()].sort((a, b) => b.trips - a.trips)
}

export function RoutesSection({ rows, year }: Props) {
  const data =
    year === 'all' ? aggregate(rows) : rows.filter((r) => r.year === year)
  const top = data.slice(0, 10)
  const max = Math.max(1, ...top.map((r) => r.trips))

  return (
    <section className="card routes-card">
      <header className="card-head">
        <div>
          <h3 className="card-title">Rutas más frecuentes</h3>
          <p className="card-sub">Pares origen → destino con más viajes (sin contar misma zona)</p>
        </div>
        <span className="card-badge">
          <RouteIcon size={13} /> Top 10
        </span>
      </header>
      <div className="table-wrap">
        <table className="routes-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ruta</th>
              <th>Viajes</th>
              <th>Tarifa</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={`${r.pu_zone}-${r.do_zone}`}>
                <td className="rank">{String(i + 1).padStart(2, '0')}</td>
                <td>
                  <span className="route">
                    {r.from}
                    <ArrowRight size={13} />
                    {r.to}
                  </span>
                  <span className="route-bar">
                    <span style={{ width: `${(r.trips / max) * 100}%` }} />
                  </span>
                </td>
                <td className="num">{fmtInt(r.trips)}</td>
                <td className="num">{fmtMoney2(r.avg_fare)}</td>
                <td className="num">{r.avg_duration.toFixed(1)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-hint">Desliza la tabla para ver tarifa y duración →</p>
      <p className="chart-axis">la barra bajo cada ruta compara su frecuencia con la ruta número 1</p>
      <ChartHelp
        points={[
          'Cada fila es un par origen → destino que se repite en la muestra; se excluyen los viajes que empiezan y terminan en la misma zona.',
          'La columna «Viajes» es cuántas veces aparece ese par; la barra lo compara con la ruta más frecuente.',
          '«Tarifa» y «Duración» son promedios de ese corredor, útiles para estimar costo y tiempo.',
          'Un corredor con muchos viajes y tarifa alta es candidato a refuerzo de capacidad o a tarifa dinámica.',
        ]}
        note="Las rutas se calculan sobre la muestra de 500,000 viajes por año, así que el orden es representativo pero no es el censo completo."
      />
    </section>
  )
}
