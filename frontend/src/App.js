import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import SongPage from "./SongPage";
import "./App.css";
import logo from "./assets/logo.png";   // <-- ADD LOGO IMPORT

function Home() {
  const [input, setInput] = useState("");
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Parse user's known chords into a Set for fast lookup
  const userChords = new Set(
    input.split(",").map((c) => c.trim()).filter(Boolean)
  );

  const fetchSongs = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ chords: input, artist, title });
      const res = await fetch(`http://127.0.0.1:8000/recommend?${params}`);

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      setResults((data || []).slice(0, 50));
    } catch (err) {
      console.error("Fetch failed:", err);
      alert("Could not reach the backend. Make sure the server is running.");
      setResults([]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchSongs();
  };

  return (
    <div className="page">
      <div className="glass-card">

        {/* ---- TITLE WITH LOGO ---- */}
        <h1 className="title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <img
            src={logo}
            alt="Chord App Logo"
            style={{ height: "55px", filter: "drop-shadow(0px 0px 6px rgba(255,255,255,0.5))" }}
          />
          Chord Song Recommender
        </h1>

        {/* --- SEARCH UI --- */}
        <div className="input-grid">
          <input
            className="chord-input"
            placeholder="Chords: C, G, Am, F"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            className="artist-input"
            placeholder="Artist (optional)"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            className="song-input"
            placeholder="Song title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-btn" onClick={fetchSongs}>
            Search
          </button>
        </div>

        {loading && <div className="loader">Searching…</div>}

        {/* --- RESULT COUNT --- */}
        {!loading && searched && (
          <div className="result-count">
            {results.length === 0
              ? "No songs found. Try different chords or filters."
              : `${results.length} songs found`}
          </div>
        )}

        {/* --- RESULTS --- */}
        <div className="results">
          {results.map((song) => {
            const known = song.chord_list.filter((ch) => userChords.has(ch));
            const missing = song.chord_list.filter((ch) => !userChords.has(ch));

            return (
              <Link
                key={song.song_id}
                className="song-card"
                to={`/song/${song.song_id}`}
              >
                <div className="song-card-header">
                  <span className="song-card-title">
                    {song.artist_name} — {song.song_name}
                  </span>
                  <span className="song-card-stats">
                    {missing.length === 0
                      ? <span className="badge badge-green">✓ You know all chords</span>
                      : <span className="badge badge-red">{missing.length} new chord{missing.length !== 1 ? "s" : ""}</span>
                    }
                  </span>
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

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/song/:id" element={<SongPage />} />
    </Routes>
  );
}
