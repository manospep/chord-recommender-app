"""
convert_ug_dataset.py — Convert the "Lyrics and Chords from Ultimate-Guitar"
Kaggle dataset into the standard ChordQuest format, then merge into the main CSV.

The UG dataset has one row per song PART (verse, chorus, etc.) with columns:
  Song Artist | Song Title | Part | Chords | Lyrics | Genre

This script:
  1. Loads all 5 genre CSVs (country, hiphop, pop, rnb, rock)
  2. Groups rows by artist + title
  3. Assembles each song's chords&lyrics text from its parts
  4. Writes a converted CSV ready for merge_datasets.py

Usage:
    # Put the 5 downloaded CSVs in data/ug_raw/
    python scripts/convert_ug_dataset.py

    # Then merge into the main dataset:
    python scripts/merge_datasets.py data/ug_converted.csv
"""

import os
import glob
import pandas as pd

RAW_DIR      = os.path.join(os.path.dirname(__file__), "..", "data", "ug_raw")
OUT_PATH     = os.path.join(os.path.dirname(__file__), "..", "data", "ug_converted.csv")

# Map UG genre label → Spotify-style genre list (broad_genre() will pick it up)
GENRE_MAP = {
    "country":  '["country"]',
    "hiphop":   '["hip hop"]',
    "hip hop":  '["hip hop"]',
    "pop":      '["pop"]',
    "rnb":      '["r&b"]',
    "r&b":      '["r&b"]',
    "rock":     '["rock"]',
}


def assemble_song(group):
    """
    Turn a group of part-rows into a single chords&lyrics string.

    Output format per part:
        [verse 1]
        G Em C D
        Lyrics text here...

    """
    parts = []
    for _, row in group.iterrows():
        def safe(val):
            import pandas as pd
            return "" if pd.isna(val) else str(val).strip()

        part    = safe(row.get("Part"))
        chords  = safe(row.get("Chords"))
        lyrics  = safe(row.get("Lyrics"))

        if not chords and not lyrics:
            continue

        block = []
        if part:
            block.append(f"[{part}]")
        if chords:
            block.append(chords)
        if lyrics:
            block.append(lyrics)
        parts.append("\n".join(block))

    return "\n\n".join(parts)


def load_all_csvs():
    csvs = glob.glob(os.path.join(RAW_DIR, "*.csv"))
    if not csvs:
        print(f"No CSV files found in {RAW_DIR}")
        print("Please download the 5 CSV files from Kaggle and place them there.")
        return None

    frames = []
    for path in sorted(csvs):
        df = pd.read_csv(path, low_memory=False)
        print(f"  {os.path.basename(path):35s}  {len(df):>6,} rows")

        # Normalise column names (strip whitespace)
        df.columns = [c.strip() for c in df.columns]

        # Infer genre from filename if column missing
        if "Genre" not in df.columns:
            label = os.path.basename(path).split("_")[0].lower()
            df["Genre"] = label

        frames.append(df)

    return pd.concat(frames, ignore_index=True)


def main():
    os.makedirs(RAW_DIR, exist_ok=True)

    print(f"Looking for CSVs in: {RAW_DIR}")
    raw = load_all_csvs()
    if raw is None:
        return

    print(f"\nTotal rows loaded: {len(raw):,}")
    print(f"Columns: {raw.columns.tolist()}")

    # Normalise required columns
    raw["artist_name"] = raw["Song Artist"].fillna("").astype(str).str.strip()
    raw["song_name"]   = raw["Song Title"].fillna("").astype(str).str.strip()
    raw["genre_raw"]   = raw["Genre"].fillna("").astype(str).str.strip().str.lower()

    # Drop rows missing artist or title
    raw = raw[raw["artist_name"].astype(bool) & raw["song_name"].astype(bool)]

    # Group by song and assemble
    print("\nAssembling songs from parts…")
    grouped = raw.groupby(["artist_name", "song_name"], sort=False)

    records = []
    for (artist, song), group in grouped:
        genre_raw = group["genre_raw"].iloc[0]
        genres    = GENRE_MAP.get(genre_raw, f'["{genre_raw}"]')
        cl_text   = assemble_song(group)

        if not cl_text.strip():
            continue

        records.append({
            "artist_name":   artist,
            "song_name":     song,
            "chords&lyrics": cl_text,
            "chords":        "",        # blank → recommender uses chords&lyrics fallback
            "genres":        genres,
            "lyrics":        "",
            "popularity":    0,
            "followers":     0,
            "tabs":          "",
            "lang":          "en",
            "artist_id":     "",
            "name_e_chords": "",
        })

    out = pd.DataFrame(records)
    out.to_csv(OUT_PATH, index=False)

    print(f"\nConverted {len(out):,} songs → {OUT_PATH}")
    print("\nNext step:")
    print(f"  python scripts/merge_datasets.py data/ug_converted.csv")


if __name__ == "__main__":
    main()
