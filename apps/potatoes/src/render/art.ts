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

/** The hundredth-unit mark for the worlds past the farm: the same thing, grown a new top, in a new paint. */
function grown(art: Art, top: readonly string[], paint: Readonly<Record<string, string>>): Art {
  const w = art.rows[0]!.length;
  const pad = (row: string) => row.padStart(row.length + ((w - row.length) >> 1), ".").padEnd(w, ".");
  return { rows: [...top.map(pad), ...art.rows], palette: { ...art.palette, ...paint } };
}

// --- The heap: what's left of the old heap's art, still used there ---
/** One of the gang, mid-mouthful. */
export const WORM: Art = {
  rows: [
    "......kkkk.........",
    "....kkppppkk.......",
    "...kppllllppk...kk.",
    "..kppllkkllppk.kppk",
    ".kppkk....kpppkpllk",
    "kpek........kppplk.",
    "kppk.........kkkk..",
    ".kk................",
  ],
  palette: { k: "#402e3a", p: "#e0a0a0", l: "#f4c8c0", e: "#402e3a" },
};
const WORM_4 = grown(WORM, ["...y.......", "..yyy......"], { y: "#ffd166" });
/** Sacking hung up to keep the heat in, dripping. */
export const WET_SACK: Art = {
  rows: [
    "kkkkkkkkkkkkkkkk",
    "kssrssssrssssrsk",
    "ksrssssrssssrssk",
    "kssssrssssrssssk",
    "ksrssssrssssrssk",
    "kssrsssssrssssk.",
    ".ksssrskksssrk..",
    "..kssk...kssk...",
    "...kk.....kk....",
    "....d......d....",
  ],
  palette: { k: "#402e3a", s: "#8a7a5a", r: "#6a5c42", d: "#8ad0e8" },
};
const WET_SACK_4 = grown(WET_SACK, ["..g..g.g..g...", ".gggggggggggg."], { g: "#6aa348" });
/** Toadstools in a ring, faintly lit from inside. */
export const FAIRY_RING: Art = {
  rows: [
    ".....kkkk..........",
    "....krrrrk.....kk..",
    "...krwrrwrk...krrk.",
    "...kkkkkkkk..krwrrk",
    ".....kcck....kkkkkk",
    ".kk..kcck......kck.",
    "krrk.kcck..kk..kck.",
    "kkkk.kcck.krrk.kck.",
    ".kk..kcck.kkkk.kck.",
    ".kk..kcck..kk..kck.",
  ],
  palette: { k: "#402e3a", r: "#c04a4a", w: "#f7e8d0", c: "#e8d8c0" },
};
const FAIRY_RING_4 = grown(FAIRY_RING, [".....llll.....", "....l....l...."], { l: "#a8fff0" });
/** Where the white threads meet, a knot of everything handed down. */
export const THREAD_KNOT: Art = {
  rows: [
    "t.......t.....t",
    ".t.....t.....t.",
    "..t...t..t..t..",
    "...t.ttttt.t...",
    "....tttwttt....",
    "tt.ttwwwwwtt.tt",
    "...ttwwwwwtt...",
    "....tttwttt....",
    "...t.ttttt.t...",
    "..t...t.t...t..",
    ".t....t..t...t.",
  ],
  palette: { t: "#d8e8d0", w: "#ffffff" },
};
const THREAD_KNOT_4 = grown(THREAD_KNOT, [".y...y...y.", "..y..y..y.."], { y: "#fff4c0" });
/** The last one gone soft, sprouting from every eye. */
export const SIXTH_POTATO: Art = {
  rows: [
    "....g......g........",
    "....gg....gg....g...",
    ".....g...gg....gg...",
    ".....gg..g....gg....",
    "....kkkkkkkkkkgk....",
    "..kkpplppppppddkk...",
    ".kpplppwpppdppddpk..",
    "kpplpppppppppppddk..",
    "kppwpppdppppwpppdk..",
    "kpppppppppdpppppdk..",
    ".kppdpppppppppddk...",
    "..kkpppdddpddddk....",
    "....kkkkkkkkkkk.....",
  ],
  palette: { k: "#402e3a", p: "#b08a58", l: "#d0b078", d: "#806038", g: "#e8e0c0", w: "#5a4028" },
};
const SIXTH_POTATO_4 = grown(SIXTH_POTATO, ["...gg...gg...gg...", "..g..g.g..g.g..g..", "..g....g....g....."], { g: "#c8f0a0" });
// --- The kitchen ---
/** A ring on the range, burning small and blue. */
export const GAS_RING: Art = {
  rows: [
    "...f..f..f..f...",
    "..fbffbffbffbf..",
    ".fbbffbbffbbffb.",
    "kkkkkkkkkkkkkkkk",
    "kiikiikiikiikiik",
    ".kkkkkkkkkkkkkk.",
    "..kssssssssssk..",
  ],
  palette: { k: "#402e3a", f: "#8ac8ff", b: "#3a6ae0", i: "#3a3a44", s: "#5a5a68" },
};
const GAS_RING_4 = grown(GAS_RING, ["..w...w...w...", ".www.www.www..", "..w...w...w..."], { w: "#ffffff" });
/** A hand in an apron, peeling, not looking up. */
export const SCULLION: Art = {
  rows: [
    "....kkkk....",
    "...khhhhk...",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaaaaaaaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", h: "#f4f0e4", f: "#e2b090", a: "#d8d8d0", b: "#3a3040" },
};
const SCULLION_4 = grown(SCULLION, ["...hhhh...", "..hhhhhh..", "..hhhhhh.."], { h: "#ffffff" });
/** A lid, held down, rattling a bit. */
export const POT_LID: Art = {
  rows: [
    ".......kk.......",
    "......kggk......",
    "......kkkk......",
    "....kkssssskk...",
    "..kksslssssssk..",
    ".kslssssssssssk.",
    "kslsssssssssssdk",
    "kkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", g: "#2e2a30", s: "#b8bcc8", l: "#f0f4ff", d: "#7a7e8a" },
};
const POT_LID_4 = grown(POT_LID, [".....yy.....", "....y..y....", ".....yy....."], { y: "#d0d4e0" });
/** Forty years of stock, never emptied. */
export const STOCKPOT: Art = {
  rows: [
    "...kkkkkkkkkkkk...",
    "..kbybybbybybybk..",
    "kkksssssssssssskkk",
    "k.kslssssssssdsk.k",
    "kkkslssssssssdskkk",
    "..kslssssssssdsk..",
    "..kslssssssssdsk..",
    "..kslssssssssdsk..",
    "..kssssssssssdsk..",
    "...kkkkkkkkkkkk...",
  ],
  palette: { k: "#402e3a", b: "#b87a3a", y: "#e8c060", s: "#9aa0ac", l: "#e0e8f0", d: "#6a7080" },
};
const STOCKPOT_4 = grown(STOCKPOT, ["...st...ts...", "..s...t...s..", "...ts...st..."], { s: "#ffffff", t: "#d8d8e8" });
/** Fat with slips of paper and grease. */
export const RECIPE_BOOK: Art = {
  rows: [
    "....p..p...p....",
    ".kkkpkkpkkkpkkk.",
    "kcccccckkcccccck",
    "kcwwwwckkcwwwwck",
    "kcwiiwckkcwiiwck",
    "kcwwwwckkcwwwwck",
    "kcwiiwckkcwiiwck",
    "kcwwwwckkcwwwwck",
    "kcwiiwckkcwiiwck",
    "kcccccckkcccccck",
    ".kkkkkkkkkkkkkk.",
  ],
  palette: { k: "#402e3a", p: "#f0d060", c: "#7a2a2a", w: "#f4ecd8", i: "#8a7a6a" },
};
const RECIPE_BOOK_4 = grown(RECIPE_BOOK, ["..w.w.w.w..", ".wwwwwwwww."], { w: "#f4ecd8" });
/** Peeled, pale and wet, and sitting very still. */
export const SEVENTH_POTATO: Art = {
  rows: [
    ".....kkkkkkkkk......",
    "...kkwwwwwlllwkk....",
    "..kwwlllwwwwwlllk...",
    ".kwlllwwwwwwwwlllk..",
    "kwlllwwwwwwwwwwwllk.",
    "kwllwwwwlwwwwwwwllk.",
    "kwlwwwwwwwwwwlwwwlk.",
    "kwlwwlwwwwwwwwwwllk.",
    ".kwlwwwwwwwwwwwllk..",
    "..kkwlllwwwwlllkk...",
    "....kkkkkkkkkkk.....",
  ],
  palette: { k: "#402e3a", w: "#f7ecc8", l: "#e0cc98" },
};
const SEVENTH_POTATO_4 = grown(SEVENTH_POTATO, ["....ss...ss...ss....", ".....ss...ss.ss....."], { s: "#e8e8f0" });
// --- The table ---
/** Knife, fork, spoon, and a very clean plate. */
export const PLACE_SETTING: Art = {
  rows: [
    "f.f.kkkkkkkkkkk.ss.s",
    "f.fkwwwwwwwwwwwkss.s",
    "fffkwppppppppwwkss.s",
    ".f.kwpwwwwwwpwwk.s.s",
    ".f.kwpwwwwwwpwwk.s.s",
    ".f.kwppppppppwwk.s.s",
    ".f..kkkkkkkkkkk..s.s",
  ],
  palette: { k: "#402e3a", f: "#d8dce8", s: "#b8bcc8", w: "#fff8ec", p: "#7a90b8" },
};
const PLACE_SETTING_4 = grown(PLACE_SETTING, ["...y.......y...", "..yyy.....yyy.."], { y: "#ffd166" });
/** Upright, gloved, and carrying something under a dome. */
export const WAITER: Art = {
  rows: [
    "...kkkkkkkk.",
    "..kssssssssk",
    "..klssssssdk",
    ".kkkkkkkkkkk",
    ".....kww....",
    "....kffk....",
    "....kffk....",
    "...kbbbbk...",
    "..kbbwwbbk..",
    "..kbbwwbkww.",
    "..kbbbbbk...",
    "...kbbbbk...",
    "...kbbbbk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", s: "#c8ccd8", l: "#f4f8ff", d: "#8a8e9a", w: "#ffffff", f: "#e2b090", b: "#2a2a3a" },
};
const WAITER_4 = grown(WAITER, ["......yyy...", ".....y...y.."], { y: "#ffd166" });
/** A tall candle in a silver stick. */
export const CANDLE: Art = {
  rows: [
    "....f....",
    "...fyf...",
    "...fyf...",
    "....w....",
    "...kww...",
    "...kww...",
    "...kww...",
    "...kww...",
    "...kww...",
    "...kwd...",
    "...kwd...",
    "..kssss..",
    "...kss...",
    "...kss...",
    "..kssss..",
    ".kssssss.",
  ],
  palette: { k: "#402e3a", f: "#ffb04a", y: "#fff4c0", w: "#f7ecd8", d: "#d8c8a8", s: "#b8bcc8" },
};
const CANDLE_4 = grown(CANDLE, ["f...f...f", "y...y...y", "s...s...s", "sssssssss"], { f: "#ffb04a", y: "#fff4c0", s: "#ffd166" });
/** It all comes down to this. */
export const GRAVY_BOAT: Art = {
  rows: [
    ".........bb........",
    "kk.....kkkkkkkkkkk.",
    ".kk..kkgggggggggkk.",
    "..kkkgggggggggggk.k",
    "...kssssssssssskk.k",
    "...kslsssssssdsk.k.",
    "....kslssssssdkkk..",
    ".....kkssssskk.....",
    ".......kssk........",
    ".....kkkkkkkk......",
  ],
  palette: { k: "#402e3a", b: "#c98b4b", g: "#8a5430", s: "#e8e8f0", l: "#ffffff", d: "#a0a4b0" },
};
const GRAVY_BOAT_4 = grown(GRAVY_BOAT, [".....s....s....", "......s..s....."], { s: "#e8e8f0" });
/** One of every generation you farmed, in oils, looking down at the food. */
export const PORTRAIT: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkk",
    "kyyyyyyyyyyyyyyyyk",
    "kyddddddddddddddyk",
    "kyddddkkkkkkddddyk",
    "kydddkhhhhhhkdddyk",
    "kydddkffffffkdddyk",
    "kydddkfeffefkdddyk",
    "kydddkffffffkdddyk",
    "kyddddkffffkddddyk",
    "kydddbbbbbbbbdddyk",
    "kyddbbbbbbbbbbddyk",
    "kyddbbbbbbbbbbddyk",
    "kyyyyyyyyyyyyyyyyk",
    "kkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", y: "#a8792c", d: "#2a2438", f: "#d8b090", b: "#4a2a3a", h: "#3a2a20", e: "#2a1a22" },
};
const PORTRAIT_4 = grown(PORTRAIT, ["....y..y..y....", "...yyyyyyyyy...", ".....y...y....."], { y: "#ffd166" });
/** One potato, on one plate. */
export const DINNER: Art = {
  rows: [
    "........kkkkkk..........",
    "......kkppplppkk........",
    ".....kpplleplllpk.......",
    ".....kpllppppllpk.......",
    ".....kpppppppppdk.......",
    "......kkppppddkk........",
    "..kkkkkkkkkkkkkkkkkkkk..",
    ".kwwwwwwwwwwwwwwwwwwwwk.",
    "kwbbbbbbbbbbbbbbbbbbbbwk",
    ".kwwwwwwwwwwwwwwwwwwwwk.",
    "..kkkkkkkkkkkkkkkkkkkk..",
  ],
  palette: { k: "#402e3a", p: "#d09858", l: "#ecc488", d: "#a06c38", e: "#5a3418", w: "#fff8ec", b: "#7a90b8" },
};
const DINNER_4 = grown(DINNER, ["........yy...yy.........", ".......y..y.y..y........", ".........y....y........."], { y: "#fff4c0" });

