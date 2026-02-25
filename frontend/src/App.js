import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import SongPage from "./SongPage";
import "./App.css";

const GENRES = [
  "All Genres", "Metal", "Rock", "Pop", "Hip Hop", "R&B / Soul",
  "Country", "Jazz", "Blues", "Electronic", "Folk", "Classical", "Reggae", "Latin", "Other",
];

const GENRE_ICONS = {
  "Metal": "🤘", "Rock": "🎸", "Pop": "🎵", "Hip Hop": "🎤", "R&B / Soul": "🎷",
  "Country": "🤠", "Jazz": "🎺", "Blues": "🎶", "Electronic": "🎛️",
  "Folk": "🪕", "Classical": "🎻", "Reggae": "🌴", "Latin": "💃", "Other": "🎼",
};

const PROGRESSIONS = [
  { name: "Pop / Rock",  label: "I – V – vi – IV", chords: ["C", "G", "Am", "F"] },
  { name: "Minor Pop",   label: "vi – IV – I – V",  chords: ["Am", "F", "C", "G"] },
  { name: "50s",         label: "I – vi – IV – V",  chords: ["C", "Am", "F", "G"] },
  { name: "Blues",       label: "12-bar shuffle",   chords: ["A", "D", "E"] },
  { name: "Jazz",        label: "ii – V – I",       chords: ["Dm", "G7", "Cmaj7"] },
  { name: "Rock Anthem", label: "i – VII – VI",     chords: ["Am", "G", "F"] },
];

// Module-level cache — survives React unmount/remount within the same session
const homeCache = {
  chords:   [],
  artist:   "",
  title:    "",
  genre:    "All Genres",
  results:  [],
  searched: false,
  scrollY:  0,
};

// ---- Guitar SVG icon ----
function GuitarIcon() {
  return (
    <svg
      width="20" height="44" viewBox="0 0 20 44"
      fill="white" xmlns="http://www.w3.org/2000/svg"
      className="guitar-icon"
    >
      {/* Headstock */}
      <rect x="6" y="0" width="8" height="6" rx="2.5" />
      {/* Tuning pegs */}
      <circle cx="5"  cy="2.5" r="1.8" />
      <circle cx="15" cy="2.5" r="1.8" />
      {/* Neck */}
      <rect x="7.5" y="6" width="5" height="14" rx="1" />
      {/* Upper bout */}
      <ellipse cx="10" cy="24.5" rx="7"  ry="5.5" />
      {/* Lower bout */}
      <ellipse cx="10" cy="36"   rx="9"  ry="7.5" />
      {/* Sound hole — dark cutout */}
      <circle  cx="10" cy="30"   r="3.6" fill="#0d0d20" />
      {/* Bridge */}
      <rect x="7.5" y="41" width="5" height="2" rx="1" />
    </svg>
  );
}

// ---- Shared Navbar ----
function Navbar() {
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand">
        <GuitarIcon />
        <span className="brand-name">
          <span className="brand-chord">Chord</span><span className="brand-quest">Quest</span>
        </span>
      </a>
      <span className="navbar-cq">
        <span className="brand-chord">C</span><span className="brand-quest">Q</span>
      </span>
    </nav>
  );
}

