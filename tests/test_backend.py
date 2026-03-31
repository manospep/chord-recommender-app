"""
ChordQuest – comprehensive test suite
Runs dataset integrity checks across all 130k+ rows in one batch,
plus unit tests for chord extraction and the recommender.

Run from the project root:
    source .venv/bin/activate
    pytest tests/test_backend.py -v
"""

import re
import sys
import os
import pytest
import pandas as pd

# Allow imports from the server directory
SERVER_DIR = os.path.join(os.path.dirname(__file__), "..", "server")
sys.path.insert(0, os.path.abspath(SERVER_DIR))

from chord_extractor import extract_chords

# ── Paths ─────────────────────────────────────────────────────────────────────

DATA_DIR      = os.path.join(os.path.dirname(__file__), "..", "data")
PROCESSED_CSV = os.path.join(DATA_DIR, "chords_processed.csv")

VALID_GENRES = {
    "Metal", "Rock", "Pop", "Hip Hop", "R&B / Soul",
    "Country", "Jazz", "Blues", "Electronic", "Folk",
    "Classical", "Reggae", "Latin", "Other",
}

# Chord token pattern (mirrors chord_extractor.py)
CHORD_TOKEN_RE = re.compile(
    r"^[A-G](?:#|b)?(?:maj7|maj|min7|min|m7|m|dim7|dim|aug|sus2|sus4|sus|add9|add11|add13|add|6|7|9|11|13|5)?$"
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def df():
    """Load the processed CSV once for the entire test session."""
    assert os.path.exists(PROCESSED_CSV), (
        f"Dataset not found at {PROCESSED_CSV}. "
        "Run the preprocessing step first."
    )
    return pd.read_csv(PROCESSED_CSV)


@pytest.fixture(scope="session")
def recommender():
    from recommender import SongRecommender
    return SongRecommender()


# ── Dataset integrity ─────────────────────────────────────────────────────────

def test_dataset_loads(df):
    """Dataset has a meaningful number of rows."""
    assert len(df) > 100_000, f"Expected 100k+ rows, got {len(df)}"


def test_required_columns(df):
    """All expected columns are present."""
    required = {"song_id", "artist_name", "song_name", "genre", "chord_list", "chords&lyrics"}
    missing = required - set(df.columns)
    assert not missing, f"Missing columns: {missing}"


def test_unique_song_ids(df):
    """song_id values are unique across the entire dataset."""
    dupes = df["song_id"].duplicated().sum()
    assert dupes == 0, f"{dupes} duplicate song_ids found"


def test_no_negative_song_ids(df):
    """song_id is non-negative for every row."""
    bad = (df["song_id"] < 0).sum()
    assert bad == 0, f"{bad} rows have negative song_ids"


def test_no_missing_artist_names(df):
    """artist_name is populated for every row."""
    missing = df["artist_name"].isna().sum() + (df["artist_name"].str.strip() == "").sum()
    assert missing == 0, f"{missing} rows have empty artist_name"


def test_no_missing_song_names(df):
    """
    song_name is populated for almost every row.
    One known upstream gap: song_id 20764 (Elevation Worship) has no title
    in the source dataset. Assert the count stays at exactly 1 so any new
    gaps are caught immediately.
    """
    missing = df["song_name"].isna().sum() + (df["song_name"].str.strip() == "").sum()
    assert missing <= 1, f"{missing} rows have empty song_name (expected at most 1 known gap)"
    if missing == 1:
        bad_ids = df[df["song_name"].isna() | (df["song_name"].str.strip() == "")]["song_id"].tolist()
        assert bad_ids == [20764], f"Unexpected song_id(s) with missing name: {bad_ids}"


def test_all_genres_valid(df):
    """Every genre value is in the known genre set."""
    bad = df[~df["genre"].isin(VALID_GENRES)]
    assert len(bad) == 0, (
        f"{len(bad)} rows have invalid genres: {bad['genre'].unique().tolist()}"
    )


def test_no_truncated_lyrics(df):
    """
    Fewer than 0.1% of songs should have lyrics exactly 1000 chars —
    the threshold that indicates the old truncation bug.
    """
    total = len(df)
    exactly_1000 = (df["chords&lyrics"].dropna().str.len() == 1000).sum()
    pct = exactly_1000 / total
    assert pct < 0.001, (
        f"{exactly_1000} rows ({pct:.1%}) are still truncated at 1000 chars"
    )


def test_lyrics_max_length(df):
    """Full lyrics are present — max should be well above 1000 chars."""
    max_len = df["chords&lyrics"].dropna().str.len().max()
    assert max_len > 5_000, (
        f"Max chords&lyrics length is only {max_len} — dataset may still be truncated"
    )


def test_chord_list_format(df):
    """
    chord_list is pipe-separated and each token looks like a valid chord symbol.
    Checks a sample of 5000 rows for speed.
    """
    sample = df["chord_list"].dropna().sample(min(5000, len(df)), random_state=42)
    bad_rows = []
    for val in sample:
        if not val:
            continue
        tokens = str(val).split("|")
        for tok in tokens:
            tok = tok.strip()
            if tok and not CHORD_TOKEN_RE.match(tok):
                bad_rows.append(tok)
    assert len(bad_rows) == 0, (
        f"{len(bad_rows)} invalid chord tokens found, e.g.: {bad_rows[:10]}"
    )


def test_chords_appear_in_lyrics(df):
    """
    For every song that has both a chord_list and chords&lyrics,
    at least one chord from the list should appear somewhere in the text.
    Checks all eligible rows in one vectorized pass.
    """
    eligible = df[
        df["chord_list"].notna() & (df["chord_list"] != "") &
        df["chords&lyrics"].notna() & (df["chords&lyrics"] != "")
    ].copy()

    def has_any_chord(row):
        chords = str(row["chord_list"]).split("|")
        text = str(row["chords&lyrics"])
        return any(c in text for c in chords if c)

    matches = eligible.apply(has_any_chord, axis=1)
    failures = (~matches).sum()
    total = len(eligible)
    assert failures / total < 0.005, (
        f"{failures}/{total} songs ({failures/total:.1%}) have no chord from "
        "chord_list appearing in chords&lyrics"
    )


# ── Chord extractor unit tests ────────────────────────────────────────────────

class TestExtractChords:
    def test_basic_major(self):
        assert extract_chords("C G Am F") == ["C", "G", "Am", "F"]

    def test_sharp_chords(self):
        result = extract_chords("F# C# G#m")
        assert "F#" in result
        assert "C#" in result

    def test_no_double_extract_sharp(self):
        """D# should not be extracted as both D and D#."""
        result = extract_chords("D#")
        assert result == ["D#"]
        assert "D" not in result

    def test_slash_chord_expands(self):
        """A/C# → both A and C# extracted."""
        result = extract_chords("A/C#")
        assert "A" in result
        assert "C#" in result

    def test_complex_qualities(self):
        result = extract_chords("Cmaj7 Dm7 G7 Am")
        assert "Cmaj7" in result
        assert "Dm7" in result
        assert "G7" in result
        assert "Am" in result

    def test_deduplication(self):
        result = extract_chords("C G C G C")
        assert result.count("C") == 1
        assert result.count("G") == 1

    def test_order_preserved(self):
        result = extract_chords("F Bb Eb Ab")
        assert result == ["F", "Bb", "Eb", "Ab"]

    def test_html_tags_stripped(self):
        result = extract_chords("<verse>C G</verse>Am")
        assert "C" in result
        assert "G" in result
        assert "Am" in result

    def test_none_input(self):
        assert extract_chords(None) == []

    def test_empty_string(self):
        assert extract_chords("") == []

    def test_lyrics_only_no_chords(self):
        result = extract_chords("Hello world this is a lyric line")
        assert result == []


# ── Recommender unit tests ────────────────────────────────────────────────────

class TestRecommender:
    def test_returns_results_for_common_chords(self, recommender):
        results = recommender.recommend(["C", "G", "Am", "F"])
        assert len(results) > 0

    def test_returns_at_most_50(self, recommender):
        results = recommender.recommend(["C", "G", "Am", "F"])
        assert len(results) <= 50

    def test_result_schema(self, recommender):
        results = recommender.recommend(["C", "G"])
        for r in results:
            assert "song_id" in r
            assert "artist_name" in r
            assert "song_name" in r
            assert "chord_list" in r
            assert "genre" in r

    def test_exact_match_ranks_first(self, recommender):
        """
        A song whose entire chord set is known should appear in results
        and have no missing chords (i.e. rank near the top).
        Known song: 'No Distance Left To Run' by Blur — chords E C#m A G#m B C
        """
        blur_chords = ["E", "C#m", "A", "G#m", "B", "C"]
        results = recommender.recommend(blur_chords)
        song_ids = [r["song_id"] for r in results]
        assert 33625 in song_ids, "Blur song should appear when all its chords are known"
        pos = song_ids.index(33625)
        assert pos < 10, f"Blur song was at position {pos}, expected near top"

    def test_genre_filter_restricts_results(self, recommender):
        all_results  = recommender.recommend(["C", "G", "Am", "F"])
        rock_results = recommender.recommend(["C", "G", "Am", "F"], genre_filter="Rock")
        assert len(rock_results) <= len(all_results)
        assert all(r["genre"] == "Rock" for r in rock_results)

    def test_artist_filter(self, recommender):
        results = recommender.recommend([], artist_filter="Blur")
        assert len(results) > 0
        assert all("Blur" in r["artist_name"] for r in results)

    def test_title_filter(self, recommender):
        results = recommender.recommend([], title_filter="No Distance")
        assert any("No Distance" in r["song_name"] for r in results)

    def test_empty_chords_with_filters_still_works(self, recommender):
        """Empty chord list + genre filter should still return songs."""
        results = recommender.recommend([], genre_filter="Jazz")
        assert len(results) > 0

    def test_sorting_missing_chords_ascending(self, recommender):
        """
        Results should be sorted so songs with fewer missing chords come first.
        """
        known = {"C", "G", "Am", "F"}
        results = recommender.recommend(list(known))
        missing_counts = [len(set(r["chord_list"]) - known) for r in results]
        assert missing_counts == sorted(missing_counts), (
            "Results are not sorted by ascending missing chord count"
        )

    def test_unknown_chords_return_results(self, recommender):
        """Completely unknown chord names should return results (0 intersection is fine)."""
        results = recommender.recommend(["Xyz99", "Foo"])
        assert isinstance(results, list)