/** Four marks per tier, indexed by how many of its three upgrades you own. See the marks note above. */
// --- The potato's journey past the farm: store, factory, road, market, supermarket, larder, heap ---

/** Potatoes heaped under straw and earth, the old way. */
export const STRAW_CLAMP: Art = {
  rows: [
    "......kkkkkk......",
    "....kkyyyyyykk....",
    "...kyyyhyyyyyyk...",
    "..kyyhyyyyhyyyyk..",
    ".kyyyyyyhyyyyhyyk.",
    "kyyhyyyyyyyyyyyyyk",
    "kddddpddddddpddddk",
    "kkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", y: "#d8b860", h: "#f0d890", d: "#7a5237", p: "#c98b4b" },
};

/** Flat cap, long coat, knows every box by its smell. */
export const STOREHAND: Art = {
  rows: [
    "...kkkkk....",
    "...kccccck..",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaaaaaaaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", c: "#5a4a3a", f: "#e2b090", a: "#6a5a3a", b: "#3a3040" },
};

/** Three wooden bins of a stack, a tonne in each. */
export const BOX_STACK: Art = {
  rows: [
    "kkkkkkkkkkkkkk",
    "kpplpplppplppk",
    "kwwwwwwwwwwwwk",
    "kwwvwwwwwwvwwk",
    "kvvvvvvvvvvvvk",
    "kwwvwwwwwwvwwk",
    "kkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkk",
    "kpplpplppplppk",
    "kwwwwwwwwwwwwk",
    "kwwvwwwwwwvwwk",
    "kvvvvvvvvvvvvk",
    "kwwvwwwwwwvwwk",
    "kkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkk",
    "kpplpplppplppk",
    "kwwwwwwwwwwwwk",
    "kwwvwwwwwwvwwk",
    "kvvvvvvvvvvvvk",
    "kwwvwwwwwwvwwk",
    "kkkkkkkkkkkkkk",
    ".kk........kk.",
  ],
  palette: { k: "#402e3a", w: "#9a6a42", v: "#6a4630", p: "#c98b4b", l: "#e2b077" },
};

/** A wall fan that pulls the night air through. */
export const NIGHT_FAN: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kmmmmmmmmmmk",
    "kmm.bbbb.mmk",
    "km.b.bb.b.mk",
    "kmbb..bb.bmk",
    "kmb.bkkb.bmk",
    "kmb.bkkb.bmk",
    "kmbb.bb..bmk",
    "km.b.bb.b.mk",
    "kmm.bbbb.mmk",
    "kmmmmmmmmmmk",
    "kkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", m: "#8a92a0", b: "#c8d0d8" },
};

