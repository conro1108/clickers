/** Every piece of pixel art in the game, as char grids. */

import type { Art } from "./pixel.js";

const K = "#402e3a"; // shared outline ink

// Palettes are per-art and deliberately tiny; these are the recurring members.
const PUPPY = { p: "#c98b4b", l: "#e2b077", d: "#95602c" };
const METAL = { m: "#a8b0b8", s: "#7f8891", g: "#bfe3ef" };

// --- UI icons — 12x12 ---

export const ICONS = {
  // Head-on, and it is all ears.
  puppy: {
    rows: [
      "..kk......kk..",
      ".kppk....kppk.",
      ".kpipk..kpipk.",
      ".kpiipkkpiipk.",
      ".kpiippppiipk.",
      "kkppppppppppkk",
      "kppppppppppppk",
      "kppnkppppnkppk",
      "kppkkppppkkppk",
      "kppppwkkwppppk",
      "kpppwwwwwwpppk",
      ".kppwwkkwwppk.",
      ".kkppwwwwppkk.",
      "...kkkkkkkk...",
    ],
    palette: { k: K, ...PUPPY, w: "#f2e3c8", i: "#e8929c", n: "#ffffff" },
  },

  // The Grow tab. A paw, because the thing you are growing has feet.
  paw: {
    rows: [
      "............",
      "..kk....kk..",
      ".kppk..kppk.",
      ".kppk..kppk.",
      "..kk....kk..",
      "kk........kk",
      "kppk....kppk",
      ".kk..kk..kk.",
      "...kppppk...",
      "..kpppppppk.",
      "..kpppppppk.",
      "...kkkkkk...",
    ],
    palette: { k: K, p: "#c98b4b" },
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

  // The upkeep tab.
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

// --- The hoard — what a pile of puppies turns into as it stops being a pile ---

/** The puppy itself, everywhere it appears loose: carried, whistled, heaped, and riding down the pipeline. */
export const PUPPY_SPRITE: Art = {
  rows: [
    "k.k....",
    "klkl...",
    "kkeppdk",
    "kpppddk",
    ".kkkkk.",
  ],
  palette: { k: K, ...PUPPY, e: K },
};

/** The pack — one puppy, four poses, seen head-on. */
const PUP_HEAD = [
  ".k.......k.",
  "klk.....klk",
  "kllk...kllk",
  "kllkkkkkllk",
  ".kpppppppk.",
  "kpkkpppkkpk",
  "kpwkpppwkpk",
  "kppmmmmmppk",
  ".kpmmkmmpk.",
  "..kkkkkkk..",
];

/** Standing, and the same thing mid-stride. Two frames is a trot. */
const PUP_TROT_ROWS = [
  [...PUP_HEAD, "k.kpppppk..", "kkkpppppppk", ".klllllllk.", ".kkkkkkkkk.", "..dd...dd.."],
  [...PUP_HEAD, "k.kpppppk..", "kkkpppppppk", ".klllllllk.", ".kkkkkkkkk.", ".dd.....dd."],
];

/** The same head with the ears pinned back, for the one thing out here that ever hurries. */
const PUP_RUN_HEAD = [
  "...........",
  ".k.......k.",
  "klkkkkkkklk",
  "kllkkkkkllk",
  ...PUP_HEAD.slice(4),
];

/** Flat out: paws thrown wide, then gathered under it, with the tongue out. */
const PUP_RUN_ROWS = [
  [...PUP_RUN_HEAD, "k.kptpppk..", "kkkpppppppk", ".klllllllk.", ".kkkkkkkkk.", "d.........d"],
  [...PUP_RUN_HEAD, "k.kptpppk..", "kkkpppppppk", ".klllllllk.", ".kkkkkkkkk.", "...dd.dd..."],
];

/** Sat down, with the tail down and up. */
const PUP_SIT_ROWS = [
  [...PUP_HEAD, "k.kpppppk..", "kkkpppppppk", ".kpllllllpk", "..kkkkkkk.."],
  [...PUP_HEAD, "kk.kpppppk.", "k.kpppppppk", ".kpllllllpk", "..kkkkkkk.."],
];

/** Down but awake: the loaf. */
const PUP_LOAF_ROWS = [
  ...PUP_HEAD,
  ".kppppppppk",
  "kplllllllpk",
  ".kkddkddkk.",
];

/** Asleep: on its side, curled, eyes shut. */
const PUP_SLEEP_ROWS = [
  "....kkkkkkk..",
  "..kkpppkllkk.",
  ".kllppppppppk",
  "kpppppppkkppk",
  "kpppppppppmmk",
  "kllllllllmmmk",
  ".kkkkkkkkkkk.",
  "..dd..dd.....",
];

/** The `Z` over a sleeping one. */
export const ZZZ: Art = {
  rows: ["zzzz", "..z.", ".z..", "zzzz"],
  palette: { z: "#f6f2e6" },
};

/** Just off the slide, and not full size yet. */
const PUP_NEW_ROWS = [
  ".k.....k.",
  "klk...klk",
  "kllkkkllk",
  ".kpppppk.",
  "kpkpppkpk",
  "kpppppppk",
  "kpmmmmmpk",
  ".kmmkmmk.",
  ".kpppppk.",
  ".kkkkkkk.",
  "..d...d..",
];

/** Three coats, so a yard full of dogs isn't full of copies of one dog. */
const COATS: readonly Record<string, string>[] = [
  { p: "#c98b4b", l: "#e2b077", d: "#95602c" },
  { p: "#ddb987", l: "#f2e0c0", d: "#a88a5e" },
  { p: "#9a6a44", l: "#c49a70", d: "#6b452a" },
];

export const PACK_COATS = COATS.length;

/** The same grid, right to left. Free, and exact — no transform at blit time. */
function flip(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(""));
}

function pup(rows: readonly string[], coat: number, left: boolean): Art {
  return {
    rows: left ? flip(rows) : [...rows],
    // Muzzle `m`, eye glint `w` and tongue `t` stay put across coats: the pale of a face carries the expression.
    palette: { k: K, w: "#fdf6ea", m: "#f4e6cc", t: "#f2718c", ...COATS[coat] },
  };
}

/** Which picture goes with what a dog is doing. */
export const POSE = {
  trot: 0,
  trotB: 1,
  sit: 2,
  sitB: 3,
  loaf: 4,
  newborn: 5,
  sleep: 6,
  run: 7,
  runB: 8,
} as const;

/** Every pose the yard can draw, built once at module load. */
export const PACK_POSES: readonly (readonly (readonly Art[])[])[] = COATS.map((_, coat) =>
  [false, true].map((left) => [
    pup(PUP_TROT_ROWS[0]!, coat, left),
    pup(PUP_TROT_ROWS[1]!, coat, left),
    pup(PUP_SIT_ROWS[0]!, coat, left),
    pup(PUP_SIT_ROWS[1]!, coat, left),
    pup(PUP_LOAF_ROWS, coat, left),
    pup(PUP_NEW_ROWS, coat, left),
    pup(PUP_SLEEP_ROWS, coat, left),
    pup(PUP_RUN_ROWS[0]!, coat, left),
    pup(PUP_RUN_ROWS[1]!, coat, left),
  ]),
);

/** The yard's small mercies. */
export const BOWL: Art = {
  rows: [
    ".kkkkkk.",
    "kbwwwwbk",
    "kbbwwbbk",
    ".kbbbbk.",
    "..kkkk..",
  ],
  palette: { k: K, b: "#4f9ec9", w: "#bfe8f4" },
};

/** The same bowl in the other colour, so a pair of them isn't a mirror. */
export const BOWL_RED: Art = {
  rows: BOWL.rows,
  palette: { k: K, b: "#d9614f", w: "#f6c9b0" },
};

/** A ball. It is chased. */
export const BALL: Art = {
  rows: [
    ".kkk.",
    "kbwbk",
    "kbbbk",
    ".kkk.",
  ],
  palette: { k: K, b: "#e0b23c", w: "#fff0b8" },
};

/** Four flags' worth of colour, cycled along the run. */
/** Repeating middle is generated; writing the tower row by row would be more typo than art. */
function stack(cap: string[], body: string[], reps: number, base: string[]): string[] {
  const rows = [...cap];
  for (let i = 0; i < reps; i++) rows.push(...body);
  rows.push(...base);
  return rows;
}

// --- Producers — one silhouette per rung of the ladder ---

export const KENNEL_HAND: Art = {
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

/** A transport van, and pointedly not a tractor. */
export const VAN: Art = {
  rows: [
    "..kkkkkkkkkkkk....",
    ".kbbbbbbbbbbbbk...",
    ".kbbbbbbbbbbbbkk..",
    ".kbbbvvbbvvbbkggk.",
    ".kbbbvvbbvvbbkggkk",
    ".kbbbbbbbbbbbkbbbk",
    ".kbbbbbbbbbbbbbbbk",
    ".kkkkkkkkkkkkkkkkk",
    "...kwwk......kwwk.",
    "..kwwwwk....kwwwwk",
    "..kwwwwk....kwwwwk",
    "...kwwk......kwwk.",
  ],
  palette: { k: K, b: "#4f8f3a", g: "#bfe3ef", w: "#4d4148", v: "#2f5f26" },
};

/** The Grooming Rig: a machine, not a vehicle. */
export const GROOMER: Art = {
  rows: [
    "..kkkkkkk....",
    "..kmmmmmk....",
    "...kmmmk.....",
    "....kmk......",
    ".kkkkkkkkkk..",
    ".kbbbbbbbbk..",
    ".kbggggggbk..",
    ".kbgddddgbk..",
    ".kbgddddgbk..",
    ".kbggggggbk..",
    ".kbbbbbbbbk..",
    ".kbllbbllbk..",
    ".kbbbbbbbbkk.",
    ".kkkkkkkkkkcc",
    "..kk....kk...",
  ],
  palette: { k: K, b: "#c93f34", g: "#bfe3ef", d: "#8f2a22", m: "#7f8891", l: "#e8dcc8", c: "#e8dcc8" },
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

export const KIBBLE: Art = {
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

export const ZEPPELIN: Art = {
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

/** A cooling tower: open mouth with the shaft dark in it, a waist, a lit core, a hazard band round the bottom. */
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

/** The Orbital Kennel: a pressurised habitat module, not a satellite. */
export const ORBITAL_KENNEL: Art = {
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
  palette: { k: K, b: "#4a7fa5", c: "#bfe3ef", g: "#c98b4b", m: "#a8b0b8", y: "#ffe08a" },
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

// --- Above the fold — the tiers that work the nest you're inside ---
// Drawn against the nest's creams and tans, so cool and hard-edged where everything else in here is soft.

/** A press standing over the fold of hem it has worked open. */
export const HEM_HOLLOW: Art = {
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
  palette: { k: K, m: "#8d959d", d: "#4a3a44", s: "#8a7a86", w: "#f4ecd8" },
};

/** A wellhead with the shaft running off the bottom of the world. */
export const DOWN_WELL: Art = {
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

/** One of the other yous. */
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

/** An eye, opened. */
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

/** Two benches cut into a face of packed fleece, with the undercut under them. */
export const FLEECE_FACE: Art = {
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

/** A tapped seam. */
export const SEAM_MAIN: Art = {
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

/** The warm spot, opened at the core and propped so it can't close again. */
export const WARM_HEART: Art = {
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

/** The last rung, curled where the sun used to be. */
export const SECOND_CHIHUAHUA: Art = {
  rows: [
    "...k.....k......",
    "..klk...klk.....",
    "..kllkkkkllk....",
    ".kkppppppppkk...",
    "kppkppppkpppppk.",
    "kppppppppppppppk",
    "kplwwlpppppppppk",
    ".kkwkwppppppppdk",
    "..kkppppppppppdk",
    "...kppppppppppdk",
    "...kppppppdddppk",
    "....kkppdddppkk.",
    "......kkkkkkk...",
  ],
  palette: { k: K, ...PUPPY, w: "#f2e3c8" },
};

/** One of the shaft crew. */
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

/** The hoist cage, empty. */
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
// Every tier has three `producer_mult` upgrades (`<id>_x2a`, `<id>_x2b`, `<id>_x2c`), so each one gets four marks: as bought, then one per upgrade.

/** The same grid in a different finish. */
function repaint(art: Art, palette: Record<string, string>): Art {
  return { rows: art.rows, palette: { ...art.palette, ...palette } };
}

/** Straw Bedding: a bigger dog, and twice as much under it. */
/** Underfloor Heating: the warm comes up through the straw. */
/** Turbo Diesel: the stack is the whole joke, so it goes on the roof. */
const VAN_2: Art = {
  rows: [
    "..........k.......",
    "..........k.......",
    "..kkkkkkkkkkkk....",
    ".kbbbbbbbbbbbbk...",
    ".kbbbbbbbbbbbbkk..",
    ".kbbbvvbbvvbbkggk.",
    ".kbbbvvbbvvbbkggkk",
    ".kbbbbbbbbbbbkbbbk",
    ".kbbbbbbbbbbbbbbbk",
    ".kkkkkkkkkkkkkkkkk",
    "...kwwk......kwwk.",
    "..kwwwwk....kwwwwk",
    "..kwwwwk....kwwwwk",
    "...kwwk......kwwk.",
  ],
  palette: VAN.palette,
};

/** Autosteer: a beacon on the roof, and the paint job of something expensive. */
const VAN_3: Art = {
  rows: [
    "..........k.......",
    "..........k.y.....",
    "..kkkkkkkkkkkk....",
    ".kbbbbbbbbbbbbk...",
    ".kbbbbbbbbbbbbkk..",
    ".kbbbvvbbvvbbkggk.",
    ".kbbbvvbbvvbbkggkk",
    ".kbbbbbbbbbbbkbbbk",
    ".kbbbbbbbbbbbbbbbk",
    ".kkkkkkkkkkkkkkkkk",
    "...kwwk......kwwk.",
    "..kwwwwk....kwwwwk",
    "..kwwwwk....kwwwwk",
    "...kwwk......kwwk.",
  ],
  palette: { ...VAN.palette, b: "#c99a34", v: "#8a6a1c", y: "#e05a3c" },
};

/** Wider Head: the delivery chute swung out over the yard. */
const GROOMER_2: Art = {
  rows: [
    "..kkkkkkk.kk.",
    "..kmmmmmk.km.",
    "...kmmmk..km.",
    "....kmk...km.",
    ".kkkkkkkkkkk.",
    ".kbbbbbbbbbk.",
    ".kbgggggggbk.",
    ".kbgdddddgbk.",
    ".kbgdddddgbk.",
    ".kbgggggggbk.",
    ".kbbbbbbbbbk.",
    ".kbllbbbllbk.",
    ".kbbbbbbbbbkk",
    ".kkkkkkkkkkcc",
    "..kk.....kk..",
  ],
  palette: GROOMER.palette,
};

/** Night Shift Cab: work lights, on at any hour. */
const GROOMER_3: Art = {
  rows: [
    "..kkkkkkk.kk.",
    "..kmmmmmk.km.",
    "...kmmmk..km.",
    "....kmk...km.",
    ".kkkkkkkkkkk.",
    ".kbyyyyyyybk.",
    ".kbgggggggbk.",
    ".kbgdddddgbk.",
    ".kbgdddddgbk.",
    ".kbgggggggbk.",
    ".kbyyyyyyybk.",
    ".kbllbbbllbk.",
    ".kbbbbbbbbbkk",
    ".kkkkkkkkkkcc",
    "..kk.....kk..",
  ],
  palette: { ...GROOMER.palette, y: "#ffe08a" },
};

/** Twin Extruders, then Continuous Flow: the flare stack gets serious. */
const KIBBLE_2: Art = {
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
  palette: { ...KIBBLE.palette, f: "#f0913c" },
};

const KIBBLE_3: Art = {
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
  palette: { ...KIBBLE.palette, f: "#f0913c", b: "#ffe08a" },
};

/** Express Lifts, then Kennel Telemetry: more lit floors, then more floors. */
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

/** Helium Refit, then a Jet Stream Permit: it gets up, then it gets up there. */
const ZEPPELIN_2: Art = {
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
  palette: { ...ZEPPELIN.palette, c: "#b9c3cc" },
};

const ZEPPELIN_3: Art = {
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
  palette: { ...ZEPPELIN.palette, c: "#8f9aa5", z: "#ffe066" },
};

// --- The fourth marks — what a hundred of something turns into ---

/** Show Lineage: it is twice the dog, it is sitting on twice the straw, and it is wearing the rosette. */
/** Equity Stake: a hat, a good coat, and gold on the lapels. Part owner. */
const KENNEL_HAND_4: Art = {
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

/** Tracked Chassis: twin stacks, a beacon, and it runs on tracks now. */
const VAN_4: Art = {
  rows: [
    "..........k.k.....",
    "..........k.k.....",
    ".kkkkkkkkkkkkkky..",
    ".kbbbbbbbbbbbbk...",
    ".kbbbbbbbbbbbbkk..",
    ".kbbbvvbbvvbbkggk.",
    ".kbbbvvbbvvbbkggkk",
    ".kbbbbbbbbbbbkbbbk",
    ".kbbbbbbbbbbbbbbbk",
    ".kkkkkkkkkkkkkkkkk",
    "..kwwwwk....kwwwwk",
    "..kwwwwk....kwwwwk",
    "..kwwwwk....kwwwwk",
    "...kkkk......kkkk.",
  ],
  // Dark green, not near-black: at eighteen pixels a body with no value range reads as a burnt-out hulk.
  palette: { ...VAN.palette, b: "#2f6b46", v: "#1c4a2c", g: "#bfe3ef", y: "#e05a3c", w: "#3a3038" },
};

/** Twin Drums: a second delivery chute, so it never has to stop to empty. */
const GROOMER_4: Art = {
  rows: [
    ".kkkkkkkkk.kk",
    ".kmmmmmmmk.km",
    "..kmmmmmk..km",
    "...kmmmk...km",
    "kkkkkkkkkkkkk",
    "kbyyyyyyyyybk",
    "kbggggggggggk",
    "kbgddddgddgbk",
    "kbgddddgddgbk",
    "kbggggggggggk",
    "kbyyyyyyyyybk",
    "kbllbbbbbllbk",
    "kbbbbbbbbbbkk",
    "kkkkkkkkkkkcc",
    ".kk.......kk.",
  ],
  palette: { ...GROOMER.palette, b: "#8f2a22", d: "#5f1c16", y: "#ffe08a", c: "#fff4e0" },
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
const KIBBLE_4: Art = {
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
  palette: { ...KIBBLE.palette, m: "#c6cdd4", f: "#f0913c", b: "#ffe08a", g: "#8d959d" },
};

/** Sky Lobby: tallest on the property, with an observation seam halfway up that overhangs the shaft. */
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
const ZEPPELIN_4: Art = {
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
  palette: { ...ZEPPELIN.palette, c: "#5a6570", z: "#ffe066", a: "#7fb4d8" },
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

/** Lagrange Station: the place the kennels dock at — a second canopy, a spine between them, and wings. */
const ORBITAL_KENNEL_4: Art = {
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
  palette: { k: K, b: "#e0c04a", c: "#d8f0f8", g: "#f0c68c", m: "#cfd6dc", y: "#fff0b8" },
};

/** Event Horizon Lease: it has a jet now, and the jet points at your mill. */
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

/** It Stops Minding: the hem has stopped closing back up. It just gives. */
const HEM_HOLLOW_4: Art = {
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
  palette: { k: K, m: "#e2e8ee", d: "#8a7a86", w: "#fffaf0" },
};

/** Core Breach: a derrick over the wellhead, and it's venting flame. */
const DOWN_WELL_4: Art = {
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
const LINT_HAND_4: Art = {
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
const FLEECE_FACE_4: Art = {
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

/** The Whole Seam: three clamps on a seam that has split to feed them. */
const SEAM_MAIN_4: Art = {
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

/** It Was Always Warm: the hollow has stopped being dark. Something in it is lit. */
const WARM_HEART_4: Art = {
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

/** It's Awake: the eyes opened. Nothing else about the sprite had to change. */
const SECOND_CHIHUAHUA_4: Art = {
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


// --- The building — what the mill looks like once it's a shed and not a field ---
// Cages, hanging lamps and the kit of a cutaway: cool wire greys and institutional teals, so the tan of a dog is the warm thing in the room.

const WIRE = "#c4ccd2";
const CAGE_BACK = "#5f6f74";
const STRAW = "#e6c76a";

/** One chihuahua in a wire cage, seen through the door. */
export const CAGE: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kwwwwwwwwwwk",
    "kwiiiiiiiiwk",
    "kwigiiiiigwk",
    "kwigggigggwk",
    "kwiigggggiwk",
    "kwigsgggsgwk",
    "kwiiglllgiwk",
    "kwffffffffwk",
    "kkkkkkkkkkkk",
  ],
  palette: { k: K, w: WIRE, i: CAGE_BACK, g: "#c98b4b", s: K, l: "#f4e6cc", f: "#8f8a83" },
};

/** Straw Bedding: something under it. */
const CAGE_2: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kwwwwwwwwwwk",
    "kwiiiiiiiiwk",
    "kwigiiiiigwk",
    "kwigggigggwk",
    "kwiigggggiwk",
    "kwigsgggsgwk",
    "kwiyglllgywk",
    "kwyyyyyyyywk",
    "kkkkkkkkkkkk",
  ],
  palette: { k: K, w: WIRE, i: CAGE_BACK, g: "#c98b4b", s: K, l: "#f4e6cc", y: STRAW },
};

/** Underfloor Heating: the tray glows. */
const CAGE_3: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kwwwwwwwwwwk",
    "kwiiiiiiiiwk",
    "kwigiiiiigwk",
    "kwigggigggwk",
    "kwiigggggiwk",
    "kwigsgggsgwk",
    "kwiyglllgywk",
    "kwyyyyyyyywk",
    "kkooooooookk",
  ],
  palette: { k: K, w: WIRE, i: "#6b6f6a", g: "#d69a58", s: K, l: "#f4e6cc", y: "#f0d27a", o: "#ff9a4a" },
};

/** Show Lineage: a cushion, a rosette on the door, and a bow. */
const CAGE_4: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kaaaaaaaaaak",
    "kaiiiiiirrak",
    "kaigiiiirgak",
    "kaigggbgggak",
    "kaiigggggiak",
    "kaigsgggsgak",
    "kaiiglllgiak",
    "kaccccccccak",
    "kkkkkkkkkkkk",
  ],
  palette: {
    k: K,
    a: "#e0c04a",
    i: "#4a5a70",
    g: "#ddb987",
    s: K,
    l: "#f4e6cc",
    b: "#f2718c",
    r: "#e8405a",
    c: "#c96a8a",
  },
};

/** Trampled: the door hangs off and nobody's home. */
export const CAGE_BROKEN: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kwwwwwwwwwwk",
    "kwiiiiiiiiik",
    "kwiiiiiiii.k",
    "kwiiiiiii.wk",
    "kwiiiiii.wwk",
    "kwiiiiii.wik",
    "kwiiiiii.iik",
    "kwddddddddwk",
    "kkkkkkkkkkkk",
  ],
  palette: { k: K, w: "#8a9298", i: "#3e4a4e", d: "#6b6458" },
};

/** A heat lamp on a cord, throwing red onto whatever's under it. */
export const LAMP_HANG: Art = {
  rows: [
    "....k....",
    "....k....",
    "...kmk...",
    "..kmmmk..",
    ".kmmmmmk.",
    "kmmmmmmmk",
    "kkkkkkkkk",
    ".krrrrrk.",
    "..rrrrr..",
  ],
  palette: { k: K, m: "#8f9aa3", r: "#ff6a3d" },
};

/** Ceramic Bulbs: a white shade, an orange bulb. */
const LAMP_HANG_2 = repaint(LAMP_HANG, { m: "#e2e8ee", r: "#ff8c3a" });

/** Thermostats: a green light on the shade. */
const LAMP_HANG_3: Art = {
  rows: [
    "....k....",
    "....k....",
    "...kmk...",
    "..kmmmk..",
    ".kmmmmmk.",
    "kmmmemmmk",
    "kkkkkkkkk",
    ".krrrrrk.",
    "..rrrrr..",
  ],
  palette: { k: K, m: "#e2e8ee", r: "#ff8c3a", e: "#7fe08a" },
};

/** Whole-Yard Radiant: a bar across the ceiling instead of a bulb. */
const LAMP_HANG_4: Art = {
  rows: [
    ".......k.......",
    ".......k.......",
    "kkkkkkkkkkkkkkk",
    "kmmmmmmemmmmmmk",
    "kkkkkkkkkkkkkkk",
    ".rrrrrrrrrrrrr.",
    "..rrrrrrrrrrr..",
  ],
  palette: { k: K, m: "#e2e8ee", r: "#ff9a4a", e: "#7fe08a" },
};

/** A wall floodlight over the lot. */
export const FLOOD: Art = {
  rows: [
    "kkkk..",
    "kyyykk",
    "kyyyk.",
    "kkkk..",
    "..kk..",
  ],
  palette: { k: K, y: "#fff0b8" },
};

/** A skip, for the corner of the lot. */
export const SKIP: Art = {
  rows: [
    "kkkkkkkkkkkkkk",
    "kddddddddddddk",
    ".kggggggggggk.",
    ".kgggglgggggk.",
    ".kggggggggggk.",
    ".kggggggggggk.",
    ".kkkkkkkkkkkk.",
    "..kk......kk..",
  ],
  palette: { k: K, d: "#3f6b5e", g: "#4f8f7a", l: "#7fbfa8" },
};

/** A stack of pallets. */
export const PALLETS: Art = {
  rows: [
    "kkkkkkkkkkkk",
    "kbbbbbbbbbbk",
    "k.kkkkkkkk.k",
    "kbbbbbbbbbbk",
    "k.kkkkkkkk.k",
    "kbbbbbbbbbbk",
    "kkkkkkkkkkkk",
  ],
  palette: { k: K, b: "#b8965a" },
};

/** A tyre, on its side. */
export const TYRE: Art = {
  rows: [
    ".kkkkkk.",
    "kddddddk",
    "kdkkkkdk",
    "kddddddk",
    ".kkkkkk.",
  ],
  palette: { k: K, d: "#4d4148" },
};

/** A sack of kibble, for the stack by the lift. */
export const SACK: Art = {
  rows: [
    "..kkk..",
    ".kbbbk.",
    "kbbbbbk",
    "kbblbbk",
    "kbbbbbk",
    "kbbbbbk",
    ".kkkkk.",
  ],
  palette: { k: K, b: "#d8b070", l: "#f2e0c0" },
};

/** A ¾-height desk with a phone on it, for whoever is on the ground floor. */
export const DESK: Art = {
  rows: [
    "....kkk.......",
    "....krk.......",
    "kkkkkkkkkkkkkk",
    "kbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkk",
    ".k..........k.",
    ".k..........k.",
  ],
  palette: { k: K, b: "#8a6a4a", r: "#e8405a" },
};

/** A music note, for a whistle. */
export const NOTE: Art = {
  rows: [
    "...nn",
    "...nn",
    "...n.",
    "...n.",
    ".nnn.",
    "nnnn.",
    ".nn..",
  ],
  palette: { n: "#fff0f4" },
};

/** The word on the roof. 3x5, and only the letters it needs. */
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  P: ["###", "#.#", "###", "#..", "#.."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  Y: ["#.#", "#.#", "###", ".#.", ".#."],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  L: ["#..", "#..", "#..", "#..", "###"],
  " ": ["...", "...", "...", "...", "..."],
};

// --- Beyond — the dream the Second Chihuahua is having ---
// Moonlit and cool: everything out here is the colour of a lawn at three in the morning.

const DREAM_K = "#3a3a6a";

/** A kennel the way a dog remembers one: pale, and with the door always open. */
export const ECHO_KENNEL: Art = {
  rows: [
    "....kkk....",
    "...kaaak...",
    "..kaaaaak..",
    ".kaaaaaaak.",
    "kkkkkkkkkkk",
    ".kbbbbbbbk.",
    ".kbbkkkbbk.",
    ".kbknnnkbk.",
    ".kbknnnkbk.",
    ".kkkkkkkkk.",
  ],
  palette: { k: DREAM_K, a: "#9fb4e6", b: "#c8d6f4", n: "#141430" },
};

const ECHO_KENNEL_4: Art = {
  rows: [
    "....kkk....",
    "...kaaak...",
    "..kaaaaak..",
    ".kkkkkkkkk.",
    ".kbbbybbbk.",
    ".kbbbbbbbk.",
    "kkkkkkkkkkk",
    ".kbbkkkbbk.",
    ".kbknnnkbk.",
    ".kbknnnkbk.",
    ".kkkkkkkkk.",
  ],
  palette: { ...ECHO_KENNEL.palette, y: "#ffe9a8" },
};

/** Somebody with a ball. Seen from knee height, which is mostly legs. */
export const THROWER: Art = {
  rows: [
    ".....o.",
    "..hh.k.",
    "..ff.k.",
    ".bbbbk.",
    "kbbbb..",
    ".bbbb..",
    ".bbbb..",
    ".ll.ll.",
    ".ll.ll.",
    ".ll.ll.",
    ".ll.ll.",
    ".kk.kk.",
  ],
  palette: { k: DREAM_K, o: "#ffd166", h: "#5a4060", f: "#e8c8a8", b: "#7f9fd8", l: "#4a4a80" },
};

const THROWER_4: Art = {
  rows: [
    "o.....o",
    "k.hh.k.",
    ".kffk..",
    "..bbb..",
    ".bbbbb.",
    ".bbbbb.",
    ".ll.ll.",
    ".ll.ll.",
    ".ll.ll.",
    ".ll.ll.",
    ".ll.ll.",
    ".kk.kk.",
  ],
  palette: THROWER.palette,
};

/** A tree that is mostly sticks, which is what trees are for. */
export const STICK_TREE: Art = {
  rows: [
    "...ggggg...",
    ".ggglgggg..",
    "gggggggglgg",
    "ggglggggggg",
    ".gggggggg..",
    "...gstg....",
    "....t..s...",
    "....t......",
    "....t......",
    "...ttt.....",
  ],
  palette: { g: "#3f6a7a", l: "#7fb8c8", t: "#6a4a3a", s: "#8a6a4a" },
};

const STICK_TREE_4: Art = {
  rows: [
    "..ggggggg..",
    ".ggggglgggg",
    "ggglggggggg",
    "ggggggggglg",
    "gggggggggg.",
    ".ggggggggg.",
    "...gtgt.g..",
    "....t.r....",
    "....t.r....",
    "....trrr...",
    "....trrr...",
    "...ttt.....",
  ],
  palette: { ...STICK_TREE.palette, r: "#2a2a3a" },
};

/** A puddle with the moon in it. */
export const MOON_PUDDLE: Art = {
  rows: [
    "..kkkkkkkk..",
    ".kwwwmwwwwk.",
    "kwwwmmmwwwwk",
    ".kwwwmwwwwk.",
    "..kkkkkkkk..",
  ],
  palette: { k: "#22304a", w: "#3a5a9a", m: "#e8eefc" },
};

const MOON_PUDDLE_4: Art = {
  rows: [
    "......n.....",
    "......n.....",
    "..kkkknkkk..",
    ".kwwwwnmwwk.",
    "kwwwwmnmmwwk",
    ".kwwwwnmwwk.",
    "..kkkkkkkk..",
  ],
  palette: { ...MOON_PUDDLE.palette, n: "#8a6a4a" },
};

/** A porch light on a post. Somebody always leaves it on. */
export const PORCH_LIGHT: Art = {
  rows: [
    "..kkk..",
    ".kyyyk.",
    ".kyyyk.",
    "..kkk..",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "..ppp..",
    ".kkkkk.",
  ],
  palette: { k: "#2a2238", y: "#ffe08a", p: "#5a4a5a" },
};

const PORCH_LIGHT_4: Art = {
  rows: [
    "kkk.kkk",
    "kyk.kyk",
    "kkk.kkk",
    ".ppppp.",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "...p...",
    "..ppp..",
    ".kkkkk.",
  ],
  palette: PORCH_LIGHT.palette,
};

/** The last rung: a small moon, curled up. */
export const MOON_DOG: Art = {
  rows: [
    ".k...k....",
    "kmk.kmk...",
    "kmmkmmmkk.",
    "kmemmmmmmk",
    ".kmmmmmmmk",
    "..kmmmmddk",
    "...kkkkkk.",
  ],
  palette: { k: "#6a6a9a", m: "#f4f0dc", d: "#c8c0a0", e: DREAM_K },
};

const MOON_DOG_4: Art = {
  rows: [
    "y........y",
    ".k...k....",
    "kmk.kmk.y.",
    "kmmkmmmkk.",
    "kmemmmmmmk",
    ".kmmmmmmmk",
    "..kmmmmddk",
    "y..kkkkkk.",
  ],
  palette: { ...MOON_DOG.palette, y: "#ffe9a8" },
};

// --- Origin — the first morning, the first fire, the first dog ---
// Firelit and old: ochre, ash and wolf-grey, the warmest palette in the game.

const OR_K = "#2a2018";

/** A fire somebody kept going all night, in a ring of stones. */
export const DAWN_FIRE: Art = {
  rows: [
    ".....f.....",
    "....fyf..f.",
    "..f.fyyf.f.",
    "..fyyywyff.",
    ".ffywwwyyf.",
    "..fyywyyf..",
    ".ssllllllss",
    "sggsllllsgg",
    ".sssssssss.",
  ],
  palette: { f: "#ff7a3c", y: "#ffc04a", w: "#fff4c0", l: "#6a4030", s: "#7a7068", g: "#4a4440" },
};

/** The same fire with a spit over it: the night's meat, and the reason anything came closer. */
const DAWN_FIRE_4: Art = {
  rows: [
    "k.........k",
    "k....f....k",
    "k...fyf.f.k",
    "kmmmfyyfmmk",
    "k.fyyywyf.k",
    ".ffywwwyyf.",
    "..fyywyyf..",
    ".ssllllllss",
    "sggsllllsgg",
    ".sssssssss.",
  ],
  palette: { ...DAWN_FIRE.palette, k: "#4a3020", m: "#a8503c" },
};

/** Someone in furs, with a stick for the fire. */
export const FIRE_KEEPER: Art = {
  rows: [
    "..hhh..",
    ".hfffh.",
    "..fff..",
    ".PpPpP.",
    "PpPpPps",
    "pPpPpPs",
    ".pPpPps",
    ".ppppp.",
    ".pp.pp.",
    ".ll.ll.",
    ".ll.ll.",
    ".kk.kk.",
  ],
  palette: { h: "#3a2a20", f: "#c89070", p: "#8a6a4a", P: "#b08a5a", s: "#6a4a30", l: "#5a4030", k: OR_K },
};

/** An elder in an antler crown, carrying a pup nobody else would pick up. */
const FIRE_KEEPER_4: Art = {
  rows: [
    "a.....a",
    "aa...aa",
    ".ahhha.",
    ".hfffh.",
    "..fff..",
    ".PpPpP.",
    "PpwwwpP",
    "pPwwwPp",
    ".pPpPp.",
    ".ppppp.",
    ".ll.ll.",
    ".ll.ll.",
    ".kk.kk.",
  ],
  palette: { ...FIRE_KEEPER.palette, a: "#d8c8a8", w: "#9a9aa0" },
};

/** Thrown just past the light, on purpose. */
export const BONE_PILE: Art = {
  rows: [
    "....b...b..",
    "...bBb.bBb.",
    "..b..bbb...",
    ".bBbbbBbbb.",
    "bbdbbbbdbbb",
    ".ddddddddd.",
  ],
  palette: { b: "#e8e0cc", B: "#fff8e8", d: "#5a4632" },
};

const BONE_PILE_4: Art = {
  rows: [
    "....sss....",
    "...sesse...",
    "...sssss...",
    "....s.s....",
    ".bBbbbBbbb.",
    "bbdbbbbdbbb",
    "bBbbdbbBbdb",
    ".ddddddddd.",
  ],
  palette: { ...BONE_PILE.palette, s: "#f4ecd8", e: OR_K },
};

/** Water out of the rock, into a basin of it. */
export const COLD_SPRING: Art = {
  rows: [
    "..rrr......",
    ".rRrrr.....",
    ".rrwrr.....",
    "..rwr......",
    "...w.......",
    ".rrwwwwrr..",
    "rwwWwwwwwr.",
    "rrwwwwWwrr.",
    ".rrrrrrrr..",
  ],
  palette: { r: "#6a6a70", R: "#9a9aa0", w: "#5aa0d0", W: "#e0f4ff" },
};

/** A standing stone over the spring now, with a mark cut in it. */
const COLD_SPRING_4: Art = {
  rows: [
    "..RRR......",
    "..rcr......",
    "..rrr......",
    "..rwr......",
    "...w....rr.",
    ".rrwwwwrrR.",
    "rwwWwwwwwwr",
    "rrwwwwWwwrr",
    ".rrrrrrrrr.",
  ],
  palette: { ...COLD_SPRING.palette, c: "#c8642c" },
};

/** A rock face with a dog on it in ochre, and a hand next to it to say who. */
export const PAINTED_CAVE: Art = {
  rows: [
    "...rrrrrrr...",
    ".rrRrrrrrRrr.",
    "rrrorrrrhrrrr",
    "rrooooorrrrrr",
    "rrorrorrrrrrr",
    "rrrrrrrrrrrrr",
    "rrrrrnnnrrrrr",
    "rrrrnnnnnrrrr",
    "rrrnnnnnnnrrr",
  ],
  palette: { r: "#7a6a5a", R: "#a09080", o: "#c8642c", h: "#e8a060", n: "#1e1612" },
};

/** Two dogs on the wall now, and a fire lit in the mouth of it. */
const PAINTED_CAVE_4: Art = {
  rows: [
    "...rrrrrrr...",
    ".rrRrrrrrRrr.",
    "rrrorrrorrhrr",
    "rrooooroooorr",
    "rrorrorroorrr",
    "rrrrrrrrrrrrr",
    "rrrrrnnnrrrrr",
    "rrrrnnynnrrrr",
    "rrrnnyyynnrrr",
  ],
  palette: { ...PAINTED_CAVE.palette, y: "#ffb04a" },
};

/** The last rung: a wolf, sitting, with the fire in its eye. */
export const FIRST_DOG: Art = {
  rows: [
    "..k.k.....",
    ".kgkgk....",
    "kggeggk...",
    "nggggk....",
    ".kkggk....",
    "..kgggk...",
    "..kgwggk.t",
    "..kgwgggkt",
    "..kglglgk.",
    "..kkkkkkk.",
  ],
  palette: { k: "#3a3440", g: "#8a8490", e: "#ffd166", n: "#1a1418", w: "#d8d0c8", l: "#6a6470", t: "#8a8490" },
};

/** Wearing a bead collar now, and it's had a pup. */
const FIRST_DOG_4: Art = {
  rows: [
    "..k.k........",
    ".kgkgk.......",
    "kggeggk......",
    "nggggk.......",
    ".kcbcck......",
    "..kgggk......",
    "..kgwggk.t...",
    "..kgwgggkt.k.",
    "..kglglgk.kpk",
    "..kkkkkkkkppk",
  ],
  palette: { ...FIRST_DOG.palette, c: "#c8642c", b: "#f4ecd8", p: "#c8a070" },
};

/** Four marks per tier, indexed by how many of its three upgrades you own. */
// --- Deep — under the dream, on the bottom of sleep ---
// Cold water, a long way down: everything is blue-black except what glows.

const SEA_K = "#0c2230";

/** A tennis ball that went over the fence. All of them end up here. */
export const SUNK_BALL: Art = {
  rows: [
    "..kkk..",
    ".kyyyk.",
    "kwyyyyk",
    "kywwyyk",
    "kyyywwk",
    ".kyyyk.",
    "..kkk..",
  ],
  palette: { k: SEA_K, y: "#b8d84a", w: "#eef4d0" },
};

const SUNK_BALL_4: Art = {
  rows: [
    "...ggg...",
    "..g...g..",
    ".g.kkk.g.",
    "g.kwyyk.g",
    "g.kywwk.g",
    "g.kyyyk.g",
    ".g.kkk.g.",
    "..g...g..",
    "...ggg...",
  ],
  palette: { ...SUNK_BALL.palette, g: "#d8f08a" },
};

/** Somebody in a brass helmet, on a hose that goes all the way back up to the dream. */
export const DIVER: Art = {
  rows: [
    "...h....",
    "...h....",
    "..ooo...",
    ".owwwo..",
    ".owwwo..",
    "..ooo...",
    ".sssss..",
    "ssssssn.",
    "s.sss.n.",
    "..s.s...",
    "..s.s...",
    ".bb.bb..",
  ],
  palette: { h: "#3a4a4a", o: "#c8963c", w: "#7fd0d8", s: "#4a6a6a", n: "#d8c08a", b: "#1e2a2a" },
};

const DIVER_4: Art = {
  rows: [
    "........",
    "..ooo...",
    ".owwwo.y",
    ".owwwo.k",
    "..ooo..k",
    ".sssssk.",
    "sssssss.",
    "s.sss...",
    "..s.s...",
    "..s.s...",
    "..s.s...",
    "fff.fff.",
  ],
  palette: { ...DIVER.palette, y: "#ffe08a", k: "#3a4a4a", f: "#2a6a7a" },
};

/** A chewed slipper, grown over with coral. */
export const SLIPPER_REEF: Art = {
  rows: [
    "..c....c...",
    ".cdc..cdc..",
    "..c.c.c.c..",
    "...ccccc...",
    "....cdc....",
    "..ppppppp..",
    ".pwwpppppp.",
    "ppppppppppp",
    ".kkkkkkkkk.",
  ],
  palette: { c: "#e07a8a", d: "#a84a6a", p: "#7a6a9a", w: "#d8c8e8", k: SEA_K },
};

const SLIPPER_REEF_4: Art = {
  rows: [
    ".c..c..c..c",
    "cdc.cdc.cdc",
    ".c.c.c.c.c.",
    "..ccccccc..",
    "...cdcdc...",
    "....ccc....",
    "ppppp.ppppp",
    "pwwpp.pwwpp",
    "ppppp.ppppp",
    ".kkkkkkkkk.",
  ],
  palette: SLIPPER_REEF.palette,
};

/** A kennel on the bottom, barnacled, holding a pocket of air from the bedding up top. */
export const SUNK_KENNEL: Art = {
  rows: [
    ".....kk.....",
    "....kaak....",
    "...kaaaak...",
    "..kaaaaaak..",
    ".kkkkkkkkkk.",
    ".kbxbbbbxbk.",
    ".kbbknnkbbk.",
    ".kbknnnnkbk.",
    ".kbknnnnkbk.",
    "skkkkkkkkkks",
  ],
  palette: { k: "#14303a", a: "#3a6a6a", b: "#5a7a6a", x: "#d8d0b8", n: "#050d14", s: "#a89870" },
};

const SUNK_KENNEL_4: Art = {
  rows: [
    "...gggggg...",
    "..g......g..",
    ".g...kk...g.",
    ".g..kaak..g.",
    ".g.kaaaak.g.",
    "g.kkkkkkkk.g",
    "g.kbbyybbk.g",
    "g.kbknnkbk.g",
    "g.kbknnkbk.g",
    "gskkkkkkkksg",
  ],
  palette: { ...SUNK_KENNEL.palette, g: "#a8e0f0", y: "#ffe08a" },
};

/** An anglerfish with a chihuahua's ears, and a light on a stalk. */
export const ANGLER_PUP: Art = {
  rows: [
    "......sL...",
    ".....s.....",
    "...e.s.e...",
    "..eppppe...",
    "t.pppopppp.",
    "ttpppppppw.",
    "t.ppppppkk.",
    "...pp.pp...",
  ],
  palette: { s: "#5a4a6a", L: "#c8ffe0", e: "#5a3a5a", p: "#7a5a7a", o: "#f0ffb0", t: "#4a3a5a", w: "#f4f0dc", k: "#2a1a2a" },
};

const ANGLER_PUP_4: Art = {
  rows: [
    ".L..L..L...",
    "..s.s.s....",
    "...esse....",
    "..eppppe...",
    "t.pppopppp.",
    "ttpppppppw.",
    "t.ppppppkk.",
    "...pp.pp...",
  ],
  palette: ANGLER_PUP.palette,
};

/** Curled up asleep on the bottom of everything. */
export const FOURTH_CHIHUAHUA: Art = {
  rows: [
    "..........e...",
    ".........eep..",
    "..ppppp.pppp..",
    ".pppppppppcpp.",
    "pppppppppppppn",
    "ptttpppppppp..",
    ".kkkkkkkkkkk..",
  ],
  palette: { p: "#b8a08a", e: "#8a6a5a", c: "#3a2a2a", n: "#2a1a1a", t: "#9a8470", k: "#0a1620" },
};

const FOURTH_CHIHUAHUA_4: Art = {
  rows: [
    "........oooo..",
    ".......o.yy.o.",
    "........oooo..",
    "..........o...",
    "..........e...",
    ".........eep..",
    "..ppppp.pppp..",
    ".pppppppppcpp.",
    "pppppppppppppn",
    "ptttpppppppp..",
    ".kkkkkkkkkkk..",
  ],
  palette: { ...FOURTH_CHIHUAHUA.palette, o: "#c8e8f8", y: "#ffe08a" },
};

// --- Void: the sky before there were dogs, with a dog in it ---

/** A Star Pup: a puppy-shaped hole in the dark, lit. */
export const STAR_PUP: Art = {
  rows: [
    "l.....l",
    "ll...ll",
    "lwwwwwl",
    "lwkwkwl",
    "lwwwwwl",
    ".lwnwl.",
    "..lll..",
  ],
  palette: { l: "#a8b8ff", w: "#fff4ff", k: "#2a2050", n: "#ffb0c0" },
};

const STAR_PUP_4: Art = {
  rows: [
    "l.....l....",
    "ll...ll....",
    "lwwwwwl...y",
    "lwkwkwl..y.",
    "lwwwwwllly.",
    ".lwnwlwwwl.",
    "..lllwwwwl.",
    "....l.l.l..",
  ],
  palette: { l: "#a8b8ff", w: "#fff4ff", k: "#2a2050", n: "#ffb0c0", y: "#fff4c0" },
};

/** A Sky Herder and their crook. */
export const SKY_HERDER: Art = {
  rows: [
    "c.hhh..",
    "c.hfh..",
    "c.hhh..",
    "crrrrr.",
    "rrrrrrr",
    "c.rrr.r",
    "c.rrr..",
    "c.rrr..",
    "c.r.r..",
    "c.r.r..",
    "c.k.k..",
  ],
  palette: { k: K, c: "#c8b080", h: "#2a3a6a", f: "#e0d0f0", r: "#3a4a8a" },
};

const SKY_HERDER_4: Art = {
  rows: [
    "yc.....",
    "c..hhh.",
    "c..hfh.",
    "c..hhh.",
    "crrrrr.",
    "crrrrrr",
    "c.rrr.r",
    "c.rrr..",
    "c.r.r..",
    "c.r.r..",
    "c.k.k..",
  ],
  palette: { k: K, c: "#c8b080", h: "#2a3a6a", f: "#e0d0f0", r: "#3a4a8a", y: "#fff4c0" },
};

/** A Crate Blanket, plaid, fringed, big enough for the sky. */
export const CRATE_BLANKET: Art = {
  rows: [
    "bbrbbbrbbbr",
    "rrrrrrrrrrr",
    "bbrbbbrbbbr",
    "bbrbbbrbbbr",
    "rrrrrrrrrrr",
    ".b.b.b.b.b.",
  ],
  palette: { b: "#3a3a7a", r: "#7a5ab0" },
};

const CRATE_BLANKET_4: Art = {
  rows: [
    "bbrbybrbbbr",
    "rrrrrrrrrrr",
    "bbrbbbrbybr",
    "bybbbbrbbbr",
    "rrrrrrrrrrr",
    "bbrbbbrbbbr",
    ".b.b.b.b.b.",
  ],
  palette: { b: "#3a3a7a", r: "#7a5ab0", y: "#fff4c0" },
};

/** A Litter Nebula: where puppies are before they're anywhere. */
export const LITTER_NEBULA: Art = {
  rows: [
    "...ppp.....",
    ".ppllpp.pp.",
    "ppllwlpppl.",
    "plwwllllpp.",
    ".pplllllpp.",
    "..ppppppp..",
    "....pp.....",
  ],
  palette: { p: "#8a4a8a", l: "#e0a0d0", w: "#fff4ff" },
};

const LITTER_NEBULA_4: Art = {
  rows: [
    "...ppp...p.",
    ".ppllpp.ppp",
    "ppwlwlpppl.",
    "plwwwlwlpp.",
    ".pplllwwwp.",
    "..ppppppp..",
    "...pp..pp..",
  ],
  palette: { p: "#8a4a8a", l: "#e0a0d0", w: "#fff4ff" },
};

/** A Constellation, dot to dot. It's a dog. */
export const CONSTELLATION: Art = {
  rows: [
    "y.y........",
    ".y.........",
    ".l.......y.",
    ".yllllllly.",
    ".l......l..",
    ".y......y..",
  ],
  palette: { y: "#fff4c0", l: "#6a7ab0" },
};

const CONSTELLATION_4: Art = {
  rows: [
    "y.y.......y",
    ".y.......l.",
    ".l.......y.",
    ".yllllllly.",
    ".l.l....ll.",
    ".y.y....yy.",
  ],
  palette: { y: "#fff4c0", l: "#a8b8ff" },
};

/** The Fifth Chihuahua, which is the Dog Star, which is shaking. */
export const FIFTH_CHIHUAHUA: Art = {
  rows: [
    "k.........k",
    "kk.......kk",
    "kwk.....kwk",
    "kwwkkkkkwwk",
    "kwwwwwwwwwk",
    "kwbwwwwwbwk",
    ".kwwwnwwwk.",
    "..kwwwwwk..",
    "...kkkkk...",
  ],
  palette: { k: "#ffd166", w: "#fff4c0", b: "#2a2050", n: K },
};

const FIFTH_CHIHUAHUA_4: Art = {
  rows: [
    "y....y....y",
    "kk.......kk",
    "kwk.....kwk",
    "kwwkkkkkwwk",
    "kwwwwwwwwwk",
    "kwbwwwwwbwk",
    "ykwwwnwwwky",
    "..kwwwwwk..",
    "...kkkkk...",
    "y....y....y",
  ],
  palette: { k: "#ffd166", w: "#fff4c0", b: "#2a2050", n: K, y: "#ffffff" },
};

// --- End: the bridge at the end of everything ---

/** A patch of the Long Meadow. Never needs mowing. */
export const LONG_MEADOW: Art = {
  rows: [
    "..f...f..",
    ".fyf.fyf.",
    "..g...g..",
    "ggglgglgg",
    "glggggglg",
    ".ggggggg.",
  ],
  palette: { f: "#ff9ad0", y: "#ffe066", g: "#5f9a40", l: "#9ccc6a" },
};

const LONG_MEADOW_4: Art = {
  rows: [
    "f.f.f.f.f",
    "yfyfyfyfy",
    "f.f.f.f.f",
    "g.g.g.g.g",
    "ggglgglgg",
    "glggggglg",
    ".ggggggg.",
  ],
  palette: { f: "#ff9ad0", y: "#ffe066", g: "#5f9a40", l: "#9ccc6a" },
};

/** A Bridge Keeper, treat in hand. */
export const BRIDGE_KEEPER: Art = {
  rows: [
    "..hhh..",
    ".hhfhh.",
    "..fff..",
    ".wwwww.",
    "wwwwwwt",
    "f.www.t",
    "..www..",
    "..www..",
    "..w.w..",
    "..k.k..",
  ],
  palette: { k: K, h: "#e0e0e0", f: "#e0b090", w: "#f0f0ff", t: "#c08040" },
};

const BRIDGE_KEEPER_4: Art = {
  rows: [
    ".yyyyy.",
    "..hhh..",
    ".hhfhh.",
    "..fff..",
    ".wwwww.",
    "wwwwwwt",
    "f.www.t",
    "..www..",
    "..w.w..",
    "..k.k..",
  ],
  palette: { k: K, h: "#e0e0e0", f: "#e0b090", w: "#f0f0ff", t: "#c08040", y: "#fff4c0" },
};

/** A Sunbeam, and the warm patch it makes on the floor. */
export const SUNBEAM: Art = {
  rows: [
    "..yyy..",
    "..yly..",
    ".yylyy.",
    ".yllly.",
    "yylllyy",
    "yllllly",
    "lllllll",
  ],
  palette: { y: "#ffe8a0", l: "#fff8d8" },
};

const SUNBEAM_4: Art = {
  rows: [
    "..yyy..",
    "..yly..",
    ".yylyy.",
    ".yllly.",
    "yylllyy",
    "ylbbbly",
    "lbbbbbl",
  ],
  palette: { y: "#ffe8a0", l: "#fff8d8", b: "#c08a50" },
};

/** A Collar Rack: one collar, one tag, for every dog that crossed. */
export const COLLAR_RACK: Art = {
  rows: [
    "kkkkkkkkk",
    ".k..k..k.",
    ".r..b..g.",
    "r.rb.bg.g",
    "r.rb.bg.g",
    ".r..b..g.",
    "..y..y..y",
  ],
  palette: { k: "#7a5237", r: "#e04a4a", b: "#4a8ae0", g: "#4ac04a", y: "#ffd166" },
};

const COLLAR_RACK_4: Art = {
  rows: [
    "w.......w",
    "kkkkkkkkk",
    ".k..k..k.",
    ".r..b..g.",
    "r.rb.bg.g",
    "r.rb.bg.g",
    ".r..b..g.",
    ".y..y..y.",
  ],
  palette: { k: "#7a5237", r: "#e04a4a", b: "#4a8ae0", g: "#4ac04a", y: "#ffd166", w: "#ffffff" },
};

/** Part of the Waiting Pack, sat in a row. */
export const WAITING_PACK: Art = {
  rows: [
    "b.b.c.c.d.d",
    "bbb.ccc.ddd",
    "bbb.ccc.ddd",
    "bbb.ccc.ddd",
    "b.b.c.c.d.d",
  ],
  palette: { b: "#c08a50", c: "#e0e0d0", d: "#5a4030" },
};

const WAITING_PACK_4: Art = {
  rows: [
    "..r...r...r",
    "b.b.c.c.d.d",
    "bbb.ccc.ddd",
    "bbbtccctddd",
    "bbb.ccc.ddd",
    "b.b.c.c.d.d",
  ],
  palette: { b: "#c08a50", c: "#e0e0d0", d: "#5a4030", r: "#ff6a8a", t: "#a07040" },
};

/** The Last Dog, sat facing you, the way it has been the whole time. */
export const LAST_DOG: Art = {
  rows: [
    "..k.....k..",
    ".kek...kek.",
    ".keekkkeek.",
    ".kwwwwwwwk.",
    ".kwbwwwbwk.",
    ".kwwwnwwwk.",
    "..kwwwwwk..",
    "...kk.kk...",
  ],
  palette: { k: "#8a5a3a", e: "#c08a5a", w: "#f0d8b0", b: "#2a2050", n: K },
};

const LAST_DOG_4: Art = {
  rows: [
    ".yyyyyyyyy.",
    "..k.....k..",
    ".kek...kek.",
    ".keekkkeek.",
    ".kwbwwwbwk.",
    ".kwwwnwwwk.",
    "..kwwwwwkkk",
    "...kk.kk...",
  ],
  palette: { k: "#8a5a3a", e: "#c08a5a", w: "#f0d8b0", b: "#2a2050", n: K, y: "#fff4c0" },
};

export const PRODUCER_MARKS = {
  patch: [CAGE, CAGE_2, CAGE_3, CAGE_4],
  hand: [
    KENNEL_HAND,
    repaint(KENNEL_HAND, { b: "#e08a3c", t: "#f2e3c8" }),
    repaint(KENNEL_HAND, { b: "#3f8f86", t: "#e0c04a" }),
    KENNEL_HAND_4,
  ],
  rig: [LAMP_HANG, LAMP_HANG_2, LAMP_HANG_3, LAMP_HANG_4],
  hauler: [VAN, VAN_2, VAN_3, VAN_4],
  machine: [GROOMER, GROOMER_2, GROOMER_3, GROOMER_4],
  lab: [
    LAB,
    repaint(LAB, { g: "#7fe0a0" }),
    repaint(LAB, { g: "#c88fe6", w: "#eee8f4" }),
    LAB_4,
  ],
  refinery: [KIBBLE, KIBBLE_2, KIBBLE_3, KIBBLE_4],
  tower: [TOWER, TOWER_2, TOWER_3, TOWER_4],
  airship: [ZEPPELIN, ZEPPELIN_2, ZEPPELIN_3, ZEPPELIN_4],
  reactor: [
    REACTOR,
    repaint(REACTOR, { g: "#6fd8e6" }),
    repaint(REACTOR, { g: "#ffd166", m: "#e6ecf2" }),
    REACTOR_4,
  ],
  orbital: [
    ORBITAL_KENNEL,
    repaint(ORBITAL_KENNEL, { b: "#6fa8dc", g: "#e2b077" }),
    repaint(ORBITAL_KENNEL, { b: "#e0c04a", g: "#f0c68c", c: "#d8f0f8" }),
    ORBITAL_KENNEL_4,
  ],
  singularity: [
    SINGULARITY,
    repaint(SINGULARITY, { p: "#b98ae6", v: "#7a5ac0" }),
    repaint(SINGULARITY, { p: "#e0c04a", v: "#a8792c", n: "#120c1c" }),
    SINGULARITY_4,
  ],
  fold: [
    HEM_HOLLOW,
    repaint(HEM_HOLLOW, { b: "#4f8f7a", g: "#b6f2fb" }),
    repaint(HEM_HOLLOW, { b: "#7a5ac0", g: "#ffd166", m: "#e2e8ee" }),
    HEM_HOLLOW_4,
  ],
  well: [
    DOWN_WELL,
    repaint(DOWN_WELL, { g: "#ff7a4a", h: "#7a4a24" }),
    repaint(DOWN_WELL, { g: "#ffe08a", m: "#cfd6dc", h: "#8a5a2c" }),
    DOWN_WELL_4,
  ],
  chorus: [
    CHORUS_FIGURE,
    repaint(CHORUS_FIGURE, { b: "#7f9fc0", t: "#a8c0d8", a: "#dceaf4" }),
    repaint(CHORUS_FIGURE, { b: "#c0a86a", t: "#d8c894", a: "#f4ecd0" }),
    CHORUS_FIGURE_4,
  ],
  // The one tier drawn as a person, so its marks recolour the kit rather than changing the shape.
  deephand: [
    SHAFT_CREW,
    repaint(SHAFT_CREW, { t: "#4f8f7a", b: "#4a5c7a", l: "#b6f2fb" }),
    repaint(SHAFT_CREW, { t: "#c9a24a", b: "#7a5ac0", l: "#fff0b8", v: "#5b4f58" }),
    LINT_HAND_4,
  ],
  face: [
    FLEECE_FACE,
    repaint(FLEECE_FACE, { s: "#ffffff", w: "#efe6cc" }),
    repaint(FLEECE_FACE, { s: "#d8f0f8", w: "#f4ecd0", m: "#cfd6dc" }),
    FLEECE_FACE_4,
  ],
  main: [
    SEAM_MAIN,
    repaint(SEAM_MAIN, { v: "#a86ea2", g: "#f0c6ec" }),
    repaint(SEAM_MAIN, { v: "#c48ac0", g: "#ffd166", m: "#cfd6dc" }),
    SEAM_MAIN_4,
  ],
  heart: [
    WARM_HEART,
    repaint(WARM_HEART, { f: "#d8b070", l: "#f7e8c0" }),
    repaint(WARM_HEART, { d: "#8d959d", f: "#e2b077", l: "#fff4c0" }),
    WARM_HEART_4,
  ],
  second: [
    SECOND_CHIHUAHUA,
    repaint(SECOND_CHIHUAHUA, { p: "#d69a58", l: "#f0c68c" }),
    repaint(SECOND_CHIHUAHUA, { p: "#e0c04a", l: "#f7e08a", d: "#8a6a1c" }),
    SECOND_CHIHUAHUA_4,
  ],
  echo: [
    ECHO_KENNEL,
    repaint(ECHO_KENNEL, { a: "#b9a8e6", b: "#e0d8f8" }),
    repaint(ECHO_KENNEL, { a: "#e0c04a", b: "#f4ecd0", n: "#2a2050" }),
    ECHO_KENNEL_4,
  ],
  kin: [
    THROWER,
    repaint(THROWER, { b: "#d88a7f", o: "#a8f07a" }),
    repaint(THROWER, { b: "#e0c04a", l: "#3a5a8a", o: "#ff7a6a" }),
    THROWER_4,
  ],
  grove: [
    STICK_TREE,
    repaint(STICK_TREE, { g: "#4f6a8f", l: "#a8c0e8" }),
    repaint(STICK_TREE, { g: "#6a5a8f", l: "#e0c6f0", s: "#e0c04a" }),
    STICK_TREE_4,
  ],
  tide: [
    MOON_PUDDLE,
    repaint(MOON_PUDDLE, { w: "#4a6aaa", m: "#fff4c0" }),
    repaint(MOON_PUDDLE, { w: "#5a5aa8", m: "#ffe08a", k: "#2a2a5a" }),
    MOON_PUDDLE_4,
  ],
  beacon: [
    PORCH_LIGHT,
    repaint(PORCH_LIGHT, { y: "#ffc46a" }),
    repaint(PORCH_LIGHT, { y: "#fff4c0", p: "#8d959d" }),
    PORCH_LIGHT_4,
  ],
  third: [
    MOON_DOG,
    repaint(MOON_DOG, { m: "#fff4d0", d: "#e0c890" }),
    repaint(MOON_DOG, { m: "#ffe9a8", d: "#e0c04a" }),
    MOON_DOG_4,
  ],
  spark: [
    SUNK_BALL,
    repaint(SUNK_BALL, { y: "#f08a5a", w: "#fff0e0" }),
    repaint(SUNK_BALL, { y: "#e0c04a", w: "#fff8d0", k: "#3a2a10" }),
    SUNK_BALL_4,
  ],
  kith: [
    DIVER,
    repaint(DIVER, { o: "#d8b060", s: "#6a5a4a" }),
    repaint(DIVER, { o: "#e8d07a", s: "#3a5a7a", w: "#a8f0f0" }),
    DIVER_4,
  ],
  loom: [
    SLIPPER_REEF,
    repaint(SLIPPER_REEF, { c: "#f0a85a", d: "#b86a3a" }),
    repaint(SLIPPER_REEF, { c: "#7ae0d0", d: "#3a9a8a", p: "#9a6a5a" }),
    SLIPPER_REEF_4,
  ],
  vault: [
    SUNK_KENNEL,
    repaint(SUNK_KENNEL, { a: "#6a5a8a", b: "#7a6a9a" }),
    repaint(SUNK_KENNEL, { a: "#c8963c", b: "#8a7a5a", x: "#fff4d0" }),
    SUNK_KENNEL_4,
  ],
  crown: [
    ANGLER_PUP,
    repaint(ANGLER_PUP, { L: "#ffe08a", p: "#6a5a8a" }),
    repaint(ANGLER_PUP, { L: "#ff9aa8", p: "#8a5a6a", o: "#ffd8e0" }),
    ANGLER_PUP_4,
  ],
  fourth: [
    FOURTH_CHIHUAHUA,
    repaint(FOURTH_CHIHUAHUA, { p: "#c8b08a", t: "#a8906a" }),
    repaint(FOURTH_CHIHUAHUA, { p: "#d8c08a", t: "#b8a06a", e: "#c8963c" }),
    FOURTH_CHIHUAHUA_4,
  ],
  dawn: [
    DAWN_FIRE,
    repaint(DAWN_FIRE, { f: "#ff5a2c", y: "#ffd86a" }),
    repaint(DAWN_FIRE, { f: "#ffb04a", y: "#fff0a0", s: "#9a8a78" }),
    DAWN_FIRE_4,
  ],
  elder: [
    FIRE_KEEPER,
    repaint(FIRE_KEEPER, { p: "#6a5a4a", P: "#d8c8a8" }),
    repaint(FIRE_KEEPER, { p: "#8a4a2c", P: "#e0c04a", h: "#d8d0c8" }),
    FIRE_KEEPER_4,
  ],
  root: [
    BONE_PILE,
    repaint(BONE_PILE, { b: "#f4ecd8", d: "#6a3a2a" }),
    repaint(BONE_PILE, { b: "#fff4c0", B: "#ffffff", d: "#4a3a2a" }),
    BONE_PILE_4,
  ],
  spring: [
    COLD_SPRING,
    repaint(COLD_SPRING, { w: "#6ab8e0", R: "#b0b0b8" }),
    repaint(COLD_SPRING, { w: "#8ad0f0", r: "#7a7a88", W: "#ffffff" }),
    COLD_SPRING_4,
  ],
  hearth: [
    PAINTED_CAVE,
    repaint(PAINTED_CAVE, { o: "#e07a3c", h: "#f4c080" }),
    repaint(PAINTED_CAVE, { o: "#e0c04a", h: "#fff4c0", r: "#8a7868" }),
    PAINTED_CAVE_4,
  ],
  first: [
    FIRST_DOG,
    repaint(FIRST_DOG, { g: "#a8a0a8", w: "#f0e8e0" }),
    repaint(FIRST_DOG, { g: "#c8a070", w: "#f4ecd8", k: "#4a3828" }),
    FIRST_DOG_4,
  ],
  mote: [
    STAR_PUP,
    repaint(STAR_PUP, { l: "#c0a8ff", w: "#fff0f8" }),
    repaint(STAR_PUP, { l: "#ffd166", w: "#fff4c0" }),
    STAR_PUP_4,
  ],
  wisp: [
    SKY_HERDER,
    repaint(SKY_HERDER, { r: "#4a3a8a", c: "#e0c890" }),
    repaint(SKY_HERDER, { r: "#6a4aa0", h: "#1a2a5a", c: "#ffd166" }),
    SKY_HERDER_4,
  ],
  veil: [
    CRATE_BLANKET,
    repaint(CRATE_BLANKET, { b: "#2a4a6a", r: "#5a8ab0" }),
    repaint(CRATE_BLANKET, { b: "#5a2a5a", r: "#c07ab0" }),
    CRATE_BLANKET_4,
  ],
  nebula: [
    LITTER_NEBULA,
    repaint(LITTER_NEBULA, { p: "#4a4a8a", l: "#a0b0e0" }),
    repaint(LITTER_NEBULA, { p: "#9a5a3a", l: "#f0c090" }),
    LITTER_NEBULA_4,
  ],
  aeon: [
    CONSTELLATION,
    repaint(CONSTELLATION, { l: "#8a7ab0", y: "#fff0d0" }),
    repaint(CONSTELLATION, { l: "#c8a0e8", y: "#ffd166" }),
    CONSTELLATION_4,
  ],
  fifth: [
    FIFTH_CHIHUAHUA,
    repaint(FIFTH_CHIHUAHUA, { k: "#ffe080", w: "#fffae0" }),
    repaint(FIFTH_CHIHUAHUA, { k: "#a8d8ff", w: "#f0f8ff" }),
    FIFTH_CHIHUAHUA_4,
  ],
  ember: [
    LONG_MEADOW,
    repaint(LONG_MEADOW, { f: "#ffc0e0", g: "#6aa348" }),
    repaint(LONG_MEADOW, { f: "#fff4e0", y: "#ffd166", l: "#c8f0a0" }),
    LONG_MEADOW_4,
  ],
  ward: [
    BRIDGE_KEEPER,
    repaint(BRIDGE_KEEPER, { w: "#e0e8ff", t: "#d09050" }),
    repaint(BRIDGE_KEEPER, { w: "#fff4d0", h: "#ffffff" }),
    BRIDGE_KEEPER_4,
  ],
  lull: [
    SUNBEAM,
    repaint(SUNBEAM, { y: "#ffd890", l: "#fff0c0" }),
    repaint(SUNBEAM, { y: "#ffc070", l: "#ffe8b0" }),
    SUNBEAM_4,
  ],
  relic: [
    COLLAR_RACK,
    repaint(COLLAR_RACK, { k: "#8a6a47", y: "#ffe080" }),
    repaint(COLLAR_RACK, { k: "#a8792c", r: "#ff6a6a", b: "#6aa8ff" }),
    COLLAR_RACK_4,
  ],
  legion: [
    WAITING_PACK,
    repaint(WAITING_PACK, { c: "#f0e8c0", d: "#3a3a3a" }),
    repaint(WAITING_PACK, { b: "#e0a060", d: "#7a5a40" }),
    WAITING_PACK_4,
  ],
  last: [
    LAST_DOG,
    repaint(LAST_DOG, { e: "#d0a070", w: "#f8e8c8" }),
    repaint(LAST_DOG, { k: "#c9a24a", e: "#ffd166", w: "#fff4d8" }),
    LAST_DOG_4,
  ],
} as const satisfies Record<string, readonly [Art, Art, Art, Art]>;

export type MarkedProducerId = keyof typeof PRODUCER_MARKS;

// --- The arrival cuts: the one thing you fall toward before each world opens round you ---
// Bigger than anything in a scene, because they get zoomed until a pixel is wider than the screen.

/** The Ur-Chihuahua, head-on. Ears, nose and tongue: a dog from a long way off, not a lumpy brown oval. */
export const CUT_NEST_DOG: Art = {
  rows: [
    "kk....................kk",
    "kik..................kik",
    "kiik................kiik",
    "kpiik..............kiipk",
    ".kpiik............kiipk.",
    ".kppiik.kkkkkkkk.kiippk.",
    "..kppiikpppllpppkiippk..",
    "..kpppppppllllpppppppk..",
    "..kppppppppllppppppppk..",
    ".kpppppppppllpppppppppk.",
    ".kppkkkkppllllppkkkkppk.",
    "kppkeweekpllllpkeweekppk",
    "kppkeeeekpllllpkeeeekppk",
    "kppkeeeekpllllpkeeeekppk",
    ".kppkkkkplmmmmlpkkkkppk.",
    ".kpppppplmnwnnmlppppppk.",
    "..kpppplmmnnnnmmlppppk..",
    "..kppplmmmmkkmmmmlpppk..",
    "...kkpmmmkqqqqkmmmpkk...",
    ".....kkkkkkkkkkkkkk.....",
  ],
  palette: { q: "#e86a7a", k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#95602c", i: "#e89a9a", e: "#1c1218", w: "#ffffff", m: "#f2e3c8", n: "#2a1a1a" },
};

/** The same head asleep, which is the way into the dream. */
export const CUT_DREAM_DOG: Art = {
  rows: [
    "kk....................kk",
    "kik..................kik",
    "kiik................kiik",
    "kpiik..............kiipk",
    ".kpiik............kiipk.",
    ".kppiik.kkkkkkkk.kiippk.",
    "..kppiikpppllpppkiippk..",
    "..kpppppppllllpppppppk..",
    "..kppppppppllppppppppk..",
    ".kpppppppppllpppppppppk.",
    ".kpppppppppllpppppppppk.",
    "kpppppppppllllpppppppppk",
    "kppkpppkppllllppkpppkppk",
    "kpppkkkpppllllpppkkkpppk",
    ".kpppppppplmmlppppppppk.",
    ".kpppppplmnnnnmlppppppk.",
    "..kpppplmmnnnnmmlppppk..",
    "..kppplmmmmkkmmmmlpppk..",
    "...kkpmmmkqqqqkmmmpkk...",
    ".....kkkkkkkkkkkkkk.....",
  ],
  palette: { q: "#e86a7a", k: "#402e3a", p: "#c98b4b", l: "#e2b077", d: "#95602c", i: "#e89a9a", e: "#1c1218", w: "#ffffff", m: "#f2e3c8", n: "#2a1a1a" },
};

/** A ball going down, and you after it. */
export const CUT_SUNK_BALL: Art = {
  rows: [
    "......b.........",
    "........b..b....",
    "....b...........",
    "................",
    ".....kkkkkk.....",
    "...kkkggsgkkk...",
    "..kkggggsgggkk..",
    ".kkgwwgssggggkk.",
    ".kgwwwwsggggggk.",
    "kkgwwwssggggggkk",
    "kgggwssggggggggk",
    "kggsssggggggsssk",
    "ksssggggggssshhk",
    "kggggggggssghhhk",
    "kkggggggssghhhkk",
    ".kggggggsghhhhk.",
    ".kkggggsshhhhkk.",
    "..kkgggshhhhkk..",
    "...kkkgshhkkk...",
    ".....kkkkkk.....",
  ],
  palette: { k: "#3a4418", g: "#cfe04a", h: "#a8b82c", s: "#f4f4e0", w: "#eef8a0", b: "#a0d8e8" },
};

/** The first fire, and the eyes at the edge of it. */
export const CUT_FIRE: Art = {
  rows: [
    "............................",
    "............................",
    "..........y........a....a...",
    ".........yo........aaaaaa...",
    "........yoo.y......aaaaaaa..",
    "........yooyo.....aeaaaeaa..",
    ".......yoorooy....aaaaaaaa..",
    "......yoorrooy.....aaaaaa...",
    "......yorrrroy......aaaa....",
    "......yorrdrroy.............",
    ".....yoorddrroy.............",
    ".....yorrddrrooy............",
    "....ssyorrrrroyss...........",
    "...sttlllllllllltts.........",
    "...sssssssssssssss..........",
    "............................",
  ],
  palette: { y: "#fff0b0", o: "#ffb040", r: "#e05a18", d: "#8a2a10", s: "#4a3a34", t: "#7a6a5a", l: "#5a3018", a: "#1a1620", e: "#ffd166" },
};

/** The fire's other frame. */
export const CUT_FIRE_FLICKER: Art = {
  rows: [
    "............................",
    "...........y................",
    "...........oy......a....a...",
    "........y..ooy.....aaaaaa...",
    ".......yo..yoy.....aaaaaaa..",
    ".......yoyyoooy...aeaaaeaa..",
    ".......yooroooy...aaaaaaaa..",
    "......yoorrrooy....aaaaaa...",
    "......yorrrrroy.....aaaa....",
    ".....yoorrdrroy.............",
    ".....yorrddrrooy............",
    ".....yorrddrrroy............",
    "....ssyorrrrroyss...........",
    "...sttlllllllllltts.........",
    "...sssssssssssssss..........",
    "............................",
  ],
  palette: { y: "#fff0b0", o: "#ffb040", r: "#e05a18", d: "#8a2a10", s: "#4a3a34", t: "#7a6a5a", l: "#5a3018", a: "#1a1620", e: "#ffd166" },
};

/** The Dog Star, rays out. */
export const CUT_DOG_STAR: Art = {
  rows: [
    ".....................",
    ".....................",
    "....z.....z.....z....",
    "..........y..........",
    "..........y..........",
    "..........y..........",
    ".......k..y..k.......",
    "......kwk...kwk......",
    "......kwwkkkwwk......",
    "......kwwwwwwwk......",
    "zyyyy.kwbwwwbwk.yyyyz",
    ".....kwwwwwwwwwk.....",
    "......kwwwnwwwk......",
    ".......kwwwwwk.......",
    "........kkkkk........",
    "..........y..........",
    "..........y..........",
    "..........y..........",
    "....z.....y.....z....",
    "..........z..........",
    ".....................",
  ],
  palette: { k: "#ffd166", w: "#fff4c0", b: "#2a2050", n: "#402e3a", y: "#fff4c0", z: "#ffffff" },
};

/** The Dog Star between twinkles. */
export const CUT_DOG_STAR_DIM: Art = {
  rows: [
    ".....................",
    ".....................",
    ".....................",
    ".....z.........z.....",
    "..........z..........",
    "..........y..........",
    ".......k..y..k.......",
    "......kwk...kwk......",
    "......kwwkkkwwk......",
    "......kwwwwwwwk......",
    "..zyy.kwbwwwbwk.yyz..",
    ".....kwwwwwwwwwk.....",
    "......kwwwnwwwk......",
    ".......kwwwwwk.......",
    "........kkkkk........",
    "..........y..........",
    "..........y..........",
    ".....z....z....z.....",
    ".....................",
    ".....................",
    ".....................",
  ],
  palette: { k: "#ffd166", w: "#fff4c0", b: "#2a2050", n: "#402e3a", y: "#fff4c0", z: "#ffffff" },
};

/** The bridge, and the Last Dog at the top of it. */
export const CUT_BRIDGE: Art = {
  rows: [
    "...................................",
    "...............k...k...............",
    "..............kek.kek..............",
    "..............kwwwwwk..............",
    "..............kwbwbwk..............",
    "...............kwnwk...............",
    "...............kk.kk...............",
    "............rrrrrrrrrrr............",
    "..........rrooooooooooorr..........",
    "........rrooyyyyyyyyyyyoorr........",
    ".......rooyygggggggggggyyoor.......",
    ".....rrooygggbbbbbbbbbgggyoorr.....",
    ".....royyggbbvvvvvvvvvbbggyyor.....",
    "....royygbbvv.........vvbbgyyor....",
    "...rooygbbv.............vbbgyoor...",
    "...roygbbv...............vbbgyor...",
    "..royggbv.................vbggyor..",
    "..roygbv...................vbgyor..",
    ".royggbv...................vbggyor.",
    ".roygbv.....................vbgyor.",
    ".roygbv.....................vbgyor.",
    ".rccccc.....................cccccr.",
    "ccccccccc.................ccccccccc",
    "ccccccccccc.............ccccccccccc",
  ],
  palette: { r: "#e05050", o: "#f0a040", y: "#f0e060", g: "#60c060", b: "#2a2050", v: "#9060c0", k: "#8a5a3a", e: "#c08a5a", w: "#f0d8b0", n: "#402e3a", c: "#fff4e8" },
};
