import os
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recommender import SongRecommender

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Ratings DB ----
DB_PATH = os.path.join(os.path.dirname(__file__), "ratings.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id   INTEGER NOT NULL,
            rating    INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

def fetch_rating(song_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT ROUND(AVG(rating), 1) as average, COUNT(*) as count FROM ratings WHERE song_id = ?",
        (song_id,)
    ).fetchone()
    conn.close()
    return {
        "average": float(row["average"]) if row["average"] else None,
        "count": row["count"],
    }

# ---- Load recommender ----
rec = SongRecommender()

# ---- Endpoints ----

@app.get("/")
def root():
    return {"message": "Chord recommender running!"}


@app.get("/genres")
def genres():
    from recommender import GENRE_RULES
    return [name for name, _ in GENRE_RULES] + ["Other"]


@app.get("/recommend")
def recommend(chords: str = "", artist: str = "", title: str = "", genre: str = ""):
    chord_list = [c.strip() for c in chords.split(",") if c.strip()]
    results = rec.recommend(chord_list, artist_filter=artist, title_filter=title, genre_filter=genre)

    # Attach rating summary to each result
    conn = get_db()
    for song in results:
        row = conn.execute(
            "SELECT ROUND(AVG(rating), 1) as average, COUNT(*) as count FROM ratings WHERE song_id = ?",
            (song["song_id"],)
        ).fetchone()
        song["rating_average"] = float(row["average"]) if row["average"] else None
        song["rating_count"]   = row["count"]
    conn.close()

    return results


@app.get("/song/{song_id}")
def get_song(song_id: int):
    df = rec.df

    if song_id not in df.index:
        raise HTTPException(status_code=404, detail="Song not found")

    row = df.loc[song_id]
    rating = fetch_rating(song_id)

    return {
        "song_id":          int(song_id),
        "artist_name":      row.get("artist_name", ""),
        "song_name":        row.get("song_name", ""),
        "chords_raw":       row.get("chords", ""),
        "lyrics":           row.get("lyrics", ""),
        "chords_and_lyrics": row.get("chords&lyrics", row.get("chords_lyrics", "")),
        "chord_list":       row.get("chord_list", []),
        "rating_average":   rating["average"],
        "rating_count":     rating["count"],
    }


class RatingBody(BaseModel):
    rating: int

@app.post("/song/{song_id}/rate")
def rate_song(song_id: int, body: RatingBody):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    conn = get_db()
    conn.execute(
        "INSERT INTO ratings (song_id, rating) VALUES (?, ?)",
        (song_id, body.rating)
    )
    conn.commit()
    conn.close()

    return fetch_rating(song_id)
