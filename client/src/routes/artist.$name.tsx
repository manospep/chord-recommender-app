import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SongCard } from "@/components/SongCard";
import { getArtistSongs } from "@/lib/chordapi.functions";
import type { Song } from "@/lib/chord-types";

function ArtistPage() {
  const { songs } = Route.useLoaderData() as { songs: Song[]; total: number; live: boolean };
  const { name } = Route.useParams();
  const artistName = decodeURIComponent(name);

  return (
    <div className="home-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "2.5rem" }}>
        <p><Link to="/library" className="section-link">← All artists</Link></p>

        <div className="section-head" style={{ marginTop: "1.25rem" }}>
          <div>
            <h1 className="section-title accent">{artistName}</h1>
            <p className="section-subtitle">{songs.length} {songs.length === 1 ? "song" : "songs"} in the catalog</p>
          </div>
        </div>

        {songs.length === 0 ? (
          <p className="empty-state">No songs found for this artist.</p>
        ) : (
          <div className="song-grid">
            {songs.map(song => <SongCard key={song.id} song={song} />)}
          </div>
        )}
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/artist/$name")({
  loader: ({ params }) => getArtistSongs({ data: { name: decodeURIComponent(params.name) } }),
  component: ArtistPage,
  errorComponent: ({ error }) => <div role="alert" className="error-banner">{error.message}</div>,
  notFoundComponent: () => (
    <p className="empty-state">Artist not found. <Link to="/library" className="section-link">Browse all artists</Link>.</p>
  ),
  head: ({ loaderData, params }) => {
    const name = decodeURIComponent(params.name);
    const count = loaderData?.songs?.length ?? 0;
    return {
      meta: [
        { title: `${name} — Chords & Songs | ChordQuest` },
        { name: "description", content: `${count} songs by ${name} with chord charts on ChordQuest.` },
        { property: "og:title", content: `${name} — ChordQuest` },
        { property: "og:type", content: "music.musician" },
      ],
    };
  },
});
