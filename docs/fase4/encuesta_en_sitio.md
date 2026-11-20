# Encuesta asistida dentro del dashboard

Guía de la evaluación embebida de la Fase 4. El instrumento completo está en
`docs/fase4/cuestionario_fase4.txt`; esta guía explica cómo se aplica en el
sitio y cómo se conecta con Google Forms.

## 1. Cómo se activa

La encuesta **no** aparece para cualquier visitante. Solo se muestra cuando la
URL lleva el parámetro:

```
https://srmeme64.github.io/nyc-mobility-pulse/?evaluar=1
```

Ese es el enlace que se comparte con el consultor. Sin el parámetro, el
dashboard funciona igual que siempre.

## 2. Qué ve el consultor

1. Se abre un panel flotante que **no bloquea el tablero**: la página sigue
   desplazándose y los filtros, el mapa y los tooltips siguen activos.
   El botón **—** lo minimiza a una píldora con el avance; al pulsarla se vuelve
   al mismo paso.
2. **Consentimiento** (si dice "No acepto", el panel se cierra y no guarda nada).
3. **Perfil** en 3 pantallas: edad, género, formación, ocupación, experiencia.
4. **Cuatro tareas** con validación inmediata:
   - T1 · punto más bajo de la serie → abril de 2020.
   - T2 · mes con más viajes de 2025 → octubre.
   - T3 · zona con más recogidas de 2025 → Upper East Side South.
   - T4 · pico del heatmap → miércoles 18:00.
   Cada respuesta recibe un veredicto (correcta, parcial o incorrecta) y un
   botón **"Ver dónde está"** que minimiza el panel, desplaza la página a la
   sección correspondiente y la resalta unos segundos.
5. **Escalas 1–5**: usabilidad, comprensión, KPIs, estética, interactividad e
   impacto (25 ítems) + SUS (10 ítems).
6. **Preguntas abiertas** (6).
7. **Resumen**: puntaje de tareas, índice global, SUS y desglose por dimensión.

El avance se guarda en `localStorage`, así que recargar la página no borra las
respuestas. "Empezar de nuevo" limpia el borrador.

## 3. Cómo llegan las respuestas

Hay dos caminos, en este orden:

1. **Formulario prellenado** (recomendado): al final, el botón "Enviar al
   formulario" abre Google Forms con todas las respuestas cargadas. El
   consultor revisa y pulsa **Enviar**. Queda registrado con la fecha y hora de
   Google, sin correo ni nombre.
2. **JSON de respaldo**: "Copiar respuestas" y "Descargar JSON" siguen
   disponibles siempre. El archivo incluye las respuestas, el veredicto de cada
   tarea y la fecha de generación.

## 4. Conectar el formulario

El formulario ya existe:

**https://docs.google.com/forms/d/e/1FAIpQLScM9OiaemRfYsv9__1GtIONl0hAGxkNk4ESZF0Md2UMRsNqjQ/viewform**

Los `entry` no se copian a mano. Se extraen del HTML público del formulario con:

```bash
npm run form:entries
```

Ese comando lee `FB_PUBLIC_LOAD_DATA_`, asocia cada pregunta con su clave del
instrumento y escribe `src/lib/form-entries.json`:

```json
{
  "formId": "1FAIpQLSc…",
  "entries": { "P01": "966155876", "U1": "351591956", "…": "…" }
}
```

`src/lib/prefill.ts` consume ese archivo, así que **hay que volver a ejecutar el
comando cada vez que se agregue, borre o reordene una pregunta**.

### Estado actual del formulario

| Bloque | Preguntas | Estado |
| --- | --- | --- |
| Consentimiento (Q00) | 1 | Conectado |
| Perfil (P01–P13) | 13 | Conectado |
| Tareas (T1–T4, T05, T06) | 6 | Conectado |
| Usabilidad, comprensión, KPIs, estética, interactividad | 21 | Conectado |
| Impacto (G1–G4) | 4 | Conectado |
| SUS (SUS1–SUS10) | 10 | Conectado |
| Abiertas (O1–O6) | 6 | Conectado |

**61 de 61 ítems conectados.** El formulario tiene 12 secciones y 73 ítems
contando saltos de página y encabezados. `P13` solo se envía cuando el
consultor elige "Otra"; por eso una respuesta típica prellena 60 de 61.

Para modificarlo, pega `docs/fase4/completar_formulario.gs` en un proyecto de
[Apps Script](https://script.google.com) y ejecuta `verificarAcceso()`: el
script abre el formulario desde el propio editor (si el proyecto está vinculado)
o lo busca en Drive. Si no lo encuentra, hay que pegar la **URL de edición**
(`…/forms/d/<ID>/edit`) en `FORM_EDIT_URL`. La URL de respuesta
(`…/forms/d/e/<ID>/viewform`) no sirve para editar: son dos identificadores
distintos.

Después se ejecuta `completarFormulario()` y `npm run form:entries`. El script
no borra nada ni cambia la URL publicada. Se puede ejecutar varias veces: cada
bloque se agrega solo si falta, el consentimiento y la página de perfil se
reutilizan si ya existen y `limpiarDuplicados()` elimina restos de una ejecución
interrumpida.

Si algún ítem queda sin `entry`, el resumen avisa cuántos están conectados y los
que faltan simplemente no se prellenan.

### Notas

- Las escalas se envían como `"1"` … `"5"`; Google las acepta tal cual.
- `P13` se compone con el texto de las opciones "Otra" elegidas en el sitio.
  Las claves `P02_otro`, `P04_otro` y `P05_otro` solo aparecen en el JSON.
- Si el formulario se recrea desde cero, cambia `DEFAULT_FORM_ID` en
  `scripts/form-entries.mjs` o pasa la URL nueva:
  `npm run form:entries -- https://docs.google.com/forms/d/e/OTRO_ID/viewform`
- Para probar sin ensuciar la hoja de respuestas: abre el enlace prellenado y
  cierra la pestaña sin pulsar **Enviar**.

## 5. Privacidad

- No se pide nombre, correo, teléfono ni institución.
- No se activa la recopilación de correos en Google Forms.
- El borrador vive solo en el navegador del consultor y se puede borrar.
- El JSON no incluye IP ni identificadores: solo respuestas, veredictos y
  fecha de generación.
- Si el consultor rechaza el consentimiento, no se guarda ningún dato.

## 6. Dónde se edita

| Qué | Archivo |
| --- | --- |
| Textos, opciones e ítems | `src/lib/survey.ts` |
| Validación de tareas y respuestas de referencia | `src/lib/survey.ts` |
| `entry` extraídos del formulario | `src/lib/form-entries.json` |
| Extractor de `entry` | `scripts/form-entries.mjs` |
| Script que completa el formulario | `docs/fase4/completar_formulario.gs` |
| Construcción del enlace prellenado | `src/lib/prefill.ts` |
| Estilos del panel | `src/styles.css` (bloque `evaluación`) |
| Integración con la página | `src/App.tsx` y `src/components/Evaluation.tsx` |

Si cambias un texto de `survey.ts`, actualiza también el cuestionario en
`docs/fase4/` para que el formulario y el sitio digan lo mismo.
