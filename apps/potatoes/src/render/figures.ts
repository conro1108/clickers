/**
 * The people of the larder, the kitchen and the table, at the size those rooms are drawn. The rung
 * sprites in `art.ts` are shop icons a dozen pixels tall, right for a field and mouse-sized next to a
 * door or a dining chair. These match the family sat at the table: a six-pixel head, an adult about
 * forty-five tall. Anything a figure stands near (doors, worktops, the table) is sized off `ADULT`.
 *
 * Built from rects and outlined, one Art per pose and upgrade mark, all facing left (flip for right).
 */

import type { Art } from "./pixel.js";

/** How tall a grown-up stands, in scene pixels. Furniture heights in the three rooms hang off this. */
export const ADULT = 45;

const W = 36;
const CX = W >> 1;
const K = "#402e3a";
const SKIN = "#e2b090";
const GOLD = "#ffd166";

/** 0 standing, 1 and 2 the two halves of a walk. */
export type Step = 0 | 1 | 2;
type View = "side" | "back";

class Grid {
  private cells: string[][] = [];

  fill(x: number, y: number, w: number, h: number, key: string): void {
    for (let j = y; j < y + h; j++) {
      const row = (this.cells[j] ??= []);
      for (let i = x; i < x + w; i++) row[i] = key;
    }
  }

  /** Everything painted, with a dark line round the outside like the rest of the art. */
  art(palette: Record<string, string>): Art {
    const h = this.cells.length + 1;
    const at = (x: number, y: number) => this.cells[y]?.[x];
    const rows: string[] = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      for (let x = 0; x < W; x++) {
        const edge = !at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1));
        row += at(x, y) ?? (edge ? "k" : ".");
      }
      rows.push(row);
    }
    return { rows, palette: { k: K, ...palette } };
  }
}

/** Hair or a cap (`c`), a face, a neck: rows 1 to 8. */
function head(g: Grid, view: View): void {
  g.fill(CX - 3, 1, 6, 2, "c");
  g.fill(CX - 3, 3, 6, 4, "f");
  g.fill(CX - 2, 7, 4, 1, "f");
  g.fill(CX - 1, 8, 2, 1, "f");
  if (view === "back") {
    g.fill(CX - 3, 3, 6, 3, "h");
    g.fill(CX - 2, 6, 4, 1, "h");
    return;
  }
  g.fill(CX + 1, 3, 2, 3, "h");
  g.fill(CX - 3, 4, 1, 1, "e");
  g.fill(CX, 4, 1, 1, "e");
}

/** Two legs from `top` to the floor at `foot`, one lifted on a step, both shoes pointing left. */
function legs(g: Grid, top: number, foot: number, step: Step, wide: number, leg: string): void {
  const lift = [step === 1 ? 2 : 0, step === 2 ? 2 : 0];
  const gap = wide === 2 ? 2 : 0;
  [CX - wide - gap / 2, CX + gap / 2].forEach((x, i) => {
    g.fill(x, top, wide, foot - 2 - lift[i]! - top, i === 1 && !gap ? "u" : leg);
    g.fill(x - 1, foot - 2 - lift[i]!, wide + 1, 2, "s");
  });
}

/** A grown-up's body: twelve across the arms, hands at the hip. `arm` says which arms hang. */
function torso(g: Grid, arms: { near: boolean; far: boolean; hands: boolean }): void {
  g.fill(CX - 5, 9, 10, 1, "b");
  g.fill(CX - 4, 10, 8, 15, "b");
  for (const [on, x, crease] of [[arms.near, CX - 6, CX - 4], [arms.far, CX + 4, CX + 3]] as const) {
    if (!on) continue;
    g.fill(x, 10, 2, arms.hands ? 13 : 8, "b");
    g.fill(crease, 12, 1, arms.hands ? 11 : 6, "d");
    if (arms.hands) g.fill(x, 23, 2, 2, "g");
  }
}

const cache = new Map<string, Art>();
function once(key: string, make: () => Art): Art {
  let art = cache.get(key);
  if (!art) cache.set(key, (art = make()));
  return art;
}

const WAITER_COAT = ["#2a2a3a", "#3a2a4a", "#6a2a3a", "#6a2a3a"];

