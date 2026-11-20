import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Minus,
  RotateCcw,
} from 'lucide-react'
import {
  STEPS,
  dimensionScores,
  mean,
  susScore,
  taskScore,
  type Answers,
  type Question,
  type TaskCheck,
} from '../lib/survey'
import {
  buildPayload,
  buildPrefillUrl,
  downloadPayload,
  isPrefillReady,
  prefillCoverage,
} from '../lib/prefill'

const DRAFT_KEY = 'nyc-mp-eval-draft-v1'

interface Draft {
  answers: Answers
  revealed: Record<string, boolean>
  index: number
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    if (!parsed || typeof parsed !== 'object' || !parsed.answers) return null
    return {
      answers: parsed.answers,
      revealed: parsed.revealed ?? {},
      index: Math.min(Math.max(0, Number(parsed.index) || 0), STEPS.length),
    }
  } catch {
    return null
  }
}

function deriveChecks(answers: Answers): Record<string, TaskCheck> {
  const checks: Record<string, TaskCheck> = {}
  for (const step of STEPS) {
    for (const question of step.questions) {
      if (question.kind !== 'short' || !question.check) continue
      const value = (answers[question.id] ?? '').trim()
      if (value) checks[question.id] = question.check(value)
    }
  }
  return checks
}

const isTask = (question: Question) => question.kind === 'short' && Boolean(question.check)

const VERDICT_LABEL: Record<TaskCheck['verdict'], string> = {
  correcta: 'Correcta',
  parcial: 'Parcial',
  incorrecta: 'Revisa esta tarea',
}

function format(value: number | null, digits = 1): string {
  return value == null ? '—' : value.toFixed(digits)
}

interface Props {
  /** Solo se activa con ?evaluar=1 para no molestar a visitantes normales. */
  enabled: boolean
}

