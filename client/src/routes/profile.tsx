import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SongCard } from "@/components/SongCard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSong } from "@/lib/chordapi.functions";
import type { Song } from "@/lib/chord-types";

function Profile() {
  const auth = useAuth() as any;
  const { user, signOut } = auth;
  const toast = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = (await auth.getFavorites?.()) ?? [];
        const ids: string[] = rows.map((r: any) => String(r.song_id ?? r.id));
        const songs = (await Promise.all(ids.map(id => getSong({ data: { id } })))).filter(Boolean) as Song[];
        if (!cancelled) setFavorites(songs);
      } catch {
        if (!cancelled) setFavorites([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  return (
    <div className="home-page">
      <SiteNav />
      <main className="main-content" style={{ paddingTop: "3rem" }}>
        <div className="section-head">
          <div>
            <h1 className="section-title accent">Your profile</h1>
            <p className="section-subtitle">{user.email}</p>
          </div>
        </div>

        <section className="results-section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Favorites</h2>
              <p className="section-subtitle">Songs you've saved to practice.</p>
            </div>
          </div>
          {loading ? (
            <p className="empty-state">Loading your saved songs…</p>
          ) : favorites.length === 0 ? (
            <p className="empty-state">
              No favorites yet. <Link to="/library" className="section-link">Find something to play</Link>.
            </p>
          ) : (
            <div className="song-grid">
              {favorites.map(song => <SongCard key={song.id} song={song} />)}
            </div>
          )}
        </section>

        <button
          type="button"
          className="clear-button"
          style={{ alignSelf: "flex-start" }}
          onClick={async () => {
            await signOut();
            toast("Signed out", "info");
            navigate({ to: "/" });
          }}
        >
          Sign out
        </button>
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({
    meta: [
      { title: "Your Profile and Saved Songs | ChordQuest" },
      { name: "description", content: "View your ChordQuest profile, the songs you've saved as favorites, and manage your account." },
      { property: "og:title", content: "Your Profile and Saved Songs | ChordQuest" },
      { property: "og:description", content: "Your saved songs and account settings on ChordQuest." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
