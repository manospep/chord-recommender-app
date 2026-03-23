"""
Pre-process the full CSV into a lean dataset for Railway.

Output: data/chords_processed.csv  (~15-25 MB)
Columns: artist_name, song_name, genre, chord_list (pipe-separated)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

import ast
import pandas as pd
from chord_extractor import extract_chords
from recommender import broad_genre

CSV_IN  = os.path.join(os.path.dirname(__file__), '..', 'data', 'chords_and_lyrics.csv')
CSV_OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'chords_processed.csv')

print("Reading CSV…")
df = pd.read_csv(CSV_IN, usecols=['artist_name', 'song_name', 'genres', 'chords'], low_memory=False)
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

print("Filtering…")
before = len(df)
df = df[(df['_dict_size'] >= 3) & (df['chord_list'].apply(len) >= 2)].copy()
print(f"  Kept {len(df)} / {before} songs")

print("Computing genres…")
df['genre'] = df['genres'].apply(broad_genre)

# Serialise chord_list as pipe-separated string
df['chord_list'] = df['chord_list'].apply(lambda c: '|'.join(c))

out = df[['artist_name', 'song_name', 'genre', 'chord_list']].copy()
out['artist_name'] = out['artist_name'].fillna('').astype(str)
out['song_name']   = out['song_name'].fillna('').astype(str)

print(f"Saving to {CSV_OUT}…")
out.to_csv(CSV_OUT, index=True, index_label='song_id')
size = os.path.getsize(CSV_OUT) / 1e6
print(f"Done. {len(out)} songs, {size:.1f} MB")
