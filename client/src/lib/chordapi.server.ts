import type { Song, SongListResponse, SearchInput } from "./chord-types";

/**
 * Base URL of the FastAPI backend (the `server/` folder of the original repo).
 * Set CHORD_API_URL in project secrets to point at a deployed instance.
 * When unset/unreachable we fall back to the built-in catalog below so the UI
 * always has something to render.
 */
function apiBase(): string | null {
  const url = process.env.CHORD_API_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

async function remote<T>(path: string, params?: URLSearchParams): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}${params ? `?${params}` : ""}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in catalog (offline fallback)
// ─────────────────────────────────────────────────────────────────────────────
const CATALOG: Song[] = [
  { id: "1", name: "Let It Be", artist: "The Beatles", genre: "Rock", chord_list: ["C", "G", "Am", "F"], rating: 4.9, year: 1970 },
  { id: "2", name: "Knockin' on Heaven's Door", artist: "Bob Dylan", genre: "Folk", chord_list: ["G", "D", "Am", "C"], rating: 4.8, year: 1973 },
  { id: "3", name: "Wonderwall", artist: "Oasis", genre: "Rock", chord_list: ["Em", "G", "D", "A", "C"], rating: 4.7, year: 1995 },
  { id: "4", name: "Someone Like You", artist: "Adele", genre: "Pop", chord_list: ["A", "E", "F#m", "D"], rating: 4.6, year: 2011 },
  { id: "5", name: "Zombie", artist: "The Cranberries", genre: "Rock", chord_list: ["Em", "C", "G", "D"], rating: 4.7, year: 1994 },
  { id: "6", name: "Hallelujah", artist: "Leonard Cohen", genre: "Folk", chord_list: ["C", "Am", "F", "G", "Em"], rating: 4.9, year: 1984 },
  { id: "7", name: "Riptide", artist: "Vance Joy", genre: "Indie", chord_list: ["Am", "G", "C", "F"], rating: 4.5, year: 2013 },
  { id: "8", name: "Ho Hey", artist: "The Lumineers", genre: "Folk", chord_list: ["F", "C", "Am", "G"], rating: 4.3, year: 2012 },
  { id: "9", name: "Stand By Me", artist: "Ben E. King", genre: "Soul", chord_list: ["A", "F#m", "D", "E"], rating: 4.8, year: 1961 },
  { id: "10", name: "Perfect", artist: "Ed Sheeran", genre: "Pop", chord_list: ["G", "Em", "C", "D"], rating: 4.6, year: 2017 },
  { id: "11", name: "Creep", artist: "Radiohead", genre: "Rock", chord_list: ["G", "B", "C", "Cm"], rating: 4.7, year: 1992 },
  { id: "12", name: "Free Fallin'", artist: "Tom Petty", genre: "Rock", chord_list: ["D", "G", "A"], rating: 4.6, year: 1989 },
  { id: "13", name: "Halo", artist: "Beyoncé", genre: "Pop", chord_list: ["C", "G", "Am", "F"], rating: 4.4, year: 2008 },
  { id: "14", name: "Take Me Home, Country Roads", artist: "John Denver", genre: "Country", chord_list: ["G", "Em", "D", "C"], rating: 4.8, year: 1971 },
  { id: "15", name: "Autumn Leaves", artist: "Standard", genre: "Jazz", chord_list: ["Am7", "D7", "Gmaj7", "Cmaj7"], rating: 4.5, year: 1945 },
  { id: "16", name: "Blue Bossa", artist: "Kenny Dorham", genre: "Jazz", chord_list: ["Cm7", "Fm7", "Dm7", "G7"], rating: 4.4, year: 1963 },
  { id: "17", name: "Redemption Song", artist: "Bob Marley", genre: "Reggae", chord_list: ["G", "Em", "C", "D", "Am"], rating: 4.9, year: 1980 },
  { id: "18", name: "Three Little Birds", artist: "Bob Marley", genre: "Reggae", chord_list: ["A", "D", "E"], rating: 4.7, year: 1977 },
  { id: "19", name: "Skinny Love", artist: "Bon Iver", genre: "Indie", chord_list: ["Am", "C", "G", "Dm"], rating: 4.5, year: 2007 },
  { id: "20", name: "Hotel California", artist: "Eagles", genre: "Rock", chord_list: ["Bm", "F#", "A", "E", "G", "D", "Em"], rating: 4.9, year: 1976 },
  { id: "21", name: "I'm Yours", artist: "Jason Mraz", genre: "Pop", chord_list: ["C", "G", "Am", "F"], rating: 4.3, year: 2008 },
  { id: "22", name: "Chasing Cars", artist: "Snow Patrol", genre: "Indie", chord_list: ["A", "E", "D"], rating: 4.4, year: 2006 },
  { id: "23", name: "Sweet Home Alabama", artist: "Lynyrd Skynyrd", genre: "Rock", chord_list: ["D", "C", "G"], rating: 4.6, year: 1974 },
  { id: "24", name: "Jolene", artist: "Dolly Parton", genre: "Country", chord_list: ["Am", "C", "G", "Em"], rating: 4.8, year: 1973 },
];

