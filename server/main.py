import os
import threading
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from recommender import SongRecommender

# ---- Lazy recommender with background preload ----
_rec: Optional[SongRecommender] = None
_rec_error: Optional[str] = None
_rec_lock = threading.Lock()

def _preload():
    global _rec, _rec_error
    try:
        with _rec_lock:
            if _rec is None:
                _rec = SongRecommender()
    except Exception as e:
        _rec_error = str(e)
        print(f"Recommender failed to load: {e}")

@asynccontextmanager
async def lifespan(app):
    threading.Thread(target=_preload, daemon=True).start()
    yield

app = FastAPI(title="ChordQuest API", lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok", "recommender": "ready" if _rec else "loading"}

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Supabase client ----
_sb: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    global _sb
    if _sb is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        if url and key:
            _sb = create_client(url, key)
    return _sb

def fetch_rating(song_id: int) -> dict:
    sb = get_supabase()
    if not sb:
        return {"average": None, "count": 0}
    res = sb.table("song_ratings").select("rating").eq("song_id", song_id).execute()
    rows = res.data
    if not rows:
        return {"average": None, "count": 0}
    ratings = [r["rating"] for r in rows]
    return {"average": round(sum(ratings) / len(ratings), 1), "count": len(ratings)}

def fetch_ratings_bulk(song_ids: list) -> dict:
    """Returns {song_id: {average, count}} for a list of song_ids in one query."""
    sb = get_supabase()
    if not sb or not song_ids:
        return {}
    res = sb.table("song_ratings").select("song_id,rating").in_("song_id", song_ids).execute()
    stats: dict = defaultdict(list)
    for r in res.data:
        stats[r["song_id"]].append(r["rating"])
    return {
        sid: {"average": round(sum(rs) / len(rs), 1), "count": len(rs)}
        for sid, rs in stats.items()
    }

def get_rec() -> SongRecommender:
    if _rec_error:
        raise HTTPException(status_code=503, detail=f"Recommender failed to load: {_rec_error}")
    if _rec is None:
        raise HTTPException(status_code=503, detail="Recommender is still loading, please retry in a moment.")
    return _rec

# ---- Endpoints ----

@app.get("/")
def root():
    return {"message": "Chord recommender running!"}


@app.get("/genres")
def genres():
    from recommender import GENRE_RULES
    return [name for name, _ in GENRE_RULES] + ["Other"]


@app.get("/one-chord-away")
def one_chord_away(chords: str = "", genre: str = ""):
    chord_list = [c.strip() for c in chords.split(",") if c.strip()]
    if not chord_list:
        return []

    user_set = frozenset(chord_list)
    df = get_rec().df

    if genre:
        df = df[df["genre"] == genre]

    missing = df["chord_set"].apply(lambda s: s - user_set)
    one_away_mask = missing.apply(len) == 1
    one_away = df[one_away_mask].copy()
    one_away["missing_chord"] = missing[one_away_mask].apply(lambda s: next(iter(s)))

    grouped = one_away.groupby("missing_chord")
    result = []
    for chord, group in sorted(grouped, key=lambda x: -len(x[1])):
        sample = (
            group.sort_values("missing_chord")
            .head(3)[["song_id", "artist_name", "song_name", "genre"]]
            .to_dict(orient="records")
        )
        for s in sample:
            s["song_id"] = int(s["song_id"])
        result.append({
            "chord":        chord,
            "unlocks":      len(group),
            "sample_songs": sample,
        })

    return result[:8]


@app.get("/top-songs")
def top_songs(limit: int = 5):
    sb = get_supabase()
    if not sb:
        return []
    res = sb.table("song_ratings").select("song_id,rating").execute()
    if not res.data:
        return []

    stats: dict = defaultdict(list)
    for r in res.data:
        stats[r["song_id"]].append(r["rating"])

    ranked = sorted(
        [(sid, round(sum(rs) / len(rs), 1), len(rs)) for sid, rs in stats.items()],
        key=lambda x: (-x[1], -x[2]),
    )[:limit]

    df = get_rec().df
    result = []
    for sid, avg, cnt in ranked:
        if sid not in df.index:
            continue
        sr = df.loc[sid]
        result.append({
            "song_id":        int(sid),
            "artist_name":    sr.get("artist_name", ""),
            "song_name":      sr.get("song_name", ""),
            "genre":          sr.get("genre", "Other"),
            "rating_average": avg,
            "rating_count":   cnt,
        })
    return result


@app.get("/recommend")
def recommend(chords: str = "", artist: str = "", title: str = "", genre: str = ""):
    chord_list = [c.strip() for c in chords.split(",") if c.strip()]
    results = get_rec().recommend(chord_list, artist_filter=artist, title_filter=title, genre_filter=genre)

    song_ids = [int(s["song_id"]) for s in results]
    ratings  = fetch_ratings_bulk(song_ids)
    for song in results:
        song["song_id"] = int(song["song_id"])
        r = ratings.get(song["song_id"], {"average": None, "count": 0})
        song["rating_average"] = r["average"]
        song["rating_count"]   = r["count"]

    return results


@app.get("/song/{song_id}")
def get_song(song_id: int):
    df = get_rec().df

    if song_id not in df.index:
        raise HTTPException(status_code=404, detail="Song not found")

    row    = df.loc[song_id]
    rating = fetch_rating(song_id)

    return {
        "song_id":           int(song_id),
        "artist_name":       row.get("artist_name", ""),
        "song_name":         row.get("song_name", ""),
        "chords_and_lyrics": row.get("chords&lyrics", ""),
        "chord_list":        [c for c in str(row.get("chord_list", "")).split("|") if c],
        "rating_average":    rating["average"],
        "rating_count":      rating["count"],
    }


@app.get("/suggest")
def suggest(song_ids: str = "", limit: int = 6):
    if not song_ids:
        return []
    ids = [int(i) for i in song_ids.split(",") if i.strip().isdigit()]
    if not ids:
        return []
    return get_rec().suggest(ids, limit=limit)


@app.get("/artists")
def artists(q: str = "", limit: int = 48, offset: int = 0):
    df = get_rec().df
    counts = df.groupby("artist_name").size().reset_index(name="song_count")
    if q:
        counts = counts[counts["artist_name"].str.contains(q, case=False, na=False, regex=False)]
    counts = counts.sort_values("artist_name", key=lambda s: s.str.lower())
    page = counts.iloc[offset: offset + limit]
    return page.rename(columns={"artist_name": "name"}).to_dict(orient="records")


@app.get("/artist/{name}/songs")
def artist_songs(name: str):
    df  = get_rec().df
    hits = df[df["artist_name"].str.lower() == name.lower()]
    result = []
    for song_id, row in hits.iterrows():
        result.append({
            "song_id":     int(song_id),
            "song_name":   row.get("song_name", ""),
            "genre":       row.get("genre", "Other"),
            "chord_list":  [c for c in str(row.get("chord_list", "")).split("|") if c],
        })
    return sorted(result, key=lambda x: x["song_name"])


@app.get("/autocomplete")
def autocomplete(
    q: str = "", field: str = "artist", limit: int = 8,
    artist_filter: str = "", title_filter: str = "",
):
    if len(q) < 1:
        return []
    df = get_rec().df
    if field == "artist":
        col = "artist_name"
    elif field == "title":
        col = "song_name"
    else:
        return []

    if field == "title" and artist_filter:
        df = df[df["artist_name"].str.contains(artist_filter, case=False, na=False, regex=False)]
    elif field == "artist" and title_filter:
        df = df[df["song_name"].str.contains(title_filter, case=False, na=False, regex=False)]

    mask    = df[col].str.contains(q, case=False, na=False, regex=False)
    matches = df[mask][col].dropna().unique()

    q_lower  = q.lower()
    starts   = sorted(m for m in matches if m.lower().startswith(q_lower))
    contains = sorted(m for m in matches if not m.lower().startswith(q_lower))
    return (starts + contains)[:limit]
