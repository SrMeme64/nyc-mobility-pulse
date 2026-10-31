"""
03_map_zones_2015.py
--------------------
El archivo de 2015 no incluye PULocationID / DOLocationID: solo coordenadas.
Este script hace un join espacial (point-in-polygon) contra el shapefile de
Taxi Zones para asignar zona de origen y destino a la muestra de 2015.

Uso:
    python etl/03_map_zones_2015.py
"""

from __future__ import annotations

import csv
import os

import duckdb
import shapefile
from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform as shp_transform
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE = os.path.join(ROOT, "data", "samples", "yellow_taxi_2015.parquet")
SHP = os.path.join(ROOT, "data", "geo", "taxi_zones", "taxi_zones.shp")
MAP_CSV = os.path.join(ROOT, "data", "samples", "_zones_2015.csv")
TMP = os.path.join(ROOT, "data", "samples", "_yellow_taxi_2015_mapped.parquet")


def load_zones():
    reader = shapefile.Reader(SHP)
    fields = [f[0] for f in reader.fields[1:]]
    geoms, ids = [], []
    project = Transformer.from_crs("EPSG:2263", "EPSG:4326", always_xy=True)
    for sr in reader.iterShapeRecords():
        props = dict(zip(fields, sr.record))
        geom = shp_transform(project.transform, shape(sr.shape.__geo_interface__))
        if not geom.is_valid:
            geom = geom.buffer(0)
        geoms.append(geom)
        ids.append(int(props["LocationID"]))
    return geoms, ids, STRtree(geoms)


def locate(tree, ids, lat, lon):
    if lat is None or lon is None:
        return None
    p = Point(lon, lat)
    for idx in tree.query(p):
        if tree.geometries[idx].contains(p):
            return ids[idx]
    return None


def main() -> None:
    if not os.path.exists(SAMPLE):
        raise SystemExit(f"No existe {SAMPLE}. Ejecuta primero 01_extract_sample.py")

    con = duckdb.connect()
    rows = con.execute(
        f"""
        SELECT file_row_number AS rid, pu_lat, pu_lon, do_lat, do_lon
        FROM read_parquet('{SAMPLE.replace(os.sep, '/')}', file_row_number = true)
        ORDER BY rid
        """
    ).fetchall()

    geoms, ids, tree = load_zones()
    print(f"Asignando zonas a {len(rows):,} viajes de 2015 ...")

    mapped = 0
    with open(MAP_CSV, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["rid", "pu_zone", "do_zone"])
        for rid, pu_lat, pu_lon, do_lat, do_lon in rows:
            pu = locate(tree, ids, pu_lat, pu_lon)
            do = locate(tree, ids, do_lat, do_lon)
            if pu is not None:
                mapped += 1
            writer.writerow([rid, pu if pu is not None else "", do if do is not None else ""])

    con.execute(
        f"""
        COPY (
            SELECT p.year, p.pickup_ts, p.dropoff_ts, p.duration_min, p.distance_mi,
                   CAST(m.pu_zone AS SMALLINT) AS pu_zone,
                   CAST(m.do_zone AS SMALLINT) AS do_zone,
                   p.pu_lat, p.pu_lon, p.do_lat, p.do_lon,
                   p.fare, p.tip, p.tolls, p.extra, p.mta_tax, p.total,
                   p.payment_type, p.rate_code, p.passenger_count
            FROM read_parquet('{SAMPLE.replace(os.sep, "/")}',
                              file_row_number = true) p
            JOIN read_csv('{MAP_CSV.replace(os.sep, "/")}',
                          header = true, all_varchar = true) m
              ON p.file_row_number = CAST(m.rid AS BIGINT)
            ORDER BY p.file_row_number
        ) TO '{TMP.replace(os.sep, "/")}' (FORMAT PARQUET, COMPRESSION ZSTD)
        """
    )
    con.close()

    os.replace(TMP, SAMPLE)
    os.remove(MAP_CSV)
    print(
        f"OK  {mapped:,}/{len(rows):,} viajes con zona de origen "
        f"({mapped / len(rows):.1%}) -> {SAMPLE}"
    )


if __name__ == "__main__":
    main()
