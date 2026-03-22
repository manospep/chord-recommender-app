import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChordDiagramRow } from "./ChordDiagram";
import "./App.css";

// ─── Chord regex ──────────────────────────────────────────────────────────────
// (?![#\w]) instead of \b: \b fails after '#' causing D# to backtrack to D.
const CHORD_RE = /\b([A-G](?:#|b)?(?:maj7|maj|min7|min|m7|m|dim7|dim|aug|sus2|sus4|sus|add9|add11|add13|add|6|7|9|11|13|5)?)(?![#\w])/g;

// ─── Transpose helpers ────────────────────────────────────────────────────────
const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

function transposeNote(note, n) {
  let idx = SHARP.indexOf(note);
  if (idx === -1) idx = FLAT.indexOf(note);
  if (idx === -1) return note;
  const ni = ((idx + n) % 12 + 12) % 12;
  return (n >= 0 ? SHARP : FLAT)[ni];
}

function transposeChord(chord, n) {
  if (!n) return chord;
  const m = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  return transposeNote(m[1], n) + m[2];
}

// ─── Chord line rendering (with transpose) ────────────────────────────────────
function renderChordLine(line, knownChords, semitones) {
  const parts = [];
  let lastIndex = 0;
  CHORD_RE.lastIndex = 0;
  let match;

  while ((match = CHORD_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const original = match[0];
    const chord    = transposeChord(original, semitones);
    const cls = knownChords.has(chord) ? "inline-chord-known" : "inline-chord-missing";
    // Preserve original spacing: pad/trim to keep alignment
    const pad = " ".repeat(Math.max(0, original.length - chord.length));
    parts.push(
      <span key={`${original}-${match.index}`} className={cls}>{chord}{pad}</span>
    );
    lastIndex = match.index + original.length;
  }

  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const chords  = trimmed.match(CHORD_RE) || [];
  if (chords.length === 0) return false;
  const chordChars = chords.join("").length;
  const nonSpace   = trimmed.replace(/\s/g, "").length;
  return nonSpace > 0 && chordChars / nonSpace > 0.5;
}

function ChordsAndLyrics({ text, knownChords, semitones }) {
  if (!text) return <p className="no-lyrics">No lyrics available</p>;
  return (
    <div className="lyrics-pre">
      {text.split("\n").map((line, i) => {
        if (isChordLine(line)) {
          return (
            <div key={i} className="chord-line">
              {renderChordLine(line, knownChords, semitones)}
            </div>
          );
        }
        return (
          <div key={i} className="lyric-line">
            {line || "\u00A0"}
          </div>
        );
      })}
    </div>
  );
}

// ─── Transpose control ────────────────────────────────────────────────────────
function TransposeControl({ value, onChange }) {
  const label = value === 0
    ? "Original key"
    : `${value > 0 ? "+" : ""}${value} semitone${Math.abs(value) !== 1 ? "s" : ""}`;

  return (
    <div className="transpose-control">
      <span className="transpose-title">Transpose</span>
      <button className="transpose-btn" onClick={() => onChange(value - 1)}>−</button>
      <span className="transpose-label">{label}</span>
      <button className="transpose-btn" onClick={() => onChange(value + 1)}>+</button>
      {value !== 0 && (
        <button className="transpose-reset" onClick={() => onChange(0)}>Reset</button>
      )}
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ songId, initialAverage, initialCount }) {
  const storageKey = `rated_${songId}`;
  const [average, setAverage]     = useState(initialAverage);
  const [count, setCount]         = useState(initialCount);
  const [hovered, setHovered]     = useState(0);
  const [submitted, setSubmitted] = useState(() => !!localStorage.getItem(storageKey));
  const userRating = parseInt(localStorage.getItem(storageKey) || "0");

  const handleRate = async (star) => {
    if (submitted) return;
    const res = await fetch(`${process.env.REACT_APP_API_URL}/song/${songId}/rate`, {
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
          >★</span>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SongPage() {
  const { id } = useParams();
  const [song, setSong]           = useState(null);
  const [error, setError]         = useState(false);
  const [transpose, setTranspose] = useState(0);

  const knownChords = new Set(
    (localStorage.getItem("userChords") || "")
      .split(",").map((c) => c.trim()).filter(Boolean)
  );

  useEffect(() => {
    setError(false);
    setSong(null);
    fetch(`${process.env.REACT_APP_API_URL}/song/${id}`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setSong)
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <div className="page">
      <div className="glass-card" style={{ textAlign: "center" }}>
        <Link to="/" className="back-btn">← Back</Link>
        <div style={{ fontSize: "52px", margin: "32px 0 16px" }}>🎵</div>
        <h2 className="song-title" style={{ fontSize: "26px" }}>Song not found</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", marginTop: "8px", fontSize: "15px" }}>
          This song may have been removed or the link is invalid.
        </p>
      </div>
    </div>
  );

  if (!song) return <div className="loader" style={{ marginTop: "120px" }}>Loading…</div>;

  // Transposed chord list for chips + diagrams
  const transposedChords = (song.chord_list || []).map((ch) => transposeChord(ch, transpose));

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

        <div className="chords-header-row">
          <h3 className="section-header" style={{ margin: 0 }}>🎵 Chords Used</h3>
          <TransposeControl value={transpose} onChange={setTranspose} />
        </div>

        <div className="chip-row" style={{ marginTop: "12px" }}>
          {transposedChords.map((ch) => (
            <span key={ch} className={`chip ${knownChords.has(ch) ? "chip-known" : "chip-missing"}`}>
              {ch}
            </span>
          ))}
        </div>

        <ChordDiagramRow chords={transposedChords} knownChords={knownChords} />

        <h3 className="section-header" style={{ marginTop: "30px" }}>📄 Chords + Lyrics</h3>
        <ChordsAndLyrics
          text={song.chords_and_lyrics}
          knownChords={knownChords}
          semitones={transpose}
        />

      </div>
    </div>
  );
}
