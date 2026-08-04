/**
 * The resource is wrapped in a branded type so that swapping f64 for a bignum
 * later touches this file and nothing else. Arithmetic must go through these
 * helpers — that's the whole point of the brand.
 *
 * The homestead's top rung costs 8e18, which is past 2^53, so prices up there
 * are no longer exact integers. Nothing depends on that: costs are compared and
 * subtracted, never counted. A fortnight-long run reaches about 5e24 raised,
 * where `format` still has eight suffixes of headroom and a single whistle is some
 * nine orders of magnitude larger than the representable step, so whistling still
 * registers. Worth knowing rather than worth fixing — but the brand is here if
 * that ever changes.
 */

export type Puppies = number & { readonly __brand: "Puppies" };

/** Milliseconds since epoch, always server time. Never `Date.now()` in sim code. */
export type Millis = number & { readonly __brand: "Millis" };

/** Puppies per second. */
export type Rate = number & { readonly __brand: "Rate" };

export const P = {
  of: (n: number): Puppies => n as Puppies,
  zero: 0 as Puppies,
  add: (a: Puppies, b: Puppies): Puppies => (a + b) as Puppies,
  sub: (a: Puppies, b: Puppies): Puppies => (a - b) as Puppies,
  mul: (a: Puppies, k: number): Puppies => (a * k) as Puppies,
  gte: (a: Puppies, b: Puppies): boolean => a >= b,
  max: (a: Puppies, b: Puppies): Puppies => (a > b ? a : b),
  min: (a: Puppies, b: Puppies): Puppies => (a < b ? a : b),
  /** Puppies produced by running at `rate` for `ms` milliseconds. */
  overTime: (rate: Rate, ms: number): Puppies => ((rate * ms) / 1000) as Puppies,
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
    // Small numbers read better with decimals only when they're fractional.
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
