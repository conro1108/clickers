/**
 * The road (engine world `deep`): four in the morning at the depot by the motorway. Pallets wait on
 * the dock under its lit doors, the Transport Café glows at the right, Reefer Trailers and the family's
 * Livery stand in the lorry park, Drivers walk tea from the café to the cabs, and Juggernauts run both
 * ways along the motorway under the sodium lamps. Low road: cones, and the lamps go out one by one.
 */

import { CRATE } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, rgba } from "./farmScene.js";

type RoadId = "spark" | "kith" | "loom" | "vault" | "crown" | "fourth";

const SKY = "#141a34";
const SKY_LOW = "#3a2a44";
const GLOW = "#c86a3a";
const DEPOT = "#4a4e5a";
const DEPOT_LIT = "#5e6270";
const DOCK = "#ffd89a";
const APRON = "#3a3a42";
const TARMAC = "#2a2a30";
const LINE = "#e8e8e0";
const SODIUM = "#ffb050";
const VERGE = "#2e3a2a";

interface Rig {
  x: number;
  lane: 0 | 1;
  speed: number;
}

export class RoadScene extends LongScene<RoadId> {
  private horizon = 90;
  private apron = 150;
  private park = 190;
  private road = 230;
  private verge = 262;
  private drivers: Carrier[] = [];
  private rigs: Rig[] = [];

