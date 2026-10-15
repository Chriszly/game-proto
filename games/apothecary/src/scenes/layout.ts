import type { ItemId, PlantId } from '../game/items';
import { BELT_MS, BELTS, PLOTS_PER_GARDEN, type BeltId } from '../game/state';

// World positions for the two-column apothecary. Each production line runs straight down its own
// column: two gardens side by side at the top, the refining table below them, then the cauldron,
// and its belt turns in along the bottom to the shop between the columns. The market, with the
// outfitter's and the guild's upgrades, fills the middle above the shop; the doctor goes into the
// shop by its back door from the market, and customers come in from the street below. At every
// station goods come in on one pair of pallets and leave from another, and the belts run straight
// from pallets to pallets. The doctor's drop, work and pick-up markers stand on each station's inner
// side, towards the market, and its upgrade and hire markers on the outer side. The right column is
// plain grass until the expansion is bought; its second line mirrors the first. The world is bigger
// than the 960x540 view, so the camera follows the doctor.

export const HUD_HEIGHT = 44;
export const WORLD = { w: 1400, h: 1110 };

/** The second line mirrors the first across the middle of the map. */
const mirror = (p: { x: number; y: number }) => ({ x: WORLD.w - p.x, y: p.y });
/** The middle of the first line's column, where its goods run down. */
const LINE_X = 252;
/** The columns of markers either side of a line: drop, work and pick up inside, buying outside. */
const INNER_X = LINE_X + 100;
const OUTER_X = LINE_X - 122;
/** Belt build markers stand at the outer edge of the column. */
const EDGE_X = 44;

/**
 * Fenced garden areas, matching the order of GARDENS in the game state: the first line's wheat
 * field and mandrake patch side by side, then the second line's, mirrored, then the two shade
 * gardens at the top of the market, the first line's on the left and the second's beside it.
 */
const LINE1_GARDENS = [
  { x: 24, y: 64, w: 220, h: 176, name: 'Wheat field' },
  { x: 260, y: 64, w: 220, h: 176, name: 'Mandrake patch' },
];
const SHADE_GARDEN = { x: 505, y: 64, w: 190, h: 176, name: 'Shade garden' };
const mirrorArea = <T extends { x: number; w: number }>(g: T) => ({ ...g, x: WORLD.w - g.x - g.w });
export const GARDEN_AREAS = [...LINE1_GARDENS, ...LINE1_GARDENS.map(mirrorArea), SHADE_GARDEN, mirrorArea(SHADE_GARDEN)];
/** A plot's bed is 56 by 44, and beds stand edge to edge. */
const PLOT = { w: 56, h: 44 };
/**
 * Plot i is slot i % 9 of garden i / 9: three rows of three beds, edge to edge, in the middle of the
 * garden below its name, filling it left to right and top to bottom.
 */
export const plotPosition = (i: number) => {
  const area = GARDEN_AREAS[Math.floor(i / PLOTS_PER_GARDEN)];
  const slot = i % PLOTS_PER_GARDEN;
  return { x: area.x + area.w / 2 + ((slot % 3) - 1) * PLOT.w, y: area.y + 104 + (Math.floor(slot / 3) - 1) * PLOT.h };
};

/**
 * Packed earth: the first line's column below its gardens, and the market in the middle down to the
 * shop. The second line's column stays grass until the expansion's land is bought.
 */
const LINE1_YARD = { x: 24, y: 256, w: 476, h: 600 };
export const YARDS = [LINE1_YARD, { x: 500, y: 256, w: 400, h: 524 }];
/** The right column's yard, laid once the expansion's land is bought. */
export const EXPANSION_YARDS = [{ ...LINE1_YARD, x: WORLD.w - LINE1_YARD.x - LINE1_YARD.w }];
/** The outfitter's stall on the left of the market: its sign and its upgrade markers below it. */
export const OUTFITTER = {
  sign: { x: 580, y: 290 },
  pack: { x: 580, y: 360 },
  boots: { x: 580, y: 440 },
  sickle: { x: 580, y: 520 },
};
/**
 * The guild on the right of the market: garden growth and belt speed in one column, prices,
 * customers and the extra order slot in the other, each unlocking the next, and the marker to join
 * the guild below growth and belts.
 */
