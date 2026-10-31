import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { ArrowUpRight, Layers, MapPin } from 'lucide-react'
import type { ZoneFeatureProps, ZoneRow, Year } from '../lib/types'
import { fmtInt, fmtMoney2, fmtPct, heatColor } from '../lib/format'
import { zonesFor } from '../lib/data'
import { Segmented } from './ui'

type Metric = 'pickups' | 'dropoffs' | 'avg_fare'
type Geo = FeatureCollection<Geometry, ZoneFeatureProps>

interface Props {
  rows: ZoneRow[]
  year: Year
}

const BOROUGHS = ['Todos', 'Manhattan', 'Queens', 'Brooklyn', 'Bronx', 'Staten Island', 'EWR']

export function ZonesSection({ rows, year }: Props) {
  const [metric, setMetric] = useState<Metric>('pickups')
  const [borough, setBorough] = useState('Todos')
  const [selected, setSelected] = useState<number | null>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [geoError, setGeoError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(new URL('data/taxi_zones.geojson', document.baseURI))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d: Geo) => alive && setGeo(d))
      .catch(() => alive && setGeoError(true))
    return () => {
      alive = false
    }
  }, [])

  const zones = useMemo(() => zonesFor(rows, year), [rows, year])
  const byId = useMemo(() => new Map(zones.map((z) => [z.zone_id, z])), [zones])

  const visible = useMemo(
    () =>
      zones
        .filter((z) => borough === 'Todos' || z.borough === borough)
        .sort((a, b) => b.pickups - a.pickups),
    [zones, borough],
  )

  const top = visible.slice(0, 10)
  const maxTop = Math.max(1, ...top.map((z) => z.pickups))

  const values = zones
    .filter((z) => borough === 'Todos' || z.borough === borough)
    .map((z) => z[metric])
  const max = Math.max(1, ...values)
  const min = values.length ? Math.min(...values) : 0

  const colorFor = (z: ZoneRow | undefined) => {
    if (!z) return '#141d2e'
    if (metric === 'avg_fare') {
      const t = (z.avg_fare - min) / Math.max(1, max - min)
      return heatColor(Math.pow(Math.max(0, t), 0.9))
    }
    return heatColor(Math.sqrt(z[metric] / max))
  }

  const selectedZone = selected != null ? byId.get(selected) : null

  const geoData = useMemo(() => {
    if (!geo) return null
    if (borough === 'Todos') return geo
    return {
      ...geo,
      features: geo.features.filter((f) => f.properties.borough === borough),
    }
  }, [geo, borough])

  return (
    <div className="zones-grid">
      <section className="card zones-map-card">
        <header className="card-head zones-head">
          <div>
            <h3 className="card-title">Geografía de la demanda</h3>
            <p className="card-sub">
              {fmtInt(zones.reduce((a, z) => a + z.pickups, 0))} viajes con zona de origen ·{' '}
              {zones.length} zonas activas
            </p>
          </div>
          <Segmented
            label="Métrica del mapa"
            value={metric}
            onChange={(m) => setMetric(m)}
            options={[
              { value: 'pickups', label: 'Origen' },
              { value: 'dropoffs', label: 'Destino' },
              { value: 'avg_fare', label: 'Tarifa' },
            ]}
          />
        </header>

        <div className="borough-row">
          <Layers size={14} />
          {BOROUGHS.map((b) => (
            <button
              key={b}
              type="button"
              className={`chip ${borough === b ? 'active' : ''}`}
              onClick={() => {
                setBorough(b)
                setSelected(null)
              }}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="map-shell">
          {geoError && (
            <p className="empty">No se pudo cargar la geometría de zonas.</p>
          )}
          {!geoError && geoData && (
            <MapContainer
              bounds={[
                [40.49, -74.26],
                [40.92, -73.69],
              ]}
              scrollWheelZoom={false}
              className="leaflet-map"
              attributionControl
            >
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                className="map-tiles"
              />
              <GeoJSON
                key={`${year}-${metric}-${borough}`}
                data={geoData}
                style={(feature) => {
                  const z = feature ? byId.get((feature.properties as ZoneFeatureProps).zoneId) : undefined
                  return {
                    fillColor: colorFor(z),
                    fillOpacity: selected != null && z?.zone_id !== selected ? 0.45 : 0.82,
                    color: selected != null && z?.zone_id === selected ? '#ffffff' : '#070b14',
                    weight: selected != null && z?.zone_id === selected ? 2 : 0.6,
                  }
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties as ZoneFeatureProps
                  const z = byId.get(p.zoneId)
                  if (z) {
                    layer.bindTooltip(
                      `<div class="map-tip"><strong>${p.zone}</strong><span>${p.borough}</span>
                       <div><b>${fmtInt(z.pickups)}</b> origen · <b>${fmtInt(z.dropoffs)}</b> destino</div>
                       <div>Tarifa media <b>${fmtMoney2(z.avg_fare)}</b> · Propina <b>${fmtPct(z.tip_pct)}</b></div></div>`,
                      { sticky: true, direction: 'top', opacity: 1 },
                    )
                  }
                  layer.on('click', () => setSelected(p.zoneId))
                }}
              />
            </MapContainer>
          )}
          {!geoError && !geoData && <div className="map-skeleton" />}

          <div className="map-legend">
            <span>
              {metric === 'avg_fare' ? fmtMoney2(min) : '0'}
            </span>
            <span className="map-gradient" />
            <span>{metric === 'avg_fare' ? fmtMoney2(max) : fmtInt(max)}</span>
          </div>
        </div>

        {selectedZone ? (
          <div className="zone-detail">
            <div>
              <span className="zone-detail-kicker">
                <MapPin size={13} /> Zona {selectedZone.zone_id} · {selectedZone.borough}
              </span>
              <strong>{selectedZone.zone}</strong>
            </div>
            <dl>
              <div><dt>Origen</dt><dd>{fmtInt(selectedZone.pickups)}</dd></div>
              <div><dt>Destino</dt><dd>{fmtInt(selectedZone.dropoffs)}</dd></div>
              <div><dt>Tarifa media</dt><dd>{fmtMoney2(selectedZone.avg_fare)}</dd></div>
              <div><dt>Duración</dt><dd>{selectedZone.avg_duration.toFixed(1)} min</dd></div>
              <div><dt>Propina</dt><dd>{fmtPct(selectedZone.tip_pct)}</dd></div>
            </dl>
          </div>
        ) : (
          <p className="map-hint">
            <ArrowUpRight size={14} /> Haz clic en una zona para ver su detalle.
          </p>
        )}
      </section>

      <section className="card top-zones">
        <header className="card-head">
          <div>
            <h3 className="card-title">Top zonas por origen</h3>
            <p className="card-sub">Participación sobre el total de viajes</p>
          </div>
        </header>
        <ol className="zone-list">
          {top.map((z, i) => {
            const share = (z.pickups / Math.max(1, zones.reduce((a, b) => a + b.pickups, 0))) * 100
            return (
              <li key={z.zone_id}>
                <button
                  type="button"
                  className={selected === z.zone_id ? 'active' : ''}
                  onClick={() => setSelected(z.zone_id)}
                >
                  <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="zone-name">
                    <strong>{z.zone}</strong>
                    <small>{z.borough}</small>
                    <span className="zone-bar">
                      <span style={{ width: `${(z.pickups / maxTop) * 100}%` }} />
                    </span>
                  </span>
                  <span className="zone-value">
                    <strong>{fmtInt(z.pickups)}</strong>
                    <small>{fmtPct(share, 2)}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
