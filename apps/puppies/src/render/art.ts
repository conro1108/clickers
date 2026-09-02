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

/** The one tree, and it is a lollipop on purpose. */
export const TREE: Art = {
  rows: [
    "....kkkkkk......",
    "..kkgglgggkk....",
    ".kgglllggggk....",
    "kglllfgglggggk..",
    "kglllggglllgggk.",
    "kgglgggfgglllgk.",
    ".kggggggggglgk..",
    "kkgglfggggggkk..",
    "kglgggggglggk...",
    "kgglggggfggk....",
    ".kkggglggkk.....",
    "...kkgggkk......",
    "......ktb.......",
    ".....kttb.......",
    ".....kttbk......",
  ],
  palette: { k: K, g: "#5fa34a", l: "#8cc76a", t: "#8a6242", b: "#68472c", f: "#f7d3e2" },
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

/** One tileable panel of chain-link. */
export const FENCE: Art = {
  rows: [
    "pkkkkkkk",
    "pmmmmmmm",
    "pn.n.n.n",
    "p.n.n.n.",
    "pn.n.n.n",
    "p.n.n.n.",
    "pn.n.n.n",
    "pkkkkkkk",
  ],
  palette: { k: K, p: "#6e7780", m: "#b4bcc2", n: "#ccd4da" },
};

/** The yard light, on its post by the gate. */
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

/** One chihuahua sitting in its straw. */
export const PEN_PUP: Art = {
  rows: [
    "g.....g",
    "ggg.ggg",
    ".ggggg.",
    "gsgggsg",
    ".glllg.",
    "ddddddd",
  ],
  palette: { g: "#c98b4b", l: "#f4e6cc", s: "#402e3a", d: "#c9a86a" },
};

const SCRUFFY = new Map<Art, Art>();

/** The same pen, gone to seed. */
export function scruffy(art: Art): Art {
  const hit = SCRUFFY.get(art);
  if (hit) return hit;
  const dusty: Art = {
    rows: art.rows,
    palette: { ...art.palette, g: "#8f7f68", l: "#a89a83", s: "#6b5f4e", d: "#8a8168", w: "#cdc7b6" },
  };
  SCRUFFY.set(art, dusty);
  return dusty;
}

const SHRUNK = new Map<Art, Art>();

/** The same thing, half the size, for the ranks of the property that stand further back than the near one. */
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

const GROWTH_STAGES = new Map<Art, Art[]>();

/** A bed part-grown: four stages from just-planted to ready to lift. */
export function growthStages(art: Art): readonly Art[] {
  const hit = GROWTH_STAGES.get(art);
  if (hit) return hit;

  const rows = art.rows;
  const n = rows.length;
  const slice = (from: number): Art => ({ rows: rows.slice(from), palette: art.palette });

  // Ready: more of them, showing pale through the straw at the base.
  const base = rows[n - 1] ?? "";
  const lifted = [...base].map((c, i) => (c !== "." && i % 2 === 1 ? "o" : c)).join("");
  const ripe: Art = {
    rows: [...rows.slice(0, n - 1), lifted],
    palette: { ...art.palette, o: "#e2b077" },
  };

  const stages = [slice(n - 3), slice(Math.max(1, Math.floor(n * 0.4))), art, ripe];
  GROWTH_STAGES.set(art, stages);
  return stages;
}

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

/** One bunting flag. */
export const FLAG: Art = {
  rows: ["ffff", ".fff", ".ff.", "..f."],
  palette: { f: "#ffffff" },
};

/** Four flags' worth of colour, cycled along the run. */
export const BUNTING = ["#e8697d", "#f2c14e", "#5fb0d8", "#7fc96a"] as const;

/** A heart, for when you whistle one up. */
export const HEART: Art = {
  rows: [".h.h.", "hhhhh", ".hhh.", "..h.."],
  palette: { h: "#f2718c" },
};

export const BASKET: Art = {
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

/** A lamp on a post, throwing down rather than a heat lamp throwing up. */
export const HEAT_LAMP: Art = {
  rows: [
    "..kkmmmkk....",
    "...kmmmk.....",
    "....aaa......",
    "...a.a.a.....",
    "..a..a..a....",
    "......m......",
    "......m......",
    "......m......",
    "....kkkkk....",
    "...kkkkkkk...",
  ],
  palette: { k: K, m: "#a8b0b8", a: "#ffb347" },
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
/** Straw Bedding: a bigger dog, and twice as much under it. */
const PEN_PUP_2: Art = {
  rows: [
    "g......g",
    "ggg..ggg",
    ".gggggg.",
    "gsggggsg",
    ".gllllg.",
    "dddddddd",
    "dddddddd",
  ],
  palette: PEN_PUP.palette,
};

/** Underfloor Heating: the warm comes up through the straw. */
/** Underfloor Heating: the warm comes up through the straw. */
const PEN_PUP_3: Art = {
  rows: [
    "g......g",
    "ggg..ggg",
    ".gggggg.",
    "gsggggsg",
    ".gllllg.",
    "dhdhdhdh",
    "dddddddd",
    "dddddddd",
  ],
  palette: { ...PEN_PUP.palette, h: "#ffb347" },
};

/** Ceramic Bulbs: a second shade on the same post, and it runs hotter. */
const HEAT_LAMP_2: Art = {
  rows: [
    ".kkmmmkkkmmmkk.",
    "..kmmmkkkmmmk..",
    "...aaa...aaa...",
    "..a.a.a.a.a.a..",
    ".a..a....a..a..",
    ".......m.......",
    ".......m.......",
    ".......m.......",
    ".....kkkkk.....",
    "....kkkkkkk....",
  ],
  palette: HEAT_LAMP.palette,
};

/** Thermostats: three shades, a crossbar to hang them off, and a sensor. */
const HEAT_LAMP_3: Art = {
  rows: [
    "kkmmmkkmmmkkmmm",
    ".kmmmk.kmmmk.km",
    "..aaa...aaa...a",
    ".a.a.a.a.a.a.a.",
    "a..a..a.a..a..a",
    "..mmmmmmmmmmm..",
    ".......m.......",
    ".......m.......",
    ".....kkkkk.....",
    "....kkkkkkk....",
  ],
  palette: HEAT_LAMP.palette,
};

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
/** Show Lineage: twice the dog, twice the straw, and it is wearing the rosette. */
const PEN_PUP_4: Art = {
  rows: [
    "g........g",
    "ggg....ggg",
    ".gggggggg.",
    ".gsggggsg.",
    ".gllllllg.",
    "..grrgggg.",
    "dddddddddd",
    "dddddddddd",
  ],
  palette: { ...PEN_PUP.palette, r: "#c93f34" },
};

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

/** Whole-Yard Radiant: the thing that actually heats a yard this size. */
const HEAT_LAMP_4: Art = {
  rows: [
    ".........m.........",
    "kmmmmmmmmmmmmmmmmmk",
    ".m..m..m.m.m..m..m.",
    "kmk.kmk.kmk.kmk.kmk",
    ".a...a...a...a...a.",
    "a.a.a.a.a.a.a.a.a.a",
    ".........m.........",
    ".........m.........",
    ".........m.........",
    ".......kkkkk.......",
    "......kkkkkkk......",
  ],
  palette: HEAT_LAMP.palette,
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

/** Four marks per tier, indexed by how many of its three upgrades you own. */
export const PRODUCER_MARKS = {
  patch: [PEN_PUP, PEN_PUP_2, PEN_PUP_3, PEN_PUP_4],
  hand: [
    KENNEL_HAND,
    repaint(KENNEL_HAND, { b: "#e08a3c", t: "#f2e3c8" }),
    repaint(KENNEL_HAND, { b: "#3f8f86", t: "#e0c04a" }),
    KENNEL_HAND_4,
  ],
  rig: [HEAT_LAMP, HEAT_LAMP_2, HEAT_LAMP_3, HEAT_LAMP_4],
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
} as const satisfies Record<string, readonly [Art, Art, Art, Art]>;

export type MarkedProducerId = keyof typeof PRODUCER_MARKS;
