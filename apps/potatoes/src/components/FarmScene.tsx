import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { solo, type Yield } from "@clickers/sim";

import { producerMark } from "../marks.js";
import { EMPTY_VIEW, FarmScene as Scene, type FarmView } from "../render/farmScene.js";
import { BeyondScene } from "../render/beyondScene.js";
import { InsideScene } from "../render/insideScene.js";

export interface FarmSceneHandle {
  /** Turn a potato up out of the ground. Somewhere in the field if unplaced. */
  dig(at?: { x: number; y: number }): void;
}

/** What React needs from any renderer (farmScene.ts / insideScene.ts / beyondScene.ts). */
interface SceneLike {
  update(view: FarmView): void;
  start(): void;
  stop(): void;
  dig(at?: { x: number; y: number }): void;
}

/** The canvas and its rAF loop. React only ever hands it a view. */
const SceneCanvas = forwardRef<FarmSceneHandle, {
  view: FarmView;
  /** Changing world rebuilds the scene — warping is a different place, not a repaint. */
  world?: solo.World;
  onPointerDown?: PointerEventHandler<HTMLCanvasElement>;
}>(function SceneCanvas({ view, world = "outside", onPointerDown }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneLike | null>(null);
  // Ref so the mount effect can seed the scene without depending on a per-tick view.
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene: SceneLike =
      world === "beyond"
        ? new BeyondScene(canvas)
        : world === "inside"
          ? new InsideScene(canvas)
          : new Scene(canvas);
    sceneRef.current = scene;
    scene.update(latest.current);
    scene.start();
    return () => {
      scene.stop();
      sceneRef.current = null;
    };
    // Only on world change; re-creating per tick would reset every animation.
  }, [world]);

  useEffect(() => {
    sceneRef.current?.update(view);
  }, [view]);

  useImperativeHandle(ref, () => ({ dig: (at) => sceneRef.current?.dig(at) }), []);

  return <canvas ref={canvasRef} className="scene" onPointerDown={onPointerDown} />;
});

/** The farm, on a canvas. The whole surface digs. */
export const FarmScene = forwardRef<FarmSceneHandle, {
  farm: solo.SiteState;
  hoard: Yield;
  /** Given where on the buffer you tapped, when the dig came from the scene. */
  onDig: (at?: { x: number; y: number }) => void;
  /** Override of the sim's world: the Convergence cut holds the old farm until the fade is black. */
  world?: solo.World;
  /** Anything that belongs over the farm rather than beside it. */
  children?: ReactNode;
}>(function FarmScene({ farm, hoard, onDig, world = farm.world, children }, ref) {
  const view = useMemo<FarmView>(() => {
    const working: FarmView["working"] = {};
    const broken: FarmView["broken"] = {};
    const marks: FarmView["marks"] = {};
    // Only the world you're standing in; the other farm produces out of sight.
    for (const prod of solo.producersIn(world)) {
      const owned = farm.producers[prod.id] ?? 0;
      const dead = solo.brokenCount(farm, prod.id);
      if (owned - dead > 0) working[prod.id] = owned - dead;
      if (dead > 0) broken[prod.id] = dead;
      const level = producerMark(farm, prod.id);
      if (level > 0) marks[prod.id] = level;
    }
    return {
      ...EMPTY_VIEW,
      working,
      broken,
      marks,
      condition: farm.condition,
      hoard,
      seed: farm.seed,
      // Zero once converged: `convergenceProgress` pins at 1 forever and the stain is a warning.
      looming: farm.converged ? 0 : solo.convergenceProgress(farm),
      generation: farm.generation,
    };
  }, [farm, hoard, world]);

  return (
    <div className="stage">
      <SceneCanvas
        ref={ref}
        view={view}
        world={world}
        onPointerDown={(e) => {
          e.preventDefault();
          // Into buffer pixels, so the potato comes up under your finger.
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return onDig();
          onDig({
            x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
            y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
          });
        }}
      />
      {children}
    </div>
  );
});

/** A farm nobody owns, running on the title screen so it isn't a blank page. */
const DEMO_VIEW: FarmView = {
  ...EMPTY_VIEW,
  working: { patch: 9, hand: 2, rig: 1, hauler: 1 },
  hoard: 400,
  seed: "title",
};

export function TitleScene() {
  return (
    <div className="title-scene">
      <SceneCanvas view={DEMO_VIEW} />
    </div>
  );
}
