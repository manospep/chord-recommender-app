"""
merge_datasets.py — Merge additional chord datasets into chords_and_lyrics.csv

Usage:
    python scripts/merge_datasets.py data/extra1.csv data/extra2.csv ...

Each extra CSV needs at minimum an artist column and a song/title column.
The script auto-detects column names from a list of known alternatives.
Output overwrites data/chords_and_lyrics.csv (original is backed up first).
"""

import os
import sys
import shutil
import pandas as pd

# ── Column name aliases ─────────────────────────────────────────────────────
ARTIST_COLS         = ["artist_name", "artist", "Artist", "singer", "band"]
SONG_COLS           = ["song_name", "song", "title", "Title", "Song", "Track", "track_name"]
CHORDS_LYRICS_COLS  = ["chords&lyrics", "chords_and_lyrics", "chords_lyrics", "tab",
                        "tabs", "text", "content", "chord_lyrics"]
CHORDS_COLS         = ["chords", "chord_progression", "chord_chart"]
GENRES_COLS         = ["genres", "genre", "Genre", "tags", "style"]
LYRICS_COLS         = ["lyrics", "Lyrics", "lyric"]
POPULARITY_COLS     = ["popularity", "Popularity", "views", "plays"]

DATA_DIR   = os.path.join(os.path.dirname(__file__), "..", "data")
MAIN_CSV   = os.path.join(DATA_DIR, "chords_and_lyrics.csv")
BACKUP_CSV = os.path.join(DATA_DIR, "chords_and_lyrics.backup.csv")


def find_col(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None


def normalize(df, source_label):
    """Map a foreign DataFrame to the standard column schema."""
    artist_col = find_col(df, ARTIST_COLS)
    song_col   = find_col(df, SONG_COLS)

    if not artist_col or not song_col:
        print(f"  [SKIP] {source_label}: could not find artist ({ARTIST_COLS}) "
              f"or song ({SONG_COLS}) columns.")
        print(f"         Available columns: {df.columns.tolist()}")
        return None

    out = pd.DataFrame()
    out["artist_name"] = df[artist_col].fillna("").astype(str).str.strip()
    out["song_name"]   = df[song_col].fillna("").astype(str).str.strip()

    # chords&lyrics — the main text field the recommender uses
    cl_col = find_col(df, CHORDS_LYRICS_COLS)
    out["chords&lyrics"] = df[cl_col].fillna("") if cl_col else ""

    # chords — dict format; leave empty so the recommender falls back to chords&lyrics
    ch_col = find_col(df, CHORDS_COLS)
    if ch_col and cl_col and ch_col != cl_col:
        out["chords"] = df[ch_col].fillna("")
    else:
        out["chords"] = ""

    # optional columns
    genres_col = find_col(df, GENRES_COLS)
    out["genres"] = df[genres_col].fillna("[]") if genres_col else "[]"

    lyrics_col = find_col(df, LYRICS_COLS)
    out["lyrics"] = df[lyrics_col].fillna("") if lyrics_col else ""

    pop_col = find_col(df, POPULARITY_COLS)
    out["popularity"] = df[pop_col].fillna(0) if pop_col else 0

    # columns expected by recommender but not critical
    out["followers"]        = 0
    out["tabs"]             = ""
    out["lang"]             = "en"
    out["artist_id"]        = ""
    out["name_e_chords"]    = ""

    # Drop rows with no usable content
    has_content = (
        out["chords&lyrics"].str.strip().astype(bool) |
        out["chords"].str.strip().astype(bool)
    )
    before = len(out)
    out = out[has_content & out["artist_name"].astype(bool) & out["song_name"].astype(bool)]
    dropped = before - len(out)
    if dropped:
        print(f"  Dropped {dropped} rows with no content or missing artist/song.")

    return out


def dedup_key(df):
    return (
        df["artist_name"].str.lower().str.strip() + "|||" +
        df["song_name"].str.lower().str.strip()
    )


def main():
    extra_files = sys.argv[1:]
    if not extra_files:
        print("Usage: python scripts/merge_datasets.py data/extra1.csv [data/extra2.csv ...]")
        sys.exit(1)

    # ── Load main dataset ────────────────────────────────────────────────────
    print(f"Loading main dataset: {MAIN_CSV}")
    main_df = pd.read_csv(MAIN_CSV, low_memory=False)
    print(f"  {len(main_df):,} songs")

    # Backup
    shutil.copy(MAIN_CSV, BACKUP_CSV)
    print(f"  Backup saved → {BACKUP_CSV}")

    existing_keys = set(dedup_key(main_df))
    frames = [main_df]
    total_new = 0

    # ── Process each extra file ──────────────────────────────────────────────
    for path in extra_files:
        label = os.path.basename(path)
        print(f"\nProcessing: {label}")
        try:
            df = pd.read_csv(path, low_memory=False)
        except Exception as e:
            print(f"  [ERROR] Could not read file: {e}")
            continue

        print(f"  {len(df):,} rows, columns: {df.columns.tolist()}")
        norm = normalize(df, label)
        if norm is None:
            continue

        # Deduplicate against existing
        keys = dedup_key(norm)
        is_new = ~keys.isin(existing_keys)
        new_songs = norm[is_new].copy()
        dupes = len(norm) - len(new_songs)

        print(f"  {len(new_songs):,} new songs added  ({dupes:,} duplicates skipped)")
        existing_keys.update(keys[is_new])
        total_new += len(new_songs)
        frames.append(new_songs)

    # ── Merge and save ───────────────────────────────────────────────────────
    if total_new == 0:
        print("\nNo new songs to add. Original file unchanged.")
        return

    merged = pd.concat(frames, ignore_index=True)
    merged.to_csv(MAIN_CSV, index=False)

    print(f"\nDone. {total_new:,} new songs added.")
    print(f"Total library: {len(merged):,} songs")
    print(f"Saved → {MAIN_CSV}")


if __name__ == "__main__":
    main()
