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

// --- The tunnel — what the dig under the yard is made of ---

/** A scrape: a shallow start under the back of a pen, and what came out of it. */
export const HEM_HOLLOW: Art = {
  rows: [
    "...........",
    "...........",
    "....ddd....",
    "..ddllldd..",
    ".dlllllldd.",
    "kkkkkkkkkkk",
    "kdnnnnnnndk",
    "kdnnnnnnndk",
    ".kdnnnnndk.",
    "..kkkkkkk..",
  ],
  palette: { k: K, d: "#8a6a48", l: "#b89668", n: "#1c1218" },
};

/** The air line: kibble tins, end to end, back to the pens. */
export const DOWN_WELL: Art = {
  rows: [
    "...kkkk...",
    "..kmmmmk..",
    "..kmggmk..",
    "..kmmmmk..",
    "...kkkk...",
    "...kmmk...",
    "..kkkkkk..",
    "..kmmmmk..",
    "..kkkkkk..",
    "...kmmk...",
    "..kkkkkk..",
    "..kmmmmk..",
    "..kkkkkk..",
    "...kmmk...",
  ],
  palette: { k: K, m: "#a8b0b8", g: "#6ab8e0", h: "#8a6a48" },
};

/** One of the howl: nose up, covering the noise. Pale, because most of them dug here generations ago. */
export const CHORUS_FIGURE: Art = {
  rows: [
    "...n...",
    "..mmm..",
    "..mmm..",
    "p.ppp.p",
    "ppppppp",
    ".ppppp.",
    ".ppppp.",
    "ppppppp",
    ".ppppp.",
    ".p...p.",
    ".p...p.",
    ".k...k.",
  ],
  palette: { k: "#6a5c7a", p: "#b9a8cc", m: "#e6dcef", n: "#4a3f5c", b: "#b9a8cc", t: "#b9a8cc", a: "#e6dcef" },
};


/** A prop: slats out of the whelping boxes, holding the roof up. */
export const FLEECE_FACE: Art = {
  rows: [
    "kkkkkkkkkkkkk",
    "kwwwwwwwwwwwk",
    "kkkkkkkkkkkkk",
    ".kwk.....kwk.",
    ".kwk.....kwk.",
    ".kwk.....kwk.",
    ".kwk.....kwk.",
    ".kwk.....kwk.",
    ".kkk.....kkk.",
  ],
  palette: { k: K, w: "#e6d2a0", s: "#f7f1dc" },
};

/** The trolley: a feed tray on a string. Spoil goes back, dogs go forward. */
export const SEAM_MAIN: Art = {
  rows: [
    "....kk....",
    "....kk....",
    "....kk....",
    "....kk....",
    "...kkkk...",
    "..k....k..",
    ".k......k.",
    "kkkkkkkkkk",
    "kmddddddmk",
    "kmmmmmmmmk",
    "kkkkkkkkkk",
    ".o......o.",
    "..........",
  ],
  palette: { k: K, m: "#a8b0b8", d: "#8a6a48", o: "#2a2228", v: "#8a6a48", g: "#b89668", s: "#7f8891" },
};

