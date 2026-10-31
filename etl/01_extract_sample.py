"""
01_extract_sample.py
--------------------
Extrae una muestra reproducible de 500,000 viajes por cada archivo anual de
NYC Yellow Taxi (dataset TLC) y la guarda en Parquet.

El proceso:
  1. Lee el CSV completo como texto (los archivos traen separadores de miles
     dentro de columnas numericas, p. ej. "-1,242.3").
  2. Normaliza el esquema entre 2015 y 2016+.
  3. Limpia y valida fechas, distancias, tarifas y zonas.
  4. Toma una muestra aleatoria por reservoir sampling (semilla fija).
  5. Escribe data/samples/yellow_taxi_<year>.parquet y un reporte de calidad.

Uso:
    python etl/01_extract_sample.py
    python etl/01_extract_sample.py --years 2020 --sample-size 5000
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import time

import duckdb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
SAMPLE_DIR = os.path.join(DATA_DIR, "samples")
QUALITY_PATH = os.path.join(DATA_DIR, "quality_report.json")

TS_FORMATS = (
    "'%Y %b %d %I:%M:%S %p'",
    "'%m/%d/%Y %I:%M:%S %p'",
    "'%Y-%m-%d %H:%M:%S'",
    "'%m/%d/%Y %H:%M:%S'",
)


def ts_expr(col: str) -> str:
    parts = [f"TRY_STRPTIME(trim({col}), {fmt})" for fmt in TS_FORMATS]
    return "COALESCE(" + ", ".join(parts) + ")"


def num(col: str) -> str:
    """Convierte texto con separador de miles a DOUBLE de forma segura."""
    return f"TRY_CAST(NULLIF(replace(trim(\"{col}\"), ',', ''), '') AS DOUBLE)"


def find_files() -> dict[int, str]:
    files: dict[int, str] = {}
    for path in glob.glob(os.path.join(ROOT, "*Yellow_Taxi_Trip_Data*.csv")):
        m = re.search(r"(\d{4})_Yellow_Taxi", os.path.basename(path))
        if m:
            files[int(m.group(1))] = path
    return dict(sorted(files.items()))


def read_columns(path: str) -> set[str]:
    import csv

    with open(path, "r", encoding="utf-8-sig", errors="replace") as fh:
        header = next(csv.reader(fh))
    return {h.strip().strip('"') for h in header}


def build_cte(path: str, year: int) -> str:
    """CTE con columnas normalizadas y banderas de calidad (flags)."""
    cols = read_columns(path)
    pu_dt = '"tpep_pickup_datetime"' if "tpep_pickup_datetime" in cols else '"pickup_datetime"'
    do_dt = '"tpep_dropoff_datetime"' if "tpep_dropoff_datetime" in cols else '"dropoff_datetime"'
    pu_zone = (
        "TRY_CAST(NULLIF(trim(\"PULocationID\"), '') AS INTEGER)"
        if "PULocationID" in cols
        else "CAST(NULL AS INTEGER)"
    )
    do_zone = (
        "TRY_CAST(NULLIF(trim(\"DOLocationID\"), '') AS INTEGER)"
        if "DOLocationID" in cols
        else "CAST(NULL AS INTEGER)"
    )
    lat = num("pickup_latitude") if "pickup_latitude" in cols else "CAST(NULL AS DOUBLE)"
    lon = num("pickup_longitude") if "pickup_longitude" in cols else "CAST(NULL AS DOUBLE)"
    dlat = num("dropoff_latitude") if "dropoff_latitude" in cols else "CAST(NULL AS DOUBLE)"
    dlon = num("dropoff_longitude") if "dropoff_longitude" in cols else "CAST(NULL AS DOUBLE)"

    raw = f"""
        SELECT
            {ts_expr(pu_dt)}                 AS pickup_ts,
            {ts_expr(do_dt)}                 AS dropoff_ts,
            {num('trip_distance')}           AS distance_mi,
            {num('fare_amount')}             AS fare,
            {num('tip_amount')}              AS tip,
            {num('tolls_amount')}            AS tolls,
            {num('total_amount')}            AS total,
            {num('extra')}                   AS extra,
            {num('mta_tax')}                 AS mta_tax,
            {num('passenger_count')}         AS passenger_count,
            {num('payment_type')}            AS payment_type,
            {num('RateCodeID')}              AS rate_code,
            {lon}                            AS pu_lon,
            {lat}                            AS pu_lat,
            {dlon}                           AS do_lon,
            {dlat}                           AS do_lat,
            {pu_zone}                        AS pu_zone,
            {do_zone}                        AS do_zone
        FROM read_csv('{path.replace(os.sep, '/')}', header = true,
                      all_varchar = true, union_by_name = true)
    """

    return f"""
        WITH raw AS ({raw}),
        flags AS (
            SELECT *,
                date_diff('second', pickup_ts, dropoff_ts) / 60.0 AS duration_min,
                (pickup_ts IS NULL OR dropoff_ts IS NULL)                  AS bad_ts,
                (pickup_ts IS NULL OR year(pickup_ts) <> {year})            AS bad_year,
                (pickup_ts IS NOT NULL AND dropoff_ts IS NOT NULL
                    AND (dropoff_ts < pickup_ts
                         OR date_diff('second', pickup_ts, dropoff_ts) < 60
                         OR date_diff('second', pickup_ts, dropoff_ts) > 21600)) AS bad_duration,
                (distance_mi IS NULL OR distance_mi <= 0 OR distance_mi > 100) AS bad_distance,
                (fare IS NULL OR fare < 0 OR fare > 500)                   AS bad_fare,
                (total IS NULL OR total < 0 OR total > 1500)               AS bad_total,
                (tip IS NULL OR tip < 0 OR tip > 300)                      AS bad_tip,
                (passenger_count IS NOT NULL AND (passenger_count < 0 OR passenger_count > 8)) AS bad_passengers,
                (pu_zone IS NOT NULL AND (pu_zone < 1 OR pu_zone > 265))   AS bad_pu_zone,
                (do_zone IS NOT NULL AND (do_zone < 1 OR do_zone > 265))   AS bad_do_zone,
                (pu_lat IS NOT NULL AND (pu_lat < 40.4 OR pu_lat > 41.1
                    OR pu_lon < -74.3 OR pu_lon > -73.6))                  AS bad_pu_coords
            FROM raw
        ),
        valid AS (
            SELECT * FROM flags
            WHERE NOT (bad_ts OR bad_year OR bad_duration OR bad_distance
                       OR bad_fare OR bad_total OR bad_tip OR bad_passengers
                       OR bad_pu_zone OR bad_do_zone OR bad_pu_coords)
        )
    """


def extract(year: int, path: str, sample_size: int) -> dict:
    con = duckdb.connect()
    con.execute("SET threads = 8")
    con.execute("SET preserve_insertion_order = false")
    t0 = time.time()
    cte = build_cte(path, year)

    valid_cond = """NOT (bad_ts OR bad_year OR bad_duration OR bad_distance
                       OR bad_fare OR bad_total OR bad_tip OR bad_passengers
                       OR bad_pu_zone OR bad_do_zone OR bad_pu_coords)"""
    stats = con.execute(
        cte
        + f"""
        SELECT
            count(*)                                            AS total_rows,
            count(*) FILTER (WHERE {valid_cond})                AS valid_rows,
            count(*) FILTER (WHERE bad_ts)                      AS bad_ts,
            count(*) FILTER (WHERE bad_year AND NOT bad_ts)     AS bad_year,
            count(*) FILTER (WHERE bad_duration)                AS bad_duration,
            count(*) FILTER (WHERE bad_distance)                AS bad_distance,
            count(*) FILTER (WHERE bad_fare OR bad_total)       AS bad_money,
            count(*) FILTER (WHERE bad_tip)                     AS bad_tip,
            count(*) FILTER (WHERE bad_passengers)              AS bad_passengers,
            count(*) FILTER (WHERE bad_pu_zone OR bad_do_zone)  AS bad_zone,
            count(*) FILTER (WHERE bad_pu_coords)               AS bad_coords,
            round(avg(duration_min) FILTER (WHERE {valid_cond}), 2) AS avg_duration,
            round(avg(distance_mi) FILTER (WHERE {valid_cond}), 2)  AS avg_distance,
            round(avg(fare) FILTER (WHERE {valid_cond}), 2)         AS avg_fare
        FROM flags
        """
    ).fetchone()

    out = os.path.join(SAMPLE_DIR, f"yellow_taxi_{year}.parquet")
    tmp = out + ".tmp"
    con.execute(
        f"""
        COPY (
            {cte}
            SELECT {year} AS year, pickup_ts, dropoff_ts,
                   round(duration_min, 2) AS duration_min,
                   round(distance_mi, 2) AS distance_mi,
                   CAST(pu_zone AS SMALLINT) AS pu_zone,
                   CAST(do_zone AS SMALLINT) AS do_zone,
                   round(pu_lat, 5) AS pu_lat, round(pu_lon, 5) AS pu_lon,
                   round(do_lat, 5) AS do_lat, round(do_lon, 5) AS do_lon,
                   round(fare, 2) AS fare,
                   round(tip, 2) AS tip,
                   round(tolls, 2) AS tolls,
                   round(extra, 2) AS extra,
                   round(mta_tax, 2) AS mta_tax,
                   round(total, 2) AS total,
                   CAST(payment_type AS SMALLINT) AS payment_type,
                   CAST(rate_code AS SMALLINT) AS rate_code,
                   CAST(passenger_count AS SMALLINT) AS passenger_count
            FROM valid
            USING SAMPLE reservoir({sample_size} ROWS) REPEATABLE (42)
        ) TO '{tmp.replace(os.sep, '/')}' (FORMAT PARQUET, COMPRESSION ZSTD)
        """
    )
    os.replace(tmp, out)
    con.close()

    keys = [
        "total_rows", "valid_rows", "bad_ts", "bad_year", "bad_duration",
        "bad_distance", "bad_money", "bad_tip", "bad_passengers", "bad_zone",
        "bad_coords", "avg_duration", "avg_distance", "avg_fare",
    ]
    info = dict(zip(keys, stats))
    info.update(
        {
            "year": year,
            "source_file": os.path.basename(path),
            "source_gb": round(os.path.getsize(path) / 1e9, 2),
            "sample_rows": sample_size,
            "sample_fraction": round(sample_size / max(info["valid_rows"], 1), 4),
            "seconds": round(time.time() - t0, 1),
        }
    )
    return info


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", nargs="*", type=int, default=None)
    parser.add_argument("--sample-size", type=int, default=500_000)
    args = parser.parse_args()

    os.makedirs(SAMPLE_DIR, exist_ok=True)
    files = find_files()
    if not files:
        raise SystemExit("No se encontraron archivos *Yellow_Taxi_Trip_Data*.csv")

    if args.years:
        files = {y: p for y, p in files.items() if y in set(args.years)}

    report = []
    if os.path.exists(QUALITY_PATH):
        with open(QUALITY_PATH, encoding="utf-8") as fh:
            report = json.load(fh)

    for year, path in files.items():
        print(f"[{year}] leyendo {os.path.basename(path)} ...", flush=True)
        info = extract(year, path, args.sample_size)
        report = [r for r in report if r["year"] != year] + [info]
        report.sort(key=lambda r: r["year"])
        with open(QUALITY_PATH, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
        print(
            f"[{year}] OK  total={info['total_rows']:,}  validas={info['valid_rows']:,}  "
            f"muestra={info['sample_rows']:,}  {info['seconds']}s",
            flush=True,
        )

    print("Listo. Muestras en", SAMPLE_DIR)


if __name__ == "__main__":
    main()
