import { Database, FileSpreadsheet, Filter, Github, ShieldCheck } from 'lucide-react'
import type { DashboardMeta, QualityRow } from '../lib/types'
import { fmtCompact, fmtInt, fmtPct } from '../lib/format'

interface Props {
  meta: DashboardMeta
  quality: QualityRow[]
}

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Extracción',
    text: '8 archivos CSV anuales de NYC TLC (2015–2025) leídos completos con DuckDB.',
  },
  {
    icon: Filter,
    title: 'Limpieza',
    text: 'Normalización de esquemas, fechas y números con separador de miles; reglas de validez y descarte de outliers.',
  },
  {
    icon: Database,
    title: 'Muestra + base',
    text: '500,000 viajes por año (reservoir sampling, semilla 42) en Parquet y base DuckDB con catálogo de zonas.',
  },
  {
    icon: Github,
    title: 'Publicación',
    text: 'Agregados exportados a JSON y consumidos por React + Recharts + Leaflet; despliegue en GitHub Pages.',
  },
]

const RULES = [
  'Fecha de pickup dentro del año del archivo',
  'Duración entre 1 minuto y 6 horas',
  'Distancia entre 0.1 y 100 millas',
  'Tarifa y total no negativos',
  'Zonas TLC entre 1 y 265',
  'Coordenadas dentro del área de NYC',
]

export function Methodology({ meta, quality }: Props) {
  const total = quality.reduce((a, q) => a + q.total_rows, 0)
  const valid = quality.reduce((a, q) => a + q.valid_rows, 0)

  return (
    <section className="methodology" id="metodologia">
      <header className="section-head">
        <div>
          <span className="eyebrow">Fase 1 · Análisis y preprocesamiento</span>
          <h2>Cómo se construyó este dashboard</h2>
          <p>
            Del CSV crudo al tablero: un pipeline reproducible que documenta cada
            decisión sobre los datos.
          </p>
        </div>
        <div className="quality-summary">
          <span>Registros procesados</span>
          <strong>{fmtCompact(total)}</strong>
          <small>{fmtPct((valid / Math.max(1, total)) * 100, 1)} válidos</small>
        </div>
      </header>

      <div className="steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <article className="step" key={s.title}>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-icon"><Icon size={19} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          )
        })}
      </div>

      <div className="method-grid">
        <div className="card">
          <header className="card-head">
            <div>
              <h3 className="card-title">Reglas de limpieza</h3>
              <p className="card-sub">Criterios aplicados antes del muestreo</p>
            </div>
            <span className="card-badge"><ShieldCheck size={13} /> calidad</span>
          </header>
          <ul className="rules">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="chart-note">
            Los valores atípicos se descartan, no se imputan: el dashboard describe
            viajes reales, no una serie suavizada.
          </p>
        </div>

        <div className="card">
          <header className="card-head">
            <div>
              <h3 className="card-title">Calidad por año</h3>
              <p className="card-sub">Registros fuente, válidos y muestra final</p>
            </div>
          </header>
          <div className="table-wrap">
            <table className="quality-table">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Fuente</th>
                  <th>Válidos</th>
                  <th>Muestra</th>
                </tr>
              </thead>
              <tbody>
                {quality.map((q) => (
                  <tr key={q.year}>
                    <td>{q.year}</td>
                    <td className="num">{fmtCompact(q.total_rows)}</td>
                    <td className="num">
                      {fmtPct((q.valid_rows / Math.max(1, q.total_rows)) * 100, 1)}
                    </td>
                    <td className="num">{fmtInt(q.sample_rows)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-note">
            Fuente: {meta.dataset}. Los años 2016, 2023 y 2024 no están disponibles
            en el conjunto entregado.
          </p>
        </div>
      </div>
    </section>
  )
}
