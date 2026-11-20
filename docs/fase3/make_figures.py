"""
make_figures.py
---------------
Captura el dashboard real (1440 px y 390 px, estados Todos y 2025) y recorta
las figuras que consume docs/fase3/report.html.

Uso:
    python docs/fase3/make_figures.py
"""

from __future__ import annotations

import os
import subprocess
import tempfile
import time
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DIST = ROOT / "dist"

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]
EDGE = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
BG = (7, 11, 20)


def write_wrappers() -> None:
    """Páginas same-origin que cargan la app en un iframe y pulsan un año.

    Permiten capturar un estado concreto (p. ej. 2025) sin tocar el código de
    la aplicación y sin depender de herramientas de automatización externas.
    """
    for name, width, height in (
        ("__capture.html", 1440, 10000),
        ("__capture390.html", 390, 20000),
    ):
        (DIST / name).write_text(
            f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{{margin:0;padding:0;background:#070b14;overflow:hidden}}
iframe{{display:block;border:0;width:{width}px;height:{height}px}}
</style></head><body>
<iframe id="app" src="./index.html"></iframe>
<script>
const frame=document.getElementById('app');
const target=new URLSearchParams(location.search).get('y')||'2025';
frame.addEventListener('load',()=>{{
  const started=Date.now();
  const timer=setInterval(()=>{{
    let doc; try{{doc=frame.contentDocument}}catch(e){{return}}
    if(!doc) return;
    const btn=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()===target);
    if(btn){{btn.click();clearInterval(timer)}}
    else if(Date.now()-started>12000){{clearInterval(timer)}}
  }},120);
}});
</script></body></html>
""",
            encoding="utf-8",
        )


def shot(url: str, out: Path, width: int, height: int, tag: str) -> None:
    profile = Path(tempfile.gettempdir()) / f"edge-fase3-{tag}"
    profile.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            EDGE,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--force-prefers-reduced-motion",
            f"--window-size={width},{height}",
            "--virtual-time-budget=25000",
            f"--user-data-dir={profile}",
            f"--screenshot={out}",
            url,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Edge termina el proceso antes de volcar el PNG: esperamos a que exista.
    deadline = time.time() + 20
    last = -1
    while time.time() < deadline:
        if out.exists() and out.stat().st_size > 1000:
            size = out.stat().st_size
            if size == last:
                return
            last = size
        time.sleep(0.4)
    raise RuntimeError(f"No se generó {out}")


def trim(img: Image.Image, tol: int = 18) -> Image.Image:
    w, h = img.size
    px = img.load()
    for y in range(h - 1, 0, -1):
        for x in range(0, w, 5):
            c = px[x, y]
            if abs(c[0] - BG[0]) + abs(c[1] - BG[1]) + abs(c[2] - BG[2]) > tol:
                return img.crop((0, 0, w, min(h, y + 36)))
    return img


def stack(paths: list[Path], out: Path) -> None:
    ims = [Image.open(p).convert("RGB") for p in paths]
    w = max(i.width for i in ims)
    total = sum(i.height for i in ims)
    canvas = Image.new("RGB", (w, total), BG)
    y = 0
    for im in ims:
        canvas.paste(im, (0, y))
        y += im.height
    canvas.save(out)


def main() -> None:
    if not EDGE:
        raise SystemExit("No se encontró Edge/Chrome.")
    write_wrappers()

    # --- capturas completas ------------------------------------------------
    full_all = HERE / "_full.png"
    full_2025 = HERE / "_full2025.png"
    shot("http://localhost:4173/", full_all, 1440, 10000, "all")
    shot("http://localhost:4173/__capture.html?y=2025", full_2025, 1440, 10000, "2025")
    trim(Image.open(full_all).convert("RGB")).save(full_all)
    trim(Image.open(full_2025).convert("RGB")).save(full_2025)

    mob_all = HERE / "_mob_all.png"
    mob_2025 = HERE / "_mob_2025.png"
    shot("http://localhost:4173/__capture390.html?y=Todos", mob_all, 390, 16000, "moball")
    shot("http://localhost:4173/__capture390.html?y=2025", mob_2025, 390, 16000, "mob2025")
    trim(Image.open(mob_all).convert("RGB")).save(mob_all)
    trim(Image.open(mob_2025).convert("RGB")).save(mob_2025)

    # --- recortes del dashboard (estado 2025, comparable con Fase 2) ------
    d = Image.open(full_2025).convert("RGB")
    w, h = d.size
    cuts = {
        "d_top": (0, 0, w, 870),
        "d_demand": (0, 1290, w, 2010),
        "d_heat": (0, 2000, w, 2355),
        "d_geo": (0, 2400, w, 3275),
        "d_eco": (0, 3270, w, 3830),
        "d_eff": (0, 3880, w, 4520),
        "d_routes": (0, 4560, w, 5330),
        "d_method": (0, 5420, w, 6320),
        "d_footer": (0, 6320, w, h),
    }
    for name, box in cuts.items():
        d.crop(box).save(HERE / f"{name}.png")

    # Composiciones que usa el informe: demanda+heatmap y economía+eficiencia.
    stack([HERE / "d_demand.png", HERE / "d_heat.png"], HERE / "d_demand_heat.png")
    stack([HERE / "d_eco.png", HERE / "d_eff.png"], HERE / "d_charts.png")

    # --- recortes del wireframe (Fase 2) -----------------------------------
    r1 = Image.open(ROOT / "docs/fase2/report-desk-1.png").convert("RGB")
    r2 = Image.open(ROOT / "docs/fase2/report-desk-2.png").convert("RGB")
    r3 = Image.open(ROOT / "docs/fase2/report-desk-3.png").convert("RGB")
    r1.crop((0, 0, 1440, 676)).save(HERE / "w_top.png")
    r1.crop((0, 660, 1440, 1005)).save(HERE / "_w_demand_a.png")
    r2.crop((0, 0, 1440, 320)).save(HERE / "_w_demand_b.png")
    stack([HERE / "_w_demand_a.png", HERE / "_w_demand_b.png"], HERE / "w_demand.png")
    r2.crop((0, 320, 1440, 760)).save(HERE / "w_geo.png")
    r2.crop((0, 755, 1440, 1064)).save(HERE / "w_eco.png")
    r3.crop((0, 0, 1440, 315)).save(HERE / "w_eff.png")
    r3.crop((0, 310, 1440, 600)).save(HERE / "w_routes.png")
    r3.crop((0, 595, 1440, 791)).save(HERE / "w_method.png")

    # --- móvil -------------------------------------------------------------
    m = Image.open(mob_2025).convert("RGB")
    m.crop((0, 0, 390, 1150)).save(HERE / "m_top.png")
    m.crop((0, 2380, 390, 3420)).save(HERE / "m_demand.png")

    # --- limpieza ----------------------------------------------------------
    for tmp in ("_w_demand_a.png", "_w_demand_b.png", "d_demand.png", "d_heat.png", "d_footer.png"):
        (HERE / tmp).unlink(missing_ok=True)
    for tmp in ("__capture.html", "__capture390.html"):
        (DIST / tmp).unlink(missing_ok=True)

    print("Figuras generadas en", HERE)


if __name__ == "__main__":
    main()
