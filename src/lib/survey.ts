/**
 * Instrumento de evaluación embebido (Fase 4).
 *
 * Espeja el cuestionario de docs/fase4/cuestionario_fase4.txt para que el
 * consultor lo responda dentro del dashboard y, al final, el sitio abra el
 * formulario de Google con las respuestas ya cargadas (ver lib/prefill.ts).
 *
 * Las respuestas de referencia de las tareas se verificaron contra
 * public/data/dashboard.json (agregados de NYC Yellow Taxi · TLC).
 */

export type Answers = Record<string, string>

export type TaskVerdict = 'correcta' | 'parcial' | 'incorrecta'

export interface TaskCheck {
  verdict: TaskVerdict
  score: 0 | 0.5 | 1
  detail: string
  anchor: string
  anchorLabel: string
}

interface BaseQuestion {
  id: string
  label: string
  help?: string
  /** Por defecto toda pregunta es obligatoria; las abiertas se marcan false. */
  required?: boolean
}

export interface ChoiceQuestion extends BaseQuestion {
  kind: 'choice'
  options: string[]
  /** Muestra un campo de texto cuando se elige la opción "Otra". */
  other?: boolean
}

export interface ShortQuestion extends BaseQuestion {
  kind: 'short'
  placeholder?: string
  check?: (value: string) => TaskCheck
}

export interface ScaleQuestion extends BaseQuestion {
  kind: 'scale'
  left: string
  right: string
}

export interface TextQuestion extends BaseQuestion {
  kind: 'text'
  rows?: number
}

export type Question = ChoiceQuestion | ShortQuestion | ScaleQuestion | TextQuestion

export interface Step {
  id: string
  eyebrow: string
  title: string
  intro?: string
  questions: Question[]
}

/* --------------------------------------------------------------- utilidades */

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const round = (value: number) => Math.round(value * 10) / 10

export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

/* ---------------------------------------------------- respuestas de tareas */

export function checkT1(value: string): TaskCheck {
  const t = normalize(value)
  const year = /\b2020\b/.test(t)
  const month = /\b(abril|abr)\b/.test(t) || /\b0?4\b/.test(t)
  const anchor = 'demanda'
  const anchorLabel = 'Ver la serie mensual'

  if (year && month) {
    return {
      verdict: 'correcta',
      score: 1,
      detail: 'Correcto: abril de 2020 registra 4,702 viajes, el mínimo de la serie.',
      anchor,
      anchorLabel,
    }
  }
  if (year) {
    return {
      verdict: 'parcial',
      score: 0.5,
      detail: 'Parcial: el año es correcto (2020), pero falta el mes. La respuesta completa es abril de 2020.',
      anchor,
      anchorLabel,
    }
  }
  if (month) {
    return {
      verdict: 'parcial',
      score: 0.5,
      detail: 'Parcial: el mes es correcto (abril), pero falta el año. La respuesta completa es abril de 2020.',
      anchor,
      anchorLabel,
    }
  }
  return {
    verdict: 'incorrecta',
    score: 0,
    detail: 'La respuesta es abril de 2020: 4,702 viajes, el punto más bajo de la serie.',
    anchor,
    anchorLabel,
  }
}

export function checkT2(value: string): TaskCheck {
  const t = normalize(value)
  const month = /\b(octubre|oct)\b/.test(t) || /\b10\b/.test(t)
  const year = /\b2025\b/.test(t)
  const anchor = 'demanda'
  const anchorLabel = 'Ver la serie mensual'

  if (month) {
    return {
      verdict: 'correcta',
      score: 1,
      detail: 'Correcto: octubre de 2025 suma 46,007 viajes, el máximo del año.',
      anchor,
      anchorLabel,
    }
  }
  if (year) {
    return {
      verdict: 'parcial',
      score: 0.5,
      detail: 'Parcial: identificaste el año, pero la pregunta pide el mes. Es octubre.',
      anchor,
      anchorLabel,
    }
  }
  return {
    verdict: 'incorrecta',
    score: 0,
    detail: 'La respuesta es octubre de 2025, con 46,007 viajes.',
    anchor,
    anchorLabel,
  }
}