/** A tonne at a time, beeping. */
export const FORKLIFT: Art = {
  rows: [
    "......kkkkk.....",
    "......k...k.....",
    "......k...k.....",
    ".k....k...kkk...",
    ".k....kyyyyyyk..",
    ".k...kyyyyyyyyk.",
    ".k...kyyyyyyyyyk",
    ".kkkkkyyyyyyyyyk",
    "kkkk.kyyyyyyyyyk",
    ".....kkkkkkkkkkk",
    "......kggk..kggk",
    ".......kk....kk.",
  ],
  palette: { k: "#402e3a", y: "#e8b830", g: "#5a5a68" },
};

/** Every harvest in columns, on a lectern by the door. */
export const STORE_LEDGER: Art = {
  rows: [
    ".kkkkkk.kkkkkk.",
    "kpllplpkplplppk",
    "kplplppkpllplpk",
    "kpllplpkplplppk",
    "kkkkkkkkkkkkkkk",
    "....kwwwwwk....",
    ".....kwwwk.....",
    "......kwk......",
    "......kwk......",
    "....kkkkkkk....",
  ],
  palette: { k: "#402e3a", p: "#f4ecd8", l: "#c8b498", w: "#7a5237" },
};

/** Mists the stack so the eyes stay shut. */
export const SPROUT_FOGGER: Art = {
  rows: [
    "....kk......",
    "....kgk.....",
    "....kgk.....",
    "..kkkkkkkk..",
    ".kttttttttk.",
    ".ktlttttttk.",
    ".kttttttttk.",
    ".ktttrrtttk.",
    ".kttttttttk.",
    ".kkkkkkkkkk.",
    "..kk....kk..",
  ],
  palette: { k: "#402e3a", g: "#8a92a0", t: "#5a8a6a", l: "#8ac0a0", r: "#e05a3a" },
};

/** Four degrees, forever, behind a door like a bank's. */
export const COLD_STORE: Art = {
  rows: [
    "kkiiiikkkkkkkkkkkkkkiiikkkkkkkkk",
    "kwwwwwwwdwwwwwwwdwwwwwwwdwwwwwwk",
    "kllllllllllllllllllllllllllllllk",
    "kwwwwwwwdwwwwwwwdwwwwwwwdwwwwwwk",
    "kwwwwwwwdwwwwwwwdwwwwwwwdwwwwwwk",
    "kwwwwwwwdwwwwwwwdwwwwwwwdwwwwwwk",
    "kwwwwwwwdkkkkkkkkkkkkkkwdwkkkkwk",
    "kwwwwwwwdksssssssssssskwdwkwwkwk",
    "kwwwwwwwdksssssssssssskwdwkrwkwk",
    "kwwwwwwwdksskkkkkkkksskwdwkrwkwk",
    "kwwwwwwwdksskffiiifksskwdwkrwkwk",
    "kwwwwwwwdksskifiifiksskwdwkrwkwk",
    "kwwwwwwwdksskiiiiiiksskwdwkrwkwk",
    "kwwwwwwwdksskkkkkkkksskwdwkrrkwk",
    "kwwwwwwwdksssssssssssskwdwkwwkwk",
    "kwwwwwwwdksssssssssssskwdwkkkkwk",
    "kwwwwwwwdkssssssssskkskwdwwwwwwk",
    "kwwwwwwwdkssssssssskkskwdwwwwwwk",
    "kwwwwwwwdkssssssssskkskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kwwwwwwwdksssssssssssskwdwwwwwwk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", w: "#e8eef2", d: "#b8c4cc", l: "#ffffff", s: "#c8d4dc", i: "#a8d8f0", f: "#ffffff", r: "#e05a3a" },
};

/** A steel drum that tumbles the mud off. */
export const WASHER: Art = {
  rows: [
    "...............kkk..",
    ".kkkkkkkkkkkkkkkkkkk",
    ".kllllllllllllllllk.",
    ".kbdbbbdbbbdbbbdbbk.",
    ".kbdbbbkkkkkkbbdbbk.",
    ".kbdbbbkwwwwkbbdbbk.",
    ".kbdbbbkpppqkbbdbbk.",
    ".kbdbbbkpqppkbbdbbk.",
    ".kbdbbbkppppkbbdbbk.",
    ".kbdbbbkkkkkkbbdbbk.",
    ".kbdbbbdbbbdbbbdbbk.",
    ".kkkkkkkkkkkkkkkkkk.",
    "...kk..........kk...",
    "...kk..........kk...",
    "...kk..........kk...",
    "....................",
  ],
  palette: { k: "#402e3a", b: "#6a90b8", l: "#a8c8e8", d: "#4a6a90", w: "#d8f0ff", p: "#c98b4b", q: "#e2b077" },
};

/** Hairnet, white coat, picking out the green ones. */
export const LINE_WORKER: Art = {
  rows: [
    "...kkkkkk...",
    "..kwwwwwwk..",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaaaaaaaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", w: "#f4f4f0", f: "#e2b090", a: "#e8ecf0", b: "#3a4a6a" },
};

/** Hard hat, hi-vis, laminated sign for everything. */
export const SAFETY_OFFICER: Art = {
  rows: [
    "...kkkkkk...",
    "..kyyyyyyk..",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kavvaavvak.",
    "kffkaaaakffk",
    "kk.kvaavk.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", y: "#f0c020", f: "#e2b090", a: "#f07a2a", v: "#e8e070", b: "#3a3a4a" },
};

/** A shaking mesh with a camera watching it. */
export const GRADER: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkk",
    "ksspqspsqpspsqsssk",
    "ksmsmsmsmsmsmsmsmk",
    "kmsmsmsmsmsmsmsmsk",
    "kssssssssssssssssk",
    "kkkkkkkkkkkkkkkkkk",
    ".kk..........kkkk.",
    ".kk..........kkkk.",
    ".............kkkk.",
    ".kk..........kk...",
    ".kk..........kkk..",
  ],
  palette: { k: "#402e3a", s: "#9aa4b0", m: "#5a6470", p: "#c98b4b", q: "#e2b077" },
};

/** Brass, engraved, one per generation. */
export const SERVICE_PLAQUE: Art = {
  rows: [
    "kkkkkkkkkk",
    "kyyyyyyyyk",
    "kyddddddyk",
    "kyyyyyyyyk",
    "kyddyddyyk",
    "kyyyyyyyyk",
    "kkkkkkkkkk",
  ],
  palette: { k: "#402e3a", y: "#d8b04a", d: "#8a6a2a" },
};

