import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChordDiagramRow, ChordTabRow, ChordDiagram, CHORD_SHAPES } from "./ChordDiagram";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import "./App.css";

// ─── Chord regex ──────────────────────────────────────────────────────────────
const CHORD_RE = /\b([A-G](?:#|b)?(?:maj(?:7|9|11|13)?|min(?:7|9|11|13)?|m(?:7|9|11|13)?|dim(?:7)?|aug(?:7)?|sus(?:2|4)?|add(?:9|11|13)|[0-9]{1,2})?(?:\([^)]+\))?)(?![#\w])/g;

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

export function transposeChord(chord, n) {
  if (!n) return chord;
  const m = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  return transposeNote(m[1], n) + m[2];
}

export function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  CHORD_RE.lastIndex = 0;
  const chords  = trimmed.match(CHORD_RE) || [];
  if (chords.length === 0) return false;
  const chordChars = chords.join("").length;
  const nonSpace   = trimmed.replace(/\s/g, "").length;
  return nonSpace > 0 && chordChars / nonSpace > 0.5;
}

// Strip slash bass note and parenthetical suffix for shape lookup
function shapeKey(chord) {
  return chord.split("/")[0].replace(/\(.*\)$/, "").trim();
}

// ─── Chord line rendering ─────────────────────────────────────────────────────
function renderChordLine(line, knownChords, semitones, onChordClick) {
  const parts = [];
  let lastIndex = 0;
  CHORD_RE.lastIndex = 0;
  let match;
  while ((match = CHORD_RE.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
    const original = match[0];
    const chord    = transposeChord(original, semitones);
    const cls      = knownChords.has(chord) ? "inline-chord-known" : "inline-chord-missing";
    const pad      = " ".repeat(Math.max(0, original.length - chord.length));
    const key      = shapeKey(chord);
    const hasShape = !!CHORD_SHAPES[key];
    parts.push(
      <span
        key={`${original}-${match.index}`}
        className={`${cls}${hasShape ? " chord-clickable" : ""}`}
        onClick={hasShape ? (e) => { e.stopPropagation(); onChordClick(key, e.currentTarget); } : undefined}
      >
        {chord}{pad}
      </span>
    );
    lastIndex = match.index + original.length;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function ChordsAndLyrics({ text, knownChords, semitones, onChordClick }) {
  if (!text) return <p className="no-lyrics">No lyrics available</p>;
  return (
    <div className="lyrics-pre">
      {text.split("\n").map((line, i) =>
        isChordLine(line)
          ? <div key={i} className="chord-line">{renderChordLine(line, knownChords, semitones, onChordClick)}</div>
          : <div key={i} className="lyric-line">{line || " "}</div>
      )}
    </div>
  );
}

// ─── Chord popover ────────────────────────────────────────────────────────────
const ChordPopover = React.forwardRef(function ChordPopover({ chord, known, anchor, onClose }, ref) {
  const left   = Math.min(Math.max(anchor.left + anchor.width / 2, 90), window.innerWidth - 90);
  const below  = anchor.bottom + 10;
  const flipUp = below + 190 > window.innerHeight;

  return (
    <div
      ref={ref}
      className="chord-popover"
      style={{
        top:       flipUp ? anchor.top - 10 : below,
        left,
        transform: flipUp ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)",
      }}
    >
      <div className="chord-popover-header">
        <span className="chord-popover-name">{chord}</span>
        <button className="chord-popover-close" onClick={onClose}>×</button>
      </div>
      <ChordDiagram name={chord} known={known} />
    </div>
  );
});

// ─── Transpose control ────────────────────────────────────────────────────────
function TransposeControl({ value, onChange }) {
  const label = value === 0
    ? "Original key"
    : `${value > 0 ? "+" : ""}${value} semitone${Math.abs(value) !== 1 ? "s" : ""}`;
  return (
    <div className="transpose-control">
      <span className="transpose-title">Transpose</span>
      <button className="transpose-btn" onClick={() => onChange(value - 1)} title="Down (←)">−</button>
      <span className="transpose-label">{label}</span>
      <button className="transpose-btn" onClick={() => onChange(value + 1)} title="Up (→)">+</button>
      {value !== 0 && <button className="transpose-reset" onClick={() => onChange(0)}>Reset</button>}
    </div>
  );
}

// ─── Star rating ─────────────────────────────────────────────────────────────
function StarRating({ songId, initialAverage, initialCount }) {
  const { user, ratesSong, getUserRating } = useAuth();
  const toast = useToast();
  const [average, setAverage]     = useState(initialAverage);
  const [count, setCount]         = useState(initialCount);
  const [userRating, setUserRating] = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserRating(songId).then(r => { if (r) setUserRating(r); });
  }, [user, songId]); // eslint-disable-line

  const handleRate = useCallback(async (star) => {
    if (!user || busy) return;
    setBusy(true);
    const prevAvg    = average;
    const prevCount  = count;
    const prevRating = userRating;

    // Optimistic update — replace existing vote or add new one
    const newCount = prevRating ? count : (count || 0) + 1;
    const newSum   = (average || 0) * (count || 0) - (prevRating || 0) + star;
    setAverage(newCount > 0 ? newSum / newCount : star);
    setCount(newCount);
    setUserRating(star);

    const { error } = await ratesSong(songId, star);
    if (error) {
      setAverage(prevAvg);
      setCount(prevCount);
      setUserRating(prevRating);
      toast("Failed to save rating", "error", 2000);
    }
    setBusy(false);
  }, [user, busy, average, count, userRating, songId, ratesSong, toast]); // eslint-disable-line

  const displayRating = hovered || userRating;

  if (!user) return (
    <div className="rating-section">
      <div className="stars-row">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className="star star-empty star-locked">★</span>
        ))}
      </div>
      <div className="rating-meta">
        <Link to="/auth" className="rating-prompt">Sign in to rate</Link>
        {average && (
          <span className="rating-average">
            {average.toFixed(1)} ★ &nbsp;·&nbsp; {count} {count === 1 ? "rating" : "ratings"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="rating-section">
      <div className="stars-row">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${displayRating >= star ? "star-filled" : "star-empty"} ${busy ? "star-locked" : "star-interactive"}`}
            onMouseEnter={() => !busy && setHovered(star)}
            onMouseLeave={() => !busy && setHovered(0)}
            onClick={() => handleRate(star)}
          >★</span>
        ))}
      </div>
      <div className="rating-meta">
        {userRating
          ? <span className="rating-submitted">Your rating: {userRating}/5 — click to change</span>
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

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ song }) {
  const toast = useToast();
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${song.song_name} — ${song.artist_name}`, url }); return; }
      catch (_) {}
    }
    await navigator.clipboard.writeText(url);
    toast("Link copied to clipboard!", "success", 2000);
  }, [song, toast]);
  return (
    <button className="share-btn" onClick={handleShare} title="Share this song">Share</button>
  );
}

