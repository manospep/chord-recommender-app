"""
Pre-process the full CSV into a lean dataset for Railway.

Output: data/chords_processed.csv  (~15-25 MB)
Columns: artist_name, song_name, genre, chord_list (pipe-separated)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

import re
import ast
import pandas as pd
from chord_extractor import extract_chords

GENRE_RULES = [
    ("Metal",       lambda g: "metal" in g),
    ("Rock",        lambda g: "rock" in g or "punk" in g),
    ("Pop",         lambda g: "pop" in g),
    ("Hip Hop",     lambda g: "hip hop" in g or " rap" in g),
    ("R&B / Soul",  lambda g: "r&b" in g or "soul" in g or "rhythm and blues" in g),
    ("Country",     lambda g: "country" in g),
    ("Jazz",        lambda g: "jazz" in g),
    ("Blues",       lambda g: "blues" in g),
    ("Electronic",  lambda g: any(x in g for x in ["electronic", "edm", "techno", "house", "trance"])),
    ("Folk",        lambda g: "folk" in g or "acoustic" in g),
    ("Classical",   lambda g: "classical" in g),
    ("Reggae",      lambda g: "reggae" in g),
    ("Latin",       lambda g: "latin" in g or "bossa" in g or "samba" in g),
]

def broad_genre(raw):
    if not isinstance(raw, str): return "Other"
    try: genres = ast.literal_eval(raw)
    except: return "Other"
    combined = " ".join(genres).lower()
    for name, rule in GENRE_RULES:
        if rule(combined): return name
    return "Other"

CSV_IN  = os.path.join(os.path.dirname(__file__), '..', 'data', 'chords_and_lyrics.csv')
CSV_OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'chords_processed.csv')

print("Reading CSV…")
df = pd.read_csv(CSV_IN, usecols=['artist_name', 'song_name', 'genres', 'chords', 'lyrics', 'chords&lyrics'], low_memory=False)
print(f"  {len(df)} rows loaded")

def convert_to_dict(raw):
    if isinstance(raw, dict): return raw
    if not isinstance(raw, str): return {}
    try: return ast.literal_eval(raw.strip())
    except: return {}

def flatten_chords(chord_obj):
    d = convert_to_dict(chord_obj)
    if not isinstance(d, dict): return []
    return extract_chords(" ".join(d.values()))

def dict_size(raw):
    d = convert_to_dict(raw)
    return len(d) if isinstance(d, dict) else 0

print("Extracting chords…")
df['_dict_size'] = df['chords'].apply(dict_size)
df['chord_list'] = df['chords'].apply(flatten_chords)

CHORD_RE = re.compile(
    r'\b([A-G](?:#|b)?(?:maj7|maj|min7|min|m7|m|dim7|dim|aug|sus2|sus4|sus|add9|add11|add13|add|6|7|9|11|13|5)?)(?![#\w])'
)

def has_chord_lines(text):
    if not isinstance(text, str): return False
    for line in text.split('\n'):
        trimmed = line.strip()
        if not trimmed: continue
        chords = CHORD_RE.findall(trimmed)
        if not chords: continue
        chord_chars = sum(len(c) for c in chords)
        non_space = len(trimmed.replace(' ', ''))
        if non_space > 0 and chord_chars / non_space > 0.5:
            return True
    return False

print("Filtering…")
before = len(df)
df = df[(df['_dict_size'] >= 3) & (df['chord_list'].apply(len) >= 2)].copy()
df = df[df['chords&lyrics'].apply(has_chord_lines)].copy()
print(f"  Kept {len(df)} / {before} songs")

print("Computing genres…")
df['genre'] = df['genres'].apply(broad_genre)

# Serialise chord_list as pipe-separated string
df['chord_list'] = df['chord_list'].apply(lambda c: '|'.join(c))

out = df[['artist_name', 'song_name', 'genre', 'chord_list', 'chords&lyrics']].copy()
out['artist_name'] = out['artist_name'].fillna('').astype(str)
out['song_name']   = out['song_name'].fillna('').astype(str)
out['chords&lyrics'] = out['chords&lyrics'].fillna('').astype(str).str[:1000]

print(f"Saving to {CSV_OUT}…")
out.to_csv(CSV_OUT, index=True, index_label='song_id')
size = os.path.getsize(CSV_OUT) / 1e6
print(f"Done. {len(out)} songs, {size:.1f} MB")
