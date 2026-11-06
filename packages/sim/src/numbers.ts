// Branded resource type so swapping f64 for a bignum touches only this file. All arithmetic goes through Y.
// Top solo rung costs 8e18 (> 2^53); fine, since costs are compared and subtracted, never counted.

export type Yield = number & { readonly __brand: "Yield" };

/** Milliseconds since epoch, always server time. Never `Date.now()` in sim code. */
export type Millis = number & { readonly __brand: "Millis" };

export type Rate = number & { readonly __brand: "Rate" };

export const Y = {
  of: (n: number): Yield => n as Yield,
  zero: 0 as Yield,
  add: (a: Yield, b: Yield): Yield => (a + b) as Yield,
  sub: (a: Yield, b: Yield): Yield => (a - b) as Yield,
  mul: (a: Yield, k: number): Yield => (a * k) as Yield,
  gte: (a: Yield, b: Yield): boolean => a >= b,
  max: (a: Yield, b: Yield): Yield => (a > b ? a : b),
  min: (a: Yield, b: Yield): Yield => (a < b ? a : b),
  overTime: (rate: Rate, ms: number): Yield => ((rate * ms) / 1000) as Yield,
} as const;

export const ms = (n: number): Millis => n as Millis;
export const seconds = (n: number): number => n * 1000;
export const rate = (n: number): Rate => n as Rate;

// A number past 999 reads as a mantissa and a coin: 1.23⑤ is 1.23 × 1000^5. Each coin is one
// circled-number character, so plain text (feeds, titles, terminals) still reads, and an app swaps
// it for a drawn coin with `coinParts`. Unicode circles 1–50; the last ladder tops out near 1e123, coin 41.
const MAX_TIER = 50;

export function coinChar(tier: number): string {
  if (tier <= 20) return String.fromCodePoint(0x2460 + tier - 1);
  if (tier <= 35) return String.fromCodePoint(0x3251 + tier - 21);
  return String.fromCodePoint(0x32b1 + tier - 36);
}

function coinTier(cp: number): number | null {
  if (cp >= 0x2460 && cp <= 0x2473) return cp - 0x2460 + 1;
  if (cp >= 0x3251 && cp <= 0x325f) return cp - 0x3251 + 21;
  if (cp >= 0x32b1 && cp <= 0x32bf) return cp - 0x32b1 + 36;
  return null;
}

/** Splits formatted text into runs of text and coin tiers: "+1.2⑤/s" -> ["+1.2", 5, "/s"]. */
export function coinParts(text: string): (string | number)[] {
  const out: (string | number)[] = [];
  let run = "";
  for (const ch of text) {
    const tier = coinTier(ch.codePointAt(0)!);
    if (tier === null) {
      run += ch;
      continue;
    }
    if (run) out.push(run);
    out.push(tier);
    run = "";
  }
  if (run) out.push(run);
  return out;
}

/** Idle-game number formatting: 1234567 -> "1.23②". */
export function format(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) {
    return sign + (abs < 10 && abs % 1 !== 0 ? abs.toFixed(1) : Math.floor(abs).toString());
  }
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), MAX_TIER);
  const scaled = abs / Math.pow(1000, tier);
  return `${sign}${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${coinChar(tier)}`;
}

export function formatDuration(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