const norm = (c: string) => c.trim().toLowerCase();

function scored(song: Song, chords: string[]): Song {
  const owned = new Set(chords.map(norm));
  const matched = (song.chord_list ?? []).filter(c => owned.has(norm(c)));
  return { ...song, match_count: matched.length, matched_chords: matched };
}

function filtered(input: SearchInput): Song[] {
  const q = input.q?.trim().toLowerCase();
  return CATALOG.filter(s => {
    if (input.genre && input.genre !== "All Genres" && s.genre !== input.genre) return false;
    if (q && !`${s.name} ${s.artist}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function localSearch(input: SearchInput): SongListResponse {
  const chords = input.chords ?? [];
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  let list = filtered(input);

  if (chords.length) {
    const owned = new Set(chords.map(norm));
    list = list
      .filter(s => (s.chord_list ?? []).every(c => owned.has(norm(c))))
      .map(s => scored(s, chords));
  }
  list.sort((a, b) => (b.match_count ?? 0) - (a.match_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0));

  const start = (page - 1) * limit;
  return { songs: list.slice(start, start + limit), total: list.length, live: false };
}

export function localOneChordAway(input: SearchInput): SongListResponse {
  const chords = input.chords ?? [];
  if (!chords.length) return { songs: [], total: 0, live: false };
  const owned = new Set(chords.map(norm));
  const songs: Song[] = [];
  for (const s of filtered(input)) {
    const missing = (s.chord_list ?? []).filter(c => !owned.has(norm(c)));
    if (missing.length === 1) songs.push({ ...scored(s, chords), missing_chord: missing[0] });
  }
  songs.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return { songs: songs.slice(0, 12), total: songs.length, live: false };
}

export function localTop(limit: number): SongListResponse {
  const songs = [...CATALOG].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, limit);
  return { songs, total: CATALOG.length, live: false };
}

export function localRecent(limit: number): SongListResponse {
  const songs = [...CATALOG].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, limit);
  return { songs, total: CATALOG.length, live: false };
}

export function localSong(id: string): Song | null {
  return CATALOG.find(s => s.id === id) ?? null;
}

export function localGenres(): string[] {
  return Array.from(new Set(CATALOG.map(s => s.genre).filter(Boolean) as string[])).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Remote-first helpers used by the server functions
// ─────────────────────────────────────────────────────────────────────────────
function toParams(input: SearchInput): URLSearchParams {
  const p = new URLSearchParams();
  // FastAPI declares `chords` as an array query param → repeat the key.
  for (const c of (input.chords ?? []).map(c => c.trim()).filter(Boolean)) p.append("chords", c);
  if (input.genre && input.genre !== "All Genres") p.set("genre", input.genre);
  if (input.q?.trim()) p.set("q", input.q.trim());
  p.set("page", String(input.page ?? 1));
  p.set("limit", String(input.limit ?? 20));
  return p;
}


/** The FastAPI backend uses song_id / song_name / artist_name; map to our Song shape. */
function normalizeSong(raw: any): Song | null {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id ?? raw.song_id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    name: raw.name ?? raw.song_name ?? "Untitled",
    artist: raw.artist ?? raw.artist_name ?? "Unknown artist",
    genre: raw.genre ?? undefined,
    chord_list: Array.isArray(raw.chord_list) ? raw.chord_list : undefined,
    chords_and_lyrics: raw.chords_and_lyrics ?? raw.chords_lyrics ?? undefined,
    match_count: raw.match_count,
    matched_chords: raw.matched_chords,
    missing_chord: raw.missing_chord,
    rating: raw.rating ?? raw.rating_average ?? undefined,
    rating_count: raw.rating_count ?? undefined,
    youtube_id: raw.youtube_id,
    year: raw.year,
  };
}

function shape(data: unknown, fallbackTotal: number): SongListResponse | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { songs?: unknown[]; total?: number };
  const list = Array.isArray(data) ? (data as unknown[]) : Array.isArray(raw.songs) ? raw.songs : null;
  if (!list) return null;
  const songs = list.map(normalizeSong).filter(Boolean) as Song[];
  if (!songs.length) return null;
  return { songs, total: raw.total ?? songs.length ?? fallbackTotal, live: true };
}

export async function searchSongsImpl(input: SearchInput): Promise<SongListResponse> {
  const data = await remote<unknown>("/recommend", toParams(input));
  // The backend already applies page/limit — never re-slice here.
  return shape(data, 0) ?? localSearch(input);
}

export async function oneChordAwayImpl(input: SearchInput): Promise<SongListResponse> {
  const data = await remote<unknown>("/one-chord-away", toParams(input));

  // Newer backend: { songs: [{ ..., missing_chord }] }
  const flat = shape(data, 0);
  if (flat) return { ...flat, songs: flat.songs.slice(0, 12) };

  // Older backend: grouped as [{ chord, sample_songs: [...] }]
  if (Array.isArray(data)) {
    const songs: Song[] = [];
    for (const group of data as any[]) {
      for (const s of group?.sample_songs ?? []) {
        const song = normalizeSong(s);
        if (song) songs.push({ ...song, missing_chord: group.chord });
      }
    }
    if (songs.length) return { songs: songs.slice(0, 12), total: songs.length, live: true };
  }
  return localOneChordAway(input);
}

export async function topSongsImpl(limit: number): Promise<SongListResponse> {
  const data = await remote<unknown>("/top-songs", new URLSearchParams({ limit: String(limit) }));
  return shape(data, 0) ?? localTop(limit);
}

export async function recentSongsImpl(limit: number): Promise<SongListResponse> {
  const data = await remote<unknown>("/recent-songs", new URLSearchParams({ limit: String(limit) }));
  return shape(data, 0) ?? localRecent(limit);
}

export async function getSongImpl(id: string): Promise<Song | null> {
  const data = await remote<unknown>(`/song/${encodeURIComponent(id)}`);
  return normalizeSong(data) ?? localSong(id);
}

async function remoteGenres(): Promise<string[] | null> {
  const data = await remote<unknown>("/genres");
  if (!Array.isArray(data)) return null;
  const list = data.map(String).filter(Boolean);
  return list.length ? list : null;
}

export async function browseImpl(input: SearchInput): Promise<SongListResponse & { genres: string[] }> {
  const [res, genres] = await Promise.all([
    searchSongsImpl({ ...input, limit: input.limit ?? 50 }),
    remoteGenres(),
  ]);
  return { ...res, genres: genres ?? localGenres() };
}


