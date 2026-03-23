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

        df = pd.read_csv(csv_path, index_col="song_id", low_memory=False)
        df["artist_name"] = df["artist_name"].fillna("").astype(str)
        df["song_name"]   = df["song_name"].fillna("").astype(str)
        df["genre"]       = df["genre"].fillna("Other").astype(str)

        # chord_list stays as pipe-separated string — much cheaper than Python lists
        df["chord_list"] = df["chord_list"].fillna("")
        # chord_set (frozenset) is needed for fast set arithmetic at query time
        df["chord_set"] = df["chord_list"].apply(
            lambda s: frozenset(s.split("|")) if s else frozenset()
        )
        # song_id as a column for endpoints that reference it by name
        df["song_id"] = df.index.map(int)

        self.df = df
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

        song_ids     = df["song_id"].tolist()
        artists      = df["artist_name"].tolist()
        names        = df["song_name"].tolist()
        genres       = df["genre"].tolist()
        chord_strs   = df["chord_list"].tolist()

        # Sort by (missing_count asc, known_count desc), return top 50
        ranked = sorted(
            zip(missing_counts, [-k for k in known_counts], range(len(song_ids)))
        )[:50]

        return [
            {
                "song_id":    song_ids[i],
                "artist_name": artists[i],
                "song_name":  names[i],
                "chord_list": [c for c in chord_strs[i].split("|") if c],
                "genre":      genres[i],
            }
            for _, _, i in ranked
        ]
