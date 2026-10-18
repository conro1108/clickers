import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { PRODUCERS, solo, type PlayerState, type Yield } from "@clickers/sim";

import { matchMark, producerMark } from "../marks.js";
import { EMPTY_VIEW, MillScene as Scene, type MillView } from "../render/millScene.js";
import { InsideScene } from "../render/insideScene.js";
import { BeyondScene } from "../render/beyondScene.js";
import { DeepScene } from "../render/deepScene.js";
import { OriginScene } from "../render/originScene.js";

export interface MillSceneHandle {
  whistle(at?: { x: number; y: number }): void;
}

interface SceneLike {
  update(view: MillView): void;
  start(): void;
  stop(): void;
  whistle(at?: { x: number; y: number }): void;
}

/** One picture per world. Warping is a different place, not a repaint. */
const SCENES: Record<solo.World, new (canvas: HTMLCanvasElement) => SceneLike> = {
  outside: Scene,
  inside: InsideScene,
  beyond: BeyondScene,
  deep: DeepScene,
  origin: OriginScene,
};

/** The canvas and its rAF loop. React only ever hands it a view. */
const SceneCanvas = forwardRef<MillSceneHandle, {
  view: MillView;
  world?: solo.World;
  onPointerDown?: PointerEventHandler<HTMLCanvasElement>;
}>(function SceneCanvas({ view, world = "outside", onPointerDown }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneLike | null>(null);
  // A ref, so the mount effect can seed the scene without depending on a view that changes every tick.
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene: SceneLike = new SCENES[world](canvas);
    sceneRef.current = scene;
    scene.update(latest.current);
    scene.start();
    return () => {
      scene.stop();
      sceneRef.current = null;
    };
    // Only on a change of world; re-creating the scene every tick would reset its clock and animations.
  }, [world]);

  useEffect(() => {
    sceneRef.current?.update(view);
  }, [view]);

  useImperativeHandle(ref, () => ({ whistle: (at) => sceneRef.current?.whistle(at) }), []);

  return <canvas ref={canvasRef} className="scene" onPointerDown={onPointerDown} />;
});

/** A tap on the canvas, in buffer pixels. */
function whistleAt(
  e: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number; preventDefault(): void },
  onWhistle: (at?: { x: number; y: number }) => void,
): void {
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return onWhistle();
  onWhistle({
    x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
    y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
  });
}

export const MillScene = forwardRef<MillSceneHandle, {
  mill: solo.SiteState;
  hoard: Yield;
  onWhistle: (at?: { x: number; y: number }) => void;
  world?: solo.World;
  children?: ReactNode;
}>(function MillScene({ mill, hoard, onWhistle, world = mill.world, children }, ref) {
  const view = useMemo<MillView>(() => {
    const working: MillView["working"] = {};
    const broken: MillView["broken"] = {};
    const marks: MillView["marks"] = {};
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
      condition: mill.condition,
      hoard,
      seed: mill.seed,
      // Zero once it's happened: `convergenceProgress` pins at 1 forever, and the stain is a warning rather than a state.
      looming: mill.depth >= 1 ? 0 : solo.convergenceProgress(mill),
      generation: mill.generation,
    };
  }, [mill, hoard, world]);

  return (
    <div className="stage">
      <SceneCanvas
        ref={ref}
        view={view}
        world={world}
        onPointerDown={(e) => whistleAt(e, onWhistle)}
      />
      {children}
    </div>
  );
});

/** The same picture, for the head-to-head prototype. */
export const MatchScene = forwardRef<MillSceneHandle, {
  me: PlayerState;
  hoard: Yield;
  onWhistle: (at?: { x: number; y: number }) => void;
  children?: ReactNode;
}>(function MatchScene({ me, hoard, onWhistle, children }, ref) {
  const view = useMemo<MillView>(() => {
    const working: MillView["working"] = {};
    const broken: MillView["broken"] = {};
    const marks: MillView["marks"] = {};
    for (const prod of PRODUCERS) {
      const owned = me.producers[prod.id] ?? 0;
      const dead = Math.min(me.broken[prod.id] ?? 0, owned);
      if (owned - dead > 0) working[prod.id] = owned - dead;
      if (dead > 0) broken[prod.id] = dead;
      const level = matchMark(me.upgrades, prod.id);
      if (level > 0) marks[prod.id] = level;
    }
    // Seeded off the player rather than the match, so a rematch is the same yard laid out the same way — it's your mill both times.
    return { ...EMPTY_VIEW, working, broken, marks, hoard, seed: me.id };
  }, [me, hoard]);

  return (
    <div className="stage">
      <SceneCanvas ref={ref} view={view} onPointerDown={(e) => whistleAt(e, onWhistle)} />
      {children}
    </div>
  );
});

/** A mill nobody owns, running on the title screen so it isn't a blank page. */
const DEMO_VIEW: MillView = {
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
