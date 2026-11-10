/**
 * Out the back (engine world `beyond`): behind the industrial estate at three in the morning, the
 * first air any of them has had. The mill's sign is still in sight over the roofs. Wheelie Bins
 * along the back wall of the units, a Skip on the tarmac, the Dripping Tap on the wall, the Fry
 * Cook coming out of the one lit door with a tray, the fence with its Holes at the left and the
 * Yard Dog on its chain in front of it. The tunnel comes up behind the bins, which is where new
 * dogs appear. Every so often a van goes along the road behind the fence, looking. Low cover: the
 * security light comes on and there is nowhere to stand.
 */

import { VAN } from "./art.js";
import { LongScene, fillDisc, type Spot, type Walker } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";
import type { PackZone } from "./pack.js";
import { artTinted } from "./pixel.js";

type BackId = "echo" | "kin" | "grove" | "tide" | "beacon" | "third";

const SKY_TOP = "#15132e";
const SKY_LOW = "#5a3040";
const SODIUM = "#ff9a3c";
const ROOFS = "#1c1828";
const WALL = "#5a586e";
const WALL_RIB = "#4c4a60";
const WALL_FOOT = "#3a3848";
const DOOR_LIGHT = "#ffd88a";
const TARMAC = "#5e5862";
const TARMAC_LOW = "#46414c";
const NEON = "#ff5fa0";
const GLARE = "#e8f0ff";

export class BackScene extends LongScene<BackId> {
  protected readonly first = "echo" as const;
  private skyline = 60;
  private wallTop = 80;
  private wallFoot = 150;
  private unitsFrom = 66;
  private doorX = 158;
  private cooks: Walker[] = [];
  private van = { x: -40, wait: 6 };
  private stars: Spot[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    this.skyline = Math.round(sh * 0.2);
    this.wallTop = Math.round(sh * 0.25);
    const foot = (this.wallFoot = Math.round(sh * 0.45));
    const strip = this.stripTop;
    const mid = (k: number) => Math.round(foot + (strip - foot) * k);
    // Bins: a rank against the wall first, then a second rank out on the tarmac.
    const bins: Spot[] = [];
    for (const x of [82, 91, 100, 109, 132, 141, 118]) bins.push({ x, y: foot + 3 });
    for (let i = 0; i < 7; i++) bins.push({ x: 74 + i * 10 + (i % 2), y: mid(0.3) + (i % 3) });
    this.spots = {
      echo: bins,
      kin: [0, 1, 2].map(() => ({ x: this.doorX, y: mid(0.62) })),
      grove: [
        { x: 118, y: mid(0.78) },
        { x: 34, y: mid(0.66) },
        { x: 158, y: mid(0.96) },
      ],
      tide: [
        { x: 72, y: foot - 9 },
        { x: 125, y: foot - 9 },
        { x: 172, y: foot - 9 },
      ],
      beacon: [
        { x: 8, y: foot + 1 },
        { x: 38, y: foot + 1 },
        { x: 23, y: foot + 1 },
        { x: 53, y: foot + 1 },
      ],
      third: [
        { x: 22, y: mid(0.42) },
        { x: 48, y: mid(0.2) },
      ],
    };
    this.cooks = this.spots.kin.map((_, i) => ({ x: this.doorX - i * 9, dir: -1, out: true, wait: i * 2.5 }));
    this.stars = [];
    for (let i = 0; i < 26; i++) this.stars.push({ x: Math.floor(r() * SCENE_W), y: Math.floor(r() * this.skyline * 0.8) });
  }

