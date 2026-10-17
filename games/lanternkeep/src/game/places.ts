// Where the lanterns hang and where the moths live, in view pixels, for each district the keep can
// stand in. The scenery in src/art/puppet.ts is drawn around these spots.

/** The moth jar in front of the gate, where idle moths wait and return to. */
export const JAR = { x: 480, y: 500 };
/** The jars moths can rest at: the one at the gate, and the second jar by the east wall, once bought (LK14). */
export const JARS = [JAR, { x: 800, y: 500 }] as const;

/** A lantern spot: where it hangs, and a short name for the herald's orders. */
export interface Spot {
  x: number;
  y: number;
  name: string;
}

/**
 * A lantern chain: lanterns side by side, joined by a cord. A chain whose lanterns are all lit at
 * nightfall pays a bonus. A chain only counts on a night that has every one of its lanterns, so
 * the first night (lanterns 0 to 4) has none. Listed in the order the cord runs.
 */
export interface Chain {
  name: string;
  lanterns: readonly number[];
}

/**
 * A district the keep can move to at every fifth nightfall (LK10): its ten lantern spots, in the
 * order nights add them (the first night of a game uses the first five of the keep), its chains
 * and its rule. `rule` is applied in state.ts: `seawind` makes each gust blow out a second lantern,
 * `vespers` pays more a lantern but asks for three lanterns in four, `trade` doubles close calls
 * and window calls but burns oil faster, and `none` changes nothing.
 */
export interface District {
  name: string;
  /** The rule, in a line for the panel. */
  blurb: string;
  rule: 'none' | 'seawind' | 'vespers' | 'trade';
  spots: readonly Spot[];
  chains: readonly Chain[];
}

export const DISTRICTS = {
  keep: {
    name: 'The Keep',
    blurb: 'The old walls: no rule but the dark',
    rule: 'none',
    spots: [
      { x: 170, y: 184, name: 'left tower' },
      { x: 790, y: 184, name: 'right tower' },
      { x: 480, y: 112, name: 'the keep' },
      { x: 330, y: 304, name: 'left wall' },
      { x: 630, y: 304, name: 'right wall' },
      { x: 64, y: 304, name: 'far left' },
      { x: 896, y: 304, name: 'far right' },
      { x: 424, y: 230, name: 'left sconce' },
      { x: 536, y: 230, name: 'right sconce' },
      { x: 480, y: 392, name: 'the gate' },
    ],
    chains: [
      { name: 'West wall', lanterns: [5, 0, 3] },
      { name: 'East wall', lanterns: [4, 1, 6] },
      { name: 'Keep', lanterns: [7, 2, 8] },
      { name: 'Gate', lanterns: [3, 9, 4] },
    ],
  },
  docks: {
    name: 'The Docks',
    blurb: 'Sea wind: each gust blows out two lanterns',
    rule: 'seawind',
    spots: [
      { x: 150, y: 184, name: 'the crane' },
      { x: 810, y: 150, name: 'the lighthouse' },
      { x: 480, y: 112, name: 'the mast' },
      { x: 300, y: 304, name: 'the warehouse' },
      { x: 660, y: 304, name: 'the fish hall' },
      { x: 60, y: 304, name: 'west mooring' },
      { x: 900, y: 304, name: 'east mooring' },
      { x: 400, y: 392, name: 'left quay post' },
      { x: 560, y: 392, name: 'right quay post' },
      { x: 480, y: 230, name: 'customs house' },
    ],
    chains: [
      { name: 'Warehouse', lanterns: [5, 3, 7] },
      { name: 'Fish hall', lanterns: [8, 4, 6] },
      { name: 'Rigging', lanterns: [0, 2, 1] },
      { name: 'Quay', lanterns: [7, 9, 8] },
    ],
  },
  chapel: {
    name: 'Chapel Hill',
    blurb: 'Vespers: +2 a lantern, but three in four must burn',
    rule: 'vespers',
    spots: [
      { x: 120, y: 184, name: 'bell tower' },
      { x: 840, y: 184, name: 'the yew' },
      { x: 480, y: 112, name: 'the steeple' },
      { x: 280, y: 304, name: 'left wall' },
      { x: 680, y: 304, name: 'right wall' },
      { x: 60, y: 304, name: 'far left' },
      { x: 900, y: 304, name: 'far right' },
      { x: 410, y: 230, name: 'left window' },
      { x: 550, y: 230, name: 'right window' },
      { x: 480, y: 392, name: 'the porch' },
    ],
    chains: [
      { name: 'Lychgate', lanterns: [5, 3, 7] },
      { name: 'Yew walk', lanterns: [8, 4, 6] },
      { name: 'Nave', lanterns: [7, 2, 8] },
      { name: 'Porch', lanterns: [3, 9, 4] },
    ],
  },
  market: {
    name: 'The Market',
    blurb: 'Market day: close calls and window calls pay double, oil burns 15% faster',
    rule: 'trade',
    spots: [
      { x: 200, y: 184, name: 'left gable' },
      { x: 760, y: 184, name: 'right gable' },
      { x: 480, y: 112, name: 'clock tower' },
      { x: 320, y: 304, name: 'bread stall' },
      { x: 640, y: 304, name: 'cloth stall' },
      { x: 100, y: 304, name: 'far left stall' },
      { x: 860, y: 304, name: 'far right stall' },
      { x: 430, y: 230, name: 'left sconce' },
      { x: 530, y: 230, name: 'right sconce' },
      { x: 480, y: 392, name: 'hall arch' },
    ],
    chains: [
      { name: 'West stalls', lanterns: [5, 0, 3] },
      { name: 'East stalls', lanterns: [4, 1, 6] },
      { name: 'Hall', lanterns: [7, 2, 8] },
      { name: 'Arch', lanterns: [3, 9, 4] },
    ],
  },
} as const satisfies Record<string, District>;
export type DistrictId = keyof typeof DISTRICTS;
export const DISTRICT_IDS = Object.keys(DISTRICTS) as DistrictId[];

/** The keep's lantern spots, where every game starts: the first night uses the first five. */
export const LANTERN_SPOTS: readonly Spot[] = DISTRICTS.keep.spots;
/** The keep's chains. */
export const CHAINS: readonly Chain[] = DISTRICTS.keep.chains;

/** Where idle moth `i` of the `n` resting at `jar` sits on its rim. */
export function mothRest(i: number, n: number, jar: { x: number; y: number } = JAR) {
  return { x: jar.x + (i - (n - 1) / 2) * 30, y: jar.y - 30 };
}
