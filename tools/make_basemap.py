"""
Build boston_map.png: a map image whose edges are exactly the bounding box
of the stations in data/march2017_bluebikes_trip_counts.csv.

This is a reproducible stand-in for the bboxfinder.com screenshot step:
it stitches OpenStreetMap standard tiles and crops
them to (minX, minY, maxX, maxY) = (min lon, min lat, max lon, max lat).

Usage (needs Pillow):  python tools/make_basemap.py
"""
import csv
import io
import math
import os
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, "data", "march2017_bluebikes_trip_counts.csv")
OUT = os.path.join(ROOT, "boston_map.png")
ZOOM = 13
TILE = 256
URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"


def lonlat_to_px(lon, lat, z):
    """Web Mercator: lon/lat -> global pixel coordinates at zoom z."""
    n = TILE * 2 ** z
    x = (lon + 180.0) / 360.0 * n
    lat_r = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_r) + 1.0 / math.cos(lat_r)) / math.pi) / 2.0 * n
    return x, y


def main():
    with open(CSV, newline="") as f:
        rows = list(csv.DictReader(f))
    lons = [float(r["Longitude"]) for r in rows]
    lats = [float(r["Latitude"]) for r in rows]
    min_x, max_x, min_y, max_y = min(lons), max(lons), min(lats), max(lats)
    print("bbox (minX, minY, maxX, maxY):", min_x, min_y, max_x, max_y)

    # Upper-left = (min lon, max lat), lower-right = (max lon, min lat)
    x0, y0 = lonlat_to_px(min_x, max_y, ZOOM)
    x1, y1 = lonlat_to_px(max_x, min_y, ZOOM)
    tx0, ty0 = int(x0 // TILE), int(y0 // TILE)
    tx1, ty1 = int(x1 // TILE), int(y1 // TILE)

    mosaic = Image.new("RGB", ((tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            req = urllib.request.Request(
                URL.format(z=ZOOM, x=tx, y=ty),
                headers={"User-Agent": "COSI116A-bluebikes-assignment/1.0"},
            )
            with urllib.request.urlopen(req) as resp:
                tile = Image.open(io.BytesIO(resp.read())).convert("RGB")
            mosaic.paste(tile, ((tx - tx0) * TILE, (ty - ty0) * TILE))

    left, top = round(x0 - tx0 * TILE), round(y0 - ty0 * TILE)
    right, bottom = round(x1 - tx0 * TILE), round(y1 - ty0 * TILE)
    img = mosaic.crop((left, top, right, bottom))
    img.save(OUT)
    print("saved", OUT, "size (width x height):", img.size)


if __name__ == "__main__":
    main()
