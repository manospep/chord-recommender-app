from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from recommender import SongRecommender

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load recommender
rec = SongRecommender()

@app.get("/")
def root():
    return {"message": "Chord recommender running!"}


@app.get("/recommend")
def recommend(chords: str, artist: str = "", title: str = ""):
    chord_list = [c.strip() for c in chords.split(",") if c.strip()]
    results = rec.recommend(chord_list, artist_filter=artist, title_filter=title)
    return results



# -----------------------------
#  NEW ENDPOINT: SONG DETAILS
# -----------------------------
@app.get("/song/{song_id}")
def get_song(song_id: int):
    """
    Returns full details of a song:
    - artist_name
    - song_name
    - chords column (raw dict string)
    - lyrics column
    - chords_and_lyrics column (if it exists)
    - chord_list (extracted)
    """

    df = rec.df

    if song_id < 0 or song_id >= len(df):
        raise HTTPException(status_code=404, detail="Song not found")

    row = df.iloc[song_id]

    return {
        "song_id": int(song_id),
        "artist_name": row.get("artist_name", ""),
        "song_name": row.get("song_name", ""),
        "chords_raw": row.get("chords", ""),
        "lyrics": row.get("lyrics", ""),
        "chords_and_lyrics": row.get("chords&lyrics", row.get("chords_lyrics", "")),
        "chord_list": row.get("chord_list", []),
    }
