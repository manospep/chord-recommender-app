export const GENRES = [
  "All Genres", "Metal", "Rock", "Pop", "Hip Hop", "R&B / Soul",
  "Country", "Jazz", "Blues", "Electronic", "Folk", "Classical", "Reggae", "Latin", "Other",
];

export const PROGRESSIONS = [
  { name: "Pop / Rock",  label: "I – V – vi – IV", chords: ["C", "G", "Am", "F"] },
  { name: "Minor Pop",   label: "vi – IV – I – V",  chords: ["Am", "F", "C", "G"] },
  { name: "50s",         label: "I – vi – IV – V",  chords: ["C", "Am", "F", "G"] },
  { name: "Blues",       label: "12-bar shuffle",   chords: ["A", "D", "E"] },
  { name: "Jazz",        label: "ii – V – I",       chords: ["Dm", "G7", "Cmaj7"] },
  { name: "Rock Anthem", label: "i – VII – VI",     chords: ["Am", "G", "F"] },
];

/** The first chords almost every beginner learns — one tap to add. */
export const STARTER_CHORDS = ["G", "C", "D", "Em", "Am", "E", "A", "Dm"];

export const GENRE_COLORS: Record<string, [string, string]> = {
  "Metal":      ["#ff4757", "#c0392b"],
  "Rock":       ["#ff6348", "#d63031"],
  "Pop":        ["#fd79a8", "#e84393"],
  "Hip Hop":    ["#a29bfe", "#6c5ce7"],
  "R&B / Soul": ["#fd79a8", "#b44fff"],
  "Country":    ["#fdcb6e", "#e17055"],
  "Jazz":       ["#55efc4", "#00b894"],
  "Blues":      ["#74b9ff", "#0984e3"],
  "Electronic": ["#00e5ff", "#b84fff"],
  "Folk":       ["#b8e994", "#6ab04c"],
  "Classical":  ["#ffeaa7", "#f9ca24"],
  "Reggae":     ["#55efc4", "#079992"],
  "Latin":      ["#fd79a8", "#fdcb6e"],
  "Other":      ["#b2bec3", "#636e72"],
};

/** Open-position chords a beginner can play without a barre. */
const EASY_CHORDS = new Set([
  "C", "D", "E", "G", "A", "Am", "Em", "Dm", "A7", "D7", "E7", "G7", "C7",
  "Asus2", "Asus4", "Dsus2", "Dsus4", "Csus2", "Esus4", "Gsus4", "Cadd9", "Gadd9",
  "Am7", "Em7", "Dm7", "Amaj7", "Cmaj7", "Gmaj7", "Dmaj7",
]);

export type Difficulty = "Easy" | "Medium" | "Advanced";

/**
 * Rough playability rating for beginners: barre chords and unusual shapes
 * push a song up the scale.
 */
export function chordDifficulty(chords?: string[]): { level: Difficulty; score: 1 | 2 | 3 } {
  if (!chords || chords.length === 0) return { level: "Medium", score: 2 };
  const hard = chords.filter(c => !EASY_CHORDS.has(c.trim())).length;
  const ratio = hard / chords.length;
  if (hard === 0 && chords.length <= 4) return { level: "Easy", score: 1 };
  if (ratio <= 0.34) return { level: "Medium", score: 2 };
  return { level: "Advanced", score: 3 };
}

/**
 * Fret positions for the most common beginner shapes.
 * Index 0 = low E string. -1 = muted, 0 = open.
 */
export const CHORD_SHAPES: Record<string, number[]> = {
  C:   [-1, 3, 2, 0, 1, 0],
  D:   [-1, -1, 0, 2, 3, 2],
  E:   [0, 2, 2, 1, 0, 0],
  G:   [3, 2, 0, 0, 0, 3],
  A:   [-1, 0, 2, 2, 2, 0],
  Am:  [-1, 0, 2, 2, 1, 0],
  Em:  [0, 2, 2, 0, 0, 0],
  Dm:  [-1, -1, 0, 2, 3, 1],
  F:   [1, 3, 3, 2, 1, 1],
  A7:  [-1, 0, 2, 0, 2, 0],
  D7:  [-1, -1, 0, 2, 1, 2],
  E7:  [0, 2, 0, 1, 0, 0],
  G7:  [3, 2, 0, 0, 0, 1],
  C7:  [-1, 3, 2, 3, 1, 0],
  Am7: [-1, 0, 2, 0, 1, 0],
  Em7: [0, 2, 0, 0, 0, 0],
  Bm:  [-1, 2, 4, 4, 3, 2],
  Cadd9: [-1, 3, 2, 0, 3, 3],
};
