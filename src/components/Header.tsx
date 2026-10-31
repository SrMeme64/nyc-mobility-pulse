import { useEffect, useRef, useState } from 'react'
import { CalendarRange, CarTaxiFront, ChevronDown } from 'lucide-react'
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
  const [open, setOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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

  // Mantiene visible el año activo cuando la tira no cabe completa.
  useEffect(() => {
    const strip = stripRef.current
    const btn = strip?.querySelector<HTMLElement>('button.active')
    if (!strip || !btn) return
    const s = strip.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({
      left: strip.scrollLeft + (b.left - s.left) - (s.width - b.width) / 2,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [year])

  // Cierra el menú al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!selectRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Al abrir con teclado, el foco entra al menú con Tab; no forzamos el foco
  // para no dibujar un anillo doble sobre la opción activa al usar el ratón.
  const pick = (value: Year) => {
    onYear(value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const current = year === 'all' ? 'Todos' : String(year)

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

        {/* Escritorio: tira de años en una sola línea. */}
        <div className="year-strip" role="group" aria-label="Filtrar por año">
          <span className="year-strip-label">Año</span>
          <div className="year-strip-scroll" ref={stripRef}>
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

        {/* Móvil y tablet: selector compacto con menú. */}
        <div className="year-select" ref={selectRef}>
          <button
            type="button"
            ref={triggerRef}
            className={`year-select-btn ${open ? 'open' : ''}`}
            aria-expanded={open}
            aria-controls="year-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarRange size={15} aria-hidden="true" />
            <span className="year-select-label">Año</span>
            <strong>{current}</strong>
            <ChevronDown size={15} className="year-select-chevron" aria-hidden="true" />
          </button>
          {open && (
            <div className="year-menu" id="year-menu" role="group" aria-label="Elegir año">
              <button
                type="button"
                className={`year-menu-all ${year === 'all' ? 'active' : ''}`}
                aria-pressed={year === 'all'}
                onClick={() => pick('all')}
              >
                Todos los años
              </button>
              <div className="year-menu-grid">
                {[...years].reverse().map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={year === y ? 'active' : ''}
                    aria-pressed={year === y}
                    onClick={() => pick(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
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
