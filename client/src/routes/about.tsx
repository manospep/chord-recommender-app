import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

function About() {
  return (
    <div className="home-page">
      <SiteNav />
      <header className="hero">
        <div>
          <span className="hero-eyebrow">About ChordQuest</span>
          <h1 className="hero-title">Play more of the <em>songs you love</em></h1>
          <p className="hero-subtitle">
            ChordQuest matches your chord vocabulary to real songs, so practice always ends with
            something you can actually play.
          </p>
        </div>
      </header>

      <main className="main-content">
        <section>
          <div className="section-head">
            <div>
              <h2 className="section-title accent">How it works</h2>
              <p className="section-subtitle">Built around the three chords you already know.</p>
            </div>
          </div>
          <div className="tip-grid">
            <div className="tip-card">
              <div className="tip-step">1</div>
              <div className="tip-title">Add your chords</div>
              <p className="tip-body">Type chords or tap a popular progression like I–V–vi–IV.</p>
            </div>
            <div className="tip-card">
              <div className="tip-step">2</div>
              <div className="tip-title">Filter by genre</div>
              <p className="tip-body">Narrow results to the styles you actually want to practice.</p>
            </div>
            <div className="tip-card">
              <div className="tip-step">3</div>
              <div className="tip-title">Play today, learn tomorrow</div>
              <p className="tip-body">"One chord away" shows songs unlocked by a single new shape.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2 className="section-title">Under the hood</h2>
            </div>
          </div>
          <p className="section-subtitle" style={{ maxWidth: "48rem" }}>
            The frontend runs on TanStack Start with server-side rendering. Song search is proxied through server
            functions, so it can talk to the FastAPI recommendation service when it is configured, and falls back to a
            built-in catalog otherwise. Accounts, favorites, and ratings run on Lovable Cloud.
          </p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link to="/" className="search-button" style={{ display: "inline-block", textDecoration: "none" }}>
              Start searching
            </Link>
          </p>
        </section>
      </main>


      <footer className="footer">
        <p>© {new Date().getFullYear()} ChordQuest. Built for guitarists.</p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About ChordQuest — Chord-Based Song Discovery" },
      { name: "description", content: "Learn how ChordQuest turns the chords you already know into a personal setlist, and what powers the recommendation engine." },
      { property: "og:title", content: "About ChordQuest — Chord-Based Song Discovery" },
      { property: "og:description", content: "How ChordQuest turns the chords you know into songs you can play today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
