import os
import pandas as pd

# Broad genre buckets — checked in order, first match wins
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


def _resolve_csv_path() -> str:
    """Return the pre-processed CSV path, downloading from HuggingFace if missing."""
    custom = os.getenv("DATA_PATH")
    if custom:
        csv_path = custom
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "..", "data", "chords_processed.csv")

    if not os.path.exists(csv_path):
        hf_repo  = os.getenv("HF_REPO_ID")
        hf_token = os.getenv("HF_TOKEN")
        if not hf_repo:
            raise FileNotFoundError(
                f"Dataset not found at {csv_path}. "
                "Set DATA_PATH or HF_REPO_ID + HF_TOKEN env vars."
            )
        hf_filename = os.getenv("HF_FILENAME", "chords_processed.csv")
        print(f"Dataset missing — downloading from HuggingFace ({hf_repo}/{hf_filename})…")
        import urllib.request
        url = f"https://huggingface.co/datasets/{hf_repo}/resolve/main/{hf_filename}"
        headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
        os.makedirs(os.path.dirname(csv_path) or ".", exist_ok=True)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(csv_path, "wb") as f:
            total = int(resp.headers.get("Content-Length", 0))
            done = 0
            while chunk := resp.read(1024 * 1024):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"  {done/1e6:.1f} / {total/1e6:.1f} MB", flush=True)
        print("Download complete.")

    return csv_path


class SongRecommender:
    def __init__(self):
        csv_path = _resolve_csv_path()

        print("Loading:", csv_path)
        # Pre-processed file has: song_id, artist_name, song_name, genre, chord_list
        # chord_list is stored as pipe-separated string (e.g. "Am|C|G|F")
        self.df = pd.read_csv(csv_path, index_col="song_id", low_memory=False)

        self.df["artist_name"] = self.df["artist_name"].fillna("").astype(str)
        self.df["song_name"]   = self.df["song_name"].fillna("").astype(str)
        self.df["genre"]       = self.df["genre"].fillna("Other").astype(str)

        # Expose song_id as a regular column too (index stays song_id for .loc lookups)
        self.df["song_id"] = self.df.index

        # Deserialise chord_list and build chord_set for fast set operations
        self.df["chord_list"] = self.df["chord_list"].fillna("").apply(
            lambda s: [c for c in s.split("|") if c]
        )
        self.df["chord_set"] = self.df["chord_list"].apply(frozenset)

        print(f"Ready. {len(self.df)} songs loaded.")

    def recommend(self, user_chords, artist_filter="", title_filter="", genre_filter=""):
        user_set = frozenset(ch.strip() for ch in user_chords if ch.strip())

        df = self.df
        if artist_filter:
            df = df[df["artist_name"].str.contains(artist_filter, case=False, na=False)]
        if title_filter:
            df = df[df["song_name"].str.contains(title_filter, case=False, na=False)]
        if genre_filter:
            df = df[df["genre"] == genre_filter]

        chord_sets     = df["chord_set"].tolist()
        missing_counts = [len(s - user_set) for s in chord_sets]
        known_counts   = [len(s & user_set)  for s in chord_sets]

        result = pd.DataFrame({
            "song_id":       df.index.tolist(),
            "artist_name":   df["artist_name"].tolist(),
            "song_name":     df["song_name"].tolist(),
            "chord_list":    df["chord_list"].tolist(),
            "genre":         df["genre"].tolist(),
            "missing_count": missing_counts,
            "known_count":   known_counts,
        })

        result.sort_values(
            by=["missing_count", "known_count"],
            ascending=[True, False],
            inplace=True,
        )

        return result[["song_id", "artist_name", "song_name", "chord_list", "genre"]].to_dict(orient="records")
