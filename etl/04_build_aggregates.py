"""
04_build_aggregates.py
----------------------
Construye todas las agregaciones que consume el dashboard y las exporta a
public/data/dashboard.json. Tambien materializa la base de datos DuckDB
(data/taxi_mobility.duckdb) con la muestra y el catalogo de zonas.

El dashboard es estatico (GitHub Pages), por lo que el navegador no ejecuta
SQL: consume JSON pre-agregado. La base DuckDB queda como capa de datos
reproducible del proyecto.

Uso:
    python etl/04_build_aggregates.py
"""

from __future__ import annotations

import glob
import json
import math
import os
import time

import duckdb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_GLOB = os.path.join(ROOT, "data", "samples", "yellow_taxi_*.parquet")
ZONES_CSV = os.path.join(ROOT, "data", "zones.csv")
QUALITY_JSON = os.path.join(ROOT, "data", "quality_report.json")
OUT_JSON = os.path.join(ROOT, "public", "data", "dashboard.json")
DB_PATH = os.path.join(ROOT, "data", "taxi_mobility.duckdb")

PAYMENT_NAMES = {
    1: "Tarjeta de credito",
    2: "Efectivo",
    3: "Sin cargo",
    4: "Disputa",
    5: "Desconocido",
    6: "Viaje anulado",
}


def clean(value):
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def query(con, sql: str) -> list[dict]:
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return [
        {k: clean(v) for k, v in zip(cols, row)}
        for row in cur.fetchall()
    ]


