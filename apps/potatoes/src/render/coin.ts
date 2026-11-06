// The tier coin `format` leaves in numbers: a 13x13 pixel coin with its tier stamped on the face.
// Warm brass, like everything else on the farm.

import type { Art } from "./pixel.js";

const K = "#402e3a"; // shared outline ink

const BODY = [
  "....kkkkk....",
  "..kkhhhhhkk..",
  ".khhffffffsk.",
  ".khwffffffsk.",
  "khfffffffffsk",
  "khfffffffffsk",
  "khfffffffffsk",
  "khfffffffffsk",
  "khfffffffffsk",
  ".khfffffffsk.",
  ".ksfffffffsk.",
  "..kkssssskk..",
  "....kkkkk....",
];

// 3x5, stamped on rows 4-8; two digits just fit inside the rim.
const DIGITS = [
  ["###", "#.#", "#.#", "#.#", "###"],
  [".#.", "##.", ".#.", ".#.", "###"],
  ["###", "..#", "###", "#..", "###"],
  ["###", "..#", ".##", "..#", "###"],
  ["#.#", "#.#", "###", "..#", "..#"],
  ["###", "#..", "###", "..#", "###"],
  ["###", "#..", "###", "#.#", "###"],
  ["###", "..#", ".#.", ".#.", ".#."],
  ["###", "#.#", "###", "#.#", "###"],
  ["###", "#.#", "###", "..#", "###"],
];

const PALETTE = { k: K, h: "#ffe08a", f: "#f2c14e", s: "#c58a2a", d: "#9a5f1c", w: "#fff6d0" };

const cache = new Map<number, Art>();

export function coinArt(tier: number): Art {
  let art = cache.get(tier);
  if (art) return art;
  const grid = BODY.map((r) => [...r]);
  const glyphs = [...String(tier)].map(Number);
  const x0 = Math.floor((13 - (glyphs.length * 4 - 1)) / 2);
  glyphs.forEach((n, i) =>
    DIGITS[n]!.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === "#") grid[4 + dy]![x0 + i * 4 + dx] = "d";
      }),
    ),
  );
  art = { rows: grid.map((r) => r.join("")), palette: PALETTE };
  cache.set(tier, art);
  return art;
}