// ─── Favorite button ──────────────────────────────────────────────────────────
function FavoriteButton({ song }) {
  const { user, addFavorite, removeFavorite, isFavorited } = useAuth();
  const toast = useToast();
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    if (user && song) isFavorited(song.song_id).then(setFavorited);
  }, [user, song]); // eslint-disable-line

  const toggle = useCallback(async () => {
    setBusy(true);
    if (favorited) {
      await removeFavorite(song.song_id);
      setFavorited(false);
      toast("Removed from favorites", "success", 2000);
    } else {
      await addFavorite(song);
      setFavorited(true);
      toast("Saved to favorites!", "success", 2000);
    }
    setBusy(false);
  }, [favorited, song, addFavorite, removeFavorite, toast]);

  if (!user) return (
    <Link to="/auth" className="favorite-btn favorite-btn-off" title="Sign in to save">♡</Link>
  );
  return (
    <button
      className={`favorite-btn ${favorited ? "favorite-btn-on" : "favorite-btn-off"}`}
      onClick={toggle}
      disabled={busy}
      title={favorited ? "Remove from favorites" : "Save to favorites"}
    >
      {favorited ? "♥" : "♡"}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SongPage() {
  const { id } = useParams();
  const [song, setSong]           = useState(null);
  const [error, setError]         = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [activeChord, setActiveChord]     = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [chordView, setChordView]         = useState("diagrams");
  const abortRef   = useRef(null);
  const popoverRef = useRef(null);

  const knownChords = useMemo(() => new Set(
    (localStorage.getItem("userChords") || "").split(",").map(c => c.trim()).filter(Boolean)
  ), []); // eslint-disable-line

  useEffect(() => {
    setError(false);
    setSong(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    fetch(`${process.env.REACT_APP_API_URL}/song/${id}`, { signal: abortRef.current.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setSong)
      .catch(err => { if (err.name !== "AbortError") setError(true); });
    return () => abortRef.current?.abort();
  }, [id]);

  // Save to recently viewed when song loads
  useEffect(() => {
    if (!song) return;
    try {
      const recent = JSON.parse(localStorage.getItem("cq_recent") || "[]");
      const next = [
        { song_id: song.song_id, song_name: song.song_name, artist_name: song.artist_name, genre: song.genre },
        ...recent.filter(s => s.song_id !== song.song_id),
      ].slice(0, 8);
      localStorage.setItem("cq_recent", JSON.stringify(next));
    } catch {}
  }, [song]);

  // Dismiss chord popover on outside click or Escape
  useEffect(() => {
    if (!activeChord) return;
    const onKey   = (e) => { if (e.key === "Escape") setActiveChord(null); };
    const onMouse = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setActiveChord(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [activeChord]);

  const handleChordClick = useCallback((chord, el) => {
    if (activeChord === chord) { setActiveChord(null); return; }
    setPopoverAnchor(el.getBoundingClientRect());
    setActiveChord(chord);
  }, [activeChord]);

  const adjustTranspose = useCallback((delta) => setTranspose(t => t + delta), []);
  const resetTranspose  = useCallback(() => setTranspose(0), []);

  useKeyboardShortcut("ArrowRight", () => adjustTranspose(1),  { ignoreInputs: true });
  useKeyboardShortcut("ArrowLeft",  () => adjustTranspose(-1), { ignoreInputs: true });
  useKeyboardShortcut("0",          resetTranspose,             { ignoreInputs: true });

  const transposedChords = useMemo(
    () => (song?.chord_list || []).map(ch => transposeChord(ch, transpose)),
    [song, transpose]
  );

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

  const pageUrl   = `https://chord-recommender-app.vercel.app/song/${song.song_id}`;
  const metaTitle = `${song.song_name} — ${song.artist_name} chords | ChordQuest`;
  const metaDesc  = `Guitar chords for ${song.song_name} by ${song.artist_name}. Chords used: ${(song.chord_list || []).slice(0, 6).join(", ")}. Play along with the full chord chart on ChordQuest.`;

  return (
    <div className="page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="glass-card">
        <Link to="/" className="back-btn">← Back</Link>

        <div className="song-title-row">
          <div>
            <h1 className="song-title">{song.song_name}</h1>
            <h2 className="song-artist">{song.artist_name}</h2>
          </div>
          <div className="song-title-actions">
            <ShareButton song={song} />
            <FavoriteButton song={song} />
          </div>
        </div>

        <StarRating
          songId={song.song_id}
          initialAverage={song.rating_average}
          initialCount={song.rating_count}
        />

        <hr className="divider" />

        <div className="chords-header-row">
          <h3 className="section-header" style={{ margin: 0 }}>Chords Used</h3>
          <TransposeControl value={transpose} onChange={setTranspose} />
        </div>

        {transpose !== 0 && (
          <p className="transpose-hint">← → arrow keys to transpose · 0 to reset</p>
        )}
        {transpose === 0 && (
          <p className="transpose-hint">Use ← → arrow keys to transpose</p>
        )}

        <div className="chip-row" style={{ marginTop: "12px" }}>
          {transposedChords.map(ch => (
            <span key={ch} className={`chip ${knownChords.has(ch) ? "chip-known" : "chip-missing"}`}>{ch}</span>
          ))}
        </div>

        <div className="chord-view-toggle">
          <button
            className={`view-toggle-btn${chordView === "diagrams" ? " view-toggle-active" : ""}`}
            onClick={() => setChordView("diagrams")}
          >Diagrams</button>
          <button
            className={`view-toggle-btn${chordView === "tab" ? " view-toggle-active" : ""}`}
            onClick={() => setChordView("tab")}
          >Tab</button>
        </div>

        {chordView === "diagrams"
          ? <ChordDiagramRow chords={transposedChords} knownChords={knownChords} />
          : <ChordTabRow     chords={transposedChords} knownChords={knownChords} />
        }

        <h3 className="section-header" style={{ marginTop: "30px" }}>
          Chords + Lyrics
          <span className="lyrics-hint"> — tap any chord to see fingering</span>
        </h3>
        <ChordsAndLyrics
          text={song.chords_and_lyrics}
          knownChords={knownChords}
          semitones={transpose}
          onChordClick={handleChordClick}
        />
      </div>

      {activeChord && popoverAnchor && (
        <ChordPopover
          ref={popoverRef}
          chord={activeChord}
          known={knownChords.has(activeChord)}
          anchor={popoverAnchor}
          onClose={() => setActiveChord(null)}
        />
      )}
    </div>
  );
}
