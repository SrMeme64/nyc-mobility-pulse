# NYC Mobility Pulse

**Dashboard táctico de movilidad urbana con datos abiertos de NYC Yellow Taxi**

| | |
|---|---|
| **Equipo** | Mobility Pulse |
| **Integrantes** | Javier Rodríguez Rodríguez · Diego Alonso López Ballesta |
| **Docente** | Jessica Carmin Mendiola Fuentes |
| **Módulo** | Visualización de datos |
| **Proyecto** | 4 — La movilidad urbana y el tráfico inteligente |
| **Dataset** | [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) |

---

## 1. Descripción

**NYC Mobility Pulse** es un dashboard interactivo que analiza los viajes de taxi
amarillo de la ciudad de Nueva York para responder tres preguntas:

1. **¿Cuándo** se mueve la ciudad? (estacionalidad, día de la semana, hora pico).
2. **¿Dónde** se concentra la demanda? (zonas TLC, boroughs, rutas origen–destino).
3. **¿Cuánto cuesta y qué tan eficiente es** cada viaje? (tarifa, propina,
   distancia, duración, velocidad).

El tablero está pensado como una herramienta **táctica**: permite comparar años y
detectar patrones de mediano plazo para tomar decisiones de capacidad,
planificación de turnos y evaluación de tarifas. Incluye una capa operativa
(lectura por hora y zona) para explorar el detalle.

### Indicadores principales

- Viajes analizados, ingreso total y tarifa promedio.
- Tarifa por milla y propina promedio.
- Velocidad promedio y duración del viaje.
- Zonas con mayor demanda y su participación.
- Rutas origen → destino más frecuentes.

### Visualizaciones

- Serie temporal mensual (con comparación contra el año previo disponible).
- Mapa de calor día × hora (168 franjas).
- Coropleta interactiva de las 263 zonas TLC (Leaflet + GeoJSON).
- Ranking de zonas y filtro por borough.
- Histogramas de tarifa y distancia.
- Donut de métodos de pago y propina declarada.
- Boxplot de duración: hora pico, valle, fin de semana y madrugada.
- Dispersión distancia vs. tarifa con correlación.
- Tabla de rutas más frecuentes.

### Experiencia de uso

- **Selector de año**: tira de chips en escritorio y selector compacto con menú
  en móvil y tablet; cada indicador, gráfica y mapa se recalcula al instante sin
  recargar la página.
- **Guía de lectura** al inicio y un botón **«¿Cómo leer esta gráfica?»** en cada
  visualización, con qué muestra cada eje, qué mirar y qué conclusión extraer.
- **Animaciones de entrada** por sección y **conteo animado** de los KPI al
  cambiar de año, con transiciones suaves entre estados.
- **Interacción directa**: tooltips con cifras exactas, celdas del heatmap
  navegables con teclado, selección de zona en el mapa con detalle emergente,
  control de zoom y botón para limpiar la selección.
- **Diseño responsive** (escritorio, tablet y móvil) con tablas y heatmap
  desplazables, y respeto a `prefers-reduced-motion` para quien prefiere menos
  movimiento.

---

## 2. Demo

El sitio está publicado como **sitio estático** en GitHub Pages:

**https://srmeme64.github.io/nyc-mobility-pulse/**

El workflow `.github/workflows/deploy.yml` construye y despliega automáticamente
en cada push a `main`.

La configuración de Vite usa `base: './'`, por lo que funciona tanto en la raíz
como en un subdirectorio de GitHub Pages sin cambiar el nombre del repositorio.

---

## 3. Arquitectura

```
  8 CSV anuales de NYC TLC (~87 GB)
                 │
                 ▼
        DuckDB  ── limpieza + normalización de esquema
                 │
        ┌────────┴─────────┐
        ▼                  ▼
  500,000 viajes/año    agregados analíticos
  (Parquet, semilla 42) (JSON)
        │                  │
        ▼                  ▼
  data/taxi_mobility   public/data/dashboard.json
      .duckdb                │
                           ▼
                 React + Vite + Recharts + Leaflet
                           │
                           ▼
                     GitHub Pages
```

