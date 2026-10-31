import { useEffect, useState } from 'react'
import { CarTaxiFront, CalendarRange } from 'lucide-react'
import type { Year } from '../lib/types'

interface Props {
  years: number[]
  year: Year
  onYear: (y: Year) => void
}

const SECTIONS = ['demanda', 'geografia', 'economia', 'eficiencia', 'metodologia']

export function Header({ years, year, onYear }: Props) {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('')

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const doc = document.documentElement
        const max = doc.scrollHeight - window.innerHeight
        const y = window.scrollY
        setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0)

        // Sección activa: la última cuyo inicio ya pasó el borde superior.
        let current = ''
        for (const id of SECTIONS) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= 140) current = id
        }
        setActive(current)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

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
          <a href="#demanda" className={active === 'demanda' ? 'active' : ''}>Demanda</a>
          <a href="#geografia" className={active === 'geografia' ? 'active' : ''}>Zonas</a>
          <a href="#economia" className={active === 'economia' ? 'active' : ''}>Tarifas</a>
          <a href="#eficiencia" className={active === 'eficiencia' ? 'active' : ''}>Eficiencia</a>
          <a href="#metodologia" className={active === 'metodologia' ? 'active' : ''}>Metodología</a>
        </nav>

        <div className="year-strip" role="group" aria-label="Filtrar por año">
          <CalendarRange size={14} className="year-strip-icon" aria-hidden="true" />
          <div className="year-strip-scroll">
            <button
              type="button"
              className={year === 'all' ? 'active' : ''}
              aria-pressed={year === 'all'}
              onClick={() => onYear('all')}
            >
              Todos
            </button>
            {[...years].reverse().map((y) => (
              <button
                key={y}
                type="button"
                className={year === y ? 'active' : ''}
                aria-pressed={year === y}
                onClick={() => onYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>
      <span
        className="topbar-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
    </header>
  )
}
