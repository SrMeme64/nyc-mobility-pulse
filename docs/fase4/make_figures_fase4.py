"""
make_figures_fase4.py
---------------------
Genera las figuras SVG del informe de Fase 4 a partir de resultados.json.
Sin dependencias externas: solo la biblioteca estándar.

Uso:
    python docs/fase4/make_figures_fase4.py
"""

from __future__ import annotations

import json
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / "resultados.json").read_text(encoding="utf-8"))

INK = "#0B1424"
BODY = "#243244"
MUTED = "#5B6B80"
RULE = "#DCE3EE"
TEAL = "#0F7A6C"
AMBER = "#B7791F"
ROSE = "#B8324F"
BLUE = "#2563EB"
VIOLET = "#6D3BBF"
NAVY = "#0D1B2E"
YELLOW = "#D4A017"

DIM_COLOR = {
    "U": ROSE,
    "C": AMBER,
    "K": TEAL,
    "E": BLUE,
    "I": VIOLET,
    "G": NAVY,
}

FONT = "Segoe UI, Arial, sans-serif"


def svg(width: int, height: int, body: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img">\n'
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>\n'
        f"{body}\n</svg>\n"
    )


def text(x: float, y: float, value: str, size: float = 11, fill: str = BODY,
         weight: str = "400", anchor: str = "start", family: str = FONT) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" '
        f'fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">'
        f"{escape(value)}</text>"
    )


def line(x1: float, y1: float, x2: float, y2: float, color: str = RULE,
         width: float = 1, dash: str | None = None) -> str:
    extra = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
        f'stroke="{color}" stroke-width="{width}"{extra}/>'
    )


def rect(x: float, y: float, w: float, h: float, fill: str, rx: float = 3,
         opacity: float = 1) -> str:
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'rx="{rx}" fill="{fill}" opacity="{opacity}"/>'
    )


def dimensions_figure() -> str:
    width, height = 760, 300
    left, right, top, bottom = 120, 80, 36, 42
    plot_w = width - left - right
    plot_h = height - top - bottom
    xmin, xmax = 0.0, 5.0
    rows = list(DATA["dimensions"].values())
    step = plot_h / len(rows)
    bar_h = 18

    def x(value: float) -> float:
        return left + (value - xmin) / (xmax - xmin) * plot_w

    parts = []
    parts.append(text(left, 20, "Media por dimensión (escala 1–5, n = 7)", 12, INK, "700"))
    # grid + ticks
    for tick in range(0, 6):
        gx = x(tick)
        parts.append(line(gx, top, gx, top + plot_h, RULE if tick else "#9AA7B8", 1))
        parts.append(text(gx, top + plot_h + 16, str(tick), 9.5, MUTED, anchor="middle"))
    parts.append(text(left + plot_w / 2, height - 10, "Promedio de los ítems de cada dimensión",
                      9, MUTED, anchor="middle"))

    for i, dim in enumerate(rows):
        cy = top + step * i + step / 2
        value = dim["mean"]
        color = ROSE if value < 4.0 else (AMBER if value < 4.5 else TEAL)
        parts.append(text(left - 12, cy + 4, dim["label"], 11, BODY, "600", "end"))
        parts.append(rect(left, cy - bar_h / 2, max(2, x(value) - left), bar_h, color, 3))
        parts.append(text(x(value) + 8, cy + 4, f"{value:.2f}".replace(".", ","), 10.5,
                          INK, "700"))

    gx = x(DATA["global_index"])
    parts.append(line(gx, top - 8, gx, top + plot_h, INK, 1.2, "4 3"))
    parts.append(text(gx + 6, top - 12, f"Índice global {DATA['global_index']:.2f}".replace(".", ","),
                      9, INK, "700"))
    return svg(width, height, "\n".join(parts))


def tasks_figure() -> str:
    width, height = 760, 240
    left, right, top, bottom = 170, 36, 52, 40
    plot_w = width - left - right
    rows = [
        ("T1", "Punto más bajo"),
        ("T2", "Mes más activo de 2025"),
        ("T3", "Zona con más recogidas"),
        ("T4", "Pico de la semana"),
    ]
    n = DATA["accepted"]
    row_h = 34
    bar_h = 20

    def x(value: float) -> float:
        return left + value / n * plot_w

    parts = []
    parts.append(text(left, 20, "Resultado de las cuatro tareas verificables (n = 7)", 12, INK, "700"))
    # legend
    lx = left
    for label, color in (("Correcta", TEAL), ("Parcial", AMBER), ("Incorrecta / no encontrada", ROSE)):
        parts.append(rect(lx, 30, 10, 10, color, 2))
        parts.append(text(lx + 15, 39, label, 9.5, MUTED))
        lx += 12 + 8 * len(label) + 18

    for i, (task, label) in enumerate(rows):
        cy = top + i * row_h
        stats = DATA["tasks"][task]
        parts.append(text(left - 12, cy + bar_h / 2 + 4, task, 11, INK, "700", "end"))
        parts.append(text(left - 44, cy + bar_h / 2 + 4, label, 10.5, BODY, anchor="end"))
        start = 0
        for count, color in (
            (stats["correcta"], TEAL),
            (stats["parcial"], AMBER),
            (stats["incorrecta"], ROSE),
        ):
            if count:
                seg_w = x(start + count) - x(start)
                parts.append(rect(x(start), cy, max(2, seg_w - 1), bar_h, color, 3))
                if seg_w > 18:
                    parts.append(text(x(start) + seg_w / 2, cy + bar_h / 2 + 4, str(count),
                                      10, "#ffffff", "700", "middle"))
                start += count
        parts.append(text(left + plot_w + 8, cy + bar_h / 2 + 4, f"{stats['success']:.0f}%",
                          10, MUTED, "700"))

    parts.append(text(left, height - 16,
                      "El porcentaje a la derecha indica respuestas completamente correctas.",
                      9, MUTED))
    return svg(width, height, "\n".join(parts))


