import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

export default function SongPage() {
  const { id } = useParams();
  const [song, setSong] = useState(null);

  useEffect(() => {
    const fetchSong = async () => {
      const res = await fetch(`http://127.0.0.1:8000/song/${id}`);
      const data = await res.json();
      setSong(data);
    };

    fetchSong();
  }, [id]);

  if (!song) return <div className="loader" style={{ marginTop: "120px" }}>Loading…</div>;

  return (
    <div className="page">
      <div className="glass-card" style={{ width: "900px" }}>

        <Link to="/" className="back-btn">
          ← Back
        </Link>

        <h1 className="song-title">{song.song_name}</h1>
        <h2 className="song-artist">{song.artist_name}</h2>

        <hr className="divider" />

        <h3 className="section-header">🎵 Chords Used</h3>
        <div className="chip-row">
          {(song.chord_list || []).map((ch) => (
            <span key={ch} className="chip chip-known">
              {ch}
            </span>
          ))}
        </div>

        <h3 className="section-header" style={{ marginTop: "30px" }}>
          📄 Chords + Lyrics
        </h3>

        {/* EXACT SAME structure you had before */}
        <pre className="lyrics-pre">
          {song.chords_and_lyrics || "No lyrics available"}
        </pre>
      </div>
    </div>
  );
}
