// Every piece of pixel art in the game, as char grids: `ICONS` (12x12 UI glyphs) and `PROPS` (scene furniture).
// Hard rule: the shared outline ink `K` on everything.

import type { Art } from "./pixel.js";

const K = "#402e3a"; // shared outline ink

// Palettes are per-art and deliberately tiny; these are the recurring members.
const POTATO = { p: "#c98b4b", l: "#e2b077", d: "#95602c" };
const METAL = { m: "#a8b0b8", s: "#7f8891", g: "#bfe3ef" };
const WOOD = { w: "#7a5237", v: "#5e3e29" };

// --- UI icons — 12x12 ---

export const ICONS = {
  // Oblong and tilted, not a disc: a shaded circle on a button is a biscuit.
  potato: {
    rows: [
      "............",
      ".....kkkkk..",
      "...kkllppdk.",
      "..kllpppppdk",
      ".kllpdppppdk",
      ".klppppppddk",
      "kllppppppdk.",
      "kppppdpppdk.",
      "kpppppppdk..",
      ".kkppppddk..",
      "...kkkkkk...",
      "............",
    ],
    palette: { k: K, ...POTATO },
  },

  sprout: {
    rows: [
      "......k.....",
      ".kkk..k..kk.",
      "kgggk.k.kgk.",
      "kgggkkkkggk.",
      ".kggggkggkk.",
      "...kkgkkk...",
      ".....g......",
      ".....g......",
      ".....g......",
      "..kkkkkkk...",
      "..kdddddk...",
      "...kkkkk....",
    ],
    palette: { k: K, g: "#6aa348", d: "#8a5f3f" },
  },

  basket: {
    rows: [
      "...kk..kk...",
      "..k.kkkk.k..",
      "..k.k..k.k..",
      "kkkkkkkkkkkk",
      "kbbbbbbbbbbk",
      "kbllbbbbllbk",
      "kbbbbbbbbbbk",
      "kbllbbbbllbk",
      ".kbbbbbbbbk.",
      ".kbllbbllbk.",
      "..kbbbbbbk..",
      "...kkkkkk...",
    ],
    palette: { k: K, b: "#b07c42", l: "#d6a86a" },
  },

  shield: {
    rows: [
      "kkkkkkkkkkkk",
      "kggggggggggk",
      "kgglggggggkk",
      "kggllgggggk.",
      "kgggggggggk.",
      ".kggggggggk.",
      ".kgggggggk..",
      "..kggggggk..",
      "..kgggggk...",
      "...kgggk....",
      "....kgk.....",
      ".....k......",
    ],
    palette: { k: K, g: "#5f9c46", l: "#8cc35f" },
  },

  clipboard: {
    rows: [
      "....kkkkk...",
      "..kkkccckkk.",
      "..kpppppppk.",
      "..kplllllpk.",
      "..kpppppppk.",
      "..kplllllpk.",
      "..kpppppppk.",
      "..kplllllpk.",
      "..kpppppppk.",
      "..kpppppppk.",
      "..kkkkkkkkk.",
      "............",
    ],
    palette: { k: K, p: "#fdf3e0", c: "#c9a96a", l: "#c9b896" },
  },

  house: {
    rows: [
      ".....kk.....",
      "....krrk....",
      "...krrrrk...",
      "..krrrrrrk..",
      ".krrrrrrrrk.",
      "krrrrrrrrrrk",
      "kkkkkkkkkkkk",
      "kbbbkbbkbbbk",
      "kbbbkbbkbbbk",
      "kbbbkbbkbbbk",
      "kbbbkkkkbbbk",
      "kkkkkkkkkkkk",
    ],
    palette: { k: K, r: "#b5503c", b: "#e7d5b4" },
  },

  alert: {
    rows: [
      "...kkkkkk...",
      "..kaaaaaak..",
      ".kaaakkaaak.",
      "kaaaakkaaaak",
      "kaaaakkaaaak",
      "kaaaakkaaaak",
      "kaaaakkaaaak",
      "kaaaaaaaaaak",
      "kaaaakkaaaak",
      ".kaaakkaaak.",
      "..kaaaaaak..",
      "...kkkkkk...",
    ],
    palette: { k: K, a: "#e0a03c" },
  },

  // The upkeep tab: a spanner, since past the fold there is no weather to draw.
  wrench: {
    rows: [
      "..kkk.kkk...",
      "..kmk.kmk...",
      "..kmk.kmk...",
      "..kmmmmmk...",
      "...kmmmk....",
      "....kmk.....",
      "....kmk.....",
      "....kmk.....",
      "....kmk.....",
      "...kmmmk....",
      "...kmmmk....",
      "...kkkkk....",
    ],
    palette: { k: K, m: METAL.m },
  },

  cloud: {
    rows: [
      "............",
      "............",
      "....kkkk....",
      "..kkcccckk..",
      ".kcccccccck.",
      "kcccccccccck",
      "kcccccccccck",
      ".kkcccccckk.",
      "...kkkkkk...",
      "............",
      "............",
      "............",
    ],
    palette: { k: K, c: "#dfe7ee" },
  },
} satisfies Record<string, Art>;

export type IconName = keyof typeof ICONS;

// --- Scenery ---

export const BARN: Art = {
  rows: [
    "........kkkk........",
    "......kkrrrrkk......",
    "....kkrrrrrrrrkk....",
    "..kkrrrrrrrrrrrrkk..",
    ".krrrrrrrrrrrrrrrrk.",
    ".krrrrrrrrrrrrrrrrk.",
    "kkkkkkkkkkkkkkkkkkkk",
    "krrrrrrrrrrrrrrrrrrk",
    "krrwwwrrrrrrrrwwwrrk",
    "krrwwwrrkkkkrrwwwrrk",
    "krrrrrrkwwwwkrrrrrrk",
    "krrrrrrkwwwwkrrrrrrk",
    "krrrrrrkwwwwkrrrrrrk",
    "krrrrrrkwwwwkrrrrrrk",
    "kkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: K, r: "#b5503c", w: "#f2e3c8" },
};

export const TREE: Art = {
  rows: [
    ".....kkkkk......",
    "...kkgggggkk....",
    "..kggglgggggk...",
    ".kgglllggggggk..",
    ".kglllllgglggk..",
    "kggllllggglllgk.",
    "kglllllggggllgk.",
    "kgglllgggggggk..",
    ".kggggggglggk...",
    "..kkgggggggk....",
    "....kkgggkk.....",
    "......ktbk......",
    "......ktbk......",
    ".....kttbk......",
    ".....ktttbk.....",
  ],
  palette: { k: K, g: "#4e8a3c", l: "#74b356", t: "#7a5230", b: "#5c3d22" },
};

export const CLOUD: Art = {
  rows: [
    "...wwwww......",
    ".wwwwwwwww....",
    "wwwwwwwwwwwww.",
    ".wwwwwwwwwww..",
  ],
  palette: { w: "#ffffff" },
};

/** One tileable panel of post-and-rail. The scene repeats it along the yard. */
export const FENCE: Art = {
  rows: [
    "w......w",
    "wwwwwwww",
    "w......w",
    "wwwwwwww",
    "w......w",
    "v......v",
  ],
  palette: WOOD,
};

/** The yard light by the gate: off by day, lit at dusk. The pool it throws is the half of the yard that goes dark. */
const LAMP_ROWS = [
  "kkkkk",
  "kgggk",
  "kgggk",
  ".kgk.",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  "..m..",
  ".kmk.",
  "kkmkk",
];

export const LAMP: Art = {
  rows: LAMP_ROWS,
  palette: { k: K, g: "#5e6870", m: "#7f8891" },
};

/** The same post with the light on. */
export const LAMP_ON: Art = {
  rows: LAMP_ROWS,
  palette: { k: K, g: "#ffe9a8", m: "#8b949c" },
};

/** Filler for the bits of field nothing has been built on yet. */
export const TUFT: Art = {
  rows: ["g..g..g", ".g.g.g.", ".ggggg."],
  palette: { g: "#548f3e" },
};

export const FLOWERS: Art = {
  rows: [".r...w...p.", "rrr.www.ppp", ".r.g.w.g.p.", ".g.g.g.g.g."],
  palette: { g: "#548f3e", r: "#e06a7c", w: "#f6f1dc", p: "#c98add" },
};

/** A single potato plant. The plot tier is drawn as rows of these. */
export const PLANT: Art = {
  rows: [
    "..g.g..",
    ".ggggg.",
    "gglllgg",
    ".ggggg.",
    "..gsg..",
    ".ddddd.",
  ],
  palette: { g: "#4e8a3c", l: "#74b356", s: "#3e6b2e", d: "#8a5f3f" },
};

const WITHERED = new Map<Art, Art>();

/** The same crop, gone dry. Keyed off the planted mark: it is the colour that goes, not the plant. */
export function withered(art: Art): Art {
  const hit = WITHERED.get(art);
  if (hit) return hit;
  const dried: Art = {
    rows: art.rows,
    palette: { ...art.palette, g: "#8d8a3a", l: "#a89b46", s: "#6b6428", w: "#d6cdb0" },
  };
  WITHERED.set(art, dried);
  return dried;
}

const SHRUNK = new Map<Art, Art>();

/**
 * Half-size version for the back ranks. Resampled on the char grid (no fractional transforms in the scene).
 * Each 2x2 block votes, top-left breaks ties; nearest-neighbour ate the 1px outline on odd columns.
 */
export function shrunk(art: Art): Art {
  const hit = SHRUNK.get(art);
  if (hit) return hit;

  const w = art.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const rows: string[] = [];
  for (let y = 0; y < art.rows.length; y += 2) {
    let row = "";
    for (let x = 0; x < w; x += 2) {
      const votes = new Map<string, number>();
      let best = ".";
      for (const [dy, dx] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ] as const) {
        const c = art.rows[y + dy]?.[x + dx] ?? ".";
        if (c === "." || !art.palette[c]) continue;
        const n = (votes.get(c) ?? 0) + 1;
        votes.set(c, n);
        if (n > (votes.get(best) ?? 0)) best = c;
      }
      row += best;
    }
    rows.push(row);
  }

  const small: Art = { rows, palette: art.palette };
  SHRUNK.set(art, small);
  return small;
}

const CROP_STAGES = new Map<Art, Art[]>();

/**
 * A bed part-grown: four stages derived from the planted mark.
 * Early stages are the bottom slice of the full plant, so callers must bottom-align them.
 */
export function cropStages(art: Art): readonly Art[] {
  const hit = CROP_STAGES.get(art);
  if (hit) return hit;

  const rows = art.rows;
  const n = rows.length;
  const slice = (from: number): Art => ({ rows: rows.slice(from), palette: art.palette });

  // Ripe: every other filled pixel of the bottom row, so it reads as lumps not a stripe.
  const base = rows[n - 1] ?? "";
  const lifted = [...base].map((c, i) => (c !== "." && i % 2 === 1 ? "o" : c)).join("");
  const ripe: Art = {
    rows: [...rows.slice(0, n - 1), lifted],
    palette: { ...art.palette, o: "#c98b4b" },
  };

  const stages = [slice(n - 3), slice(Math.max(1, Math.floor(n * 0.4))), art, ripe];
  CROP_STAGES.set(art, stages);
  return stages;
}

// --- The hoard — what a pile of potatoes turns into ---

/** The loose potato: carried, dug, heaped, in the pipeline. Outlined, or a queue of them is a tan line. */
export const POTATO_SPRITE: Art = {
  rows: [
    ".kkkk..",
    "klllpk.",
    "kllppdk",
    ".kppddk",
    "..kkkk.",
  ],
  palette: { k: K, ...POTATO },
};

export const SACK: Art = {
  rows: [
    "...ppppp...",
    "...kkkkk...",
    "..kbbbbbk..",
    "..kbbbbbk..",
    ".kbbllbbbk.",
    ".kblllbbbk.",
    "kbbllbbbbbk",
    "kbbbbbbbbbk",
    "kbbbbbbbbbk",
    "kbbbbbbbbbk",
    "kbbbbbbbbbk",
    ".kbbbbbbbk.",
    "..kkkkkkk..",
  ],
  palette: { k: K, b: "#b98a52", l: "#d6ab73", p: "#c98b4b" },
};

export const CRATE: Art = {
  rows: [
    "..pp.pp.pp.pp..",
    ".pp.pp.pp.pp.p.",
    "kkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwk",
    "kwvvwwwwwwvvwwk",
    "kwwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwk",
    "kwwvvwwwwvvwwwk",
    "kwwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkk",
  ],
  palette: { k: K, w: "#a97a52", v: "#7a5237", p: "#c98b4b" },
};

/** Silo and hydroponic tower are tall enough that their repeating middles are generated; caps and bases are hand-authored. */
function stack(cap: string[], body: string[], reps: number, base: string[]): string[] {
  const rows = [...cap];
  for (let i = 0; i < reps; i++) rows.push(...body);
  rows.push(...base);
  return rows;
}

