import { CalendarRange, HelpCircle, MapPin, MousePointerClick } from 'lucide-react'

const TIPS = [
  {
    icon: CalendarRange,
    title: 'Filtra el periodo',
    text: 'Usa los años de la barra superior. Todos los indicadores y gráficas se recalculan al instante.',
    tone: 'yellow',
  },
  {
    icon: MousePointerClick,
    title: 'Pasa el cursor',
    text: 'Cada barra, celda o punto muestra una etiqueta con las cifras exactas y su significado.',
    tone: 'blue',
  },
  {
    icon: MapPin,
    title: 'Haz clic en el mapa',
    text: 'Selecciona una zona para ver origen, destino, tarifa, duración y propina de ese polígono.',
    tone: 'teal',
  },
  {
    icon: HelpCircle,
    title: 'Pide ayuda',
    text: 'Cada gráfica incluye un botón «¿Cómo leer esta gráfica?» con su explicación paso a paso.',
    tone: 'pink',
  },
]

export function ReadingGuide() {
  return (
    <section className="reading-guide" aria-labelledby="reading-guide-title">
      <div className="reading-guide-head">
        <span className="eyebrow">Antes de empezar</span>
        <h2 id="reading-guide-title">Cómo leer este tablero</h2>
        <p>
          Cuatro gestos bastan para pasar de la vista general al detalle de una
          zona o de una hora concreta.
        </p>
      </div>
      <div className="reading-guide-grid">
        {TIPS.map((tip) => {
          const Icon = tip.icon
          return (
            <article className={`reading-tip tone-${tip.tone}`} key={tip.title}>
              <span className="reading-tip-icon">
                <Icon size={18} />
              </span>
              <h3>{tip.title}</h3>
              <p>{tip.text}</p>
            </article>
          )
        })}
      </div>
      <div className="reading-legend" aria-label="Código de color del tablero">
        <span className="reading-legend-label">Código de color</span>
        <span><i className="swatch yellow" /> Amarillo: magnitud principal</span>
        <span><i className="swatch blue" /> Azul: año de comparación</span>
        <span><i className="swatch teal" /> Verde azulado: eficiencia</span>
        <span><i className="swatch pink" /> Rosa: alerta o caída</span>
      </div>
    </section>
  )
}