export function checkT3(value: string): TaskCheck {
  const t = normalize(value)
  const upperEast = /upper east/.test(t)
  const south = /\bsouth\b/.test(t) || /\bs\b/.test(t)
  const anchor = 'geografia'
  const anchorLabel = 'Ver el mapa de zonas'

  if (upperEast && south) {
    return {
      verdict: 'correcta',
      score: 1,
      detail: 'Correcto: Upper East Side South lidera 2025 con 22,392 recogidas.',
      anchor,
      anchorLabel,
    }
  }
  if (upperEast) {
    return {
      verdict: 'parcial',
      score: 0.5,
      detail: 'Parcial: la zona está en Upper East Side, pero falta el detalle. Es Upper East Side South.',
      anchor,
      anchorLabel,
    }
  }
  return {
    verdict: 'incorrecta',
    score: 0,
    detail: 'La respuesta es Upper East Side South, con 22,392 recogidas en 2025.',
    anchor,
    anchorLabel,
  }
}

export function checkT4(value: string): TaskCheck {
  const t = normalize(value)
  const day = /\b(miercoles|mie|mierc)\b/.test(t)
  const hour =
    /\b18\b/.test(t) ||
    /18\s*00/.test(t) ||
    /6\s*pm/.test(t) ||
    /6\s*de\s*la\s*tarde/.test(t) ||
    /6\s*p\s*m/.test(t)
  const anchor = 'ritmo'
  const anchorLabel = 'Ver el heatmap'

  if (day && hour) {
    return {
      verdict: 'correcta',
      score: 1,
      detail: 'Correcto: el miércoles a las 18:00 se concentran 5,261 viajes.',
      anchor,
      anchorLabel,
    }
  }
  if (day || hour) {
    return {
      verdict: 'parcial',
      score: 0.5,
      detail: 'Parcial: acertaste una parte. El pico es el miércoles a las 18:00.',
      anchor,
      anchorLabel,
    }
  }
  return {
    verdict: 'incorrecta',
    score: 0,
    detail: 'La respuesta es miércoles a las 18:00, con 5,261 viajes.',
    anchor,
    anchorLabel,
  }
}

/* --------------------------------------------------------------- instrumento */

const SCALE = { left: 'Totalmente en desacuerdo', right: 'Totalmente de acuerdo' }

