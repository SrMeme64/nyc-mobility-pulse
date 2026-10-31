"""
02_build_geojson.py
-------------------
Convierte el shapefile oficial de Taxi Zones de NYC TLC a GeoJSON simplificado
para usarlo como coropleta en el dashboard (Leaflet).

Tambien genera data/zones.csv con el catalogo LocationID -> Borough/Zona.

Uso:
    python etl/02_build_geojson.py
"""

from __future__ import annotations

import csv
import json
import os
import shapefile  # pyshp
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import orient
from shapely.ops import transform as shp_transform

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHP = os.path.join(ROOT, "data", "geo", "taxi_zones", "taxi_zones.shp")
LOOKUP = os.path.join(ROOT, "taxi_zone_lookup.csv")
OUT_GEOJSON = os.path.join(ROOT, "public", "data", "taxi_zones.geojson")
OUT_CSV = os.path.join(ROOT, "data", "zones.csv")
TOLERANCE = 0.00025  # ~25 m: suficiente para un mapa a escala de ciudad


def round_coords(obj, ndigits=5):
    if isinstance(obj, float):
        return round(obj, ndigits)
    if isinstance(obj, (list, tuple)):
        return [round_coords(v, ndigits) for v in obj]
    return obj


def main() -> None:
    with open(LOOKUP, encoding="utf-8-sig") as fh:
        lookup = {
            int(row["LocationID"]): row for row in csv.DictReader(fh)
        }

    reader = shapefile.Reader(SHP)
    fields = [f[0] for f in reader.fields[1:]]
    features = []
    # El shapefile oficial esta en NAD83 / New York Long Island (ftUS), EPSG:2263.
    # Leaflet y las coordenadas del dataset estan en WGS84 (EPSG:4326).
    project = Transformer.from_crs("EPSG:2263", "EPSG:4326", always_xy=True)

    for sr in reader.iterShapeRecords():
        props = dict(zip(fields, sr.record))
        zone_id = int(props["LocationID"])
        geom = shape(sr.shape.__geo_interface__)
        geom = shp_transform(project.transform, geom)
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = geom.simplify(TOLERANCE, preserve_topology=True)
        if geom.geom_type == "Polygon":
            geom = orient(geom, sign=1.0)
        elif geom.geom_type == "MultiPolygon":
            geom = type(geom)([orient(g, sign=1.0) for g in geom.geoms])

        meta = lookup.get(zone_id, {})
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "zoneId": zone_id,
                    "zone": meta.get("Zone", props.get("zone", "")),
                    "borough": meta.get("Borough", props.get("borough", "")),
                    "serviceZone": meta.get("service_zone", ""),
                },
                "geometry": round_coords(mapping(geom)),
            }
        )

    os.makedirs(os.path.dirname(OUT_GEOJSON), exist_ok=True)
    with open(OUT_GEOJSON, "w", encoding="utf-8") as fh:
        json.dump(
            {"type": "FeatureCollection", "features": features},
            fh,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    with open(OUT_CSV, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["LocationID", "Borough", "Zone", "service_zone"])
        for zone_id in sorted(lookup):
            row = lookup[zone_id]
            writer.writerow(
                [zone_id, row["Borough"], row["Zone"], row["service_zone"]]
            )

    size_mb = os.path.getsize(OUT_GEOJSON) / 1e6
    print(f"OK  {len(features)} zonas -> {OUT_GEOJSON} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