/** The den: a wide spot lined with what's left of a blanket, and somebody asleep in it. */
export const WARM_HEART: Art = {
  rows: [
    "...kkkkkk...",
    ".kkddddddkk.",
    ".kdnnnnnndk.",
    "kdnnnnnnnndk",
    "kdnnnnnnnndk",
    "kdnnpppnnndk",
    "kdnpppppnndk",
    ".kbbbbbbbbk.",
    ".kkbbbbbbkk.",
    "...kkkkkk...",
    "...k....k...",
  ],
  palette: { k: K, d: "#8a6a48", n: "#2a1520", p: "#c98b4b", b: "#a8c0d8", f: "#8a6a48", l: "#b89668" },
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

/** A digger: a dog on its hind legs with a lamp on, which is how you know whose side the picture is on now. */
export const SHAFT_CREW: Art = {
  rows: [
    "..tlt..",
    ".ttttt.",
    "pptttpp",
    ".pepep.",
    ".ppmpp.",
    "..pmp..",
    ".ppppp.",
    "ppppppp",
    ".ppppp.",
    ".p...p.",
    ".k...k.",
  ],
  palette: { k: K, t: "#d8892c", l: "#fff4c0", p: "#c98b4b", m: "#f4e6cc", e: K, b: "#c98b4b", v: K },
};

/** The same digger with both paws up: on the ladder, or at the face. */
export const SHAFT_CREW_UP: Art = {
  rows: [
    "p.tlt.p",
    "ptttttp",
    "pptttpp",
    ".pepep.",
    ".ppmpp.",
    "..pmp..",
    ".ppppp.",
    ".ppppp.",
    ".ppppp.",
    ".p...p.",
    ".k...k.",
  ],
  palette: { k: K, t: "#d8892c", l: "#fff4c0", p: "#c98b4b", m: "#f4e6cc", e: K },
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

// --- The fire — a camp at the edge of the woods, at dawn ---
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
// --- The cut — what's in the canal ---

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
    "bkb.ckc.dkd",
    ".b...c...d.",
    "bbb.ccc.ddd",
    "bbb.ccc.ddd",
  ],
  palette: { b: "#c08a50", c: "#e0e0d0", d: "#7a5a40", k: "#2a2028" },
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

/** The hundredth-unit mark for the worlds past the end: the same thing, grown a new top, in a new paint. */
function grown(art: Art, top: readonly string[], paint: Readonly<Record<string, string>>): Art {
  const w = art.rows[0]!.length;
  const pad = (row: string) => row.padStart(row.length + ((w - row.length) >> 1), ".").padEnd(w, ".");
  return { rows: [...top.map(pad), ...art.rows], palette: { ...art.palette, ...paint } };
}

// --- After: the far side ---
/** A gate in a park fence, standing open, and it stays that way. */
export const OPEN_GATE: Art = {
  rows: [
    "kk..........kk.....",
    "kwk........kwk.....",
    "kwkkkkkkkkkkwk.kkk.",
    "kwkwwwwwwwwkwkkwwk.",
    "kwk.k..k...kwkwk.k.",
    "kwk.k..k...kwkk.wk.",
    "kwkkkkkkkkkkwk.wkk.",
    "kwkwwwwwwwwkwkwk...",
    "kwk........kwkk....",
    "kwk........kwk.....",
    "gggggggggggggggggg.",
    ".ggllgggggllggggg..",
  ],
  palette: { k: "#402e3a", w: "#f7ecd8", g: "#6aa348", l: "#a4d868" },
};
const OPEN_GATE_4 = grown(OPEN_GATE, ["..f.......f..", ".fyf.....fyf."], { f: "#ffb0d0", y: "#ffd166" });
/** Somebody who is not going to get tired. */
export const PARK_THROWER: Art = {
  rows: [
    ".....kkkk...r.",
    "....khhhhk.k..",
    "....kffffk.k..",
    "....kffffkk...",
    ".....kffk.k...",
    "...kkbbbbkk...",
    "..kbbbbbbk....",
    ".kffkbbbbk....",
    ".kk.kbbbbk....",
    "....kbbbbk....",
    "....kpppk.....",
    "....kpkpk.....",
    "....kkkkk.....",
  ],
  palette: { k: "#402e3a", r: "#c8e048", h: "#6a4a30", f: "#e2b090", b: "#c04a4a", p: "#3a4a6a" },
};
const PARK_THROWER_4 = grown(PARK_THROWER, ["....y...y..", ".....yyy..."], { y: "#ffd166" });
/** Everybody ends up under it. */
export const SHADE_TREE: Art = {
  rows: [
    ".....kkkkkkkk.....",
    "...kkggggllgggkk..",
    "..kgggllgggggllgk.",
    ".kgggggggggggggggk",
    "kgglgggggllggggggk",
    "kggggggggggggglggk",
    ".kgggllgggggggggk.",
    "..kkggggggggggkk..",
    "....kkkkttkkkk....",
    ".......ktdk.......",
    ".......ktdk.......",
    ".......ktdk.......",
    "......kttddk......",
    "ssssssssssssssssss",
  ],
  palette: { k: "#402e3a", g: "#4e8f4a", l: "#7ab858", t: "#7a5237", d: "#5a3a24", s: "#3e7a34" },
};
const SHADE_TREE_4 = grown(SHADE_TREE, [".p...p...p...p.", "..p.p.p.p.p.p.."], { p: "#ffb0d0" });
/** Cold, shallow, and full of grass. */
export const PADDLING_POOL: Art = {
  rows: [
    "....kkkkkkkkkkkk....",
    "..kkwwwwwwwwwwwwkk..",
    ".kwwbbbbbbbbbbbbwwk.",
    "kwwblbbbbgbbblbbbwwk",
    "kwbbbbbblbbbbbbbbbwk",
    "kwwbbgbbbbbblbbbbwwk",
    ".kwwbbbbbbbbbbbbwwk.",
    "..kkwwwwwwwwwwwwkk..",
    "....kkkkkkkkkkkk....",
  ],
  palette: { k: "#402e3a", w: "#f0a0b0", b: "#7ac8e8", l: "#d0f0ff", g: "#6aa348" },
};
const PADDLING_POOL_4 = grown(PADDLING_POOL, [".....y.....y.....", "....yyy...yyy...."], { y: "#ffffff" });
/** Nose to tail, with the next one along. */
export const SNIFF_DOG: Art = {
  rows: [
    "...............t",
    "..kk.........kt.",
    ".kbbk.......kbk.",
    "kbbbbkkkkkkkkbk.",
    "nbbebbbbbbbbbbk.",
    "kkbbbbbbbbbbbbk.",
    "..kkbbbbbbbbbk..",
    "...kbk.kbk.kbk..",
    "...kk...k...kk..",
  ],
  palette: { k: "#402e3a", b: "#c98b4b", e: "#2a1a12", n: "#2a1a12", t: "#a8703a" },
};
const SNIFF_DOG_4 = grown(SNIFF_DOG, ["..f.......", ".fff......"], { f: "#ffd166" });
/** Flat on its side in the sun, not shaking. */
export const SIXTH_CHIHUAHUA: Art = {
  rows: [
    "kk...kk...............",
    "kbk.kbk...............",
    "kbbkbbk..kkkkkkkkkk...",
    "kbbbbbbkkbbbbbbbbbbk..",
    "kbebbebkbbbbbbbbbbbbk.",
    "kbbbbbbbbbbbbbbbbbbbbk",
    ".knnbbkbbbbbbbbbbbbbbk",
    "..kkkkkkkkkkkkkkkkkkk.",
  ],
  palette: { k: "#402e3a", b: "#e8c8a0", e: "#2a1a12", n: "#6a4a3a" },
};
const SIXTH_CHIHUAHUA_4 = grown(SIXTH_CHIHUAHUA, [".y.....y.....y.", "..y...y.y...y.."], { y: "#ffd166" });
// --- Above: the walk ---
/** An old waymark, thick with messages. */
export const GOOD_POST: Art = {
  rows: [
    "...kkkkk...",
    "..kwwwwwk..",
    "..kwyyywk..",
    "..kwwwwwk..",
    "...kkkkk...",
    "....ktk....",
    "....ktk....",
    "....ktk....",
    "....kdk....",
    "..g.ktk.g..",
    ".gg.kdk.gg.",
    "kkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", w: "#c8c0a8", y: "#ffd166", t: "#7a6a50", d: "#5a4a38", g: "#3e6a4a" },
};
const GOOD_POST_4 = grown(GOOD_POST, ["...yyy...", "..y...y..", "...yyy..."], { y: "#fff4c0" });
/** Hood up, hands in pockets, torch on. */
export const NIGHT_WALKER: Art = {
  rows: [
    "....kkkk....",
    "...khhhhk...",
    "..khhffhhk..",
    "..khhffhhk..",
    "...khhhhk...",
    "..kccccccky.",
    ".kccccccckyy",
    ".kccccccck.y",
    ".kccccccck..",
    "..kccccck...",
    "..kpppppk...",
    "..kpkkkpk...",
    "..kbk.kbk...",
    "..kkk.kkk...",
  ],
  palette: { k: "#402e3a", h: "#3a4a6a", f: "#e2b090", c: "#4a5a7a", y: "#ffe8a0", p: "#2a2a3a", b: "#5a3a24" },
};
const NIGHT_WALKER_4 = grown(NIGHT_WALKER, ["....yyyy....", "...y....y..."], { y: "#ffd166" });
/** You have to stop and be lifted over. */
export const STILE: Art = {
  rows: [
    "kk............kk",
    "kwk..........kwk",
    "kwkkkkkkkkkkkkwk",
    "kwkwwwwwwwwwwkwk",
    "kwk.kk..kk...kwk",
    "kwkkkkkkkkkkkkwk",
    "kwkwwwwwwwwwwkwk",
    "kwk....kk....kwk",
    "kwk..kkkkkk..kwk",
    "kwk..kwwwwk..kwk",
    "kwk..kkkkkk..kwk",
    "kkk..........kkk",
  ],
  palette: { k: "#402e3a", w: "#8a7a60" },
};
const STILE_4 = grown(STILE, ["..y........y..", ".yyy......yyy."], { y: "#ffd166" });
/** Cold water over stones, and a stone to stand on. */
export const STREAM: Art = {
  rows: [
    ".....ssss...........",
    "...bbssssbbbbbbbb...",
    ".bbbbbbbbbblbbbsssb.",
    "bbbbbbbblbbbbbbsssbl",
    "bbsssbbbbbbbbbbbbbbb",
    "bbsssbbblbbbbbbbblbb",
    ".bbbbbbbbbbbbssbbbb.",
    "...bbblbbbbbbssbb...",
  ],
  palette: { b: "#3a6ac0", l: "#a8d8f0", s: "#7a7a80" },
};
const STREAM_4 = grown(STREAM, ["....l.......l....", "...lll.....lll..."], { l: "#a8d8f0" });
/** Every generation went up this way. */
export const PAW_PRINTS: Art = {
  rows: [
    "....pp.pp....",
    "...p.pp.p....",
    "....ppppp....",
    "...ppppppp...",
    ".....ppp.....",
    ".............",
    ".pp.pp.......",
    "p.pp.p.......",
    ".ppppp.......",
    "ppppppp......",
    "..ppp........",
  ],
  palette: { p: "#d8d0c8" },
};
const PAW_PRINTS_4 = grown(PAW_PRINTS, ["...p.p...", "..ppppp.."], { p: "#fff4c0" });
/** Inside somebody’s coat, head out, supervising. */
export const SEVENTH_CHIHUAHUA: Art = {
  rows: [
    "......kk..kk......",
    "......kbkkbk......",
    "......kbbbbk......",
    "......kebbek......",
    "......kbnnbk......",
    ".....kkkbbkkk.....",
    "...kkccccccccckk..",
    "..kcccccccccccck..",
    ".kcccckccckcccck..",
    ".kcccccccccccccck.",
    ".kcccccccccccccck.",
    ".kffkcccccccckffk.",
    ".kkkkcccccccck.kk.",
    "....kccccccck.....",
  ],
  palette: { k: "#402e3a", b: "#e8c8a0", e: "#2a1a12", n: "#6a4a3a", c: "#a8703a", f: "#e2b090" },
};
const SEVENTH_CHIHUAHUA_4 = grown(SEVENTH_CHIHUAHUA, [".y..y..y.", "..y.y.y.."], { y: "#ffd166" });
// --- Home: the porch ---
/** WELCOME, mostly worn off. */
export const DOORMAT: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkk",
    "kbbbbbbbbbbbbbbbbbbbbk",
    "kbdbdbddbdbbbdbdbdddbk",
    "kbdbdbdbbdbbbdbdbdbbbk",
    "kbdddbddbdddbdddbdddbk",
    "kbbbbbbbbbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: { k: "#402e3a", b: "#a88a58", d: "#6a5030" },
};
const DOORMAT_4 = grown(DOORMAT, [".s.s.s.s.s.s.s.s.s.s.", ".s.s.s.s.s.s.s.s.s.s."], { s: "#a88a58" });
/** Sat very upright, deciding about you. */
export const HOUSE_CAT: Art = {
  rows: [
    "kk...kk......",
    "kbk.kbk......",
    "kbbkbbk......",
    "kbbbbbk......",
    "kebbbek....kk",
    "kbbpbbk...kbk",
    ".kbbbk....kbk",
    ".kbbbbk...kbk",
    "kbbbbbbk..kbk",
    "kbbbbbbbk.kbk",
    "kbbbbbbbbkkbk",
    "kbbbbbbbbbbk.",
    "kkkkkkkkkkk..",
  ],
  palette: { k: "#402e3a", b: "#6a6a78", e: "#c8e048", p: "#ffb0b0" },
};
const HOUSE_CAT_4 = grown(HOUSE_CAT, [".y...y.......", ".yyyyy......."], { y: "#ffd166" });
/** Somebody left it on. */
export const LEFT_ON_LIGHT: Art = {
  rows: [
    "...kkkkkkk...",
    "..ksssssssk..",
    "...kkkkkkk...",
    "...kyyyyyk...",
    "...kywwwyk...",
    "...kywwwyk...",
    "...kyyyyyk...",
    "...kkkkkkk...",
    ".....kkk.....",
  ],
  palette: { k: "#402e3a", s: "#5a5a68", y: "#ffd166", w: "#fff8e0" },
};
const LEFT_ON_LIGHT_4 = grown(LEFT_ON_LIGHT, ["..s...s...s..", "...s..s..s..."], { s: "#fff4c0" });
/** Your name is on the side of it. */
export const FULL_BOWL: Art = {
  rows: [
    "...ffffffffffff...",
    "..fffbffffbffffk..",
    "kkkkkkkkkkkkkkkkkk",
    "kssssssssssssssssk",
    ".ksllssnnnnnsssk..",
    ".kslsssssssssssk..",
    "..kkkkkkkkkkkkk...",
  ],
  palette: { k: "#402e3a", f: "#a8703a", b: "#7a4a24", s: "#c04a4a", l: "#f09090", n: "#fff0d8" },
};
const FULL_BOWL_4 = grown(FULL_BOWL, ["...b...b...b...", "..bbb.bbb.bbb.."], { b: "#e8d0b0" });
/** Pencil marks going up a door frame, all of them dogs. */
export const HEIGHT_CHART: Art = {
  rows: [
    "kwwwwwwk",
    "kwppwwwk",
    "kwwwwwwk",
    "kwwppwwk",
    "kwwwwwwk",
    "kwpppwwk",
    "kwwwwwwk",
    "kwppwwwk",
    "kwwwwwwk",
    "kwwpppwk",
    "kwwwwwwk",
    "kwppwwwk",
    "kwwwwwwk",
    "kwpwwwwk",
    "kwwwwwwk",
  ],
  palette: { k: "#402e3a", w: "#f0e4cc", p: "#5a5a68" },
};
const HEIGHT_CHART_4 = grown(HEIGHT_CHART, [".y..y.", ".yyyy."], { y: "#ffd166" });
/** You. */
export const GOOD_DOG: Art = {
  rows: [
    "..kk.........",
    ".kbbk...kk...",
    "kbbbbk.kbbk..",
    "kbdbbkkbbbk..",
    "kbdbbbbbbdbk.",
    ".kbbbbbbbdbk.",
    ".kbebbbbebk..",
    ".kbbbnnbbbk..",
    "..kbbbbbbk...",
    "...kkppkk....",
    "..kbbbbbbk.kk",
    ".kbbbbbbbbkbk",
    ".kbbbbbbbbbk.",
    ".kbkbbbbkbk..",
    ".kk.kkkk.kk..",
  ],
  palette: { k: "#402e3a", b: "#c98b4b", d: "#8a5a30", e: "#2a1a12", n: "#2a1a12", p: "#c04a4a" },
};
const GOOD_DOG_4 = grown(GOOD_DOG, ["....y.y.y....", "...y..y..y..."], { y: "#fff4c0" });

