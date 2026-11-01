// Every per-world word the app shell needs, in one place. The engine's own words for what's *in* a
// world live in theme.ts; these are about the world itself. Adding a world is one entry here and one scene.
import { solo } from "@clickers/sim";

export interface WorldCopy {
  /** On the world strip and the crossing card. */
  door: string;
  /** The shop's subtitle while you stand here. */
  shop: string;
  /** What's doing the damage once this is the deepest world open — the weather is that world's. */
  culprit: string;
  /** "Buildings work … against {against} while the tab is closed." */
  against: string;
  /**
   * The cut you get on arriving, and the one sentence on the sale screen for the gate into it.
   * Absent outside, which nobody arrives at.
   */
  arrival?: { line: string; call: string; title: string; waiting: string };
}

export const WORLD_COPY: Record<solo.World, WorldCopy> = {
  outside: {
    door: "The yard",
    shop: "More kit on the land, and the upgrades that make it worth more.",
    culprit: "the weather",
    against: "weather that lands",
  },
  inside: {
    door: "The nest",
    shop: "What there is to work down here, and what makes it work harder.",
    culprit: "the nest",
    against: "something that stirs",
    arrival: {
      line: "The ground was never ground",
      call: "You have always been under the blanket",
      title: "The Convergence",
      waiting: "You have spent this whole run on the outside of it.",
    },
  },
  beyond: {
    door: "The dream",
    shop: "What there is out here, while it's still dreaming.",
    culprit: "the dream",
    against: "a dream that twitches",
    arrival: {
      line: "Its paws are twitching",
      call: "It has been dreaming of you the whole time",
      title: "The Dream",
      waiting: "You have spent this whole run in the warm, next to it, while it slept.",
    },
  },
  deep: {
    door: "The deep",
    shop: "Everything every dog ever lost ended up down here. Some of it still works.",
    culprit: "the deep",
    against: "something settling in the dark",
    arrival: {
      line: "The dream has a floor",
      call: "Everything that was ever lost is down here with you",
      title: "The Deep",
      waiting: "The lawn is only the top of it. Things keep sinking through.",
    },
  },
  origin: {
    door: "The fire",
    shop: "Before kennels, before names. A fire, and something at the edge of it.",
    culprit: "the wild",
    against: "a night with wolves in it",
    arrival: {
      line: "There is a fire, and it is the first one",
      call: "Something at the edge of the light is deciding about you",
      title: "The First Fire",
      waiting: "Under everything that was lost is the thing that was found.",
    },
  },
  void: {
    door: "The sky",
    shop: "Before there were dogs. Up here, everything costs more for every paper you carry.",
    culprit: "the dark",
    against: "a sky that shifts",
    arrival: {
      line: "Before the first dog there was a dog in the sky",
      call: "It is still up there, and it is shaking",
      title: "Look Up",
      waiting: "You have spent this whole run by the fire. Nobody has looked up yet.",
    },
  },
  end: {
    door: "The bridge",
    shop: "Where every dog goes. Up here, everything costs more for every paper you carry.",
    culprit: "the end",
    against: "an end that comes on slowly",
    arrival: {
      line: "Every dog goes somewhere",
      call: "There is a bridge, and they are all waiting on the other side",
      title: "The Bridge",
      waiting: "You have spent this whole run before the first dog. There is an after, too.",
    },
  },
  after: {
    door: "The far side",
    shop: "Past the bridge, and it's a park. Nothing here is priced for one lifetime.",
    culprit: "the park",
    against: "a park with squirrels in it",
    arrival: {
      line: "Nobody ever asked what was on the far side",
      call: "It is a park, and every gate is open",
      title: "The Far Side",
      waiting: "You have spent this whole run at the bridge. One lifetime won't get you far past it.",
    },
  },
  above: {
    door: "The walk",
    shop: "Uphill, and a long way. Nothing here is priced for one lifetime.",
    culprit: "the hill",
    against: "a hill with weather on it",
    arrival: {
      line: "There is a gate at the top of the park",
      call: "Somebody is whistling, a long way off, and it is for you",
      title: "The Long Walk",
      waiting: "You have spent this whole run off the lead. It will take more than one lifetime to reach the top gate.",
    },
  },
  home: {
    door: "The porch",
    shop: "The top of the hill. Nothing here is priced for one lifetime.",
    culprit: "the house",
    against: "a house with a vacuum in it",
    arrival: {
      line: "There is a light on",
      call: "Somebody has been saying your name the whole time",
      title: "Home",
      waiting: "You have spent this whole run walking. No one lifetime has ever made it up that hill.",
    },
  },
};

/** The deepest world open: the one whose weather is blowing. */
export function deepest(f: solo.SiteState): solo.World {
  return solo.WORLDS[f.depth] ?? "outside";
}

/** Who to blame, whichever world you're standing in — the weather is the deepest world's. */
export function culprit(f: solo.SiteState): string {
  return WORLD_COPY[deepest(f)].culprit;
}
