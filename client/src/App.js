import React, {
  useState, useEffect, useRef, useCallback, useMemo,
  useReducer, useTransition, useDeferredValue, Suspense, lazy,
} from "react";
import { Routes, Route, Link } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useDebounce } from "./hooks/useDebounce";
import { CHORD_SHAPES } from "./ChordDiagram";
import "./App.css";

// ---- Lazy-loaded routes (code-split per page) ----
const SongPage     = lazy(() => import("./SongPage"));
const AuthPage     = lazy(() => import("./AuthPage"));
const ProfilePage  = lazy(() => import("./ProfilePage"));
const VerifiedPage = lazy(() => import("./VerifiedPage"));
const ArtistsPage  = lazy(() => import("./ArtistsPage"));
const ArtistPage   = lazy(() => import("./ArtistPage"));

const GENRES = [
  "All Genres", "Metal", "Rock", "Pop", "Hip Hop", "R&B / Soul",
  "Country", "Jazz", "Blues", "Electronic", "Folk", "Classical", "Reggae", "Latin", "Other",
];

const PROGRESSIONS = [
  { name: "Pop / Rock",  label: "I – V – vi – IV", chords: ["C", "G", "Am", "F"] },
  { name: "Minor Pop",   label: "vi – IV – I – V",  chords: ["Am", "F", "C", "G"] },
  { name: "50s",         label: "I – vi – IV – V",  chords: ["C", "Am", "F", "G"] },
  { name: "Blues",       label: "12-bar shuffle",   chords: ["A", "D", "E"] },
  { name: "Jazz",        label: "ii – V – I",       chords: ["Dm", "G7", "Cmaj7"] },
  { name: "Rock Anthem", label: "i – VII – VI",     chords: ["Am", "G", "F"] },
];


// Genre accent colors for tile strips
const GENRE_COLORS = {
  "Metal":      ["#ff4757", "#c0392b"],
  "Rock":       ["#ff6348", "#d63031"],
  "Pop":        ["#fd79a8", "#e84393"],
  "Hip Hop":    ["#a29bfe", "#6c5ce7"],
  "R&B / Soul": ["#fd79a8", "#b44fff"],
  "Country":    ["#fdcb6e", "#e17055"],
  "Jazz":       ["#55efc4", "#00b894"],
  "Blues":      ["#74b9ff", "#0984e3"],
  "Electronic": ["#00e5ff", "#b84fff"],
  "Folk":       ["#b8e994", "#6ab04c"],
  "Classical":  ["#ffeaa7", "#f9ca24"],
  "Reggae":     ["#55efc4", "#079992"],
  "Latin":      ["#fd79a8", "#fdcb6e"],
  "Other":      ["#b2bec3", "#636e72"],
};

// ---- Search state machine ----
function searchReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SEARCH_START":
      return { ...state, status: "loading", searched: true, results: [], oneChordAway: [] };
    case "SEARCH_SUCCESS":
      return { ...state, status: "success", results: action.results, oneChordAway: action.oca };
    case "SEARCH_ERROR":
      return { ...state, status: "error", results: [], oneChordAway: [] };
    default:
      return state;
  }
}

// Module-level scroll cache — survives React unmount/remount
const scrollCache = { y: 0 };

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem("cq_search");
    if (raw) return { ...JSON.parse(raw), status: "success" };
  } catch {}
  return {
    chords: [], artist: "", title: "", genre: "All Genres",
    results: [], oneChordAway: [], status: "idle", searched: false,
  };
}