  protected zone(): PackZone {
    return {
      left: 2,
      right: SCENE_W - 2,
      back: this.stripTop + 6,
      front: this.sh - 3,
      door: { x: this.unitsFrom + 4, y: this.stripTop + 6 },
    };
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, skyline, wallTop, wallFoot, unitsFrom } = this;
    const lit = clamp((1 - condition) * 1.4, 0, 1);
    for (let y = 0; y < wallFoot; y++) {
      ctx.fillStyle = mix(SKY_TOP, SKY_LOW, Math.pow(y / wallFoot, 1.6));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = "#c8c0d8";
    for (const s of this.stars) ctx.fillRect(s.x, s.y, 1, 1);
    // The town's glow, then the roofs of the estate against it.
    fillDisc(ctx, 60, skyline + 30, 70, rgba(SODIUM, 0.07));
    ctx.fillStyle = ROOFS;
    let x = 0;
    let n = 0;
    while (x < SCENE_W) {
      const w = 14 + ((n * 7) % 13);
      const h = 6 + ((n * 5) % 11);
      ctx.fillRect(x, skyline - h, w, h + 40);
      if (n % 3 === 1) ctx.fillRect(x + 3, skyline - h - 6, 2, 6);
      x += w + 1;
      n++;
    }
    // Still in sight of it: the mill, over the roofs, with its sign on.
    const mx = 14;
    const mt = skyline - 26;
    ctx.fillStyle = "#2a2438";
    ctx.fillRect(mx, mt, 38, 60);
    ctx.fillStyle = "#ffd88a";
    for (let wy = mt + 5; wy < skyline + 6; wy += 5) for (let wx = mx + 3; wx < mx + 36; wx += 5) if ((wx + wy) % 3) ctx.fillRect(wx, wy, 2, 2);
    fillDisc(ctx, mx + 12, mt - 3, 12, rgba(NEON, 0.14));
    ctx.fillStyle = NEON;
    ctx.fillRect(mx + 2, mt - 5, 20, 3);
    ctx.fillStyle = "#2a2438";
    for (let i = 0; i < 6; i++) ctx.fillRect(mx + 4 + i * 3, mt - 5, 1, 3);
    ctx.fillRect(mx + 11, mt - 5, 2, 3);
    // The road behind the fence.
    // The scrapyard, between the roofs and the road.
    ctx.fillStyle = "#241e2c";
    ctx.fillRect(0, skyline + 8, unitsFrom, wallFoot - skyline - 8);
    ctx.fillStyle = "#3a3244";
    for (let i = 0; i < 7; i++) {
      const cx = 4 + i * 9;
      const cy = wallFoot - 12 - ((i * 5) % 9);
      ctx.fillRect(cx, cy, 10, 4);
      ctx.fillRect(cx + 2, cy - 3, 6, 3);
    }
    ctx.fillStyle = "#2e2a36";
    ctx.fillRect(0, wallFoot - 10, unitsFrom, 10);
    ctx.fillStyle = rgba(SODIUM, 0.5);
    for (let rx = 2; rx < unitsFrom; rx += 9) ctx.fillRect(rx, wallFoot - 5, 4, 1);

    // The back of the units: ribbed tin, a shutter each, and one door that's open.
    ctx.fillStyle = WALL;
    ctx.fillRect(unitsFrom, wallTop, SCENE_W - unitsFrom, wallFoot - wallTop);
    ctx.fillStyle = WALL_RIB;
    for (let rx = unitsFrom; rx < SCENE_W; rx += 3) ctx.fillRect(rx, wallTop, 1, wallFoot - wallTop);
    ctx.fillStyle = "#4a4860";
    ctx.fillRect(unitsFrom, wallTop, SCENE_W - unitsFrom, 2);
    ctx.fillStyle = WALL_FOOT;
    ctx.fillRect(unitsFrom, wallFoot - 4, SCENE_W - unitsFrom, 4);
    ctx.fillRect(unitsFrom, wallTop, 2, wallFoot - wallTop);
    for (const sx of [unitsFrom + 12, unitsFrom + 46]) {
      ctx.fillStyle = "#2c2a38";
      ctx.fillRect(sx, wallFoot - 26, 22, 26);
      ctx.fillStyle = "#3a3848";
      for (let y = wallFoot - 24; y < wallFoot - 1; y += 3) ctx.fillRect(sx + 1, y, 20, 1);
    }
    const dx = this.doorX;
    fillDisc(ctx, dx, wallFoot - 6, 22, rgba(DOOR_LIGHT, 0.1));
    ctx.fillStyle = "#1a1620";
    ctx.fillRect(dx - 6, wallFoot - 17, 12, 17);
    ctx.fillStyle = DOOR_LIGHT;
    ctx.fillRect(dx - 5, wallFoot - 16, 10, 16);
    ctx.fillStyle = "#e89a4a";
    ctx.fillRect(dx - 5, wallFoot - 16, 10, 2);
    ctx.fillStyle = "#c0392f";
    ctx.fillRect(dx - 9, wallFoot - 22, 18, 4);
    ctx.fillStyle = "#fff4c0";
    for (let i = 0; i < 5; i++) ctx.fillRect(dx - 7 + i * 3, wallFoot - 21, 2, 2);
    // Extractor, over the door.
    ctx.fillStyle = "#5a586c";
    ctx.fillRect(dx - 3, wallTop + 8, 7, 5);
    ctx.fillStyle = "#22202c";
    ctx.fillRect(dx - 2, wallTop + 9, 5, 3);

    // Tarmac, a yellow hatch, the light out of the door, and the lamp's pool.
    for (let y = wallFoot; y < sh; y++) {
      ctx.fillStyle = mix(TARMAC, TARMAC_LOW, (y - wallFoot) / (sh - wallFoot));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba("#d8a33a", 0.35);
    for (let i = 0; i < 7; i++) ctx.fillRect(96 + i * 6, wallFoot + 14 + i, 4, 1);
    for (let y = wallFoot; y < wallFoot + 34; y++) {
      const k = (y - wallFoot) / 34;
      ctx.fillStyle = rgba(DOOR_LIGHT, 0.22 * (1 - k));
      ctx.fillRect(Math.round(dx - 6 - k * 16), y, Math.round(12 + k * 26), 1);
    }
    const lampX = 58;
    const poolY = wallFoot + 22;
    for (let dy = -14; dy <= 14; dy++) {
      const half = Math.round(46 * Math.sqrt(1 - (dy * dy) / 196));
      ctx.fillStyle = rgba(SODIUM, 0.16 * (1 - Math.abs(dy) / 18));
      ctx.fillRect(lampX - half, poolY + dy, half * 2, 1);
    }
    for (let y = wallTop - 11; y < poolY - 8; y++) {
      const k = (y - wallTop + 11) / (poolY - wallTop);
      ctx.fillStyle = rgba(SODIUM, 0.05);
      ctx.fillRect(Math.round(lampX - 3 - k * 34), y, Math.round(6 + k * 68), 1);
    }
    ctx.fillStyle = "#8a8496";
    ctx.fillRect(lampX, wallTop - 14, 1, wallFoot - wallTop + 14);
    ctx.fillRect(lampX - 5, wallTop - 14, 6, 1);
    fillDisc(ctx, lampX - 5, wallTop - 12, 6, rgba(SODIUM, 0.25));
    ctx.fillStyle = "#ffd8a0";
    ctx.fillRect(lampX - 6, wallTop - 13, 3, 1);
    // Where the tunnel came up: a dark mouth in the tarmac behind the bins, and the spoil.
    const hole = this.zone().door;
    ctx.fillStyle = "#6a5440";
    ctx.fillRect(hole.x - 7, hole.y - 4, 14, 3);
    ctx.fillRect(hole.x - 9, hole.y - 2, 5, 2);
    ctx.fillStyle = "#0e0a10";
    ctx.fillRect(hole.x - 5, hole.y - 3, 10, 3);
    // Cover gone: the security light is on, and everything is somewhere you can be seen.
    if (lit > 0) {
      ctx.fillStyle = GLARE;
      ctx.fillRect(SCENE_W - 22, wallTop + 3, 4, 2);
      for (let y = wallTop + 5; y < sh; y++) {
        const k = (y - wallTop) / (sh - wallTop);
        ctx.fillStyle = rgba(GLARE, 0.26 * lit * (1 - k * 0.5));
        ctx.fillRect(Math.round(SCENE_W - 20 - k * 150), y, Math.round(8 + k * 170), 1);
      }
    }
  }

  protected scene(t: number): void {
    this.drawVan(t);
    this.each("beacon", (spot, _, __, s) => this.stand(s, spot.x + 7, spot.y));
    this.each("tide", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y + 9);
      if (broken) return;
      const drip = (t * 0.9 + i * 0.37) % 1;
      this.ctx.fillStyle = "#a8e0f8";
      this.ctx.fillRect(spot.x, Math.round(spot.y + 5 + drip * 3), 1, 1);
    });
    this.each("echo", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      // Somebody in the bin: a pair of ears over the rim, now and then.
      if (broken || Math.sin(t * 0.7 + i * 2.3) < 0.82) return;
      this.ctx.fillStyle = "#c98b4b";
      this.ctx.fillRect(spot.x - 2, spot.y - s.h - 1, 1, 2);
      this.ctx.fillRect(spot.x + 1, spot.y - s.h - 1, 1, 2);
    });
    this.drawSteam(t);
    const props: { y: number; go: () => void }[] = [];
    this.each("grove", (spot, _, __, s) => props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y) }));
    this.each("third", (spot, i, broken, s) =>
      props.push({
        y: spot.y,
        go: () => {
          // Its chain, back to the fence.
          this.ctx.fillStyle = "#6a7078";
          for (let k = 0; k < 6; k++) this.ctx.fillRect(spot.x + 11 + k * 2, spot.y - 1 - (k % 2), 1, 1);
          const up = !broken && Math.sin(t * 0.4 + i) > 0.9 ? 1 : 0;
          this.stand(s, spot.x, spot.y - up);
        },
      }),
    );
    this.each("kin", (_, i, broken, s) => {
      const w = this.cooks[i]!;
      const tray = { x: 92 - i * 14, y: this.stripTop + 2 };
      const bob = this.pace(w, this.doorX - 2, tray.x, 13, broken, t);
      const y = this.wallFoot + 4 + ((this.doorX - w.x) / (this.doorX - tray.x)) * (tray.y - this.wallFoot - 4);
      props.push({
        y,
        go: () => {
          if (w.dir === 1) this.standFlipped(s, w.x, y - bob);
          else this.stand(s, w.x, y - bob);
          // Out with a tray, back without one.
          if (!w.out || broken) return;
          this.ctx.fillStyle = "#f2e3c8";
          this.ctx.fillRect(Math.round(w.x) - 6, Math.round(y) - 7 - bob, 5, 1);
          this.ctx.fillStyle = "#d8a33a";
          this.ctx.fillRect(Math.round(w.x) - 5, Math.round(y) - 8 - bob, 3, 1);
        },
      });
      // What's been put down so far.
      props.push({
        y: tray.y - 1,
        go: () => {
          this.ctx.fillStyle = "#f2e3c8";
          this.ctx.fillRect(tray.x - 4, tray.y - 1, 6, 1);
          this.ctx.fillStyle = "#d8a33a";
          this.ctx.fillRect(tray.x - 3, tray.y - 2, 3, 1);
        },
      });
    });
    this.drawPack(props);
  }

  /** The fryer's on. */
  private drawSteam(t: number): void {
    if (this.owned("kin") <= 0) return;
    const ctx = this.ctx;
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.35 + i / 4) % 1;
      ctx.fillStyle = rgba("#d8d0e0", 0.35 * (1 - p));
      ctx.fillRect(Math.round(this.doorX + Math.sin(t + i * 2) * 2 + p * 4), Math.round(this.wallTop + 7 - p * 16), 2, 2);
    }
  }

  /** The mill's van, on the road behind the fence, going slowly with its lights on. */
  private drawVan(t: number): void {
    const v = this.van;
    if (v.wait > 0) {
      v.wait -= this.dt;
      return;
    }
    v.x += this.dt * 16;
    if (v.x > this.unitsFrom + 30) {
      v.x = -40;
      v.wait = 14 + Math.random() * 20;
      return;
    }
    const s = artTinted(VAN, "#0c0a14", 0.6);
    const y = this.wallFoot - 2;
    const ctx = this.ctx;
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = rgba("#fff0c0", 0.2 * (1 - k / 26));
      ctx.fillRect(Math.round(v.x + s.w + k), y - 5 - Math.floor(k / 9), 1, 3 + Math.floor(k / 5));
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.unitsFrom, this.sh);
    ctx.clip();
    ctx.drawImage(s.canvas, Math.round(v.x), y - s.h + Math.round(Math.abs(Math.sin(t * 9)) * 0.6));
    ctx.restore();
  }
}