/** Squat on purpose: it stands in a ~20px band next to crates, and a true-height silo would eat the field above. */
export const SILO: Art = {
  rows: stack(
    [
      "....kkkkk....",
      "..kkmmmmmkk..",
      ".kmmmmmmmmmk.",
      "kmmmmmmmmmmmk",
      "kkkkkkkkkkkkk",
    ],
    ["kmmsmmmmmmmmk", "kmmsmmmmmmmmk", "kmmsmmmmmmmmk", "kkkkkkkkkkkkk"],
    3,
    ["kmmsmmmmmmmmk", "kmmsmmmmmmmmk", "kkkkkkkkkkkkk"],
  ),
  palette: { k: K, ...METAL },
};

/** A barrow of stock: the first thing in the yard that is not just potatoes. */
export const BARROW: Art = {
  rows: [
    "....pp.pp....",
    "..ppplpppdp..",
    ".kkkkkkkkkkk.",
    ".kwwwwwwwwwk.",
    ".kwvwwwwwvwk.",
    ".kwwwwwwwwwk.",
    ".kkkkkkkkkkk.",
    "..k.......k..",
    ".kkk.....kkk.",
    "kkvkk...kkvkk",
    ".kkk.....kkk.",
  ],
  palette: { k: K, ...POTATO, ...WOOD },
};

