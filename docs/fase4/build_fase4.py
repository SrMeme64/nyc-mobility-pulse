"""
build_fase4.py
-------------
Convierte docs/fase4/report.html en docs/Fase4_Evaluacion_Dashboard.pdf con
Edge headless y estampa pie de pagina y numeracion con PyMuPDF.

Uso:
    python docs/fase4/build_fase4.py
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT_PDF = ROOT / "docs" / "Fase4_Evaluacion_Dashboard.pdf"

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]
EDGE = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)


def main() -> None:
    if not EDGE:
        raise SystemExit("No se encontro Edge/Chrome para renderizar el PDF.")

    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                EDGE,
                "--headless=new",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--user-data-dir={profile}",
                f"--print-to-pdf={OUT_PDF}",
                (HERE / "report.html").as_uri(),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    doc = pymupdf.open(OUT_PDF)
    total = doc.page_count
    for i, page in enumerate(doc):
        if i == 0:
            continue
        w, h = page.rect.width, page.rect.height
        y = h - 22
        page.draw_line(
            pymupdf.Point(42, y - 8),
            pymupdf.Point(w - 42, y - 8),
            color=(0.86, 0.89, 0.93),
            width=0.5,
        )
        page.insert_text(
            pymupdf.Point(42, y + 2),
            "NYC Mobility Pulse · Fase 4 · Evaluación y validación",
            fontsize=6.8,
            fontname="helv",
            color=(0.36, 0.42, 0.50),
        )
        label = f"{i + 1} / {total}"
        label_w = pymupdf.get_text_length(label, fontname="helv", fontsize=6.8)
        page.insert_text(
            pymupdf.Point(w - 42 - label_w, y + 2),
            label,
            fontsize=6.8,
            fontname="helv",
            color=(0.36, 0.42, 0.50),
        )

    doc.set_metadata(
        {
            "title": "NYC Mobility Pulse · Fase 4 · Evaluación y validación",
            "author": "Mobility Pulse · Javier Rodríguez Rodríguez · Diego Alonso López Ballesta",
            "subject": "Evaluación de usabilidad, comprensión, KPIs, estética, interactividad e impacto",
            "keywords": "evaluación, usabilidad, SUS, dashboard, movilidad, NYC, KPI",
        }
    )
    tmp = OUT_PDF.with_suffix(".tmp.pdf")
    doc.save(tmp, garbage=4, deflate=True)
    doc.close()
    tmp.replace(OUT_PDF)

    print(f"OK  {OUT_PDF} ({OUT_PDF.stat().st_size / 1024:.0f} KB, {total} paginas)")


if __name__ == "__main__":
    main()