def main() -> None:
    files = [
        f
        for f in sorted(glob.glob(SAMPLE_GLOB))
        if os.path.getsize(f) > 1_000_000
    ]
    if not files:
        raise SystemExit("No hay muestras. Ejecuta 01_extract_sample.py")

    con = duckdb.connect()
    con.execute("SET threads = 8")
    con.execute("SET preserve_insertion_order = false")

    parquet_list = "[" + ", ".join(
        "'" + f.replace(os.sep, "/") + "'" for f in files
    ) + "]"
    con.execute(
        f"""
        CREATE OR REPLACE VIEW trips AS
        SELECT *,
            (CAST(dayofweek(pickup_ts) AS INTEGER) + 6) % 7 AS dow,
            CAST(hour(pickup_ts) AS INTEGER) AS hour,
            CAST(month(pickup_ts) AS INTEGER) AS month,
            CASE WHEN duration_min > 0
                 THEN distance_mi / (duration_min / 60.0) END AS speed_mph,
            CASE WHEN fare > 0 THEN 100.0 * tip / fare END AS tip_pct
        FROM read_parquet({parquet_list})
        WHERE pickup_ts IS NOT NULL
        """
    )

    years = [r[0] for r in con.execute("SELECT DISTINCT year FROM trips ORDER BY year").fetchall()]
    zones = {}
    with open(ZONES_CSV, encoding="utf-8") as fh:
        import csv

        for row in csv.DictReader(fh):
            zones[int(row["LocationID"])] = row

    # ------------------------------------------------------------------ KPIs
    kpi_sql = """
        SELECT {year_expr} AS year,
               count(*)                                            AS trips,
               round(avg(duration_min), 2)                         AS avg_duration,
               round(avg(distance_mi), 2)                          AS avg_distance,
               round(avg(fare), 2)                                 AS avg_fare,
               round(sum(fare) / nullif(sum(distance_mi), 0), 2)   AS fare_per_mile,
               round(100.0 * sum(tip) / nullif(sum(fare), 0), 2)   AS tip_pct,
               round(sum(total), 0)                                AS revenue,
               count(DISTINCT pu_zone)                             AS active_zones,
               round(avg(speed_mph) FILTER (WHERE speed_mph BETWEEN 1 AND 60), 2) AS avg_speed
        FROM trips {group_expr}
    """
    kpis = query(con, kpi_sql.format(year_expr="year", group_expr="GROUP BY year ORDER BY year"))
    overall = query(
        con,
        """
        SELECT 'all' AS year,
               count(*) AS trips,
               round(avg(duration_min), 2) AS avg_duration,
               round(avg(distance_mi), 2) AS avg_distance,
               round(avg(fare), 2) AS avg_fare,
               round(sum(fare) / nullif(sum(distance_mi), 0), 2) AS fare_per_mile,
               round(100.0 * sum(tip) / nullif(sum(fare), 0), 2) AS tip_pct,
               round(sum(total), 0) AS revenue,
               count(DISTINCT pu_zone) AS active_zones,
               round(avg(speed_mph) FILTER (WHERE speed_mph BETWEEN 1 AND 60), 2) AS avg_speed
        FROM trips
        """,
    )[0]

    # -------------------------------------------------------------- mensual
    monthly = query(
        con,
        """
        SELECT year, month,
               count(*) AS trips,
               round(avg(fare), 2) AS avg_fare,
               round(avg(duration_min), 2) AS avg_duration,
               round(sum(total), 0) AS revenue
        FROM trips
        GROUP BY year, month
        ORDER BY year, month
        """,
    )

    # ------------------------------------------------------- hora x dia
    hourly = query(
        con,
        """
        SELECT year, dow, hour,
               count(*) AS trips,
               round(avg(fare), 2) AS avg_fare,
               round(avg(duration_min), 2) AS avg_duration
        FROM trips
        GROUP BY year, dow, hour
        ORDER BY year, dow, hour
        """,
    )

    # ---------------------------------------------------------------- zonas
    zones_year = query(
        con,
        """
        WITH pu AS (
            SELECT year, pu_zone AS zone_id, count(*) AS pickups,
                   round(avg(fare), 2) AS avg_fare,
                   round(avg(duration_min), 2) AS avg_duration,
                   round(100.0 * sum(tip) / nullif(sum(fare), 0), 2) AS tip_pct,
                   round(sum(total), 0) AS revenue
            FROM trips WHERE pu_zone IS NOT NULL
            GROUP BY year, pu_zone
        ),
        drops AS (
            SELECT year, do_zone AS zone_id, count(*) AS dropoffs
            FROM trips WHERE do_zone IS NOT NULL
            GROUP BY year, do_zone
        )
        SELECT pu.year, pu.zone_id, pu.pickups, coalesce(drops.dropoffs, 0) AS dropoffs,
               pu.avg_fare, pu.avg_duration, pu.tip_pct, pu.revenue
        FROM pu LEFT JOIN drops USING (year, zone_id)
        ORDER BY pu.year, pu.pickups DESC
        """,
    )
    for row in zones_year:
        z = zones.get(int(row["zone_id"]), {})
        row["zone"] = z.get("Zone", f"Zona {row['zone_id']}")
        row["borough"] = z.get("Borough", "Sin dato")

    # ------------------------------------------------------------- boroughs
    boroughs = query(
        con,
        """
        SELECT year, borough,
               count(*) AS trips,
               round(avg(fare), 2) AS avg_fare,
               round(100.0 * sum(tip) / nullif(sum(fare), 0), 2) AS tip_pct,
               round(sum(total), 0) AS revenue
        FROM (
            SELECT t.*, coalesce(z.borough, 'Sin zona') AS borough
            FROM trips t
            LEFT JOIN read_csv('{zones}', header = true, all_varchar = true) z
              ON t.pu_zone = CAST(z."LocationID" AS SMALLINT)
        )
        GROUP BY year, borough
        ORDER BY year, trips DESC
        """.format(zones=ZONES_CSV.replace(os.sep, "/")),
    )

    # ------------------------------------------------------------- pagos
    payment = query(
        con,
        """
        SELECT year, CAST(payment_type AS INTEGER) AS type,
               count(*) AS trips,
               round(100.0 * sum(tip) / nullif(sum(fare), 0), 2) AS tip_pct,
               round(avg(fare), 2) AS avg_fare
        FROM trips
        WHERE payment_type BETWEEN 1 AND 6
        GROUP BY year, payment_type
        ORDER BY year, trips DESC
        """,
    )
    for row in payment:
        row["name"] = PAYMENT_NAMES.get(int(row["type"]), "Otro")

    # ---------------------------------------------------------- histogramas
    hist_fare = query(
        con,
        """
        SELECT year, CAST(least(floor(fare / 2) * 2, 80) AS INTEGER) AS bin,
               count(*) AS count
        FROM trips WHERE fare >= 0 AND fare <= 100
        GROUP BY year, bin ORDER BY year, bin
        """,
    )
    hist_distance = query(
        con,
        """
        SELECT year, CAST(least(floor(distance_mi), 30) AS INTEGER) AS bin,
               count(*) AS count
        FROM trips WHERE distance_mi > 0 AND distance_mi <= 35
        GROUP BY year, bin ORDER BY year, bin
        """,
    )

    # --------------------------------------------------------------- boxplot
    boxplot = query(
        con,
        """
        WITH g AS (
            SELECT year,
                CASE
                    WHEN dow < 5 AND hour IN (7, 8, 9, 16, 17, 18) THEN 'Hora pico'
                    WHEN dow >= 5 THEN 'Fin de semana'
                    WHEN hour >= 22 OR hour < 6 THEN 'Madrugada'
                    ELSE 'Valle'
                END AS grp,
                duration_min
            FROM trips
        )
        SELECT year, grp,
               count(*) AS n,
               round(quantile_cont(duration_min, 0.05), 1) AS p05,
               round(quantile_cont(duration_min, 0.25), 1) AS p25,
               round(quantile_cont(duration_min, 0.50), 1) AS median,
               round(quantile_cont(duration_min, 0.75), 1) AS p75,
               round(quantile_cont(duration_min, 0.95), 1) AS p95
        FROM g
        GROUP BY year, grp
        ORDER BY year, grp
        """,
    )
    boxplot_all = query(
        con,
        """
        WITH g AS (
            SELECT
                CASE
                    WHEN dow < 5 AND hour IN (7, 8, 9, 16, 17, 18) THEN 'Hora pico'
                    WHEN dow >= 5 THEN 'Fin de semana'
                    WHEN hour >= 22 OR hour < 6 THEN 'Madrugada'
                    ELSE 'Valle'
                END AS grp,
                duration_min
            FROM trips
        )
        SELECT 'all' AS year, grp,
               count(*) AS n,
               round(quantile_cont(duration_min, 0.05), 1) AS p05,
               round(quantile_cont(duration_min, 0.25), 1) AS p25,
               round(quantile_cont(duration_min, 0.50), 1) AS median,
               round(quantile_cont(duration_min, 0.75), 1) AS p75,
               round(quantile_cont(duration_min, 0.95), 1) AS p95
        FROM g
        GROUP BY grp
        ORDER BY grp
        """,
    )
    boxplot += boxplot_all

    # --------------------------------------------------------------- scatter
    scatter = query(
        con,
        """
        WITH s AS (
            SELECT year, distance_mi, fare, duration_min, tip_pct, payment_type,
                   row_number() OVER (PARTITION BY year ORDER BY hash(pickup_ts, pu_zone, fare)) AS rn
            FROM trips
            WHERE distance_mi BETWEEN 0.2 AND 25
              AND fare BETWEEN 2 AND 90
              AND duration_min BETWEEN 2 AND 120
        )
        SELECT year, round(distance_mi, 2) AS distance,
               round(fare, 2) AS fare,
               round(duration_min, 1) AS duration,
               round(least(tip_pct, 60), 1) AS tip_pct,
               CAST(payment_type AS INTEGER) AS payment_type
        FROM s WHERE rn <= 320
        ORDER BY year, rn
        """,
    )
    scatter_all = query(
        con,
        """
        WITH s AS (
            SELECT distance_mi, fare, duration_min, tip_pct, payment_type,
                   row_number() OVER (ORDER BY hash(pickup_ts, pu_zone, fare)) AS rn
            FROM trips
            WHERE distance_mi BETWEEN 0.2 AND 25
              AND fare BETWEEN 2 AND 90
              AND duration_min BETWEEN 2 AND 120
        )
        SELECT 'all' AS year, round(distance_mi, 2) AS distance,
               round(fare, 2) AS fare,
               round(duration_min, 1) AS duration,
               round(least(tip_pct, 60), 1) AS tip_pct,
               CAST(payment_type AS INTEGER) AS payment_type
        FROM s WHERE rn <= 320
        ORDER BY rn
        """,
    )
    scatter += scatter_all

    # --------------------------------------------------------------- rutas
    routes = query(
        con,
        """
        WITH r AS (
            SELECT year, pu_zone, do_zone, count(*) AS trips,
                   round(avg(fare), 2) AS avg_fare,
                   round(avg(duration_min), 2) AS avg_duration,
                   row_number() OVER (PARTITION BY year ORDER BY count(*) DESC) AS rn
            FROM trips
            WHERE pu_zone IS NOT NULL AND do_zone IS NOT NULL AND pu_zone <> do_zone
            GROUP BY year, pu_zone, do_zone
        )
        SELECT year, pu_zone, do_zone, trips, avg_fare, avg_duration
        FROM r WHERE rn <= 10
        ORDER BY year, trips DESC
        """,
    )
    for row in routes:
        row["from"] = zones.get(int(row["pu_zone"]), {}).get("Zone", f"Zona {row['pu_zone']}")
        row["to"] = zones.get(int(row["do_zone"]), {}).get("Zone", f"Zona {row['do_zone']}")

    # -------------------------------------------------------------- calidad
    quality = []
    if os.path.exists(QUALITY_JSON):
        with open(QUALITY_JSON, encoding="utf-8") as fh:
            quality = json.load(fh)

    # La muestra es de tamano fijo por ano, asi que los cambios interanuales de
    # volumen solo son validos con los totales de la fuente. Se adjuntan a cada KPI.
    q_by_year = {int(q["year"]): q for q in quality}
    total_source = sum(q["total_rows"] for q in quality) if quality else None
    total_valid = sum(q["valid_rows"] for q in quality) if quality else None
    for k in [overall, *kpis]:
        if k["year"] == "all":
            k["source_trips"] = total_source
            k["source_valid"] = total_valid
        else:
            q = q_by_year.get(int(k["year"]))
            k["source_trips"] = q["total_rows"] if q else None
            k["source_valid"] = q["valid_rows"] if q else None

    meta = {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "dataset": "NYC TLC Yellow Taxi Trip Records",
        "source": "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
        "years": years,
        "samplePerYear": 500_000,
        "totalTripsSample": sum(k["trips"] for k in kpis),
        "totalTripsSource": sum(q["total_rows"] for q in quality) if quality else None,
        "zonesCount": sum(1 for k in zones if k < 264),  # 264/265 son "Unknown"/"N/A", sin polígono
        "paymentNames": PAYMENT_NAMES,
    }

    payload = {
        "meta": meta,
        "kpis": {"all": overall, **{str(k["year"]): k for k in kpis}},
        "monthly": monthly,
        "hourly": hourly,
        "zones": zones_year,
        "boroughs": boroughs,
        "payment": payment,
        "histFare": hist_fare,
        "histDistance": hist_distance,
        "boxplot": boxplot,
        "scatter": scatter,
        "routes": routes,
        "quality": quality,
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(OUT_JSON) / 1024
    print(f"OK  dashboard.json ({size_kb:.0f} KB)  anos={years}  viajes={meta['totalTripsSample']:,}")

    # ---------------------------------------------------------- base DuckDB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    db = duckdb.connect(DB_PATH)
    db.execute("SET threads = 8")
    db.execute(
        f"CREATE TABLE trips_sample AS SELECT * FROM read_parquet({parquet_list})"
    )
    db.execute(
        f"""
        CREATE TABLE zones AS
        SELECT CAST("LocationID" AS SMALLINT) AS zone_id, Borough AS borough,
               Zone AS zone, service_zone
        FROM read_csv('{ZONES_CSV.replace(os.sep, "/")}', header = true, all_varchar = true)
        """
    )
    if os.path.exists(QUALITY_JSON):
        db.execute(
            f"CREATE TABLE quality AS SELECT * FROM read_json_auto('{QUALITY_JSON.replace(os.sep, '/')}')"
        )
    db.close()
    print(f"OK  {DB_PATH} ({os.path.getsize(DB_PATH) / 1e6:.0f} MB)")


if __name__ == "__main__":
    main()