export const STEPS: Step[] = [
  {
    id: 's0',
    eyebrow: 'Paso 1 · Consentimiento',
    title: 'Evaluación del dashboard',
    intro:
      'Este cuestionario evalúa NYC Mobility Pulse, un tablero sobre la movilidad de Nueva York construido con datos públicos de taxis amarillos (TLC). Usted participa como consultor anónimo: no se le pedirá su nombre, su correo ni ningún dato que permita identificarle. El panel no bloquea el tablero: puede minimizarlo, mover los filtros y volver cuando quiera.',
    questions: [
      {
        id: 'Q00',
        kind: 'choice',
        label: '¿Acepta participar en esta evaluación?',
        help: 'Responda con sinceridad: no hay respuestas correctas ni incorrectas. Puede abandonar en cualquier momento.',
        options: ['Sí, acepto', 'No acepto'],
      },
    ],
  },
  {
    id: 'p1',
    eyebrow: 'Paso 2 · Perfil',
    title: 'Quién evalúa',
    intro:
      'Estos datos describen su perfil, no su identidad. Se usan para comparar los resultados entre perfiles con distinta experiencia y formación.',
    questions: [
      {
        id: 'P01',
        kind: 'choice',
        label: '¿Cuál es su rango de edad?',
        options: ['18 a 24 años', '25 a 34 años', '35 a 44 años', '45 a 54 años', '55 años o más'],
      },
      {
        id: 'P02',
        kind: 'choice',
        label: '¿Con qué género se identifica?',
        options: ['Femenino', 'Masculino', 'No binario', 'Prefiero no responder', 'Otra'],
        other: true,
      },
      {
        id: 'P03',
        kind: 'choice',
        label: '¿Cuál es su nivel académico máximo?',
        options: [
          'Bachillerato o equivalente',
          'Técnico superior',
          'Licenciatura en curso',
          'Licenciatura concluida',
          'Maestría',
          'Doctorado',
        ],
      },
      {
        id: 'P04',
        kind: 'choice',
        label: '¿Cuál es su área de formación principal?',
        options: [
          'Ingeniería en Datos',
          'Ingeniería en Sistemas o Computación',
          'Estadística o Matemáticas',
          'Economía o Finanzas',
          'Ciencias Sociales o Urbanismo',
          'Diseño o Comunicación',
          'Otra',
        ],
        other: true,
      },
    ],
  },
  {
    id: 'p2',
    eyebrow: 'Paso 3 · Perfil',
    title: 'Experiencia con datos',
    questions: [
      {
        id: 'P05',
        kind: 'choice',
        label: '¿Cuál es su ocupación actual?',
        options: [
          'Estudiante',
          'Docente',
          'Analista de datos o de inteligencia de negocio',
          'Ingeniero o ingeniera de datos',
          'Investigador o investigadora',
          'Consultor o consultora',
          'Otra',
        ],
        other: true,
      },
      {
        id: 'P06',
        kind: 'choice',
        label: 'Si es estudiante, ¿en qué momento de su trayectoria está?',
        options: [
          '1.º a 3.º semestre',
          '4.º a 6.º semestre',
          '7.º a 9.º semestre',
          '10.º semestre o más',
          'Egresado o egresada',
          'No aplica',
        ],
      },
      {
        id: 'P07',
        kind: 'choice',
        label: '¿Qué experiencia tiene usando dashboards (Power BI, Tableau, Looker, etc.)?',
        options: [
          'Ninguna',
          'Baja (los he visto, pero no los he usado)',
          'Media (los uso de vez en cuando)',
          'Alta (los uso con frecuencia o los construyo)',
        ],
      },
      {
        id: 'P08',
        kind: 'choice',
        label: '¿Con qué frecuencia usa herramientas de visualización de datos?',
        options: ['Nunca', 'Algunas veces al año', 'Mensualmente', 'Semanalmente', 'A diario'],
      },
    ],
  },
  {
    id: 'p3',
    eyebrow: 'Paso 4 · Perfil',
    title: 'Contexto y dispositivo',
    questions: [
      {
        id: 'P09',
        kind: 'choice',
        label: '¿Qué conocimiento previo tiene de los datos TLC de Nueva York?',
        options: ['Ninguno', 'He oído hablar del dataset', 'Conozco el dataset y sus variables', 'He trabajado con él'],
      },
      {
        id: 'P10',
        kind: 'choice',
        label: '¿Qué tan familiarizado está con la ciudad de Nueva York?',
        options: ['No la conozco', 'La conozco por mapas o referencias', 'La he visitado', 'He vivido allí'],
      },
      {
        id: 'P11',
        kind: 'choice',
        label: '¿En qué dispositivo respondió principalmente?',
        options: ['Laptop o computadora de escritorio', 'Tableta', 'Teléfono móvil'],
      },
      {
        id: 'P12',
        kind: 'choice',
        label: '¿Había evaluado antes un dashboard o un producto de datos?',
        options: ['Sí', 'No'],
      },
    ],
  },
  {
    id: 't1',
    eyebrow: 'Paso 5 · Tareas',
    title: 'El punto más bajo de la serie',
    intro:
      'Con el tablero a la vista, resuelva la tarea. Puede minimizar este panel para usar los filtros. No hay tiempo límite. Si no encuentra la respuesta, escriba NO ENCONTRADA.',
    questions: [
      {
        id: 'T1',
        kind: 'short',
        label:
          'En la serie histórica (filtro "Todos"), ¿en qué año y mes se registra el punto más bajo de viajes?',
        help: 'Escriba año y mes. Ejemplo de formato: 2019, julio.',
        placeholder: 'Año y mes',
        check: checkT1,
      },
    ],
  },
  {
    id: 't2',
    eyebrow: 'Paso 6 · Tareas',
    title: 'El mes más activo de 2025',
    questions: [
      {
        id: 'T2',
        kind: 'short',
        label: 'Con el filtro en 2025, ¿cuál es el mes con más viajes?',
        help: 'Escriba solo el mes.',
        placeholder: 'Mes',
        check: checkT2,
      },
    ],
  },
  {
    id: 't3',
    eyebrow: 'Paso 7 · Tareas',
    title: 'La zona que más recoge',
    questions: [
      {
        id: 'T3',
        kind: 'short',
        label: 'Con el filtro en 2025, ¿cuál es la zona con más recogidas?',
        help: 'Puede consultarlo en el mapa o en el ranking de zonas.',
        placeholder: 'Nombre de la zona',
        check: checkT3,
      },
    ],
  },
  {
    id: 't4',
    eyebrow: 'Paso 8 · Tareas',
    title: 'El pico de la semana',
    questions: [
      {
        id: 'T4',
        kind: 'short',
        label:
          'Con el filtro en 2025, en el heatmap de día y hora, ¿cuál es el día y la hora de mayor demanda?',
        help: 'Escriba día y hora. Ejemplo de formato: lunes, 8:00.',
        placeholder: 'Día y hora',
        check: checkT4,
      },
    ],
  },
  {
    id: 't5',
    eyebrow: 'Paso 9 · Tareas',
    title: 'Cómo se sintió',
    questions: [
      {
        id: 'T05',
        kind: 'scale',
        label: '¿Qué tan difícil le resultó completar las cuatro tareas?',
        left: 'Muy difícil',
        right: 'Muy fácil',
      },
      {
        id: 'T06',
        kind: 'choice',
        label: '¿Cuánto tiempo dedicó al conjunto de las cuatro tareas?',
        options: ['Menos de 2 minutos', 'De 2 a 5 minutos', 'De 5 a 10 minutos', 'Más de 10 minutos'],
      },
    ],
  },
  {
    id: 's3',
    eyebrow: 'Paso 10 · Usabilidad',
    title: 'Usabilidad percibida',
    intro: 'Indique su grado de acuerdo con cada afirmación.',
    questions: [
      { id: 'U1', kind: 'scale', label: 'Encontré rápidamente la información que buscaba.', ...SCALE },
      { id: 'U2', kind: 'scale', label: 'Los filtros y botones son intuitivos.', ...SCALE },
      { id: 'U3', kind: 'scale', label: 'El recorrido de la página va de lo general a lo particular.', ...SCALE },
      { id: 'U4', kind: 'scale', label: 'No necesité ayuda externa para moverme por el tablero.', ...SCALE },
      { id: 'U5', kind: 'scale', label: 'En general, el tablero es fácil de usar.', ...SCALE },
    ],
  },
  {
    id: 's4',
    eyebrow: 'Paso 11 · Comprensión',
    title: '¿Se entiende lo que muestra?',
    intro: 'Evalúe si el tablero comunica lo que muestra, sin necesidad de explicaciones.',
    questions: [
      { id: 'C1', kind: 'scale', label: 'Los títulos de las secciones anuncian con claridad su contenido.', ...SCALE },
      { id: 'C2', kind: 'scale', label: 'Los ejes, leyendas y unidades se entienden sin explicación adicional.', ...SCALE },
      { id: 'C3', kind: 'scale', label: 'Entendí qué mide cada KPI sin consultar la metodología.', ...SCALE },
      { id: 'C4', kind: 'scale', label: 'El mapa y su escala de color se explican por sí mismos.', ...SCALE },
      {
        id: 'C5',
        kind: 'scale',
        label: 'Pude formular al menos una conclusión propia sobre la movilidad de Nueva York.',
        ...SCALE,
      },
    ],
  },
  {
    id: 's5',
    eyebrow: 'Paso 12 · KPIs',
    title: 'Pertinencia de los indicadores',
    intro: 'Evalúe si los indicadores responden a la pregunta del proyecto.',
    questions: [
      {
        id: 'K1',
        kind: 'scale',
        label: 'Los KPIs responden a la pregunta "cuándo, dónde y a qué costo se mueve la ciudad".',
        ...SCALE,
      },
      { id: 'K2', kind: 'scale', label: 'Identifiqué con facilidad el KPI más importante.', ...SCALE },
      { id: 'K3', kind: 'scale', label: 'Los indicadores son suficientes para describir el fenómeno.', ...SCALE },
      { id: 'K4', kind: 'scale', label: 'Los indicadores son distintos entre sí, sin redundancias evidentes.', ...SCALE },
    ],
  },
  {
    id: 's6',
    eyebrow: 'Paso 13 · Estética',
    title: 'Forma y coherencia visual',
    intro: 'Evalúe la forma, no el contenido: color, jerarquía, tipografía y proporciones.',
    questions: [
      { id: 'E1', kind: 'scale', label: 'Los colores ayudan a interpretar los datos.', ...SCALE },
      { id: 'E2', kind: 'scale', label: 'La jerarquía visual indica qué mirar primero.', ...SCALE },
      { id: 'E3', kind: 'scale', label: 'La tipografía es legible en pantalla.', ...SCALE },
      { id: 'E4', kind: 'scale', label: 'Los tamaños y proporciones de los gráficos son adecuados.', ...SCALE },
    ],
  },
  {
    id: 's7',
    eyebrow: 'Paso 14 · Interacción',
    title: 'Controles y navegación',
    intro: 'Evalúe los controles y la respuesta del tablero a sus acciones.',
    questions: [
      { id: 'I1', kind: 'scale', label: 'Los filtros actualizan los datos de forma correcta y visible.', ...SCALE },
      { id: 'I2', kind: 'scale', label: 'Los tooltips aportan información útil.', ...SCALE },
      { id: 'I3', kind: 'scale', label: 'La interacción del mapa (zoom, clic y selección) es comprensible.', ...SCALE },
    ],
  },
  {
    id: 's8',
    eyebrow: 'Paso 15 · Impacto',
    title: 'Valor para decidir',
    intro: 'Evalúe el valor del tablero para entender el fenómeno y decidir.',
    questions: [
      { id: 'G1', kind: 'scale', label: 'El tablero aporta información útil sobre la movilidad de Nueva York.', ...SCALE },
      { id: 'G2', kind: 'scale', label: 'Me permitiría argumentar una decisión o una recomendación.', ...SCALE },
      { id: 'G3', kind: 'scale', label: 'La información es confiable y está bien documentada.', ...SCALE },
      {
        id: 'G4',
        kind: 'scale',
        label: 'Recomendaría el tablero a alguien interesado en movilidad urbana.',
        ...SCALE,
      },
    ],
  },
  {
    id: 's9a',
    eyebrow: 'Paso 16 · SUS',
    title: 'Escala de usabilidad (1 de 2)',
    intro:
      'Las siguientes afirmaciones provienen de la escala SUS, un instrumento estándar de usabilidad. Responda pensando en su experiencia completa con el tablero.',
    questions: [
      { id: 'SUS1', kind: 'scale', label: 'Creo que me gustaría usar este tablero con frecuencia.', ...SCALE },
      { id: 'SUS2', kind: 'scale', label: 'Encontré el tablero innecesariamente complejo.', ...SCALE },
      { id: 'SUS3', kind: 'scale', label: 'Pensé que el tablero era fácil de usar.', ...SCALE },
      {
        id: 'SUS4',
        kind: 'scale',
        label: 'Creo que necesitaría apoyo técnico para poder usar este tablero.',
        ...SCALE,
      },
      { id: 'SUS5', kind: 'scale', label: 'Encontré las distintas partes del tablero bien integradas.', ...SCALE },
    ],
  },
  {
    id: 's9b',
    eyebrow: 'Paso 17 · SUS',
    title: 'Escala de usabilidad (2 de 2)',
    questions: [
      { id: 'SUS6', kind: 'scale', label: 'Pensé que había demasiada inconsistencia en el tablero.', ...SCALE },
      {
        id: 'SUS7',
        kind: 'scale',
        label: 'Imagino que la mayoría de la gente aprendería a usar el tablero muy rápido.',
        ...SCALE,
      },
      { id: 'SUS8', kind: 'scale', label: 'Encontré el tablero muy difícil de usar.', ...SCALE },
      { id: 'SUS9', kind: 'scale', label: 'Me sentí muy seguro al usar el tablero.', ...SCALE },
      {
        id: 'SUS10',
        kind: 'scale',
        label: 'Necesité aprender muchas cosas antes de poder usar el tablero.',
        ...SCALE,
      },
    ],
  },
  {
    id: 'o1',
    eyebrow: 'Paso 18 · Abiertas',
    title: 'Su experiencia en palabras',
    intro: 'Responda con sus palabras. No hay extensión mínima ni máxima.',
    questions: [
      {
        id: 'O1',
        kind: 'text',
        label: '¿Qué fue lo primero que miró al abrir el tablero y por qué?',
        rows: 3,
        required: false,
      },
      {
        id: 'O2',
        kind: 'text',
        label: '¿Qué parte le resultó confusa o difícil de entender?',
        rows: 4,
      },
    ],
  },
  {
    id: 'o2',
    eyebrow: 'Paso 19 · Abiertas',
    title: 'Lo útil y lo mejorable',
    questions: [
      {
        id: 'O3',
        kind: 'text',
        label: '¿Qué KPI o gráfico le resultó más útil y por qué?',
        rows: 3,
        required: false,
      },
      {
        id: 'O4',
        kind: 'text',
        label: '¿Qué cambiaría del diseño, de los gráficos o de la navegación?',
        rows: 3,
        required: false,
      },
    ],
  },
  {
    id: 'o3',
    eyebrow: 'Paso 20 · Abiertas',
    title: 'Para cerrar',
    questions: [
      {
        id: 'O5',
        kind: 'text',
        label: '¿Qué información le faltó para tomar una decisión?',
        rows: 3,
        required: false,
      },
      {
        id: 'O6',
        kind: 'text',
        label: 'Comentarios adicionales.',
        rows: 3,
        required: false,
      },
    ],
  },
]

