// Every per-world word the app says that the engine doesn't. Adding a world is one entry here and one scene.
import { solo } from "@clickers/sim";

export interface WorldCopy {
  /** The world-strip button, and the crossing card. */
  door: string;
  /** Shop subtitle while you're standing here. */
  shopSub: string;
  /**
   * What does the damage once this is the deepest open world — the weather table
   * is the deepest world's, so these key off depth, not where you're standing.
   */
  culprit: string;
  /** "Buildings are the only defence worth having against {threat} while the tab is closed." */
  threat: string;
  /** The gate's sale screen, when this world is next. Absent for the world you start in. */
  gateLine?: string;
  /** The cut on arrival, in the order the lines land. */
  cut?: { line: string; call: string; title: string };
}

export const WORLD_COPY: Record<solo.World, WorldCopy> = {
  outside: {
    door: "Under the sky",
    shopSub: "More kit on the land, and the upgrades that make it worth more.",
    culprit: "the weather",
    threat: "weather that lands",
  },
  inside: {
    door: "Inside the potato",
    shopSub: "What there is to work down here, and what makes it work harder.",
    culprit: "the tuber",
    threat: "something that stirs",
    gateLine: "You have spent this whole run on its skin.",
    cut: {
      line: "The first potato was never in the ground",
      call: "You have always been inside it",
      title: "The Convergence",
    },
  },
  beyond: {
    door: "Through the eye",
    shopSub: "What grows on the inside of the inside, and what makes it grow harder.",
    culprit: "the sun",
    threat: "a sun that watches",
    gateLine: "You have spent this whole run getting to the middle of it.",
    cut: {
      line: "The second potato was never asleep",
      call: "There is a field on the other side of its eye",
      title: "The Breach",
    },
  },
  deep: {
    door: "Down in the crystal",
    shopSub: "What the starch turned into down here, and how to cut more of it.",
    culprit: "the stone",
    threat: "stone that shifts",
    gateLine: "You have spent this whole run under a sun. There is a floor under the floor.",
    cut: {
      line: "The field had a floor",
      call: "Under it the starch has gone to glass",
      title: "The Rift",
    },
  },
  origin: {
    door: "The first field",
    shopSub: "The field before all the others, and what it grew first.",
    culprit: "the season",
    threat: "a season that turns",
    gateLine: "You have spent this whole run going down. The bottom is the beginning.",
    cut: {
      line: "Every potato came from one potato",
      call: "It is the first morning, and it is still in the ground",
      title: "The Return",
    },
  },
  void: {
    door: "Before",
    shopSub: "Nothing has grown here yet. Out here, everything costs more for every seed you carry.",
    culprit: "the dark",
    threat: "a dark that shifts",
    gateLine: "You have spent this whole run in the first field. Somebody planted it.",
    cut: {
      line: "The first potato came from somewhere",
      call: "It is dark here, and it is not empty",
      title: "Before",
    },
  },
  end: {
    door: "The last field",
    shopSub: "Where every potato ends up. Out here, everything costs more for every seed you carry.",
    culprit: "the end",
    threat: "an end that comes on slowly",
    gateLine: "You have spent this whole run before the beginning. There is an end as well.",
    cut: {
      line: "Every field ends somewhere",
      call: "This is where all of them end",
      title: "The Last Furrow",
    },
  },
  after: {
    door: "Under the ash",
    shopSub: "What everything turns into. Nothing down here is priced for one lifetime.",
    culprit: "the rot",
    threat: "a heap that shifts",
    gateLine: "You have spent this whole run at the end. Something under it is eating. One lifetime won't get you far down there.",
    cut: {
      line: "Nothing that ends stays ended",
      call: "It is warm under the ash, and it is moving",
      title: "The Heap",
    },
  },
  above: {
    door: "The kitchen",
    shopSub: "Where the peelings come from. Nothing in here is priced for one lifetime.",
    culprit: "the cook",
    threat: "a cook with a temper",
    gateLine: "You have spent this whole run in a heap round the back of a house. It will take more than one lifetime to reach the step.",
    cut: {
      line: "The heap is round the back of a house",
      call: "There is a light on, and a knife going",
      title: "The Kitchen",
    },
  },
  home: {
    door: "The table",
    shopSub: "Where all of it has been going. Nothing out here is priced for one lifetime.",
    culprit: "the guests",
    threat: "a table that turns",
    gateLine: "You have spent this whole run in the kitchen. Every plate goes through that door, and no lifetime has ever followed one.",
    cut: {
      line: "Somebody ordered this",
      call: "They have been sitting down the whole time",
      title: "Dinner",
    },
  },
};

/** Whose weather it is: the deepest open world's. */
export function culprit(farm: solo.SiteState): string {
  return WORLD_COPY[deepest(farm)].culprit;
}

export function threat(farm: solo.SiteState): string {
  return WORLD_COPY[deepest(farm)].threat;
}

function deepest(farm: solo.SiteState): solo.World {
  return solo.WORLDS[farm.depth] ?? "outside";
}
