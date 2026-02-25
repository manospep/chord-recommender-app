import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

// Same pattern as the Python chord extractor.
// (?![#\w]) instead of \b at the end: \b fails after '#' (non-word), causing
// the regex to backtrack and extract 'D' from 'D#'. The lookahead fixes that.
const CHORD_RE = /\b([A-G](?:#|b)?(?:maj7|maj|min7|min|m7|m|dim7|dim|aug|sus2|sus4|sus|add9|add11|add13|add|6|7|9|11|13|5)?)(?![#\w])/g;

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const chords = trimmed.match(CHORD_RE) || [];
  if (chords.length === 0) return false;
  // Chord lines are mostly chord tokens + whitespace
  const chordChars = chords.join("").length;
  const nonSpace   = trimmed.replace(/\s/g, "").length;
  return nonSpace > 0 && chordChars / nonSpace > 0.5;
}

function renderChordLine(line, knownChords) {
  const parts = [];
  let lastIndex = 0;
  CHORD_RE.lastIndex = 0;
  let match;

  while ((match = CHORD_RE.exec(line)) !== null) {
    // Text before this chord (spaces/dashes)
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const chord = match[0];
    const cls = knownChords.has(chord) ? "inline-chord-known" : "inline-chord-missing";
    parts.push(
      <span key={`${chord}-${match.index}`} className={cls}>{chord}</span>
    );
    lastIndex = match.index + chord.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

function ChordsAndLyrics({ text, knownChords }) {
  if (!text) return <p className="no-lyrics">No lyrics available</p>;

  const lines = text.split("\n");

  return (
    <div className="lyrics-pre">
      {lines.map((line, i) => {
        if (isChordLine(line)) {
          return (
            <div key={i} className="chord-line">
              {renderChordLine(line, knownChords)}
            </div>
          );
        }
        return (
          <div key={i} className="lyric-line">
            {line || "\u00A0"} {/* non-breaking space keeps blank lines */}
          </div>
        );
      })}
    </div>
  );
}

// ---- Star rating ----
function StarRating({ songId, initialAverage, initialCount }) {
  const storageKey = `rated_${songId}`;
  const [average, setAverage]     = useState(initialAverage);
  const [count, setCount]         = useState(initialCount);
  const [hovered, setHovered]     = useState(0);
  const [submitted, setSubmitted] = useState(() => !!localStorage.getItem(storageKey));
  const userRating = parseInt(localStorage.getItem(storageKey) || "0");

  const handleRate = async (star) => {
    if (submitted) return;
    const res = await fetch(`http://127.0.0.1:8000/song/${songId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: star }),
    });
    if (res.ok) {
      const data = await res.json();
      setAverage(data.average);
      setCount(data.count);
      setSubmitted(true);
      localStorage.setItem(storageKey, String(star));
    }
  };

  const displayRating = submitted ? userRating : hovered;

  return (
    <div className="rating-section">
      <div className="stars-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${displayRating >= star ? "star-filled" : "star-empty"} ${submitted ? "star-locked" : "star-interactive"}`}
            onMouseEnter={() => !submitted && setHovered(star)}
            onMouseLeave={() => !submitted && setHovered(0)}
            onClick={() => handleRate(star)}
          >
            ★
          </span>
        ))}
      </div>
      <div className="rating-meta">
        {submitted
          ? <span className="rating-submitted">Thanks for rating!</span>
          : <span className="rating-prompt">Rate this song</span>
        }
        {average && (
          <span className="rating-average">
            {average.toFixed(1)} ★ &nbsp;·&nbsp; {count} {count === 1 ? "rating" : "ratings"}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- Main page ----
export default function SongPage() {
  const { id } = useParams();
  const [song, setSong] = useState(null);

  // Read the chords the user searched with
  const knownChords = new Set(
    (localStorage.getItem("userChords") || "")
      .split(",").map((c) => c.trim()).filter(Boolean)
  );

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/song/${id}`)
      .then((r) => r.json())
      .then(setSong);
  }, [id]);

  if (!song) return <div className="loader" style={{ marginTop: "120px" }}>Loading…</div>;

  return (
    <div className="page">
      <div className="glass-card">

        <Link to="/" className="back-btn">← Back</Link>

        <h1 className="song-title">{song.song_name}</h1>
        <h2 className="song-artist">{song.artist_name}</h2>

        <StarRating
          songId={song.song_id}
          initialAverage={song.rating_average}
          initialCount={song.rating_count}
        />

        <hr className="divider" />

        <h3 className="section-header">🎵 Chords Used</h3>
        <div className="chip-row">
          {(song.chord_list || []).map((ch) => (
            <span key={ch} className={`chip ${knownChords.has(ch) ? "chip-known" : "chip-missing"}`}>
              {ch}
            </span>
          ))}
        </div>

        <h3 className="section-header" style={{ marginTop: "30px" }}>📄 Chords + Lyrics</h3>
        <ChordsAndLyrics text={song.chords_and_lyrics} knownChords={knownChords} />

      </div>
    </div>
  );
}
