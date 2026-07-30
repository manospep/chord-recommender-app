import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SongCard } from "@/components/SongCard";
import { browseSongs } from "@/lib/chordapi.functions";
import type { Song } from "@/lib/chord-types";

function Library() {
  const { songs, genres, live } = Route.useLoaderData() as { songs: Song[]; genres: string[]; live: boolean };
  const [genre, setGenre] = useState("All Genres");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return songs.filter(s => {
      if (genre !== "All Genres" && s.genre !== genre) return false;
      if (needle && !`${s.name} ${s.artist}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [songs, genre, q]);

  return (
    <div className="home-page library-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "3rem" }}>
        <div className="section-head">
          <div>
            <h1 className="section-title accent">Song library</h1>
            <p className="section-subtitle">
          {live ? "Live catalog" : "Sample catalog"} — {songs.length} songs. Filter by genre or search by title and artist.
            </p>
          </div>
        </div>

        <div className="search-controls">
          <input
            className="text-input" style={{ maxWidth: "22rem" }}
            placeholder="Search songs or artists…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search library"
          />
          <select className="genre-select" value={genre} onChange={e => setGenre(e.target.value)} aria-label="Filter by genre">
            <option>All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="empty-state">
            No songs match that filter. <Link to="/" className="section-link">Try a chord search instead</Link>.
          </p>
        ) : (
          <div className="song-grid">
            {visible.map(song => <SongCard key={song.id} song={song} />)}
          </div>
        )}
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/library")({
  loader: () => browseSongs({ data: { limit: 50 } }),
  component: Library,
  errorComponent: ({ error }) => <div role="alert" className="error-banner">{error.message}</div>,
  notFoundComponent: () => <p className="empty-state">Library not found.</p>,
  head: () => ({
    meta: [
      { title: "Song Library — Browse Every Chord Chart | ChordQuest" },
      { name: "description", content: "Browse the full ChordQuest song library by genre, artist, or title, and see the exact chord set behind every song." },
      { property: "og:title", content: "Song Library — Browse Every Chord Chart" },
      { property: "og:description", content: "Browse the full ChordQuest song library by genre, artist, or title." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
