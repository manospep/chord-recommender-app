import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { getArtists } from "@/lib/chordapi.functions";
import type { Artist } from "@/lib/chordapi.server";

const LETTERS = ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function Library() {
  const artists = Route.useLoaderData() as Artist[];
  const [letter, setLetter] = useState("All");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return artists.filter(a => {
      if (needle) return a.name.toLowerCase().includes(needle);
      if (letter === "All") return true;
      if (letter === "#") return !/^[A-Za-z]/.test(a.name);
      return a.name.toUpperCase().startsWith(letter);
    });
  }, [artists, letter, q]);

  const grouped = useMemo(() => {
    if (q.trim() || letter !== "All") return null;
    const map: Record<string, Artist[]> = {};
    for (const a of artists) {
      const key = /^[A-Za-z]/.test(a.name) ? a.name[0].toUpperCase() : "#";
      (map[key] ??= []).push(a);
    }
    return map;
  }, [artists, q, letter]);

  return (
    <div className="home-page library-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "3rem" }}>
        <div className="section-head">
          <div>
            <h1 className="section-title accent">Artists</h1>
            <p className="section-subtitle">{artists.length.toLocaleString()} artists — browse A–Z or search by name.</p>
          </div>
        </div>

        <div className="search-controls" style={{ marginBottom: "1.5rem" }}>
          <input
            className="text-input"
            style={{ maxWidth: "22rem" }}
            placeholder="Search artists…"
            value={q}
            onChange={e => { setQ(e.target.value); setLetter("All"); }}
            aria-label="Search artists"
          />
        </div>

        {!q.trim() && (
          <div className="az-nav" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "2rem" }}>
            {["All", ...LETTERS].map(l => (
              <button
                key={l}
                type="button"
                className={`chord-tag${letter === l ? " active" : ""}`}
                onClick={() => setLetter(l)}
                style={{ minWidth: "2.2rem", textAlign: "center", cursor: "pointer" }}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="empty-state">No artists match that search.</p>
        ) : grouped ? (
          Object.keys(grouped).sort().map(key => (
            <section key={key} style={{ marginBottom: "2rem" }}>
              <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem", opacity: 0.5 }}>{key}</h2>
              <div className="artist-grid">
                {grouped[key].map(a => (
                  <Link key={a.name} to="/artist/$name" params={{ name: encodeURIComponent(a.name) }} className="artist-card">
                    <span className="artist-name">{a.name}</span>
                    <span className="artist-count">{a.song_count} {a.song_count === 1 ? "song" : "songs"}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="artist-grid">
            {visible.map(a => (
              <Link key={a.name} to="/artist/$name" params={{ name: encodeURIComponent(a.name) }} className="artist-card">
                <span className="artist-name">{a.name}</span>
                <span className="artist-count">{a.song_count} {a.song_count === 1 ? "song" : "songs"}</span>
              </Link>
            ))}
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
  loader: () => getArtists({ data: {} }),
  component: Library,
  errorComponent: ({ error }) => <div role="alert" className="error-banner">{error.message}</div>,
  head: () => ({
    meta: [
      { title: "Artists — Browse Every Chord Chart | ChordQuest" },
      { name: "description", content: "Browse every artist in the ChordQuest catalog and find songs by the chords you know." },
      { property: "og:title", content: "Artists — ChordQuest" },
      { property: "og:type", content: "website" },
    ],
  }),
});