**¿Por qué JSON y no consultas en vivo?** GitHub Pages solo sirve archivos
estáticos. La base de datos DuckDB se construye y valida en local (capa de datos
reproducible); el dashboard consume agregados precalculados para cargar rápido y
no exponer credenciales. El pipeline completo está versionado en `etl/`.

---

## 4. Datos

- **Fuente:** NYC Taxi & Limousine Commission (TLC), Yellow Taxi Trip Records.
- **Años disponibles en el conjunto entregado:** 2015, 2017, 2018, 2019, 2020,
  2021, 2022 y 2025. Faltan 2016, 2023 y 2024.
- **Volumen fuente:** 86.9 GB y 599,475,232 registros; 585,599,682 (97.7 %)
  pasaron las reglas de limpieza.
- **Muestra:** 500,000 viajes por año (4,000,000 en total) mediante *reservoir
  sampling* con semilla fija (`42`), reproducible.
- **Catálogo:** 263 zonas TLC (`taxi_zone_lookup.csv` + shapefile oficial).

| Año | Archivo (GB) | Registros fuente | Válidos | Muestra |
|---|---:|---:|---:|---:|
| 2015 | 26.89 | 146,087,462 | 97.5 % | 500,000 |
| 2017 | 14.62 | 113,496,874 | 98.8 % | 500,000 |
| 2018 | 14.47 | 112,234,626 | 98.7 % | 500,000 |
| 2019 | 11.22 | 84,399,019 | 98.3 % | 500,000 |
| 2020 | 3.32 | 24,648,499 | 97.6 % | 500,000 |
| 2021 | 4.11 | 30,904,072 | 97.6 % | 500,000 |
| 2022 | 5.45 | 39,656,098 | 97.4 % | 500,000 |
| 2025 | 6.79 | 48,048,582 | 92.5 % | 500,000 |
| **Total** | **86.9** | **599,475,232** | **97.7 %** | **4,000,000** |

La muestra conserva la estructura horaria, geográfica y tarifaria de cada año.
Los conteos del dashboard son **viajes de la muestra**; el reporte de calidad
incluye los totales exactos de los archivos fuente.

### Variables utilizadas

| Variable | Tipo | Uso |
|---|---|---|
| `pickup_ts`, `dropoff_ts` | timestamp | duración, hora, día, mes |
| `trip_distance` | decimal (mi) | distancia y velocidad |
| `PULocationID`, `DOLocationID` | entero | zona de origen y destino |
| `pickup_latitude/longitude` | decimal | mapeo espacial de 2015 |
| `fare_amount`, `extra`, `mta_tax` | decimal (USD) | tarifa base |
| `tip_amount`, `tolls_amount`, `total_amount` | decimal (USD) | propina, peajes, ingreso |
| `payment_type` | categórico | método de pago |
| `passenger_count` | entero | pasajeros |

### Limpieza aplicada

- Esquemas distintos entre 2015 (`pickup_datetime`, coordenadas) y 2016+
  (`tpep_pickup_datetime`, `PULocationID`), normalizados a un esquema común.
- Números con separador de miles dentro del CSV (`"-1,242.3"`) convertidos de
  forma segura.
- Fechas en dos formatos (`2015 Aug 18 08:31:49 AM` y `01/01/2019 12:46:40 AM`).
- Fechas corruptas (por ejemplo, año `2084` en el archivo de 2018) descartadas.
- Detección de un **bloque duplicado en marzo de 2018** (18.9 M de filas frente a
  8–9 M en los demás meses); se documenta y se conserva, porque no es un
  duplicado exacto y eliminarlo requeriría inventar un criterio.
- Reglas: duración 1 min–6 h, distancia 0.1–100 mi, tarifa ≥ 0, zonas 1–265,
  coordenadas dentro del área de NYC.
- Valores atípicos **descartados**, no imputados: el tablero describe viajes
  reales.

---

## 5. Estructura del repositorio