// ---- Chord tag input ----
function ChordTagInput({ chords, onChange, onSubmit }) {
  const [text, setText] = useState("");

  const addChord = (raw) => {
    const trimmed = raw.trim().replace(/,/g, "");
    if (trimmed && !chords.includes(trimmed)) {
      onChange([...chords, trimmed]);
    }
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === " " && text.trim()) {
      e.preventDefault();
      addChord(text);
    } else if (e.key === "Enter") {
      if (text.trim()) {
        addChord(text);
      } else {
        onSubmit();
      }
    } else if (e.key === "Backspace" && text === "" && chords.length > 0) {
      onChange(chords.slice(0, -1));
    }
  };

  return (
    <div className="tag-input-wrapper">
      {chords.map((chord, i) => (
        <span key={i} className="tag-chip">
          {chord}
          <button
            className="tag-remove"
            onClick={() => onChange(chords.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-input"
        placeholder={chords.length === 0 ? "Your chords: C, G, Am, F…" : "Add more…"}
        value={text}
        onChange={(e) => {
          const val = e.target.value;
          if (val.endsWith(",")) {
            addChord(val.slice(0, -1));
          } else {
            setText(val);
          }
        }}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

// ---- Skeleton card ----
function SkeletonCard({ delay }) {
  return (
    <div className="song-card skeleton" style={{ animationDelay: `${delay}s` }}>
      <div className="skeleton-line wide" />
      <div className="skeleton-line narrow" />
      <div className="skeleton-chips">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton-chip" />)}
      </div>
    </div>
  );
}

// ---- Home ----
function Home() {
  const [chords, setChords]     = useState(homeCache.chords);
  const [artist, setArtist]     = useState(homeCache.artist);
  const [title, setTitle]       = useState(homeCache.title);
  const [genre, setGenre]       = useState(homeCache.genre);
  const [results, setResults]   = useState(homeCache.results);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(homeCache.searched);

  // Restore scroll after cached results render
  useEffect(() => {
    if (homeCache.scrollY > 0 && homeCache.results.length > 0) {
      window.scrollTo({ top: homeCache.scrollY, behavior: "instant" });
    }
  }, []);

  const userChords = new Set(chords);

  const updateChords = (v) => { homeCache.chords = v; setChords(v); };
  const updateArtist = (v) => { homeCache.artist = v; setArtist(v); };
  const updateTitle  = (v) => { homeCache.title  = v; setTitle(v); };
  const updateGenre  = (v) => { homeCache.genre  = v; setGenre(v); };

  const canSearch = chords.length > 0 || artist.trim() || title.trim() || genre !== "All Genres";

  const doSearch = async (searchChords, searchArtist, searchTitle, searchGenre) => {
    const canSearchNow = searchChords.length > 0 || searchArtist.trim() || searchTitle.trim() || searchGenre !== "All Genres";
    if (!canSearchNow) return;
    setLoading(true);
    homeCache.searched = true;
    setSearched(true);
    homeCache.results = [];
    setResults([]);
    homeCache.scrollY = 0;

    localStorage.setItem("userChords", searchChords.join(","));

    try {
      const params = new URLSearchParams({
        chords: searchChords.join(","),
        artist: searchArtist,
        title: searchTitle,
        genre: searchGenre === "All Genres" ? "" : searchGenre,
      });
      const res = await fetch(`http://127.0.0.1:8000/recommend?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const sliced = (data || []).slice(0, 50);
      homeCache.results = sliced;
      setResults(sliced);
    } catch (err) {
      console.error("Fetch failed:", err);
      homeCache.results = [];
      setResults([]);
    }

    setLoading(false);
  };

  const fetchSongs = () => doSearch(chords, artist, title, genre);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchSongs();
  };

  const saveScroll = () => {
    homeCache.scrollY = window.scrollY;
  };

  return (
    <div className="page">
      <div className="container">

        {/* ---- Search panel ---- */}
        <div className="search-panel">
          <p className="search-label">Search by chords, artist, song, or genre</p>
          <div className="input-grid">
            <ChordTagInput chords={chords} onChange={updateChords} onSubmit={fetchSongs} />
            <input
              className="artist-input"
              placeholder="Filter by artist"
              value={artist}
              onChange={(e) => updateArtist(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <input
              className="song-input"
              placeholder="Filter by song"
              value={title}
              onChange={(e) => updateTitle(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <select
              className="genre-select"
              value={genre}
              onChange={(e) => updateGenre(e.target.value)}
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button className="search-btn" onClick={fetchSongs} disabled={!canSearch}>
              Find Songs
            </button>
          </div>
        </div>

        {/* ---- Explore (shown only before first search) ---- */}
        {!searched && !loading && (
          <div className="explore-section">
            <p className="explore-label">Browse by genre</p>
            <div className="genre-tiles">
              {GENRES.slice(1).map((g) => (
                <button
                  key={g}
                  className="genre-tile"
                  onClick={() => { updateGenre(g); doSearch(chords, artist, title, g); }}
                >
                  <span className="genre-tile-icon">{GENRE_ICONS[g]}</span>
                  <span className="genre-tile-name">{g}</span>
                </button>
              ))}
            </div>

            <p className="explore-label" style={{ marginTop: "28px" }}>Try a progression</p>
            <div className="prog-list">
              {PROGRESSIONS.map((p) => (
                <button
                  key={p.name}
                  className="prog-item"
                  onClick={() => { updateChords(p.chords); doSearch(p.chords, artist, title, genre); }}
                >
                  <span className="prog-name">{p.name}</span>
                  <span className="prog-label">{p.label}</span>
                  <div className="prog-chips">
                    {p.chords.map((ch) => (
                      <span key={ch} className="prog-chip">{ch}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Skeleton loader ---- */}
        {loading && (
          <div className="results">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} delay={i * 0.07} />)}
          </div>
        )}

        {/* ---- Result count ---- */}
        {!loading && searched && (
          <div className="result-count">
            {results.length === 0
              ? "No songs found. Try different chords or filters."
              : `${results.length} songs found`}
          </div>
        )}

        {/* ---- Results ---- */}
        {!loading && (
          <div className="results">
            {results.map((song, index) => {
              const known   = song.chord_list.filter((ch) => userChords.has(ch));
              const missing = song.chord_list.filter((ch) => !userChords.has(ch));

              return (
                <Link
                  key={song.song_id}
                  className="song-card"
                  to={`/song/${song.song_id}`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                  onClick={saveScroll}
                >
                  <div className="song-card-header">
                    <span className="song-card-title">
                      {song.artist_name} — {song.song_name}
                    </span>
                    <div className="song-card-stats">
                      {song.genre && song.genre !== "Other" && (
                        <span className="genre-badge">{song.genre}</span>
                      )}
                      {song.rating_average && (
                        <span className="card-rating">
                          {"★".repeat(Math.round(song.rating_average))}
                          {"☆".repeat(5 - Math.round(song.rating_average))}{" "}
                          {song.rating_average.toFixed(1)}
                        </span>
                      )}
                      {song.chord_list.length === 0
                        ? <span className="badge badge-grey">No chord data</span>
                        : missing.length === 0
                          ? <span className="badge badge-green">✓ All chords known</span>
                          : <span className="badge badge-red">{missing.length} new chord{missing.length !== 1 ? "s" : ""}</span>
                      }
                    </div>
                  </div>

                  <div className="chip-row">
                    {known.map((ch) => (
                      <span key={ch} className="chip chip-known">{ch}</span>
                    ))}
                    {missing.map((ch) => (
                      <span key={ch} className="chip chip-missing">{ch}</span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/song/:id" element={<SongPage />} />
      </Routes>
    </>
  );
}