export const GUILD = {
  sign: { x: 760, y: 290 },
  growth: { x: 700, y: 360 },
  belts: { x: 700, y: 440 },
  join: { x: 700, y: 520 },
  prices: { x: 820, y: 360 },
  customers: { x: 820, y: 440 },
  slots: { x: 820, y: 520 },
};
/** Where the doctor stands to buy the expansion's land: at the bottom of the market. */
export const EXPANSION_LAND = { x: 700, y: 640 };

/** The refining table stands below the gardens; goods run through it from top to bottom. */
export const REFINER = { x: LINE_X, y: 400 };
/** The cauldron stands below the table; goods run through it from top to bottom too. */
export const CAULDRON = { x: LINE_X, y: 640 };

/**
 * Markers around a station: drop-off beside the pallets goods come in on, the work spot beside the
 * station and pick-up beside the pallets they leave from, all on the inner side; the upgrade marker on
 * the outer side, above the hire marker.
 */
export interface StationMarkers {
  drop: { x: number; y: number };
  pickUp: { x: number; y: number };
  work: { x: number; y: number };
  upgrade: { x: number; y: number };
}

const columnMarkers = (at: { x: number; y: number }): StationMarkers => ({
  drop: { x: INNER_X, y: at.y - 60 },
  work: { x: INNER_X, y: at.y + 20 },
  pickUp: { x: INNER_X, y: at.y + 100 },
  upgrade: { x: OUTER_X, y: at.y },
});
export const REFINER_MARKERS = columnMarkers(REFINER);
export const CAULDRON_MARKERS = columnMarkers(CAULDRON);

/** The second line's stations and markers, mirrored onto the right column. */
export const REFINER2 = mirror(REFINER);
export const CAULDRON2 = mirror(CAULDRON);
const mirrorMarkers = (m: StationMarkers): StationMarkers => ({
  drop: mirror(m.drop),
  pickUp: mirror(m.pickUp),
  work: mirror(m.work),
  upgrade: mirror(m.upgrade),
});
export const REFINER2_MARKERS = mirrorMarkers(REFINER_MARKERS);
export const CAULDRON2_MARKERS = mirrorMarkers(CAULDRON_MARKERS);

/**
 * The shop sits between the columns below the market. Its storefront faces the street at the bottom,
 * where customers come in; the doctor goes in by the back door at the top, from the market. Both
 * cauldron belts come in through its side walls and meet above the counter.
 */
export const SHOP = { x: 500, y: 780, w: 400, h: 280 };
/** The back door in the top wall, the doctor's way in from the market. */
export const SHOP_DOOR = { from: 660, to: 740 };
export const COUNTER = { x: 700, y: 940 };
/** The doctor's markers left of the counter, its upgrade marker right of it. */
export const COUNTER_MARKERS: StationMarkers = {
  drop: { x: COUNTER.x - 140, y: COUNTER.y - 80 },
  work: { x: COUNTER.x - 140, y: COUNTER.y },
  pickUp: { x: COUNTER.x - 140, y: COUNTER.y + 75 },
  upgrade: { x: COUNTER.x + 140, y: COUNTER.y - 80 },
};
/** Where waiting customer i stands, on the street side of the counter; a market day's crowd fills the row to the right wall. */
export const customerPosition = (i: number) => ({ x: COUNTER.x - 56 + i * 45, y: COUNTER.y + 70 });
/**
 * The street door in the shop's bottom wall, below the customers, and the spot outside it where
 * customers come from and go back to.
 */
export const SHOP_STREET_DOOR = { from: 680, to: 720 };
export const STREET = { x: 700, y: WORLD.h - 16 };
/** The shop's sign, on its top wall left of the back door. */
export const SHOP_SIGN = { x: SHOP.x + 80, y: SHOP.y };

