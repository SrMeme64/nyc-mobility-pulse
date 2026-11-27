"""
analisis_fase4.py
-----------------
Lee la exportación CSV de Google Forms, valida las respuestas y calcula los
estadísticos descriptivos de la Fase 4.

Uso:
    python docs/fase4/analisis_fase4.py

Salida:
    docs/fase4/resultados.json  (cifras usadas por el informe)
    docs/fase4/resultados.md    (resumen legible)
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CSV_PATH = ROOT / "docs" / "Evaluación de Dashboard · Movilidad TLC Nueva York.csv"
JSON_OUT = HERE / "resultados.json"
MD_OUT = HERE / "resultados.md"

# Columnas del formulario (0-based), verificadas contra la exportación.
COL = {
    "timestamp": 0,
    "consent": 1,
    "age": 2,
    "gender": 3,
    "education": 4,
    "field": 5,
    "occupation": 6,
    "semester": 7,
    "dashboard_exp": 8,
    "viz_freq": 9,
    "tlc": 10,
    "nyc": 11,
    "device": 12,
    "prior_eval": 13,
    "other": 14,
    "T1": 15,
    "T2": 16,
    "T3": 17,
    "T4": 18,
    "difficulty": 19,
    "time": 20,
    "U1": 21, "U2": 22, "U3": 23, "U4": 24, "U5": 25,
    "C1": 26, "C2": 27, "C3": 28, "C4": 29, "C5": 30,
    "K1": 31, "K2": 32, "K3": 33, "K4": 34,
    "E1": 35, "E2": 36, "E3": 37, "E4": 38,
    "I1": 39, "I2": 40, "I3": 41,
    "G1": 42, "G2": 43, "G3": 44, "G4": 45,
    "SUS1": 46, "SUS2": 47, "SUS3": 48, "SUS4": 49, "SUS5": 50,
    "SUS6": 51, "SUS7": 52, "SUS8": 53, "SUS9": 54, "SUS10": 55,
    "O1": 56, "O2": 57, "O3": 58, "O4": 59, "O5": 60, "O6": 61,
}

DIMENSIONS = {
    "U": ("Usabilidad", ["U1", "U2", "U3", "U4", "U5"]),
    "C": ("Comprensión", ["C1", "C2", "C3", "C4", "C5"]),
    "K": ("KPIs", ["K1", "K2", "K3", "K4"]),
    "E": ("Estética", ["E1", "E2", "E3", "E4"]),
    "I": ("Interactividad", ["I1", "I2", "I3"]),
    "G": ("Impacto", ["G1", "G2", "G3", "G4"]),
}

ITEM_TEXT = {
    "U1": "Encontré rápidamente la información que buscaba.",
    "U2": "Los filtros y botones son intuitivos.",
    "U3": "El recorrido de la página va de lo general a lo particular.",
    "U4": "No necesité ayuda externa para moverme por el tablero.",
    "U5": "En general, el tablero es fácil de usar.",
    "C1": "Los títulos de las secciones anuncian con claridad su contenido.",
    "C2": "Los ejes, leyendas y unidades se entienden sin explicación adicional.",
    "C3": "Entendí qué mide cada KPI sin consultar la metodología.",
    "C4": "El mapa y su escala de color se explican por sí mismos.",
    "C5": "Pude formular al menos una conclusión propia sobre la movilidad de Nueva York.",
    "K1": "Los KPIs responden a la pregunta «cuándo, dónde y a qué costo se mueve la ciudad».",
    "K2": "Identifiqué con facilidad el KPI más importante.",
    "K3": "Los indicadores son suficientes para describir el fenómeno.",
    "K4": "Los indicadores son distintos entre sí, sin redundancias evidentes.",
    "E1": "Los colores ayudan a interpretar los datos.",
    "E2": "La jerarquía visual indica qué mirar primero.",
    "E3": "La tipografía es legible en pantalla.",
    "E4": "Los tamaños y proporciones de los gráficos son adecuados.",
    "I1": "Los filtros actualizan los datos de forma correcta y visible.",
    "I2": "Los tooltips aportan información útil.",
    "I3": "La interacción del mapa (zoom, clic y selección) es comprensible.",
    "G1": "El tablero aporta información útil sobre la movilidad de Nueva York.",
    "G2": "Me permitiría argumentar una decisión o una recomendación.",
    "G3": "La información es confiable y está bien documentada.",
    "G4": "Recomendaría el tablero a alguien interesado en movilidad urbana.",
}

SUS_TEXT = {
    "SUS1": "Creo que me gustaría usar este tablero con frecuencia.",
    "SUS2": "Encontré el tablero innecesariamente complejo.",
    "SUS3": "Pensé que el tablero era fácil de usar.",
    "SUS4": "Creo que necesitaría apoyo técnico para poder usar este tablero.",
    "SUS5": "Encontré las distintas partes del tablero bien integradas.",
    "SUS6": "Pensé que había demasiada inconsistencia en el tablero.",
    "SUS7": "Imagino que la mayoría de la gente aprendería a usar el tablero muy rápido.",
    "SUS8": "Encontré el tablero muy difícil de usar.",
    "SUS9": "Me sentí muy seguro al usar el tablero.",
    "SUS10": "Necesité aprender muchas cosas antes de poder usar el tablero.",
}

OPEN_TEXT = {
    "O1": "¿Qué fue lo primero que miró al abrir el tablero y por qué?",
    "O2": "¿Qué parte le resultó confusa o difícil de entender?",
    "O3": "¿Qué KPI o gráfico le resultó más útil y por qué?",
    "O4": "¿Qué cambiaría del diseño, de los gráficos o de la navegación?",
    "O5": "¿Qué información le faltó para tomar una decisión?",
    "O6": "Comentarios adicionales.",
}


def norm(value: str) -> str:
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def check_task(task: str, raw: str) -> dict:
    t = norm(raw)
    if task == "T1":
        year = bool(re.search(r"\b2020\b", t))
        month = bool(re.search(r"\b(abril|abr)\b", t)) or bool(re.search(r"\b0?4\b", t))
        if year and month:
            return {"verdict": "correcta", "score": 1.0}
        if year or month:
            return {"verdict": "parcial", "score": 0.5}
        return {"verdict": "incorrecta", "score": 0.0}
    if task == "T2":
        month = bool(re.search(r"\b(octubre|oct)\b", t)) or bool(re.search(r"\b10\b", t))
        if month:
            return {"verdict": "correcta", "score": 1.0}
        return {"verdict": "incorrecta", "score": 0.0}
    if task == "T3":
        upper = bool(re.search(r"upper east", t))
        south = bool(re.search(r"\bsouth\b", t)) or bool(re.search(r"\bs\b", t))
        if upper and south:
            return {"verdict": "correcta", "score": 1.0}
        if upper:
            return {"verdict": "parcial", "score": 0.5}
        return {"verdict": "incorrecta", "score": 0.0}
    if task == "T4":
        day = bool(re.search(r"\b(miercoles|mie|mierc)\b", t))
        hour = (
            bool(re.search(r"\b18\b", t))
            or bool(re.search(r"18\s*00", t))
            or bool(re.search(r"6\s*pm", t))
            or bool(re.search(r"6\s*de\s*la\s*tarde", t))
            or bool(re.search(r"6\s*p\s*m", t))
        )
        if day and hour:
            return {"verdict": "correcta", "score": 1.0}
        if day or hour:
            return {"verdict": "parcial", "score": 0.5}
        return {"verdict": "incorrecta", "score": 0.0}
    raise ValueError(task)


def sus_score(row: dict) -> float:
    total = 0.0
    for i in range(1, 11):
        value = int(row[f"SUS{i}"])
        total += (value - 1) if i % 2 == 1 else (5 - value)
    return total * 2.5


def mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 3) if values else None


def median(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[mid])
    return round((ordered[mid - 1] + ordered[mid]) / 2, 3)


def distribution(rows: list[dict], key: str) -> list[dict]:
    counter = Counter(row[key] for row in rows)
    return [
        {"value": value, "n": n, "pct": round(100 * n / len(rows), 1)}
        for value, n in counter.most_common()
    ]


def main() -> None:
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        raw_rows = list(csv.reader(handle))
    header, body = raw_rows[0], raw_rows[1:]
    assert len(header) == 62, len(header)
    assert all(len(row) == 62 for row in body)

    records = []
    for raw in body:
        row = {key: raw[index] for key, index in COL.items()}
        row["accepted"] = row["consent"].strip().lower().startswith("sí")
        records.append(row)

    accepted = [row for row in records if row["accepted"]]
    declined = [row for row in records if not row["accepted"]]
    n = len(accepted)

    for row in accepted:
        row["tasks"] = {task: check_task(task, row[task]) for task in ("T1", "T2", "T3", "T4")}
        row["task_score"] = sum(item["score"] for item in row["tasks"].values())
        row["sus"] = sus_score(row)
        row["items"] = {key: int(row[key]) for key in ITEM_TEXT}

    task_stats = {}
    for task in ("T1", "T2", "T3", "T4"):
        counts = Counter(row["tasks"][task]["verdict"] for row in accepted)
        task_stats[task] = {
            "correcta": counts.get("correcta", 0),
            "parcial": counts.get("parcial", 0),
            "incorrecta": counts.get("incorrecta", 0),
            "success": round(100 * counts.get("correcta", 0) / n, 1),
            "score_mean": mean([row["tasks"][task]["score"] for row in accepted]),
            "answers": [row[task] for row in accepted],
        }

    all_correct = sum(1 for row in accepted if row["task_score"] == 4)
    none_correct = sum(1 for row in accepted if row["task_score"] == 0)

    item_stats = {}
    for key, text in ITEM_TEXT.items():
        values = [row["items"][key] for row in accepted]
        item_stats[key] = {
            "text": text,
            "mean": mean(values),
            "median": median(values),
            "sd": round(
                (sum((v - sum(values) / n) ** 2 for v in values) / n) ** 0.5, 3
            ),
            "agree": round(100 * sum(1 for v in values if v >= 4) / n, 1),
            "disagree": round(100 * sum(1 for v in values if v <= 2) / n, 1),
            "values": values,
            "distribution": dict(sorted(Counter(values).items())),
        }

    dim_stats = {}
    for key, (label, items) in DIMENSIONS.items():
        values = [row["items"][item] for row in accepted for item in items]
        dim_stats[key] = {
            "label": label,
            "items": items,
            "mean": mean(values),
            "median": median(values),
            "agree": round(100 * sum(1 for v in values if v >= 4) / len(values), 1),
            "disagree": round(100 * sum(1 for v in values if v <= 2) / len(values), 1),
            "item_means": {item: item_stats[item]["mean"] for item in items},
        }

    global_index = mean([dim["mean"] for dim in dim_stats.values()])

    sus_values = [row["sus"] for row in accepted]
    sus_stats = {
        "values": sus_values,
        "mean": mean(sus_values),
        "median": sorted(sus_values)[n // 2] if n % 2 else None,
        "min": min(sus_values),
        "max": max(sus_values),
        "sd": round(
            (sum((v - sum(sus_values) / n) ** 2 for v in sus_values) / n) ** 0.5, 2
        ),
        "bands": {
            "excelente": sum(1 for v in sus_values if v >= 85),
            "bueno": sum(1 for v in sus_values if 72 <= v < 85),
            "aceptable": sum(1 for v in sus_values if 52 <= v < 72),
            "pobre": sum(1 for v in sus_values if v < 52),
        },
    }

    # Sensibilidad: sin la respuesta con campos abiertos no informativos ("a").
    clean = [row for row in accepted if norm(row["O1"]) != "a"]
    clean_stats = {
        "n": len(clean),
        "global_index": mean(
            [
                mean(
                    [
                        mean([row["items"][item] for item in items])
                        for _, items in DIMENSIONS.values()
                    ]
                )
                for row in clean
            ]
        ),
        "sus_mean": mean([row["sus"] for row in clean]),
        "task_mean": mean([row["task_score"] for row in clean]),
    }
    # Nota: el índice limpio se calcula como media de las dimensiones de cada persona.

    open_answers = {key: [] for key in OPEN_TEXT}
    for i, row in enumerate(accepted, start=1):
        for key in OPEN_TEXT:
            text = row[key].strip()
            if text:
                open_answers[key].append({"respondent": f"R{i}", "text": text})

    respondents = []
    for i, row in enumerate(accepted, start=1):
        dimension_means = [
            mean([row["items"][item] for item in items])
            for _, items in DIMENSIONS.values()
        ]
        respondents.append(
            {
                "code": f"R{i}",
                "timestamp": row["timestamp"],
                "age": row["age"],
                "gender": row["gender"],
                "education": row["education"],
                "field": row["field"],
                "occupation": row["occupation"],
                "semester": row["semester"],
                "dashboard_exp": row["dashboard_exp"],
                "viz_freq": row["viz_freq"],
                "tlc": row["tlc"],
                "nyc": row["nyc"],
                "device": row["device"],
                "prior_eval": row["prior_eval"],
                "task_score": row["task_score"],
                "tasks": {task: row["tasks"][task]["verdict"] for task in ("T1", "T2", "T3", "T4")},
                "sus": row["sus"],
                "index": mean([value for value in dimension_means if value is not None]),
            }
        )

    result = {
        "source": CSV_PATH.name,
        "total_rows": len(records),
        "accepted": n,
        "declined": len(declined),
        "declined_timestamps": [row["timestamp"] for row in declined],
        "profile": {
            key: distribution(accepted, key)
            for key in (
                "age", "gender", "education", "field", "occupation", "semester",
                "dashboard_exp", "viz_freq", "tlc", "nyc", "device", "prior_eval",
            )
        },
        "other": [row["other"] for row in accepted if row["other"].strip()],
        "tasks": task_stats,
        "task_scores": [row["task_score"] for row in accepted],
        "task_score_mean": mean([row["task_score"] for row in accepted]),
        "task_pct": round(100 * sum(row["task_score"] for row in accepted) / (4 * n), 1),
        "all_correct": all_correct,
        "none_correct": none_correct,
        "difficulty": {
            "values": [int(row["difficulty"]) for row in accepted],
            "mean": mean([int(row["difficulty"]) for row in accepted]),
            "distribution": distribution(accepted, "difficulty"),
        },
        "time": distribution(accepted, "time"),
        "items": item_stats,
        "dimensions": dim_stats,
        "global_index": global_index,
        "sus": sus_stats,
        "clean_sensitivity": clean_stats,
        "open_answers": open_answers,
        "respondents": respondents,
        "timestamps": [row["timestamp"] for row in accepted],
    }

    JSON_OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Resultados Fase 4\n")
    lines.append(f"Respuestas totales: {len(records)} · aceptadas: {n} · rechazadas: {len(declined)}\n")
    lines.append(f"Índice global: {global_index} / 5 · SUS: {sus_stats['mean']} · tareas: {result['task_score_mean']} / 4 ({result['task_pct']}%)\n")
    lines.append("\n## Dimensiones\n")
    for dim in dim_stats.values():
        lines.append(
            f"- {dim['label']}: media {dim['mean']} · mediana {dim['median']} · "
            f"acuerdo {dim['agree']}%"
        )
    lines.append("\n## Ítems\n")
    for key, item in item_stats.items():
        lines.append(
            f"- {key}: media {item['mean']} · mediana {item['median']} · "
            f"acuerdo {item['agree']}% · {item['text']}"
        )
    lines.append("\n## Tareas\n")
    for key, task in task_stats.items():
        lines.append(
            f"- {key}: correctas {task['correcta']}, parciales {task['parcial']}, "
            f"incorrectas {task['incorrecta']} · acierto {task['success']}% · "
            f"media {task['score_mean']}"
        )
    lines.append(
        f"\nTodas correctas: {all_correct}/{n} · ninguna correcta: {none_correct}/{n}"
    )
    lines.append("\n## SUS por persona\n")
    lines.append(", ".join(str(v) for v in sus_values))
    lines.append(f"\nMediana SUS: {sus_stats['median']}")
    lines.append("\n## Sensibilidad (sin R1)\n")
    lines.append(json.dumps(clean_stats, ensure_ascii=False, indent=2))
    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"OK {JSON_OUT.relative_to(ROOT)} y {MD_OUT.relative_to(ROOT)}")
    print(f"n={n} indice={global_index} sus={sus_stats['mean']} tareas={result['task_score_mean']}")


if __name__ == "__main__":
    main()