// --- Long ago: the steppe, fifteen thousand years back ---
// Cold light and old colours: snow-blue, bone, hide, red ochre, and wolf-grey. Nothing in it is a dog
// yet, except, by the top of the ladder, one of them.

const WILD_K = "#2a2c3e";

/** A bit of meat on a flake of flint, left at the edge of the camp. */
export const FLINT_SCRAP: Art = {
  rows: [
    "....rRr....",
    "...rRrrr...",
    ".kfkrrrrfk.",
    "kfFfffFfffk",
    ".kffFfffkk.",
    "..kkkkkk...",
  ],
  palette: { k: WILD_K, f: "#545868", F: "#a8b0c4", r: "#b0443a", R: "#e8806a" },
};
const FLINT_SCRAP_4 = grown(FLINT_SCRAP, ["b...b", ".bbb.", "b...b"], { b: "#f0e8d4" });

/** A hand on the rock, red blown round it. The hand is the rock showing through. */
export const OCHRE_HAND: Art = {
  rows: [
    "...ror...",
    ".oor.rr..",
    "or.r.r.o.",
    ".o.r.r.o.",
    "rr.....rr",
    "r......rr",
    ".r.....r.",
    "orr...ro.",
    ".oo...oo.",
    "..orrro..",
  ],
  palette: { r: "#b8482a", o: "#d8784a" },
};

/** And beside it, lower down, a paw. */
const OCHRE_PAW: Art = {
  rows: [
    "...ror........",
    ".oor.rr.......",
    "or.r.r.o......",
    ".o.r.r.o......",
    "rr.....rrrroo.",
    "r......rrr.r.o",
    ".r.....rr.rr.r",
    "orr...roor..ro",
    ".oo...ooor..ro",
    "..orrro..rroo.",
  ],
  palette: OCHRE_HAND.palette,
};
/** And a smaller one, beside that. */
const OCHRE_PAW_4: Art = {
  rows: [
    "...ror............",
    ".oor.rr...........",
    "or.r.r.o..........",
    ".o.r.r.o..........",
    "rr.....rrrroo.....",
    "r......rrr.r.o.o..",
    ".r.....rr.rr.r.r..",
    "orr...roor..ror.ro",
    ".oo...ooor..rorrr.",
    "..orrro..rroo.o...",
  ],
  palette: OCHRE_HAND.palette,
};

const BONE = { k: WILD_K, b: "#e2d8bc", B: "#fff8e8", d: "#8a7c62", t: "#f4ecd8" };

/** Mammoth bone, stacked like logs. The knobs make its skyline. */
export const BONE_WINDBREAK: Art = {
  rows: [
    "....kk...kkk...kk....",
    "...kBBkkkBBBkkkBbk...",
    "....kbBBbbdbBBbbk....",
    ".kkkbbdddbbbdddbdkkk.",
    "kBBkkdBBBdddBBBdkkBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    "kBBdddBBBdddBBBdddBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    ".kkkkkkkkkkkkkkkkkkk.",
  ],
  palette: BONE,
};

/** Higher than a wolf. */
const BONE_WINDBREAK_TALL: Art = {
  rows: [
    ".......kk...kkk...kk.",
    "......kBBkkkBBBkkkBbk",
    ".......kbBBbbdbBBbbk.",
    "....kkkbbdddbbbdddbdk",
    "...kBBkkdBBBdddBbddk.",
    "....kbBBbbdbBBbbdddk.",
    ".kkkbbdddbbbdddbdddk.",
    "kBBkkdBBBdddBBBdddBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    "kBBdddBBBdddBBBdddBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    ".kkkkkkkkkkkkkkkkkkk.",
  ],
  palette: BONE,
};

/** Two tusks stood up at the ends, leaning in, so the wind goes over the top. */
const BONE_WINDBREAK_4: Art = {
  rows: [
    "t...................t",
    "t...................t",
    ".t.................t.",
    "..tt.............tt..",
    ".......kk...kkk...kk.",
    "......kBBkkkBBBkkkBbk",
    ".......kbBBbbdbBBbbk.",
    "....kkkbbdddbbbdddbdk",
    "...kBBkkdBBBdddBbddk.",
    "....kbBBbbdbBBbbdddk.",
    ".kkkbbdddbbbdddbdddk.",
    "kBBkkdBBBdddBBBdddBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    "kBBdddBBBdddBBBdddBbk",
    ".kbBBbbdbBBbbdbBBbbk.",
    "kbbdddbbbdddbbbdddbdk",
    ".kkkkkkkkkkkkkkkkkkk.",
  ],
  palette: BONE,
};

const HUT = {
  k: WILD_K, h: "#8a5e3c", H: "#b88a58", e: "#6a4430", t: "#f4ecd8", n: "#3a2420", o: "#e07a3a", y: "#ffc060",
  w: "#fff0b0", b: "#e2d8bc", B: "#fff8e8", d: "#a49474", s: "#f0f4fc",
};