// ---- Guitar strings decoration (horizontal) ----
// ---- Neon guitar illustration ----
function HeroGuitar() {
  const NUT_Y    = 58;
  const NECK_LEN = 134;
  const BODY_Y   = NUT_Y + NECK_LEN; // 192

  const fretYs = [1,2,3,4,5,6,7,8,9,10,11,12].map(
    n => NUT_Y + NECK_LEN * (1 - Math.pow(2, -n / 12))
  );
  const neckHW = (y) => 20 + 7 * ((y - NUT_Y) / NECK_LEN);
  const slotY  = (f) => (fretYs[f - 2] + fretYs[f - 1]) / 2;

  const nutXs    = [-11, -6.6, -2.2, 2.2, 6.6, 11].map(d => 100 + d);
  const bridgeXs = [-13, -7.8, -2.6, 2.6, 7.8, 13].map(d => 100 + d);

  // Shared path data
  const bodyD = `
    M 127 ${BODY_Y}
    C 154 ${BODY_Y} 156 215 153 240
    C 150 265 140 276 140 288
    C 140 300 155 318 154 352
    C 153 390 136 436 100 438
    C  64 436  47 390  46 352
    C  45 318  60 300  60 288
    C  60 276  50 265  47 240
    C  44 215  46 ${BODY_Y}  73 ${BODY_Y}
    Z`;
  const neckD  = `M 80 ${NUT_Y} L 120 ${NUT_Y} L 127 ${BODY_Y} L 73 ${BODY_Y} Z`;
  const headD  = `M 80 ${NUT_Y} L 120 ${NUT_Y} L 122 16 C 122 7 114 3 107 3 L 93 3 C 86 3 78 7 78 16 Z`;

  return (
    <svg viewBox="0 0 200 470" className="hero-guitar" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="strGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(120,235,255,0.90)" />
          <stop offset="100%" stopColor="rgba(255,45,180,0.70)" />
        </linearGradient>
      </defs>

      {/* BODY — cyan, glow layer then bright line */}
      <path d={bodyD} stroke="#00e5ff" strokeWidth="9"   opacity="0.22" />
      <path d={bodyD} stroke="#00e5ff" strokeWidth="2.2" opacity="0.95" />

      {/* SOUND HOLE */}
      <circle cx="100" cy="352" r="30" stroke="#00e5ff" strokeWidth="8"   opacity="0.20" />
      <circle cx="100" cy="352" r="30" stroke="#00e5ff" strokeWidth="2"   opacity="0.90" />
      <circle cx="100" cy="352" r="25" stroke="#00e5ff" strokeWidth="0.8" opacity="0.35" />
      <circle cx="100" cy="352" r="20" stroke="#00e5ff" strokeWidth="0.6" opacity="0.25" />

      {/* BRIDGE */}
      <rect x="83" y="406" width="34" height="9" rx="3"
        stroke="#00e5ff" strokeWidth="7"   opacity="0.20" />
      <rect x="83" y="406" width="34" height="9" rx="3"
        stroke="#00e5ff" strokeWidth="1.8" opacity="0.90" />
      <rect x="84" y="408" width="32" height="3" rx="1.5"
        stroke="#00e5ff" strokeWidth="1.5" opacity="0.60" />

      {/* NECK — pink, glow then bright */}
      <path d={neckD} stroke="#ff2db4" strokeWidth="8"   opacity="0.22" />
      <path d={neckD} stroke="#ff2db4" strokeWidth="1.8" opacity="0.95" />

      {/* FRET LINES */}
      {fretYs.map((y, i) => {
        const hw = neckHW(y);
        return (
          <line key={i} x1={100-hw} y1={y} x2={100+hw} y2={y}
            stroke="#ff2db4"
            strokeWidth={i === 11 ? 1.2 : 0.75}
            opacity={i === 11 ? 0.85 : 0.50} />
        );
      })}

      {/* POSITION DOTS */}
      {[3, 5, 7, 9].map(f => (
        <circle key={f} cx="100" cy={slotY(f)} r="2.4" fill="#ff2db4" opacity="0.80" />
      ))}
      <circle cx="94"  cy={slotY(12)} r="2.2" fill="#ff2db4" opacity="0.80" />
      <circle cx="106" cy={slotY(12)} r="2.2" fill="#ff2db4" opacity="0.80" />

      {/* HEADSTOCK — pink */}
      <path d={headD} stroke="#ff2db4" strokeWidth="8"   opacity="0.22" />
      <path d={headD} stroke="#ff2db4" strokeWidth="1.8" opacity="0.95" />

      {/* NUT */}
      <rect x="80" y={NUT_Y - 3} width="40" height="4" rx="2"
        stroke="#ff2db4" strokeWidth="1.6" opacity="0.95" />

      {/* TUNING PEGS — 3+3 */}
      {[12, 26, 40].map(py => (
        <g key={`L${py}`}>
          <line x1="78" y1={py} x2="64" y2={py} stroke="#ff2db4" strokeWidth="1" opacity="0.75" />
          <circle cx="60" cy={py} r="5" stroke="#ff2db4" strokeWidth="6"   opacity="0.18" />
          <circle cx="60" cy={py} r="5" stroke="#ff2db4" strokeWidth="1.4" opacity="0.90" />
          <circle cx="60" cy={py} r="2" fill="#ff2db4" opacity="0.85" />
        </g>
      ))}
      {[12, 26, 40].map(py => (
        <g key={`R${py}`}>
          <line x1="122" y1={py} x2="136" y2={py} stroke="#ff2db4" strokeWidth="1" opacity="0.75" />
          <circle cx="140" cy={py} r="5" stroke="#ff2db4" strokeWidth="6"   opacity="0.18" />
          <circle cx="140" cy={py} r="5" stroke="#ff2db4" strokeWidth="1.4" opacity="0.90" />
          <circle cx="140" cy={py} r="2" fill="#ff2db4" opacity="0.85" />
        </g>
      ))}

      {/* STRINGS */}
      {nutXs.map((x1, i) => (
        <line key={i}
          x1={x1}          y1={NUT_Y + 4}
          x2={bridgeXs[i]} y2={412}
          stroke="url(#strGrad)"
          strokeWidth={0.5 + i * 0.10}
          opacity={0.70 - i * 0.04}
        />
      ))}
    </svg>
  );
}

