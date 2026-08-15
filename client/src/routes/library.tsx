import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { getArtists } from "@/lib/chordapi.functions";
import type { Artist } from "@/lib/chordapi.server";

const LETTERS = ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function Library() {
  const [letter, setLetter] = useState("A");
  const [q, setQ] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtists = useServerFn(getArtists);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const payload = q.trim() ? { q: q.trim() } : { letter };
    fetchArtists({ data: payload })
      .then((res: Artist[]) => { if (!cancelled) setArtists(res); })
      .catch(() => { if (!cancelled) setArtists([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [letter, q]);

  const handleLetterClick = (l: string) => {
    setQ("");
    setLetter(l);
  };

  return (
    <div className="home-page library-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "3rem" }}>
        <div className="section-head">
          <div>
            <h1 className="section-title accent">Artists</h1>
            <p className="section-subtitle">Browse the full catalog A–Z or search by name.</p>
          </div>
        </div>

        <div className="search-controls" style={{ marginBottom: "1.25rem" }}>
          <input
            className="text-input"
            style={{ maxWidth: "22rem" }}
            placeholder="Search artists…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search artists"
          />
        </div>

        {!q.trim() && (
          <div className="az-nav">
            {LETTERS.map(l => (
              <button
                key={l}
                type="button"
                className={`az-btn${letter === l ? " active" : ""}`}
                onClick={() => handleLetterClick(l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : artists.length === 0 ? (
          <p className="empty-state">No artists found.</p>
        ) : (
          <div className="artist-grid">
            {artists.map(a => (
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
  component: Library,
  errorComponent: ({ error }) => <div role="alert" className="error-banner">{error.message}</div>,
  head: () => ({
    meta: [
      { title: "Artists — Browse Every Chord Chart | ChordQuest" },
      { name: "description", content: "Browse every artist in the ChordQuest catalog A–Z and find songs by the chords you know." },
      { property: "og:title", content: "Artists — ChordQuest" },
      { property: "og:type", content: "website" },
    ],
  }),
});