/** Slice, fry, salt, bag, all in one breath. */
export const CRISP_LINE: Art = {
  rows: [
    "....kkkkkkkkkkkkkkkkkk................",
    "....khhhhhhhhhhhhhhhhk................",
    "....khhhhhhhhhhhhhhhhk................",
    "....khhhhhhhhhhhhhhhhk................",
    "....kkkkkkkkkkkkkkkkkk................",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk............",
    "koooyoyoyyoyoyyoyoyooooook............",
    "kooooooooooooooooooooooook............",
    "kooooooooooooooooooooooookkkkkkkkkkkkk",
    "kllllllllllllllllllllllllkkcccccccccck",
    "ksssssssssssssssssssssssskkccbbbbcccck",
    "ksssssssssssssssssssssssskkccbbbbcccck",
    "ksssssssssssssssssssssssskkcccccccccck",
    "ksssssssssssssssssssssssskkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk.......kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
    "..kk.................kk..........kk...",
  ],
  palette: { k: "#402e3a", h: "#b8c0c8", s: "#9aa4b0", o: "#e0a030", y: "#ffe08a", l: "#d0d8e0", c: "#c8d0d8", b: "#e83a3a" },
};

/** Forty sacks shrink-wrapped to a board. */
export const PALLET: Art = {
  rows: [
    ".kkkkkkkkkkkk.",
    ".kfllllfffffk.",
    ".kssfssfssfss.",
    ".kssssssssssk.",
    ".kffffffffffk.",
    ".kssfssfssfss.",
    ".kssssssssssk.",
    ".kkkkkkkkkkkk.",
    "kkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", f: "#d8e4ec", s: "#b89a6a", l: "#ffffff" },
};

/** Checked shirt, cap, knows every lay-by. */
export const DRIVER: Art = {
  rows: [
    "...kkkkk....",
    "...kccccck..",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaawaawaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kawwak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", c: "#2a4a8a", f: "#e2b090", a: "#c83a3a", w: "#f4e8e0", b: "#3a4a6a" },
};

/** Lit all night, tea in a mug the size of a bucket. */
export const TRANSPORT_CAFE: Art = {
  rows: [
    ".....kkkkkkkkkkkkkkkkkkkk.....",
    ".....knnnnnnnnnnnnnnnnnnk.....",
    ".....kcccnncccnncccnnccck.....",
    "kkkkkknnnnnnnnnnnnnnnnnnkkkkkk",
    "rrrrrkkkkkkkkkkkkkkkkkkkkrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kllllllllllllllllllllllllllllk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwkkkkkkkkkkwwwwwwkkkkkkkkkkwk",
    "kwkggggkgggkwwwwwwkggggkgggkwk",
    "kwkggggkgggkwkkkkwkggggkgggkwk",
    "kwkggggkgggkwkddkwkggggkgggkwk",
    "kwkggggkgggkwkddkwkggggkgggkwk",
    "kwkggggkgggkwkddkwkggggkgggkwk",
    "kwkkkkkkkkkkwkddkwkkkkkkkkkkwk",
    "kwwwwwwwwwwwwkddkwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwkddkwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwkddkwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwkddkwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", w: "#d8c8a8", l: "#f0e4c8", r: "#a83a2a", n: "#2a2a3a", c: "#ff6a4a", g: "#ffe08a", d: "#6a4a30" },
};

/** A white box on wheels, cold the whole way. */
export const REEFER: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    "kllllllllllllllllllllllllllkkkkk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkuuuk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkuguk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkuguk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkuguk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkuuuk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbkkkkk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    "..kkkkkkkkkkkkkkkkkkkkkkkkkkk...",
    "....kgk..kgk..........kgk...k...",
    "....kkk..kkk..........kkk...k...",
    "................................",
  ],
  palette: { k: "#402e3a", b: "#e8eef2", l: "#ffffff", u: "#8a92a0", g: "#5a5a68" },
};

/** The family name down the side, in gold. */
export const LIVERY: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    "kllllllllllllllllllllllllllllk..",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk..",
    "kbbbbbdbddbdddbddbdbddbbbbbbbk..",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk..",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyk..",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyk..",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk..",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    "..kkkkkkkkkkkkkkkkkkkkkkkkkkk...",
    "....kgk..kgk..........kgk...k...",
    "....kkk..kkk..........kkk...k...",
    "................................",
  ],
  palette: { k: "#402e3a", b: "#2a6a4a", l: "#ffffff", y: "#d8b04a", d: "#2a2a3a", g: "#5a5a68" },
};

/** Forty-four tonnes of potatoes, doing fifty-six. */
export const JUGGERNAUT: Art = {
  rows: [
    "............................................",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............",
    "kllllllllllllllllllllllllllllllk............",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kkkkkkkkkkk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kcckkkkkkck",
    "kbbbbbbbdbddbdddbddbdbbbbbbbbbbk.kcckggggkck",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kcckggggkck",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kcckkkkkkck",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kccccccccck",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk.kccccccccck",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.mmmmmmmmmmh",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.kccccccccch",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.kkkkkkkkkkk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....kkk...",
    "...kwk..kwk...........kwk.kwk.........kwk...",
    "...kkk..kkk...........kkk.kkk.........kkk...",
  ],
  palette: { k: "#402e3a", b: "#e8eef2", l: "#ffffff", y: "#d8b04a", d: "#2a6a4a", c: "#c83a3a", g: "#a8d0e8", m: "#8a92a0", h: "#fff4a0", w: "#5a5a68" },
};

/** A trestle under a striped awning, and a chalked sign. */
export const MARKET_STALL: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkk",
    "rrwwrrwwrrwwrrwwrrwwrr",
    "rrwwrrwwrrwwrrwwrrwwrr",
    "rrwwrrwwrrwwrrwwrrwwrr",
    "rrwwrrwwrrwwrrwwrrwwrr",
    "r.w.r.w.r.w.r.w.r.w.r.",
    ".k..................k.",
    ".k..................k.",
    ".k.ppqp..pqpp..ppqp.k.",
    ".k.kkkk..kkkk..kkkk.k.",
    "kkkkkkkkkkkkkkkkkkkkkk",
    "kttttttttttttttttttttk",
    "kkkkkkkkkkkkkkkkkkkkkk",
    ".k....kkkkkkkkkk....k.",
    ".k....kxxxxxxxck....k.",
    ".k....kcccccccck....k.",
    ".k....kkkkkkkkkk....k.",
    ".k..................k.",
  ],
  palette: { k: "#402e3a", r: "#c83a3a", w: "#f4ecd8", t: "#9a6a42", p: "#c98b4b", q: "#e2b077", c: "#2a2a2a", x: "#f4f4f0" },
};

/** Flat cap, brown coat, mind your backs. */
export const PORTER: Art = {
  rows: [
    "...kkkkk....",
    "...kccccck..",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaaaaaaaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", c: "#4a4a3a", f: "#e2b090", a: "#8a6a4a", b: "#3a3040" },
};

/** Rung at five sharp. */
export const MARKET_BELL: Art = {
  rows: [
    "....kk....",
    "....kk....",
    "...kyyk...",
    "..kyylyk..",
    "..kyylyk..",
    ".kyyylyyk.",
    ".kyyyyyyk.",
    "kyyyyyyyyk",
    "kkkkkkkkkk",
    "....kk....",
  ],
  palette: { k: "#402e3a", y: "#d8a83a", l: "#fff0a0" },
};

/** Honest, mostly. */
export const BRASS_SCALES: Art = {
  rows: [
    "kkkkk..kkkkk",
    ".kyyk..kyyk.",
    "..k......k..",
    "..k..kk..k..",
    "kkkkkkkkkkkk",
    ".....kk.....",
    ".....kk.....",
    "....kyyk....",
    "...kyyyyk...",
    "..kkkkkkkk..",
  ],
  palette: { k: "#402e3a", y: "#d8a83a" },
};

/** A painted board over the family's corner. */
export const FAMILY_PITCH: Art = {
  rows: [
    "..k....................k..",
    "..k....................k..",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kknnnnnnnnnnnnnnnnnnnnnnkk",
    "kknyynynyyynnynynyynyynnkk",
    "kknnnnnnnnnnnnnnnnnnnnnnkk",
    "kknynyynynyynnnyynynyynnkk",
    "kknnnnnnnnnnnnnnnnnnnnnnkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", n: "#2a4a3a", y: "#f0d890" },
};

/** A great clattering board of what a potato is worth. */
export const PRICE_BOARD: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "keeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeek",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "knnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnk",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "knnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnk",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkfffffknkfffffknkfffffknkfffffknkfffffknk",
    "knkkkkkkknkkkkkkknkkkkkkknkkkkkkknkkkkkkknk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", n: "#1a1a24", e: "#3a3a48", f: "#2a2a34" },
};

