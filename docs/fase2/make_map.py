"""Genera un SVG coropletico de las 263 zonas TLC con la demanda de 2025."""

import json
import math

GEO = r"public/data/taxi_zones.geojson"
DASH = r"public/data/dashboard.json"
OUT = r"docs/fase2/nyc-zones-map.svg"

g = json.load(open(GEO, encoding="utf-8"))
d = json.load(open(DASH, encoding="utf-8"))

pickups = {r["zone_id"]: r["pickups"] for r in d["zones"] if r["year"] == 2025}
maxp = max(pickups.values())

LON0, LON1 = -74.25554269163935, -73.70002020501624
LAT0, LAT1 = 40.49613398761196, 40.915532777002774
LAT_MID = (LAT0 + LAT1) / 2
KX = math.cos(math.radians(LAT_MID))

W, H = 1000, 960
PAD = 18
span_x = (LON1 - LON0) * KX
span_y = LAT1 - LAT0
scale = min((W - 2 * PAD) / span_x, (H - 2 * PAD) / span_y)
off_x = (W - span_x * scale) / 2
off_y = (H - span_y * scale) / 2


def project(lon, lat):
    x = off_x + (lon - LON0) * KX * scale
    y = off_y + (LAT1 - lat) * scale
    return x, y


def ramp(t):
    stops = [
        (0.00, (30, 46, 74)),
        (0.06, (38, 55, 84)),
        (0.18, (66, 58, 32)),
        (0.40, (122, 92, 12)),
        (0.68, (196, 152, 20)),
        (0.86, (232, 188, 44)),
        (1.00, (255, 210, 63)),
    ]
    t = max(0.0, min(1.0, t))
    for i in range(len(stops) - 1):
        a, ca = stops[i]
        b, cb = stops[i + 1]
        if a <= t <= b:
            f = (t - a) / (b - a) if b > a else 0
            return tuple(round(ca[k] + (cb[k] - ca[k]) * f) for k in range(3))
    return stops[-1][1]


def path_for(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    parts = []
    for poly in polys:
        for ring in poly:
            pts = [project(x, y) for x, y in ring]
            if len(pts) < 3:
                continue
            d = "M" + "L".join("%.1f %.1f" % p for p in pts) + "Z"
            parts.append(d)
    return "".join(parts)


paths = []
for ft in g["features"]:
    zid = ft["properties"]["zoneId"]
    p = pickups.get(zid, 0)
    t = (p / maxp) ** 0.72 if p > 0 else 0
    fill = "#101A2C" if p == 0 else "#%02X%02X%02X" % ramp(t)
    d = path_for(ft["geometry"])
    if not d:
        continue
    paths.append(
        '<path d="%s" fill="%s" stroke="#2C3E60" stroke-width="0.75" stroke-linejoin="round">'
        "<title>%s · %s · %s viajes</title></path>"
        % (d, fill, ft["properties"]["zone"].replace("&", "&amp;"), ft["properties"]["borough"], f"{p:,}")
    )

svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" '
    'aria-label="Mapa coropletico de recogidas por zona TLC en 2025">\n'
    '<rect width="%d" height="%d" fill="none"/>\n%s\n</svg>\n'
) % (W, H, W, H, "\n".join(paths))

open(OUT, "w", encoding="utf-8").write(svg)
print("OK", OUT, len(svg) // 1024, "KB", "max", maxp)
