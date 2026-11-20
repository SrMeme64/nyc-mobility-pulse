/**
 * Completa el formulario de Fase 4 que ya está publicado.
 *
 * El formulario actual tiene el perfil, las tareas y las secciones 4 a 8, pero
 * le faltan: consentimiento, impacto (G1–G4), SUS (SUS1–SUS10) y las preguntas
 * abiertas (O1–O6). Este script las agrega sin borrar nada y sin cambiar la URL
 * publicada.
 *
 * Cómo ejecutarlo:
 *   1. Abre https://script.google.com y crea un proyecto nuevo.
 *   2. Pega este archivo completo en Código.gs.
 *   3. Ejecuta la función verificarAcceso. Si encuentra el formulario, sigue.
 *      Si no, pega la URL de EDICIÓN en FORM_EDIT_URL (ver abajo).
 *   4. Ejecuta completarFormulario y autoriza el acceso.
 *   5. Revisa el formulario: debe quedar con 12 secciones y 61 preguntas.
 *   6. En el proyecto del dashboard ejecuta `npm run form:entries` para
 *      actualizar los identificadores de prellenado.
 *
 * OJO con los dos identificadores de Google Forms:
 *   - Edición (sirve para FormApp): .../forms/d/1FAIpQLS…/edit
 *   - Respuesta (sirve para prellenar): .../forms/d/e/1FAIpQLS…/viewform
 *   Son distintos. openById/openByUrl necesitan el de edición.
 *
 * Se puede ejecutar varias veces: cada bloque se agrega solo si falta, y el
 * consentimiento y la página de perfil se reutilizan si ya existen (por ejemplo,
 * si una ejecución anterior falló a mitad de camino).
 */

/**
 * Opcional: URL de edición del formulario. Si lo dejas vacío, el script busca
 * el formulario en tu Drive (funciona si hay un único candidato).
 * Ejemplo: 'https://docs.google.com/forms/d/1FAIpQLSxxxxxxxxxxxxxxxx/edit'
 */
var FORM_EDIT_URL = ''

var DASHBOARD = 'https://srmeme64.github.io/nyc-mobility-pulse/?evaluar=1'

/** Comprueba que el script puede abrir el formulario. Útil antes de modificar. */
function verificarAcceso() {
  var form = obtenerFormulario_()
  Logger.log('Formulario encontrado: ' + form.getTitle())
  Logger.log('Preguntas: ' + form.getItems().length)
  Logger.log('Editar: ' + form.getEditUrl())
}

/**
 * Elimina consentimientos y saltos de página de perfil duplicados, conservando
 * la primera aparición (la que está al inicio del formulario). Sirve si una
 * ejecución anterior falló a mitad y dejó restos al final.
 */
function limpiarDuplicados() {
  var form = obtenerFormulario_()
  var items = form.getItems()
  var vistos = {}
  var sobrantes = []

  for (var i = 0; i < items.length; i++) {
    var titulo = items[i].getTitle()
    var clave = null
    if (titulo.indexOf('Acepta participar') >= 0) clave = 'consentimiento'
    else if (titulo.indexOf('PERFIL DEL CONSULTOR') >= 0) clave = 'perfil'
    if (!clave) continue
    if (vistos[clave]) sobrantes.push(i)
    else vistos[clave] = true
  }

  // De atrás hacia adelante para que los índices no se muevan.
  for (var k = sobrantes.length - 1; k >= 0; k--) {
    Logger.log('Eliminando ítem duplicado en el índice ' + sobrantes[k])
    form.deleteItem(sobrantes[k])
  }

  Logger.log('Listo. Ítems restantes: ' + form.getItems().length)
}

/**
 * Devuelve el formulario en este orden:
 *  1. El formulario al que está vinculado el script (si se abrió desde el
 *     editor del formulario: ⋮ → Apps Script).
 *  2. FORM_EDIT_URL, si se pegó.
 *  3. El único formulario de Drive cuyo nombre contenga "Evaluación de
 *     Dashboard" o "Movilidad".
 */
