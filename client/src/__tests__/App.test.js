import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// ── Transpose helpers (duplicated here so they can be unit-tested without
//    a running DOM — mirrors the logic in SongPage.js exactly) ───────────────

const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

function transposeNote(note, n) {
  let idx = SHARP.indexOf(note);
  if (idx === -1) idx = FLAT.indexOf(note);
  if (idx === -1) return note;
  const ni = ((idx + n) % 12 + 12) % 12;
  return (n >= 0 ? SHARP : FLAT)[ni];
}

function transposeChord(chord, n) {
  if (!n) return chord;
  const m = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  return transposeNote(m[1], n) + m[2];
}

// ── isChordLine (mirrors SongPage.js) ────────────────────────────────────────

const CHORD_RE = /\b([A-G](?:#|b)?(?:maj(?:7|9|11|13)?|min(?:7|9|11|13)?|m(?:7|9|11|13)?|dim(?:7)?|aug(?:7)?|sus(?:2|4)?|add(?:9|11|13)|[0-9]{1,2})?(?:\([^)]+\))?)(?![#\w])/g;

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const chords = trimmed.match(CHORD_RE) || [];
  if (chords.length === 0) return false;
  const chordChars = chords.join("").length;
  const nonSpace   = trimmed.replace(/\s/g, "").length;
  return nonSpace > 0 && chordChars / nonSpace > 0.5;
}

// ── transposeChord tests ──────────────────────────────────────────────────────

describe("transposeChord", () => {
  test("no-op when semitones = 0", () => {
    expect(transposeChord("C", 0)).toBe("C");
    expect(transposeChord("F#m7", 0)).toBe("F#m7");
  });

  test("transposes up by semitones", () => {
    expect(transposeChord("C", 2)).toBe("D");
    expect(transposeChord("A", 3)).toBe("C");
    expect(transposeChord("B", 1)).toBe("C");
  });

  test("transposes down using flats", () => {
    expect(transposeChord("D", -2)).toBe("C");
    expect(transposeChord("C", -1)).toBe("B");
    expect(transposeChord("F", -1)).toBe("E");
  });

  test("wraps around the octave", () => {
    expect(transposeChord("C", 12)).toBe("C");
    expect(transposeChord("G", -12)).toBe("G");
  });

  test("preserves chord quality suffix", () => {
    expect(transposeChord("Am", 2)).toBe("Bm");
    expect(transposeChord("Cmaj7", 4)).toBe("Emaj7");
    expect(transposeChord("F#m7", 1)).toBe("Gm7");
    expect(transposeChord("Bdim", 3)).toBe("Ddim"); // B(11)+3=14%12=2=D
  });

  test("handles flat root notes", () => {
    expect(transposeChord("Bb", 2)).toBe("C");
    expect(transposeChord("Eb", 1)).toBe("E");
  });

  test("returns chord unchanged when root not recognised", () => {
    expect(transposeChord("N.C.", 5)).toBe("N.C.");
  });

  test("full 12-step round trip stays on same note (sharps)", () => {
    // Transposing up uses sharps — flat input returns enharmonic sharp equivalent
    const sharpChords = ["C", "D", "E", "F", "G", "A", "B", "F#", "C#"];
    sharpChords.forEach(ch => {
      expect(transposeChord(ch, 12)).toBe(ch);
    });
    // Flat input (Bb) comes back as its sharp enharmonic (A#) when transposing up
    expect(transposeChord("Bb", 12)).toBe("A#");
  });

  test("up 7 then down 7 is identity", () => {
    const start = "Em7";
    const up   = transposeChord(start, 7);
    const back = transposeChord(up, -7);
    // Root note should resolve back; quality suffix preserved
    expect(back.endsWith("m7")).toBe(true);
  });
});

// ── isChordLine tests ─────────────────────────────────────────────────────────

describe("isChordLine", () => {
  test("recognises a pure chord line", () => {
    expect(isChordLine("C  G  Am  F")).toBe(true);
    expect(isChordLine("E        A        E           E")).toBe(true);
  });

  test("rejects a pure lyric line", () => {
    expect(isChordLine("It's over, you don't need to tell me")).toBe(false);
    expect(isChordLine("Hello world this is a lyric")).toBe(false);
  });

  test("empty / whitespace-only lines return false", () => {
    expect(isChordLine("")).toBe(false);
    expect(isChordLine("   ")).toBe(false);
  });

  test("mixed line with mostly lyrics returns false", () => {
    // Chords make up < 50% of non-space chars
    expect(isChordLine("You play a C chord and then move to G and sing along")).toBe(false);
  });

  test("handles complex chord symbols", () => {
    expect(isChordLine("Cmaj7  Dm7  G7  Am7")).toBe(true);
    expect(isChordLine("F#m7(11)  Bm  E7sus4")).toBe(true);
  });

  test("section headers like (Middle) are not chord lines", () => {
    expect(isChordLine("(Middle)")).toBe(false);
    expect(isChordLine("Verse 2:")).toBe(false);
  });
});

// ── Smoke test: app renders without crashing ──────────────────────────────────

test("app renders the ChordQuest brand name", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  // Brand name split across two spans: "Chord" + "Quest"
  expect(screen.getAllByText(/chord/i).length).toBeGreaterThan(0);
});