/** Washed and bagged, under a light that makes them look it. */
export const SHELF: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkk",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbpbmbpbmbpbmbpbmbpb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kkkkkkkkkkkkkkkkkkkk",
    "keeeeeeeeeeeeeeeeeek",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbpbmbpbmbpbmbpbmbpb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kkkkkkkkkkkkkkkkkkkk",
    "keeeeeeeeeeeeeeeeeek",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbpbmbpbmbpbmbpbmbpb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kbbbmbbbmbbbmbbbmbbb",
    "kkkkkkkkkkkkkkkkkkkk",
    "keeeeeeeeeeeeeeeeeek",
    "kttttttttttttttttttk",
    "kmmrmmmrmmmrmmmrmmmk",
    "kkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", m: "#8e9cae", e: "#c8d2de", b: "#f0ece0", p: "#c98b4b", t: "#e8e8e8", r: "#e83a3a" },
};

/** Green polo, name badge, faces everything label-out. */
export const SHELF_STACKER: Art = {
  rows: [
    "....kkkk....",
    "...khhhhk...",
    "...kffffk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kaaaaawaak.",
    "kffkaaaakffk",
    "kk.kaaaak.kk",
    "...kaaaak...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", h: "#5a3a2a", f: "#e2b090", a: "#3a8a5a", w: "#ffffff", b: "#2a2a3a" },
};

/** Something soft and endless. */
export const CEILING_SPEAKER: Art = {
  rows: [
    "kkkkkkkk",
    "kwwwwwwk",
    "kwgwgwgk",
    "kwwgwgwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
  palette: { k: "#402e3a", w: "#e8ecf0", g: "#8a92a0" },
};

/** A produce case with a nozzle over it. */
export const VEG_MISTER: Art = {
  rows: [
    "...k..........k.....",
    "...kkkkkkkkkkkk.....",
    "...k.k..k..k..k.....",
    "....................",
    "kkkkkkkkkkkkkkkkkkkk",
    "kpqpvooovpqpvooovpqk",
    "kvppvvoovvppvvoovvpk",
    "kvvvvvvvvvvvvvvvvvvk",
    "kllllllllllllllllllk",
    "kggggggggggggggggggk",
    "kggggggggggggggggggk",
    "kkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", g: "#3a8a5a", v: "#2a5a3a", p: "#c98b4b", q: "#e2b077", o: "#e8a040", l: "#5ab07a" },
};

/** Points for every generation, hung over the aisle. */
export const LOYALTY_CARD: Art = {
  rows: [
    "......k.......",
    "......k.......",
    "kkkkkkkkkkkkkk",
    "kppppppppppppk",
    "kpyyyppppppppk",
    "kpyyyppwwwwwpk",
    "kppppppppppppk",
    "kpwwwwwwwwwwpk",
    "kppppppppppppk",
    "kkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", p: "#8a3ac8", y: "#ffd166", w: "#f0e0ff" },
};

/** Beep. Beep. Beep. */
export const CHECKOUT: Art = {
  rows: [
    ".......................r....",
    "....................kkkkkkk.",
    "....................kgggggk.",
    "....................kgggggk.",
    "....................ksssssk.",
    "....................ksssssk.",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kceccecceccecceccecbbbbbbbbk",
    "kccccccccccccccccccbbbbbbbbk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kbrbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", b: "#c8ccd4", c: "#3a3a44", e: "#6a6a78", s: "#5a5a68", g: "#7ae0a0", r: "#ff3a3a" },
};

/** Five pounds, rolled shut at the top. */
export const PAPER_SACK: Art = {
  rows: [
    "..kkkkkk..",
    "..knnnnk..",
    ".kkkkkkkk.",
    ".kbbbbbbk.",
    "kbblbbbbbk",
    "kbbbbbbbbk",
    "kbbppbbbbk",
    "kbbppbbbbk",
    "kbbbbbbbbk",
    "kbbbbbbbdk",
    ".kbbbbbdk.",
    "..kkkkkk..",
  ],
  palette: { k: "#402e3a", n: "#a87a4a", b: "#c8a070", l: "#e0c090", p: "#8a5a30", d: "#a07a4a" },
};

/** Sent for four big ones. */
export const ERRAND_KID: Art = {
  rows: [
    "....kkkk....",
    "...khhhhk...",
    "...kffffk...",
    "....kffk....",
    "..kkaaaakk..",
    ".kffaaaaffk.",
    "...kwwwwk...",
    "...kkkkkk...",
    "...kbkkbk...",
    "...kk..kk...",
  ],
  palette: { k: "#402e3a", h: "#6a3a2a", f: "#e2b090", a: "#d84a4a", w: "#f4e8e0", b: "#3a4a6a" },
};

/** Set at night, cheese on the hook. */
export const MOUSETRAP: Art = {
  rows: [
    "...kkkk...",
    "..kk..ky..",
    "kkkkkkkkkk",
    "kwwwwwwwwk",
    "kkkkkkkkkk",
  ],
  palette: { k: "#402e3a", w: "#c8a070", y: "#ffd166" },
};

/** Three wire tiers and plenty of air. */
export const VEG_RACK: Art = {
  rows: [
    "k............k",
    "k............k",
    "kpq.pp.qp.pq.k",
    "k.pqp..pqpq..k",
    "km.m.m.m.m.m.k",
    "kkkkkkkkkkkkkk",
    "k............k",
    "k............k",
    "koo.o.oo.oo..k",
    "kooo.oo.ooo..k",
    "km.m.m.m.m.m.k",
    "kkkkkkkkkkkkkk",
    "k............k",
    "k............k",
    "kpq.pp.qp.pq.k",
    "kpp.qp.pq.pp.k",
    "km.m.m.m.m.m.k",
    "kkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", m: "#8a92a0", p: "#c98b4b", q: "#e2b077", o: "#d8a850" },
};

/** A jar put up and dated. */
export const PRESERVE_JAR: Art = {
  rows: [
    ".kkkk.",
    ".kcck.",
    "kkkkkk",
    "kjjjjk",
    "kjljjk",
    "kjjjjk",
    "kjjjjk",
    "kkkkkk",
  ],
  palette: { k: "#402e3a", c: "#d8c8a8", j: "#c83a5a", l: "#f08aa0" },
};

/** Humming in the corner since 1987. */
export const CHEST_FREEZER: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kffffffffffffffffffffffffffffk",
    "kllllllllllllllllllllllllllllk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwkkkkkkwwwwwwwwwwwk",
    "kwwgwwwwwwwwkkkkkkwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
    "kddddddddddddddddddddddddddddk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", w: "#e8ecef", l: "#d8dee4", f: "#ffffff", d: "#a8b0b8", g: "#5ad07a" },
};

