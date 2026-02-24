# Chord Recommender App 
A full-stack app that recommends songs based on the chords you already know.
Backend uses FastAPI, frontend uses React, dataset contains chords + lyrics.

##  Data
Data comes from Kaggle dataset "Chords and Lyrics Dataset" by Eitan Bentora. It includes "Lyrics and chords for 135,783 songs in multiple languages". 

Link to the original repository: https://github.com/eitanbentora/NLP-Project-Hit-Machine

It includes :

Information about the artist that created the song
A split to the song's chords lyrics, and tabs
The predicted language of the song.

The Spotify artists dataset: https://www.kaggle.com/ehcall/spotify-artists
The website e-chords:  https://www.e-chords.com/chords/

## Features
- Enter chords (e.g., C,G,Am) to find matching songs
- Sorts results by missing vs known chords
- Filter by artist or song title
- Click into a song page showing chords above lyrics
- Clean neon/glass UI with scrolling lyrics
- FastAPI backend + React frontend

## Project Structure
backend/
frontend/
data/
README.md

## Backend setup (FastAPI)
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pandas
uvicorn main:app --reload

Backend: http://127.0.0.1:8000

## Frontend setup (React)

cd frontend
npm install
npm start

Frontend: http://localhost:3000

## API Endpoints

GET /recommend?chords=C,G,Am&artist=Ed&title=love

--> Returns list of matching songs.

GET /song/{id}

--> Returns full chords + lyrics for one song.

## How it works
1) Extract chords from each song
2) Compare with user input
3) Compute missing/known chords

Sort by:

- lowest missing chords

- highest known chords

## Potential Future Enhancements
- Difficulty score
- Transposition
- Favouriting songs
- More datasets
- Mobile app (React Native)

### License --> Unknown