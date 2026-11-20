/**
 * Envío de la evaluación al formulario de Google (Fase 4).
 *
 * El sitio no tiene backend: en lugar de guardar en un servidor, arma una URL
 * de "prellenado" de Google Forms con las respuestas del consultor. Al pulsar
 * "Enviar", se abre el formulario ya completo y la persona solo confirma.
 *
 * Los `entry` no se escriben a mano: se extraen del formulario publicado con
 *
 *   npm run form:entries
 *
 * que genera src/lib/form-entries.json (ver scripts/form-entries.mjs).
 * Hay que volver a ejecutarlo cada vez que cambie el formulario.
 *
 * Si falta un `entry`, ese ítem no se prellena y el resumen lo indica.
 */

import formEntries from './form-entries.json'
import { composeAnswers, type Answers, type TaskCheck } from './survey'

export interface PrefillConfig {
  /** ID que aparece en .../forms/d/e/<ID>/viewform */
  formId: string
  /** Clave del instrumento (P01, U1, SUS10…) → entry.XXXXXXX */
  entries: Record<string, string>
}

export const FORM: PrefillConfig = {
  formId: formEntries.formId,
  entries: formEntries.entries,
}

export function isPrefillReady(): boolean {
  return Boolean(FORM.formId) && Object.keys(FORM.entries).length > 0
}

/** Cuántos ítems del instrumento tienen entry configurado. */
export function prefillCoverage(answers: Answers): { mapped: number; total: number } {
  const keys = Object.keys(answers).filter((key) => key !== 'P13' && !key.endsWith('_otro'))
  const mapped = keys.filter((key) => Boolean(FORM.entries[key])).length
  return { mapped, total: keys.length }
}

export function buildPrefillUrl(rawAnswers: Answers): string {
  const answers = composeAnswers(rawAnswers)
  const base = `https://docs.google.com/forms/d/e/${FORM.formId}/viewform`
  const params = new URLSearchParams({ usp: 'pp_url' })

  for (const [key, entryId] of Object.entries(FORM.entries)) {
    const value = answers[key]
    if (value == null || value === '') continue
    params.append(`entry.${entryId}`, value)
  }

  return `${base}?${params.toString()}`
}

export interface EvaluationPayload {
  schema: 'nyc-mobility-pulse/eval-v1'
  generatedAt: string
  locale: string
  viewport: string
  answers: Answers
  tasks: Record<string, TaskCheck>
}

export function buildPayload(rawAnswers: Answers, checks: Record<string, TaskCheck>): string {
  const payload: EvaluationPayload = {
    schema: 'nyc-mobility-pulse/eval-v1',
    generatedAt: new Date().toISOString(),
    locale: typeof navigator === 'undefined' ? '' : navigator.language,
    viewport:
      typeof window === 'undefined' ? '' : `${window.innerWidth}x${window.innerHeight}`,
    answers: composeAnswers(rawAnswers),
    tasks: checks,
  }
  return JSON.stringify(payload, null, 2)
}

export function downloadPayload(rawAnswers: Answers, checks: Record<string, TaskCheck>): void {
  const blob = new Blob([buildPayload(rawAnswers, checks)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.href = url
  link.download = `evaluacion-nyc-mobility-pulse-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
