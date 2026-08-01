import { useMemo, useState } from "react";

const CHORD_TOKEN = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(sus[0-9]*)?(add[0-9]*)?(\/[A-G][#b]?)?$/;

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const chords = tokens.filter(t => CHORD_TOKEN.test(t));
  return chords.length === tokens.length;
}

function isSectionLine(line: string): boolean {
  const t = line.trim();
  return /^\[?(intro|verse|pre-?chorus|chorus|bridge|outro|solo|refrain|interlude|coda)\b/i.test(t) && t.length < 40;
}

interface Props {
  text: string;
}

/** Renders the backend's raw chord-over-lyrics sheet, preserving alignment. */
export function ChordSheet({ text }: Props) {
  const [size, setSize] = useState(0.95);

  const lines = useMemo(
    () => text.replace(/\r\n?/g, "\n").split("\n").map(l => l.replace(/\t/g, "    ")),
    [text],
  );

  const hasContent = lines.some(l => l.trim().length > 0);
  if (!hasContent) return <p className="empty-state">No lyric sheet available for this song yet.</p>;

  return (
    <div className="chord-sheet-wrap">
      <div className="chord-sheet-toolbar">
        <span className="tip-title">Text size</span>
        <button type="button" className="song-card-genre" onClick={() => setSize(s => Math.max(0.7, +(s - 0.1).toFixed(2)))} aria-label="Decrease text size">A−</button>
        <button type="button" className="song-card-genre" onClick={() => setSize(s => Math.min(1.6, +(s + 0.1).toFixed(2)))} aria-label="Increase text size">A+</button>
      </div>
      <pre className="chord-sheet" style={{ fontSize: `${size}rem` }}>
        {lines.map((line, i) => {
          const cls = isChordLine(line)
            ? "chord-sheet-chords"
            : isSectionLine(line)
              ? "chord-sheet-section"
              : "chord-sheet-lyrics";
          return (
            <span key={i} className={cls}>
              {line.length ? line : " "}
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
