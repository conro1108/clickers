import { ms, type Millis } from "@clickers/sim";

// Single source of "now"; the server-time offset lands here so nothing else has to change.
let offset = 0;

export function setServerOffset(deltaMs: number): void {
  offset = deltaMs;
}

// Dev-only forward skew, separate from the server offset. Persisted so a reload does not undo a jump mid-test.
const SKEW_KEY = "potatoes-inc:dev-skew";

let skew = readSkew();

function readSkew(): number {
  try {
    const n = Number(localStorage.getItem(SKEW_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function clockSkew(): number {
  return skew;
}

/** Shove the clock forward by `byMs`, or back to true time with 0. */
export function setClockSkew(next: number): void {
  skew = Math.max(0, next);
  try {
    if (skew === 0) localStorage.removeItem(SKEW_KEY);
    else localStorage.setItem(SKEW_KEY, String(skew));
  } catch {
  }
}

export function nowMs(): Millis {
  return ms(Date.now() + offset + skew);
}
