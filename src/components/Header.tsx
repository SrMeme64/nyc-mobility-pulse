import { CarTaxiFront, Database, MapPin } from 'lucide-react'
import type { Year } from '../lib/types'

interface Props {
  years: number[]
  year: Year
  onYear: (y: Year) => void
  samplePerYear: number
}

export function Header({ years, year, onYear, samplePerYear }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#top" aria-label="Inicio">
          <span className="brand-mark">
            <CarTaxiFront size={22} strokeWidth={2.2} />
          </span>
          <span className="brand-text">
            <strong>NYC Mobility Pulse</strong>
            <small>Yellow Taxi · TLC Open Data</small>
          </span>
        </a>

        <nav className="nav" aria-label="Secciones">
          <a href="#demanda">Demanda</a>
          <a href="#geografia">Zonas</a>
          <a href="#economia">Tarifas</a>
          <a href="#eficiencia">Eficiencia</a>
          <a href="#metodologia">Metodología</a>
        </nav>

        <div className="topbar-tools">
          <span className="sample-pill" title={`${samplePerYear.toLocaleString('es-MX')} viajes por año`}>
            <Database size={14} />
            {samplePerYear / 1000}k / año
          </span>
          <label className="year-picker">
            <MapPin size={15} />
            <span className="sr-only">Año</span>
            <select
              value={String(year)}
              onChange={(e) =>
                onYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
            >
              <option value="all">Todos los años</option>
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
