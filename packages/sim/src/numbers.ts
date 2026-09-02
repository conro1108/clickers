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

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** Idle-game number formatting: 1234567 -> "1.23M". */
export function format(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) {
    return sign + (abs < 10 && abs % 1 !== 0 ? abs.toFixed(1) : Math.floor(abs).toString());
  }
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), SUFFIXES.length - 1);
  const scaled = abs / Math.pow(1000, tier);
  return `${sign}${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

export function formatDuration(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
