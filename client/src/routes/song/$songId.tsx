import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSong } from "@/lib/chordapi.functions";
import { CHORD_SHAPES, chordDifficulty } from "@/lib/chordquest";
import { ChordDiagram } from "@/components/ChordDiagram";
import type { Song } from "@/lib/chord-types";

function SongDetail() {
  const song = Route.useLoaderData() as Song;
  const { user, addFavorite, removeFavorite, isFavorite } = useAuth() as any;
  const toast = useToast();
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user && isFavorite) {
      Promise.resolve(isFavorite(song.id)).then(v => !cancelled && setFav(Boolean(v)));
    } else {
      setFav(false);
    }
    return () => { cancelled = true; };
  }, [user, song.id]);

  const toggle = async () => {
    if (!user) {
      toast("Sign in to save favorites", "info");
      return;
    }
    setBusy(true);
    try {
      if (fav) {
        await removeFavorite(song.id);
        setFav(false);
        toast("Removed from favorites", "info");
      } else {
        await addFavorite(song.id);
        setFav(true);
        toast("Saved to favorites");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  const chords = song.chord_list ?? [];
  const { level } = chordDifficulty(chords);

  return (
    <div className="home-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "2.5rem" }}>
        <div>
          <p><Link to="/library" className="section-link">← Back to library</Link></p>

          <header style={{ marginTop: "1.25rem" }}>
            <h1 className="section-title" style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)" }}>{song.name}</h1>
            <p className="section-subtitle">{song.artist}{song.year ? ` · ${song.year}` : ""}</p>
            <div className="progressions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
              {song.genre && <span className="song-card-genre">{song.genre}</span>}
              <span className="song-card-genre">{level} for beginners</span>
              <span className="song-card-genre">{chords.length} chords</span>
            </div>
            <button type="button" className="search-button" onClick={toggle} disabled={busy} style={{ marginTop: "1.5rem" }}>
              {fav ? "★ Saved" : "☆ Save to favorites"}
            </button>
          </header>
        </div>

        <section>
          <div className="section-head">
            <div>
              <h2 className="section-title">How to play it</h2>
              <p className="section-subtitle">Fingering diagrams for the shapes in this song. × = don't play, ○ = open string.</p>
            </div>
          </div>
          {chords.length === 0 ? (
            <p className="empty-state">No chord chart available for this song yet.</p>
          ) : (
            <div className="tip-grid">
              {chords.map(c => (
                <div key={c} className="diagram-card">
                  <span className="diagram-name">{c}</span>
                  {CHORD_SHAPES[c.trim()] ? (
                    <ChordDiagram name={c} />
                  ) : (
                    <span className="tip-body">Diagram coming soon</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <div><h2 className="section-title">Details</h2></div>
          </div>
          <div className="tip-grid">
            <div className="tip-card">
              <div className="tip-title">Rating</div>
              <p className="tip-body">{song.rating ? `${song.rating} / 5` : "Not rated yet"}</p>
            </div>
            <div className="tip-card">
              <div className="tip-title">Chord set</div>
              <p className="tip-body">{chords.length ? chords.join(" · ") : "Unknown"}</p>
            </div>
            <div className="tip-card">
              <div className="tip-title">Practice tip</div>
              <p className="tip-body">Loop the first two chords slowly until the change is clean, then add the rest.</p>
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


export const Route = createFileRoute("/song/$songId")({
  loader: async ({ params }) => {
    const song = await getSong({ data: { id: params.songId } });
    if (!song) throw notFound();
    return song;
  },
  component: SongDetail,
  errorComponent: ({ error }) => <div role="alert" className="error-banner">{error.message}</div>,
  notFoundComponent: () => (
    <p className="empty-state">
      We couldn't find that song. <Link to="/library" className="navbar-link">Browse the library</Link>.
    </p>
  ),
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} by ${loaderData.artist} — Chords | ChordQuest` : "Song — ChordQuest";
    const description = loaderData
      ? `Chords for ${loaderData.name} by ${loaderData.artist}${loaderData.chord_list?.length ? `: ${loaderData.chord_list.join(", ")}` : ""}.`
      : "Chord chart and details for this song on ChordQuest.";
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 158) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 158) },
        { property: "og:type", content: "music.song" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});