/** Slatted bays of everything nobody finished. */
export const COMPOST_BAY: Art = {
  rows: [
    "...nnnnnnnn....nnnnnnnn...",
    "..nnbnnonnngn.nngnnbnnonn.",
    "kw..........kw..........kw",
    "kw..........kw..........kw",
    "wwwwwwwwwwwwwwwwwwwwwwwwww",
    "vvvvvvvvvvvvvvvvvvvvvvvvvv",
    "kw..........kw..........kw",
    "wwwwwwwwwwwwwwwwwwwwwwwwww",
    "vvvvvvvvvvvvvvvvvvvvvvvvvv",
    "kw..........kw..........kw",
    "wwwwwwwwwwwwwwwwwwwwwwwwww",
    "vvvvvvvvvvvvvvvvvvvvvvvvvv",
    "kw..........kw..........kw",
    "kw..........kw..........kw",
  ],
  palette: { k: "#402e3a", w: "#9a6a42", v: "#6a4630", n: "#4a3424", b: "#6a4a30", o: "#c98b4b", g: "#6a8a3a" },
};

/** A bag of washed potatoes with a red label. */
export const POTATO_BAG: Art = {
  rows: [
    "..kkkk..",
    ".kwwwwk.",
    "kwpwpwwk",
    "kwwpwpwk",
    "krrrrrrk",
    "krwwwwrk",
    "krrrrrrk",
    "kwpwwpwk",
    "kwwpwwpk",
    ".kkkkkk.",
  ],
  palette: { k: "#402e3a", w: "#f4f0e4", p: "#c98b4b", r: "#d83a3a" },
};

/** A packet of crisps, out in the dark. */
export const CUT_PACKET: Art = {
  rows: [
    "..kkkkkkkkkkkkkkkkkk..",
    "..k.r.r.r.r.r.r.r.rk..",
    "..kkkkkkkkkkkkkkkkkk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrkkkkkkkkkkkkrrk..",
    "..krrkyyyyyyyyyykrrk..",
    "..krrkyyyoooyyyykrrk..",
    "..krrkyyoooooyyykrrk..",
    "..krrkyoooooooyykrrk..",
    "..krrkyyoooooyyykrrk..",
    "..krrkyyyoooyyyykrrk..",
    "..krrkyyyyyyyyyykrrk..",
    "..krrkyyyyyyyyyykrrk..",
    "..krrkkkkkkkkkkkkrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krwwwwwwwwwwwwwwrk..",
    "..krwwwwwwwwwwwwwwrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..krrrrrrrrrrrrrrrrk..",
    "..kkrkrkrkrkrkrkrkrk..",
    "..kkkkkkkkkkkkkkkkkk..",
    "......................",
  ],
  palette: { k: "#402e3a", r: "#e83a3a", y: "#ffe08a", o: "#e0a030", w: "#ffffff" },
};

/** A lorry, head on, lights up, at four in the morning. */
export const CUT_LORRY: Art = {
  rows: [
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    ".kcccccccccccccccccccccccccck.",
    ".kcckkkkkkkkkkkkkkkkkkkkkkcck.",
    ".kcckggggggggggggggggggggkcck.",
    ".kcckggggggggggggggggggggkcck.",
    ".kcckggggggggggggggggggggkcck.",
    ".kcckkkkkkkkkkkkkkkkkkkkkkcck.",
    ".kcccccccccccccccccccccccccck.",
    ".kccccccckkkkkkkkkkkkccccccck.",
    ".kkkkkkkckkkkkkkkkkkkckkkkkkk.",
    ".kkwwwwkckmmmmmmmmmmkckwwwwkk.",
    ".kkwwwwkckkkkkkkkkkkkckwwwwkk.",
    ".kkkkkkkckkkkkkkkkkkkckkkkkkk.",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    "..kkkk..................kkkk..",
    "..kggk..................kggk..",
    "..kkkk..................kkkk..",
    "..............................",
  ],
  palette: { k: "#402e3a", c: "#c83a3a", g: "#3a4a6a", m: "#8a92a0", w: "#ffffff" },
};

/** A price tag, hand-written. */
export const CUT_TAG: Art = {
  rows: [
    "...........k............",
    "...........k............",
    "...........k............",
    "...........k............",
    "..kkkkkkkkkkkkkkkkkkkk..",
    "..kttttttttttttttttttk..",
    "..kttttttttttttkkkkttk..",
    "..kttttttttttttk..kttk..",
    "..ktttyyttyyyttk..kttk..",
    "..kttyttytyttttkkkkttk..",
    "..ktttyyttyyyttttttttk..",
    "..ktttttytttyttttttttk..",
    "..kttyyyttyyyttttttttk..",
    "..kttttttttttttttttttk..",
    "..kttttttttttttttttttk..",
    "..kttttttttttttttttttk..",
    "..kttttttttttttttttttk..",
    "..kkkkkkkkkkkkkkkkkkkk..",
    "........................",
    "........................",
  ],
  palette: { k: "#402e3a", t: "#f4ecd8", y: "#c83a3a" },
};

/** A wire basket with a bag of potatoes in. */
export const CUT_BASKET: Art = {
  rows: [
    "......kkkkkkkkkkkkkkkk......",
    ".....k................k.....",
    "....k..................k....",
    "............................",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "krrrrrrrrrrrrrrrrrrrrrrrrrrk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "..kkkkppkkqpkppkkpqkkkkkkk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..kddddddddddddddddddddddk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..krrdrrrdrrrdrrrdrrrdrrrk..",
    "..kkkkkkkkkkkkkkkkkkkkkkkk..",
  ],
  palette: { k: "#402e3a", r: "#e83a3a", d: "#a82a2a", p: "#c98b4b", q: "#e2b077" },
};

