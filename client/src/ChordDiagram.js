import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Chord shape database
// frets[i] : -1 = muted  |  0 = open  |  1-5 = relative fret (from startFret)
// barre    : { fret, from, to } — all string indices are 0=low E … 5=high e
// startFret: fret number at the TOP of the diagram (1 = open position)
// ─────────────────────────────────────────────────────────────────────────────
export const CHORD_SHAPES = {
  // ── Major open / first-position ──────────────────────────────────────────
  C:      { frets: [-1,3,2,0,1,0], startFret: 1 },
  D:      { frets: [-1,-1,0,2,3,2], startFret: 1 },
  E:      { frets: [0,2,2,1,0,0], startFret: 1 },
  F:      { frets: [1,3,3,2,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  G:      { frets: [3,2,0,0,0,3], startFret: 1 },
  A:      { frets: [-1,0,2,2,2,0], startFret: 1 },
  B:      { frets: [-1,1,3,3,3,1], startFret: 2, barre: { fret:1, from:1, to:5 } },

  // ── Major barre / chromatic ───────────────────────────────────────────────
  "Bb":   { frets: [-1,1,3,3,3,1], startFret: 1, barre: { fret:1, from:1, to:5 } },
  "A#":   { frets: [-1,1,3,3,3,1], startFret: 1, barre: { fret:1, from:1, to:5 } },
  "C#":   { frets: [-1,1,3,3,3,1], startFret: 4, barre: { fret:1, from:1, to:5 } },
  "Db":   { frets: [-1,1,3,3,3,1], startFret: 4, barre: { fret:1, from:1, to:5 } },
  "D#":   { frets: [-1,1,3,3,3,1], startFret: 6, barre: { fret:1, from:1, to:5 } },
  "Eb":   { frets: [-1,1,3,3,3,1], startFret: 6, barre: { fret:1, from:1, to:5 } },
  "F#":   { frets: [1,3,3,2,1,1], startFret: 2, barre: { fret:1, from:0, to:5 } },
  "Gb":   { frets: [1,3,3,2,1,1], startFret: 2, barre: { fret:1, from:0, to:5 } },
  "G#":   { frets: [1,3,3,2,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Ab":   { frets: [1,3,3,2,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },

  // ── Minor open ────────────────────────────────────────────────────────────
  Am:     { frets: [-1,0,2,2,1,0], startFret: 1 },
  Dm:     { frets: [-1,-1,0,2,3,1], startFret: 1 },
  Em:     { frets: [0,2,2,0,0,0], startFret: 1 },

  // ── Minor barre ───────────────────────────────────────────────────────────
  Bm:     { frets: [-1,1,3,3,2,1], startFret: 2, barre: { fret:1, from:1, to:5 } },
  Cm:     { frets: [-1,1,3,3,2,1], startFret: 3, barre: { fret:1, from:1, to:5 } },
  Fm:     { frets: [1,3,3,1,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  Gm:     { frets: [1,3,3,1,1,1], startFret: 3, barre: { fret:1, from:0, to:5 } },
  "F#m":  { frets: [1,3,3,1,1,1], startFret: 2, barre: { fret:1, from:0, to:5 } },
  "Gbm":  { frets: [1,3,3,1,1,1], startFret: 2, barre: { fret:1, from:0, to:5 } },
  "G#m":  { frets: [1,3,3,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Abm":  { frets: [1,3,3,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "C#m":  { frets: [1,3,3,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Dbm":  { frets: [1,3,3,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Bbm":  { frets: [1,3,3,1,1,1], startFret: 6, barre: { fret:1, from:0, to:5 } },
  "A#m":  { frets: [1,3,3,1,1,1], startFret: 6, barre: { fret:1, from:0, to:5 } },
  "Ebm":  { frets: [1,3,3,1,1,1], startFret: 6, barre: { fret:1, from:0, to:5 } },
  "D#m":  { frets: [1,3,3,1,1,1], startFret: 6, barre: { fret:1, from:0, to:5 } },

  // ── Dominant 7ths ─────────────────────────────────────────────────────────
  A7:     { frets: [-1,0,2,0,2,0], startFret: 1 },
  B7:     { frets: [-1,2,1,2,0,2], startFret: 1 },
  C7:     { frets: [-1,3,2,3,1,0], startFret: 1 },
  D7:     { frets: [-1,-1,0,2,1,2], startFret: 1 },
  E7:     { frets: [0,2,0,1,0,0], startFret: 1 },
  F7:     { frets: [1,3,1,2,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  G7:     { frets: [3,2,0,0,0,1], startFret: 1 },

  // ── Major 7ths ────────────────────────────────────────────────────────────
  Amaj7:  { frets: [-1,0,2,1,2,0], startFret: 1 },
  Cmaj7:  { frets: [-1,3,2,0,0,0], startFret: 1 },
  Dmaj7:  { frets: [-1,-1,0,2,2,2], startFret: 1 },
  Emaj7:  { frets: [0,2,1,1,0,0], startFret: 1 },
  Fmaj7:  { frets: [-1,-1,3,2,1,0], startFret: 1 },
  Gmaj7:  { frets: [3,2,0,0,0,2], startFret: 1 },

  // ── Minor 7ths ────────────────────────────────────────────────────────────
  Am7:    { frets: [-1,0,2,0,1,0], startFret: 1 },
  Bm7:    { frets: [-1,1,3,1,2,1], startFret: 2, barre: { fret:1, from:1, to:5 } },
  Cm7:    { frets: [-1,1,3,1,2,1], startFret: 3, barre: { fret:1, from:1, to:5 } },
  Dm7:    { frets: [-1,-1,0,2,1,1], startFret: 1 },
  Em7:    { frets: [0,2,2,0,3,0], startFret: 1 },
  Fm7:    { frets: [1,3,1,1,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  "F#m7": { frets: [-1,-1,4,2,2,2], startFret: 1 },
  "Gbm7": { frets: [-1,-1,4,2,2,2], startFret: 1 },
  Gm7:    { frets: [1,3,1,1,1,1], startFret: 3, barre: { fret:1, from:0, to:5 } },
  "G#m7": { frets: [1,3,1,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Abm7": { frets: [1,3,1,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "C#m7": { frets: [1,3,1,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },
  "Dbm7": { frets: [1,3,1,1,1,1], startFret: 4, barre: { fret:1, from:0, to:5 } },

  // ── Suspended ─────────────────────────────────────────────────────────────
  Asus2:  { frets: [-1,0,2,2,0,0], startFret: 1 },
  Asus4:  { frets: [-1,0,2,2,3,0], startFret: 1 },
  Asus:   { frets: [-1,0,2,2,3,0], startFret: 1 },
  Dsus2:  { frets: [-1,-1,0,2,3,0], startFret: 1 },
  Dsus4:  { frets: [-1,-1,0,2,3,3], startFret: 1 },
  Esus4:  { frets: [0,2,2,2,0,0], startFret: 1 },
  Gsus4:  { frets: [3,1,0,0,1,3], startFret: 1 },

  // ── Add chords ────────────────────────────────────────────────────────────
  Cadd9:  { frets: [-1,3,2,0,3,0], startFret: 1 },
  Gadd9:  { frets: [3,2,0,2,0,3], startFret: 1 },

  // ── 9th chords ────────────────────────────────────────────────────────────
  A9:     { frets: [-1,0,2,0,2,0], startFret: 1 },
  B9:     { frets: [-1,2,1,2,2,2], startFret: 1 },
  C9:     { frets: [-1,3,2,3,3,3], startFret: 1 },
  D9:     { frets: [-1,-1,0,2,1,0], startFret: 1 },
  E9:     { frets: [0,2,0,1,0,2], startFret: 1 },
  G9:     { frets: [3,2,0,2,0,1], startFret: 1 },
  "F#9":  { frets: [1,3,1,2,1,3], startFret: 2, barre: { fret:1, from:0, to:5 } },
  "F9":   { frets: [1,3,1,2,1,3], startFret: 1, barre: { fret:1, from:0, to:5 } },
  "Bb9":  { frets: [1,3,1,2,1,3], startFret: 6, barre: { fret:1, from:0, to:5 } },
  "Eb9":  { frets: [1,3,1,2,1,3], startFret: 6, barre: { fret:1, from:0, to:5 } },

  // ── Major 9th ─────────────────────────────────────────────────────────────
  Cmaj9:  { frets: [-1,3,2,0,3,0], startFret: 1 },
  Dmaj9:  { frets: [-1,-1,0,2,2,4], startFret: 1 },
  Emaj9:  { frets: [0,2,1,1,2,0], startFret: 1 },
  Gmaj9:  { frets: [3,2,0,2,0,2], startFret: 1 },
  Amaj9:  { frets: [-1,0,2,1,2,2], startFret: 1 },

  // ── Minor 9th ─────────────────────────────────────────────────────────────
  Am9:    { frets: [-1,0,2,0,1,0], startFret: 1 },
  Dm9:    { frets: [-1,-1,0,2,1,0], startFret: 1 },
  Em9:    { frets: [0,2,0,0,0,0], startFret: 1 },

  // ── 11th / 13th ───────────────────────────────────────────────────────────
  C11:    { frets: [-1,3,3,3,3,3], startFret: 1, barre: { fret:3, from:1, to:5 } },
  D11:    { frets: [-1,-1,0,0,1,0], startFret: 1 },
  A11:    { frets: [-1,0,0,0,2,0], startFret: 1 },
  E11:    { frets: [0,2,0,0,0,0], startFret: 1 },
  G13:    { frets: [3,2,0,0,0,1], startFret: 1 },
  A13:    { frets: [-1,0,2,0,2,2], startFret: 1 },
  D13:    { frets: [-1,-1,0,2,1,2], startFret: 1 },

  // ── Diminished ────────────────────────────────────────────────────────────
  Bdim:   { frets: [-1,2,3,1,3,-1], startFret: 1 },
  Cdim:   { frets: [-1,3,1,2,1,-1], startFret: 1 },
  Ddim:   { frets: [-1,-1,0,1,0,1], startFret: 1 },
  Edim:   { frets: [0,1,2,0,-1,-1], startFret: 1 },
  Fdim:   { frets: [1,2,3,1,-1,-1], startFret: 1 },
  Gdim:   { frets: [3,1,2,3,-1,-1], startFret: 1 },
  Adim:   { frets: [-1,0,1,2,1,-1], startFret: 1 },
  "F#dim":{ frets: [2,3,1,2,-1,-1], startFret: 1 },
  "C#dim":{ frets: [-1,4,2,3,2,-1], startFret: 1 },
  "Bbdim":{ frets: [-1,1,2,3,2,-1], startFret: 1 },

  // ── Diminished 7th ────────────────────────────────────────────────────────
  Bdim7:  { frets: [-1,2,3,1,3,1], startFret: 1 },
  Cdim7:  { frets: [-1,3,1,2,1,2], startFret: 1 },
  Ddim7:  { frets: [-1,-1,0,1,0,1], startFret: 1 },
  Edim7:  { frets: [0,1,2,0,2,0], startFret: 1 },
  Fdim7:  { frets: [1,2,3,1,3,1], startFret: 1 },
  "F#dim7":{ frets: [2,3,1,2,1,2], startFret: 1 },
  Gdim7:  { frets: [3,1,2,3,2,3], startFret: 1 },
  Adim7:  { frets: [-1,0,1,2,1,2], startFret: 1 },

  // ── Augmented ─────────────────────────────────────────────────────────────
  Caug:   { frets: [-1,3,2,1,1,0], startFret: 1 },
  Daug:   { frets: [-1,-1,0,3,3,2], startFret: 1 },
  Eaug:   { frets: [0,3,2,1,1,0], startFret: 1 },
  Faug:   { frets: [1,0,3,2,2,1], startFret: 1 },
  Gaug:   { frets: [3,2,1,0,0,3], startFret: 1 },
  Aaug:   { frets: [-1,0,3,2,2,1], startFret: 1 },
  Baug:   { frets: [-1,2,1,0,0,3], startFret: 1 },

  // ── 6th chords ────────────────────────────────────────────────────────────
  A6:     { frets: [-1,0,2,2,2,2], startFret: 1 },
  B6:     { frets: [-1,2,4,4,4,4], startFret: 1 },
  C6:     { frets: [-1,3,2,2,1,0], startFret: 1 },
  D6:     { frets: [-1,-1,0,2,0,2], startFret: 1 },
  E6:     { frets: [0,2,2,1,2,0], startFret: 1 },
  F6:     { frets: [1,3,3,2,3,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  G6:     { frets: [3,2,0,0,0,0], startFret: 1 },
  Am6:    { frets: [-1,0,2,2,1,2], startFret: 1 },
  Dm6:    { frets: [-1,-1,0,2,0,1], startFret: 1 },
  Em6:    { frets: [0,2,2,0,2,0], startFret: 1 },

  // ── More sus variants ─────────────────────────────────────────────────────
  Bsus2:  { frets: [-1,2,4,4,2,2], startFret: 1 },
  Bsus4:  { frets: [-1,2,4,4,5,2], startFret: 1 },
  Csus2:  { frets: [-1,3,3,0,1,1], startFret: 1 },
  Csus4:  { frets: [-1,3,3,3,1,1], startFret: 1 },
  Fsus2:  { frets: [1,3,3,3,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  Fsus4:  { frets: [1,3,3,3,1,1], startFret: 1, barre: { fret:1, from:0, to:5 } },
  Gsus2:  { frets: [3,2,0,0,3,3], startFret: 1 },
  "F#sus2":{ frets: [2,4,4,4,2,2], startFret: 1 },
  "F#sus4":{ frets: [2,4,4,4,2,2], startFret: 1 },
  "Bbsus2":{ frets: [-1,1,3,3,1,1], startFret: 1 },
  "Bbsus4":{ frets: [-1,1,3,3,4,1], startFret: 1 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG chord diagram
// ─────────────────────────────────────────────────────────────────────────────
const SW   = 11;  // string spacing (px)
const FH   = 13;  // fret height (px)
const TOP  = 20;  // y of nut / top fret line
const LEFT = 10;  // x of first (low-E) string
const W    = LEFT + SW * 5 + 9;  // ≈ 74
const H    = TOP  + FH * 5 + 8;  // ≈ 93

const sx  = (i) => LEFT + i * SW;               // x centre of string i
const fy  = (f) => TOP  + f * FH;               // y of fret line f  (0 = nut)
const dy  = (f) => TOP  + (f - 0.5) * FH;       // y of dot in slot f (1-based)

export function ChordDiagram({ name, known }) {
  const shape = CHORD_SHAPES[name];
  if (!shape) return null;

  const { frets, barre, startFret = 1 } = shape;
  const isOpen = startFret === 1;
  const dotColor  = known ? "#00d4ff" : "#ff6b6b";
  const dotOpacity = 1;

  return (
    <div className="chord-diagram-wrap">
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Nut (thick bar) or fret-position label ── */}
        {isOpen ? (
          <rect
            x={sx(0)} y={TOP - 2}
            width={sx(5) - sx(0)} height={3}
            fill="var(--diagram-nut)" rx="1"
          />
        ) : (
          <text
            x={sx(0) - 4} y={dy(1) + 4}
            fontSize="7" fill="var(--diagram-label)"
            textAnchor="end" fontFamily="Inter,sans-serif"
          >
            {startFret}fr
          </text>
        )}

        {/* ── Fret lines ── */}
        {[1, 2, 3, 4, 5].map((f) => (
          <line
            key={f}
            x1={sx(0)} y1={fy(f)}
            x2={sx(5)} y2={fy(f)}
            stroke="var(--diagram-fret)" strokeWidth={1}
          />
        ))}

        {/* ── String lines ── */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1={sx(i)} y1={TOP}
            x2={sx(i)} y2={fy(5)}
            stroke="var(--diagram-string)"
            strokeWidth={i === 0 || i === 5 ? 1.5 : 1}
          />
        ))}

        {/* ── Open / mute symbols ── */}
        {frets.map((f, i) => {
          if (f === 0) return (
            <circle key={i}
              cx={sx(i)} cy={TOP - 8} r={4}
              fill="none" stroke="var(--diagram-open)" strokeWidth={1.2}
            />
          );
          if (f === -1) return (
            <g key={i}>
              <line x1={sx(i)-3.5} y1={TOP-13} x2={sx(i)+3.5} y2={TOP-6}
                stroke="var(--diagram-mute)" strokeWidth={1.5} strokeLinecap="round" />
              <line x1={sx(i)+3.5} y1={TOP-13} x2={sx(i)-3.5} y2={TOP-6}
                stroke="var(--diagram-mute)" strokeWidth={1.5} strokeLinecap="round" />
            </g>
          );
          return null;
        })}

        {/* ── Barre ── */}
        {barre && (
          <rect
            x={sx(barre.from) - 5}
            y={dy(barre.fret) - 5}
            width={sx(barre.to) - sx(barre.from) + 10}
            height={10}
            rx={5}
            fill={dotColor}
            opacity={dotOpacity}
          />
        )}

        {/* ── Individual dots ── */}
        {frets.map((f, i) => {
          if (f <= 0) return null;
          // Skip dots already covered by the barre
          if (barre && barre.fret === f && i >= barre.from && i <= barre.to) return null;
          return (
            <circle key={i}
              cx={sx(i)} cy={dy(f)} r={5}
              fill={dotColor} opacity={dotOpacity}
            />
          );
        })}
      </svg>

      <div className="chord-diagram-name">{name}</div>
    </div>
  );
}

// Strip slash bass note (A9/G → A9) and parenthetical suffix (F#m7(11) → F#m7)
function normalizeChord(chord) {
  return chord.split("/")[0].replace(/\(.*\)$/, "").trim();
}

// Renders a scrollable row of diagrams for a list of chord names
export function ChordDiagramRow({ chords, knownChords }) {
  const seen = new Set();
  const unique = chords
    .map(normalizeChord)
    .filter((c) => CHORD_SHAPES[c] && !seen.has(c) && seen.add(c));
  if (unique.length === 0) return null;

  return (
    <div className="chord-diagram-row">
      {unique.map((chord) => (
        <ChordDiagram
          key={chord}
          name={chord}
          known={knownChords ? knownChords.has(chord) : true}
        />
      ))}
    </div>
  );
}
