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
function GuitarStrings() {
  const strings = [
    { y: 7,  sw: 0.55, op: 0.55 },
    { y: 18, sw: 0.70, op: 0.50 },
    { y: 29, sw: 0.90, op: 0.45 },
    { y: 40, sw: 1.15, op: 0.40 },
    { y: 51, sw: 1.50, op: 0.36 },
    { y: 62, sw: 2.00, op: 0.32 },
  ];
  return (
    <svg className="hero-strings" height="70" viewBox="0 0 800 70" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="stringFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="10%"  stopColor="rgba(0,229,255,1)" />
          <stop offset="90%"  stopColor="rgba(184,79,255,1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {strings.map((s, i) => (
        <line key={i} x1="0" y1={s.y} x2="800" y2={s.y}
          stroke="url(#stringFade)" strokeWidth={s.sw} opacity={s.op} />
      ))}
    </svg>
  );
}

// ---- Acoustic guitar illustration ----
function HeroGuitar() {
  // Equal-temperament fret positions along the neck
  const NECK_Y     = 68;   // nut y-position
  const NECK_LEN   = 136;  // neck length in SVG units
  const fretYs     = [1,2,3,4,5,6,7,8,9,10,11,12].map(
    n => NECK_Y + NECK_LEN * (1 - Math.pow(2, -n / 12))
  );
  const neckHW = (y) => 23 + 11 * ((y - NECK_Y) / NECK_LEN); // half-width of neck

  // Inlay dot positions: midpoint between consecutive frets
  const slotY = (f) => (fretYs[f - 2] + fretYs[f - 1]) / 2;

  return (
    <svg viewBox="0 0 200 478" className="hero-guitar" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hgS" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(0,229,255,0.9)" />
          <stop offset="100%" stopColor="rgba(184,79,255,0.75)" />
        </linearGradient>
        <linearGradient id="hgF" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="rgba(0,229,255,0.09)" />
          <stop offset="100%" stopColor="rgba(184,79,255,0.06)" />
        </linearGradient>
        <linearGradient id="hgStr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(200,240,255,0.75)" />
          <stop offset="100%" stopColor="rgba(184,79,255,0.55)" />
        </linearGradient>
      </defs>

      {/* ── Headstock ── */}
      <path d="M76 2 Q76 0 100 0 Q124 0 124 2 L126 65 L74 65 Z"
        fill="url(#hgF)" stroke="url(#hgS)" strokeWidth="1.1" />
      {/* Tuning pegs — 3 per side */}
      {[13, 28, 43].map(py => (
        <g key={py}>
          <ellipse cx="58"  cy={py} rx="11" ry="5.5"
            fill="rgba(0,229,255,0.10)" stroke="rgba(0,229,255,0.38)" strokeWidth="0.9" />
          <ellipse cx="142" cy={py} rx="11" ry="5.5"
            fill="rgba(0,229,255,0.10)" stroke="rgba(0,229,255,0.38)" strokeWidth="0.9" />
          <line x1="74"  y1={py} x2="69"  y2={py} stroke="rgba(0,229,255,0.28)" strokeWidth="0.8" />
          <line x1="126" y1={py} x2="131" y2={py} stroke="rgba(0,229,255,0.28)" strokeWidth="0.8" />
        </g>
      ))}
      {/* Nut */}
      <rect x="76" y="65" width="48" height="3" rx="1.5" fill="rgba(0,229,255,0.55)" />

      {/* ── Neck ── */}
      <path d={`M${100 - 23} ${NECK_Y} L${100 + 23} ${NECK_Y} L${100 + 34} ${NECK_Y + NECK_LEN} L${100 - 34} ${NECK_Y + NECK_LEN} Z`}
        fill="url(#hgF)" stroke="url(#hgS)" strokeWidth="0.9" />
      {/* Fret lines */}
      {fretYs.map((y, i) => {
        const hw = neckHW(y);
        return (
          <line key={i} x1={100 - hw} y1={y} x2={100 + hw} y2={y}
            stroke="rgba(0,229,255,0.30)" strokeWidth={i === 11 ? 1.1 : 0.75} />
        );
      })}
      {/* Position inlay dots: 3, 5, 7, 9 (single), 12 (double) */}
      {[3, 5, 7, 9].map(f => (
        <circle key={f} cx="100" cy={slotY(f)} r="2.8" fill="rgba(0,229,255,0.60)" />
      ))}
      <circle cx="93"  cy={slotY(12)} r="2.8" fill="rgba(0,229,255,0.60)" />
      <circle cx="107" cy={slotY(12)} r="2.8" fill="rgba(0,229,255,0.60)" />

      {/* ── Body ── */}
      <path d={`
        M ${100 - 34} 204
        C 46 206, 16 228, 16 264
        C 16 298, 48 316, 80 318
        L 80 332
        C 56 342, 8 365, 8 408
        C 8 448, 50 472, 100 472
        C 150 472, 192 448, 192 408
        C 192 365, 144 342, 120 332
        L 120 318
        C 152 316, 184 298, 184 264
        C 184 228, 154 206, ${100 + 34} 204
        Z
      `} fill="url(#hgF)" stroke="url(#hgS)" strokeWidth="1.3" />

      {/* Sound hole */}
      <circle cx="100" cy="404" r="37" fill="none" stroke="url(#hgS)" strokeWidth="1.6" />
      <circle cx="100" cy="404" r="31" fill="none" stroke="rgba(0,229,255,0.13)" strokeWidth="0.7" />
      <circle cx="100" cy="404" r="34" fill="none" stroke="rgba(0,229,255,0.18)"
        strokeWidth="0.6" strokeDasharray="6 4" />

      {/* Bridge */}
      <path d="M65 450 L135 450 L137 460 L63 460 Z"
        fill="rgba(0,229,255,0.13)" stroke="url(#hgS)" strokeWidth="1" />
      <rect x="69" y="450" width="62" height="3" rx="1.5" fill="rgba(0,229,255,0.45)" />

      {/* ── Strings (nut → bridge) ── */}
      {[-12.5, -7.5, -2.5, 2.5, 7.5, 12.5].map((dx, i) => (
        <line key={i}
          x1={100 + dx * 0.28} y1={NECK_Y + 3}
          x2={100 + dx}        y2={451}
          stroke="url(#hgStr)"
          strokeWidth={0.42 + i * 0.14}
          opacity={0.65 - i * 0.05}
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

// ---- Recently viewed songs ----
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
                Enter the chords you know — we'll match you with songs from 135,000+ tracks.
              </p>
              <GuitarStrings />
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
        </div>

        {/* ---- Explore (pre-search) ---- */}
        {!state.searched && !isLoading && (
          <div className="explore-section">
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
          <Route path="/"         element={<Home />} />
          <Route path="/song/:id" element={<SongPage />} />
          <Route path="/auth"     element={<AuthPage />} />
          <Route path="/profile"  element={<ProfilePage />} />
          <Route path="/verified" element={<VerifiedPage />} />
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