/** How thick the shop's stone walls are; each runs along an edge of the shop, half inside and half out. */
const WALL = 16;
/** Where the cauldron belts run in along the bottom of the map and through the shop's side walls. */
const BELT_IN_Y = 820;
/** The gap a belt leaves in a side wall it runs through. */
const BELT_GAP = { from: BELT_IN_Y - 16, to: BELT_IN_Y + 16 };
const TOP = SHOP.y - WALL / 2;
const BOTTOM = SHOP.y + SHOP.h - WALL / 2;
const LEFT = SHOP.x - WALL / 2;
const RIGHT = SHOP.x + SHOP.w - WALL / 2;
/** The shop's stone walls as drawn, with gaps for its two doors and the belts. */
export const SHOP_WALLS = [
  // The top wall, either side of the back door.
  { x: LEFT, y: TOP, w: SHOP_DOOR.from - LEFT, h: WALL },
  { x: SHOP_DOOR.to, y: TOP, w: RIGHT + WALL - SHOP_DOOR.to, h: WALL },
  // The bottom wall, either side of the street door.
  { x: LEFT, y: BOTTOM, w: SHOP_STREET_DOOR.from - LEFT, h: WALL },
  { x: SHOP_STREET_DOOR.to, y: BOTTOM, w: RIGHT + WALL - SHOP_STREET_DOOR.to, h: WALL },
  // The side walls, above and below where the belts come through.
  ...[LEFT, RIGHT].flatMap((x) => [
    { x, y: SHOP.y, w: WALL, h: BELT_GAP.from - SHOP.y },
    { x, y: BELT_GAP.to, w: WALL, h: SHOP.y + SHOP.h - BELT_GAP.to },
  ]),
];
/**
 * Where the doctor can't walk: the top wall either side of the back door, the side walls whole, and
 * the bottom wall with the street below it, which only customers use.
 */
export const SHOP_BLOCKS = [
  { x: LEFT, y: BOTTOM, w: SHOP.w + WALL, h: WORLD.h - BOTTOM },
  ...SHOP_WALLS.slice(0, 2),
  { x: LEFT, y: SHOP.y, w: WALL, h: SHOP.h },
  { x: RIGHT, y: SHOP.y, w: WALL, h: SHOP.h },
];
/** The street customers walk up to the street door on. */
export const STREET_PATH = { x: SHOP_STREET_DOOR.from, y: BOTTOM, w: SHOP_STREET_DOOR.to - SHOP_STREET_DOOR.from, h: WORLD.h - BOTTOM };
/** Where the doctor lines up to walk through the back door: just inside it and just outside it. */
export const SHOP_DOORWAY = { inside: SHOP.y + WALL / 2 + 8, outside: SHOP.y - WALL / 2 - 8 };

/** Labels for the stations, on the outer side above their upgrade markers. */
export const LABELS = {
  refiner: { x: OUTER_X, y: REFINER.y - 66 },
  cauldron: { x: OUTER_X, y: CAULDRON.y - 66 },
  refiner2: mirror({ x: OUTER_X, y: REFINER.y - 66 }),
  cauldron2: mirror({ x: OUTER_X, y: CAULDRON.y - 66 }),
};
/** The sign under each crafting station's label that shows, and on a tap changes, what it makes first. */
export const PRIORITY_SIGNS = {
  refiner: { x: OUTER_X, y: REFINER.y - 38 },
  cauldron: { x: OUTER_X, y: CAULDRON.y - 38 },
  refiner2: mirror({ x: OUTER_X, y: REFINER.y - 38 }),
  cauldron2: mirror({ x: OUTER_X, y: CAULDRON.y - 38 }),
};

/**
 * Where each station's pallets stand, given by the middle of their bottom edge: one for each kind
 * of goods coming in and one for each kind going out, in the order of PLANTS, REFINED and POTIONS.
 * Each set stands side by side across the end of the belt that brings or takes its goods, every
 * pallet at the end of its kind's lane: each station's goods come in on pallets above it and leave
 * from pallets below it, and the counter's potions stand behind it, where the belts come in.
 */
export interface StationPallets {
  in: { x: number; y: number }[];
  out: { x: number; y: number }[];
}
/** Three pallets across a belt heading down, whose first lane is on the east side. */
const acrossBelt = (x: number, y: number) => [{ x: x + 36, y }, { x, y }, { x: x - 36, y }];
const REFINER_PALLETS: StationPallets = { in: acrossBelt(LINE_X, REFINER.y - 36), out: acrossBelt(LINE_X, REFINER.y + 84) };
const CAULDRON_PALLETS: StationPallets = { in: acrossBelt(LINE_X, CAULDRON.y - 44), out: acrossBelt(LINE_X, CAULDRON.y + 84) };
/**
 * The second line's pallets, mirrored. Its belts' lanes are not mirrored (a belt heading south keeps
 * its first lane on its east side on both lines), so each pair also swaps over to keep every kind at
 * the end of its own lane.
 */