/** Hides over mammoth bone, jaws round the bottom, two tusks for a door, and dinner on inside. */
export const TUSK_HUT: Art = {
  rows: [
    "........kkkkk........",
    "......kkssssskk......",
    ".....khhsssshhhk.....",
    "....khHhhhhehhhhk....",
    "...khhhehhhHhhehhk...",
    "..khhhHhhetttehhhhk..",
    "..khhhhhtnnnthhHhhk..",
    ".khhhehtnnnnnthhhhhk.",
    ".khHhhhtooooothhHehk.",
    "kbbdbbbtoyyyotbdbbbbk",
    "kbdbBbbtoyyyotbBbdbbk",
    "kbBbdbbtoywyotbbdbBbk",
    "kdbbbdbtoyyyotdbbbdbk",
    "kkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: HUT,
};

/** Two more tusks, crossed over the roof: somebody lives here who matters. */
const TUSK_HUT_4: Art = {
  rows: [
    "....t...........t....",
    "....tt.........tt....",
    ".....tt.......tt.....",
    "......tt.....tt......",
    ".......tkkkkkt.......",
    "......kkssssskk......",
    ".....khhsssshhhk.....",
    "....khHhhhhehhhhk....",
    "...khhhehhhHhhehhk...",
    "..khhhHhhetttehhhhk..",
    "..khhhhhtnnnthhHhhk..",
    ".khhhehtnnnnnthhhhhk.",
    ".khHhhhtooooothhHehk.",
    "kbbdbbbtoyyyotbdbbbbk",
    "kbdbBbbtoyyyotbBbdbbk",
    "kbBbdbbtoywyotbbdbBbk",
    "kdbbbdbtoyyyotdbbbdbk",
    "kkkkkkkkkkkkkkkkkkkkk",
  ],
  palette: HUT,
};

const MAMMOTH_COAT = { k: WILD_K, h: "#6e4428", H: "#8e5a34", e: "#1a1010", t: "#f4ecd8" };

/** Going past, slowly. */
export const MAMMOTH: Art = {
  rows: [
    "..............kkkk.....",
    "...........kkkhhhhk....",
    ".........kkhhhhhhhhk...",
    ".......kkhhhhhhhhhhhk..",
    "....kkkhhhhhhhhhhehhk..",
    "..kkhhhhhhhhhhhhhhhhk..",
    ".khhhhhhhhHhhhHhhhhhk..",
    "khHhhhHhHhhhHhHhhhhhk..",
    "khhhHhHhhhHhHhhhHhhhk..",
    "khHhHhhhHhHhhhHhHthhkt.",
    "khHhhhHhHhhhHhHkkthhkt.",
    "khhhHhHhhhHhHhhk.kttt..",
    ".khhHhhkHHhhHhhHkkhhk..",
    ".khhkhhkkkhhkhhk..khhk.",
    "..kk.kk...kk.kk....kk..",
  ],
  palette: MAMMOTH_COAT,
};

/** With a calf at her side. */
const MAMMOTH_4: Art = {
  rows: [
    ".................kkkk.....",
    "..............kkkhhhhk....",
    "............kkhhhhhhhhk...",
    "..........kkhhhhhhhhhhhk..",
    ".......kkkhhhhhhhhhhehhk..",
    ".....kkkkkkkhhhhhhhhhhhk..",
    "....kkkhhhhhkHhhhHhhhhhk..",
    "...kkhhhhhehkhhHhHhhhhhk..",
    ".kkhhhhhhhhhkHhHhhhHhhhk..",
    "khHhHhhhHhhhkHhhhHhHthhkt.",
    "khhhHhHhhhhhkhhHhHkkthhkt.",
    "khHhhhHhHkhhkHhHhhk.kttt..",
    "khhhhhhhhkhhkhhHhhHkkhhk..",
    ".khhkkkhhkkkkhhkhhk..khhk.",
    "..kk...kk....kk.kk....kk..",
  ],
  palette: MAMMOTH_COAT,
};

/** Feet and paws in the snow, going the same way. */
export const SHARED_TRAIL: Art = {
  rows: [
    ".pp......q.q.",
    ".pp.......q..",
    ".pp..........",
    ".....pp..q.q.",
    ".....pp...q..",
    ".....pp......",
  ],
  palette: { p: "#9aaad0", q: "#8494c0" },
};
const SHARED_TRAIL_4 = grown(SHARED_TRAIL, ["q.q.....q.q", ".q.......q."], {});

const MOON = { m: "#f2ead0", M: "#fffaf0", c: "#d4c8a8" };

/** The moon, waxing. Its four marks are its phases. */
export const WOLF_MOON: Art = {
  rows: [
    ".......m.....",
    "........MM...",
    ".........mM..",
    ".........mmM.",
    ".........cmM.",
    ".........mmmM",
    ".........mmmM",
    ".........mmmM",
    ".........mcM.",
    ".........mmM.",
    ".........mM..",
    "........MM...",
    ".......m.....",
  ],
  palette: MOON,
};
const WOLF_MOON_QUARTER: Art = {
  rows: [
    "......mm.....",
    "......mmMM...",
    "......mmmmM..",
    "......mmmmmM.",
    "......mmmcmM.",
    "......mmmmmmM",
    "......mmmmmmM",
    "......mmcmmmM",
    "......mmmmcM.",
    "......mmmmmM.",
    "......cmmmM..",
    "......mmMM...",
    "......mm.....",
  ],
  palette: MOON,
};
const WOLF_MOON_GIBBOUS: Art = {
  rows: [
    "......mm.....",
    ".....mmmMM...",
    "....mmmmmmM..",
    "....mmmmmmmM.",
    "....cmmmmcmM.",
    "...mmmmmmmmmM",
    "...mmmmmmmmmM",
    "...cmmmmcmmmM",
    "....mcmmmmcM.",
    "....mmmmmmmM.",
    "....mmcmmmM..",
    ".....mmmMM...",
    "......mm.....",
  ],
  palette: MOON,
};
const WOLF_MOON_FULL: Art = {
  rows: [
    ".....mmm.....",
    "...mmmmmMM...",
    "..mmmmmmmmM..",
    ".mmmmmmmmmmM.",
    ".mmmcmmmmcmM.",
    "mmmmmmmmmmmmM",
    "mmmmmmmmmmmmM",
    "mmmcmmmmcmmmM",
    ".mmmmcmmmmcM.",
    ".mmmmmmmmmmM.",
    "..mmmmcmmmM..",
    "...mmmmmMM...",
    ".....mmm.....",
  ],
  palette: MOON,
};

const CAVE = {
  w: "#eef2fa", S: "#8a92aa", s: "#6a7088", k: WILD_K, n: "#1c1820", L: "#7a4e34", r: "#c0502c", a: "#2a2020",
  y: "#ffb04a", Y: "#fff0b0",
};

/** A mouth in the hill, a lamp inside, and the herd on the wall by the light of it. */
export const PAINTED_CAVE: Art = {
  rows: [
    "......wwwwwwwwwww......",
    "....wwwSssSsssSsswww...",
    "..wwSssssssssssssssSww.",
    ".wSsssssskkkkkksssssssw",
    ".Sssssskknnnnnnkksssss.",
    "Sssssskknnnnnnnnnksssss",
    "SsssskLnnnnnnnnnnLkssss",
    "SssskLLLLnnnnnnLLLLksss",
    "SsskLLrrLLLnnLLLaaLLkss",
    "SsskLrrrrLLLLLLaaaaLkss",
    "SsskLrLLrLLLLLLaLLaLkSs",
    "SsskLLLLLLLyyLLLLLLLkss",
    "SssskLLLLLyyYyLLLLLkSss",
    "SsssskkkkkkkkkkkkkkSsss",
    "sssssssssssssssssssssss",
  ],
  palette: CAVE,
};

/** In the corner, very small, a wolf. */
const PAINTED_CAVE_4: Art = {
  rows: [
    "........w..............",
    ".......wSw.............",
    "......wwwwwwwwwww......",
    "....wwwSssSsssSsswww...",
    "..wwSssssssssssssssSww.",
    ".wSsssssskkkkkksssssssw",
    ".Sssssskknnnnnnkksssss.",
    "Sssssskknnnnnnnnnksssss",
    "SsssskLnnnnnnnnnnLkssss",
    "SssskLLLLnnnnnnLLLLksss",
    "SsskLLrrLLLnnLLLLLaLkss",
    "SsskLrrrrLLLaaaaaaaLkss",
    "SsskLrLLrLLaLaLLLaLLkSs",
    "SsskLLLLLLLyyLLLLLLLkss",
    "SssskLLLLLyyYyLLLLLkSss",
    "SsssskkkkkkkkkkkkkkSsss",
    "sssssssssssssssssssssss",
  ],
  palette: CAVE,
};

const FURS = {
  k: WILD_K, p: "#7a5a3e", P: "#a07c56", w: "#e8e0d0", f: "#c89070", e: "#2a1a12", r: "#b0443a",
  g: "#8a8c98", G: "#b4b6c2", l: "#dcdce4", E: "#e8b84a",
};

/** Sat on a hide outside the hut, holding out a scrap. */
export const GRANDMOTHER: Art = {
  rows: [
    "..kkkkk...",
    ".kpppppk..",
    "kpppwwwk..",
    "kppwffek..",
    "kppwfffk..",
    ".kpwwwk...",
    "kpPpppppkk",
    "kppPpppfrr",
    "kpPpppppk.",
    "kppppPppk.",
    "kwwwwwwwk.",
    "kkkkkkkkk.",
  ],
  palette: FURS,
};

/** She knows its name. It's sat by her. */
const GRANDMOTHER_4: Art = {
  rows: [
    "..kkkkk.........",
    ".kpppppk........",
    "kpppwwwk........",
    "kppwffek........",
    "kppwfffk...k.k..",
    ".kpwwwk...kgkgk.",
    "kpPpppppkkfgggk.",
    "kppPpppppkfgEgkk",
    "kpPppppppkkggllk",
    "kppppPppkkgglkk.",
    "kwwwwwwwkkgglk..",
    "kkkkkkkkkkkkkk..",
  ],
  palette: FURS,
};

const WOLF_COAT = { k: WILD_K, g: "#8a8c98", G: "#b4b6c2", l: "#dcdce4", e: "#e8b84a", n: "#141418", p: "#8a8c98" };

/** A wolf, lying by the hut, chin on its paws. */
export const FIRST_WOLF: Art = {
  rows: [
    "..................",
    "............k.k...",
    "...........kgkgk..",
    ".....kkkkkkkggggk.",
    "kk..kGGgggggggegkk",
    "kgk.kgggggggggglll",
    ".kgkggggggggllllln",
    "..kkkkkkkkkkkkkkk.",
  ],
  palette: WOLF_COAT,
};

/** The tail has started to curl, and there's white coming through. Wolves don't do that. */
const FIRST_WOLF_CURL: Art = {
  rows: [
    "...kk.............",
    "..kkGk......k.k...",
    ".kGkkGk....kgkgk..",
    ".kGkkGkkkkkkgpggk.",
    "..kGGGgggppgggggek",
    "...kgggggppgggllln",
    "...kggggggggllllk.",
    "...kkkkkkkkkkkkkk.",
  ],
  palette: { ...WOLF_COAT, g: "#9a948c", G: "#c0bab0", p: "#e8e4dc" },
};

/** Sat up, because somebody said its name: an ear down, a curled tail, brown eyes. A dog. */
const FIRST_WOLF_CALLED: Art = {
  rows: [
    "........k.....",
    ".......kgkkk..",
    ".......kgpgGk.",
    "......kgpgegk.",
    "..kk..kggglln.",
    ".kGGkkGgglkkk.",
    ".kGkkGgggplk..",
    ".kGGGggggplk..",
    ".kkgggggggpk..",
    "..kgggggk.lk..",
    "..kGGGGGk.lk..",
    "..kkkkkkkkkk..",
  ],
  palette: { ...WOLF_COAT, g: "#b08a5e", G: "#d0aa7c", p: "#f4ead8", l: "#f4ead8", e: "#4a2a1a" },
};

// The wolves: the pack, long ago, which is what the dogs you hold are here. Side-on, where the pack
// everywhere else faces you, so it reads as a different animal. `p` is where a dog's patches would go:
// the same grey on a wolf, white on the coat that has turned into a dog.
const WOLF_TROT = [
  ".............k.k..",
  "............kgkgk.",
  "...kkkkkkkkkggggk.",
  "..kGGGGggggggggegk",
  ".kgggggppggggpllln",
  "kgkggggppgggpllkk.",
  "kk.kgggglllggglk..",
  "...d..g....d..g...",
  "..d...g...d....g..",
  "..k...k...k....k..",
];
const WOLF_RUN = [
  "..................",
  ".............k.k..",
  "............kgkgk.",
  "kkkkkkkkkkkkggggk.",
  "kGGGGGgggggggggegk",
  ".kggggppgggggpllln",
  "..kgggppggggpllkk.",
  "...kgglllggglk....",
  "..dg.........dg...",
  ".d.............dg.",
  "k................k",
];
const WOLF_SIT = [
  "......k.k...",
  ".....kgkgk..",
  ".....kgggk..",
  "....kgggegk.",
  "....kggglln.",
  "...kGgglkkk.",
  "..kGgggplk..",
  ".kGggggplk..",
  "kgggggggpk..",
  "kgggggk.lk..",
  "kGGGGGk.lk..",
  "kkkkkkkkkk..",
];
const WOLF_LOAF = [
  "............k.k...",
  "...........kgkgk..",
  "...........kggggk.",
  ".....kkkkkkkgggegk",
  "kk..kGGgggggggllln",
  "kgk.kggpggggpkkkk.",
  ".kgkgggpggggllllk.",
  "..kkkkkkkkkkkkkkk.",
];
const WOLF_SLEEP = [
  "..................",
  "..................",
  "..................",
  ".....kkkkkkk..k.k.",
  "kk..kGGggggggkgkgk",
  "kgk.kggpgggggggkgk",
  ".kgkgggpggggkllllk",
  "..kkkkkkkkkkkkkkkk",
];
/** Small, and jumping at whatever you tapped. */
const WOLF_PUP_ROWS = [
  "......k.k..",
  ".....kgkgk.",
  "kkkkkkggek.",
  "kGgggggglln",
  ".kgggggkkk.",
  ".kd.d.dk...",
];
const WOLF_TROT_B = [...WOLF_TROT.slice(0, 7), "....dg......dg....", "....dg......dg....", "....kk......kk...."];
const WOLF_RUN_B = [...WOLF_RUN.slice(0, 8), ".....dgg..dg......", "......dg.dg.......", "......kk.kk......."];
const WOLF_SIT_B = [...WOLF_SIT.slice(0, 9), "kgggggk.lk..", "kgggggGklk..", "kkkkkkkkkk.."];

/** Grey, pale and dark wolves; and last, the coat a wolf has once it's a dog. */
const WOLF_COATS: readonly Record<string, string>[] = [
  { g: "#8a8c98", G: "#b4b6c2", l: "#dcdce4", d: "#5c5e6c" },
  { g: "#c4c2c0", G: "#e4e2de", l: "#f4f2ee", d: "#8a8682" },
  { g: "#5e5a62", G: "#7e7a84", l: "#b4b0b8", d: "#3a3840" },
  { g: "#c08a50", G: "#dcae74", l: "#f4ead8", d: "#7a5430", p: "#f4ead8", e: "#4a2a1a" },
];
/** Which of `WOLF_COATS` is the dog. */
export const DOG_COAT = WOLF_COATS.length - 1;

function wolf(rows: readonly string[], coat: number, left: boolean): Art {
  const c = WOLF_COATS[coat]!;
  return { rows: left ? flip(rows) : [...rows], palette: { k: WILD_K, e: "#e8b84a", n: "#141418", p: c.g!, ...c } };
}

/** The same poses as `PACK_POSES`, indexed by `POSE`, for the wolves. `newborn` is a pup. */
export const WOLF_POSES: readonly (readonly (readonly Art[])[])[] = WOLF_COATS.map((_, coat) =>
  [false, true].map((left) =>
    [WOLF_TROT, WOLF_TROT_B, WOLF_SIT, WOLF_SIT_B, WOLF_LOAF, WOLF_PUP_ROWS, WOLF_SLEEP, WOLF_RUN, WOLF_RUN_B].map((rows) => wolf(rows, coat, left)),
  ),
);

/** A wolf pup, mid-leap: what a tap turns up, long ago. */
export const WOLF_PUP: Art = wolf(WOLF_PUP_ROWS, 0, false);

/** A hundred diggers in: two lamps and a gold hat. */
const DIGGER_4: Art = {
  rows: [
    ".ltttl.",
    ".ttttt.",
    "pptttpp",
    ".pepep.",
    ".ppmpp.",
    "..pmp..",
    ".ppppp.",
    "ppppppp",
    ".ppppp.",
    ".p...p.",
    ".k...k.",
  ],
  palette: { k: K, t: "#e0c04a", l: "#fff4c0", p: "#c98b4b", m: "#f4e6cc", e: K },
};

// --- The way home: what the pack finds between the tunnel and the bridge ---
// Out the back of the estate, the canal out of town, the fire at the edge of the woods, the hill.

/** The hundredth of anything: the same thing, with a glint on it. */
const GLINT = ["..y..", ".yly.", "..y.."] as const;
const GLINT_PAINT = { y: "#ffd166", l: "#fff4c0" } as const;
const glinting = (art: Art): Art => grown(art, GLINT, GLINT_PAINT);

/** Lid up, it's dinner. Lid down, it's somewhere to be. */
export const WHEELIE_BIN: Art = {
  rows: [
    ".kkkkkkk.",
    "kgggggggk",
    "kkkkkkkkk",
    ".kdddddk.",
    ".kdldddk.",
    ".kdldddk.",
    ".kdddddk.",
    ".kdddddk.",
    ".kdddddk.",
    ".kdddddk.",
    ".kkkkkkk.",
    ".o.....o.",
  ],
  palette: { k: K, g: "#5a8a6a", d: "#3f6b5e", l: "#7fbfa8", o: "#2a2228" },
};

/** Whites, a paper hat, and a tray on the way out. The first kind person in the game. */
export const FRY_COOK: Art = repaint(KENNEL_HAND, { t: "#f4f0e8", b: "#e8e2d4", v: "#3a3a48" });

/** A builder's skip, full of somebody's kitchen. */
export const SKIP_FULL: Art = {
  rows: [
    "....m..w.....b....",
    "kkkkkkkkkkkkkkkkkk",
    "kddddddddddddddddk",
    ".kyyyyyyyyyyyyyyk.",
    ".kyylyyyyyyyyyyyk.",
    "..kyyyyyyyyyyyyk..",
    "..kyyyyyyyyyyyyk..",
    "..kyyyyyyyyyyyyk..",
    "...kkkkkkkkkkkk...",
    "...kk........kk...",
  ],
  palette: { k: K, y: "#d8a33a", d: "#8a6420", l: "#f4d27a", m: "#a8b0b8", w: "#f2e3c8", b: "#8a5a3a" },
};

/** On the wall behind the units, and it drips. */
export const WALL_TAP: Art = {
  rows: [
    "kkk....",
    "kmkkk..",
    "kmmmk..",
    "kkkmk..",
    "...k...",
    "...b...",
    ".......",
    ".kbbbk.",
    ".kbbbk.",
    "..kkk..",
  ],
  palette: { k: K, m: "#a8b0b8", b: "#6ab8e0" },
};

/** Chain-link, peeled back at the corner. */
export const FENCE_HOLE: Art = {
  rows: [
    "k.............k",
    "kwwwwwwwwwwwwwk",
    "kx.x.x.x.x.x.xk",
    "k.x.x.x.x.x.x.k",
    "kx.x.x.x.x.x.xk",
    "k.x.x.x.x.x.x.k",
    "kx.x.x.....x.xk",
    "k.x.x.......x.k",
    "kx.x.........xk",
    "k.x..........xk",
    "kx.x........x.k",
    "k.............k",
  ],
  palette: { k: "#5b4f58", w: "#c4ccd2", x: "#9aa4ac" },
};

/** The scrapyard's Alsatian, on its chain, saying nothing. */
export const YARD_DOG: Art = {
  rows: [
    "..k...k.............",
    ".kbk.kbk............",
    ".kbbkbbk............",
    ".kttttttk...........",
    "kttettetk...........",
    "kttttttttk..........",
    "nntttttttk..........",
    ".kkkttttk...........",
    "...kttttkk..........",
    "...ktttbbbkk........",
    "...kttbbbbbbkk......",
    "...kttbbbbbbbbk.....",
    "...kttbbbbbbbbbk....",
    "...ktttbbbbbbbbk....",
    "...kttttbbbbbtbk..cc",
    "...kttkttbbbttbkcc..",
    "...kttkttkkkttbk....",
    "...kkkkkkk.kkkkk....",
  ],
  palette: { k: "#241a20", t: "#c08a50", b: "#4a3c40", e: "#1c1218", n: "#1a1418", c: "#9aa4ac" },
};

/** Flask, rope, magnet. */
export const MAGNET_FISHER: Art = repaint(KENNEL_HAND, { t: "#5a7a4a", b: "#6a7a4a", v: "#3a3a30" });

/** A shopping trolley in the shallows, grown over. */
export const TROLLEY: Art = {
  rows: [
    "m..........",
    "mmmmmmmmmm.",
    ".mxmxmxmxm.",
    ".mmmmmmmmm.",
    ".mxmxmxmxm.",
    "..mmmmmmm..",
    "..g.g.g.g..",
    ".ggggggggg.",
  ],
  palette: { m: "#a8b0b8", x: "#6f7880", g: "#4f8f5a" },
};

/** Moored, stove lit, hatch open. */
export const NARROWBOAT: Art = {
  rows: [
    ".......c......................",
    ".....kkkkkkkkkkkkkkkkkkk......",
    ".....krrrrrrrrrrrrrrrrrk..k...",
    ".....krwwrrwwrrwwrrrddrk..k...",
    ".....krwwrrwwrrwwrrrddrk.kk...",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    ".kgggggggggggggggggggggggggk..",
    "..kgyyyyyyyyyyyyyyyyyyyyygk...",
    "...kkkkkkkkkkkkkkkkkkkkkkk....",
  ],
  palette: { k: K, r: "#a83a3a", w: "#ffd88a", d: "#3a5a4a", g: "#2f4a44", y: "#d8a33a", c: "#2a2228" },
};

/** Under the bridge: brick, and a scratch for each generation, all at the same height. */
export const BRIDGE_HOLE: Art = {
  rows: [
    "bbbmbbbmb",
    "mbbbmbbbm",
    "bwbwbwbmb",
    "mwbwbwbbm",
    "bwbwbwbmb",
    "mbbbmbbbm",
    "bbbmbbbmb",
  ],
  palette: { b: "#8a4a3a", m: "#6a3a30", w: "#e8d8c0" },
};

/** On the roof of the last boat. Very big, very grey, going the same way. */
export const BOAT_DOG: Art = {
  rows: [
    "..............k.k.",
    ".............kgkgk",
    "....kkkkkkkkkggegk",
    "..kkgggggggggggggn",
    ".kgggggggggggggkk.",
    "kgglggggggglgggk..",
    "kgkkgggkkkkkggkk..",
    ".k..kkk.....kk....",
  ],
  palette: { k: "#3a3440", g: "#8a8490", l: "#6a6470", e: "#ffd166", n: "#1a1418" },
};

/** In a sleeping bag, feeding the fire. */
export const CAMPER: Art = repaint(FIRE_KEEPER, { h: "#c0392f", p: "#4a6a8a", P: "#6a8ab0", s: "#3a4a6a", l: "#4a5a6a" });

/** One more goes up for every generation that came through. */
export const TENT: Art = {
  rows: [
    "......k......",
    ".....ktk.....",
    "....kttdk....",
    "...kttoddk...",
    "..kttooodk...",
    ".kttoooodddk.",
    "ktttooooddddk",
    "kkkkkkkkkkkkk",
  ],
  palette: { k: K, t: "#5a8a5a", d: "#3f6b4a", o: "#2a2018" },
};

/** Out all night with a crook and a flask, counting. */
export const SHEPHERD: Art = repaint(SKY_HERDER, { h: "#5a4030", f: "#e8bb8e", r: "#6a7a4a", c: "#c8b080" });

/** Lie along the lee side and the wind goes over the top. */
export const STONE_WALL: Art = {
  rows: [
    ".ssSsssSssSssss.",
    "sSssSsssSsssSsss",
    "ssSsssSssSsssSss",
    "SsssSsssSssSssss",
    "ssSssSsssSsssSss",
    "kkkkkkkkkkkkkkkk",
  ],
  palette: { s: "#6a6a78", S: "#9a9aa8", k: "#2a2a38" },
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
  fold: [HEM_HOLLOW, repaint(HEM_HOLLOW, { l: "#c8a878" }), repaint(HEM_HOLLOW, { d: "#6a5a50", l: "#a89888" }), glinting(HEM_HOLLOW)],
  well: [DOWN_WELL, repaint(DOWN_WELL, { m: "#c8963c" }), repaint(DOWN_WELL, { m: "#cfd6dc", g: "#b6f2fb" }), glinting(DOWN_WELL)],
  chorus: [CHORUS_FIGURE, repaint(CHORUS_FIGURE, { p: "#a8c0d8", m: "#dceaf4" }), repaint(CHORUS_FIGURE, { p: "#d8c894", m: "#f4ecd0" }), glinting(CHORUS_FIGURE)],
  // Drawn as a figure, so its marks recolour the kit rather than changing the shape.
  deephand: [SHAFT_CREW, repaint(SHAFT_CREW, { t: "#4f8f7a", l: "#b6f2fb" }), repaint(SHAFT_CREW, { t: "#c0392f", l: "#fff0b8" }), DIGGER_4],
  face: [FLEECE_FACE, repaint(FLEECE_FACE, { w: "#f4e6c0" }), repaint(FLEECE_FACE, { w: "#c8a878" }), glinting(FLEECE_FACE)],
  main: [SEAM_MAIN, repaint(SEAM_MAIN, { m: "#c8963c" }), repaint(SEAM_MAIN, { m: "#cfd6dc", o: "#c0392f" }), glinting(SEAM_MAIN)],
  heart: [WARM_HEART, repaint(WARM_HEART, { b: "#e0a8c0" }), repaint(WARM_HEART, { b: "#e0c04a", p: "#e2b077" }), glinting(WARM_HEART)],
  second: [
    SECOND_CHIHUAHUA,
    repaint(SECOND_CHIHUAHUA, { p: "#d69a58", l: "#f0c68c" }),
    repaint(SECOND_CHIHUAHUA, { p: "#e0c04a", l: "#f7e08a", d: "#8a6a1c" }),
    SECOND_CHIHUAHUA_4,
  ],
  echo: [WHEELIE_BIN, repaint(WHEELIE_BIN, { g: "#4a6a9a", d: "#3a4f7a", l: "#8aa8d8" }), repaint(WHEELIE_BIN, { g: "#8a5a3a", d: "#6a4028", l: "#c89a6a" }), glinting(WHEELIE_BIN)],
  kin: [FRY_COOK, repaint(FRY_COOK, { b: "#f4e8c0" }), repaint(FRY_COOK, { b: "#ffd166", t: "#ffffff" }), glinting(FRY_COOK)],
  grove: [SKIP_FULL, repaint(SKIP_FULL, { y: "#4f8f7a", d: "#3f6b5e", l: "#7fbfa8" }), repaint(SKIP_FULL, { y: "#c0504a", d: "#7a2a28", l: "#f08a80" }), glinting(SKIP_FULL)],
  tide: [WALL_TAP, repaint(WALL_TAP, { m: "#c8963c" }), repaint(WALL_TAP, { m: "#e0c04a", b: "#a8e0f8" }), glinting(WALL_TAP)],
  beacon: [FENCE_HOLE, repaint(FENCE_HOLE, { x: "#b8c0c8" }), repaint(FENCE_HOLE, { x: "#e0c04a", w: "#fff4c0" }), glinting(FENCE_HOLE)],
  third: [YARD_DOG, repaint(YARD_DOG, { t: "#d8a868" }), repaint(YARD_DOG, { t: "#e0b878", b: "#5a4a40", c: "#ffd166" }), glinting(YARD_DOG)],
  spark: [
    SUNK_BALL,
    repaint(SUNK_BALL, { y: "#f08a5a", w: "#fff0e0" }),
    repaint(SUNK_BALL, { y: "#e0c04a", w: "#fff8d0", k: "#3a2a10" }),
    SUNK_BALL_4,
  ],
  kith: [MAGNET_FISHER, repaint(MAGNET_FISHER, { b: "#8a6a4a" }), repaint(MAGNET_FISHER, { b: "#c9a24a", t: "#c0392f" }), glinting(MAGNET_FISHER)],
  loom: [TROLLEY, repaint(TROLLEY, { g: "#6aa85a" }), repaint(TROLLEY, { m: "#c8963c", g: "#8ac86a" }), glinting(TROLLEY)],
  vault: [NARROWBOAT, repaint(NARROWBOAT, { r: "#3a6a8a", y: "#e0e0d0" }), repaint(NARROWBOAT, { r: "#3f6b4a", y: "#ffd166", w: "#fff4c0" }), glinting(NARROWBOAT)],
  crown: [BRIDGE_HOLE, repaint(BRIDGE_HOLE, { w: "#fff4d0" }), repaint(BRIDGE_HOLE, { w: "#ffd166", b: "#9a5a4a" }), glinting(BRIDGE_HOLE)],
  fourth: [BOAT_DOG, repaint(BOAT_DOG, { g: "#a8a0a8" }), repaint(BOAT_DOG, { g: "#c8a070", l: "#a88050", k: "#4a3828" }), glinting(BOAT_DOG)],
  dawn: [
    DAWN_FIRE,
    repaint(DAWN_FIRE, { f: "#ff5a2c", y: "#ffd86a" }),
    repaint(DAWN_FIRE, { f: "#ffb04a", y: "#fff0a0", s: "#9a8a78" }),
    DAWN_FIRE_4,
  ],
  elder: [CAMPER, repaint(CAMPER, { p: "#8a4a2c", P: "#b06a3c" }), repaint(CAMPER, { p: "#5a8a5a", P: "#8ab87a", h: "#ffd166" }), glinting(CAMPER)],
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
  hearth: [TENT, repaint(TENT, { t: "#c0704a", d: "#8a4a30" }), repaint(TENT, { t: "#4a7ab0", d: "#3a5a8a" }), glinting(TENT)],
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
  wisp: [SHEPHERD, repaint(SHEPHERD, { r: "#8a6a4a" }), repaint(SHEPHERD, { r: "#4a6a8a", c: "#ffd166" }), glinting(SHEPHERD)],
  veil: [STONE_WALL, repaint(STONE_WALL, { s: "#7a7a70", S: "#a8a898" }), repaint(STONE_WALL, { s: "#8a7a68", S: "#c8b898" }), glinting(STONE_WALL)],
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
  loam: [
    OPEN_GATE,
    repaint(OPEN_GATE, { w: "#e8d0a0", g: "#7ab858" }),
    repaint(OPEN_GATE, { w: "#ffd166", g: "#8ad868", l: "#e8ffb0" }),
    OPEN_GATE_4,
  ],
  drone: [
    PARK_THROWER,
    repaint(PARK_THROWER, { b: "#4a8ac0" }),
    repaint(PARK_THROWER, { b: "#ffd166", h: "#a8792c" }),
    PARK_THROWER_4,
  ],
  moss: [
    SHADE_TREE,
    repaint(SHADE_TREE, { g: "#6a9a3a", l: "#a8c858" }),
    repaint(SHADE_TREE, { g: "#c9a24a", l: "#ffd166" }),
    SHADE_TREE_4,
  ],
  mire: [
    PADDLING_POOL,
    repaint(PADDLING_POOL, { w: "#a0c0f0", b: "#6ad0d8" }),
    repaint(PADDLING_POOL, { w: "#ffd166", b: "#a8e8f0", l: "#ffffff" }),
    PADDLING_POOL_4,
  ],
  kinship: [
    SNIFF_DOG,
    repaint(SNIFF_DOG, { b: "#8a6a4a" }),
    repaint(SNIFF_DOG, { b: "#e0d0b0", t: "#c8b890" }),
    SNIFF_DOG_4,
  ],
  sixth: [
    SIXTH_CHIHUAHUA,
    repaint(SIXTH_CHIHUAHUA, { b: "#d8b890" }),
    repaint(SIXTH_CHIHUAHUA, { b: "#fff0c0", e: "#402e3a" }),
    SIXTH_CHIHUAHUA_4,
  ],
  flame: [
    GOOD_POST,
    repaint(GOOD_POST, { w: "#d8d0c0", y: "#ffb04a" }),
    repaint(GOOD_POST, { w: "#ffd166", y: "#ffffff", t: "#a8792c" }),
    GOOD_POST_4,
  ],
  servant: [
    NIGHT_WALKER,
    repaint(NIGHT_WALKER, { c: "#6a4a4a", h: "#5a3a3a" }),
    repaint(NIGHT_WALKER, { c: "#a8792c", h: "#c9a24a" }),
    NIGHT_WALKER_4,
  ],
  lid: [
    STILE,
    repaint(STILE, { w: "#7a8a60" }),
    repaint(STILE, { w: "#c9a24a" }),
    STILE_4,
  ],
  broth: [
    STREAM,
    repaint(STREAM, { b: "#3a8ab0" }),
    repaint(STREAM, { b: "#6ac8e0", l: "#ffffff", s: "#c9a24a" }),
    STREAM_4,
  ],
  heirs: [
    PAW_PRINTS,
    repaint(PAW_PRINTS, { p: "#a8c0d8" }),
    repaint(PAW_PRINTS, { p: "#ffd166" }),
    PAW_PRINTS_4,
  ],
  seventh: [
    SEVENTH_CHIHUAHUA,
    repaint(SEVENTH_CHIHUAHUA, { c: "#4a6a8a" }),
    repaint(SEVENTH_CHIHUAHUA, { c: "#c04a4a", b: "#fff0c0" }),
    SEVENTH_CHIHUAHUA_4,
  ],
  crumb: [
    DOORMAT,
    repaint(DOORMAT, { b: "#b0705a", d: "#7a4030" }),
    repaint(DOORMAT, { b: "#c9a24a", d: "#fff4c0" }),
    DOORMAT_4,
  ],
  guest: [
    HOUSE_CAT,
    repaint(HOUSE_CAT, { b: "#c88a3a" }),
    repaint(HOUSE_CAT, { b: "#2a2a34", e: "#ffd166" }),
    HOUSE_CAT_4,
  ],
  grace: [
    LEFT_ON_LIGHT,
    repaint(LEFT_ON_LIGHT, { y: "#ffc04a" }),
    repaint(LEFT_ON_LIGHT, { y: "#fff4c0", s: "#c9a24a" }),
    LEFT_ON_LIGHT_4,
  ],
  feast: [
    FULL_BOWL,
    repaint(FULL_BOWL, { s: "#4a8ac0", l: "#90c0f0" }),
    repaint(FULL_BOWL, { s: "#ffd166", l: "#fff4c0", n: "#a8792c" }),
    FULL_BOWL_4,
  ],
  house: [
    HEIGHT_CHART,
    repaint(HEIGHT_CHART, { w: "#e0e8f0" }),
    repaint(HEIGHT_CHART, { w: "#fff4d0", p: "#a8792c" }),
    HEIGHT_CHART_4,
  ],
  whole: [
    GOOD_DOG,
    repaint(GOOD_DOG, { b: "#d8a868", p: "#4a8ac0" }),
    repaint(GOOD_DOG, { b: "#ecc488", p: "#ffd166" }),
    GOOD_DOG_4,
  ],
  flint: [
    FLINT_SCRAP,
    repaint(FLINT_SCRAP, { f: "#626a80", F: "#d0d8ec" }),
    repaint(FLINT_SCRAP, { r: "#c84a3a", R: "#ff9a80", F: "#e0e6f4" }),
    FLINT_SCRAP_4,
  ],
  ochre: [OCHRE_HAND, repaint(OCHRE_HAND, { r: "#a83a24", o: "#c86040" }), OCHRE_PAW, OCHRE_PAW_4],
  cairn: [BONE_WINDBREAK, repaint(BONE_WINDBREAK, { b: "#ece4cc", d: "#7a6c54" }), BONE_WINDBREAK_TALL, BONE_WINDBREAK_4],
  tusk: [
    TUSK_HUT,
    repaint(TUSK_HUT, { h: "#9a6a40", H: "#c89a68" }),
    repaint(TUSK_HUT, { h: "#9a6a40", H: "#c89a68", y: "#ffe080", o: "#ff9a4a" }),
    TUSK_HUT_4,
  ],
  herd: [
    MAMMOTH,
    repaint(MAMMOTH, { h: "#7a4a2a", H: "#a06a3c" }),
    repaint(MAMMOTH, { h: "#5e3a22", H: "#8a5a34", t: "#fffaf0" }),
    MAMMOTH_4,
  ],
  trail: [SHARED_TRAIL, repaint(SHARED_TRAIL, { p: "#8898c4" }), repaint(SHARED_TRAIL, { p: "#7888b8", q: "#6878a8" }), SHARED_TRAIL_4],
  moon: [WOLF_MOON, WOLF_MOON_QUARTER, WOLF_MOON_GIBBOUS, WOLF_MOON_FULL],
  cave: [
    PAINTED_CAVE,
    repaint(PAINTED_CAVE, { y: "#ffd070", Y: "#ffffff", L: "#8a5a3c" }),
    repaint(PAINTED_CAVE, { y: "#ffd070", Y: "#ffffff", L: "#8a5a3c", r: "#e06030", a: "#141010" }),
    PAINTED_CAVE_4,
  ],
  ancestor: [
    GRANDMOTHER,
    repaint(GRANDMOTHER, { p: "#6a4a32", P: "#9a7450", w: "#f4f0e8" }),
    repaint(GRANDMOTHER, { p: "#8a6444", P: "#c09a6c", w: "#ffffff" }),
    GRANDMOTHER_4,
  ],
  eighth: [FIRST_WOLF, repaint(FIRST_WOLF, { g: "#9a948c", G: "#c0bab0" }), FIRST_WOLF_CURL, FIRST_WOLF_CALLED],
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

/** An open gate in the dark, and grass through it. */
export const CUT_PARK_GATE: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkwwkkkkkkkkkkkkwwkkkkkkkkk",
    "kkkkkkwwwwkkkkkkkkkkwwwwkkkkkkkk",
    "kkkkkkkwwkyyyyyyyyyykwwkkkkkkkkk",
    "kkkkkkkwwkyyyyyyyyyykwwkkkwwkkkk",
    "kkkkkkkwwkyyysssyyyykwwkwwkkkkkk",
    "kkkkkkkwwkyyyssssyyykwwwkkkkkkkk",
    "kkkkkkkwwkyyyyyyyyyykwwkkwwkkkkk",
    "kkkkkkkwwkggggggggggkwwwwkkkkkkk",
    "kkkkkkkwwkgggllggggglwwkkkkkkkkk",
    "kkkkkkkwwggggggggllggwwkkkkkkkkk",
    "kkkkkgggggggggggggggggggggkkkkkk",
    "kkkgggggllgggggggggggggggggggkkk",
    "kggggggggggggggggggllgggggggggkk",
  ],
  palette: { k: "#1a1a2a", w: "#f7ecd8", y: "#ffd890", s: "#fff4c0", g: "#5a9a4a", l: "#a4d868" },
};

