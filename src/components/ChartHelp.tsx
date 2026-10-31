import { useId, useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface Props {
  /** Puntos concretos: qué muestra cada eje, qué mirar y qué cuidar. */
  points: string[]
  note?: string
  title?: string
}

/**
 * Explicación desplegable para cada gráfica. Está pensada para alguien que ve
 * el tablero por primera vez: qué representa, cómo se lee y qué conclusión
 * puede sacar. Usa `grid-template-rows` para animar la altura sin medir el DOM.
 */
export function ChartHelp({ points, note, title = '¿Cómo leer esta gráfica?' }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <div className={`chart-help ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="chart-help-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={14} />
        <span>{title}</span>
        <ChevronDown size={14} className="chart-help-chevron" aria-hidden="true" />
      </button>
      <div className="chart-help-body" id={id} role="region" aria-label={title}>
        <div className="chart-help-inner">
          <ul>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {note && <p className="chart-help-note">{note}</p>}
        </div>
      </div>
    </div>
  )
}