const mirrorPallets = (p: StationPallets): StationPallets => ({
  in: p.in.map(mirror).reverse(),
  out: p.out.map(mirror).reverse(),
});
export const PALLETS = {
  refiner: REFINER_PALLETS,
  cauldron: CAULDRON_PALLETS,
  refiner2: mirrorPallets(REFINER_PALLETS),
  cauldron2: mirrorPallets(CAULDRON_PALLETS),
  counter: { in: acrossBelt(COUNTER.x, COUNTER.y - 30), out: [] } as StationPallets,
};

/** Where a belt ending on pallets from above stops, at their back edge, and where one leaving them below starts. */
const endAbove = (pallets: { y: number }[]) => pallets[0].y - 32;
const startBelow = (pallets: { y: number }[]) => pallets[0].y + 16;
const mirrorRun = (run: { x: number; y: number }[]) => run.map(mirror);

/**
 * Conveyor belt routes, each from a station's out pallets to the next station's in pallets. The
 * first run of each is the main line goods ride along; further runs are feeders that join it at a
 * T. Each belt replaces the markers at its two ends once it is built.
 */
const LINE1_BELTS = {
  // From the wheat field, the mandrake patch and the shade garden along below them, then straight
  // down to the table.
  garden: [
    [{ x: 134, y: 240 }, { x: 134, y: 264 }, { x: LINE_X, y: 264 }, { x: LINE_X, y: endAbove(REFINER_PALLETS.in) }],
    [{ x: 370, y: 240 }, { x: 370, y: 264 }, { x: LINE_X, y: 264 }],
    [{ x: 530, y: 240 }, { x: 530, y: 264 }, { x: LINE_X, y: 264 }],
  ],
  // Straight down from below the table to above the cauldron.
  refiner: [[{ x: LINE_X, y: startBelow(REFINER_PALLETS.out) }, { x: LINE_X, y: endAbove(CAULDRON_PALLETS.in) }]],
  // Down from below the cauldron, along to the shop and in through its side wall, meeting the
  // second line's above the counter and down onto its pallets.
  cauldron: [
    [
      { x: LINE_X, y: startBelow(CAULDRON_PALLETS.out) },
      { x: LINE_X, y: BELT_IN_Y },
      { x: COUNTER.x, y: BELT_IN_Y },
      { x: COUNTER.x, y: endAbove(PALLETS.counter.in) },
    ],
  ],
};
export const BELT_PATHS: Record<BeltId, { x: number; y: number }[][]> = {
  ...LINE1_BELTS,
  // The second line mirrors the first; its cauldron belt meets the first's above the counter and
  // shares the run down onto its pallets.
  garden2: LINE1_BELTS.garden.map(mirrorRun),
  refiner2: LINE1_BELTS.refiner.map(mirrorRun),
  cauldron2: LINE1_BELTS.cauldron.map(mirrorRun),
};
/** Where the two cauldron belts meet, at the top of the run down onto the counter's pallets. */
const CAULDRON_BELTS_MEET = { x: COUNTER.x, y: BELT_IN_Y };

/** The length of a belt run in pixels. */
export const runLength = (run: { x: number; y: number }[]) =>
  run.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - run[i].x, p.y - run[i].y), 0);

