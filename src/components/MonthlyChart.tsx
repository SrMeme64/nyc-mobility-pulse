import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyRow, Year } from '../lib/types'
import { MONTHS, fmtCompact, fmtInt, fmtMoney } from '../lib/format'
import { ChartTooltip } from './ui'
import { monthlyFor } from '../lib/data'
import { ANIMATE } from '../lib/motion'
import { ChartHelp } from './ChartHelp'

interface Props {
  rows: MonthlyRow[]
  year: Year
  years: number[]
}

const DURATION = ANIMATE ? 800 : 0

const HELP_ALL = [
  'Eje X: los meses de 2015 a 2025. Eje Y: viajes de la muestra en ese mes.',
  'Las subidas y bajadas muestran estacionalidad: verano suele ser más flojo y otoño más activo.',
  'Los huecos son años que no vienen en el conjunto (2016, 2023 y 2024), no ceros.',
  'El desplome de 2020 y su recuperación posterior son el evento más visible de la serie.',
]

const HELP_YEAR = [
  'Cada barra es un mes del año elegido; la línea punteada es el año anterior disponible.',
  'Si la barra queda por encima de la línea, ese mes creció respecto al año previo.',
  'Pasa el cursor sobre una barra para ver viajes y dinero recaudado exactos.',
]

export function MonthlyChart({ rows, year, years }: Props) {
  if (year === 'all') {
    const byKey = new Map(rows.map((r) => [`${r.year}-${r.month}`, r]))
    const first = years[0]
    const last = years[years.length - 1]
    const data: Array<{
      year: number
      month: number
      label: string
      trips: number | null
      revenue: number | null
    }> = []
    // Se generan los 12 meses de cada año del rango para que los años ausentes
    // (2016, 2023, 2024) queden como huecos reales en la serie.
    for (let y = first; y <= last; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const r = byKey.get(`${y}-${m}`)
        data.push({
          year: y,
          month: m,
          label: `${MONTHS[m - 1]} ${String(y).slice(2)}`,
          trips: r ? r.trips : null,
          revenue: r ? r.revenue : null,
        })
      }
    }
    const ticks = years.map((y) => `Ene ${String(y).slice(2)}`)

    return (
      <div className="chart-wrap">
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tripsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd23f" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#ffd23f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={ticks}
                tick={{ fill: '#8fa0b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtCompact(v as number)}
                tick={{ fill: '#8fa0b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(v, _n, row) =>
                      `${fmtInt(v)} viajes · ${fmtMoney(Number(row?.revenue ?? 0))}`
                    }
                    labelFormatter={(l) => String(l)}
                  />
                }
              />
              {data.some((d) => d.year === 2020 && d.month === 4) && (
                <ReferenceLine
                  x="Abr 20"
                  stroke="rgba(255,92,138,0.55)"
                  strokeDasharray="4 4"
                  label={{
                    value: 'COVID-19',
                    fill: '#ff8aa8',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="trips"
                name="Viajes por mes"
                stroke="#ffd23f"
                strokeWidth={2.2}
                fill="url(#tripsFill)"
                dot={false}
                activeDot={{ r: 4, fill: '#ffd23f', stroke: '#070b14', strokeWidth: 2 }}
                isAnimationActive={ANIMATE}
                animationDuration={DURATION}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span><i className="swatch yellow" /> Viajes por mes</span>
          <span><i className="swatch pink" /> Inicio de la pandemia</span>
          <span className="chart-legend-axis">eje Y: viajes · eje X: mes y año</span>
        </div>
        <p className="chart-note">
          Serie mensual completa. Faltan 2016, 2023 y 2024. Marzo 2018 aparece
          inflado por una duplicación en el archivo original de la TLC; se conserva
          sin imputar y se documenta en la metodología.
        </p>
        <ChartHelp
          points={HELP_ALL}
          note="La muestra es de 500,000 viajes por año: sirve para comparar formas y tendencias, no para leer volumen absoluto de la ciudad."
        />
      </div>
    )
  }

  const idx = years.indexOf(year)
  const prev = idx > 0 ? years[idx - 1] : null
  const current = monthlyFor(rows, year)
  const before = prev ? monthlyFor(rows, prev) : []
  const data = current.map((r, i) => ({
    month: MONTHS[i],
    current: r.trips,
    previous: before[i]?.trips ?? null,
    revenue: r.revenue,
  }))

  return (
    <div className="chart-wrap">
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#8fa0b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtCompact(v as number)}
              tick={{ fill: '#8fa0b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v) => `${fmtInt(v)} viajes`}
                  labelFormatter={(l) => String(l)}
                />
              }
            />
            <Bar
              dataKey="current"
              name={`Viajes ${year}`}
              fill="#ffd23f"
              radius={[5, 5, 0, 0]}
              maxBarSize={34}
              isAnimationActive={ANIMATE}
              animationDuration={DURATION}
            />
            {prev && (
              <Line
                type="monotone"
                dataKey="previous"
                name={`Viajes ${prev}`}
                stroke="#5b8cff"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={ANIMATE}
                animationDuration={DURATION}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span><i className="swatch yellow" /> {year}</span>
        {prev && <span><i className="swatch-line blue" /> {prev} (año previo)</span>}
        <span className="chart-legend-axis">eje Y: viajes · eje X: mes</span>
      </div>
      <p className="chart-note">
        {prev
          ? `Barras: ${year}. Línea punteada: ${prev} (año previo disponible).`
          : 'No hay un año anterior en el dataset para comparar.'}
        {year === 2018 &&
          ' Marzo está inflado por una duplicación en el archivo fuente de la TLC.'}
      </p>
      <ChartHelp
        points={HELP_YEAR}
        note="La muestra es de 500,000 viajes por año, así que compara proporciones entre años, no el volumen real de la ciudad."
      />
    </div>
  )
}
