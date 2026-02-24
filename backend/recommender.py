import os
import ast
import pandas as pd
from chord_extractor import extract_chords

class SongRecommender:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "..", "data", "chords_and_lyrics.csv")

        print("Loading:", csv_path)
        self.df = pd.read_csv(csv_path, low_memory=False)

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

        self.df["chord_list"] = self.df["chords"].apply(flatten_chords)

        # Pre-compute frozensets once at startup — reused on every search
        self.df["chord_set"] = self.df["chord_list"].apply(frozenset)

        # Store song_id as a real column so we never need reset_index
        self.df["song_id"] = self.df.index

        # Clean NaN strings once at startup so JSON serialization never fails
        self.df["artist_name"] = self.df["artist_name"].fillna("").astype(str)
        self.df["song_name"]   = self.df["song_name"].fillna("").astype(str)

    def recommend(self, user_chords, artist_filter="", title_filter=""):
        user_set = frozenset(ch.strip() for ch in user_chords if ch.strip())

        # Filter FIRST on the smaller subset before any chord work
        df = self.df
        if artist_filter:
            df = df[df["artist_name"].str.contains(artist_filter, case=False, na=False)]
        if title_filter:
            df = df[df["song_name"].str.contains(title_filter, case=False, na=False)]

        # Vectorized chord counts using pre-computed frozensets
        chord_sets = df["chord_set"].tolist()
        missing_counts = [len(s - user_set) for s in chord_sets]
        known_counts   = [len(s & user_set)  for s in chord_sets]

        # Build result without touching the full DataFrame
        result = pd.DataFrame({
            "song_id":       df["song_id"].tolist(),
            "artist_name":   df["artist_name"].tolist(),
            "song_name":     df["song_name"].tolist(),
            "chord_list":    df["chord_list"].tolist(),
            "missing_count": missing_counts,
            "known_count":   known_counts,
        })

        result.sort_values(
            by=["missing_count", "known_count"],
            ascending=[True, False],
            inplace=True,
        )

        return result[["song_id", "artist_name", "song_name", "chord_list"]].to_dict(orient="records")
