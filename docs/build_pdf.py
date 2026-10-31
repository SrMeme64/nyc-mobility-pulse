"""
build_pdf.py
------------
Genera docs/justificacion.html a partir de la plantilla y de los resultados
reales del pipeline, y luego lo convierte a PDF con Microsoft Edge (headless).

Uso:
    python docs/build_pdf.py
"""

from __future__ import annotations

import html
import json
import os
import subprocess
import tempfile
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, "docs", "justificacion.template.html")
OUT_HTML = os.path.join(ROOT, "docs", "justificacion.html")
OUT_PDF = os.path.join(ROOT, "docs", "Justificacion_Fase1.pdf")
QUALITY = os.path.join(ROOT, "data", "quality_report.json")
DASHBOARD = os.path.join(ROOT, "public", "data", "dashboard.json")

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def n(value: float, digits: int = 0) -> str:
    return f"{value:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def pct(value: float, digits: int = 1) -> str:
    return f"{value:.{digits}f}".replace(".", ",") + "%"


def main() -> None:
    with open(QUALITY, encoding="utf-8") as fh:
        quality = json.load(fh)
    with open(DASHBOARD, encoding="utf-8") as fh:
        dash = json.load(fh)

    total_rows = sum(q["total_rows"] for q in quality)
    valid_rows = sum(q["valid_rows"] for q in quality)
    source_gb = sum(q["source_gb"] for q in quality)
    total_sample = sum(q["sample_rows"] for q in quality)
    years = [q["year"] for q in quality]
    years_txt = ", ".join(str(y) for y in years[:-1]) + " y " + str(years[-1])

    rows = "\n".join(
        f"<tr><td>{q['year']}</td><td class='num'>{n(q['source_gb'], 2)} GB</td>"
        f"<td class='num'>{n(q['total_rows'])}</td>"
        f"<td class='num'>{n(q['valid_rows'])} ({pct(q['valid_rows'] / q['total_rows'] * 100)})</td>"
        f"<td class='num'>{n(q['sample_rows'])}</td></tr>"
        for q in quality
    )

    # ------------------------------------------------------------- insights
    kpis = dash["kpis"]
    all_kpi = kpis["all"]
    qmap = {q["year"]: q for q in quality}

    zone_totals: dict[int, dict] = {}
    for z in dash["zones"]:
        acc = zone_totals.setdefault(z["zone_id"], {"zone": z["zone"], "borough": z["borough"], "pickups": 0})
        acc["pickups"] += z["pickups"]
    top_zone = max(zone_totals.values(), key=lambda z: z["pickups"])
    pickups_total = sum(z["pickups"] for z in zone_totals.values())

    hour_totals: dict[tuple[int, int], int] = defaultdict(int)
    for h in dash["hourly"]:
        hour_totals[(h["dow"], h["hour"])] += h["trips"]
    (peak_dow, peak_hour), peak_trips = max(hour_totals.items(), key=lambda kv: kv[1])
    days = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

    # El tamano de muestra es fijo por ano: la caida de 2020 se calcula con los
    # registros de la fuente, no con los viajes muestreados.
    t2019 = qmap.get(2019, {}).get("total_rows")
    t2020 = qmap.get(2020, {}).get("total_rows")
    covid = (t2020 / t2019 - 1) * 100 if t2019 and t2020 else None

    pay: dict[int, dict] = {}
    for p in dash["payment"]:
        acc = pay.setdefault(p["type"], {"name": p["name"], "trips": 0, "tip": 0.0})
        acc["trips"] += p["trips"]
        acc["tip"] += p["tip_pct"] * p["trips"]
    for acc in pay.values():
        acc["tip"] = acc["tip"] / max(1, acc["trips"])
    card = pay.get(1)
    cash = pay.get(2)

    box = {b["grp"]: b for b in dash["boxplot"] if str(b["year"]) == "all"}
    peak_box = box.get("Hora pico")
    valley_box = box.get("Valle")
    box_gap = (
        (peak_box["median"] / valley_box["median"] - 1) * 100
        if peak_box and valley_box and valley_box["median"]
        else None
    )

    borough_totals: dict[str, int] = defaultdict(int)
    for b in dash["boroughs"]:
        borough_totals[b["borough"]] += b["trips"]
    top_borough = max(borough_totals.items(), key=lambda kv: kv[1])

    insights = [
        f"<li><strong>La ciudad se concentra:</strong> {html.escape(top_zone['zone'])} "
        f"({html.escape(top_zone['borough'])}) origina el {pct(top_zone['pickups'] / pickups_total * 100)} "
        f"de los viajes de la muestra; {top_borough[0]} concentra el "
        f"{pct(top_borough[1] / sum(borough_totals.values()) * 100)} del total por borough.</li>",
        f"<li><strong>El pico semanal:</strong> la franja más activa es el "
        f"{days[peak_dow]} a las {peak_hour}:00, con {n(peak_trips)} viajes en la muestra histórica.</li>",
        f"<li><strong>Economía del viaje:</strong> la tarifa media es de "
        f"{'$' + n(all_kpi['avg_fare'], 2)} y la tarifa por milla de "
        f"{'$' + n(all_kpi['fare_per_mile'], 2)}. La velocidad media es de "
        f"{n(all_kpi['avg_speed'], 1)} mph.</li>",
        f"<li><strong>Propina y canal de pago:</strong> la propina declarada promedia "
        f"{pct(all_kpi['tip_pct'])}; en tarjeta es {pct(card['tip']) if card else 's/d'} "
        f"frente a {pct(cash['tip']) if cash else 's/d'} en efectivo, lo que confirma "
        f"el sesgo de registro del efectivo.</li>",
        f"<li><strong>Congestión:</strong> la mediana de duración en hora pico es "
        f"{n(peak_box['median'], 1)} min frente a {n(valley_box['median'], 1)} min en valle"
        f"{f', un {pct(abs(box_gap))} ' + ('más' if box_gap >= 0 else 'menos') if box_gap is not None else ''}. "
        f"El boxplot muestra si el efecto se distribuye en toda la población o solo en la cola.</li>",
    ]
    if covid is not None:
        insights.append(
            f"<li><strong>El shock de 2020:</strong> los registros de la fuente cayeron "
            f"{pct(abs(covid))} respecto a 2019 (de {n(t2019)} a {n(t2020)} viajes). "
            f"La serie mensual permite ubicar el inicio del desplome y la velocidad de "
            f"recuperación posterior.</li>"
        )

    # -------------------------------------------------------------- replace
    replacements = {
        "{{FECHA}}": date.today().strftime("%d/%m/%Y"),
        "{{SOURCE_GB}}": n(source_gb, 1),
        "{{YEARS}}": years_txt,
        "{{TOTAL_ROWS}}": n(total_rows),
        "{{VALID_ROWS}}": n(valid_rows),
        "{{VALID_PCT}}": pct(valid_rows / total_rows * 100),
        "{{TOTAL_SAMPLE}}": n(total_sample),
        "{{QUALITY_ROWS}}": rows,
        "{{INSIGHTS}}": "\n".join(insights),
    }

    with open(TEMPLATE, encoding="utf-8") as fh:
        doc = fh.read()
    for key, value in replacements.items():
        doc = doc.replace(key, value)
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(doc)

    # ------------------------------------------------------------------ pdf
    edge = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
    if not edge:
        print("HTML generado. No se encontro Edge/Chrome para generar el PDF.")
        return

    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                edge,
                "--headless=new",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--user-data-dir={profile}",
                f"--print-to-pdf={OUT_PDF}",
                Path(OUT_HTML).as_uri(),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print(f"OK  {OUT_PDF} ({os.path.getsize(OUT_PDF) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