/** A storage shed. Wide and low, so it reads as a step up from a crate. */
export const SHED: Art = {
  rows: [
    "....kkkkkkkkkkkkkkkkkkk....",
    "..kkmmmmmmmmmmmmmmmmmmmkk..",
    ".kmmmmmmmmmmmmmmmmmmmmmmmk.",
    "kmmmmmmmmmmmmmmmmmmmmmmmmmk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwvwwwwwwwwwwwwwwwwwwwwwvwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwkkkkkkkkkkkkkkkkkkkkkwwk",
    "kwwkvvvvvvvvvvvvvvvvvvvkwwk",
    "kwwkvvvvvvvvvvvvvvvvvvvkwwk",
    "kwwkvvvvvvvvvvvvvvvvvvvkwwk",
    "kwwkvvvvvvvvvvvvvvvvvvvkwwk",
    "kwwkvvvvvvvvvvvvvvvvvvvkwwk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: K, ...METAL, ...WOOD },
};

/** A grain elevator, the tallest thing you own: taller than the yard is deep, so the last rungs clear the fence line. */
export const ELEVATOR: Art = {
  rows: stack(
    [
      "......kkkkkkk......",
      "....kkmmmmmmmkk....",
      "...kmmmmmmmmmmmk...",
      "...kmmsmmmmmmmmk...",
      "...kkkkkkkkkkkkk...",
      "..kmmmmmmmmmmmmmk..",
      ".kmmmmmmmmmmmmmmmk.",
      "kmmmmmmmmmmmmmmmmmk",
      "kkkkkkkkkkkkkkkkkkk",
    ],
    ["kmmsmmmmmmmmmmmsmmk", "kmmsmmmmmmmmmmmsmmk", "kmmsmmmmmmmmmmmsmmk", "kkkkkkkkkkkkkkkkkkk"],
    4,
    ["kmmsmmmmmmmmmmmsmmk", "kmmsmmmmmmmmmmmsmmk", "kkkkkkkkkkkkkkkkkkk"],
  ),
  palette: { k: K, ...METAL },
};

// --- Producers — one silhouette per rung of the ladder ---

export const FARMHAND: Art = {
  rows: [
    "..ttt..",
    ".ttttt.",
    "..fff..",
    "..fef..",
    "..fff..",
    ".bbbbb.",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: { k: K, t: "#c9a24a", f: "#e8bb8e", e: K, b: "#4a7fa5", v: "#5e3e29" },
};

export const SPRINKLER: Art = {
  rows: [
    "....a..a.....",
    "..a...a...a..",
    ".a..mmmmm..a.",
    "....mmmmm....",
    "......m......",
    "......m......",
    "......m......",
    "......m......",
    "....kkkkk....",
    "...kkkkkkk...",
  ],
  palette: { k: K, m: "#a8b0b8", a: "#8ec9e6" },
};

export const TRACTOR: Art = {
  rows: [
    "...kkkkkk.........",
    "..kbbbbbbk........",
    "..kbggggbk........",
    "..kbggggbk........",
    "kkkbbbbbbkkkkkkk..",
    "kbbbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkk..",
    ".kwwwwk...kwwk....",
    "kwwwwwwk.kwwwwk...",
    "kwwwwwwk.kwwwwk...",
    ".kwwwwk...kwwk....",
  ],
  palette: { k: K, b: "#4f8f3a", g: "#bfe3ef", w: "#4d4148" },
};

export const COMBINE: Art = {
  rows: [
    "........kkkkkkk.........",
    ".......kbbbbbbbk........",
    ".......kbggggbbk........",
    "kkkk...kbbbbbbbk........",
    "kyyk..kkbbbbbbbkkkkkk...",
    "kyyk.kbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkkkkkkkkkkkkkkkk...",
    "kkkk..kwwwwwwk..kwwk....",
    "......kwwwwwwk..kwwk....",
    ".....kkwwwwwwkk.kwwk....",
    ".....kwwwwwwwwk.kwwk....",
    "......kwwwwwwk...kk.....",
  ],
  palette: { k: K, b: "#c93f34", y: "#c9a24a", g: "#bfe3ef", w: "#4d4148" },
};

export const LAB: Art = {
  rows: [
    "......kkkk........",
    "....kkggggkk......",
    "...kggggggggk.....",
    "...kggggggggk.....",
    "kkkkkkkkkkkkkkkk..",
    "kwwwwwwwwwwwwwwk..",
    "kwggwwwggwwwggwk..",
    "kwggwwwggwwwggwk..",
    "kwwwwwwwwwwwwwwk..",
    "kwwwwwwwwwwwwwwk..",
    "kwwwwwkkkkwwwwwk..",
    "kwwwwwkddkwwwwwk..",
    "kwwwwwkddkwwwwwk..",
    "kkkkkkkkkkkkkkkk..",
  ],
  palette: { k: K, w: "#e7e2d4", g: "#7fd0e0", d: "#7a5237" },
};

export const REFINERY: Art = {
  rows: [
    "...........kkk......",
    "...........kgk......",
    "..kkkkkk...kgk......",
    ".kmmmmmmk..kgk......",
    ".kmmmmmmk..kgk..kkk.",
    ".kmmmmmmk..kgk.kmmk.",
    ".kmmmmmmkkkkgkkkmmk.",
    ".kmmmmmmkmmmgmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kkkkkkkkkkkkkkkkkk.",
  ],
  palette: { k: K, m: "#a8b0b8", g: "#7f8891" },
};

export const TOWER: Art = {
  rows: stack(
    [
      "..kkkkkkkk..",
      ".kmmmmmmmmk.",
      "kmmmmmmmmmmk",
      "kkkkkkkkkkkk",
    ],
    ["kmggmmggmmmk", "kmggmmggmmmk", "kkkkkkkkkkkk"],
    6,
    ["kmmmmmmmmmmk", "kmmmmmmmmmmk", "kkkkkkkkkkkk"],
  ),
  palette: { k: K, m: "#cfd6dc", g: "#6dc45a" },
};

export const SEEDER: Art = {
  rows: [
    "....kkkkkk....",
    "..kkcccccckk..",
    ".kcccccccccck.",
    "kcccccccccccck",
    ".kcccccccccck.",
    "..kkcccccckk..",
    "....kmmmmk....",
    ".....aaaa.....",
  ],
  palette: { k: K, c: "#dfe7ee", m: "#a8b0b8", a: "#8ec9e6" },
};

/** A cooling tower: open mouth with the shaft dark in it, a waist, lit core, hazard band, vents at the foot. */
export const REACTOR: Art = {
  rows: [
    "..kkkkkkkkkk..",
    ".kkddddddddkk.",
    ".kmmmmmmmmmmk.",
    "..kmmmmmmmmk..",
    "...kmmmmmmk...",
    "...kmggggmk...",
    "...kmggggmk...",
    "...kmmmmmmk...",
    "..kmmmmmmmmk..",
    "..kmmmmmmmmk..",
    ".kmmmmmmmmmmk.",
    ".khhhhhhhhhhk.",
    "kkmmmmmmmmmmkk",
    "kmkkmmmmmmkkmk",
    "kkkkkkkkkkkkkk",
  ],
  palette: { k: K, m: "#cfd6dc", d: "#6b737c", e: "#8d959d", g: "#7fe8cc", h: "#e8b93f" },
};

/** The Orbital Greenhouse: a growing module, not a satellite. Must not read as a machine — it is a garden in orbit. */
export const GREENHOUSE: Art = {
  rows: [
    ".........kk.........",
    "......kkkkkkkk......",
    ".....kcccccccck.....",
    "....kccckcckccck....",
    "kbbkkggckggkcggkkbbk",
    "kbbkkgggkggkgggkkbbk",
    "kbbkkmmmmmmmmmmkkbbk",
    "kkkkkmymmmmmmymkkkkk",
    "....kmmmmmmmmmmk....",
    ".....kkkkkkkkkk.....",
    "........kmmk........",
  ],
  palette: { k: K, b: "#4a7fa5", c: "#bfe3ef", g: "#6dc45a", m: "#a8b0b8", y: "#ffe08a" },
};

export const SINGULARITY: Art = {
  rows: [
    "....pppppp....",
    "..pp......pp..",
    ".p...vvvv...p.",
    "p..vv....vv..p",
    "p.v...nn...v.p",
    "pv..nnnnnn..vp",
    "pv.nnnnnnnn.vp",
    "pv.nnnnnnnn.vp",
    "pv..nnnnnn..vp",
    "p.v...nn...v.p",
    "p..vv....vv..p",
    ".p...vvvv...p.",
    "..pp......pp..",
    "....pppppp....",
  ],
  palette: { p: "#8a6ad0", v: "#5b3fa0", n: "#1c1428" },
};

// --- Above the fold — the four tiers that farm the potato you're inside ---
// Drawn against the ceiling's warm ochre, so these are cool and hard-edged where the farm is warm.

/** A press over a pad of bruised flesh. The two rows under it (dark bruise, pale regrowth) are the tier. */
export const BRUISE_BED: Art = {
  rows: [
    "..kkkkkkk..",
    "..kmmmmmk..",
    "...kmmmk...",
    "...kmmmk...",
    "kkkkkkkkkkk",
    "kmmmmmmmmmk",
    "kkkkkkkkkkk",
    ".kdddddddk.",
    "kdswwwwwsdk",
    ".kkkkkkkkk.",
  ],
  palette: { k: K, m: "#8d959d", d: "#5e3040", s: "#a8657a", w: "#e6dcc0" },
};

/** A wellhead with the shaft running off the bottom of the world. */
export const TAPROOT_WELL: Art = {
  rows: [
    "...kkkk...",
    "..kmmmmk..",
    "..kmggmk..",
    ".kkmmmmkk.",
    ".kmmmmmmk.",
    "kkmmmmmmkk",
    "km.kkkk.mk",
    "km.khhk.mk",
    "km.khhk.mk",
    "kmmkhhkmmk",
    "kkkkhhkkkk",
    "...khhk...",
    "...khhk...",
    "...khhk...",
  ],
  palette: { k: K, m: "#8d959d", g: "#ffb454", h: "#5b3f2c" },
};

/** One of the other yous: the farmhand's exact silhouette in a different finish, or the joke does not read. */
export const CHORUS_FIGURE: Art = {
  rows: [
    "...a...",
    "..ttt..",
    ".ttttt.",
    "..fff..",
    "..fef..",
    "..fff..",
    ".bbbbb.",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: {
    k: "#6a5c7a",
    a: "#e6dcef",
    t: "#b9a8cc",
    f: "#d8cde4",
    e: "#4a3f5c",
    b: "#8f7fb0",
    v: "#6a5c7a",
  },
};

/** An eye, opened. The one rung down here that is the potato's rather than yours. */
export const EYE: Art = {
  rows: [
    "...ss.s...",
    "..sksks...",
    "...ksk....",
    ".kkkkkkkk.",
    "khhhhhhhhk",
    "khhwwwwhhk",
    "khwwiiwwhk",
    "khwwinwwhk",
    "khhwwwwhhk",
    "khhhhhhhhk",
    ".kkkkkkkk.",
    "..k....k..",
  ],
  palette: { k: K, h: "#a8703c", w: "#e8d3a0", i: "#6f4a8f", n: "#241830", s: "#7fc45a" },
};

/** Two benches cut into starch with an undercut. Flat top + step reads as cut, not grown; a dome read as a bread roll. */
export const STARCH_FACE: Art = {
  rows: [
    "...kkkkkkkkk.",
    "...kwwwwwwwk.",
    "...kwsswwwwk.",
    "kkkkkwwwwwwk.",
    "kwwwwwwwwwwk.",
    "kwsswwwwwwwk.",
    "kwwwwwwwwwwk.",
    "kdddddddddddk",
    "kkkkkkkkkkkkk",
  ],
  palette: { k: K, w: "#e6dcc0", s: "#f7f1dc", d: "#2c1d14" },
};

/** A tapped vein. The clamp is the machine; the rest is the potato's plumbing, hence the unique colour. */
export const RING_MAIN: Art = {
  rows: [
    "..kvvk....",
    "..kvvk....",
    ".kkvvkk...",
    "kmmmmmmk..",
    "kmsggsmk..",
    "kmmmmmmk..",
    ".kkvvkk...",
    "..kvvkk...",
    "...kvvk...",
    "...kvvk...",
    "..kkvvkk..",
    "..kvvvvk..",
    "...kkkk...",
  ],
  palette: { k: K, v: "#8f5e8a", m: "#8d959d", s: "#5f6870", g: "#e0a8dc" },
};

/** A cavity propped open at the core. Ragged on every edge and dark inside: anything rectangular reads as a hung painting. */
export const HOLLOW_HEART: Art = {
  rows: [
    "...kkkkkk...",
    ".kkfllllfkk.",
    ".kflnnnnlfk.",
    "kflnnnnnnlfk",
    "kflnsnnnnlfk",
    "kflnnnnsnlfk",
    "kflnnnnnnlfk",
    ".kflnnnnlfk.",
    ".kkfllllfkk.",
    "...kkkkkk...",
    "...k....k...",
  ],
  palette: { k: K, f: "#8a4a52", l: "#c98b6a", n: "#2a1520", s: "#e8c39c" },
};

/** The last rung, hanging where the sun was. It has eyes. */
export const SECOND_POTATO: Art = {
  rows: [
    "....kkkkkkk.....",
    "..kkpppppppkk...",
    ".kpplppppppppk..",
    "kplllppppppdppk.",
    "kpllppppppdddppk",
    "kppppppppppddppk",
    "kpppppdppppppppk",
    "kppppdddpppppppk",
    "kpppppdpppplpppk",
    "kppppppppplllppk",
    ".kpppdppppplppk.",
    "..kkppdppppkkk..",
    "....kkkkkkk.....",
  ],
  palette: { k: K, p: "#c98b4b", l: "#e2b077", d: "#7a4a24" },
};

/** Shaft crew: the farmhand's silhouette with a hard hat and lamp. The lamp pixel is what makes it a person in the dark. */
export const SHAFT_CREW: Art = {
  rows: [
    "..ttt..",
    ".tltttt",
    "..fff..",
    "..fef..",
    "..fff..",
    ".bbbbb.",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: { k: K, t: "#d8892c", l: "#fff4c0", f: "#e8bb8e", e: K, b: "#6a5c7a", v: "#4d4148" },
};

/** The same figure with both arms up: on the ladder, or swinging at a face. */
export const SHAFT_CREW_UP: Art = {
  rows: [
    "b.ttt.b",
    "btltttb",
    "b.fff.b",
    "b.fef.b",
    ".bfffb.",
    ".bbbbb.",
    ".bbbbb.",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: { k: K, t: "#d8892c", l: "#fff4c0", f: "#e8bb8e", e: K, b: "#6a5c7a", v: "#4d4148" },
};

/** The hoist cage, empty. Crew are blitted into it so the count shows. */
export const HOIST_CAGE: Art = {
  rows: [
    "....m....",
    "..kkmkk..",
    "kkkkkkkkk",
    "kdddddddk",
    "kd.....dk",
    "kd.....dk",
    "kd.....dk",
    "kd.....dk",
    "kdddddddk",
    "kkkkkkkkk",
    "..k...k..",
  ],
  palette: { k: "#b8c0c8", m: "#5b4f58", d: "#3a2a30" },
};

// --- Marks — what a producer looks like once you've bought its upgrades ---
// Three `producer_mult` upgrades per tier (`<id>_x2a/b/c`) give four marks. Small/distant tiers repaint
// for the first two; the fourth (gated on owning a hundred) is always a redraw, even two fields away.

/** The same grid in a different finish. */
function repaint(art: Art, palette: Record<string, string>): Art {
  return { rows: art.rows, palette: { ...art.palette, ...palette } };
}

const PLANT_2: Art = {
  rows: [
    "..g.g.g..",
    ".gglglgg.",
    "gglllllgg",
    "gglllllgg",
    ".ggglggg.",
    "..gsssg..",
    ".ddddddd.",
  ],
  palette: PLANT.palette,
};

/** Yield really do flower, and it's the clearest "this bed is doing well". */
const PLANT_3: Art = {
  rows: [
    "..w.w.w..",
    "..gwgwg..",
    ".gglglgg.",
    "gglllllgg",
    "gglllllgg",
    ".ggglggg.",
    "..gsssg..",
    ".ddddddd.",
  ],
  palette: { ...PLANT.palette, w: "#efe4f6" },
};

const SPRINKLER_2: Art = {
  rows: [
    "...a.a.a.a.a...",
    ".a...a...a...a.",
    "a..mmmmmmmmm..a",
    "...mmmmmmmmm...",
    ".......m.......",
    ".......m.......",
    ".......m.......",
    ".......m.......",
    ".....kkkkk.....",
    "....kkkkkkk....",
  ],
  palette: SPRINKLER.palette,
};

const SPRINKLER_3: Art = {
  rows: [
    "...a.a.a.a.a...",
    ".a...a...a...a.",
    "a..mmmmmmmmm..a",
    "...mmmmmmmmm...",
    "..mm...m...mm..",
    "...m...m...m...",
    "...m...m...m...",
    ".......m.......",
    ".....kkkkk.....",
    "....kkkkkkk....",
  ],
  palette: SPRINKLER.palette,
};

/** Turbo Diesel: the stack is the whole joke, so it goes on the roof. */
const TRACTOR_2: Art = {
  rows: [
    ".......k..........",
    ".......k..........",
    "...kkkkkkk........",
    "..kbbbbbbk........",
    "..kbggggbk........",
    "..kbggggbk........",
    "kkkbbbbbbkkkkkkk..",
    "kbbbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkk..",
    ".kwwwwk...kwwk....",
    "kwwwwwwk.kwwwwk...",
    "kwwwwwwk.kwwwwk...",
    ".kwwwwk...kwwk....",
  ],
  palette: TRACTOR.palette,
};

/** Autosteer: a beacon on the roof, and the paint job of something expensive. */
const TRACTOR_3: Art = {
  rows: [
    ".......k..........",
    ".....y.k..........",
    "...kkkkkkk........",
    "..kbbbbbbk........",
    "..kbggggbk........",
    "..kbggggbk........",
    "kkkbbbbbbkkkkkkk..",
    "kbbbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkk..",
    ".kwwwwk...kwwk....",
    "kwwwwwwk.kwwwwk...",
    "kwwwwwwk.kwwwwk...",
    ".kwwwwk...kwwk....",
  ],
  palette: { ...TRACTOR.palette, b: "#c99a34", y: "#e05a3c" },
};

/** Wider Header: the unloading auger swung out over the field. */
const COMBINE_2: Art = {
  rows: [
    "..................kkkk..",
    "................kkkkk...",
    "........kkkkkkkkkk......",
    ".......kbbbbbbbk........",
    ".......kbggggbbk........",
    "kkkk...kbbbbbbbk........",
    "kyyk..kkbbbbbbbkkkkkk...",
    "kyyk.kbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkkkkkkkkkkkkkkkk...",
    "kkkk..kwwwwwwk..kwwk....",
    "......kwwwwwwk..kwwk....",
    ".....kkwwwwwwkk.kwwk....",
    ".....kwwwwwwwwk.kwwk....",
    "......kwwwwwwk...kk.....",
  ],
  palette: COMBINE.palette,
};

/** Night Shift Cab: work lights, on at any hour. */
const COMBINE_3: Art = {
  rows: [
    "..................kkkk..",
    "................kkkkk...",
    "......llkkkkkkkkkk......",
    ".......kbbbbbbbk........",
    ".......kbggggbbk........",
    "kkkk...kbbbbbbbk........",
    "kyyk..kkbbbbbbbkkkkkk...",
    "kyyk.kbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkkkkkkkkkkkkkkkk...",
    "kkkk..kwwwwwwk..kwwk....",
    "......kwwwwwwk..kwwk....",
    ".....kkwwwwwwkk.kwwk....",
    ".....kwwwwwwwwk.kwwk....",
    "......kwwwwwwk...kk.....",
  ],
  palette: { ...COMBINE.palette, l: "#ffe08a" },
};

/** Catalytic Cracking, then Continuous Flow: the flare stack gets serious. */
const REFINERY_2: Art = {
  rows: [
    "...........f........",
    "..........fff.......",
    "...........kgk......",
    "..kkkkkk...kgk......",
    ".kmmmmmmk..kgk......",
    ".kmmmmmmk..kgk..kkk.",
    ".kmmmmmmk..kgk.kmmk.",
    ".kmmmmmmkkkkgkkkmmk.",
    ".kmmmmmmkmmmgmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kkkkkkkkkkkkkkkkkk.",
  ],
  palette: { ...REFINERY.palette, f: "#f0913c" },
};

const REFINERY_3: Art = {
  rows: [
    "..........fff.......",
    ".........fbbbf......",
    "..........fff.......",
    "...........kgk......",
    "..kkkkkk...kgk......",
    ".kmmmmmmk..kgk......",
    ".kmmmmmmk..kgk..kkk.",
    ".kmmmmmmk..kgk.kmmk.",
    ".kmmmmmmkkkkgkkkmmk.",
    ".kmmmmmmkmmmgmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kkkkkkkkkkkkkkkkkk.",
  ],
  palette: { ...REFINERY.palette, f: "#f0913c", b: "#ffe08a" },
};

/** Full Spectrum LEDs, then Nutrient Telemetry: more lit floors, then more floors. */
function tower(reps: number, palette: Record<string, string>): Art {
  return {
    rows: stack(
      ["..kkkkkkkk..", ".kmmmmmmmmk.", "kmmmmmmmmmmk", "kkkkkkkkkkkk"],
      ["kmggmmggmmmk", "kmggmmggmmmk", "kkkkkkkkkkkk"],
      reps,
      ["kmmmmmmmmmmk", "kmmmmmmmmmmk", "kkkkkkkkkkkk"],
    ),
    palette: { k: K, m: "#cfd6dc", ...palette },
  };
}
const TOWER_2 = tower(8, { g: "#8ce06a" });
const TOWER_3 = tower(11, { g: "#a8f07a", m: "#e2e8ee" });

/** Silver Iodide, then a Jet Stream Permit: drizzle, then an actual storm. */
const SEEDER_2: Art = {
  rows: [
    "....kkkkkk....",
    "..kkcccccckk..",
    ".kcccccccccck.",
    "kcccccccccccck",
    ".kcccccccccck.",
    "..kkcccccckk..",
    "....kmmmmk....",
    "...aa.aa.aa...",
    "..a..a..a..a..",
  ],
  palette: { ...SEEDER.palette, c: "#b9c3cc" },
};

const SEEDER_3: Art = {
  rows: [
    "....kkkkkk....",
    "..kkcccccckk..",
    ".kcccccccccck.",
    "kcccccccccccck",
    ".kcccccccccck.",
    "..kkcccccckk..",
    "....kmmmmk....",
    "...aa.zz.aa...",
    "..a...z...a...",
    ".....zz.......",
  ],
  palette: { ...SEEDER.palette, c: "#8f9aa5", z: "#ffe066" },
};

// --- The fourth marks — what a hundred of something turns into ---

/** Heirloom Strain: it flowers, it sprawls, and the crop breaks the surface. */
const PLANT_4: Art = {
  rows: [
    "..w.w.w.w..",
    ".wgwgwgwgw.",
    ".gglglglgg.",
    "gglllllllgg",
    "gglllllllgg",
    ".gggglgggg.",
    "..ggsssgg..",
    ".ddddddddd.",
    "..dpddpdd..",
  ],
  palette: { ...PLANT.palette, w: "#efe4f6", p: "#c98b4b" },
};

/** Equity Stake: a hat, a good coat, and gold on the lapels. Part owner. */
const FARMHAND_4: Art = {
  rows: [
    "...ttt...",
    ".ttttttt.",
    "...fff...",
    "...fef...",
    "...fff...",
    "..bbbbb..",
    ".bbabbab.",
    "bbbbabbbb",
    ".bbbbbbb.",
    "..b...b..",
    "..v...v..",
    "..k...k..",
  ],
  palette: { k: K, t: "#e0c04a", f: "#e8bb8e", e: K, b: "#2f5f7a", v: "#5e3e29", a: "#e0c04a" },
};

/** Centre Pivot: a boom on a tower with drop tubes — the one irrigation silhouette that reads industrial. */
const SPRINKLER_4: Art = {
  rows: [
    ".........m.........",
    "kmmmmmmmmmmmmmmmmmk",
    ".m..m..m.m.m..m..m.",
    ".a..a..a.m.a..a..a.",
    "a.a.a.a.ama.a.a.a.a",
    ".a.a.a.a.m.a.a.a.a.",
    ".........m.........",
    ".........m.........",
    ".........m.........",
    ".......kkkkk.......",
    "......kkkkkkk......",
  ],
  palette: SPRINKLER.palette,
};

/** Tracked Chassis: twin stacks, a beacon, and it runs on tracks now. */
const TRACTOR_4: Art = {
  rows: [
    ".....k.k..........",
    ".....k.k..........",
    "..ykkkkkkk........",
    "..kbbbbbbk........",
    "..kbggggbk........",
    "..kbggggbk........",
    "kkkbbbbbbkkkkkkk..",
    "kbbbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkk..",
    ".kkkkkkkkkkkkkk...",
    "kwwwwwwwwwwwwwwk..",
    "kwkwkwkwkwkwkwwk..",
    "kwwwwwwwwwwwwwwk..",
    ".kkkkkkkkkkkkkk...",
  ],
  // Dark green, not near-black: a body with no value range reads as the broken hulk.
  palette: { ...TRACTOR.palette, b: "#2f6b46", g: "#bfe3ef", y: "#e05a3c", w: "#3a3038" },
};

/** Twin Rotor: a second unloading auger, so it never has to stop to empty. */
const COMBINE_4: Art = {
  rows: [
    "..................kkkk..",
    "................kkkkk...",
    "......llkkkkkkkkkk......",
    ".......kbbbbbbbk...kkkk.",
    ".......kbggggbbk.kkk....",
    "kkkk...kbbbbbbbkkk......",
    "kyyk..kkbbbbbbbkkkkkk...",
    "kyyk.kbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkbbbbbbbbbbbbbbk...",
    "kyykkkkkkkkkkkkkkkkkk...",
    "kkkk..kwwwwwwk..kwwk....",
    "......kwwwwwwk..kwwk....",
    ".....kkwwwwwwkk.kwwk....",
    ".....kwwwwwwwwk.kwwk....",
    "......kwwwwwwk...kk.....",
  ],
  palette: { ...COMBINE.palette, b: "#8f2a22", y: "#e0c04a", l: "#ffe08a" },
};

/** The Prize: the dome got bigger and there's a plaque over the door. */
const LAB_4: Art = {
  rows: [
    ".....kkkkkkkk.....",
    "...kkgggggggkk....",
    "..kgggggggggggk...",
    "..kgggggggggggk...",
    "..kgggggggggggk...",
    "kkkkkkkkkkkkkkkk..",
    "kwwwwwwwwwwwwwwk..",
    "kwggwwwggwwwggwk..",
    "kwggwwwggwwwggwk..",
    "kwwwwwwwwwwwwwwk..",
    "kwwwwwwyywwwwwwk..",
    "kwwwwwkkkkwwwwwk..",
    "kwwwwwkddkwwwwwk..",
    "kwwwwwkddkwwwwwk..",
    "kkkkkkkkkkkkkkkk..",
  ],
  palette: { k: K, w: "#f2eee2", g: "#c88fe6", d: "#7a5237", y: "#e0c04a" },
};

/** Cogeneration: a second stack, alight, because nothing is vented any more. */
const REFINERY_4: Art = {
  rows: [
    "...f......fff.......",
    "..fff....fbbbf......",
    "...k......fff.......",
    "...k.......kgk......",
    "..kkkkkk...kgk......",
    ".kmmmmmmk..kgk......",
    ".kmmmmmmk..kgk..kkk.",
    ".kmmmmmmk..kgk.kmmk.",
    ".kmmmmmmkkkkgkkkmmk.",
    ".kmmmmmmkmmmgmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kmmmmmmkmmmmmmmmmk.",
    ".kkkkkkkkkkkkkkkkkk.",
  ],
  palette: { ...REFINERY.palette, m: "#c6cdd4", f: "#f0913c", b: "#ffe08a", g: "#8d959d" },
};

/** Cloud Deck: taller than anything else, with an observation ring overhanging the shaft — the one back-edge silhouette that is not a box. */
const TOWER_4: Art = {
  rows: [
    "......kk......",
    "......kk......",
    "...kkkkkkkk...",
    "..kmmmmmmmmk..",
    ".kmmmmmmmmmmk.",
    ".kkkkkkkkkkkk.",
    ...Array.from({ length: 6 }, () => [
      ".kmggmmggmmmk.",
      ".kmggmmggmmmk.",
      ".kkkkkkkkkkkk.",
    ]).flat(),
    "kkkkkkkkkkkkkk",
    "kmmmmmmmmmmmmk",
    "kmyymmyymmyymk",
    "kkkkkkkkkkkkkk",
    ...Array.from({ length: 5 }, () => [
      ".kmggmmggmmmk.",
      ".kmggmmggmmmk.",
      ".kkkkkkkkkkkk.",
    ]).flat(),
    ".kmmmmmmmmmmk.",
    ".kmmmmmmmmmmk.",
    ".kkkkkkkkkkkk.",
  ],
  palette: { k: K, m: "#f0f4f8", g: "#a8f07a", y: "#ffe08a" },
};

/** Eye of the Storm: the hull went the colour of the weather it makes. */
const SEEDER_4: Art = {
  rows: [
    "....kkkkkk....",
    "..kkcccccckk..",
    ".kccczzzcccck.",
    "kcccccccccccck",
    ".kccczzzcccck.",
    "..kkcccccckk..",
    "....kmmmmk....",
    "..aa.azza.aa..",
    ".a..a.zz.a..a.",
    "a..a..z..a..a.",
    "...a.zz.a...a.",
  ],
  palette: { ...SEEDER.palette, c: "#5a6570", z: "#ffe066", a: "#7fb4d8" },
};

/** Ignition: vent stacks up the shoulders and a core that lights the ground. */
const REACTOR_4: Art = {
  rows: [
    "...kkkkkkkkkk...",
    "k.kkddddddddkk.k",
    "m.kmmmmmmmmmmk.m",
    "m..kmmmmmmmmk..m",
    "m...kmmmmmmk...m",
    "m...kmggggmk...m",
    "m...kmggggmk...m",
    "m...kmggggmk...m",
    "m...kmmmmmmk...m",
    "k..kmmmmmmmmk..k",
    "...kmmmmmmmmk...",
    "..kmmmmmmmmmmk..",
    "..khhhhhhhhhhk..",
    ".kkmmmmmmmmmmkk.",
    ".kmkkmmmmmmkkmk.",
    ".kkkkkkkkkkkkkk.",
  ],
  palette: { k: K, m: "#eef4f8", d: "#6b737c", g: "#fff0b8", h: "#e05a3c" },
};

/** Lagrange Station: a second canopy, a spine between them, and wings big enough to run both. */
const GREENHOUSE_4: Art = {
  rows: [
    ".........kk.........",
    "......kkkkkkkk......",
    ".....kcccccccck.....",
    "....kccckcckccck....",
    "kbbkkggckggkcggkkbbk",
    "kbbkkgggkggkgggkkbbk",
    "kbbkkmmmmmmmmmmkkbbk",
    "kbbkkmymmmmmmymkkbbk",
    "kkkkkmmmmmmmmmmkkkkk",
    "....kkkkmmmmkkkk....",
    "....kcccmmmmccck....",
    "....kcggmmmmggck....",
    "....kmmmmmmmmmmk....",
    ".....kkkkkkkkkk.....",
    "........kmmk........",
  ],
  palette: { k: K, b: "#e0c04a", c: "#d8f0f8", g: "#a4e884", m: "#cfd6dc", y: "#fff0b8" },
};

/** Event Horizon Lease: it has a jet now, and the jet points at your farm. */
const SINGULARITY_4: Art = {
  rows: [
    "......pppp......",
    "....pp....pp....",
    "..pp..vvvv..pp..",
    ".p..vv....vv..p.",
    "p..v...nn...v..p",
    "p.v..nnnnnn..v.p",
    "pv..nnnnnnnn..vp",
    "yyyynnnnnnnnyyyy",
    "yyyynnnnnnnnyyyy",
    "pv..nnnnnnnn..vp",
    "p.v..nnnnnn..v.p",
    "p..v...nn...v..p",
    ".p..vv....vv..p.",
    "..pp..vvvv..pp..",
    "....pp....pp....",
    "......pppp......",
  ],
  palette: { p: "#e0c04a", v: "#a8792c", n: "#120c1c", y: "#fff0b8" },
};

/** It Stops Minding: the bed has stopped darkening and just swells, twice over. */
const BRUISE_BED_4: Art = {
  rows: [
    "..kkkkkkk..",
    "..kmmmmmk..",
    "...kmmmk...",
    "kkkkkkkkkkk",
    "kmmmmmmmmmk",
    "kkkkkkkkkkk",
    ".kdwwwwwdk.",
    "kdwwwwwwwdk",
    "kdwwwwwwwdk",
    ".kkkkkkkkk.",
  ],
  palette: { k: K, m: "#e2e8ee", d: "#a8657a", w: "#fff4c0" },
};

/** Core Breach: a derrick over the wellhead, and it's venting flame. */
const TAPROOT_WELL_4: Art = {
  rows: [
    "....gg....",
    "...gkkg...",
    "..k.mm.k..",
    "..km..mk..",
    ".km.gg.mk.",
    ".km.gg.mk.",
    "kmmmmmmmmk",
    "kkmmmmmmkk",
    "km.kkkk.mk",
    "km.khhk.mk",
    "km.khhk.mk",
    "kmmkhhkmmk",
    "kkkkhhkkkk",
    "...khhk...",
    "...khhk...",
    "...khhk...",
    "...khhk...",
  ],
  palette: { k: K, m: "#e2e8ee", g: "#ff9a3c", h: "#c94a2c" },
};

/** All At Once: the same you, lit from inside, with the rest of them behind it. */
const CHORUS_FIGURE_4: Art = {
  rows: [
    "..aaa..",
    ".a...a.",
    "..ttt..",
    ".ttttt.",
    "..fff..",
    "..fef..",
    "..fff..",
    ".bbbbb.",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: {
    k: "#8a7a4a",
    a: "#fff4c0",
    t: "#e6d68a",
    f: "#f4ecd0",
    e: "#6a5c3a",
    b: "#d8c060",
    v: "#8a7a4a",
  },
};

/** They Live Down Here Now: two lamps, a full kit, and they've stopped looking up. */
const PIT_HAND_4: Art = {
  rows: [
    "..ttt..",
    ".tlttl.",
    "..fff..",
    "..fef..",
    ".bfffb.",
    "bbbbbbb",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".v...v.",
    ".k...k.",
  ],
  palette: { k: K, t: "#e0c04a", l: "#fff4c0", f: "#e8bb8e", e: K, b: "#7a5ac0", v: "#4d4148" },
};

/** The Seam Goes Down: the cut face has become a shaft with a headframe. */
const STARCH_FACE_4: Art = {
  rows: [
    "....kmmmmk...",
    "....kmssmk...",
    "...kkmmmmkk..",
    "...kwwwwwwk..",
    "kkkkkwwwwwwk.",
    "kwwwwwwsswwk.",
    "kwsswwwwwwwk.",
    "kwwwwwwwwwwk.",
    "kdddddddddddk",
    "kkkkkkkkkkkkk",
  ],
  palette: { k: K, w: "#f4ecd0", s: "#ffffff", d: "#2c1d14", m: "#e2e8ee" },
};

/** The Whole Circulation: three clamps on a vein that has split to feed them. */
const RING_MAIN_4: Art = {
  rows: [
    "..kvvk....",
    ".kkvvkk...",
    "kmmmmmmk..",
    "kmsggsmk..",
    "kmmmmmmk..",
    ".kvvvvk...",
    "kkvvkkvvk.",
    "kmmk..kmmk",
    "kmgk..kgmk",
    "kmmk..kmmk",
    ".kvk..kvk.",
    ".kvvkkvvk.",
    "..kvvvvk..",
    "...kkkk...",
  ],
  palette: { k: K, v: "#c48ac0", m: "#e2e8ee", s: "#8d959d", g: "#ffd166" },
};

/** It Was Always Hollow: the cavity has stopped being dark. Something in it is lit. */
const HOLLOW_HEART_4: Art = {
  rows: [
    "...kkkkkk...",
    ".kkflllofkk.",
    ".kflonnolfk.",
    "kflonoonolfk",
    "kflonoooolfk",
    "kfloooooolfk",
    "kflonoooolfk",
    ".kflonoolfk.",
    ".kkfollofkk.",
    "...kkkkkk...",
    "...k....k...",
  ],
  palette: { k: K, f: "#a8657a", l: "#e8c39c", n: "#2a1520", o: "#ffd166" },
};

/** It's Awake: the eyes opened, and it has started to sprout. */
const SECOND_POTATO_4: Art = {
  rows: [
    "....s..s..s.....",
    "....kkkkkkk.....",
    "..kkpppppppkk...",
    ".kpplppppppppk..",
    "kplllpppppooopk.",
    "kpllppppppoyoppk",
    "kpppppppppoooppk",
    "kppppooopppppppk",
    "kppppoyopppppppk",
    "kppppoooppplpppk",
    "kppppppppplllppk",
    ".kpppdppppplppk.",
    "..kkppdppppkkk..",
    "....kkkkkkk.....",
  ],
  palette: {
    k: K,
    p: "#e0c04a",
    l: "#f7e08a",
    d: "#8a6a1c",
    o: "#5a3a10",
    y: "#fff4c0",
    s: "#7fc45a",
  },
};

// --- Beyond: inside the Second Potato ---

/** A potato plant and the one it already was, pale beside it. */
export const ECHO_PLOT: Art = {
  rows: [
    "..e...g..",
    ".eee.ggg.",
    "eelegglgg",
    ".eee.ggg.",
    "..e...g..",
    "..e..kgk.",
    ".kdddddk.",
    "kdddddddk",
  ],
  palette: { k: K, g: "#6aa348", l: "#a4e884", e: "#cfc6e8", d: "#8a5f3f" },
};

const ECHO_PLOT_4: Art = {
  rows: [
    "e.e...g.g",
    "eeee.gggg",
    "elee.glgg",
    "eeee.gggg",
    ".ee...gg.",
    "..e..kgk.",
    ".kpdddpk.",
    "kdddddddk",
  ],
  palette: { k: K, g: "#6aa348", l: "#a4e884", e: "#cfc6e8", d: "#8a5f3f", p: "#c98b4b" },
};

/** A farmhand with no face. The hat is the one you wore. */
export const KINFOLK: Art = {
  rows: [
    "..hhh..",
    ".hhhhh.",
    "..fff..",
    "..fff..",
    "..fff..",
    ".bbbbb.",
    "bbbbbbb",
    ".bbbbb.",
    ".b...b.",
    ".b...b.",
    ".k...k.",
  ],
  palette: { k: K, h: "#8f7ab8", f: "#f2dcc0", b: "#6a8fb0" },
};

const KINFOLK_4: Art = {
  rows: [
    "..hhh..",
    ".hhhhh.",
    "b.fef.b",
    "b.fff.b",
    "bbfffbb",
    ".bbbbb.",
    ".bbbbb.",
    ".bbbbb.",
    ".b...b.",
    ".b...b.",
    ".k...k.",
  ],
  palette: { k: K, h: "#8f7ab8", f: "#f2dcc0", b: "#6a8fb0", e: K },
};

/** A potato tree, drawn right way up. The scene hangs it from the far side. */
export const UPSIDE_GROVE: Art = {
  rows: [
    "...kkkkk...",
    "..kgggggk..",
    ".kggpgggggk",
    "kgggggggpgk",
    "kgpgggggggk",
    ".kgggggpgk.",
    "..kggggggk.",
    "....ktk....",
    "....ktk....",
    "....ktk....",
    "...kttk....",
    "..kk..kk...",
  ],
  palette: { k: K, g: "#5b8f3d", p: "#c98b4b", t: "#7a5237" },
};

const UPSIDE_GROVE_4: Art = {
  rows: [
    "..kkkkkkk..",
    ".kggyggggk.",
    "kggggggyggk",
    "kgygggggggk",
    "kggggyggggk",
    ".kgggggggk.",
    "..kgk.kgk..",
    "...kt.tk...",
    "...kt.tk...",
    "....ktk....",
    "....ktk....",
    "..kk...kk..",
  ],
  palette: { k: K, g: "#5b8f3d", y: "#ffd166", t: "#7a5237" },
};

/** A tide wheel standing in the starch sea. */
export const TIDE_MILL: Art = {
  rows: [
    "....kkkk....",
    "...kwwwwk...",
    "..kwmmmmwk..",
    ".kwmkmmkmwk.",
    ".kwmmkkmmwk.",
    ".kwmkmmkmwk.",
    "sskwmmmmwkss",
    "sssskkkkssss",
    "tsstssstssts",
  ],
  palette: { k: K, w: "#7a5237", m: "#a8b0b8", s: "#f2e3c8", t: "#d8c49a" },
};

const TIDE_MILL_4: Art = {
  rows: [
    "..s......s..",
    ".kkk....kkk.",
    "kmkmk..kmkmk",
    "kkmkk..kkmkk",
    "kmkmk..kmkmk",
    ".kkkwwwwkkk.",
    "sskwwwwwwkss",
    "sssskkkkssss",
    "tsstssstssts",
  ],
  palette: { k: K, w: "#7a5237", m: "#a8b0b8", s: "#f2e3c8", t: "#d8c49a" },
};

/** A lantern on a pole. One flame per farm handed down, which the scene counts. */
export const HEARTH_LANTERN: Art = {
  rows: [
    ".kkk.",
    "kfyfk",
    "kyyyk",
    "kfyfk",
    ".kkk.",
    "..k..",
    "..w..",
    "..w..",
    "..w..",
    "..w..",
    "..w..",
    ".www.",
    "wwwww",
  ],
  palette: { k: K, f: "#ff9a3c", y: "#fff4c0", w: "#5e3e29" },
};

const HEARTH_LANTERN_4: Art = {
  rows: [
    "y.k.y",
    ".kkk.",
    "kyyyk",
    "kyfyk",
    "kyyyk",
    ".kkk.",
    ".kwk.",
    "..w..",
    ".kwk.",
    "..w..",
    ".kwk.",
    ".www.",
    "wwwww",
  ],
  palette: { k: K, f: "#ff9a3c", y: "#fff4c0", w: "#5e3e29" },
};

/** The sun in here: a potato, lit from inside, with one eye. */
export const INNER_SUN: Art = {
  rows: [
    "...kkkkk...",
    ".kkllllpkk.",
    "klllpppppdk",
    "kllpkkkppdk",
    "klppkekppdk",
    "kpppkkkppdk",
    "kppppppppdk",
    ".kkpppppkk.",
    "...kkkkk...",
  ],
  palette: { k: K, p: "#ffd166", l: "#fff4c0", d: "#e0a040", e: "#2a1520" },
};

const INNER_SUN_4: Art = {
  rows: [
    "..y..y..y..",
    "...kkkkk...",
    ".kkllllpkk.",
    "kllkkkkkpdk",
    "klkkeeekkdk",
    "kppkkkkkpdk",
    "kppppppppdk",
    ".kkpppppkk.",
    "...kkkkk...",
    "..y..y..y..",
  ],
  palette: { k: K, p: "#ffd166", l: "#fff4c0", d: "#e0a040", e: "#7a3aa0", y: "#fff4c0" },
};

// --- Deep: under the floor of the hollow world, where the starch has set into crystal ---

const STARCH_GLASS = "#cfe8f0";
const STARCH_GLINT = "#ffffff";
const STARCH_EDGE = "#7fb0c8";
const CAVE_ROCK = "#3a3150";
const CAVE_ROCK_LIT = "#5a4e78";

/** A seam of crystal starch in the cave wall. You chip at it and it comes away as potatoes. */
export const GLINT_SEAM: Art = {
  rows: [
    "....c....",
    "...cwc.c.",
    ".c.clc.cc",
    "cc.clccwc",
    "cwcclcclc",
    "rclcccclr",
    "RrrrrrrrR",
    ".rrrrrrr.",
  ],
  palette: { c: STARCH_EDGE, l: STARCH_GLASS, w: STARCH_GLINT, r: CAVE_ROCK, R: CAVE_ROCK_LIT },
};

const GLINT_SEAM_4: Art = {
  rows: [
    "..c..c..c..",
    ".cwc.cwc.w.",
    ".clc.clccl.",
    "cclccclcclc",
    "cwlcwclccwc",
    "clcclcclclc",
    "rclcccclclr",
    "RrrrrrrrrrR",
    ".rrrrrrrrr.",
  ],
  palette: { c: STARCH_EDGE, l: STARCH_GLASS, w: STARCH_GLINT, r: CAVE_ROCK, R: CAVE_ROCK_LIT },
};

/** A cutter: helmet, a lamp on it, and a pick that has been blunted on something harder than rock. */
export const CUTTER: Art = {
  rows: [
    "..hhy..",
    ".hhhhh.",
    "..fff..",
    "..fff..",
    ".bbbbbp",
    "bbbbbbp",
    "fbbbbbp",
    ".bbbbb.",
    ".b...b.",
    ".b...b.",
    ".k...k.",
  ],
  palette: { k: K, h: "#c9a24a", y: "#fff4c0", f: "#f2dcc0", b: "#4f6a8a", p: "#8d959d" },
};

const CUTTER_4: Art = {
  rows: [
    "....ccc",
    "..hhycc",
    ".hhhhhp",
    "..fff.p",
    "..fff.p",
    ".bbbbbp",
    "bbbbbb.",
    "fbbbbb.",
    ".bbbbb.",
    ".b...b.",
    ".k...k.",
  ],
  palette: { k: K, h: "#c9a24a", y: "#fff4c0", f: "#f2dcc0", b: "#4f6a8a", p: "#8d959d", c: STARCH_GLASS },
};

/** A loom strung with crystal thread. It hums at the pitch the rock settles to, and the rock settles. */
export const HUSH_LOOM: Art = {
  rows: [
    "wwwwwwwww",
    "wks.s.skw",
    "w.s.s.s.w",
    "w.s.s.s.w",
    "w.s.s.s.w",
    "w.s.s.s.w",
    "w.s.s.s.w",
    "wwwwwwwww",
    "w.......w",
    "w.......w",
  ],
  palette: { k: K, w: "#7a5237", s: STARCH_GLASS },
};

const HUSH_LOOM_4: Art = {
  rows: [
    "...www...",
    ".wwwwwww.",
    "wks.s.skw",
    "w.s.s.s.w",
    "wsssssssw",
    "w.s.s.s.w",
    "w.s.s.s.w",
    "wsssssssw",
    "wwwwwwwww",
    "w.w...w.w",
    "w.......w",
  ],
  palette: { k: K, w: "#a8792c", s: STARCH_GLINT },
};

/** A geode, split. What's inside is lit by whatever the field up top is doing. */
export const GEODE: Art = {
  rows: [
    "...rrrrr...",
    ".rrcccccrr.",
    "rrcclwlccrr",
    "rcclwwwlccr",
    "rcclwwwlccr",
    "rrcclllccrr",
    ".rrcccccrr.",
    "...rrrrr...",
  ],
  palette: { r: CAVE_ROCK_LIT, c: "#9a6ad0", l: "#d0b0f8", w: "#fff4ff" },
};

const GEODE_4: Art = {
  rows: [
    "....r.r....",
    "..rrcrcrr..",
    ".rcclclccr.",
    "rcclwwwlccr",
    "rclwwpwwlcr",
    "rclwpppwlcr",
    "rclwwpwwlcr",
    "rcclwwwlccr",
    ".rcclllccr.",
    "..rrrrrrr..",
  ],
  palette: { r: CAVE_ROCK_LIT, c: "#9a6ad0", l: "#d0b0f8", w: "#fff4ff", p: "#ffd166" },
};

/** A spire of crystal that grows a band for every generation that worked this farm. */
export const CROWN_SPIRE: Art = {
  rows: [
    "...w...",
    "..wlw..",
    "..lcl..",
    "..lcl..",
    ".llcll.",
    ".lcccl.",
    ".lcccl.",
    "llcccll",
    "lcccccl",
    "lcccccl",
    "rrrrrrr",
  ],
  palette: { w: STARCH_GLINT, l: STARCH_GLASS, c: STARCH_EDGE, r: CAVE_ROCK_LIT },
};

const CROWN_SPIRE_4: Art = {
  rows: [
    "y.y.y.y",
    "yyyyyyy",
    "..wlw..",
    "..lcl..",
    ".llcll.",
    ".lcwcl.",
    ".lcccl.",
    "llcwcll",
    "lcccccl",
    "lccwccl",
    "lcccccl",
    "rrrrrrr",
  ],
  palette: { w: STARCH_GLINT, l: STARCH_GLASS, c: STARCH_EDGE, r: CAVE_ROCK_LIT, y: "#ffd166" },
};

/** The Fourth Potato: the shape of a potato, cut by nobody, out of something clear. */
export const FOURTH_POTATO: Art = {
  rows: [
    "...kkkkk...",
    ".kkwlllckk.",
    "kwwlllcccck",
    "klllclccccd",
    "kllcccccccd",
    "klcccclcccd",
    "kccccccccdd",
    ".kkccccdkk.",
    "...kkkkk...",
  ],
  palette: { k: STARCH_EDGE, w: STARCH_GLINT, l: "#e8f6ff", c: STARCH_GLASS, d: "#9fc4d8" },
};

const FOURTH_POTATO_4: Art = {
  rows: [
    "....w.w....",
    "...kkkkk...",
    ".kkwlllckk.",
    "kwwlkkkccck",
    "kllkeeekccd",
    "klckkkkkccd",
    "kccccccccdd",
    ".kkccccdkk.",
    "...kkkkk...",
    "....w.w....",
  ],
  palette: { k: STARCH_EDGE, w: STARCH_GLINT, l: "#e8f6ff", c: STARCH_GLASS, d: "#9fc4d8", e: "#7a3aa0" },
};

// --- Origin: the first morning of the first field ---

/** A wild potato plant, flowering. Nobody put it there. */
export const WILD_PATCH: Art = {
  rows: [
    "...f.....",
    "..fyf..f.",
    "...f..fyf",
    ".g.g.g.f.",
    "gglgglgg.",
    ".gglgggl.",
    "..ggggg..",
    ".kdddddk.",
    "kdddddddk",
  ],
  palette: { k: K, f: "#c8a0e8", y: "#ffe066", g: "#5f9a40", l: "#9ccc6a", d: "#7a5237" },
};

const WILD_PATCH_4: Art = {
  rows: [
    ".f.f.f.f.",
    "fyfyfyfyf",
    ".f.f.f.f.",
    "g.g.g.g.g",
    "gglgglggl",
    ".gglgggl.",
    "..gbgbg..",
    ".kdddddk.",
    "kdddddddk",
  ],
  palette: { k: K, f: "#c8a0e8", y: "#ffe066", g: "#5f9a40", l: "#9ccc6a", d: "#7a5237", b: "#b8d86a" },
};

/** The first farmhand: a hide cloak, long hair, a digging stick taller than they are. */
export const ELDER: Art = {
  rows: [
    "..hhh..s",
    ".hhfhh.s",
    ".hfffh.s",
    "..fff..s",
    ".ccccc.s",
    "cccccccs",
    "c.ccc.cs",
    "..ccc..s",
    "..c.c...",
    "..c.c...",
    "..k.k...",
  ],
  palette: { k: K, h: "#5a3a28", f: "#d9a77a", c: "#a07a4a", s: "#8a6a3a" },
};

const ELDER_4: Art = {
  rows: [
    ".wyw..y.",
    "..hhh.ys",
    ".hhfhh.s",
    ".hfffh.s",
    "..fff..s",
    ".ccccc.s",
    "cpcccpcs",
    "c.ccc.cs",
    "..ccc..s",
    "..c.c...",
    "..k.k...",
  ],
  palette: { k: K, h: "#5a3a28", f: "#d9a77a", c: "#a07a4a", s: "#8a6a3a", w: "#c8a0e8", y: "#ffe066", p: "#c8a0e8" },
};

/** Where the root that holds the valley still comes up for air. */
export const MOTHER_ROOT: Art = {
  rows: [
    "....g.g....",
    ".....g.....",
    "....kak....",
    "..kaaaaak..",
    ".kaarraaak.",
    "kaarrrraaak",
    "a.ar.ra.a.a",
    "a..r..a..a.",
  ],
  palette: { k: K, a: "#8a5a3a", r: "#c99a5a", g: "#7fc45a" },
};

const MOTHER_ROOT_4: Art = {
  rows: [
    "..g.g.g.g..",
    "...ggggg...",
    "....kak....",
    "..kayyyak..",
    ".kayaaayak.",
    "kayaarraya.",
    "y.ay.ya.y.y",
    "y..y..y..y.",
  ],
  palette: { k: K, a: "#8a5a3a", r: "#c99a5a", g: "#7fc45a", y: "#ffd166" },
};

/** The first water, coming up through a ring of stones. */
export const VALLEY_SPRING: Art = {
  rows: [
    "....ww....",
    "...wllw...",
    ".sswllwss.",
    "sbwwwwwwbs",
    "sbbwwwwbbs",
    ".ssssssss.",
  ],
  palette: { w: "#7ab8d8", l: "#e0f4ff", s: "#8a8a7a", b: "#6a6a5e" },
};

const VALLEY_SPRING_4: Art = {
  rows: [
    ".l..ww..l.",
    "..l.wl.l..",
    "g..wllw..g",
    "gsswllwssg",
    "sbwwwwwwbs",
    "sbbwwwwbbs",
    ".ssssssss.",
  ],
  palette: { w: "#7ab8d8", l: "#e0f4ff", s: "#8a8a7a", b: "#6a6a5e", g: "#6aa348" },
};

/** A fire in a ring of stones. Nobody has cooked anything on it yet. */
export const FIRST_FIRE: Art = {
  rows: [
    "....y....",
    "...yfy...",
    "..yfrfy..",
    "..frrrf..",
    ".wkwwwkw.",
    "s.wkwkw.s",
    "sssssssss",
  ],
  palette: { k: K, y: "#fff4c0", f: "#ff9a3c", r: "#e0503a", w: "#7a5237", s: "#8a8a7a" },
};

const FIRST_FIRE_4: Art = {
  rows: [
    "k...y...k",
    "kwwpppwwk",
    "k..yfy..k",
    "k.yfrfy.k",
    "k.frrrf.k",
    ".wkwwwkw.",
    "sssssssss",
  ],
  palette: { k: K, y: "#fff4c0", f: "#ff9a3c", r: "#e0503a", w: "#7a5237", s: "#8a8a7a", p: "#d9a35a" },
};

/** The First Potato. It looks like a potato. */
export const FIRST_POTATO: Art = {
  rows: [
    ".....g.....",
    "....gg.....",
    "...kkkkk...",
    ".kkllppppk.",
    "kllppppppdk",
    "klpppepppdk",
    "kppppppppdk",
    ".kpppppddk.",
    "..kkkkkkk..",
  ],
  palette: { k: K, g: "#7fc45a", l: "#f7e0a8", p: "#e0b070", d: "#b07f4a", e: "#a8794a" },
};

const FIRST_POTATO_4: Art = {
  rows: [
    "...w.g.w...",
    "..wyw.wyw..",
    "...wgggw...",
    "....kgk....",
    ".kkkllpkkk.",
    "kllpppppgdk",
    "klgpppppppk",
    "kppppppgpdk",
    ".kpppppddk.",
    "..kkkkkkk..",
  ],
  palette: { k: K, g: "#7fc45a", l: "#f7e0a8", p: "#e0b070", d: "#b07f4a", w: "#fff4e0", y: "#ffe066" },
};

// --- Void: before the first field, the dark and what will grow in it ---

/** A Star Eye: a point of light in the dark, and when you look close, an eye with a shoot coming. */
export const STAR_EYE: Art = {
  rows: [
    "...w...",
    "..wyw..",
    ".wyyyw.",
    "wyyeyyw",
    ".wyyyw.",
    "..wgw..",
    "...g...",
  ],
  palette: { w: "#e8e0ff", y: "#fff4c0", e: "#7a3aa0", g: "#7fc45a" },
};

const STAR_EYE_4: Art = {
  rows: [
    "....w....",
    "...wyw...",
    "..wyyyw..",
    ".wyyeyyw.",
    "..wyyyw..",
    "l..wgw..l",
    "gl..g..lg",
    ".gggggggg",
  ],
  palette: { w: "#e8e0ff", y: "#fff4c0", e: "#7a3aa0", g: "#5f9a40", l: "#9ccc6a" },
};

/** A Sower, hooded, with a sack of light over one shoulder. */
export const SOWER: Art = {
  rows: [
    "..hhh..",
    "..hfh..",
    "..hhh..",
    ".rrrrs.",
    "rrrrrss",
    "r.rrrss",
    "..rrr..",
    "..rrr..",
    "..r.r..",
    "..k.k..",
  ],
  palette: { k: K, h: "#3a2a5a", f: "#d9c0f0", r: "#4a3a7a", s: "#a08a5a" },
};

const SOWER_4: Art = {
  rows: [
    "..hhh..y",
    "..hfh.y.",
    "..hhhr..",
    ".rrrrr..",
    "rrrrrss.",
    "r.rrrss.",
    "..rrrss.",
    "..rrr...",
    "..r.r...",
    "..k.k...",
  ],
  palette: { k: K, h: "#3a2a5a", f: "#d9c0f0", r: "#4a3a7a", s: "#a08a5a", y: "#fff4c0" },
};

/** Night Cloth on its rod: the dark, hemmed. */
export const NIGHT_CLOTH: Art = {
  rows: [
    "kkkkkkkkkkk",
    "cwcccccwccc",
    "ccccwcccccw",
    "cccccccwccc",
    ".ccwcccccc.",
    "..c.cc.cc..",
  ],
  palette: { k: "#7a5237", c: "#2a2050", w: "#e8e0ff" },
};

const NIGHT_CLOTH_4: Art = {
  rows: [
    "kykkkkkkkyk",
    "cwcccccwccc",
    "ccccwcccccw",
    "cwcccccwccc",
    "ccccwcccccw",
    ".ccwcccccc.",
    "..c.cc.cc..",
  ],
  palette: { k: "#7a5237", c: "#2a2050", w: "#e8e0ff", y: "#ffd166" },
};

/** A Seed Cloud: everything that will ever be planted, still dust. */
export const SEED_CLOUD: Art = {
  rows: [
    "...ppp.....",
    ".ppllpp.pp.",
    "pplwllpppl.",
    "plllllllpp.",
    ".pplllwlpp.",
    "..ppppppp..",
    "....pp.....",
  ],
  palette: { p: "#6a4a9a", l: "#b890e0", w: "#fff4ff" },
};

const SEED_CLOUD_4: Art = {
  rows: [
    "...ppp.....",
    ".ppllpp.pp.",
    "pplwllpppl.",
    "plllllllpp.",
    ".pplllwlpp.",
    "..ppppppp..",
    "..s..s..s..",
    ".s..s..s...",
  ],
  palette: { p: "#6a4a9a", l: "#b890e0", w: "#fff4ff", s: "#e0b070" },
};

/** An Ancestor Star, one point for every way it shines. */
export const ANCESTOR_STAR: Art = {
  rows: [
    "....y....",
    "....y....",
    "...yly...",
    "..ylwly..",
    "yylwwwlyy",
    "..ylwly..",
    "...yly...",
    "....y....",
    "....y....",
  ],
  palette: { y: "#ffd166", l: "#fff0a0", w: "#ffffff" },
};

const ANCESTOR_STAR_4: Art = {
  rows: [
    "..r...r..",
    ".r..y..r.",
    "r..yly..r",
    "..ylwly..",
    "yylwwwlyy",
    "..ylwly..",
    "r..yly..r",
    ".r..y..r.",
    "..r...r..",
  ],
  palette: { y: "#ffd166", l: "#fff0a0", w: "#ffffff", r: "#c8a0e8" },
};

/** The Fifth Potato: potato-shaped, roughly, with its edges not settled yet. */
export const FIFTH_POTATO: Art = {
  rows: [
    "...k.k.k...",
    ".k.lllll.k.",
    "..llwlllll.",
    "klllllllldk",
    ".llllelllld",
    "klllllllldk",
    "..lllllldd.",
    ".k.dddddk..",
    "...k.k.k...",
  ],
  palette: { k: "#7a6aa0", l: "#d8d0f0", w: "#ffffff", d: "#a898d0", e: "#7a3aa0" },
};

const FIFTH_POTATO_4: Art = {
  rows: [
    "....g.g....",
    ".....g.....",
    "...kkkkk...",
    ".kkwllllkk.",
    "kwlllllllck",
    "kllllellllc",
    "klllllllllc",
    ".kkllllckk.",
    "...kkkkk...",
  ],
  palette: { k: "#7a6aa0", w: "#ffffff", l: "#e8e0ff", c: "#a898d0", e: "#7a3aa0", g: "#7fc45a" },
};

// --- End: past the last harvest, where every potato goes ---

/** An Ash Plot: grey ground, and something in it anyway. */
export const ASH_PLOT: Art = {
  rows: [
    "..g...g..",
    ".gyg.gyg.",
    "..g...g..",
    "kaaaaaaak",
    "aasaaasaa",
    ".aaaaaaa.",
  ],
  palette: { k: K, g: "#8a9a6a", y: "#c8b878", a: "#6a6060", s: "#8a8080" },
};

const ASH_PLOT_4: Art = {
  rows: [
    ".g.g.g.g.",
    "gygygygyg",
    ".g.g.g.g.",
    "kaaaaaaak",
    "aasaaasaa",
    "aaaaaaaaa",
    ".aaaaaaa.",
  ],
  palette: { k: K, g: "#8a9a6a", y: "#c8b878", a: "#6a6060", s: "#8a8080" },
};

/** A Gleaner, stooped, with a basket on the hip. */
export const GLEANER: Art = {
  rows: [
    "..hh...",
    ".hhff..",
    "..ff...",
    ".cccc..",
    "cccccb.",
    "c.ccbbb",
    "..ccbbb",
    "..c.c..",
    "..c.c..",
    "..k.k..",
  ],
  palette: { k: K, h: "#8a8a8a", f: "#c9a07a", c: "#5a5a6a", b: "#a08a5a" },
};

const GLEANER_4: Art = {
  rows: [
    "..hh...",
    ".hhff..",
    "..ff.pp",
    ".ccccpp",
    "cccccbb",
    "c.ccbbb",
    "..ccbbb",
    "..c.c..",
    "..c.c..",
    "..k.k..",
  ],
  palette: { k: K, h: "#8a8a8a", f: "#c9a07a", c: "#5a5a6a", b: "#a08a5a", p: "#e0b070" },
};

/** A Vesper Bell in its frame. */
export const VESPER_BELL: Art = {
  rows: [
    "...k...",
    "..www..",
    ".w...w.",
    ".w.b.w.",
    ".wbbbw.",
    ".wbbbw.",
    ".wbbbw.",
    ".w.b.w.",
    "ww...ww",
    "w.....w",
  ],
  palette: { k: K, w: "#5e3e29", b: "#c9a24a" },
};

const VESPER_BELL_4: Art = {
  rows: [
    "...k...",
    "..rrr..",
    ".rrrrr.",
    "rrrrrrr",
    ".w.b.w.",
    ".wbbbw.",
    ".wbbbw.",
    ".wbybw.",
    ".w.b.w.",
    "ww...ww",
    "w.....w",
  ],
  palette: { k: K, w: "#5e3e29", b: "#c9a24a", r: "#7a3a3a", y: "#fff4c0" },
};

/** A Root Cellar: a turf mound with a door in it. */
export const ROOT_CELLAR: Art = {
  rows: [
    "....ggg....",
    "..ggmmmgg..",
    ".gmmmmmmmg.",
    "gmmmddddmmg",
    "mmmmdkddmmm",
    "mmmmddddmmm",
    "sssssssssss",
  ],
  palette: { g: "#6a7a5a", m: "#7a6a5a", d: "#5e3e29", k: "#c9a24a", s: "#5a5050" },
};

const ROOT_CELLAR_4: Art = {
  rows: [
    "....ggg..y.",
    "..ggmmmggk.",
    ".gmmmmmmmg.",
    "gmmmddddmmg",
    "mmmmdlldmmm",
    "mmmmdlldmmm",
    "sssssssssss",
  ],
  palette: { g: "#6a7a5a", m: "#7a6a5a", d: "#5e3e29", k: "#c9a24a", s: "#5a5050", l: "#ffd890", y: "#fff4c0" },
};

/** The Long Table, with two sat down at it so far. */
export const LONG_TABLE: Art = {
  rows: [
    "..h.....h....",
    ".hfh...hfh...",
    "..c..p..c....",
    "ttttttttttttt",
    ".l.........l.",
    ".l.........l.",
  ],
  palette: { h: "#5a3a28", f: "#d9a77a", c: "#8a6a9a", p: "#e0b070", t: "#7a5237", l: "#5e3e29" },
};

const LONG_TABLE_4: Art = {
  rows: [
    "..y.......y..",
    ".h..h..h..h..",
    "hfhhfhhfhhfh.",
    ".c..cp.c..c..",
    "ttttttttttttt",
    ".l.........l.",
    ".l.........l.",
  ],
  palette: { h: "#5a3a28", f: "#d9a77a", c: "#8a6a9a", p: "#e0b070", t: "#7a5237", l: "#5e3e29", y: "#fff4c0" },
};

/** The Last Potato. Still warm. */
export const LAST_POTATO: Art = {
  rows: [
    "...kkkkk...",
    ".kkllppppk.",
    "kllppppppdk",
    "klpppppppdk",
    "kppppppppdk",
    "kpppppppddk",
    ".kpppppddk.",
    "..kkkkkkk..",
  ],
  palette: { k: K, l: "#fff0c0", p: "#ffb060", d: "#c07030" },
};

const LAST_POTATO_4: Art = {
  rows: [
    ".y...y...y.",
    "..y.kkk.y..",
    "...kllppk..",
    ".kllpppppk.",
    "klpppppppdk",
    "kppppppppdk",
    ".kpppppddk.",
    "..kkkkkkk..",
    "y....y....y",
  ],
  palette: { k: K, l: "#fff0c0", p: "#ffb060", d: "#c07030", y: "#fff4c0" },
};

/** Four marks per tier, indexed by how many of its three upgrades you own. See the marks note above. */
export const PRODUCER_MARKS = {
  patch: [PLANT, PLANT_2, PLANT_3, PLANT_4],
  hand: [
    FARMHAND,
    repaint(FARMHAND, { b: "#e08a3c", t: "#f2e3c8" }),
    repaint(FARMHAND, { b: "#3f8f86", t: "#e0c04a" }),
    FARMHAND_4,
  ],
  rig: [SPRINKLER, SPRINKLER_2, SPRINKLER_3, SPRINKLER_4],
  hauler: [TRACTOR, TRACTOR_2, TRACTOR_3, TRACTOR_4],
  machine: [COMBINE, COMBINE_2, COMBINE_3, COMBINE_4],
  lab: [
    LAB,
    repaint(LAB, { g: "#7fe0a0" }),
    repaint(LAB, { g: "#c88fe6", w: "#eee8f4" }),
    LAB_4,
  ],
  refinery: [REFINERY, REFINERY_2, REFINERY_3, REFINERY_4],
  tower: [TOWER, TOWER_2, TOWER_3, TOWER_4],
  airship: [SEEDER, SEEDER_2, SEEDER_3, SEEDER_4],
  reactor: [
    REACTOR,
    repaint(REACTOR, { g: "#6fd8e6" }),
    repaint(REACTOR, { g: "#ffd166", m: "#e6ecf2" }),
    REACTOR_4,
  ],
  orbital: [
    GREENHOUSE,
    repaint(GREENHOUSE, { b: "#6fa8dc", g: "#a4e884" }),
    repaint(GREENHOUSE, { b: "#e0c04a", g: "#c6f5a0", c: "#d8f0f8" }),
    GREENHOUSE_4,
  ],
  singularity: [
    SINGULARITY,
    repaint(SINGULARITY, { p: "#b98ae6", v: "#7a5ac0" }),
    repaint(SINGULARITY, { p: "#e0c04a", v: "#a8792c", n: "#120c1c" }),
    SINGULARITY_4,
  ],
  fold: [
    BRUISE_BED,
    repaint(BRUISE_BED, { b: "#4f8f7a", g: "#b6f2fb" }),
    repaint(BRUISE_BED, { b: "#7a5ac0", g: "#ffd166", m: "#e2e8ee" }),
    BRUISE_BED_4,
  ],
  well: [
    TAPROOT_WELL,
    repaint(TAPROOT_WELL, { g: "#ff7a4a", h: "#7a4a24" }),
    repaint(TAPROOT_WELL, { g: "#ffe08a", m: "#cfd6dc", h: "#8a5a2c" }),
    TAPROOT_WELL_4,
  ],
  chorus: [
    CHORUS_FIGURE,
    repaint(CHORUS_FIGURE, { b: "#7f9fc0", t: "#a8c0d8", a: "#dceaf4" }),
    repaint(CHORUS_FIGURE, { b: "#c0a86a", t: "#d8c894", a: "#f4ecd0" }),
    CHORUS_FIGURE_4,
  ],
  // The one tier drawn as a person: marks recolour the kit, since a redrawn silhouette reads as a new rung.
  deephand: [
    SHAFT_CREW,
    repaint(SHAFT_CREW, { t: "#4f8f7a", b: "#4a5c7a", l: "#b6f2fb" }),
    repaint(SHAFT_CREW, { t: "#c9a24a", b: "#7a5ac0", l: "#fff0b8", v: "#5b4f58" }),
    PIT_HAND_4,
  ],
  face: [
    STARCH_FACE,
    repaint(STARCH_FACE, { s: "#ffffff", w: "#efe6cc" }),
    repaint(STARCH_FACE, { s: "#d8f0f8", w: "#f4ecd0", m: "#cfd6dc" }),
    STARCH_FACE_4,
  ],
  main: [
    RING_MAIN,
    repaint(RING_MAIN, { v: "#a86ea2", g: "#f0c6ec" }),
    repaint(RING_MAIN, { v: "#c48ac0", g: "#ffd166", m: "#cfd6dc" }),
    RING_MAIN_4,
  ],
  heart: [
    HOLLOW_HEART,
    repaint(HOLLOW_HEART, { f: "#d8b070", l: "#f7e8c0" }),
    repaint(HOLLOW_HEART, { d: "#8d959d", f: "#e2b077", l: "#fff4c0" }),
    HOLLOW_HEART_4,
  ],
  second: [
    SECOND_POTATO,
    repaint(SECOND_POTATO, { p: "#d69a58", l: "#f0c68c" }),
    repaint(SECOND_POTATO, { p: "#e0c04a", l: "#f7e08a", d: "#8a6a1c" }),
    SECOND_POTATO_4,
  ],
  echo: [
    ECHO_PLOT,
    repaint(ECHO_PLOT, { e: "#e8d8ff", g: "#7fc45a" }),
    repaint(ECHO_PLOT, { e: "#fff4c0", g: "#a4e884", l: "#e8ffd0" }),
    ECHO_PLOT_4,
  ],
  kin: [
    KINFOLK,
    repaint(KINFOLK, { b: "#8f7ab8", h: "#6a8fb0" }),
    repaint(KINFOLK, { b: "#c9a24a", h: "#e0c04a", f: "#fff0d8" }),
    KINFOLK_4,
  ],
  grove: [
    UPSIDE_GROVE,
    repaint(UPSIDE_GROVE, { g: "#4f8f7a", p: "#e2b077" }),
    repaint(UPSIDE_GROVE, { g: "#7fc45a", p: "#ffd166", t: "#8a5a2c" }),
    UPSIDE_GROVE_4,
  ],
  tide: [
    TIDE_MILL,
    repaint(TIDE_MILL, { m: "#cfd6dc", w: "#8a5a2c" }),
    repaint(TIDE_MILL, { m: "#ffd166", w: "#a8792c", s: "#fff4e0" }),
    TIDE_MILL_4,
  ],
  beacon: [
    HEARTH_LANTERN,
    repaint(HEARTH_LANTERN, { f: "#ff7a4a", w: "#7a5237" }),
    repaint(HEARTH_LANTERN, { f: "#ffd166", w: "#a8792c" }),
    HEARTH_LANTERN_4,
  ],
  third: [
    INNER_SUN,
    repaint(INNER_SUN, { p: "#ffc04a", d: "#e07a30" }),
    repaint(INNER_SUN, { p: "#fff0a0", d: "#ffd166", e: "#7a3aa0" }),
    INNER_SUN_4,
  ],
  dawn: [
    WILD_PATCH,
    repaint(WILD_PATCH, { f: "#f0c0e0", g: "#6aa348" }),
    repaint(WILD_PATCH, { f: "#fff4e0", y: "#ffd166", l: "#c8f0a0" }),
    WILD_PATCH_4,
  ],
  elder: [
    ELDER,
    repaint(ELDER, { c: "#8a6a9a", h: "#3a2a20" }),
    repaint(ELDER, { c: "#c9a24a", s: "#a8792c" }),
    ELDER_4,
  ],
  root: [
    MOTHER_ROOT,
    repaint(MOTHER_ROOT, { r: "#e0b070", g: "#a4e884" }),
    repaint(MOTHER_ROOT, { a: "#a8703a", r: "#ffd166" }),
    MOTHER_ROOT_4,
  ],
  spring: [
    VALLEY_SPRING,
    repaint(VALLEY_SPRING, { w: "#8ad0e8", s: "#a09a88" }),
    repaint(VALLEY_SPRING, { w: "#a8e8f0", l: "#ffffff", s: "#c8b88a" }),
    VALLEY_SPRING_4,
  ],
  hearth: [
    FIRST_FIRE,
    repaint(FIRST_FIRE, { f: "#ffb04a", r: "#ff7a3a" }),
    repaint(FIRST_FIRE, { f: "#ffd166", r: "#ff9a3c", s: "#a8a090" }),
    FIRST_FIRE_4,
  ],
  first: [
    FIRST_POTATO,
    repaint(FIRST_POTATO, { p: "#e8c080", l: "#fff0c0" }),
    repaint(FIRST_POTATO, { p: "#ffd166", l: "#fff4c0", d: "#e0a040" }),
    FIRST_POTATO_4,
  ],
  // Deep.
  spark: [
    GLINT_SEAM,
    repaint(GLINT_SEAM, { c: "#8a9ad8", l: "#d8e0ff" }),
    repaint(GLINT_SEAM, { c: "#c9a24a", l: "#fff0c0" }),
    GLINT_SEAM_4,
  ],
  kith: [
    CUTTER,
    repaint(CUTTER, { b: "#6a8f6a", h: "#d8d0c0" }),
    repaint(CUTTER, { b: "#7a5ab0", h: "#ffd166", p: "#cfe8f0" }),
    CUTTER_4,
  ],
  loom: [
    HUSH_LOOM,
    repaint(HUSH_LOOM, { w: "#5e3e29", s: "#d0b0f8" }),
    repaint(HUSH_LOOM, { w: "#a8792c", s: "#fff4c0" }),
    HUSH_LOOM_4,
  ],
  vault: [
    GEODE,
    repaint(GEODE, { c: "#4f8fb0", l: "#a8d8f0" }),
    repaint(GEODE, { c: "#c9a24a", l: "#fff0a0" }),
    GEODE_4,
  ],
  crown: [
    CROWN_SPIRE,
    repaint(CROWN_SPIRE, { c: "#9a6ad0", l: "#d0b0f8" }),
    repaint(CROWN_SPIRE, { c: "#c9a24a", l: "#fff0a0" }),
    CROWN_SPIRE_4,
  ],
  fourth: [
    FOURTH_POTATO,
    repaint(FOURTH_POTATO, { c: "#d0b0f8", d: "#9a6ad0" }),
    repaint(FOURTH_POTATO, { c: "#fff0a0", d: "#e0a040", k: "#c9a24a" }),
    FOURTH_POTATO_4,
  ],
  mote: [
    STAR_EYE,
    repaint(STAR_EYE, { y: "#d8e8ff", w: "#c8d8ff" }),
    repaint(STAR_EYE, { y: "#ffd166", w: "#fff4c0" }),
    STAR_EYE_4,
  ],
  wisp: [
    SOWER,
    repaint(SOWER, { r: "#3a4a8a", s: "#c9a24a" }),
    repaint(SOWER, { r: "#6a4aa0", h: "#2a1a4a", s: "#ffd166" }),
    SOWER_4,
  ],
  veil: [
    NIGHT_CLOTH,
    repaint(NIGHT_CLOTH, { c: "#1e2a50", w: "#d0e0ff" }),
    repaint(NIGHT_CLOTH, { c: "#3a2060", k: "#a8792c" }),
    NIGHT_CLOTH_4,
  ],
  nebula: [
    SEED_CLOUD,
    repaint(SEED_CLOUD, { p: "#4a6a9a", l: "#90c0e0" }),
    repaint(SEED_CLOUD, { p: "#9a5a8a", l: "#f0b0d0" }),
    SEED_CLOUD_4,
  ],
  aeon: [
    ANCESTOR_STAR,
    repaint(ANCESTOR_STAR, { y: "#ffb04a", l: "#ffe080" }),
    repaint(ANCESTOR_STAR, { y: "#c8a0e8", l: "#f0e0ff" }),
    ANCESTOR_STAR_4,
  ],
  fifth: [
    FIFTH_POTATO,
    repaint(FIFTH_POTATO, { l: "#e0d8f8", d: "#b8a8e0" }),
    repaint(FIFTH_POTATO, { l: "#f0e8c0", d: "#d0b070" }),
    FIFTH_POTATO_4,
  ],
  ember: [
    ASH_PLOT,
    repaint(ASH_PLOT, { g: "#7a9a5a", y: "#d8c878" }),
    repaint(ASH_PLOT, { g: "#6aa348", a: "#7a6a60" }),
    ASH_PLOT_4,
  ],
  ward: [
    GLEANER,
    repaint(GLEANER, { c: "#6a5a4a", b: "#c9a24a" }),
    repaint(GLEANER, { c: "#4a4a7a", h: "#e0e0e0" }),
    GLEANER_4,
  ],
  lull: [
    VESPER_BELL,
    repaint(VESPER_BELL, { b: "#d8b860", w: "#7a5237" }),
    repaint(VESPER_BELL, { b: "#ffd166", w: "#a8792c" }),
    VESPER_BELL_4,
  ],
  relic: [
    ROOT_CELLAR,
    repaint(ROOT_CELLAR, { g: "#7a8a5a", d: "#7a5237" }),
    repaint(ROOT_CELLAR, { d: "#a8792c", k: "#fff4c0" }),
    ROOT_CELLAR_4,
  ],
  legion: [
    LONG_TABLE,
    repaint(LONG_TABLE, { c: "#6a8a6a", t: "#8a6a47" }),
    repaint(LONG_TABLE, { c: "#c9a24a", t: "#a8792c" }),
    LONG_TABLE_4,
  ],
  last: [
    LAST_POTATO,
    repaint(LAST_POTATO, { p: "#ffc070", l: "#fff4d0" }),
    repaint(LAST_POTATO, { p: "#ffd166", d: "#e0a040" }),
    LAST_POTATO_4,
  ],
} as const satisfies Record<string, readonly [Art, Art, Art, Art]>;

export type MarkedProducerId = keyof typeof PRODUCER_MARKS;

// --- The arrival cuts: the one thing you fall toward before each world opens round you ---
// Bigger than anything in a scene, because they get zoomed until a pixel is wider than the screen.

/** The first potato, eyes and all, small in the dark. */
export const CUT_POTATO: Art = {
  rows: [
    "..........kkkkkkk...........",
    ".......kkkkkklkkkkkk........",
    ".....kkkkllllllpppkkkk......",
    "....kkkllllllppppppppkkk....",
    "...kklldlllppppppppppppkk...",
    "..kkllleepppppppppppppppkk..",
    ".kkklllplppppppppppppdpppkk.",
    ".kkllppppppppppppppppeeppkkk",
    ".kkpppppppppppppdppppplppdkk",
    ".kkpppppppppppppeepppppdddkk",
    ".kkpppppppppppppplpppdddddkk",
    ".kkppppppdpppppppppddddddkkk",
    ".kkkpppppeeppppppddddddddkk.",
    "..kkkppppplppppdddddddddkk..",
    "...kkkpppppppdddddddddkkk...",
    "....kkkkpppddddddddkkkkk....",
    "......kkkkkkkkkkkkkkk.......",
    "..........kkk...............",
  ],
  palette: { k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#9a6a38", e: "#5a3418" },
};

/** The second potato with its eye shut. It opens as you get close. */
export const CUT_EYE_SHUT: Art = {
  rows: [
    "..........kkkkkkk...........",
    ".......kkkkkklkkkkkk........",
    ".....kkkkllllllpppkkkk......",
    "....kkkllllllppppppppkkk....",
    "...kkleelllppppppppppppkk...",
    "..kklllllpppppppppppppppkk..",
    ".kkklllppppppppppppppppppkk.",
    ".kkllppppppppppppppppppppkkk",
    ".kkppppppppddddddppppppppdkk",
    ".kkpppppppeeeeeeeepppppdddkk",
    ".kkppppppppppppppppppdddddkk",
    ".kkppppppppppppppppddddddkkk",
    ".kkkpppppppppppppddddddddkk.",
    "..kkkppppppppppddddddeedkk..",
    "...kkkpppppppdddddddddkkk...",
    "....kkkkpppddddddddkkkkk....",
    "......kkkkkkkkkkkkkkk.......",
    "..........kkk...............",
  ],
  palette: { k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#9a6a38", e: "#5a3418", w: "#fff4d8", i: "#ffb840", n: "#2a1a10", h: "#ffffff" },
};

/** Opening. */
export const CUT_EYE_WAKING: Art = {
  rows: [
    "..........kkkkkkk...........",
    ".......kkkkkklkkkkkk........",
    ".....kkkkllllllpppkkkk......",
    "....kkkllllllppppppppkkk....",
    "...kkleelllppppppppppppkk...",
    "..kklllllpppppppppppppppkk..",
    ".kkklllppppppppppppppppppkk.",
    ".kkllppppppppppppppppppppkkk",
    ".kkppppppppkkkkkkppppppppdkk",
    ".kkpppppppkwwiiwwkpppppdddkk",
    ".kkppppppppkkkkkkppppdddddkk",
    ".kkppppppppppppppppddddddkkk",
    ".kkkpppppppppppppddddddddkk.",
    "..kkkppppppppppddddddeedkk..",
    "...kkkpppppppdddddddddkkk...",
    "....kkkkpppddddddddkkkkk....",
    "......kkkkkkkkkkkkkkk.......",
    "..........kkk...............",
  ],
  palette: { k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#9a6a38", e: "#5a3418", w: "#fff4d8", i: "#ffb840", n: "#2a1a10", h: "#ffffff" },
};

/** Open. */
export const CUT_EYE_OPEN: Art = {
  rows: [
    "..........kkkkkkk...........",
    ".......kkkkkklkkkkkk........",
    ".....kkkkllllllpppkkkk......",
    "....kkkllllllppppppppkkk....",
    "...kkleelllppppppppppppkk...",
    "..kklllllpppppppppppppppkk..",
    ".kkklllppppppppppppppppppkk.",
    ".kkllpppppppkkkkpppppppppkkk",
    ".kkpppppppkkwiihkkpppppppdkk",
    ".kkppppppkwwinniwwkppppdddkk",
    ".kkpppppppkkwiiwkkpppdddddkk",
    ".kkpppppppppkkkkpppddddddkkk",
    ".kkkpppppppppppppddddddddkk.",
    "..kkkppppppppppddddddeedkk..",
    "...kkkpppppppdddddddddkkk...",
    "....kkkkpppddddddddkkkkk....",
    "......kkkkkkkkkkkkkkk.......",
    "..........kkk...............",
  ],
  palette: { k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#9a6a38", e: "#5a3418", w: "#fff4d8", i: "#ffb840", n: "#2a1a10", h: "#ffffff" },
};

/** The starch gone to glass. */
export const CUT_CRYSTAL: Art = {
  rows: [
    "......................",
    "..........wl..........",
    ".........cwll.........",
    ".........cwllc........",
    ".........cwllc.wl.....",
    ".........cwllccwlc....",
    ".....wl..cwllccwlc....",
    "....cwlc.cwllccwlc....",
    "....cwlc.cwllccwlc....",
    "....cwlc.cwllccwlc....",
    "....cwlc.cwllccwlccl..",
    ".cl.cwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".clccwlc.cwllccwlcclc.",
    ".rrsrwsrrswrsrrwrrsrcs",
    "..srrsrrsrrsrrsrrsrr..",
    "rsrrsrrsrrsrrsrrsrrsrr",
    "srrsrrsrrsrrsrrsrrsrrs",
  ],
  palette: { c: "#6a3aa0", l: "#9a6ad0", w: "#d0b0f8", r: "#3a3440", s: "#5a5060" },
};

/** The first potato, still in the ground, with its first shoot up. */
export const CUT_FIRST_MORNING: Art = {
  rows: [
    "..........................",
    "..........................",
    "..........................",
    "..........................",
    "..........vv...vv.........",
    "...........vv.vv..........",
    "...........vg.g...........",
    ".............g............",
    ".............g............",
    ".............g............",
    "...........kkkk...........",
    ".......sskkkkkkkkss.......",
    ".....smnmkkdpppkknmms.....",
    "...ssmmmkkpeepppkknmmss...",
    "..smnmmmmkkplppkkmmnmmms..",
    ".smmmnmmmkkkkkkkkmmmnmmms.",
    ".smmmmnmmmmkkkkmnmmmmnmms.",
    "smnmmmmnmmmmnmmmmnmmmmnmms",
  ],
  palette: { k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#9a6a38", e: "#5a3418", s: "#5a3a24", m: "#7a5030", n: "#6a4428", g: "#5aa040", v: "#8ad060" },
};

/** A seed of light in the dark before. */
export const CUT_SEED: Art = {
  rows: [
    ".......z.......",
    ".......y.......",
    "..z....y....z..",
    ".......y.......",
    ".....yyyyy.....",
    ".....ywwwy.....",
    "....ywhwwwy....",
    "zyyyywwwwwyyyyz",
    "....ywwwwwy....",
    ".....ywwwy.....",
    ".....yyyyy.....",
    ".......y.......",
    "..z....y....z..",
    ".......y.......",
    ".......z.......",
  ],
  palette: { w: "#fff8e0", y: "#ffd166", z: "#c8c8ff", h: "#ffffff" },
};

/** The seed between twinkles. */
export const CUT_SEED_DIM: Art = {
  rows: [
    "...............",
    "...............",
    ".......z.......",
    ".......y.......",
    "....zyyyyyz....",
    ".....ywwwy.....",
    "....ywhwwwy....",
    "..zyywwwwwyyz..",
    "....ywwwwwy....",
    ".....ywwwy.....",
    "....zyyyyyz....",
    ".......y.......",
    ".......z.......",
    "...............",
    "...............",
  ],
  palette: { w: "#fff8e0", y: "#ffd166", z: "#c8c8ff", h: "#ffffff" },
};

/** The last sun going down on the last furrow. */
export const CUT_LAST_SUN: Art = {
  rows: [
    "................................",
    "................................",
    ".............cccccc.............",
    "...........cccccccccc...........",
    ".........ccccbbbbbbcccc.........",
    "........cccbbbbbbbbbbccc........",
    ".......cccbbbbbbbbbbbbccc.......",
    ".......ccbbbbbaaaabbbbbcc.......",
    ".........................kkk....",
    "......ccbbbaaaaaaaaaabbbkpppk...",
    ".............aaaaaa....kppppdk..",
    "......ccbbbaaaaaaaaaabbbkkkkk...",
    "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    "gggggggggggggggggggggggggggggggg",
    "fffsfffffffffffffffffffffffsffff",
    "ggggggggggggggsggggggggggggggggg",
    "fffffffffsffffffffffsfffffffffff",
    "gggggggggggggggggggggggggggggggg",
  ],
  palette: { a: "#ff7040", b: "#d04030", c: "#8a2a2a", h: "#2a1a1a", f: "#4a4448", g: "#2e2a30", k: "#1a1214", p: "#3a2a2a", d: "#2a1e1e", s: "#8a8088" },
};
