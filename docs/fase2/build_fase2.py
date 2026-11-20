"""
build_fase2.py
--------------
Genera las figuras del reporte de Fase 2 (wireframes, recortes y esquema de
reticula) y convierte docs/fase2/report.html en docs/Fase2_Estructura_Visual.pdf
usando Edge headless. Despues estampa pie de pagina y numeracion con PyMuPDF.

Uso:
    python docs/fase2/build_fase2.py
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import pymupdf
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT_PDF = ROOT / "docs" / "Fase2_Estructura_Visual.pdf"

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

EDGE = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
BG = (7, 11, 20)


def shot(name: str, url: str, width: int, height: int) -> Path:
    out = HERE / f"_{name}.png"
    profile = Path(tempfile.gettempdir()) / f"edge-fase2-{name}"
    profile.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            EDGE,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--window-size={width},{height}",
            "--virtual-time-budget=9000",
            f"--user-data-dir={profile}",
            f"--screenshot={out}",
            url,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out


def content_bottom(img: Image.Image, bg: tuple[int, int, int], step: int = 2, tol: int = 12) -> int:
    w, h = img.size
    px = img.load()
    for y in range(h - 1, 0, -step):
        if any(
            abs(px[x, y][0] - bg[0]) + abs(px[x, y][1] - bg[1]) + abs(px[x, y][2] - bg[2]) > tol
            for x in range(0, w, 7)
        ):
            return y
    return h - 1


def main() -> None:
    if not EDGE:
        raise SystemExit("No se encontro Edge/Chrome para renderizar las figuras.")

    # --- escritorio ------------------------------------------------------
    desk = shot("wfdesk", (HERE / "wireframe-desktop.html").as_uri(), 1440, 3200)
    im = Image.open(desk).convert("RGB")
    im = im.crop((0, 0, 1440, content_bottom(im, BG) + 46))
    im.save(HERE / "wireframe-desktop.png")

    # Recortes para el reporte (en los espacios entre tarjetas).
    im.crop((0, 0, 1440, 1005)).save(HERE / "report-desk-1.png")
    im.crop((0, 1005, 1440, 2069)).save(HERE / "report-desk-2.png")
    im.crop((0, 2069, 1440, im.height)).save(HERE / "report-desk-3.png")
    im.crop((40, 392, 1400, 676)).save(HERE / "report-kpi.png")
    im.crop((40, 1311, 1400, 1768)).save(HERE / "report-map.png")

    # --- movil -----------------------------------------------------------
    mob = shot("wfmob", (HERE / "mobile-frame.html").as_uri(), 500, 3400)
    im = Image.open(mob).convert("RGB").crop((0, 0, 390, 3400))
    im = im.crop((0, 0, 390, content_bottom(im, BG) + 30))
    im.save(HERE / "wireframe-mobile.png")

    # Tres pantallas continuas, cortadas en los espacios entre tarjetas.
    im.crop((0, 0, 390, 1012)).save(HERE / "report-mobile-1.png")
    im.crop((0, 1012, 390, 2123)).save(HERE / "report-mobile-2.png")
    im.crop((0, 2123, 390, im.height)).save(HERE / "report-mobile-3.png")

    # --- reticula --------------------------------------------------------
    grid = shot("grid", (HERE / "grid-schematic.html").as_uri(), 1240, 1100)
    im = Image.open(grid).convert("RGB")
    im.crop((0, 0, 1240, content_bottom(im, BG) + 30)).save(HERE / "grid-schematic.png")

    # Los PNG completos de captura no se conservan.
    for tmp in (desk, mob, grid):
        tmp.unlink(missing_ok=True)

    # --- pdf -------------------------------------------------------------
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

    # --- pie de pagina y metadatos --------------------------------------
    doc = pymupdf.open(OUT_PDF)
    total = doc.page_count
    for i, page in enumerate(doc):
        if i == 0:
            continue
        w, h = page.rect.width, page.rect.height
        y = h - 22
        page.draw_line(pymupdf.Point(42, y - 8), pymupdf.Point(w - 42, y - 8),
                       color=(0.86, 0.89, 0.93), width=0.5)
        page.insert_text(pymupdf.Point(42, y + 2), "NYC Mobility Pulse · Fase 2 · Estructura visual",
                         fontsize=6.8, fontname="helv", color=(0.36, 0.42, 0.50))
        label = f"{i + 1} / {total}"
        label_w = pymupdf.get_text_length(label, fontname="helv", fontsize=6.8)
        page.insert_text(pymupdf.Point(w - 42 - label_w, y + 2), label,
                         fontsize=6.8, fontname="helv", color=(0.36, 0.42, 0.50))
    doc.set_metadata({
        "title": "NYC Mobility Pulse · Fase 2 · Estructura visual",
        "author": "Mobility Pulse · Javier Rodríguez Rodríguez · Diego Alonso López Ballesta",
        "subject": "KPIs, gráficos, paleta y wireframes del dashboard de movilidad urbana",
        "keywords": "NYC, taxi, movilidad, visualización de datos, KPI, wireframe",
    })
    tmp_pdf = OUT_PDF.with_suffix(".tmp.pdf")
    doc.save(tmp_pdf, garbage=4, deflate=True)
    doc.close()
    tmp_pdf.replace(OUT_PDF)

    print(f"OK  {OUT_PDF} ({OUT_PDF.stat().st_size / 1024:.0f} KB, {total} paginas)")


if __name__ == "__main__":
    main()
