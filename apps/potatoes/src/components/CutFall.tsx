import { useEffect, useRef } from "react";
import type { solo } from "@clickers/sim";

import { drawCut, SUBJECTS } from "../render/crossing.js";

/** The fall half of an arrival cut, on its own clock from mount. Stops drawing once it's through. */
export function CutFall({ world, ms }: { world: solo.World; ms: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || world === "outside") return;
    const ctx = canvas.getContext("2d")!;
    const subject = SUBJECTS[world];
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const elapsed = now - start;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawCut(ctx, w, h, subject, elapsed / ms, elapsed);
      if (elapsed < ms * 0.56) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, ms]);
  return <canvas ref={ref} className="converge-fall" />;
}
