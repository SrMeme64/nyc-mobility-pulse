const nf = new Intl.NumberFormat('es-MX')
const nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const money2 = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const fmtInt = (v: number | null | undefined) =>
  v == null ? '—' : nf.format(Math.round(v))

export const fmtCompact = (v: number | null | undefined) =>
  v == null ? '—' : compact.format(v)

export const fmtDecimal = (v: number | null | undefined) =>
  v == null ? '—' : nf1.format(v)

export const fmtMoney = (v: number | null | undefined) =>
  v == null ? '—' : money.format(v)

export const fmtMoney2 = (v: number | null | undefined) =>
  v == null ? '—' : money2.format(v)

export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : `${v.toFixed(digits)}%`

export const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DAYS_LONG = [
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
]

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v))

/** Interpola entre dos colores hex (#rrggbb). */
export function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(t)))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Escala de color secuencial para mapas de calor y coropletas. */
export function heatColor(t: number): string {
  const stops = ['#101a2e', '#1f3a5f', '#2f6f8f', '#4fa58a', '#d8b93f', '#ffd23f']
  const x = clamp(t) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  return mixColor(stops[i], stops[i + 1], x - i)
}

export function correlation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0
}

export const percentChange = (current: number, previous?: number | null) =>
  previous && previous > 0 ? ((current - previous) / previous) * 100 : null