/** A cupboard door with the light on behind it. */
export const CUT_DOOR: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkk",
    "kwwwwwwwwwwwwwwwwwwk",
    "kwkkkkkkkkkkkkkkkkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkkkkkkkkkkkkkkkkwk",
    "kwwwwwwwwwwwwwwwwwwk",
    "kwkkkkkkkkkkkkkyykwk",
    "kwkvvvvvvvvvvvvyykwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkvvvvvvvvvvvvvvkwk",
    "kwkkkkkkkkkkkkkkkkwk",
    "kwwwwwwwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkkkkkkk",
    "llllllllllllllllllll",
    "llllllllllllllllllll",
  ],
  palette: { k: "#402e3a", w: "#7a5237", v: "#5e3e29", y: "#d8b04a", l: "#fff0b0" },
};


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
    STRAW_CLAMP,
    repaint(STRAW_CLAMP, { y: "#c8a850" }),
    repaint(STRAW_CLAMP, { y: "#e8c860" }),
    grown(STRAW_CLAMP, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  well: [
    NIGHT_FAN,
    repaint(NIGHT_FAN, { b: "#e0e8f0" }),
    repaint(NIGHT_FAN, { b: "#ffd166" }),
    grown(NIGHT_FAN, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  chorus: [
    STORE_LEDGER,
    repaint(STORE_LEDGER, { p: "#fff4c0" }),
    repaint(STORE_LEDGER, { p: "#ffe08a" }),
    grown(STORE_LEDGER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  deephand: [
    STOREHAND,
    repaint(STOREHAND, { a: "#4a5a6a" }),
    repaint(STOREHAND, { a: "#7a3a3a" }),
    grown(STOREHAND, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  face: [
    BOX_STACK,
    repaint(BOX_STACK, { w: "#b07a4a" }),
    repaint(BOX_STACK, { w: "#c9a24a" }),
    grown(BOX_STACK, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  main: [
    FORKLIFT,
    repaint(FORKLIFT, { y: "#e87a30" }),
    repaint(FORKLIFT, { y: "#3a8ac8" }),
    grown(FORKLIFT, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  heart: [
    SPROUT_FOGGER,
    repaint(SPROUT_FOGGER, { t: "#4a7ab0" }),
    repaint(SPROUT_FOGGER, { t: "#8a5ab0" }),
    grown(SPROUT_FOGGER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  second: [
    COLD_STORE,
    repaint(COLD_STORE, { i: "#c8f0ff" }),
    repaint(COLD_STORE, { i: "#ffffff" }),
    grown(COLD_STORE, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  echo: [
    WASHER,
    repaint(WASHER, { b: "#7a9a7a" }),
    repaint(WASHER, { b: "#9a7ab8" }),
    grown(WASHER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  kin: [
    LINE_WORKER,
    repaint(LINE_WORKER, { b: "#2a6a4a" }),
    repaint(LINE_WORKER, { b: "#6a2a4a" }),
    grown(LINE_WORKER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  grove: [
    SAFETY_OFFICER,
    repaint(SAFETY_OFFICER, { a: "#e8e040" }),
    repaint(SAFETY_OFFICER, { a: "#40c0e8" }),
    grown(SAFETY_OFFICER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  tide: [
    GRADER,
    repaint(GRADER, { s: "#a8b8c8" }),
    repaint(GRADER, { s: "#c9a24a" }),
    grown(GRADER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  beacon: [
    SERVICE_PLAQUE,
    repaint(SERVICE_PLAQUE, { y: "#e8c060" }),
    repaint(SERVICE_PLAQUE, { y: "#fff0a0" }),
    grown(SERVICE_PLAQUE, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  third: [
    CRISP_LINE,
    repaint(CRISP_LINE, { b: "#3a8ae8" }),
    repaint(CRISP_LINE, { b: "#40b060" }),
    grown(CRISP_LINE, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  dawn: [
    MARKET_STALL,
    repaint(MARKET_STALL, { r: "#3a8a5a" }),
    repaint(MARKET_STALL, { r: "#3a5ac8" }),
    grown(MARKET_STALL, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  elder: [
    PORTER,
    repaint(PORTER, { a: "#5a6a4a" }),
    repaint(PORTER, { a: "#6a4a7a" }),
    grown(PORTER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  root: [
    MARKET_BELL,
    repaint(MARKET_BELL, { y: "#e8c060" }),
    repaint(MARKET_BELL, { y: "#fff0a0" }),
    grown(MARKET_BELL, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  spring: [
    BRASS_SCALES,
    repaint(BRASS_SCALES, { y: "#e8c060" }),
    repaint(BRASS_SCALES, { y: "#fff0a0" }),
    grown(BRASS_SCALES, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  hearth: [
    FAMILY_PITCH,
    repaint(FAMILY_PITCH, { n: "#6a2a2a" }),
    repaint(FAMILY_PITCH, { n: "#2a2a6a" }),
    grown(FAMILY_PITCH, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  first: [
    PRICE_BOARD,
    repaint(PRICE_BOARD, { e: "#5a4a2a" }),
    repaint(PRICE_BOARD, { e: "#8a6a2a" }),
    grown(PRICE_BOARD, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  spark: [
    PALLET,
    repaint(PALLET, { s: "#c8a070" }),
    repaint(PALLET, { s: "#d8b880" }),
    grown(PALLET, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  kith: [
    DRIVER,
    repaint(DRIVER, { a: "#3a6ac8" }),
    repaint(DRIVER, { a: "#3a9a5a" }),
    grown(DRIVER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  loom: [
    TRANSPORT_CAFE,
    repaint(TRANSPORT_CAFE, { r: "#3a6a9a" }),
    repaint(TRANSPORT_CAFE, { r: "#3a8a5a" }),
    grown(TRANSPORT_CAFE, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  vault: [
    REEFER,
    repaint(REEFER, { u: "#5a8ac8" }),
    repaint(REEFER, { u: "#c9a24a" }),
    grown(REEFER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  crown: [
    LIVERY,
    repaint(LIVERY, { b: "#2a4a8a" }),
    repaint(LIVERY, { b: "#6a2a3a" }),
    grown(LIVERY, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  fourth: [
    JUGGERNAUT,
    repaint(JUGGERNAUT, { c: "#2a6ac8" }),
    repaint(JUGGERNAUT, { c: "#e8b830" }),
    grown(JUGGERNAUT, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  mote: [
    SHELF,
    repaint(SHELF, { b: "#e8f0e0" }),
    repaint(SHELF, { b: "#fff8e0" }),
    grown(SHELF, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  wisp: [
    SHELF_STACKER,
    repaint(SHELF_STACKER, { a: "#3a5ac8" }),
    repaint(SHELF_STACKER, { a: "#c83a5a" }),
    grown(SHELF_STACKER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  veil: [
    CEILING_SPEAKER,
    repaint(CEILING_SPEAKER, { w: "#d8e0ff" }),
    repaint(CEILING_SPEAKER, { w: "#fff0c0" }),
    grown(CEILING_SPEAKER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  nebula: [
    VEG_MISTER,
    repaint(VEG_MISTER, { g: "#3a7a9a" }),
    repaint(VEG_MISTER, { g: "#8a5a3a" }),
    grown(VEG_MISTER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  aeon: [
    LOYALTY_CARD,
    repaint(LOYALTY_CARD, { p: "#3a5ac8" }),
    repaint(LOYALTY_CARD, { p: "#c9a24a" }),
    grown(LOYALTY_CARD, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  fifth: [
    CHECKOUT,
    repaint(CHECKOUT, { g: "#8ac0ff" }),
    repaint(CHECKOUT, { g: "#ffd166" }),
    grown(CHECKOUT, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  ember: [
    PAPER_SACK,
    repaint(PAPER_SACK, { b: "#b8906a" }),
    repaint(PAPER_SACK, { b: "#d8b080" }),
    grown(PAPER_SACK, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  ward: [
    ERRAND_KID,
    repaint(ERRAND_KID, { a: "#3a8ac8" }),
    repaint(ERRAND_KID, { a: "#3aa860" }),
    grown(ERRAND_KID, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  lull: [
    MOUSETRAP,
    repaint(MOUSETRAP, { w: "#a87a4a" }),
    repaint(MOUSETRAP, { w: "#d8b04a" }),
    grown(MOUSETRAP, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  relic: [
    VEG_RACK,
    repaint(VEG_RACK, { m: "#a8b0b8" }),
    repaint(VEG_RACK, { m: "#d8b04a" }),
    grown(VEG_RACK, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  legion: [
    PRESERVE_JAR,
    repaint(PRESERVE_JAR, { j: "#e8a030" }),
    repaint(PRESERVE_JAR, { j: "#6a3ab0" }),
    grown(PRESERVE_JAR, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  last: [
    CHEST_FREEZER,
    repaint(CHEST_FREEZER, { g: "#5ab0f0" }),
    repaint(CHEST_FREEZER, { g: "#ffd166" }),
    grown(CHEST_FREEZER, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  crumb: [
    COMPOST_BAY,
    repaint(COMPOST_BAY, { n: "#5a4030" }),
    repaint(COMPOST_BAY, { n: "#3a2a1a" }),
    grown(COMPOST_BAY, ["..y..", ".yly.", "..y.."], { y: "#ffd166", l: "#fff4c0" }),
  ],
  guest: [
    WORM,
    repaint(WORM, { p: "#c88a8a", l: "#e8b8b0" }),
    repaint(WORM, { p: "#f0c060", l: "#fff0b0" }),
    WORM_4,
  ],
  grace: [
    WET_SACK,
    repaint(WET_SACK, { s: "#7a8a5a", r: "#5a6a42" }),
    repaint(WET_SACK, { s: "#5a8a5a", r: "#3a6a42", d: "#a8e8f0" }),
    WET_SACK_4,
  ],
  feast: [
    FAIRY_RING,
    repaint(FAIRY_RING, { r: "#a060c0" }),
    repaint(FAIRY_RING, { r: "#40c0a8", c: "#c8fff0", w: "#ffffff" }),
    FAIRY_RING_4,
  ],
  house: [
    THREAD_KNOT,
    repaint(THREAD_KNOT, { t: "#c8e8e0" }),
    repaint(THREAD_KNOT, { t: "#a8f0d8", w: "#fff4c0" }),
    THREAD_KNOT_4,
  ],
  whole: [
    SIXTH_POTATO,
    repaint(SIXTH_POTATO, { p: "#a89058" }),
    repaint(SIXTH_POTATO, { g: "#c8f0a0", p: "#c8a060", l: "#f0d090" }),
    SIXTH_POTATO_4,
  ],
  loam: [
    GAS_RING,
    repaint(GAS_RING, { f: "#a8e0ff", b: "#5a8af0" }),
    repaint(GAS_RING, { f: "#ffd166", b: "#ff7a3a" }),
    GAS_RING_4,
  ],
  drone: [
    SCULLION,
    repaint(SCULLION, { a: "#c8c8e0" }),
    repaint(SCULLION, { a: "#f0e0a0", h: "#ffd166" }),
    SCULLION_4,
  ],
  moss: [
    POT_LID,
    repaint(POT_LID, { s: "#c08a5a", l: "#f0c8a0", d: "#7a4a2a" }),
    repaint(POT_LID, { s: "#a06a4a", l: "#e0a878", d: "#5a3020" }),
    POT_LID_4,
  ],
  mire: [
    STOCKPOT,
    repaint(STOCKPOT, { b: "#c8903a", y: "#ffd166" }),
    repaint(STOCKPOT, { b: "#e0a040", y: "#fff4c0", s: "#c9a24a", l: "#fff0b0", d: "#8a6a2a" }),
    STOCKPOT_4,
  ],
  kinship: [
    RECIPE_BOOK,
    repaint(RECIPE_BOOK, { c: "#2a4a7a" }),
    repaint(RECIPE_BOOK, { c: "#c9a24a", p: "#fff4c0" }),
    RECIPE_BOOK_4,
  ],
  sixth: [
    SEVENTH_POTATO,
    repaint(SEVENTH_POTATO, { w: "#fff4d8", l: "#f0dca8" }),
    repaint(SEVENTH_POTATO, { w: "#ffd98a", l: "#e0a040" }),
    SEVENTH_POTATO_4,
  ],
  flame: [
    PLACE_SETTING,
    repaint(PLACE_SETTING, { p: "#b87a7a" }),
    repaint(PLACE_SETTING, { p: "#c9a24a", f: "#ffd166", s: "#e0a040" }),
    PLACE_SETTING_4,
  ],
  servant: [
    WAITER,
    repaint(WAITER, { b: "#3a2a4a" }),
    repaint(WAITER, { b: "#6a2a3a", s: "#ffd166", l: "#fff4c0", d: "#c9a24a" }),
    WAITER_4,
  ],
  lid: [
    CANDLE,
    repaint(CANDLE, { s: "#c9a24a" }),
    repaint(CANDLE, { s: "#ffd166", w: "#fff4c0" }),
    CANDLE_4,
  ],
  broth: [
    GRAVY_BOAT,
    repaint(GRAVY_BOAT, { s: "#d8c8a8" }),
    repaint(GRAVY_BOAT, { s: "#ffd166", l: "#fff4c0", d: "#c9a24a" }),
    GRAVY_BOAT_4,
  ],
  heirs: [
    PORTRAIT,
    repaint(PORTRAIT, { y: "#c9a24a", d: "#3a2a30" }),
    repaint(PORTRAIT, { y: "#ffd166", b: "#6a2a4a" }),
    PORTRAIT_4,
  ],
  seventh: [
    DINNER,
    repaint(DINNER, { b: "#b87a7a", p: "#c88a4a" }),
    repaint(DINNER, { b: "#c9a24a", p: "#e8a848", l: "#ffd98a" }),
    DINNER_4,
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

/** A sprouting eye in warm black dirt. */
export const CUT_SPROUT: Art = {
  rows: [
    "..........t..........t..........",
    "...........t........t...........",
    "...t........t......t.........t..",
    "....t........t....t.........t...",
    ".....t...g....t..t....g....t....",
    "......t.ggg....tt....ggg..t.....",
    "........ggg....tt....ggg........",
    ".........g.....tt.....g.........",
    ".........gg..kkkkkk..gg.........",
    "..........ggkkppppkkgg..........",
    "...........kpplllppk............",
    "..........kpplleelppk...........",
    "..........kpplleelppk...........",
    "...........kppllllpk............",
    "............kkppppkk............",
    "..............kkkk..............",
    "................................",
  ],
  palette: { t: "#d8e8d0", g: "#c8f0a0", k: "#2a1a12", p: "#8a6a48", l: "#b09068", e: "#ff9a4a" },
};

/** A kitchen window at night, seen from the heap. */
export const CUT_WINDOW: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkbbbbbbbbbbbbbbbbbbkkkkk",
    "kkkkkbyyyyyybyyyyyyyybbkkkkk",
    "kkkkkbyyyyyybyyyyyyyybbkkkkk",
    "kkkkkbyyyyyybyyyddyyybbkkkkk",
    "kkkkkbyyyyyybyyyddyyybbkkkkk",
    "kkkkkbbbbbbbbbbbddbbbbbkkkkk",
    "kkkkkbyyyyyybyyyddyyybbkkkkk",
    "kkkkkbyyyyyybyyddddyybbkkkkk",
    "kkkkkbyyyyyybyyyddyyybbkkkkk",
    "kkkkkbyyyyyybyyyyyyyybbkkkkk",
    "kkkkkbbbbbbbbbbbbbbbbbbkkkkk",
    "kkkbbbbbbbbbbbbbbbbbbbbbbkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#1e1a24", b: "#4a3424", y: "#ffe0a0", d: "#6a4a30" },
};

/** The plate, from above, and the fork. */
export const CUT_PLATE: Art = {
  rows: [
    ".............kkkkkkkk.............",
    ".........kkkkwwwwwwwwkkkk.........",
    ".......kkwwwwwwwwwwwwwwwwkk.......",
    ".....kkwwwbbbbbbbbbbbbbbwwwkk.....",
    "....kwwwbbwwwwwwwwwwwwwwbbwwwk....",
    "...kwwbbwwwwwwppppppwwwwwwbbwwk...",
    "...kwwbwwwwwppllllpppwwwwwwbwwk...",
    "...kwbwwwwwpplleelpppdwwwwwwbwk...",
    "...kwbwwwwwpplllllppddwwwwwwbwk...",
    "...kwbwwwwwwppppppddddwwwwwwbwk...",
    "...kwwbwwwwwwwppddddwwwwwwwbwwk...",
    "...kwwbbwwwwwwwwwwwwwwwwwwbbwwk...",
    "....kwwwbbwwwwwwwwwwwwwwbbwwwk....",
    ".....kkwwwbbbbbbbbbbbbbbwwwkk.....",
    ".......kkwwwwwwwwwwwwwwwwkk.......",
    ".........kkkkwwwwwwwwkkkk.........",
    ".............kkkkkkkk.............",
  ],
  palette: { k: "#2a1a22", w: "#fff8ec", b: "#7a90b8", p: "#d09858", l: "#ecc488", d: "#a06c38", e: "#5a3418" },
};