// ---- Guitar SVG icon ----
function GuitarIcon() {
  return (
    <svg width="20" height="44" viewBox="0 0 20 44" fill="white" xmlns="http://www.w3.org/2000/svg" className="guitar-icon">
      <rect x="6" y="0" width="8" height="6" rx="2.5" />
      <circle cx="5"  cy="2.5" r="1.8" />
      <circle cx="15" cy="2.5" r="1.8" />
      <rect x="7.5" y="6" width="5" height="14" rx="1" />
      <ellipse cx="10" cy="24.5" rx="7"  ry="5.5" />
      <ellipse cx="10" cy="36"   rx="9"  ry="7.5" />
      <circle  cx="10" cy="30"   r="3.6" fill="var(--guitar-hole)" />
      <rect x="7.5" y="41" width="5" height="2" rx="1" />
    </svg>
  );
}

// ---- Navbar ----
function resetHome() {
  sessionStorage.removeItem("cq_search");
}

function Navbar({ theme, onToggleTheme }) {
  const { user, profile } = useAuth();
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand" onClick={resetHome}>
        <GuitarIcon />
        <span className="brand-name">
          <span className="brand-chord">Chord</span><span className="brand-quest">Quest</span>
        </span>
      </a>
      <a href="/" className="navbar-cq" onClick={resetHome}>
        <span className="brand-chord">C</span><span className="brand-quest">Q</span>
      </a>
      <div className="navbar-right">
        <Link to="/artists" className="navbar-artists-link">Artists</Link>
        {user ? (
          <Link to="/profile" className="navbar-avatar" title="Your profile">
            {(profile?.display_name || user.email || "?")[0].toUpperCase()}
          </Link>
        ) : (
          <Link to="/auth" className="navbar-signin-btn">Sign in</Link>
        )}
        <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}

// ---- Autocomplete input (artist / title fields) ----
const ALL_CHORD_NAMES = Object.keys(CHORD_SHAPES);

