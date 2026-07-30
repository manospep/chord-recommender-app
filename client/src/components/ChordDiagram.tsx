import { CHORD_SHAPES } from "@/lib/chordquest";

/**
 * Small SVG fingering diagram so beginners can see how to play a chord
 * without leaving the page. Renders nothing for shapes we don't know.
 */
export function ChordDiagram({ name, size = 76 }: { name: string; size?: number }) {
  const shape = CHORD_SHAPES[name.trim()];
  if (!shape) return null;

  const W = 60;
  const H = 74;
  const left = 8;
  const top = 16;
  const stringGap = 8.8;
  const fretGap = 11;

  return (
    <svg
      className="chord-diagram"
      width={size}
      height={(size * H) / W}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${name} chord fingering`}
    >
      {/* nut */}
      <line x1={left} y1={top} x2={left + stringGap * 5} y2={top} className="chord-diagram-nut" strokeLinecap="round" />
      {/* frets */}
      {[1, 2, 3, 4].map(f => (
        <line
          key={f}
          x1={left}
          y1={top + f * fretGap}
          x2={left + stringGap * 5}
          y2={top + f * fretGap}
          className="chord-diagram-grid"
        />
      ))}
      {/* strings */}
      {[0, 1, 2, 3, 4, 5].map(s => (
        <line
          key={s}
          x1={left + s * stringGap}
          y1={top}
          x2={left + s * stringGap}
          y2={top + 4 * fretGap}
          className="chord-diagram-grid"
        />
      ))}
      {/* markers */}
      {shape.map((fret, s) => {
        const x = left + s * stringGap;
        if (fret === -1) {
          return (
            <text key={s} x={x} y={top - 4} textAnchor="middle" className="chord-diagram-mark">×</text>
          );
        }
        if (fret === 0) {
          return (
            <text key={s} x={x} y={top - 4} textAnchor="middle" className="chord-diagram-mark">○</text>
          );
        }
        return (
          <circle key={s} cx={x} cy={top + fret * fretGap - fretGap / 2} r={3.4} className="chord-diagram-dot" />
        );
      })}
    </svg>
  );
}

export default ChordDiagram;