/** A hill at night, and one light at the top of it. */
export const CUT_FAR_LIGHT: Art = {
  rows: [
    "................................",
    ".....s..............s...........",
    ".............ww...........s.....",
    "............wwww................",
    ".s..........wwww.........s......",
    ".............ww.................",
    "...............kk...............",
    "......s.......kyyk..............",
    "..............kkkk..............",
    "............hhhhhhhh............",
    ".........hhhhhhhhhhhhhh.........",
    ".......hhhhhhhhhhhhhhhhhh.......",
    "....hhhhhhhhhhhhhhhhhhhhhhhh....",
    ".hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.",
  ],
  palette: { s: "#c8c8ff", w: "#e8e8d0", k: "#3a3040", y: "#ffd166", h: "#2a3a5a" },
};

/** A front door, and the light on. */
export const CUT_FRONT_DOOR: Art = {
  rows: [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkyyyykkkkkkkkkkkk",
    "kkkkkkkkkkkkwwwwkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkbbbbbbbbbbbbbbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbddyyyyyyyyddbkkkkkkk",
    "kkkkkkkbddyyyyyyyyddbkkkkkkk",
    "kkkkkkkbddyyyyyyyyddbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbdddddddddddwbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkkkbddddddddddddbkkkkkkk",
    "kkkkkmmmmmmmmmmmmmmmmmmkkkkk",
    "kkkssssssssssssssssssssssskk",
  ],
  palette: { k: "#1a1a2e", y: "#ffd890", w: "#fff8e0", b: "#f0e4cc", d: "#7a2a2a", m: "#a88a58", s: "#6a6070" },
};

