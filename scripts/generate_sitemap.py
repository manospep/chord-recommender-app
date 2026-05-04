"""
Generates public/sitemap.xml from chords_processed.csv.
Run from repo root: python scripts/generate_sitemap.py
"""
import csv
import math
import os
from datetime import date

BASE_URL   = "https://chord-recommender-app.vercel.app"
DATA_PATH  = "data/chords_processed.csv"
OUT_DIR    = "client/public"
CHUNK_SIZE = 45_000  # Google limit is 50k per file

today = date.today().isoformat()

song_ids = []
with open(DATA_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sid = row.get("song_id", "").strip()
        if sid:
            song_ids.append(sid)

print(f"Loaded {len(song_ids)} song IDs")

num_chunks = math.ceil(len(song_ids) / CHUNK_SIZE)
sitemap_files = []

for i in range(num_chunks):
    chunk = song_ids[i * CHUNK_SIZE:(i + 1) * CHUNK_SIZE]
    filename = f"sitemap-songs-{i + 1}.xml" if num_chunks > 1 else "sitemap-songs.xml"
    sitemap_files.append(filename)
    path = os.path.join(OUT_DIR, filename)

    urls = "\n".join(
        f"  <url><loc>{BASE_URL}/song/{sid}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq></url>"
        for sid in chunk
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"Wrote {path} ({len(chunk)} URLs)")

# Sitemap index + homepage
index_entries = "\n".join(
    f"  <sitemap><loc>{BASE_URL}/{fn}</loc><lastmod>{today}</lastmod></sitemap>"
    for fn in sitemap_files
)
index_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>{BASE_URL}/sitemap-static.xml</loc><lastmod>{today}</lastmod></sitemap>
{index_entries}
</sitemapindex>"""
with open(os.path.join(OUT_DIR, "sitemap.xml"), "w", encoding="utf-8") as f:
    f.write(index_xml)
print("Wrote client/public/sitemap.xml (index)")

# Static pages sitemap
static_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{BASE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>{BASE_URL}/auth</loc><changefreq>monthly</changefreq></url>
</urlset>"""
with open(os.path.join(OUT_DIR, "sitemap-static.xml"), "w", encoding="utf-8") as f:
    f.write(static_xml)
print("Wrote client/public/sitemap-static.xml")
