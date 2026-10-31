import { ExternalLink, GraduationCap, Users } from 'lucide-react'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <span className="footer-kicker">Proyecto 4 · Visualización de datos</span>
          <h2>NYC Mobility Pulse</h2>
          <p>
            Dashboard táctico de movilidad urbana construido con React, DuckDB y
            datos abiertos de NYC TLC.
          </p>
        </div>
        <div className="footer-team">
          <span className="footer-label"><Users size={14} /> Equipo</span>
          <ul>
            <li>Javier Rodríguez Rodríguez</li>
            <li>Diego Alonso López Ballesta</li>
          </ul>
          <span className="footer-label"><GraduationCap size={14} /> Docente</span>
          <p>Jessica Carmin Mendiola Fuentes</p>
        </div>
        <div className="footer-links">
          <span className="footer-label">Fuente de datos</span>
          <a
            href="https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page"
            target="_blank"
            rel="noreferrer"
          >
            NYC TLC Trip Record Data <ExternalLink size={13} />
          </a>
          <span className="footer-label">Stack</span>
          <p>React · TypeScript · Recharts · Leaflet · DuckDB</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Muestra reproducible de 500,000 viajes por año · {new Date().getFullYear()}</span>
        <span>Datos abiertos, uso académico</span>
      </div>
    </footer>
  )
}
