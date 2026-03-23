import os
import ast
import pandas as pd
from chord_extractor import extract_chords

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

def broad_genre(raw):
    if not isinstance(raw, str):
        return "Other"
    try:
        genres = ast.literal_eval(raw)
    except:
        return "Other"
    combined = " ".join(genres).lower()
    for name, rule in GENRE_RULES:
        if rule(combined):
            return name
    return "Other"


def _resolve_csv_path() -> str:
    """Return the CSV path, downloading from HuggingFace if missing."""
    # Env var lets Railway (or any host) override the path
    custom = os.getenv("DATA_PATH")
    if custom:
        csv_path = custom
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "..", "data", "chords_and_lyrics.csv")

    if not os.path.exists(csv_path):
        hf_repo  = os.getenv("HF_REPO_ID")
        hf_token = os.getenv("HF_TOKEN")
        if not hf_repo:
            raise FileNotFoundError(
                f"Dataset not found at {csv_path}. "
                "Set DATA_PATH or HF_REPO_ID + HF_TOKEN env vars."
            )
        hf_filename = os.getenv("HF_FILENAME", "chords_and_lyrics.csv")
        print(f"Dataset missing — downloading from HuggingFace ({hf_repo}/{hf_filename})…")
        import urllib.request
        url = f"https://huggingface.co/datasets/{hf_repo}/resolve/main/{hf_filename}"
        headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
        os.makedirs(os.path.dirname(csv_path) or ".", exist_ok=True)
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(csv_path, "wb") as f:
            total = int(resp.headers.get("Content-Length", 0))
            done = 0
            while chunk := resp.read(4 * 1024 * 1024):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"  {done/1e6:.0f} / {total/1e6:.0f} MB", flush=True)
        print("Download complete.")

    return csv_path


class SongRecommender:
    def __init__(self):
        csv_path = _resolve_csv_path()

        print("Loading:", csv_path)
        # Read only the columns we actually use to keep memory footprint small
        # Only load the minimal columns needed for recommendation.
        # chords&lyrics and lyrics are large text columns excluded to stay within RAM limits.
        NEEDED = ["artist_name", "song_name", "genres", "chords"]
        # Peek at the header to only request columns that exist
        header = pd.read_csv(csv_path, nrows=0).columns.tolist()
        usecols = [c for c in NEEDED if c in header]
        print(f"Loading columns: {usecols}")
        self.df = pd.read_csv(csv_path, usecols=usecols, low_memory=False)

        print("Extracting chords…")
        self.prepare_data()
        print(f"Ready. {len(self.df)} songs loaded.")

    def prepare_data(self):

        def convert_to_dict(raw):
            if isinstance(raw, dict):
                return raw
            if not isinstance(raw, str):
                return {}
            raw = raw.strip()
            try:
                return ast.literal_eval(raw)
            except:
                return {}

        def flatten_chords(chord_obj):
            d = convert_to_dict(chord_obj)
            if not isinstance(d, dict):
                return []
            combined = " ".join(d.values())
            return extract_chords(combined)

        def chords_dict_size(raw):
            d = convert_to_dict(raw)
            return len(d) if isinstance(d, dict) else 0

        def extract_row_chords(row):
            return flatten_chords(row["chords"])

        self.df["_dict_size"] = self.df["chords"].apply(chords_dict_size)
        self.df["chord_list"] = self.df.apply(extract_row_chords, axis=1)

        # Keep only songs with a proper chords dict (>=3 sections) and at least 2 distinct chords.
        before = len(self.df)
        self.df = self.df[
            (self.df["_dict_size"] >= 3) & (self.df["chord_list"].apply(len) >= 2)
        ].copy()
        self.df.drop(columns=["_dict_size"], inplace=True)
        print(f"Filtered {before - len(self.df)} inline/empty-chord songs. {len(self.df)} remain.")

        self.df["chord_set"]  = self.df["chord_list"].apply(frozenset)
        self.df["song_id"]    = self.df.index
        self.df["genre"]      = self.df["genres"].apply(broad_genre)

        self.df["artist_name"] = self.df["artist_name"].fillna("").astype(str)
        self.df["song_name"]   = self.df["song_name"].fillna("").astype(str)

    def recommend(self, user_chords, artist_filter="", title_filter="", genre_filter=""):
        user_set = frozenset(ch.strip() for ch in user_chords if ch.strip())

        df = self.df
        if artist_filter:
            df = df[df["artist_name"].str.contains(artist_filter, case=False, na=False)]
        if title_filter:
            df = df[df["song_name"].str.contains(title_filter, case=False, na=False)]
        if genre_filter:
            df = df[df["genre"] == genre_filter]

        chord_sets    = df["chord_set"].tolist()
        missing_counts = [len(s - user_set) for s in chord_sets]
        known_counts   = [len(s & user_set)  for s in chord_sets]

        result = pd.DataFrame({
            "song_id":       df["song_id"].tolist(),
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
