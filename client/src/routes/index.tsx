import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GENRES, PROGRESSIONS, STARTER_CHORDS } from "@/lib/chordquest";
import { SiteNav } from "@/components/SiteNav";
import { SongCard, MiniSongCard, SkeletonCard } from "@/components/SongCard";
import { searchSongs, oneChordAway, topSongs, recentSongs } from "@/lib/chordapi.functions";
import type { Song } from "@/lib/chord-types";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SearchState {
  query: string;
  chords: string[];
  genre: string;
  results: Song[];
  loading: boolean;
  error: string | null;
  oneChordAway: Song[];
  topSongs: Song[];
  recentSongs: Song[];
  hasSearched: boolean;
  page: number;
  hasMore: boolean;
}

type SearchAction =
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_CHORDS"; payload: string[] }
  | { type: "SET_GENRE"; payload: string }
  | { type: "SEARCH_START" }
  | { type: "SEARCH_SUCCESS"; payload: { results: Song[]; reset: boolean; hasMore: boolean } }
  | { type: "SEARCH_ERROR"; payload: string }
  | { type: "SET_ONE_CHORD_AWAY"; payload: Song[] }
  | { type: "SET_TOP_SONGS"; payload: Song[] }
  | { type: "SET_RECENT_SONGS"; payload: Song[] }
  | { type: "SET_PAGE"; payload: number }
  | { type: "RESET" };

const initialState: SearchState = {
  query: "",
  chords: [],
  genre: "All Genres",
  results: [],
  loading: false,
  error: null,
  oneChordAway: [],
  topSongs: [],
  recentSongs: [],
  hasSearched: false,
  page: 1,
  hasMore: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.payload };
    case "SET_CHORDS":
      return { ...state, chords: action.payload, page: 1 };
    case "SET_GENRE":
      return { ...state, genre: action.payload, page: 1 };
    case "SEARCH_START":
      return { ...state, loading: true, error: null };
    case "SEARCH_SUCCESS":
      return {
        ...state,
        loading: false,
        results: action.payload.reset ? action.payload.results : [...state.results, ...action.payload.results],
        hasMore: action.payload.hasMore,
        hasSearched: true,
      };
    case "SEARCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_ONE_CHORD_AWAY":
      return { ...state, oneChordAway: action.payload };
    case "SET_TOP_SONGS":
      return { ...state, topSongs: action.payload };
    case "SET_RECENT_SONGS":
      return { ...state, recentSongs: action.payload };
    case "SET_PAGE":
      return { ...state, page: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Autocomplete input for chord names
// ─────────────────────────────────────────────────────────────────────────────
const CHORD_NAMES = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dbm", "Dm", "D#m", "Ebm", "Em", "F#m", "Gbm", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm",
  "C7", "C#7", "Db7", "D7", "D#7", "Eb7", "E7", "F7", "F#7", "Gb7", "G7", "G#7", "Ab7", "A7", "A#7", "Bb7", "B7",
  "Cmaj7", "C#maj7", "Dbmaj7", "Dmaj7", "D#maj7", "Ebmaj7", "Emaj7", "Fmaj7", "F#maj7", "Gbmaj7", "Gmaj7", "G#maj7", "Abmaj7", "Amaj7", "A#maj7", "Bbmaj7", "Bmaj7",
  "Cm7", "C#m7", "Dbm7", "Dm7", "D#m7", "Ebm7", "Em7", "F#m7", "Gbm7", "Gm7", "G#m7", "Abm7", "Am7", "A#m7", "Bbm7", "Bm7",
  "Csus2", "Dsus2", "Esus4", "Gsus4", "Asus2", "Asus4", "Cadd9", "Gadd9",
  "A9", "B9", "C9",
];

function AutocompleteInput({ value, onAdd, placeholder = "Add a chord…" }: { value: string; onAdd: (chord: string) => void; placeholder?: string }) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(input.trim(), 150);

  const suggestions = useMemo(() => {
    if (!debounced) return [];
    return CHORD_NAMES.filter(c => c.toLowerCase().startsWith(debounced.toLowerCase())).slice(0, 8);
  }, [debounced]);

  useEffect(() => {
    setActive(0);
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const submit = (chord: string) => {
    const c = chord.trim();
    if (!c) return;
    onAdd(c);
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={ref} className="autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(i => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(i => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions[active]) submit(suggestions[active]);
            else submit(input);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onFocus={() => input && suggestions.length && setOpen(true)}
        placeholder={placeholder}
        className="autocomplete-input"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`autocomplete-item ${i === active ? "active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => submit(s)}
              role="option"
              aria-selected={i === active}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chord tag input
// ─────────────────────────────────────────────────────────────────────────────
function ChordTagInput({ chords, onChange, max = 12 }: { chords: string[]; onChange: (chords: string[]) => void; max?: number }) {
  const remove = (idx: number) => onChange(chords.filter((_, i) => i !== idx));

  return (
    <div className="chord-tag-input">
      <div className="chord-tags">
        {chords.map((c, i) => (
          <span key={`${c}-${i}`} className="chord-tag">
            {c}
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${c}`}>×</button>
          </span>
        ))}
        {chords.length < max && (
          <AutocompleteInput
            value=""
            onAdd={chord => {
              const normalized = chord.trim();
              if (!normalized || chords.includes(normalized)) return;
              onChange([...chords, normalized]);
            }}
          />
        )}
      </div>
      {chords.length >= max && <span className="chord-tag-limit">Maximum {max} chords</span>}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Home page
