export type Year = number | 'all'

export interface Kpi {
  year: number | 'all'
  trips: number
  avg_duration: number
  avg_distance: number
  avg_fare: number
  fare_per_mile: number
  tip_pct: number
  revenue: number
  active_zones: number
  avg_speed: number
  source_trips?: number | null
  source_valid?: number | null
}

export interface MonthlyRow {
  year: number
  month: number
  trips: number
  avg_fare: number
  avg_duration: number
  revenue: number
}

export interface HourlyRow {
  year: number
  dow: number
  hour: number
  trips: number
  avg_fare: number
  avg_duration: number
}

export interface ZoneRow {
  year: number
  zone_id: number
  pickups: number
  dropoffs: number
  avg_fare: number
  avg_duration: number
  tip_pct: number
  revenue: number
  zone: string
  borough: string
}

export interface BoroughRow {
  year: number
  borough: string
  trips: number
  avg_fare: number
  tip_pct: number
  revenue: number
}

export interface PaymentRow {
  year: number
  type: number
  trips: number
  tip_pct: number
  avg_fare: number
  name: string
}

export interface HistRow {
  year: number
  bin: number
  count: number
}

export interface BoxRow {
  year: number | 'all'
  grp: string
  n: number
  p05: number
  p25: number
  median: number
  p75: number
  p95: number
}

export interface ScatterRow {
  year: number | 'all'
  distance: number
  fare: number
  duration: number
  tip_pct: number
  payment_type: number
}

export interface RouteRow {
  year: number
  pu_zone: number
  do_zone: number
  trips: number
  avg_fare: number
  avg_duration: number
  from: string
  to: string
}

export interface QualityRow {
  year: number
  source_file: string
  source_gb: number
  total_rows: number
  valid_rows: number
  bad_ts: number
  bad_year: number
  bad_duration: number
  bad_distance: number
  bad_money: number
  bad_tip: number
  bad_passengers: number
  bad_zone: number
  bad_coords: number
  avg_duration: number
  avg_distance: number
  avg_fare: number
  sample_rows: number
  sample_fraction: number
  seconds: number
}

export interface DashboardMeta {
  generatedAt: string
  dataset: string
  source: string
  years: number[]
  samplePerYear: number
  totalTripsSample: number
  totalTripsSource: number | null
  zonesCount: number
  paymentNames: Record<string, string>
}

export interface DashboardData {
  meta: DashboardMeta
  kpis: Record<string, Kpi>
  monthly: MonthlyRow[]
  hourly: HourlyRow[]
  zones: ZoneRow[]
  boroughs: BoroughRow[]
  payment: PaymentRow[]
  histFare: HistRow[]
  histDistance: HistRow[]
  boxplot: BoxRow[]
  scatter: ScatterRow[]
  routes: RouteRow[]
  quality: QualityRow[]
}

export interface ZoneFeatureProps {
  zoneId: number
  zone: string
  borough: string
  serviceZone: string
}
