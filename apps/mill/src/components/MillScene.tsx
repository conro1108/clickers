import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { solo, type Puppies } from "@mill/sim";

import { producerMark } from "../marks.js";
import { EMPTY_VIEW, MillScene as Scene, type MillView } from "../render/millScene.js";
import { InsideScene } from "../render/insideScene.js";

export interface MillSceneHandle {
  /** Turn a puppy up out of the ground. Somewhere in the field if unplaced. */
  whistle(at?: { x: number; y: number }): void;
}

/**
 * Both renderers, to the extent React cares about either. They're separate
 * classes with separate pictures — see `insideScene.ts` — but they take the same
 * view and answer the same two verbs, which is all this needs to know.
 */
interface SceneLike {
  update(view: MillView): void;
  start(): void;
  stop(): void;
  whistle(at?: { x: number; y: number }): void;
}

/** The canvas and its rAF loop. React only ever hands it a view. */
const SceneCanvas = forwardRef<MillSceneHandle, {
  view: MillView;
  /**
   * Which world's picture to run. Changing it tears the canvas down and builds
   * the other one, which is exactly right: warping is meant to be a different
   * place, not a repaint.
   */
  world?: solo.World;
  onPointerDown?: PointerEventHandler<HTMLCanvasElement>;
}>(function SceneCanvas({ view, world = "outside", onPointerDown }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneLike | null>(null);
  // Held in a ref so the mount effect can seed the new scene without taking a
  // dependency on a view that changes every tick.
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene: SceneLike = world === "inside" ? new InsideScene(canvas) : new Scene(canvas);
    sceneRef.current = scene;
    scene.update(latest.current);
    scene.start();
    return () => {
      scene.stop();
      sceneRef.current = null;
    };
    // Only on a change of world: the view is pushed by the effect below, and
    // re-creating the scene on every tick would restart its clock and reset
    // every animation on it.
  }, [world]);

  useEffect(() => {
    sceneRef.current?.update(view);
  }, [view]);

  useImperativeHandle(ref, () => ({ whistle: (at) => sceneRef.current?.whistle(at) }), []);

  return <canvas ref={canvasRef} className="scene" onPointerDown={onPointerDown} />;
});

/**
 * The mill, on a canvas.
 *
 * The whole surface whistles. That's deliberate — the thing you're looking at and
 * the thing you're tapping should be the same thing — and the whistle bar below it
 * is the discoverable version of the same verb.
 */
export const MillScene = forwardRef<MillSceneHandle, {
  mill: solo.MillState;
  hoard: Puppies;
  /** Given where on the buffer you tapped, when the whistle came from the scene. */
  onWhistle: (at?: { x: number; y: number }) => void;
  /**
   * Which mill to draw, when that isn't the one the sim says you're standing on.
   *
   * Exactly one caller and exactly one reason: the Convergence moves you inside
   * the instant it's bought, and the trip that takes you there is nine seconds
   * long. Without this the canvas is already inside the puppy while the cut is
   * still fading up over the sky — the arrival, before the journey. So the
   * screen keeps the mill you're standing on until the dark has the screen, and
   * the swap happens where nobody can see it.
   */
  world?: solo.World;
  /** Anything that belongs over the mill rather than beside it. */
  children?: ReactNode;
}>(function MillScene({ mill, hoard, onWhistle, world = mill.world, children }, ref) {
  const view = useMemo<MillView>(() => {
    const working: MillView["working"] = {};
    const broken: MillView["broken"] = {};
    const marks: MillView["marks"] = {};
    // Only the world you're standing in. The other mill is still producing —
    // that's the whole arrangement after the fold — but it's producing somewhere
    // you can't see from here, and drawing an Hem Bed over a wheat
    // field would say the opposite.
    for (const prod of solo.producersIn(world)) {
      const owned = mill.producers[prod.id] ?? 0;
      const dead = solo.brokenCount(mill, prod.id);
      if (owned - dead > 0) working[prod.id] = owned - dead;
      if (dead > 0) broken[prod.id] = dead;
      const level = producerMark(mill, prod.id);
      if (level > 0) marks[prod.id] = level;
    }
    return {
      ...EMPTY_VIEW,
      working,
      broken,
      marks,
      bedding: mill.bedding,
      hoard,
      seed: mill.seed,
      // Zero once it's happened: `convergenceProgress` pins at 1 forever, and
      // the stain is a warning rather than a state. Under this sky the fold is
      // still ahead of you or already behind you, and either way the weather
      // came back.
      looming: mill.converged ? 0 : solo.convergenceProgress(mill),
      generation: mill.generation,
    };
  }, [mill, hoard, world]);

  return (
    <div className="stage">
      <SceneCanvas
        ref={ref}
        view={view}
        world={world}
        onPointerDown={(e) => {
          e.preventDefault();
          // Into buffer pixels, so the puppy comes up under your finger
          // rather than somewhere else on the mill.
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return onWhistle();
          onWhistle({
            x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
            y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
          });
        }}
      />
      {children}
    </div>
  );
});

/** A mill nobody owns, running on the title screen so it isn't a blank page. */
const DEMO_VIEW: MillView = {
  ...EMPTY_VIEW,
  working: { pen: 9, hand: 2, heatlamp: 1, van: 1 },
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