function AutocompleteInput({ className, placeholder, value, onChange, onKeyDown, field, crossValue = "" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [open, setOpen]               = useState(false);
  const wrapRef                       = useRef(null);
  const debouncedQ                    = useDebounce(value, 200);
  const debouncedCross                = useDebounce(crossValue, 200);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) { setSuggestions([]); setOpen(false); return; }
    const crossParam = field === "title"
      ? `&artist_filter=${encodeURIComponent(debouncedCross)}`
      : `&title_filter=${encodeURIComponent(debouncedCross)}`;
    fetch(`${process.env.REACT_APP_API_URL}/autocomplete?q=${encodeURIComponent(debouncedQ)}&field=${field}&limit=8${crossParam}`)
      .then(r => r.json())
      .then(data => { setSuggestions(data); setOpen(data.length > 0); setActiveIdx(-1); })
      .catch(() => {});
  }, [debouncedQ, field, debouncedCross]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback((s) => {
    onChange({ target: { value: s } });
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]); return; }
      if (e.key === "Escape")     { setOpen(false); return; }
    }
    onKeyDown?.(e);
  }, [open, suggestions, activeIdx, select, onKeyDown]);

  return (
    <div className="autocomplete-wrapper" ref={wrapRef}>
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={s}
              className={`autocomplete-item${i === activeIdx ? " autocomplete-item-active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Chord tag input ----
function ChordTagInput({ chords, onChange, onSubmit, inputRef }) {
  const [text, setText]         = useState("");
  const [suggOpen, setSuggOpen] = useState(false);
  const [activeSugg, setActiveSugg] = useState(-1);
  const wrapRef = useRef(null);

  const chordSuggestions = useMemo(() => {
    if (!text || text.length < 1) return [];
    const tl = text.toLowerCase();
    const starts   = ALL_CHORD_NAMES.filter(c => c.toLowerCase().startsWith(tl));
    const contains = ALL_CHORD_NAMES.filter(c => !c.toLowerCase().startsWith(tl) && c.toLowerCase().includes(tl));
    return [...starts, ...contains].slice(0, 8);
  }, [text]);

  useEffect(() => {
    setSuggOpen(chordSuggestions.length > 0);
    setActiveSugg(-1);
  }, [chordSuggestions]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setSuggOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addChord = useCallback((raw) => {
    const trimmed = raw.trim().replace(/,/g, "");
    if (trimmed && !chords.includes(trimmed)) onChange([...chords, trimmed]);
    setText("");
    setSuggOpen(false);
  }, [chords, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (suggOpen && chordSuggestions.length > 0) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setActiveSugg(i => Math.min(i + 1, chordSuggestions.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setActiveSugg(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && activeSugg >= 0) { e.preventDefault(); addChord(chordSuggestions[activeSugg]); return; }
      if (e.key === "Escape")     { setSuggOpen(false); return; }
    }
    if (e.key === " " && text.trim()) { e.preventDefault(); addChord(text); }
    else if (e.key === "Enter") { text.trim() ? addChord(text) : onSubmit(); }
    else if (e.key === "Backspace" && text === "" && chords.length > 0) onChange(chords.slice(0, -1));
  }, [text, chords, addChord, onSubmit, onChange, suggOpen, chordSuggestions, activeSugg]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    if (val.endsWith(",")) addChord(val.slice(0, -1));
    else setText(val);
  }, [addChord]);

  return (
    <div className="tag-input-wrapper autocomplete-wrapper" ref={wrapRef}>
      {chords.map((chord, i) => (
        <span key={i} className="tag-chip">
          {chord}
          <button className="tag-remove" onClick={() => onChange(chords.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tag-input"
        placeholder={chords.length === 0 ? "Your chords: C, G, Am, F… (press / to focus)" : "Add more…"}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {suggOpen && (
        <div className="autocomplete-dropdown">
          {chordSuggestions.map((s, i) => (
            <div
              key={s}
              className={`autocomplete-item${i === activeSugg ? " autocomplete-item-active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); addChord(s); }}
              onMouseEnter={() => setActiveSugg(i)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- One Chord Away ----
function OneChordAway({ items, onLearn }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="oca-section">
      <p className="explore-label" style={{ marginBottom: "12px" }}>💡 One chord away</p>
      <div className="oca-list">
        {items.map((item) => (
          <button key={item.chord} className="oca-item" onClick={() => onLearn(item.chord)}>
            <span className="oca-chord">{item.chord}</span>
            <span className="oca-unlocks">unlocks <strong>{item.unlocks.toLocaleString()}</strong> songs</span>
            <span className="oca-samples">
              {item.sample_songs.map((s) => s.artist_name).filter(Boolean).slice(0, 3).join(" · ")}
            </span>
          </button>
        ))}
      </div>
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

// ---- Suggested songs (ML recommender based on learned / to-learn list) ----
function SuggestedSongs() {
  const { user, getList } = useAuth();
  const [songs, setSongs] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getList("learned"), getList("to_learn")]).then(([learned, toLearn]) => {
      // Prefer learned songs; fall back to to_learn if learned is empty
      const source = learned.length ? learned : toLearn;
      if (!source.length) { setSongs([]); return; }
      const ids = source.map(s => s.song_id).join(",");
      fetch(`${process.env.REACT_APP_API_URL}/suggest?song_ids=${ids}&limit=5`)
        .then(r => r.ok ? r.json() : [])
        .then(setSongs)
        .catch(() => setSongs([]));
    });
  }, [user]); // eslint-disable-line

  if (!user || songs === null) return null;
  if (songs.length === 0) return null;

  return (
    <div className="recent-section suggested-section">
      <p className="explore-label">Suggested for you</p>
      <div className="recent-list">
        {songs.map(song => (
          <Link key={song.song_id} to={`/song/${song.song_id}`} className="recent-item suggested-item">
            <div className="recent-item-info">
              <span className="recent-item-name">{song.song_name}</span>
              <span className="recent-item-artist">{song.artist_name}</span>
            </div>
            <div className="suggested-meta">
              {song.genre && song.genre !== "Other" && (
                <span className="genre-badge">{song.genre}</span>
              )}
              {song.new_chords.length > 0 && (
                <span className="suggested-new-chords">
                  +{song.new_chords.slice(0, 3).join(", ")}
                </span>
              )}
              <span className="suggested-match">{song.match_pct}% match</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---- Recently viewed songs ----
function TopSongs() {
  const [songs, setSongs] = useState(null); // null = loading

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/top-songs`)
      .then(r => r.ok ? r.json() : [])
      .then(setSongs)
      .catch(() => setSongs([]));
  }, []);

  if (songs === null) return null; // still loading — don't flash

  return (
    <div className="recent-section top-songs-section">
      <p className="explore-label">Most liked songs</p>
      {songs.length === 0 ? (
        <p className="top-songs-empty">
          No ratings yet — open any song and be the first to rate it!
        </p>
      ) : (
        <div className="recent-list">
          {songs.map((song, i) => (
            <Link key={song.song_id} to={`/song/${song.song_id}`} className="recent-item top-song-item">
              <span className="top-song-rank">#{i + 1}</span>
              <div className="recent-item-info">
                <span className="recent-item-name">{song.song_name}</span>
                <span className="recent-item-artist">{song.artist_name}</span>
              </div>
              <div className="top-song-meta">
                {song.genre && song.genre !== "Other" && (
                  <span className="genre-badge">{song.genre}</span>
                )}
                <span className="top-song-rating">
                  {"★".repeat(Math.round(song.rating_average))}
                  {"☆".repeat(5 - Math.round(song.rating_average))}
                  {" "}{song.rating_average.toFixed(1)}
                  <span className="top-song-count"> ({song.rating_count})</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentSongs() {
  const [recent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cq_recent") || "[]"); }
    catch { return []; }
  });
  if (recent.length === 0) return null;
  return (
    <div className="recent-section">
      <p className="explore-label">Recently viewed</p>
      <div className="recent-list">
        {recent.map(song => (
          <Link key={song.song_id} to={`/song/${song.song_id}`} className="recent-item">
            <div className="recent-item-info">
              <span className="recent-item-name">{song.song_name}</span>
              <span className="recent-item-artist">{song.artist_name}</span>
            </div>
            {song.genre && song.genre !== "Other" && (
              <span className="genre-badge">{song.genre}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---- Song result card (memoized to prevent re-renders during transitions) ----
const SongCard = React.memo(function SongCard({ song, userChords, onNavigate }) {
  const known   = useMemo(() => song.chord_list.filter(ch => userChords.has(ch)), [song, userChords]);
  const missing = useMemo(() => song.chord_list.filter(ch => !userChords.has(ch)), [song, userChords]);
  const pct     = song.chord_list.length > 0 ? (known.length / song.chord_list.length) * 100 : 0;

  return (
    <Link className="song-card" to={`/song/${song.song_id}`} onClick={onNavigate}>
      <div className="song-card-header">
        <span className="song-card-title">{song.artist_name} — {song.song_name}</span>
        <div className="song-card-stats">
          {song.genre && song.genre !== "Other" && <span className="genre-badge">{song.genre}</span>}
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
        {known.map(ch   => <span key={ch} className="chip chip-known">{ch}</span>)}
        {missing.map(ch => <span key={ch} className="chip chip-missing">{ch}</span>)}
      </div>
      {song.chord_list.length > 0 && (
        <div className="match-bar">
          <div className="match-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </Link>
  );
});

// ---- Home ----
function Home() {
  const chordInputRef = useRef(null);
  const abortRef      = useRef(null);

  const [state, dispatch] = useReducer(searchReducer, null, readSessionCache);
  const [isPending, startTransition] = useTransition();
  const deferredResults = useDeferredValue(state.results);

  const isLoading = state.status === "loading";
  const isError   = state.status === "error";
  const isStale   = deferredResults !== state.results || isPending;

  // Memoized chord set — only recomputes when chords array changes
  const userChords = useMemo(() => new Set(state.chords), [state.chords]);

  const canSearch = state.chords.length > 0 || state.artist.trim() || state.title.trim() || state.genre !== "All Genres";

  // Persist search state to sessionStorage for back-navigation
  useEffect(() => {
    try {
      sessionStorage.setItem("cq_search", JSON.stringify({
        chords: state.chords, artist: state.artist, title: state.title,
        genre: state.genre, results: state.results, oneChordAway: state.oneChordAway,
        searched: state.searched,
      }));
    } catch {}
  }, [state]);

  // Restore scroll position when returning from a song page
  useEffect(() => {
    if (scrollCache.y > 0 && state.results.length > 0) {
      window.scrollTo({ top: scrollCache.y, behavior: "instant" });
      scrollCache.y = 0;
    }
  }, []); // eslint-disable-line

  // Cancel in-flight requests on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // '/' focuses the chord input from anywhere on the page
  useKeyboardShortcut("/", () => chordInputRef.current?.focus());

  const setField = useCallback((field, value) => dispatch({ type: "SET_FIELD", field, value }), []);

  const doSearch = useCallback(async (searchChords, searchArtist, searchTitle, searchGenre) => {
    const canGo = searchChords.length > 0 || searchArtist.trim() || searchTitle.trim() || searchGenre !== "All Genres";
    if (!canGo) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    dispatch({ type: "SEARCH_START" });
    localStorage.setItem("userChords", searchChords.join(","));
    scrollCache.y = 0;

    try {
      const params = new URLSearchParams({
        chords: searchChords.join(","),
        artist: searchArtist,
        title:  searchTitle,
        genre:  searchGenre === "All Genres" ? "" : searchGenre,
      });
      const ocaParams = new URLSearchParams({
        chords: searchChords.join(","),
        genre:  searchGenre === "All Genres" ? "" : searchGenre,
      });

      const requests = [fetch(`${process.env.REACT_APP_API_URL}/recommend?${params}`, { signal })];
      if (searchChords.length > 0) {
        requests.push(fetch(`${process.env.REACT_APP_API_URL}/one-chord-away?${ocaParams}`, { signal }));
      }

      const responses = await Promise.all(requests);
      const [recData, ocaData] = await Promise.all(responses.map(r => r.json()));

      const results = (recData || []).slice(0, 50);
      const oca     = ocaData || [];

      // Mark result update as non-urgent — keeps UI responsive during render
      startTransition(() => {
        dispatch({ type: "SEARCH_SUCCESS", results, oca });
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      dispatch({ type: "SEARCH_ERROR" });
    }
  }, []); // eslint-disable-line

  const fetchSongs = useCallback(() => {
    doSearch(state.chords, state.artist, state.title, state.genre);
  }, [state.chords, state.artist, state.title, state.genre, doSearch]);

  const handleEnter = useCallback((e) => { if (e.key === "Enter") fetchSongs(); }, [fetchSongs]);
  const saveScroll  = useCallback(() => { scrollCache.y = window.scrollY; }, []);

  return (
    <div className="page">
      <div className="container">

        {/* ---- Hero ---- */}
        {!state.searched && !isLoading && (
          <div className="hero">
            <div className="hero-text">
              <h1 className="hero-title">
                Find songs you can<br />
                <span className="accent">play right now.</span>
              </h1>
              <p className="hero-sub">
                Enter the chords you know — we'll match you with songs from{" "}
                <span className="hero-count">135,000+</span> tracks.
              </p>
            </div>
            <HeroGuitar />
          </div>
        )}

        {/* ---- Search panel ---- */}
        <div className="search-panel">
          <p className="search-label">Search by chords, artist, song, or genre</p>
          <div className="input-grid">
            <ChordTagInput
              chords={state.chords}
              onChange={v => setField("chords", v)}
              onSubmit={fetchSongs}
              inputRef={chordInputRef}
            />
            <AutocompleteInput
              className="artist-input"
              placeholder="Filter by artist"
              value={state.artist}
              onChange={e => setField("artist", e.target.value)}
              onKeyDown={handleEnter}
              field="artist"
              crossValue={state.title}
            />
            <AutocompleteInput
              className="song-input"
              placeholder="Filter by song"
              value={state.title}
              onChange={e => setField("title", e.target.value)}
              onKeyDown={handleEnter}
              field="title"
              crossValue={state.artist}
            />
            <select
              className="genre-select"
              value={state.genre}
              onChange={e => setField("genre", e.target.value)}
              onKeyDown={handleEnter}
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button className="search-btn" onClick={fetchSongs} disabled={!canSearch || isLoading}>
              {isLoading ? "Searching…" : "Find Songs"}
            </button>
          </div>
          {!state.searched && (
            <div className="tip-card">
              <span className="tip-icon">✦</span>
              <span className="tip-text"><strong>Tip:</strong> Not sure what to search? Try a quick-start progression or enter a few chords you know!</span>
            </div>
          )}
        </div>

        {/* ---- Explore (pre-search) ---- */}
        {!state.searched && !isLoading && (
          <div className="explore-section">
            <SuggestedSongs />
            <TopSongs />
            <RecentSongs />

            <p className="explore-label">Browse by genre</p>
            <div className="genre-tiles">
              {GENRES.slice(1).map(g => {
                const [c1, c2] = GENRE_COLORS[g] || ["#00e5ff", "#b84fff"];
                return (
                  <button
                    key={g}
                    className="genre-tile"
                    style={{ "--gc1": c1, "--gc2": c2 }}
                    onClick={() => {
                      setField("genre", g);
                      doSearch(state.chords, state.artist, state.title, g);
                    }}
                  >
                    <span className="genre-tile-name">{g}</span>
                  </button>
                );
              })}
            </div>

            <p className="explore-label" style={{ marginTop: "28px" }}>Try a progression</p>
            <div className="prog-list">
              {PROGRESSIONS.map(p => (
                <button key={p.name} className="prog-item" onClick={() => {
                  setField("chords", p.chords);
                  doSearch(p.chords, state.artist, state.title, state.genre);
                }}>
                  <span className="prog-name">{p.name}</span>
                  <span className="prog-label">{p.label}</span>
                  <div className="prog-chips">
                    {p.chords.map(ch => <span key={ch} className="prog-chip">{ch}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Skeleton loader ---- */}
        {isLoading && (
          <div className="results">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} delay={i * 0.07} />)}
          </div>
        )}

        {/* ---- Error state ---- */}
        {!isLoading && isError && (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h3 className="empty-title">Couldn't reach the server</h3>
            <p className="empty-text">Make sure the backend is running, then try again.</p>
            <button className="retry-btn" onClick={fetchSongs}>Try again</button>
          </div>
        )}

        {/* ---- Empty results ---- */}
        {!isLoading && state.searched && !isError && deferredResults.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎸</div>
            <h3 className="empty-title">No songs found</h3>
            <p className="empty-text">Try fewer chords, remove filters, or start with a common progression:</p>
            <div className="empty-chips">
              {["C", "G", "Am", "F", "Em", "D"].map(ch => (
                <button key={ch} className="prog-chip" onClick={() => {
                  setField("chords", [ch]);
                  doSearch([ch], "", "", "All Genres");
                }}>{ch}</button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Result count ---- */}
        {!isLoading && state.searched && !isError && deferredResults.length > 0 && (
          <div className="result-count">
            {deferredResults.length} songs found
            {isStale && <span className="result-count-updating"> · updating…</span>}
          </div>
        )}

        {/* ---- Results — rendered with deferred value so input stays responsive ---- */}
        {!isLoading && (
          <div className="results" style={{ opacity: isStale ? 0.55 : 1, transition: "opacity 0.2s" }}>
            {deferredResults.map(song => (
              <SongCard
                key={song.song_id}
                song={song}
                userChords={userChords}
                onNavigate={saveScroll}
              />
            ))}
          </div>
        )}

        {/* ---- One chord away ---- */}
        {!isLoading && state.searched && state.chords.length > 0 && (
          <OneChordAway
            items={state.oneChordAway}
            onLearn={chord => {
              const next = [...state.chords, chord];
              setField("chords", next);
              doSearch(next, state.artist, state.title, state.genre);
            }}
          />
        )}

      </div>
    </div>
  );
}

// ---- AppInner ----
function AppInner() {
  const [theme, setTheme] = useLocalStorage("theme", "dark");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), [setTheme]);

  return (
    <>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <Suspense fallback={<div className="route-loader">Loading…</div>}>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/song/:id"        element={<SongPage />} />
          <Route path="/artists"         element={<ArtistsPage />} />
          <Route path="/artist/:name"    element={<ArtistPage />} />
          <Route path="/auth"            element={<AuthPage />} />
          <Route path="/profile"         element={<ProfilePage />} />
          <Route path="/verified"        element={<VerifiedPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

// ---- App root ----
export default function App() {
  return (
    <HelmetProvider>
      <ToastProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}