/** The way out: chain-link, and the hole in it, and a star through the hole. */
export const CUT_FENCE: Art = {
  rows: [
    "kwwwwwwwwwwwwwwwwwwwwwwk",
    "kxdxdxdxdxdxdxdxdxdxdxdk",
    "kdxdxdxdxdxdxdxdxdxdxdxk",
    "kxdxdxdxdxdxdxdxdxdxdxdk",
    "kdxdxdxdxdxdxdxdxdxdxdxk",
    "kxdxdxdxdxdxdxdxdxdxdxdk",
    "kdxdxdxdxnwnwnwdxdxdxdxk",
    "kxdxdxdxnwnnnnnwdxdxdxdk",
    "kdxdxdxnnnnnnnsnwdxdxdxk",
    "kxdxdxnwnnnnnnnnnwdxdxdk",
    "kdxdxdwnnnnnnnnnwnxdxdxk",
    "kxdxdxnwnnnnnnnnnwdxdxdk",
    "kdxdxdxnnnnnnnnnwdxdxdxk",
    "kxdxdxdxnwnnnnnwdxdxdxdk",
    "kdxdxdxdxnwnwnwdxdxdxdxk",
    "kxdxdxdxdxdxdxdxdxdxdxdk",
    "kdxdxdxdxdxdxdxdxdxdxdxk",
    "kxdxdxdxdxdxdxdxdxdxdxdk",
  ],
  palette: { k: "#5b4f58", w: "#c4ccd2", x: "#8a949c", d: "#141224", n: "#0c0a1a", s: "#fff4c0" },
};

