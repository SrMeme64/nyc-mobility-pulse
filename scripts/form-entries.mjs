/**
 * Extrae los identificadores `entry.XXXX` del formulario publicado y los
 * escribe en src/lib/form-entries.json para que el sitio pueda prellenarlo.
 *
 * Uso:
 *   npm run form:entries
 *   npm run form:entries -- https://docs.google.com/forms/d/e/OTRO_ID/viewform
 *
 * Google no expone estos identificadores por API: se leen del HTML público del
 * formulario (objeto FB_PUBLIC_LOAD_DATA_). Hay que volver a ejecutar el script
 * cada vez que se agregue, borre o reordene una pregunta.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const DEFAULT_FORM_ID = '1FAIpQLScM9OiaemRfYsv9__1GtIONl0hAGxkNk4ESZF0Md2UMRsNqjQ'

const arg = process.argv[2]
const formId = arg
  ? arg.replace(/^.*\/d\/e\//, '').replace(/\/.*$/, '')
  : DEFAULT_FORM_ID

const url = `https://docs.google.com/forms/d/e/${formId}/viewform`

/** Claves del instrumento, en el orden en que se analizan. */
const KEYS = [
  'Q00',
  ...Array.from({ length: 13 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`),
  'T1', 'T2', 'T3', 'T4', 'T05', 'T06',
  ...Object.entries({ U: 5, C: 5, K: 4, E: 4, I: 3, G: 4 }).flatMap(([letter, count]) =>
    Array.from({ length: count }, (_, i) => `${letter}${i + 1}`),
  ),
  ...Array.from({ length: 10 }, (_, i) => `SUS${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `O${i + 1}`),
]

const normalize = (value) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Títulos exactos del perfil (normalizados). */
const PROFILE = new Map([
  ['cual es su rango de edad', 'P01'],
  ['con que genero se identifica', 'P02'],
  ['cual es su nivel academico maximo', 'P03'],
  ['cual es su area de formacion principal', 'P04'],
  ['cual es su ocupacion actual', 'P05'],
  ['si es estudiante en que momento de su trayectoria esta', 'P06'],
  ['que experiencia tiene usando dashboards power bi tableau looker etc', 'P07'],
  ['con que frecuencia usa herramientas de visualizacion de datos', 'P08'],
  ['que conocimiento previo tiene de los datos tlc de nueva york', 'P09'],
  ['que tan familiarizado esta con la ciudad de nueva york', 'P10'],
  ['en que dispositivo respondio principalmente', 'P11'],
  ['habia evaluado antes un dashboard o un producto de datos', 'P12'],
  ['si eligio otra en genero formacion u ocupacion especifique', 'P13'],
])

/** Tareas y abiertas: se reconocen por una frase distintiva. */
const PHRASES = [
  ['acepta participar', 'Q00'],
  ['en la serie historica', 'T1'],
  ['cual es el mes con mas viajes', 'T2'],
  ['zona con mas recogidas', 'T3'],
  ['heatmap de dia y hora', 'T4'],
  ['que tan dificil le resulto completar', 'T05'],
  ['cuanto tiempo dedico al conjunto', 'T06'],
  ['que fue lo primero que miro', 'O1'],
  ['que parte le resulto confusa', 'O2'],
  ['que kpi o grafico le resulto mas util', 'O3'],
  ['que cambiaria del diseno', 'O4'],
  ['que informacion le falto', 'O5'],
  ['comentarios adicionales', 'O6'],
]

const keyFor = (rawTitle) => {
  const title = normalize(rawTitle)
  if (!title) return null
  if (PROFILE.has(title)) return PROFILE.get(title)
  for (const [phrase, key] of PHRASES) {
    if (title.includes(phrase)) return key
  }
  const scale = title.match(/^(sus\d+|[uckeig]\d+)\b/)
  if (scale) return scale[1].toUpperCase()
  return null
}

const extractJson = (html) => {
  const marker = 'FB_PUBLIC_LOAD_DATA_'
  const at = html.indexOf(marker)
  if (at < 0) throw new Error('El formulario no expone FB_PUBLIC_LOAD_DATA_. ¿Está publicado?')
  const start = html.indexOf('[', at)
  let depth = 0
  for (let i = start; i < html.length; i += 1) {
    if (html[i] === '[') depth += 1
    else if (html[i] === ']') {
      depth -= 1
      if (depth === 0) return JSON.parse(html.slice(start, i + 1))
    }
  }
  throw new Error('No se pudo cerrar el JSON del formulario.')
}

const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
if (!response.ok) throw new Error(`HTTP ${response.status} al leer ${url}`)
const html = await response.text()
const data = extractJson(html)

const items = data?.[1]?.[1] ?? []
const entries = {}
const unknown = []

for (const item of items) {
  const title = item?.[1] ?? ''
  const rows = Array.isArray(item?.[4]) ? item[4] : []
  const entry = rows[0]?.[0]
  if (!entry || typeof entry !== 'number') continue
  const key = keyFor(title)
  if (!key) {
    unknown.push(title)
    continue
  }
  if (entries[key]) {
    console.warn(`Aviso: ${key} aparece dos veces ("${title}"); se conserva la primera`)
    continue
  }
  entries[key] = String(entry)
}

const ordered = {}
for (const key of KEYS) if (entries[key]) ordered[key] = entries[key]

const missing = KEYS.filter((key) => !ordered[key])
const out = { formId, entries: ordered }
const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '..', 'src', 'lib', 'form-entries.json')
await writeFile(target, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

console.log(`Formulario: ${formId}`)
console.log(`Conectados: ${Object.keys(ordered).length} de ${KEYS.length} ítems`)
console.log(`Escrito en: ${target}`)
if (unknown.length) {
  console.log(`\nPreguntas sin clave (${unknown.length}):`)
  for (const title of unknown) console.log(`  · ${title}`)
}
if (missing.length) {
  console.log(`\nFaltan en el formulario (${missing.length}): ${missing.join(', ')}`)
  console.log('Ejecuta docs/fase4/completar_formulario.gs y vuelve a correr este script.')
}
