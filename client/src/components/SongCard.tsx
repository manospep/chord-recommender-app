import { Link } from "@tanstack/react-router";
import type { Song } from "@/lib/chord-types";
import { chordDifficulty } from "@/lib/chordquest";

function Difficulty({ chords }: { chords?: string[] }) {
  const { level, score } = chordDifficulty(chords);
  return (
    <div className="difficulty" title={`${level} for beginners`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={`difficulty-bar ${i <= score ? "on" : ""}`} />
      ))}
      <span className="difficulty-label">{level}</span>
    </div>
  );
}

export function SongCard({ song, variant = "result" }: { song: Song; variant?: "result" | "compact" }) {
  const matched = new Set((song.matched_chords ?? []).map(c => c.trim()));
  const chords = song.chord_list ?? [];

  return (
    <Link
      to="/song/$songId"
      params={{ songId: String(song.id) }}
      className={`song-card ${variant === "compact" ? "compact" : ""}`}
    >
      <div className="song-card-head">
        <div>
          <div className="song-card-title">{song.name}</div>
          <div className="song-card-artist">{song.artist}</div>
        </div>
        {song.genre && <span className="song-card-genre">{song.genre}</span>}
      </div>

      {chords.length > 0 && (
        <div className="song-card-chords">
          {chords.slice(0, variant === "compact" ? 4 : 6).map(c => (
            <span key={c} className={`song-card-chord ${matched.has(c.trim()) ? "matched" : ""}`}>{c}</span>
          ))}
        </div>
      )}

      {song.missing_chord && (
        <div className="song-card-missing">
          Learn <strong>{song.missing_chord}</strong> to unlock this song
        </div>
      )}

      <div className="song-card-foot">
        <Difficulty chords={chords} />
        <span className="song-card-cta">Play it →</span>
      </div>
    </Link>
  );
}

export function MiniSongCard({ song, rank }: { song: Song; rank: number }) {
  return (
    <Link to="/song/$songId" params={{ songId: String(song.id) }} className="mini-card">
      <span className="mini-rank">#{rank}</span>
      <span className="mini-body">
        <span className="mini-title">{song.name}</span>
        <span className="mini-artist">{song.artist}</span>
      </span>
      <span className="mini-cta">LEARN</span>
    </Link>
  );
}

export function SkeletonCard() {
  return <div className="skeleton-card" aria-hidden="true" />;
}

export default SongCard;