/** A wolf, head-on, in the snow. */
export const CUT_WOLF: Art = {
  rows: [
    "s.kk................kk.s",
    "..kgk..s...........kgk..",
    "..kgik........s...kigk..",
    ".kggiik..........kiiggk.",
    ".kggiigk........kgiiggk.",
    ".kgggiggkkkkkkkkggigggk.",
    "kgggggggGGGggGGGgggggggk",
    "kgggggggGGGllGGGgggggggk",
    "kgggkkkkgGllllGgkkkkgggk",
    "kggkeeeekgllllgkeeeekggk",
    "kggkewnekgllllgkenwekggk",
    "kGggkkkkggllllggkkkkggGk",
    "kGGggggglllmmlllgggggGGk",
    ".kGGgggglllmmlllggggGGk.",
    ".kGGGgggllmmmmllgggGGGk.",
    "..kGGGglllmnnmlllgGGGk..",
    "...kGGGlllmnnmlllGGGk...",
    "....kkGllmmmmmmllGkk....",
    "......kkllllllllkk......",
    "........kkkkkkkk..s.....",
  ],
  palette: { k: "#1e2032", g: "#8a8c9c", G: "#c8cad4", i: "#c8a0a8", l: "#e4e4ec", m: "#fafaff", e: "#f0b030", w: "#ffffff", n: "#141418", s: "#eef2fa" },
};

/** The same wolf, close to: brown eyes, and an ear that has given up. */
export const CUT_WOLF_SOFT: Art = {
  rows: [
    "s.kk...................s",
    "..kgk..s................",
    "..kgik........s.........",
    ".kggiik.............kkk.",
    ".kggiigk...........kgggk",
    ".kgggiggkkkkkkkkggkgiigk",
    "kgggggggGGGggGGGgggggggk",
    "kgggggggGGGllGGGgggggggk",
    "kgggkkkkgGllllGgkkkkgggk",
    "kggkbbbbkgllllgkbbbbkggk",
    "kggkbwnbkgllllgkbnwbkggk",
    "kGggkkkkggllllggkkkkggGk",
    "kGGggggglllmmlllgggggGGk",
    ".kGGgggglllmmlllggggGGk.",
    ".kGGGgggllmmmmllgggGGGk.",
    "..kGGGglllmnnmlllgGGGk..",
    "...kGGGlllmnnmlllGGGk...",
    "....kkGllmmmmmmllGkk....",
    "......kkllllllllkk......",
    "........kkkkkkkk..s.....",
  ],
  palette: { ...CUT_WOLF.palette, b: "#7a4a2a" },
};