/* ------------------------------------------------------------- dimensiones */

export const DIMENSIONS = [
  { id: 'usabilidad', label: 'Usabilidad', items: ['U1', 'U2', 'U3', 'U4', 'U5'] },
  { id: 'comprension', label: 'Comprensión', items: ['C1', 'C2', 'C3', 'C4', 'C5'] },
  { id: 'kpis', label: 'KPIs', items: ['K1', 'K2', 'K3', 'K4'] },
  { id: 'estetica', label: 'Estética', items: ['E1', 'E2', 'E3', 'E4'] },
  { id: 'interactividad', label: 'Interactividad', items: ['I1', 'I2', 'I3'] },
  { id: 'impacto', label: 'Impacto', items: ['G1', 'G2', 'G3', 'G4'] },
] as const

const SUS_IDS = [
  'SUS1',
  'SUS2',
  'SUS3',
  'SUS4',
  'SUS5',
  'SUS6',
  'SUS7',
  'SUS8',
  'SUS9',
  'SUS10',
]

const SUS_POSITIVE = new Set([1, 3, 5, 7, 9])

export function dimensionScores(answers: Answers) {
  return DIMENSIONS.map((dimension) => {
    const values = dimension.items
      .map((id) => Number(answers[id]))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5)
    return {
      id: dimension.id,
      label: dimension.label,
      value: values.length === dimension.items.length ? round(mean(values) ?? 0) : null,
    }
  })
}

export function susScore(answers: Answers): number | null {
  const values = SUS_IDS.map((id) => Number(answers[id]))
  if (values.some((value) => !Number.isFinite(value) || value < 1 || value > 5)) return null
  const total = values.reduce(
    (sum, value, index) => sum + (SUS_POSITIVE.has(index + 1) ? value - 1 : 5 - value),
    0,
  )
  return Math.round(total * 2.5 * 10) / 10
}

export function taskScore(checks: Record<string, TaskCheck>): number {
  return round(
    Object.values(checks).reduce((sum, check) => sum + check.score, 0),
  )
}

/** Añade P13 con el detalle de las opciones "Otra" elegidas. */
export function composeAnswers(answers: Answers): Answers {
  const extras: string[] = []
  const pairs: [string, string][] = [
    ['P02', 'Género'],
    ['P04', 'Formación'],
    ['P05', 'Ocupación'],
  ]
  for (const [id, label] of pairs) {
    if (answers[id] !== 'Otra') continue
    const text = (answers[`${id}_otro`] ?? '').trim()
    if (text) extras.push(`${label}: ${text}`)
  }
  if (!extras.length) return answers
  return { ...answers, P13: extras.join(' · ') }
}