/** How far along `run` the point `p` on it is, in pixels. */
function distanceTo(run: { x: number; y: number }[], p: { x: number; y: number }) {
  let d = 0;
  for (let i = 1; i < run.length; i++) {
    const a = run[i - 1], b = run[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const along = Math.hypot(p.x - a.x, p.y - a.y);
    if (Math.abs(along + Math.hypot(b.x - p.x, b.y - p.y) - len) < 0.01) return d + along;
    d += len;
  }
  throw new Error(`${p.x},${p.y} is not on the belt`);
}

/** The plants of each garden belt's line's gardens, in the order of the belt's runs. */
const GARDEN_RUNS: Partial<Record<BeltId, readonly PlantId[]>> = {
  garden: ['wheat', 'mandrake', 'nightshade'],
  garden2: ['wheat', 'mandrake', 'nightshade'],
};
/**
 * Which of a belt's runs goods of a kind get on at: on the garden belts, the run from the field of
 * its line that grows them, so mandrakes come in on the feeder from their patch. Everything else gets
 * on at the start of the main run.
 */
function beltRun(id: BeltId, kind: ItemId) {
  const run = GARDEN_RUNS[id]?.indexOf(kind as PlantId) ?? 0;
  return run > 0 && run < BELT_PATHS[id].length ? run : 0;
}

/**
 * Where goods on each of a belt's runs get on and where that run joins the main one, in ms along the
 * main run. Goods on a feeder start as far before its join as the feeder is long, so they ride it at
 * the belt's speed before carrying on along the main run.
 */
const RUN_MS = Object.fromEntries(
  BELTS.map((id) => {
    const [main, ...feeders] = BELT_PATHS[id];
    const msPerPx = BELT_MS[id] / runLength(main);
    const runs = feeders.map((feeder) => {
      const join = distanceTo(main, feeder[feeder.length - 1]);
      return { start: (join - runLength(feeder)) * msPerPx, join: join * msPerPx };
    });
    return [id, [{ start: 0, join: 0 }, ...runs]];
  }),
) as Record<BeltId, { start: number; join: number }[]>;

/** The run goods of a kind ride on a belt, and where on its main run they get on and join it, in ms. */
export const beltSpan = (id: BeltId, kind: ItemId) => {
  const run = beltRun(id, kind);
  return { run, ...RUN_MS[id][run] };
};

/**
 * How far along the cauldron belts are where they meet. Both are the same length, so from there on
 * their items are side by side.
 */
export const BELT_JOIN_MS =
  (BELT_MS.cauldron * distanceTo(BELT_PATHS.cauldron[0], CAULDRON_BELTS_MEET)) / runLength(BELT_PATHS.cauldron[0]);
/**
 * Where the doctor stands to pay for each belt: at the outer edge of its column, beside where the
 * belt starts. The garden belt's marker stands out of a long sickle's reach of the plots, so the
 * hands the belt empties onto itself don't fill up again from the gardens.
 */
const LINE1_BELT_BUILD = {
  garden: { x: EDGE_X, y: 330 },
  refiner: { x: EDGE_X, y: 520 },
  cauldron: { x: EDGE_X, y: 760 },
};
export const BELT_BUILD: Record<BeltId, { x: number; y: number }> = {
  ...LINE1_BELT_BUILD,
  garden2: mirror(LINE1_BELT_BUILD.garden),
  refiner2: mirror(LINE1_BELT_BUILD.refiner),
  cauldron2: mirror(LINE1_BELT_BUILD.cauldron),
};

/**
 * Craftsmen: the marker where each station's are hired, on the outer side below its upgrade marker,
 * and where the two of them stand once hired (their feet), either side of the station.
 */
const columnCraftsmen = (at: { x: number; y: number }, apart: number) => ({
  hire: { x: OUTER_X, y: at.y + 80 },
  stand: [{ x: at.x - apart, y: at.y + 30 }, { x: at.x + apart, y: at.y + 30 }],
});
const mirrorCraftsmen = (c: ReturnType<typeof columnCraftsmen>) => ({ hire: mirror(c.hire), stand: c.stand.map(mirror) });
const REFINER_CRAFTSMEN = columnCraftsmen(REFINER, 62);
const CAULDRON_CRAFTSMEN = columnCraftsmen(CAULDRON, 56);
export const CRAFTSMEN = {
  refiner: REFINER_CRAFTSMEN,
  cauldron: CAULDRON_CRAFTSMEN,
  refiner2: mirrorCraftsmen(REFINER_CRAFTSMEN),
  cauldron2: mirrorCraftsmen(CAULDRON_CRAFTSMEN),
  // Behind the counter either side of its pallets, hired at a marker below its upgrade marker.
  counter: { hire: { x: COUNTER.x + 140, y: COUNTER.y }, stand: [{ x: COUNTER.x - 60, y: COUNTER.y - 24 }, { x: COUNTER.x + 60, y: COUNTER.y - 24 }] },
};