export function Evaluation({ enabled }: Props) {
  const draft = useMemo(loadDraft, [])
  const [open, setOpen] = useState(enabled)
  const [index, setIndex] = useState(draft?.index ?? 0)
  const [answers, setAnswers] = useState<Answers>(draft?.answers ?? {})
  const [revealed, setRevealed] = useState<Record<string, boolean>>(draft?.revealed ?? {})
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const checks = useMemo(() => deriveChecks(answers), [answers])
  const step = index < STEPS.length ? STEPS[index] : null
  const progress = Math.round((Math.min(index, STEPS.length) / STEPS.length) * 100)
  const declined = answers.Q00 === 'No acepto'
  const ready = isPrefillReady()
  const coverage = prefillCoverage(answers)

  const taskQuestions = step?.questions.filter(isTask) ?? []
  const needsCheck = taskQuestions.some((question) => !revealed[question.id])
  const missing = (step?.questions ?? []).filter(
    (question) => question.required !== false && !(answers[question.id] ?? '').trim(),
  )
  const canAdvance = missing.length === 0 && !needsCheck

  // Borrador: evita perder el avance si se recarga la página.
  useEffect(() => {
    if (!enabled) return
    try {
      // Si la persona declina, no se conserva ningún dato.
      if (answers.Q00 === 'No acepto') {
        window.localStorage.removeItem(DRAFT_KEY)
        return
      }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, revealed, index }))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [enabled, answers, revealed, index])

  // Escape minimiza; el tablero sigue desplazándose y recibiendo clics.
  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // El foco entra al panel en cada paso para que el lector de pantalla lo anuncie.
  useEffect(() => {
    if (open) titleRef.current?.focus()
    else fabRef.current?.focus()
  }, [open, index])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [index])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  if (!enabled) return null

  const setAnswer = (id: string, value: string) => {
    setAnswers((previous) => ({ ...previous, [id]: value }))
    setRevealed((previous) => {
      if (!previous[id]) return previous
      const next = { ...previous }
      delete next[id]
      return next
    })
  }

  const runChecks = () => {
    setRevealed((previous) => {
      const next = { ...previous }
      for (const question of taskQuestions) next[question.id] = true
      return next
    })
  }

  const advance = () => {
    if (needsCheck) {
      runChecks()
      return
    }
    if (!canAdvance) return
    setIndex((value) => Math.min(STEPS.length, value + 1))
  }

  const locate = (anchor: string) => {
    setOpen(false)
    window.setTimeout(() => {
      const target = document.getElementById(anchor)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.classList.add('eval-spotlight')
      window.setTimeout(() => target.classList.remove('eval-spotlight'), 2600)
    }, 160)
  }

  const copyPayload = async () => {
    const text = buildPayload(answers, checks)
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Respuestas copiadas al portapapeles.')
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
      setNotice('Respuestas copiadas al portapapeles.')
    }
    setCopied(true)
    timerRef.current = window.setTimeout(() => setCopied(false), 2200)
  }

  const restart = () => {
    if (!window.confirm('¿Borrar tus respuestas y empezar de nuevo?')) return
    setAnswers({})
    setRevealed({})
    setIndex(0)
    setSent(false)
    setCopied(false)
    setNotice('')
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* almacenamiento no disponible */
    }
  }

  const dimensions = dimensionScores(answers)
  const globalIndex = mean(
    dimensions.map((dimension) => dimension.value).filter((value): value is number => value != null),
  )
  const tasks = taskScore(checks)
  const sus = susScore(answers)

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] ?? ''
    const check = question.kind === 'short' ? checks[question.id] : undefined
    const showCheck = Boolean(check && revealed[question.id])

    return (
      <div className="eval-q-block" key={question.id}>
        <p className="eval-q" id={`${question.id}-label`}>
          {question.label}
        </p>

        {question.kind === 'choice' && (
          <>
            <div className="eval-options" role="radiogroup" aria-labelledby={`${question.id}-label`}>
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={value === option}
                  className={`eval-option ${value === option ? 'selected' : ''}`}
                  onClick={() => setAnswer(question.id, option)}
                >
                  <span className="eval-dot" aria-hidden="true" />
                  <span>{option}</span>
                </button>
              ))}
            </div>
            {question.other && value === 'Otra' && (
              <input
                className="eval-input eval-input-inline"
                value={answers[`${question.id}_otro`] ?? ''}
                onChange={(event) => setAnswer(`${question.id}_otro`, event.target.value)}
                placeholder="Especifique"
                aria-label="Especifique su respuesta"
              />
            )}
          </>
        )}

        {question.kind === 'scale' && (
          <>
            <div className="eval-scale" role="radiogroup" aria-labelledby={`${question.id}-label`}>
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  type="button"
                  role="radio"
                  aria-checked={value === String(number)}
                  className={`eval-scale-btn ${value === String(number) ? 'selected' : ''}`}
                  onClick={() => setAnswer(question.id, String(number))}
                >
                  {number}
                </button>
              ))}
            </div>
            <div className="eval-scale-legend" aria-hidden="true">
              <span>{question.left}</span>
              <span>{question.right}</span>
            </div>
          </>
        )}

        {question.kind === 'short' && (
          <input
            className="eval-input"
            value={value}
            onChange={(event) => setAnswer(question.id, event.target.value)}
            placeholder={question.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        )}

        {question.kind === 'text' && (
          <textarea
            className="eval-input eval-textarea"
            value={value}
            onChange={(event) => setAnswer(question.id, event.target.value)}
            rows={question.rows ?? 4}
          />
        )}

        {question.help && <p className="eval-help">{question.help}</p>}

        {showCheck && check && (
          <div className={`eval-check ${check.verdict}`} role="status">
            <strong>{VERDICT_LABEL[check.verdict]}</strong>
            <p>{check.detail}</p>
            <button type="button" className="eval-link" onClick={() => locate(check.anchor)}>
              <MapPin size={14} /> {check.anchorLabel}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="eval-fab"
          ref={fabRef}
          onClick={() => setOpen(true)}
          aria-label="Abrir la evaluación del dashboard"
        >
          <ClipboardCheck size={18} />
          <span>{progress > 0 ? `Evaluar · ${progress}%` : 'Evaluar el tablero'}</span>
        </button>
      )}

      {open && (
        <div className="eval-dock">
          <div
            className="eval-panel"
            role="dialog"
            aria-label="Evaluación del dashboard"
            ref={panelRef}
          >
            <header className="eval-head">
              <div className="eval-head-top">
                <span className="eyebrow">Fase 4 · Evaluación</span>
                <button
                  type="button"
                  className="eval-close"
                  onClick={() => setOpen(false)}
                  aria-label="Minimizar la evaluación"
                  title="Minimizar y seguir explorando"
                >
                  <Minus size={18} />
                </button>
              </div>
              <div
                className="eval-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Avance del cuestionario"
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="eval-count">
                {step ? `Paso ${index + 1} de ${STEPS.length}` : 'Resumen'} · el tablero
                sigue activo
              </p>
            </header>

            <div className="eval-body" ref={bodyRef}>
              {step ? (
                <>
                  <span className="eval-eyebrow">{step.eyebrow}</span>
                  <h2 className="eval-title" id="eval-title" tabIndex={-1} ref={titleRef}>
                    {step.title}
                  </h2>
                  {step.intro && <p className="eval-intro">{step.intro}</p>}

                  <div className="eval-questions">{step.questions.map(renderQuestion)}</div>

                  {declined && (
                    <div className="eval-declined" role="status">
                      <AlertTriangle size={16} />
                      <p>
                        Ha elegido no participar. Puede cerrar esta ventana; no se guardará
                        ninguna respuesta.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="eval-eyebrow">Cierre</span>
                  <h2 className="eval-title" id="eval-title" tabIndex={-1} ref={titleRef}>
                    Gracias por evaluar
                  </h2>
                  <p className="eval-intro">
                    Sus respuestas son anónimas y se usarán únicamente para evaluar NYC Mobility
                    Pulse en el marco del Proyecto 4.
                  </p>

                  <div className="eval-score-grid">
                    <div className="eval-score">
                      <span>Tareas</span>
                      <strong>{format(tasks, 1)} / 4</strong>
                      <small>desempeño verificado</small>
                    </div>
                    <div className="eval-score">
                      <span>Índice global</span>
                      <strong>{format(globalIndex)} / 5</strong>
                      <small>promedio de dimensiones</small>
                    </div>
                    <div className="eval-score">
                      <span>SUS</span>
                      <strong>{format(sus, 1)}</strong>
                      <small>escala 0–100</small>
                    </div>
                  </div>

                  <div className="eval-dims">
                    {dimensions.map((dimension) => (
                      <div className="eval-dim" key={dimension.id}>
                        <span>{dimension.label}</span>
                        <b>{format(dimension.value)}</b>
                      </div>
                    ))}
                  </div>

                  {ready ? (
                    <>
                      <a
                        className="eval-btn primary"
                        href={buildPrefillUrl(answers)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setSent(true)}
                      >
                        <ExternalLink size={16} /> Enviar al formulario
                      </a>
                      <p className="eval-note">
                        Se abrirá el formulario con sus respuestas ya cargadas
                        {coverage.mapped < coverage.total
                          ? ` (${coverage.mapped} de ${coverage.total})`
                          : ''}
                        . Revise y pulse <strong>Enviar</strong> allí para completar el registro.
                        {coverage.mapped < coverage.total && (
                          <>
                            {' '}
                            Las respuestas sin conectar no se registran allí: descargue el
                            JSON para conservarlas.
                          </>
                        )}
                      </p>
                      {sent && (
                        <div className="eval-check correcta" role="status">
                          <strong>Formulario abierto</strong>
                          <p>
                            Complete el envío en la pestaña nueva. Si no se abrió, use el botón
                            otra vez o descargue el JSON como respaldo.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="eval-warning">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>El formulario aún no está conectado</strong>
                        <p>
                          Ejecute <code>npm run form:entries</code> para leer el formulario
                          publicado. Mientras tanto puede copiar o descargar sus respuestas y
                          enviarlas al equipo.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="eval-actions">
                    <button type="button" className="eval-btn" onClick={copyPayload}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado' : 'Copiar respuestas'}
                    </button>
                    <button
                      type="button"
                      className="eval-btn"
                      onClick={() => downloadPayload(answers, checks)}
                    >
                      <Download size={16} /> Descargar JSON
                    </button>
                  </div>

                  {notice && <p className="eval-help" role="status">{notice}</p>}

                  <div className="eval-footer-links">
                    <button type="button" className="eval-link" onClick={() => setIndex(STEPS.length - 1)}>
                      <ArrowLeft size={14} /> Volver a las preguntas
                    </button>
                    <button type="button" className="eval-link" onClick={restart}>
                      <RotateCcw size={14} /> Empezar de nuevo
                    </button>
                  </div>
                </>
              )}
            </div>

            <footer className="eval-foot">
              {step ? (
                <>
                  <div className="eval-foot-info">
                    {missing.length > 0
                      ? 'Responda para continuar'
                      : needsCheck
                        ? 'Compruebe su respuesta'
                        : 'Progreso guardado'}
                  </div>
                  <div className="eval-foot-actions">
                    {index > 0 && (
                      <button
                        type="button"
                        className="eval-btn ghost"
                        onClick={() => setIndex((value) => Math.max(0, value - 1))}
                      >
                        <ArrowLeft size={16} /> Atrás
                      </button>
                    )}
                    {declined ? (
                      <button type="button" className="eval-btn" onClick={() => setOpen(false)}>
                        Cerrar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="eval-btn primary"
                        onClick={advance}
                        disabled={missing.length > 0}
                      >
                        {needsCheck
                          ? 'Comprobar respuesta'
                          : index === STEPS.length - 1
                            ? 'Ver resumen'
                            : 'Continuar'}
                        {needsCheck ? <Check size={16} /> : <ArrowRight size={16} />}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="eval-foot-info">
                    {!ready
                      ? 'Formulario sin conectar'
                      : coverage.mapped < coverage.total
                        ? `Faltan ${coverage.total - coverage.mapped} respuestas por conectar`
                        : 'Todo listo'}
                  </div>
                  <button type="button" className="eval-btn" onClick={() => setOpen(false)}>
                    Cerrar
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
