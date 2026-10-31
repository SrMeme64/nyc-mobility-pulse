import { ArrowDownRight, Database, MapPin, Sparkles } from 'lucide-react'
import type { DashboardMeta, Kpi, Year } from '../lib/types'
import { fmtCompact, fmtInt } from '../lib/format'

interface Props {
  meta: DashboardMeta
  kpi: Kpi
  year: Year
}

export function Hero({ meta, kpi, year }: Props) {
  const source = kpi.source_trips ?? meta.totalTripsSource ?? meta.totalTripsSample
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="pulse-dot" />
          Proyecto 4 · Visualización de datos
        </span>
        <h1>
          El pulso de la <em>movilidad</em> en <span className="nowrap">Nueva York</span>
        </h1>
        <p>
          Ocho años de viajes en taxi amarillo para leer la ciudad a través de su
          demanda, sus tarifas y sus zonas más activas. Un dashboard táctico para
          decidir dónde, cuándo y cómo se mueve Nueva York.
        </p>
        <div className="hero-chips">
          <span><Database size={14} /> {fmtCompact(meta.totalTripsSample)} viajes muestreados</span>
          <span><MapPin size={14} /> {meta.zonesCount} zonas TLC</span>
          <span><Sparkles size={14} /> {meta.years[0]}—{meta.years[meta.years.length - 1]}</span>
        </div>
      </div>

      <aside className="ticket" aria-label="Resumen del dataset">
        <div className="ticket-head">
          <span>NYC TLC · YELLOW TAXI</span>
          <span className="ticket-code">NYC-{year === 'all' ? 'ALL' : year}</span>
        </div>
        <div className="ticket-main">
          <span>Registros fuente procesados</span>
          <strong>{fmtCompact(source)}</strong>
          <small>
            {fmtInt(kpi.trips)} viajes analizados en la muestra
          </small>
        </div>
        <div className="ticket-grid">
          <div>
            <span>Años</span>
            <strong>{meta.years.length}</strong>
          </div>
          <div>
            <span>Zonas</span>
            <strong>{meta.zonesCount}</strong>
          </div>
          <div>
            <span>Viajes / año</span>
            <strong>{fmtCompact(meta.samplePerYear)}</strong>
          </div>
        </div>
        <div className="ticket-foot">
          <span className="barcode" aria-hidden="true" />
          <span className="ticket-note">
            <ArrowDownRight size={13} /> Vista {year === 'all' ? 'histórica' : year}
          </span>
        </div>
      </aside>
    </section>
  )
}
