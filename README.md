# ChordQuest

A full-stack app that recommends songs based on the chords you already know. Search 130,000+ songs, see chord diagrams, transpose to any key, and discover what to learn next.

## Features

- **Chord search** — enter chords you know (e.g. C, G, Am, F) to find matching songs
- **Smart ranking** — sorts results by fewest missing chords, then most known chords
- **One chord away** — suggests which chord to learn next to unlock the most songs
- **Genre & artist filtering** — filter by genre, artist name, or song title
- **Song page** — full chords + lyrics with inline colour-coded chord highlighting
- **Chord diagrams** — SVG guitar diagrams for every chord in the song (150+ shapes)
- **Transposition** — shift any song up/down by semitone with live re-rendering
- **Star ratings** — rate songs, see community averages
- **Dark / light mode** — persisted to localStorage
- **Quick-start progressions** — 6 built-in chord progressions to search from

## Project Structure

```
server/       FastAPI backend + recommender
client/       React frontend
data/         Dataset (not committed — too large)
tests/        Backend test suite (pytest)
```

## Backend Setup

```bash
cd server
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs on: http://127.0.0.1:8000

## Frontend Setup

```bash
cd client
npm install
npm start
```

Runs on: http://localhost:3000

Set `REACT_APP_API_URL=http://127.0.0.1:8000` in `client/.env`.

## Dataset

The processed dataset (`chords_processed.csv`) is hosted on HuggingFace and auto-downloaded on first server start if not present locally.

Set these env vars for the server:

```
HF_REPO_ID=manospep/chordquest_data
HF_FILENAME=chords_processed.csv
HF_TOKEN=<your_token>         # only needed if repo is private
DATA_PATH=<optional_override> # custom path for the CSV
DB_PATH=<optional_override>   # custom path for ratings.db
```

Source data: [Chords and Lyrics Dataset](https://github.com/eitanbentora/NLP-Project-Hit-Machine) by Eitan Bentora — 135,783 songs from e-chords.com.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recommend?chords=C,G,Am&artist=&title=&genre=` | Top 50 matching songs |
| GET | `/one-chord-away?chords=C,G,Am&genre=` | Chords to learn next |
| GET | `/song/{id}` | Full chords + lyrics for one song |
| POST | `/song/{id}/rate` | Submit a star rating `{"rating": 1-5}` |
| GET | `/genres` | List of available genres |
| GET | `/health` | Server health check |

## Running Tests

**Backend** (pytest, runs against the full dataset):
```bash
source .venv/bin/activate
pytest tests/test_backend.py -v
```

**Frontend** (Jest):
```bash
cd client
npm test
```

## License

Unknown
