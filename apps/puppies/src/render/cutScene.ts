/**
 * The cut (engine world `deep`): the canal out of town, just before it gets light. Mills and a
 * gasholder on the far bank, the water across the middle, the towpath along the front with the
 * pack on it, all of them heading right, under the bridge. Lost Balls bob in the water, Shopping
 * Trolleys stand in the shallows with ducks round them, Narrowboats are moored on the far side with
 * their stoves lit, the Magnet Fishers stand at the edge with a line in, the bridge's brick has a
 * scratch for every generation, and the Boat Dog is asleep on a roof. Low path: mud and puddles.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";
import type { PackZone } from "./pack.js";

type CutId = "spark" | "kith" | "loom" | "vault" | "crown" | "fourth";

const SKY_TOP = "#1a2c4c";
const SKY_MID = "#3f6f86";
const SKY_LOW = "#c9d8b8";
const FAR = "#22384a";
const FAR_LIT = "#2e4a5c";
const WATER_TOP = "#3d7682";
const WATER_LOW = "#1f4a5a";
const BRICK = "#7a4638";
const BRICK_DARK = "#52302a";
const PATH = "#8a8072";
const PATH_LOW = "#6a6258";
const MUD = "#4e4238";
const VERGE = "#4f7a4a";

export class CutScene extends LongScene<CutId> {
  protected readonly first = "spark" as const;
  private bank = 100;
  private shore = 190;
  private bridgeX = 132;
  private ducks: (Spot & { phase: number })[] = [];
  private puddles: Spot[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const bank = (this.bank = Math.round(sh * 0.34));
    const shore = (this.shore = this.stripTop - 4);
    const wet = (k: number) => Math.round(bank + 6 + (shore - bank - 10) * k);
    const balls: Spot[] = [];
    for (let i = 0; i < 14; i++) balls.push({ x: Math.round(8 + r() * (this.bridgeX - 14)), y: wet(0.3 + r() * 0.7) });
    this.spots = {
      spark: balls,
      kith: [
        { x: 44, y: shore + 7 },
        { x: 98, y: shore + 7 },
        { x: 14, y: shore + 7 },
        { x: 70, y: shore + 7 },
      ],
      loom: [
        { x: 28, y: shore - 5 },
        { x: 84, y: shore - 7 },
        { x: 116, y: shore - 4 },
        { x: 58, y: shore - 9 },
      ],
      vault: [
        { x: 38, y: wet(0.12) },
        { x: 92, y: wet(0.2) },
        { x: 18, y: wet(0.42) },
      ],
      crown: [
        { x: this.bridgeX + 9, y: shore - 22 },
        { x: this.bridgeX + 9, y: shore - 12 },
        { x: this.bridgeX + 9, y: shore - 32 },
        { x: this.bridgeX + 9, y: shore - 2 },
      ],
      fourth: [
        { x: 44, y: wet(0.12) - 7 },
        { x: 98, y: wet(0.2) - 7 },
      ],
    };
    this.ducks = [];
    for (let i = 0; i < 8; i++) this.ducks.push({ x: 20 + r() * 100, y: wet(0.75 + r() * 0.25), phase: r() * 6 });
    this.puddles = [];
    for (let i = 0; i < 9; i++) this.puddles.push({ x: Math.round(r() * (SCENE_W - 20)), y: Math.round(shore + 8 + r() * (sh - shore - 12)) });
  }

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 12, front: this.sh - 3, door: { x: 2, y: this.stripTop + 14 } };
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, bank, shore, bridgeX } = this;
    const worn = clamp((1 - condition) * 1.4, 0, 1);
    for (let y = 0; y < bank; y++) {
      const k = y / bank;
      ctx.fillStyle = k < 0.55 ? mix(SKY_TOP, SKY_MID, k / 0.55) : mix(SKY_MID, SKY_LOW, (k - 0.55) / 0.45);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = "#e8f0e0";
    for (let i = 0; i < 14; i++) ctx.fillRect((i * 53) % SCENE_W, (i * 17) % Math.round(bank * 0.4), 1, 1);
    // The far bank: the last of the town. A mill with a chimney, a gasholder, sheds, and a lit window or two.
    ctx.fillStyle = FAR;
    ctx.fillRect(0, bank - 10, SCENE_W, 12);
    ctx.fillRect(8, bank - 34, 34, 26);
    ctx.fillRect(44, bank - 62, 5, 54);
    ctx.fillRect(43, bank - 64, 7, 3);
    for (let i = 0; i < 5; i++) ctx.fillRect(66 + i * 9, bank - 20 - (i % 2) * 3, 9, 14);
    ctx.fillStyle = FAR_LIT;
    for (let y = bank - 30; y < bank - 12; y += 6) for (let x = 11; x < 40; x += 5) ctx.fillRect(x, y, 3, 3);
    ctx.fillStyle = "#ffd88a";
    ctx.fillRect(16, bank - 24, 3, 3);
    ctx.fillRect(31, bank - 18, 3, 3);
    // Gasholder: a drum in a cage.
    ctx.fillStyle = FAR_LIT;
    ctx.fillRect(108, bank - 26, 22, 18);
    ctx.fillStyle = FAR;
    for (let x = 106; x <= 132; x += 6) ctx.fillRect(x, bank - 36, 1, 28);
    ctx.fillRect(106, bank - 36, 27, 1);
    ctx.fillRect(106, bank - 22, 27, 1);

    // The water, with the sky in it.
    for (let y = bank; y < shore; y++) {
      const k = (y - bank) / (shore - bank);
      ctx.fillStyle = mix(mix(SKY_LOW, WATER_TOP, Math.min(1, k * 5)), WATER_LOW, k);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba(FAR, 0.35);
    ctx.fillRect(8, bank + 2, 34, 14);
    ctx.fillRect(44, bank + 2, 5, 30);
    ctx.fillRect(108, bank + 2, 22, 10);

    // The bridge: a brick arch at the right, the canal going under it and away.
    const top = bank - 16;
    ctx.fillStyle = BRICK;
    ctx.fillRect(bridgeX, top, SCENE_W - bridgeX, shore - top + 2);
    ctx.fillStyle = BRICK_DARK;
    for (let y = top + 3; y < shore; y += 4) ctx.fillRect(bridgeX, y, SCENE_W - bridgeX, 1);
    for (let y = top; y < shore; y += 4) for (let x = bridgeX + ((y / 4) % 2) * 4; x < SCENE_W; x += 8) ctx.fillRect(x, y, 1, 4);
    ctx.fillStyle = "#a89a88";
    ctx.fillRect(bridgeX - 1, top - 2, SCENE_W - bridgeX + 1, 3);
    // The hole through it.
    const cx = bridgeX + 30;
    const rx = 15;
    const spring = shore - 4;
    for (let y = spring - 34; y <= shore; y++) {
      const up = Math.max(0, spring - y);
      const half = y > spring ? rx : Math.round(rx * Math.sqrt(Math.max(0, 1 - (up * up) / (34 * 34))));
      const k = (y - bank) / (shore - bank);
      ctx.fillStyle = y < bank + 4 ? mix(SKY_LOW, "#ffe8b8", 0.5) : mix("#9ac0b0", WATER_LOW, clamp(k, 0, 1));
      ctx.fillRect(cx - half, y, half * 2, 1);
    }
    ctx.fillStyle = BRICK_DARK;
    ctx.fillRect(cx - rx - 1, spring - 2, 1, 8);

    // The near bank: a grass verge, then the towpath.
    ctx.fillStyle = VERGE;
    ctx.fillRect(0, shore, SCENE_W, 4);
    ctx.fillStyle = "#6a9a5a";
    for (let x = 1; x < SCENE_W; x += 5) ctx.fillRect(x + ((x * 7) % 3), shore - 1, 1, 2);
    for (let y = shore + 4; y < sh; y++) {
      ctx.fillStyle = mix(mix(PATH, PATH_LOW, (y - shore) / (sh - shore)), MUD, worn * 0.6);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba("#3a342c", 0.35);
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % SCENE_W, shore + 6 + ((i * 23) % Math.max(1, sh - shore - 8)), 2, 1);
    // A mooring ring or two, and what the path does when nobody keeps it.
    ctx.fillStyle = "#3a3a44";
    for (const x of [26, 78, 118]) ctx.fillRect(x, shore + 5, 2, 2);
    const wet = Math.round(worn * this.puddles.length);
    for (let i = 0; i < wet; i++) {
      const p = this.puddles[i]!;
      ctx.fillStyle = "#4a6a72";
      ctx.fillRect(p.x, p.y, 14, 2);
      ctx.fillRect(p.x + 2, p.y - 1, 9, 4);
      ctx.fillStyle = "#8ab0b0";
      ctx.fillRect(p.x + 4, p.y, 4, 1);
    }
  }

  protected scene(t: number): void {
    const ctx = this.ctx;
    this.drawRipples(t);
    this.each("vault", (spot, i, broken, s) => {
      const bob = Math.round(Math.sin(t * 0.8 + i * 2) * 0.6);
      ctx.fillStyle = rgba("#0c2028", 0.35);
      ctx.fillRect(spot.x - 12, spot.y + 1, 26, 2);
      this.stand(s, spot.x, spot.y + bob);
      if (broken) return;
      // Stove's lit.
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.3 + k / 3 + i * 0.2) % 1;
        ctx.fillStyle = rgba("#e8e4e0", 0.5 * (1 - p));
        ctx.fillRect(Math.round(spot.x - 8 + p * 5 + Math.sin(t + k) * 1.5), Math.round(spot.y - 9 - p * 14 + bob), 2, 2);
      }
    });
    this.each("fourth", (spot, i, broken, s) => {
      const breath = !broken && Math.sin(t * 1.1 + i) > 0.2 ? 1 : 0;
      this.stand(s, spot.x, spot.y - breath + Math.round(Math.sin(t * 0.8 + i * 2) * 0.6));
    });
    this.each("crown", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("spark", (spot, i, broken, s) => {
      const bob = broken ? 3 : Math.round(Math.sin(t * 1.3 + i * 1.7));
      ctx.save();
      ctx.beginPath();
      // Half in the water.
      ctx.rect(0, 0, SCENE_W, spot.y - 1);
      ctx.clip();
      this.stand(s, spot.x + Math.round(Math.sin(t * 0.2 + i) * 2), spot.y + 2 + bob);
      ctx.restore();
      ctx.fillStyle = rgba("#d8f0f0", 0.6);
      ctx.fillRect(spot.x - 4, spot.y - 1, 9, 1);
    });
    this.drawDucks(t);
    this.each("loom", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    const props: { y: number; go: () => void }[] = [];
    this.each("kith", (spot, i, broken, s) => {
      const haul = !broken && Math.sin(t * 0.6 + i * 1.9) > 0.7;
      props.push({
        y: spot.y,
        go: () => {
          // The line, out over the verge and down into the water.
          ctx.fillStyle = "#d8c8a8";
          for (let k = 0; k < 10; k++) ctx.fillRect(spot.x + 3 + k, spot.y - 8 - (haul ? 2 : 0) - Math.round(Math.sin((k / 9) * Math.PI) * 3), 1, 1);
          ctx.fillRect(spot.x + 13, spot.y - 8 - (haul ? 2 : 0), 1, 3);
          if (haul) {
            ctx.fillStyle = "#6a7078";
            ctx.fillRect(spot.x + 12, spot.y - 6, 3, 2);
          }
          this.stand(s, spot.x, spot.y - (haul ? 1 : 0));
        },
      });
    });
    this.drawPack(props);
  }

  private drawRipples(t: number): void {
    const ctx = this.ctx;
    const { bank, shore } = this;
    ctx.fillStyle = rgba("#d8f0e8", 0.22);
    for (let i = 0; i < 26; i++) {
      const y = bank + 5 + ((i * 29) % Math.max(1, shore - bank - 8));
      const x = (i * 47 + t * (3 + (i % 4))) % (this.bridgeX + 8);
      ctx.fillRect(Math.round(x) - 10, y, 3 + (i % 5), 1);
    }
  }

  /** Round the trolleys, mostly: a settled bank is a quiet one. */
  private drawDucks(t: number): void {
    const n = Math.min(this.ducks.length, 2 * this.owned("loom"));
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const d = this.ducks[i]!;
      const x = Math.round(d.x + Math.sin(t * 0.25 + d.phase) * 10);
      const left = Math.cos(t * 0.25 + d.phase) < 0;
      ctx.fillStyle = "#6a4a30";
      ctx.fillRect(x, d.y - 2, 5, 2);
      ctx.fillStyle = "#2f6a4a";
      ctx.fillRect(left ? x - 1 : x + 4, d.y - 4, 2, 2);
      ctx.fillStyle = "#e0a030";
      ctx.fillRect(left ? x - 2 : x + 6, d.y - 3, 1, 1);
      ctx.fillStyle = rgba("#d8f0f0", 0.5);
      ctx.fillRect(x - 1, d.y, 7, 1);
    }
    // First light, coming under the bridge.
    fillDisc(ctx, this.bridgeX + 30, this.bank - 2, 10, rgba("#ffe8b8", 0.08 + 0.03 * Math.sin(t * 0.5)));
  }
}
