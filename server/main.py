import os
import threading
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
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
    return {"status": "ok", "recommender": "ready" if _rec else "loading", "v": 2}

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
    try:
        res = sb.table("song_ratings").select("rating").eq("song_id", song_id).execute()
        rows = res.data
        if not rows:
            return {"average": None, "count": 0}
        ratings = [r["rating"] for r in rows]
        return {"average": round(sum(ratings) / len(ratings), 1), "count": len(ratings)}
    except Exception as e:
        print(f"[supabase] fetch_rating error: {e}")
        return {"average": None, "count": 0}

def fetch_ratings_bulk(song_ids: list) -> dict:
    sb = get_supabase()
    if not sb or not song_ids:
        return {}
    try:
        res = sb.table("song_ratings").select("song_id,rating").in_("song_id", song_ids).execute()
        stats: dict = defaultdict(list)
        for r in res.data:
            stats[r["song_id"]].append(r["rating"])
        return {
            sid: {"average": round(sum(rs) / len(rs), 1), "count": len(rs)}
            for sid, rs in stats.items()
        }
    except Exception as e:
        print(f"[supabase] fetch_ratings_bulk error: {e}")
        return {}

def _map_song(s: dict, rating: Optional[dict] = None) -> dict:
    r = rating or {"average": None}
    return {
        "id":         str(s["song_id"]),
        "name":       s.get("song_name", ""),
        "artist":     s.get("artist_name", ""),
        "genre":      s.get("genre", "Other"),
        "chord_list": s.get("chord_list", []),
        "rating":     r.get("average"),
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
def one_chord_away(chords: List[str] = Query(default=[]), genre: str = ""):
    if not chords:
        return {"songs": [], "total": 0}

    user_set = frozenset(chords)
    df = get_rec().df

    if genre:
        df = df[df["genre"] == genre]

    missing = df["chord_set"].apply(lambda s: s - user_set)
    one_away_mask = missing.apply(len) == 1
    one_away = df[one_away_mask].copy()
    one_away["missing_chord"] = missing[one_away_mask].apply(lambda s: next(iter(s)))

    songs = []
    for song_id, row in one_away.iterrows():
        songs.append({
            "id":           str(int(song_id)),
            "name":         row.get("song_name", ""),
            "artist":       row.get("artist_name", ""),
            "genre":        row.get("genre", "Other"),
            "chord_list":   [c for c in str(row.get("chord_list", "")).split("|") if c],
            "missing_chord": row["missing_chord"],
        })

    songs.sort(key=lambda x: x["missing_chord"])
    return {"songs": songs[:24], "total": len(songs)}


@app.get("/top-songs")
def top_songs(limit: int = 8):
    sb = get_supabase()
    if not sb:
        return {"songs": [], "total": 0}
    try:
        res = sb.table("song_ratings").select("song_id,rating").execute()
    except Exception as e:
        print(f"[supabase] top_songs error: {e}")
        return {"songs": [], "total": 0}
    if not res.data:
        return {"songs": [], "total": 0}

    stats: dict = defaultdict(list)
    for r in res.data:
        stats[r["song_id"]].append(r["rating"])

    ranked = sorted(
        [(sid, round(sum(rs) / len(rs), 1), len(rs)) for sid, rs in stats.items()],
        key=lambda x: (-x[1], -x[2]),
    )[:limit]

    df = get_rec().df
    songs = []
    for sid, avg, _ in ranked:
        if sid not in df.index:
            continue
        row = df.loc[sid]
        songs.append({
            "id":         str(int(sid)),
            "name":       row.get("song_name", ""),
            "artist":     row.get("artist_name", ""),
            "genre":      row.get("genre", "Other"),
            "chord_list": [c for c in str(row.get("chord_list", "")).split("|") if c],
            "rating":     avg,
        })
    return {"songs": songs, "total": len(songs)}


@app.get("/recent-songs")
def recent_songs(limit: int = 8):
    df = get_rec().df
    recent = df.sort_index(ascending=False).head(limit)
    songs = []
    for song_id, row in recent.iterrows():
        songs.append({
            "id":         str(int(song_id)),
            "name":       row.get("song_name", ""),
            "artist":     row.get("artist_name", ""),
            "genre":      row.get("genre", "Other"),
            "chord_list": [c for c in str(row.get("chord_list", "")).split("|") if c],
        })
    return {"songs": songs, "total": len(songs)}


@app.get("/recommend")
def recommend(
    chords: List[str] = Query(default=[]),
    artist: str = "",
    title: str = "",
    q: str = "",
    genre: str = "",
    page: int = 1,
    limit: int = 20,
):
    results = get_rec().recommend(chords, artist_filter=artist, title_filter=title, genre_filter=genre, q=q)
    total = len(results)
    start = max(0, (page - 1) * limit)
    page_results = results[start:start + limit]

    song_ids = [int(s["song_id"]) for s in page_results]
    ratings  = fetch_ratings_bulk(song_ids)
    songs = [_map_song(s, ratings.get(int(s["song_id"]))) for s in page_results]
    return {"songs": songs, "total": total}


@app.get("/song/{song_id}")
def get_song(song_id: int):
    df = get_rec().df

    if song_id not in df.index:
        raise HTTPException(status_code=404, detail="Song not found")

    row    = df.loc[song_id]
    rating = fetch_rating(song_id)

    return {
        "id":                str(song_id),
        "name":              row.get("song_name", ""),
        "artist":            row.get("artist_name", ""),
        "genre":             row.get("genre", "Other"),
        "chord_list":        [c for c in str(row.get("chord_list", "")).split("|") if c],
        "rating":            rating["average"],
        "chords_and_lyrics": row.get("chords&lyrics", ""),
    }


@app.get("/suggest")
def suggest(song_ids: str = "", liked_ids: str = "", disliked_ids: str = "", limit: int = 6):
    def parse(s): return [int(i) for i in s.split(",") if i.strip().isdigit()]
    ids      = parse(song_ids)
    liked    = parse(liked_ids)    if liked_ids    else []
    disliked = parse(disliked_ids) if disliked_ids else []
    if not ids and not liked:
        return []
    return get_rec().suggest(ids, liked_ids=liked, disliked_ids=disliked, limit=limit)


@app.get("/artists")
def artists(q: str = "", letter: str = "", limit: int = 200, offset: int = 0):
    df = get_rec().df
    counts = df.groupby("artist_name").size().reset_index(name="song_count")
    if q:
        counts = counts[counts["artist_name"].str.contains(q, case=False, na=False, regex=False)]
    elif letter:
        upper = counts["artist_name"].str.upper()
        if letter == "#":
            counts = counts[~upper.str[:1].str.match(r"[A-Z]")]
        else:
            counts = counts[upper.str.startswith(letter.upper())]
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