def items_figure() -> str:
    items = DATA["items"]
    order = [
        "U1", "U2", "U3", "U4", "U5",
        "C1", "C2", "C3", "C4", "C5",
        "K1", "K2", "K3", "K4",
        "E1", "E2", "E3", "E4",
        "I1", "I2", "I3",
        "G1", "G2", "G3", "G4",
    ]
    width = 760
    left, right, top, bottom = 58, 58, 86, 24
    row_h = 19
    height = top + row_h * len(order) + bottom
    plot_w = width - left - right

    def x(value: float) -> float:
        return left + (value - 1) / 4 * plot_w

    parts = []
    parts.append(text(left, 20, "Media de los 25 ítems Likert (1–5, n = 7)", 12, INK, "700"))
    # leyenda en dos filas para no chocar con la escala
    for i, (key, label) in enumerate(
        (("U", "Usabilidad"), ("C", "Comprensión"), ("K", "KPIs"),
         ("E", "Estética"), ("I", "Interactividad"), ("G", "Impacto"))
    ):
        lx = left + (i % 3) * 210
        ly = 32 + (i // 3) * 15
        parts.append(rect(lx, ly - 8, 8, 8, DIM_COLOR[key], 2))
        parts.append(text(lx + 12, ly, label, 8.8, MUTED))

    for tick in (1, 2, 3, 4, 5):
        gx = x(tick)
        parts.append(line(gx, top - 4, gx, top + row_h * len(order), RULE, 1))
        parts.append(text(gx, top - 9, str(tick), 9, MUTED, anchor="middle"))

    for i, code in enumerate(order):
        cy = top + i * row_h + row_h / 2
        item = items[code]
        color = DIM_COLOR[code[0]]
        parts.append(text(left - 12, cy + 3.5, code, 9.6, color, "700", "end"))
        parts.append(line(left, cy, x(item["mean"]), cy, color, 1.2, "2 2"))
        parts.append(f'<circle cx="{x(item["mean"]):.1f}" cy="{cy:.1f}" r="4.2" fill="{color}"/>')
        parts.append(text(width - 8, cy + 3.5, f"{item['mean']:.2f}".replace(".", ","),
                          9.2, INK, "600", "end"))

    # separators between dimensions
    for boundary in (5, 10, 14, 18, 21):
        gy = top + boundary * row_h
        parts.append(line(left, gy, left + plot_w, gy, "#EDF1F6", 1))
    return svg(width, height, "\n".join(parts))


def sus_figure() -> str:
    width, height = 760, 272
    left, right, top, bottom = 52, 34, 44, 40
    plot_h = height - top - bottom
    values = DATA["sus"]["values"]
    mean = DATA["sus"]["mean"]
    slot = (width - left - right) / len(values)
    bar_w = 46

    def y(value: float) -> float:
        return top + (100 - value) / 100 * plot_h

    parts = []
    parts.append(text(left, 20, "Puntuación SUS por participante (0–100)", 12, INK, "700"))
    for tick in (0, 25, 50, 75, 100):
        gy = y(tick)
        parts.append(line(left, gy, width - right, gy, RULE, 1))
        parts.append(text(left - 8, gy + 3.5, str(tick), 9, MUTED, anchor="end"))

    for i, value in enumerate(values):
        cx = left + slot * i + slot / 2
        color = TEAL if value >= 68 else (AMBER if value >= 52 else ROSE)
        parts.append(rect(cx - bar_w / 2, y(value), bar_w, top + plot_h - y(value), color, 3))
        parts.append(text(cx, y(value) - 6, f"{value:.1f}".replace(".", ","), 9.4, INK, "700",
                          "middle"))
        parts.append(text(cx, top + plot_h + 18, f"R{i + 1}", 9.6, BODY, "600", "middle"))

    # benchmark and mean
    gy = y(68)
    parts.append(line(left, gy, width - right, gy, INK, 1.1, "5 4"))
    parts.append(text(width - right, gy - 5, "Referencia SUS 68", 8.8, INK, "700", "end"))
    gy = y(mean)
    parts.append(line(left, gy, width - right, gy, "#8A6A00", 1.1, "2 3"))
    parts.append(text(left + 4, gy - 5, f"Media {mean:.1f}".replace(".", ","),
                      8.8, "#8A6A00", "700"))

    return svg(width, height, "\n".join(parts))


def main() -> None:
    figures = {
        "f4_dims.svg": dimensions_figure(),
        "f4_tasks.svg": tasks_figure(),
        "f4_items.svg": items_figure(),
        "f4_sus.svg": sus_figure(),
    }
    for name, content in figures.items():
        (HERE / name).write_text(content, encoding="utf-8")
    print("OK", ", ".join(figures))


if __name__ == "__main__":
    main()
