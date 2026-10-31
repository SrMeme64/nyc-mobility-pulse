import type {
  BoroughRow,
  DashboardData,
  HistRow,
  HourlyRow,
  MonthlyRow,
  PaymentRow,
  ZoneRow,
} from './types'

export async function loadDashboard(): Promise<DashboardData> {
  const url = new URL('data/dashboard.json', document.baseURI)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo cargar dashboard.json (${res.status})`)
  return (await res.json()) as DashboardData
}

export const filterYear = <T extends { year: number }>(rows: T[], year: number) =>
  rows.filter((r) => r.year === year)

/** Agrega la matriz hora × día cuando se seleccionan todos los años. */
export function hourlyFor(rows: HourlyRow[], year: number | 'all'): HourlyRow[] {
  if (year !== 'all') return rows.filter((r) => r.year === year)
  const map = new Map<string, HourlyRow>()
  for (const r of rows) {
    const key = `${r.dow}-${r.hour}`
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
  return [...map.values()]
}

export function zonesFor(rows: ZoneRow[], year: number | 'all'): ZoneRow[] {
  if (year !== 'all') return rows.filter((r) => r.year === year)
  const map = new Map<number, ZoneRow>()
  for (const r of rows) {
    const acc = map.get(r.zone_id)
    if (!acc) {
      map.set(r.zone_id, { ...r, year: 0 })
    } else {
      const total = acc.pickups + r.pickups
      acc.avg_fare = (acc.avg_fare * acc.pickups + r.avg_fare * r.pickups) / total
      acc.avg_duration =
        (acc.avg_duration * acc.pickups + r.avg_duration * r.pickups) / total
      acc.tip_pct = (acc.tip_pct * acc.pickups + r.tip_pct * r.pickups) / total
      acc.pickups = total
      acc.dropoffs += r.dropoffs
      acc.revenue += r.revenue
    }
  }
  return [...map.values()]
}

export function histFor(rows: HistRow[], year: number | 'all'): HistRow[] {
  if (year !== 'all') return rows.filter((r) => r.year === year)
  const map = new Map<number, number>()
  for (const r of rows) map.set(r.bin, (map.get(r.bin) ?? 0) + r.count)
  return [...map.entries()]
    .map(([bin, count]) => ({ year: 0, bin, count }))
    .sort((a, b) => a.bin - b.bin)
}

export function paymentFor(
  rows: PaymentRow[],
  year: number | 'all',
): PaymentRow[] {
  if (year !== 'all') return rows.filter((r) => r.year === year)
  const map = new Map<number, PaymentRow>()
  for (const r of rows) {
    const acc = map.get(r.type)
    if (!acc) {
      map.set(r.type, { ...r, year: 0 })
    } else {
      const total = acc.trips + r.trips
      acc.tip_pct = (acc.tip_pct * acc.trips + r.tip_pct * r.trips) / total
      acc.avg_fare = (acc.avg_fare * acc.trips + r.avg_fare * r.trips) / total
      acc.trips = total
    }
  }
  return [...map.values()].sort((a, b) => b.trips - a.trips)
}

export function boroughsFor(
  rows: BoroughRow[],
  year: number | 'all',
): BoroughRow[] {
  if (year !== 'all') return rows.filter((r) => r.year === year)
  const map = new Map<string, BoroughRow>()
  for (const r of rows) {
    const acc = map.get(r.borough)
    if (!acc) {
      map.set(r.borough, { ...r, year: 0 })
    } else {
      const total = acc.trips + r.trips
      acc.avg_fare = (acc.avg_fare * acc.trips + r.avg_fare * r.trips) / total
      acc.tip_pct = (acc.tip_pct * acc.trips + r.tip_pct * r.trips) / total
      acc.trips = total
      acc.revenue += r.revenue
    }
  }
  return [...map.values()].sort((a, b) => b.trips - a.trips)
}

export function monthlyFor(rows: MonthlyRow[], year: number): MonthlyRow[] {
  const byMonth = new Map(
    rows
      .filter((r) => r.year === year)
      .map((r) => [r.month, r] as [number, MonthlyRow]),
  )
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    return (
      byMonth.get(month) ?? {
        year,
        month,
        trips: 0,
        avg_fare: 0,
        avg_duration: 0,
        revenue: 0,
      }
    )
  })
}

export function previousYear(years: number[], year: number | 'all'): number | null {
  if (year === 'all') return null
  const idx = years.indexOf(year)
  return idx > 0 ? years[idx - 1] : null
}

export function topZones(rows: ZoneRow[], n = 10, borough?: string): ZoneRow[] {
  return rows
    .filter((r) => !borough || r.borough === borough)
    .sort((a, b) => b.pickups - a.pickups)
    .slice(0, n)
}