  protected layOut(random: () => number): void {
    const sh = this.sh;
    this.horizon = Math.round(sh * 0.3);
    this.apron = Math.round(sh * 0.5);
    this.park = Math.round(sh * 0.66);
    this.road = Math.round(sh * 0.76);
    this.verge = Math.round(sh * 0.91);
    this.spots = {
      spark: [16, 32, 48, 64, 80, 24, 56].map((x, i) => ({ x, y: this.apron - (i >= 5 ? 9 : 0) })),
      loom: [{ x: 150, y: this.apron }],
      vault: [24, 62, 100].map((x) => ({ x, y: this.park })),
      crown: [44, 82, 138].map((x) => ({ x, y: this.park + 14 })),
      kith: [0, 1, 2, 3].map((i) => ({ x: 120 + i * 8, y: this.road - 2 })),
      fourth: [0, 1, 2, 3].map((i) => ({ x: i * 60, y: i % 2 ? this.road + 12 : this.road + 24 })),
    };
    this.drivers = this.spots.kith.map((s, i) => ({ x: s.x, dir: -1, loaded: i % 2 === 0, wait: i }));
    this.rigs = this.spots.fourth.map((s, i) => ({ x: s.x + random() * 30, lane: (i % 2) as 0 | 1, speed: 26 + random() * 8 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, horizon, apron, park, road, verge } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, SKY);
    sky.addColorStop(1, SKY_LOW);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_W, horizon);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (const [x, y] of [[12, 8], [40, 20], [70, 6], [110, 14], [150, 9], [166, 26], [90, 30], [25, 36]] as const) if (y < horizon - 10) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = "#e8e4c8";
    ctx.fillRect(140, 12, 5, 5);
    ctx.fillRect(139, 13, 7, 3);
    // The city's glow along the bottom of the sky.
    const glow = ctx.createLinearGradient(0, horizon - 14, 0, horizon);
    glow.addColorStop(0, rgba(GLOW, 0));
    glow.addColorStop(1, rgba(GLOW, 0.45));
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 14, SCENE_W, 14);
    // The depot: a long box with dock doors, lit.
    ctx.fillStyle = DEPOT;
    ctx.fillRect(0, horizon - 18, 112, apron - horizon + 18);
    ctx.fillStyle = DEPOT_LIT;
    ctx.fillRect(0, horizon - 18, 112, 2);
    for (let x = 6; x < 106; x += 20) {
      ctx.fillStyle = DOCK;
      ctx.fillRect(x, apron - 26, 14, 18);
      ctx.fillStyle = rgba("#000000", 0.25);
      for (let y = apron - 24; y < apron - 8; y += 3) ctx.fillRect(x, y, 14, 1);
    }
    ctx.fillStyle = "#e8e8e0";
    ctx.fillRect(10, horizon - 13, 40, 5);
    ctx.fillStyle = "#2a6a4a";
    for (let x = 12; x < 48; x += 5) ctx.fillRect(x, horizon - 12, 3, 3);
    // Ground between the buildings and the road.
    ctx.fillStyle = APRON;
    ctx.fillRect(0, horizon, SCENE_W, road - horizon);
    ctx.fillRect(0, apron - 8, SCENE_W, 8);
    ctx.fillStyle = "#4a4a52";
    for (let x = 4; x < SCENE_W; x += 38) ctx.fillRect(x, park + 2, 1, 22);
    // The motorway: two lanes, dashes down the middle, a hard shoulder.
    ctx.fillStyle = TARMAC;
    ctx.fillRect(0, road, SCENE_W, verge - road);
    ctx.fillStyle = LINE;
    ctx.fillRect(0, road + 1, SCENE_W, 1);
    ctx.fillRect(0, verge - 2, SCENE_W, 1);
    for (let x = 0; x < SCENE_W; x += 14) ctx.fillRect(x, road + 15, 7, 1);
    // Sodium lamps along the top of the road; fewer of them lit as the road goes.
    const lit = clamp(condition, 0, 1);
    for (let i = 0, x = 10; x < SCENE_W; i++, x += 40) {
      ctx.fillStyle = "#5a5a62";
      ctx.fillRect(x, road - 26, 1, 26);
      ctx.fillRect(x, road - 26, 6, 1);
      const on = (i * 0.37) % 1 < lit;
      ctx.fillStyle = on ? SODIUM : "#5a4a3a";
      ctx.fillRect(x + 5, road - 25, 3, 2);
      if (on) {
        const cone = ctx.createRadialGradient(x + 6, road - 20, 0, x + 6, road, 30);
        cone.addColorStop(0, rgba(SODIUM, 0.28));
        cone.addColorStop(1, rgba(SODIUM, 0));
        ctx.fillStyle = cone;
        ctx.fillRect(x - 24, road - 24, 60, 50);
      }
    }
    // Cones on the hard shoulder when the road's in a bad way.
    if (condition < 0.7) {
      for (let x = 60; x < SCENE_W; x += 18) {
        ctx.fillStyle = "#ff7a2a";
        ctx.fillRect(x, verge - 6, 3, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, verge - 5, 3, 1);
      }
    }
    // The verge along the front, where the stock waits for its lorry.
    ctx.fillStyle = VERGE;
    ctx.fillRect(0, verge, SCENE_W, sh - verge);
  }

  protected scene(t: number): void {
    this.each("spark", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("loom", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      // The sign buzzing on and off.
      if (Math.sin(t * 3) > 0.92) {
        this.ctx.fillStyle = rgba("#000000", 0.5);
        this.ctx.fillRect(spot.x - 9, spot.y - 20, 18, 1);
      }
    });
    this.each("vault", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && Math.sin(t * 4 + i) > 0.5) {
        this.ctx.fillStyle = "#7ae0ff";
        this.ctx.fillRect(spot.x + 13, spot.y - 10, 1, 1);
      }
    });
    this.each("crown", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawDrivers(t);
    this.drawRigs();
    this.drawPile(CRATE, -6, this.sh - 2, "spark");
  }

  /** From the café with a tea, out to a cab, and back for another. */
  private drawDrivers(t: number): void {
    const ctx = this.ctx;
    this.each("kith", (spot, i, broken, s) => {
      const c = this.drivers[i]!;
      const bob = this.carry(c, 146 + (i % 2) * 6, 20 + i * 26, 9, broken, t);
      this.stand(s, c.x, spot.y - bob);
      if (c.loaded) {
        ctx.fillStyle = "#f4f0e4";
        ctx.fillRect(Math.round(c.x + c.dir * 5), spot.y - 7 - bob, 2, 2);
      }
    });
  }

  /** Both ways down the motorway, headlights first. */
  private drawRigs(): void {
    const ctx = this.ctx;
    this.each("fourth", (spot, i, broken, s) => {
      const rig = this.rigs[i]!;
      if (!broken) {
        const dir = rig.lane === 0 ? -1 : 1;
        rig.x += dir * rig.speed * this.dt;
        const span = SCENE_W + s.w * 2;
        if (rig.x < -s.w) rig.x += span;
        if (rig.x > SCENE_W + s.w) rig.x -= span;
      }
      const y = spot.y;
      if (rig.lane === 1) this.stand(s, rig.x, y);
      else this.standFlipped(s, rig.x, y);
      if (broken) return;
      const nose = rig.lane === 1 ? rig.x + s.w / 2 : rig.x - s.w / 2;
      const beam = ctx.createRadialGradient(nose, y - 4, 0, nose, y - 4, 16);
      beam.addColorStop(0, rgba("#fff4c0", 0.35));
      beam.addColorStop(1, rgba("#fff4c0", 0));
      ctx.fillStyle = beam;
      ctx.fillRect(nose - 16, y - 20, 32, 32);
    });
  }
}