function obtenerFormulario_() {
  try {
    var vinculado = FormApp.getActiveForm()
    if (vinculado) return vinculado
  } catch (err) {
    // El script no está vinculado a un formulario; se sigue con las otras vías.
  }

  if (FORM_EDIT_URL) return FormApp.openByUrl(FORM_EDIT_URL)

  var candidatos = []
  var archivos = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS)
  while (archivos.hasNext()) {
    var archivo = archivos.next()
    var nombre = archivo.getName()
    if (nombre.indexOf('Evaluación de Dashboard') >= 0 || nombre.indexOf('Movilidad') >= 0) {
      candidatos.push(archivo)
    }
  }

  if (candidatos.length === 1) return FormApp.openById(candidatos[0].getId())

  if (candidatos.length > 1) {
    throw new Error(
      'Hay varios formularios candidatos. Pega la URL de edición en FORM_EDIT_URL:\n' +
      candidatos.map(function (archivo) { return '  · ' + archivo.getUrl() }).join('\n')
    )
  }

  throw new Error(
    'No encontré el formulario. Abre el formulario, copia la URL del navegador ' +
    '(termina en /edit) y pégala en FORM_EDIT_URL. No uses la URL que termina ' +
    'en /viewform: esa es la de respuesta y no sirve para editarlo.'
  )
}