// ─────────────────────────────────────────────────────────────────────────────
function Home() {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  const { user } = useAuth();
  const toast = useToast();
  const searchRef = useRef<HTMLDivElement>(null);
  const [recentChords, setRecentChords] = useLocalStorage<string[]>("chordquest_recent_chords", []);
  const hydrated = useHydrated();

  const fetchSearch = useServerFn(searchSongs);
  const fetchOneChordAway = useServerFn(oneChordAway);
  const fetchTop = useServerFn(topSongs);
  const fetchRecent = useServerFn(recentSongs);

  // Fetch initial data through the server proxy (works with or without the FastAPI backend)
  useEffect(() => {
    fetchTop({ data: { limit: 8 } })
      .then(res => dispatch({ type: "SET_TOP_SONGS", payload: res.songs }))
      .catch(() => dispatch({ type: "SET_TOP_SONGS", payload: [] }));

    fetchRecent({ data: { limit: 8 } })
      .then(res => dispatch({ type: "SET_RECENT_SONGS", payload: res.songs }))
      .catch(() => dispatch({ type: "SET_RECENT_SONGS", payload: [] }));
  }, []);

  const performSearch = async (page = 1, chords = state.chords, genre = state.genre) => {
    if (chords.length === 0 && !state.query.trim()) return;
    dispatch({ type: "SEARCH_START" });
    dispatch({ type: "SET_PAGE", payload: page });
    try {
      const payload = { chords, genre, q: state.query.trim() || undefined, page, limit: 20 };
      const res = await fetchSearch({ data: payload });
      dispatch({
        type: "SEARCH_SUCCESS",
        payload: { results: res.songs, reset: page === 1, hasMore: res.songs.length === 20 },
      });

      if (chords.length > 0) {
        const oca = await fetchOneChordAway({ data: payload });
        dispatch({ type: "SET_ONE_CHORD_AWAY", payload: oca.songs });
      } else {
        dispatch({ type: "SET_ONE_CHORD_AWAY", payload: [] });
      }


      if (page === 1 && chords.length > 0) {
        setRecentChords(prev => {
          const next = [...chords, ...prev].filter((c, i, a) => a.indexOf(c) === i).slice(0, 20);
          return next;
        });
      }
    } catch (err) {
      dispatch({ type: "SEARCH_ERROR", payload: err instanceof Error ? err.message : "Search failed" });
    }
  };

  useKeyboardShortcut("k", () => {
    searchRef.current?.querySelector("input")?.focus();
  }, { meta: true });

  const handleSearch = () => performSearch(1);
  const loadMore = () => performSearch(state.page + 1, state.chords, state.genre);

  const clearSearch = () => {
    dispatch({ type: "RESET" });
  };

  const applyProgression = (chords: string[]) => {
    dispatch({ type: "SET_CHORDS", payload: chords });
  };

  const addChord = (c: string) => {
    if (!state.chords.includes(c)) dispatch({ type: "SET_CHORDS", payload: [...state.chords, c] });
  };

  return (
    <div className="home-page">
      <SiteNav />

      <header className="hero">
        <div>
          <span className="hero-eyebrow">For beginner guitarists</span>
          <h1 className="hero-title">
            Master your <em>first chords</em>
          </h1>
          <p className="hero-subtitle">
            Search songs by the chords you already know. No theory required — just add a few
            shapes and we'll show you what you can play tonight.
          </p>
        </div>

        <div ref={searchRef} className="search-box">
          <ChordTagInput
            chords={state.chords}
            onChange={chords => dispatch({ type: "SET_CHORDS", payload: chords })}
          />
          <div className="search-divider" />
          <div className="search-controls">
            <select
              value={state.genre}
              onChange={e => dispatch({ type: "SET_GENRE", payload: e.target.value })}
              className="genre-select"
              aria-label="Genre"
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button
              type="button"
              className="search-button"
              onClick={handleSearch}
              disabled={state.loading || state.chords.length === 0}
            >
              {state.loading ? "Searching…" : "Find Songs"}
            </button>
            {state.chords.length > 0 && (
              <button type="button" className="clear-button" onClick={clearSearch}>Clear</button>
            )}
          </div>
        </div>

        <div className="progressions">
          <span className="progressions-label">First chords:</span>
          {STARTER_CHORDS.map(c => (
            <button
              key={c}
              type="button"
              className="recent-chord-chip"
              onClick={() => addChord(c)}
              aria-label={`Add ${c} chord`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="progressions">
          <span className="progressions-label">Popular:</span>
          {PROGRESSIONS.map(p => (
            <button
              key={p.name}
              type="button"
              className="progression-chip"
              onClick={() => applyProgression(p.chords)}
              title={p.label}
            >
              {p.chords.join(" – ")}
              <small>{p.name}</small>
            </button>
          ))}
        </div>

        {hydrated && recentChords.length > 0 && (
          <div className="recent-chords">
            <span className="recent-chords-label">Recent:</span>
            {recentChords.slice(0, 8).map(c => (
              <button key={c} type="button" className="recent-chord-chip" onClick={() => addChord(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="main-content">
        {state.error && (
          <div className="error-banner" role="alert">
            {state.error}
          </div>
        )}

        {state.hasSearched && (
          <section className="results-section" aria-label="Search results">
            <div className="section-head">
              <div>
                <h2 className="section-title accent">
                  {state.results.length} song{state.results.length === 1 ? "" : "s"} you can play
                </h2>
                {state.chords.length > 0 && (
                  <p className="section-subtitle">Matching {state.chords.join(" – ")}</p>
                )}
              </div>
              <button type="button" className="section-link" onClick={clearSearch}>Start over</button>
            </div>
            {state.results.length === 0 && !state.loading && (
              <p className="empty-state">No songs found yet. Try removing a chord, or add one more.</p>
            )}
            <div className="song-grid">
              {state.results.map(song => <SongCard key={song.id} song={song} />)}
              {state.loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
            {state.hasMore && !state.loading && (
              <button type="button" className="load-more" onClick={loadMore}>Load more</button>
            )}
          </section>
        )}

        {state.hasSearched && state.oneChordAway.length > 0 && (
          <section className="one-chord-away-section" aria-label="One chord away">
            <div className="section-head">
              <div>
                <h2 className="section-title">One chord away</h2>
                <p className="section-subtitle">Learn a single new shape and these songs open up.</p>
              </div>
            </div>
            <div className="song-grid">
              {state.oneChordAway.map(song => <SongCard key={song.id} song={song} />)}
            </div>
          </section>
        )}

        <section className="top-songs-section" aria-label="Top songs for beginners">
          <div className="section-head">
            <div>
              <h2 className="section-title accent">Top for beginners</h2>
              <p className="section-subtitle">Well-known songs built from simple open chords.</p>
            </div>
            <Link to="/library" className="section-link">View all tracks</Link>
          </div>
          <div className="song-grid">
            {state.topSongs.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : state.topSongs.map(song => <SongCard key={song.id} song={song} />)
            }
          </div>
        </section>

        <section className="recent-songs-section" aria-label="Recently added">
          <div className="section-head">
            <div>
              <h2 className="section-title">Recently added</h2>
            </div>
            <Link to="/library" className="section-link">Browse library</Link>
          </div>
          <div className="mini-grid">
            {state.recentSongs.length === 0
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : state.recentSongs.map((song, i) => <MiniSongCard key={song.id} song={song} rank={i + 1} />)
            }
          </div>
        </section>

        <section aria-label="How it works">
          <div className="section-head">
            <div>
              <h2 className="section-title">New to guitar? Start here</h2>
              <p className="section-subtitle">Three steps from first chord to first full song.</p>
            </div>
          </div>
          <div className="tip-grid">
            <div className="tip-card">
              <div className="tip-step">1</div>
              <div className="tip-title">Add the chords you know</div>
              <p className="tip-body">Even two shapes is enough. Tap a first chord above or type your own.</p>
            </div>
            <div className="tip-card">
              <div className="tip-step">2</div>
              <div className="tip-title">Play what matches</div>
              <p className="tip-body">Every result shows its chords and how hard it is for a beginner.</p>
            </div>
            <div className="tip-card">
              <div className="tip-step">3</div>
              <div className="tip-title">Learn one more chord</div>
              <p className="tip-body">"One chord away" shows exactly which shape unlocks the most new songs.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}


export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "ChordQuest — Find Songs From the Chords You Know" },
      { name: "description", content: "Enter the guitar chords you can play, pick a genre, and instantly discover songs you can already perform — plus songs one chord away." },
      { property: "og:title", content: "ChordQuest — Find Songs From the Chords You Know" },
      { property: "og:description", content: "Search thousands of songs by chord set and genre, and see what you can play today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