/** Tails, a white front, and when `loaded` a dome on a tray held up at the shoulder. */
export function waiter(mark: number, step: Step, loaded: boolean): Art {
  return once(`waiter:${mark}:${step}:${loaded}`, () => {
    const g = new Grid();
    head(g, "side");
    torso(g, { near: !loaded, far: true, hands: true });
    g.fill(CX - 4, 9, 2, 7, "w");
    g.fill(CX - 4, 9, 2, 1, "e");
    // Tails down the back of the legs.
    legs(g, 25, 44, step, 4, "t");
    g.fill(CX + 2, 25, 2, 8, "b");
    if (mark >= 3) g.fill(CX - 5, 9, 10, 1, "y");
    if (loaded) {
      // Upper arm down, forearm up and forward, the hand flat under the tray.
      g.fill(CX - 6, 10, 2, 6, "b");
      g.fill(CX - 8, 14, 2, 2, "b");
      g.fill(CX - 10, 12, 2, 3, "b");
      g.fill(CX - 11, 11, 3, 1, "g");
      g.fill(CX - 17, 10, 12, 1, "D");
      g.fill(CX - 16, 6, 10, 4, "S");
      g.fill(CX - 15, 5, 8, 1, "S");
      g.fill(CX - 14, 4, 6, 1, "S");
      g.fill(CX - 12, 3, 2, 1, "D");
      g.fill(CX - 15, 6, 1, 3, "L");
      g.fill(CX - 14, 5, 2, 1, "L");
      g.fill(CX - 7, 7, 1, 3, "D");
    } else {
      // A cloth over the near arm.
      g.fill(CX - 7, 17, 3, 5, "w");
    }
    const gold = mark >= 2;
    return g.art({
      c: "#2a1a14", h: "#2a1a14", f: SKIN, e: "#2a1a1a",
      b: WAITER_COAT[mark]!, d: "#1a1420", w: "#ffffff", g: mark >= 1 ? "#ffffff" : SKIN,
      t: "#22222e", u: "#1a1a24", s: "#101018", y: GOLD,
      S: gold ? GOLD : "#c8ccd8", L: gold ? "#fff4c0" : "#f4f8ff", D: gold ? "#c9a24a" : "#8a8e9a",
    });
  });
}

const HAND_TOP = ["#d8d8d0", "#c8c8e0", "#f0e0a0", "#f0e0a0"];

/** A white cap and an apron. From the back they're at the worktop, elbows in; from the side they're walking. */
export function kitchenHand(mark: number, step: Step, view: View): Art {
  return once(`hand:${mark}:${step}:${view}`, () => {
    const g = new Grid();
    head(g, view);
    const working = view === "back";
    torso(g, { near: true, far: true, hands: !working });
    legs(g, 25, 44, step, 4, "t");
    if (working) {
      // Apron strings: round the neck, tied in a bow at the waist.
      g.fill(CX - 1, 9, 2, 1, "w");
      g.fill(CX - 4, 20, 8, 1, "w");
      g.fill(CX - 1, 21, 2, 2, "w");
    } else {
      g.fill(CX - 4, 12, 4, 20, "w");
      g.fill(CX - 4, 9, 1, 3, "w");
    }
    if (mark >= 3) g.fill(CX - 3, 9, 6, 1, "y");
    return g.art({
      c: mark >= 2 ? GOLD : "#f4f0e4", h: "#5a3a2a", f: SKIN, e: "#2a1a1a",
      b: HAND_TOP[mark]!, d: "#a8a8a0", w: "#fbfaf4", g: SKIN,
      t: "#3a3040", u: "#2e2634", s: "#2a2430", y: GOLD,
    });
  });
}

const KID_SHIRT = ["#d84a4a", "#3a8ac8", "#3aa860", "#3aa860"];
const KID_SHADE = ["#a83838", "#2a6a9c", "#2a8048", "#2a8048"];

/** Shorts, skinny legs, and about two-thirds the height of anyone who sent them. */
export function errandKid(mark: number, step: Step): Art {
  return once(`kid:${mark}:${step}`, () => {
    const g = new Grid();
    head(g, "side");
    g.fill(CX - 4, 9, 8, 1, "b");
    g.fill(CX - 5, 10, 10, 9, "b");
    g.fill(CX - 3, 19, 6, 1, "b");
    g.fill(CX - 3, 12, 1, 7, "d");
    g.fill(CX + 2, 12, 1, 7, "d");
    g.fill(CX - 5, 19, 2, 2, "f");
    g.fill(CX + 3, 19, 2, 2, "f");
    g.fill(CX - 3, 20, 6, 4, "w");
    legs(g, 24, 33, step, 2, "f");
    return g.art({
      c: mark >= 3 ? GOLD : "#6a3a2a", h: "#6a3a2a", f: SKIN, e: "#2a1a1a",
      b: KID_SHIRT[mark]!, d: KID_SHADE[mark]!, w: "#f4e8e0", s: "#3a4a6a",
    });
  });
}
