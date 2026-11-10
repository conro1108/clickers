// Every per-world word the app shell needs, in one place. The engine's own words for what's *in* a
// world live in theme.ts; these are about the world itself. Adding a world is one entry here and one scene.
//
// The worlds are one journey: the mill makes them, and the rest is them getting out and getting home.
// The mill, the tunnel under its yard, out the back of the estate, the canal out of town, a fire at the
// edge of the woods, a night on the hill, the bridge, the far side, the walk, the porch. From the tunnel
// on the count is the pack and the copy says "they"; it turns to "you" on the walk, where somebody is
// whistling. Engine ids keep their old names (`inside` is the tunnel, `void` the hill).
import { solo } from "@clickers/sim";

export interface WorldCopy {
  /** On the world strip and the crossing card. */
  door: string;
  /** Under the count in the HUD, while you're standing here: where the dogs are. */
  held: string;
  /** The button, while you're standing here. Whistle at the mill; by the porch it's what a dog gets told. */
  verb: string;
  /** The condition bar's word, once this is the deepest open world (same rule as `culprit`). */
  kept: string;
  /** The shop's subtitle while you stand here. */
  shop: string;
  /** What's doing the damage once this is the deepest world open — the weather is that world's. */
  culprit: string;
  /** "Buildings work … against {against} while the tab is closed." */
  against: string;
  /** The one sentence on the sale screen for the gate into it. Absent at the mill, which nobody arrives at. */
  gateLine?: string;
  /** The cut on arrival, in the order the lines land: where they are, plainly; then the turn; then the card. */
  cut?: { line: string; call: string; title: string };
}

export const WORLD_COPY: Record<solo.World, WorldCopy> = {
  outside: {
    door: "The mill",
    held: "in the yard",
    verb: "Whistle",
    kept: "bedding",
    shop: "More kit in the shed, and the upgrades that make it worth more.",
    culprit: "the weather",
    against: "weather that lands",
  },
  inside: {
    door: "The tunnel",
    held: "underground",
    verb: "Dig",
    kept: "air",
    shop: "Under the yard, heading for the fence. What there is to dig with, and who's digging.",
    culprit: "the ground",
    against: "ground that gives",
    gateLine: "Every one you ever raised left in a van. Some of them have had another idea.",
    cut: {
      line: "One of them is looking at the fence",
      call: "The rest have been digging the whole time",
      title: "The Tunnel",
    },
  },
  beyond: {
    door: "Out the back",
    held: "out",
    verb: "Run",
    kept: "cover",
    shop: "The first air any of them has had. Bins, a back door, and the mill's own vans out looking.",
    culprit: "the vans",
    against: "vans that come looking",
    gateLine: "The tunnel is under the wire. Nobody has put a head out yet.",
    cut: {
      line: "The tunnel comes up behind the bins",
      call: "It is three in the morning and nobody stops them",
      title: "Out",
    },
  },
  deep: {
    door: "The cut",
    held: "on the towpath",
    verb: "Fetch",
    kept: "path",
    shop: "The canal goes out of town, so they do. Everything anybody ever lost is in it.",
    culprit: "the water",
    against: "water that rises",
    gateLine: "They are out, and still in sight of the sign. The canal goes somewhere else.",
    cut: {
      line: "Behind the last unit there is a canal",
      call: "It goes out of town, so they do",
      title: "The Cut",
    },
  },
  origin: {
    door: "The fire",
    held: "at the fire",
    verb: "Beg",
    kept: "camp",
    shop: "Where the canal runs out there are trees, and somebody has a fire going.",
    culprit: "the woods",
    against: "a wood with foxes in it",
    gateLine: "The water has brought them as far as it goes. Somebody past the trees is cooking.",
    cut: {
      line: "Past the last lock there is a fire, and somebody at it",
      call: "At the edge of the light, forty dogs are deciding about them",
      title: "The Fire",
    },
  },
  void: {
    door: "The hill",
    held: "on the hill",
    verb: "Howl",
    kept: "dark",
    shop: "Open country, no roof, every star out. Up here, everything costs more for every paper you carry.",
    culprit: "the sky",
    against: "a sky that turns",
    gateLine: "They have spent this whole run by the fire. Nobody has looked up yet.",
    cut: {
      line: "Above the trees there is a hill with nothing on it",
      call: "They sleep in the open, and one of the stars is a dog",
      title: "Look Up",
    },
  },
  end: {
    door: "The bridge",
    held: "at the bridge",
    verb: "Cross",
    kept: "meadow",
    shop: "Morning, after rain, and a rainbow with one foot on the bridge. Up here, everything costs more for every paper you carry.",
    culprit: "the river",
    against: "a river that rises",
    gateLine: "They have spent this whole run under the stars. In the morning there is a river to cross.",
    cut: {
      line: "It rained in the night",
      call: "There is a bridge, and they are all waiting on the other side",
      title: "The Bridge",
    },
  },
  after: {
    door: "The far side",
    held: "in the park",
    verb: "Play",
    kept: "grass",
    shop: "Past the bridge, and it's a park. Nothing here is priced for one lifetime.",
    culprit: "the park",
    against: "a park with squirrels in it",
    gateLine: "They have spent this whole run at the bridge. One lifetime won't get them far past it.",
    cut: {
      line: "Nobody ever asked what was on the far side",
      call: "It is a park, and every gate is open",
      title: "The Far Side",
    },
  },
  above: {
    door: "The walk",
    held: "on the walk",
    verb: "Heel",
    kept: "path",
    shop: "Uphill, and a long way. Nothing here is priced for one lifetime.",
    culprit: "the hill",
    against: "a hill with weather on it",
    gateLine: "They have spent this whole run off the lead. It will take more than one lifetime to reach the top gate.",
    cut: {
      line: "There is a gate at the top of the park",
      call: "Somebody is whistling, a long way off, and it is for you",
      title: "The Long Walk",
    },
  },
  home: {
    door: "The porch",
    held: "on the porch",
    verb: "Come",
    kept: "house",
    shop: "The top of the hill. Nothing here is priced for one lifetime.",
    culprit: "the house",
    against: "a house with a vacuum in it",
    gateLine: "You have spent this whole run walking. No one lifetime has ever made it up that hill.",
    cut: {
      line: "There is a light on",
      call: "Somebody has been saying your name the whole time",
      title: "Home",
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

/** What the condition bar is measuring: the deepest open world's, because that's whose weather wears it down. */
export function kept(f: solo.SiteState): string {
  return WORLD_COPY[deepest(f)].kept;
}
