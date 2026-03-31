import pandas as pd
import ast
from chord_extractor import extract_chords

df = pd.read_csv("data/chords_and_lyrics.csv", low_memory=False)

def convert_to_dict(raw):
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {}
    try:
        return ast.literal_eval(raw)
    except:
        return {}

def flatten(raw):
    d = convert_to_dict(raw)
    if not isinstance(d, dict):
        return []
    text = " ".join(d.values())
    return extract_chords(text)

# SHOW FIRST 20 SONGS AND THEIR EXTRACTED CHORDS
for i in range(20):
    row = df.iloc[i]
    chords = flatten(row["chords"])
    print(f"{i} — {row['artist_name']} — {row['song_name']}")
    print("Extracted:", chords)
    print()
