import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, BarChart3, CalendarRange, Loader2 } from 'lucide-react'
import type { DashboardData, Year } from './lib/types'
import { loadDashboard, previousYear } from './lib/data'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { KpiGrid } from './components/KpiGrid'
import { MonthlyChart } from './components/MonthlyChart'
import { Insights } from './components/Insights'
import { Heatmap } from './components/Heatmap'
import { ZonesSection } from './components/ZonesSection'
import { EconomySection } from './components/EconomySection'
import { EfficiencySection } from './components/EfficiencySection'
import { RoutesSection } from './components/RoutesSection'
import { Methodology } from './components/Methodology'
import { Footer } from './components/Footer'
import { Card } from './components/ui'
import { Reveal } from './components/Reveal'
import { ReadingGuide } from './components/ReadingGuide'

function SectionHead({
  kicker,
  title,
  text,
}: {
  kicker: string
  title: string
  text: string
}) {
  const index = kicker.split('·')[0].trim()
  return (
    <header className="section-head">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <span className="section-ghost" aria-hidden="true">
        {index}
      </span>
    </header>
  )
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState<Year>('all')

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  const kpi = data?.kpis[String(year)] ?? null
  const prevYear = data && typeof year === 'number' ? previousYear(data.meta.years, year) : null
  const previous = data && prevYear != null ? data.kpis[String(prevYear)] : undefined

  const yearLabel = useMemo(
    () => (year === 'all' ? 'todos los años' : String(year)),
    [year],
  )

  if (error) {
    return (
      <div className="state-screen">
        <AlertTriangle size={36} />
        <h1>No se pudo cargar el dashboard</h1>
        <p>{error}</p>
        <p className="state-hint">
          Verifica que <code>public/data/dashboard.json</code> exista. Puedes
          regenerarlo con <code>python etl/04_build_aggregates.py</code>.
        </p>
      </div>
    )
  }

  if (!data || !kpi) {
    return (
      <div className="state-screen">
        <div className="loader-mark"><Loader2 size={30} className="spin" /></div>
        <h1>Cargando el pulso de la ciudad</h1>
        <p>Leyendo agregados de NYC Yellow Taxi…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <Header years={data.meta.years} year={year} onYear={setYear} />

      <main>
        <Hero meta={data.meta} kpi={kpi} year={year} />

        <Reveal delay={80}>
          <KpiGrid key={String(year)} kpi={kpi} previous={previous} year={year} />
        </Reveal>

        <Reveal delay={140}>
          <ReadingGuide />
        </Reveal>

        <section className="section" id="demanda">
          <Reveal>
            <SectionHead
              kicker="01 · Demanda"
              title="Cuándo se mueve la ciudad"
              text="La serie mensual y el ritmo semanal muestran los picos de actividad, la estacionalidad y el impacto de la pandemia."
            />
          </Reveal>
          <div className="demand-grid">
            <Reveal delay={60}>
              <Card
                title="Viajes por mes"
                subtitle={
                  year === 'all'
                    ? 'Serie histórica completa · muestra anual'
                    : `Año ${year} vs. año previo disponible`
                }
                action={
                  <span className="card-badge">
                    <CalendarRange size={13} /> {yearLabel}
                  </span>
                }
                className="monthly-card"
              >
                <MonthlyChart rows={data.monthly} year={year} years={data.meta.years} />
              </Card>
            </Reveal>
            <Reveal delay={130}>
              <Card
                title="Lecturas rápidas"
                subtitle="Lo que dicen los números del periodo"
                action={<span className="card-badge"><BarChart3 size={13} /> insights</span>}
              >
                <Insights
                  kpi={kpi}
                  previous={previous}
                  monthly={data.monthly}
                  hourly={data.hourly}
                  zones={data.zones}
                  year={year}
                />
              </Card>
            </Reveal>
          </div>

          <Reveal delay={80}>
            <Card
              title="Ritmo semanal"
              subtitle="Viajes por día de la semana y hora del día"
              action={<span className="card-badge">168 franjas</span>}
            >
              <Heatmap rows={data.hourly} year={year} />
            </Card>
          </Reveal>
        </section>

        <section className="section" id="geografia">
          <Reveal>
            <SectionHead
              kicker="02 · Territorio"
              title="Dónde late la demanda"
              text="Una lectura geográfica de origen, destino y tarifa media por zona TLC. Filtra por borough y explora el detalle de cada zona."
            />
          </Reveal>
          <Reveal variant="fade">
            <ZonesSection rows={data.zones} year={year} />
          </Reveal>
        </section>

        <section className="section" id="economia">
          <Reveal>
            <SectionHead
              kicker="03 · Economía del viaje"
              title="Cuánto cuesta moverse"
              text="Tarifas, distancias, métodos de pago y propinas: la estructura económica de cada viaje."
            />
          </Reveal>
          <Reveal delay={60}>
            <EconomySection
              fare={data.histFare}
              distance={data.histDistance}
              payment={data.payment}
              kpi={kpi}
              year={year}
            />
          </Reveal>
        </section>

        <section className="section" id="eficiencia">
          <Reveal>
            <SectionHead
              kicker="04 · Eficiencia"
              title="Velocidad, congestión y equidad"
              text="Compara la duración del viaje entre hora pico, valle, fin de semana y madrugada, y observa la relación entre distancia y tarifa."
            />
          </Reveal>
          <Reveal delay={60}>
            <EfficiencySection boxplot={data.boxplot} scatter={data.scatter} year={year} />
          </Reveal>
        </section>

        <section className="section">
          <Reveal>
            <SectionHead
              kicker="05 · Rutas"
              title="Los corredores de la ciudad"
              text="Pares origen–destino que más se repiten en la muestra. Útiles para planear capacidad y detectar conexiones críticas."
            />
          </Reveal>
          <Reveal delay={60}>
            <RoutesSection rows={data.routes} year={year} />
          </Reveal>
        </section>

        <Reveal variant="fade">
          <Methodology meta={data.meta} quality={data.quality} />
        </Reveal>

        <Reveal delay={60}>
          <section className="cta">
            <div>
              <span className="eyebrow">Siguiente parada</span>
              <h2>Explora el detalle zona por zona</h2>
              <p>
                Cambia el año en la barra superior para comparar la evolución de la
                demanda, las tarifas y la propina media.
              </p>
            </div>
            <a href="#top" className="cta-link">
              Volver arriba <ArrowUpRight size={16} />
            </a>
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  )
}
