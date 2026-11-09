// Every per-world word the app says that the engine doesn't. Adding a world is one entry here and one scene.
//
// The worlds are the potato's whole life, in order: the farm, the store, the factory, the road, the market,
// the supermarket, the larder, the kitchen, the table, and the heap that goes back on the farm. Each gate is
// the company buying the next link in the chain. Engine ids keep their old names (`inside` is the store).
import { solo } from "@clickers/sim";

export interface WorldCopy {
  /** The world-strip button, and the crossing card. */
  door: string;
  /** Under the count in the HUD, while you're standing here: where your potatoes are. */
  held: string;
  /** The dig button, while you're standing here. */
  verb: string;
  /** The condition bar's word, once this is the deepest open world (same rule as `culprit`). */
  kept: string;
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
  /** The cut on arrival, in the order the lines land: where you are, plainly; then the joke; then the card. */
  cut?: { line: string; call: string; title: string };
}

export const WORLD_COPY: Record<solo.World, WorldCopy> = {
  outside: {
    door: "The farm",
    held: "in the yard",
    verb: "Dig",
    kept: "soil",
    shopSub: "More kit on the land, and the upgrades that make it worth more.",
    culprit: "the weather",
    threat: "weather that lands",
  },
  inside: {
    door: "The store",
    held: "in store",
    verb: "Sort",
    kept: "cool",
    shopSub: "Where the harvest waits for a buyer. Kept dark, kept cool, kept counted.",
    culprit: "the damp",
    threat: "damp that gets in",
    gateLine: "You grow every potato there is. Somebody else gets paid to keep them.",
    cut: {
      line: "The harvest has to go somewhere",
      call: "It goes in here, in the dark, and waits",
      title: "The Store",
    },
  },
  beyond: {
    door: "The factory",
    held: "bagged",
    verb: "Bag",
    kept: "line",
    shopSub: "Washed, graded, bagged and fried. What comes out doesn't look much like what went in.",
    culprit: "the line",
    threat: "a line that jams",
    gateLine: "Every potato in the land is in your store. Somebody else washes them and puts them in bags.",
    cut: {
      line: "Nobody buys a potato with mud on",
      call: "So they all come through here first",
      title: "The Factory",
    },
  },
  deep: {
    door: "The road",
    held: "on the lorry",
    verb: "Load",
    kept: "road",
    shopSub: "Everything that leaves the factory leaves on a lorry, at four in the morning.",
    culprit: "the traffic",
    threat: "a road that closes",
    gateLine: "Your factory bags every potato there is. Somebody else drives them away.",
    cut: {
      line: "A bag of potatoes can't walk",
      call: "So it goes by road, all night, up the motorway",
      title: "The Road",
    },
  },
  origin: {
    door: "The market",
    held: "at market",
    verb: "Sell",
    kept: "trade",
    shopSub: "Where a potato finds out what it's worth. Mostly not much.",
    culprit: "the market",
    threat: "prices that drop",
    gateLine: "Your lorries carry every potato there is. Somebody else is selling them.",
    cut: {
      line: "Every lorry ends up at the market",
      call: "The price of a potato gets shouted here, at five in the morning",
      title: "The Market",
    },
  },
  void: {
    door: "The supermarket",
    held: "on the shelves",
    verb: "Stack",
    kept: "shelves",
    shopSub: "Every potato in the world at 89p a bag. In here, everything costs more for every seed you carry.",
    culprit: "the customers",
    threat: "customers who squeeze",
    gateLine: "The whole market is yours. Somebody else puts the potatoes on a shelf and charges for them.",
    cut: {
      line: "Nobody goes to the market any more",
      call: "They come here, under the strip lights",
      title: "The Supermarket",
    },
  },
  end: {
    door: "The larder",
    held: "in the larder",
    verb: "Fetch",
    kept: "dark",
    shopSub: "A cupboard under somebody's stairs. In here, everything costs more for every seed you carry.",
    culprit: "the mice",
    threat: "mice that get in",
    gateLine: "Every supermarket is yours. Somebody takes a bag home and forgets about it.",
    cut: {
      line: "Somebody bought a bag",
      call: "It went home, into the cupboard under the stairs",
      title: "The Larder",
    },
  },
  after: {
    door: "The kitchen",
    held: "in the pot",
    verb: "Peel",
    kept: "clean",
    shopSub: "Where a potato stops being a potato. Nothing in here is priced for one lifetime.",
    culprit: "the cook",
    threat: "a cook with a temper",
    gateLine: "Every larder is yours. Somebody is about to cook what's in it. One lifetime won't get you far in there.",
    cut: {
      line: "Tonight it's potatoes",
      call: "Somebody has the peeler out and the water on",
      title: "The Kitchen",
    },
  },
  above: {
    door: "The table",
    held: "on the plate",
    verb: "Serve",
    kept: "mood",
    shopSub: "Where all of it has been going. Nothing out here is priced for one lifetime.",
    culprit: "the guests",
    threat: "a table that turns",
    gateLine: "You run the kitchen. Every plate goes through that hatch, and no lifetime has ever followed one.",
    cut: {
      line: "Dinner is served",
      call: "Every field, every lorry, every shelf, for this",
      title: "Dinner",
    },
  },
  home: {
    door: "The heap",
    held: "on the heap",
    verb: "Turn",
    kept: "heat",
    shopSub: "What nobody finished goes out the back and into the ground again. Nothing out here is priced for one lifetime.",
    culprit: "the rot",
    threat: "a heap that slumps",
    gateLine: "You laid the table. What's left goes out the back door, and it will take more than one lifetime to follow it.",
    cut: {
      line: "Somebody scraped the plates",
      call: "It all goes on the heap, and the heap goes back on the field",
      title: "The Heap",
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

/** What the condition bar is measuring: the deepest open world's, because that's whose weather wears it down. */
export function kept(farm: solo.SiteState): string {
  return WORLD_COPY[deepest(farm)].kept;
}

function deepest(farm: solo.SiteState): solo.World {
  return solo.WORLDS[farm.depth] ?? "outside";
}