function completarFormulario() {
  // Si una ejecución anterior falló a mitad, deja restos al final del
  // formulario. Se eliminan antes de continuar para no duplicar secciones.
  limpiarDuplicados()

  var form = obtenerFormulario_()

  form.setTitle('Evaluación del dashboard · NYC Mobility Pulse')
  form.setDescription(
    'Evaluación anónima de NYC Mobility Pulse, un tablero sobre la movilidad de ' +
    'Nueva York con datos públicos de taxis amarillos (TLC).\n\n' +
    'No se pide nombre, correo ni ningún dato identificable. Duración estimada: ' +
    '12 a 15 minutos.\n\n' +
    'Tablero: ' + DASHBOARD
  )
  form.setProgressBar(true)
  form.setCollectEmail(false)
  form.setConfirmationMessage(
    'Gracias por evaluar NYC Mobility Pulse. Sus respuestas se usarán únicamente ' +
    'para el informe de la Fase 4.'
  )

  // ---------------------------------------------------------------- sección 1
  var consent = buscarPorTitulo_(form, 'Acepta participar')
  if (consent) {
    consent = consent.asMultipleChoiceItem()
    Logger.log('Consentimiento ya existente: se reutiliza.')
  } else {
    consent = form.addMultipleChoiceItem()
      .setTitle('¿Acepta participar en esta evaluación?')
      .setHelpText(
        'Responda con sinceridad: no hay respuestas correctas ni incorrectas. ' +
        'Puede abandonar en cualquier momento.'
      )
      .setChoiceValues(['Sí, acepto', 'No acepto'])
      .setRequired(true)
  }

  var perfilPage = buscarPorTitulo_(form, 'PERFIL DEL CONSULTOR')
  if (perfilPage) {
    perfilPage = perfilPage.asPageBreakItem()
    Logger.log('Página de perfil ya existente: se reutiliza.')
  } else {
    perfilPage = form.addPageBreakItem()
      .setTitle('SECCIÓN 2 · PERFIL DEL CONSULTOR (ANÓNIMO)')
      .setHelpText(
        'Estos datos describen su perfil, no su identidad. Se usan para comparar ' +
        'los resultados entre perfiles con distinta experiencia y formación.'
      )
  }

  // Apps Script no resuelve bien moveItem(item, índice) con estos objetos:
  // se usa la variante moveItem(índice, índice).
  form.moveItem(indiceDe_(form, consent), 0)
  form.moveItem(indiceDe_(form, perfilPage), 1)

  consent.setChoices([
    consent.createChoice('Sí, acepto', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('No acepto', FormApp.PageNavigationType.SUBMIT)
  ])

  // ---------------------------------------------------------------- sección 3
  var paginas = form.getItems(FormApp.ItemType.PAGE_BREAK)
  for (var i = 0; i < paginas.length; i++) {
    if (paginas[i].getTitle().indexOf('TAREAS DE USO') >= 0) {
      paginas[i].asPageBreakItem().setHelpText(
        'Abra el tablero en otra pestaña: ' + DASHBOARD + '\n\n' +
        'Resuelva las cuatro tareas. No hay tiempo límite. Si no encuentra la ' +
        'respuesta, escriba NO ENCONTRADA y continúe.'
      )
    }
  }

  // ---------------------------------------------------------------- sección 9
  if (!buscarPorTitulo_(form, 'G1.')) {
    addEscalas_(form, [
      'G1. El tablero aporta información útil sobre la movilidad de Nueva York.',
      'G2. Me permitiría argumentar una decisión o una recomendación.',
      'G3. La información es confiable y está bien documentada.',
      'G4. Recomendaría el tablero a alguien interesado en movilidad urbana.'
    ])
  }

  // --------------------------------------------------------------- sección 10
  if (!buscarPorTitulo_(form, 'SUS1.')) {
    form.addPageBreakItem()
      .setTitle('SECCIÓN 10 · ESCALA DE USABILIDAD (SUS)')
      .setHelpText(
        'Las siguientes afirmaciones provienen de la escala SUS, un instrumento ' +
        'estándar de usabilidad. Responda pensando en su experiencia completa con ' +
        'el tablero.\n1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo.'
      )

    addEscalas_(form, [
      'SUS1. Creo que me gustaría usar este tablero con frecuencia.',
      'SUS2. Encontré el tablero innecesariamente complejo.',
      'SUS3. Pensé que el tablero era fácil de usar.',
      'SUS4. Creo que necesitaría apoyo técnico para poder usar este tablero.',
      'SUS5. Encontré las distintas partes del tablero bien integradas.',
      'SUS6. Pensé que había demasiada inconsistencia en el tablero.',
      'SUS7. Imagino que la mayoría de la gente aprendería a usar el tablero muy rápido.',
      'SUS8. Encontré el tablero muy difícil de usar.',
      'SUS9. Me sentí muy seguro al usar el tablero.',
      'SUS10. Necesité aprender muchas cosas antes de poder usar el tablero.'
    ])
  }

  // --------------------------------------------------------------- sección 11
  if (!buscarPorTitulo_(form, 'O1.')) {
    form.addPageBreakItem()
      .setTitle('SECCIÓN 11 · PREGUNTAS ABIERTAS')
      .setHelpText('Responda con sus palabras. No hay extensión mínima ni máxima.')

    addParrafo_(form, 'O1. ¿Qué fue lo primero que miró al abrir el tablero y por qué?', false)
    addParrafo_(form, 'O2. ¿Qué parte le resultó confusa o difícil de entender?', true)
    addParrafo_(form, 'O3. ¿Qué KPI o gráfico le resultó más útil y por qué?', false)
    addParrafo_(form, 'O4. ¿Qué cambiaría del diseño, de los gráficos o de la navegación?', false)
    addParrafo_(form, 'O5. ¿Qué información le faltó para tomar una decisión?', false)
    addParrafo_(form, 'O6. Comentarios adicionales.', false)
  }

  // --------------------------------------------------------------- sección 12
  if (!buscarPorTitulo_(form, 'SECCIÓN 12')) {
    form.addPageBreakItem().setTitle('SECCIÓN 12 · CIERRE')
    form.addSectionHeaderItem()
      .setTitle('Gracias por participar')
      .setHelpText(
        'Sus respuestas son anónimas y se usarán únicamente para evaluar NYC ' +
        'Mobility Pulse en el marco del Proyecto 4.'
      )
  }

  Logger.log('Listo. Ítems totales: ' + form.getItems().length)
  Logger.log('Editar: ' + form.getEditUrl())
  Logger.log('Responder: ' + form.getPublishedUrl())
}

/** Primer ítem cuyo título contenga el fragmento, o null. */
function buscarPorTitulo_(form, fragmento) {
  var items = form.getItems()
  for (var i = 0; i < items.length; i++) {
    var titulo = items[i].getTitle()
    if (titulo && titulo.indexOf(fragmento) >= 0) return items[i]
  }
  return null
}

/** Índice actual del ítem dentro del formulario. */
function indiceDe_(form, item) {
  var items = form.getItems()
  var id = item.getId()
  for (var i = 0; i < items.length; i++) {
    if (items[i].getId() === id) return i
  }
  throw new Error('No se encontró el ítem en el formulario.')
}

function addEscalas_(form, titulos) {
  for (var i = 0; i < titulos.length; i++) {
    form.addScaleItem()
      .setTitle(titulos[i])
      .setBounds(1, 5)
      .setLabels('Totalmente en desacuerdo', 'Totalmente de acuerdo')
      .setRequired(true)
  }
}

function addParrafo_(form, titulo, obligatoria) {
  form.addParagraphTextItem()
    .setTitle(titulo)
    .setRequired(obligatoria)
}