```
.
├─ src/                     # Aplicación React + TypeScript
│  ├─ components/           # Tarjetas, gráficos, mapa, secciones
│  ├─ lib/                  # Tipos, carga de datos, formato y escalas
│  ├─ App.tsx
│  └─ styles.css
├─ public/
│  ├─ data/dashboard.json   # Agregados que consume el dashboard
│  ├─ data/taxi_zones.geojson
│  └─ favicon.svg
├─ etl/                     # Pipeline reproducible en Python + DuckDB
│  ├─ 01_extract_sample.py
│  ├─ 02_build_geojson.py
│  ├─ 03_map_zones_2015.py
│  ├─ 04_build_aggregates.py
│  └─ requirements.txt
├─ data/                    # Generado (ignorado por git)
│  ├─ samples/*.parquet
│  ├─ taxi_mobility.duckdb
│  ├─ quality_report.json
│  └─ zones.csv
├─ docs/                    # Documento de justificación (Fase 1)
├─ .github/workflows/deploy.yml
├─ index.html
└─ package.json
```

---

## 6. Ejecutar en local

### Dashboard

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/
```

### Pipeline de datos

Requiere Python 3.10+ y los CSV de TLC en la raíz del proyecto.

```bash
python -m pip install -r etl/requirements.txt

python etl/01_extract_sample.py      # CSV -> muestras Parquet (500k/año)
python etl/02_build_geojson.py       # shapefile -> GeoJSON de zonas
python etl/03_map_zones_2015.py      # join espacial para 2015
python etl/04_build_aggregates.py    # JSON + base DuckDB
```

> El paso 01 recorre los ocho archivos completos (~87 GB) y puede tardar
> varios minutos. Los pasos 02–04 son rápidos.

### Base de datos

`data/taxi_mobility.duckdb` contiene:

- `trips_sample`: 4,000,000 de viajes muestreados y limpios.
- `zones`: catálogo de 263 zonas TLC (borough, zona, service zone).
- `quality`: reporte de calidad por año.

Se puede consultar con DuckDB CLI o Python:

```sql
SELECT year, count(*) AS viajes, round(avg(fare_amount), 2) AS tarifa
FROM trips_sample
GROUP BY year
ORDER BY year;
```

---

## 7. Despliegue en GitHub Pages

1. Crear un repositorio **público** y subir el proyecto.
2. En **Settings → Pages → Build and deployment**, elegir **GitHub Actions**.
3. Hacer push a `main`; el workflow construye y publica `dist/`.
4. Abrir la URL que aparece en **Settings → Pages**.

No se necesita configurar `base` ni un dominio: las rutas son relativas.

---

## 8. Entregables de la Fase 1

- `docs/Justificacion_Fase1.pdf` — análisis de audiencia, objetivos,
  preprocesamiento, tipo de dashboard y justificación técnica.
- `docs/justificacion.html` — versión imprimible del documento.
- Este `README.md` con el nombre del equipo, integrantes y descripción.

---

## 9. Limitaciones

- El dashboard trabaja sobre una **muestra** de 500k viajes por año; los totales
  exactos de la fuente se reportan en la sección de metodología.
- **Marzo de 2018 está inflado en el archivo fuente**: la TLC entrega ese mes con
  unos 18.9 millones de filas frente a ~8–9 millones del resto de los meses. El
  ETL no elimina el bloque (no es un duplicado exacto y no hay forma fiable de
  separarlo), por lo que la serie mensual muestra un pico que se documenta en el
  propio gráfico y en la metodología.
- La propina en efectivo no se registra en el dataset; el indicador refleja
  principalmente pagos electrónicos.
- El archivo de 2015 no trae `PULocationID`; las zonas se asignaron con un
  *point-in-polygon* contra el shapefile oficial (cobertura ~99%).
- Los años 2016, 2023 y 2024 no están en el conjunto entregado.
- GitHub Pages es estático: no hay backend ni consultas en vivo. La base DuckDB
  es la capa reproducible local.

---

## 10. Créditos

Datos: NYC Taxi & Limousine Commission — TLC Trip Record Data (dominio público).
Geometrías: NYC TLC Taxi Zones.
Stack: React, TypeScript, Vite, Recharts, Leaflet, DuckDB.

Proyecto académico · Módulo de Visualización de datos · 2026.
