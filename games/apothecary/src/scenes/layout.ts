import type { ItemId, PlantId } from '../game/items';
import { BELT_MS, BELTS, GARDENS, LINE2_GARDEN, PLOTS_PER_GARDEN, type BeltId } from '../game/state';

// World positions for the U-shaped apothecary. Goods flow down the left arm (gardens, refining
// table), along the bottom (cauldron) and up the middle into the shop at the top. At every station
// they come in on one pair of pallets and leave from another, and the belts run from pallets to
// pallets. The right arm is
// plain grass until the expansion is bought; its second production line mirrors the first, so
// goods flow down the right arm and join the first line at the bottom of the U. The world is bigger
// than the 960x540 view, so the camera follows the doctor.

export const HUD_HEIGHT = 44;
export const WORLD = { w: 1200, h: 880 };

/** The second line mirrors the first across the middle of the map. */
const mirror = (p: { x: number; y: number }) => ({ x: WORLD.w - p.x, y: p.y });

/**
 * Fenced garden areas, matching the order of GARDENS in the game state: the first line's top to
 * bottom, then the second line's fields on the right.
 */
export const GARDEN_AREAS = [
  { x: 24, y: 64, w: 276, h: 176, name: 'Wheat field' },
  { x: 24, y: 256, w: 276, h: 176, name: 'Mandrake patch' },
  { x: 900, y: 64, w: 276, h: 176, name: 'Wheat field' },
  { x: 900, y: 256, w: 276, h: 176, name: 'Mandrake patch' },
];
/** Plot i is slot i % 3 of garden i / 3, the slots spread across the garden in one row. */
export const plotPosition = (i: number) => {
  const area = GARDEN_AREAS[Math.floor(i / PLOTS_PER_GARDEN)];
  return { x: area.x + 48 + (i % PLOTS_PER_GARDEN) * 90, y: area.y + 100 };
};

/**
 * Packed earth below the gardens and up to the shop door. Everything right of the shop stays grass
 * until an expansion for the second line is bought.
 */
export const YARDS = [
  { x: 24, y: 448, w: 736, h: 414 },
  { x: 316, y: 400, w: 444, h: 60 },
];
/** The right arm's yard, laid once the expansion's land is bought. */
export const EXPANSION_YARDS = [
  { x: 760, y: 448, w: 416, h: 414 },
  { x: 760, y: 400, w: 124, h: 60 },
];
/**
 * The outfitter's sign on the grass right of the shop; its upgrade markers run down below it, their
 * captions clear of the second line's garden belt.
 */
export const OUTFITTER = { x: 810, y: 80 };
/**
 * The guild's sign and its upgrade markers in the empty bottom-left corner of the yard, away from
 * the doctor's rounds: the shop's extra order slot, customers and prices on the left and in the
 * middle, garden growth and belt speed on the right, and the sign at the bottom in the middle.
 */
export const GUILD = {
  sign: { x: 155, y: 800 },
  slots: { x: 60, y: 700 },
  customers: { x: 155, y: 700 },
  growth: { x: 250, y: 700 },
  prices: { x: 60, y: 800 },
  belts: { x: 250, y: 800 },
};
/** Where the doctor stands to buy the expansion's land: on the grass just right of the shop door. */
export const EXPANSION_LAND = { x: 820, y: 430 };

/** The refining table stands below the gardens; goods run through it from top to bottom. */
export const REFINER = { x: 330, y: 540 };
/** The cauldron stands at the bottom of the U; goods run through it from left to right. */
export const CAULDRON = { x: 460, y: 740 };

/**
 * Markers around a station: drop-off beside the pallets goods come in on and pick-up beside the
 * pallets they leave from, clear of the belts that run between them. The work spot, where the doctor
 * stands to craft, and the upgrade marker face the open courtyard inside the U.
 */
export interface StationMarkers {
  drop: { x: number; y: number };
  pickUp: { x: number; y: number };
  work: { x: number; y: number };
  upgrade: { x: number; y: number };
}

export const REFINER_MARKERS: StationMarkers = {
  // Left of the pallets above and below the table.
  drop: { x: REFINER.x - 78, y: REFINER.y - 52 },
  pickUp: { x: REFINER.x - 78, y: REFINER.y + 84 },
  work: { x: REFINER.x + 100, y: REFINER.y },
  // High enough that its caption clears the heads of the craftsmen standing by the table.
  upgrade: { x: REFINER.x + 100, y: REFINER.y - 74 },
};
export const CAULDRON_MARKERS: StationMarkers = {
  // Below the pallets left and right of the cauldron, either side of the belt down to the shop.
  drop: { x: CAULDRON.x - 80, y: CAULDRON.y + 64 },
  pickUp: { x: CAULDRON.x + 30, y: CAULDRON.y + 64 },
  work: { x: CAULDRON.x - 20, y: CAULDRON.y - 80 },
  // Left enough that the hire marker's caption above it clears it.
  upgrade: { x: CAULDRON.x + 60, y: CAULDRON.y - 80 },
};

/** The second line's stations and markers, mirrored onto the right arm. */
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

/** The shop sits at the top of the U, between the two arms, with its door facing the courtyard. */
export const SHOP = { x: 440, y: 64, w: 320, h: 336 };
export const SHOP_DOOR = { from: 560, to: 640 };
export const COUNTER = { x: 600, y: 270 };
export const COUNTER_MARKERS: StationMarkers = {
  drop: { x: COUNTER.x - 128, y: COUNTER.y + 12 },
  pickUp: { x: COUNTER.x + 128, y: COUNTER.y + 12 },
  // Behind the counter, left of the pallets where goods come in.
  work: { x: COUNTER.x - 104, y: COUNTER.y + 76 },
  upgrade: { x: COUNTER.x + 110, y: COUNTER.y + 76 },
};
/**
 * Where waiting customer i stands, on the far side of the counter: right of its pallets and left of
 * its hire marker.
 */
export const customerPosition = (i: number) => ({ x: COUNTER.x - 56 + i * 45, y: COUNTER.y - 60 });
/**
 * The street door in the shop's back wall, left of its sign and above the counter's pallets, and the
 * spot outside it where customers come from and go back to. They keep clear of the counter's hire
 * marker on the right.
 */
export const SHOP_BACK_DOOR = { from: 460, to: 500 };
export const STREET = { x: 480, y: 40 };

/** How thick the shop's stone walls are; each runs along an edge of the shop, half inside and half out. */
const WALL = 16;
/** The shop's stone walls, with gaps for its two doors. */
export const SHOP_WALLS = [
  // The back wall, either side of the street door.
  { x: SHOP.x - WALL / 2, y: SHOP.y - WALL / 2, w: SHOP_BACK_DOOR.from - SHOP.x + WALL / 2, h: WALL },
  { x: SHOP_BACK_DOOR.to, y: SHOP.y - WALL / 2, w: SHOP.x + SHOP.w + WALL / 2 - SHOP_BACK_DOOR.to, h: WALL },
  // The front wall, either side of the door.
  { x: SHOP.x - WALL / 2, y: SHOP.y + SHOP.h - WALL / 2, w: SHOP_DOOR.from - SHOP.x + WALL / 2, h: WALL },
  { x: SHOP_DOOR.to, y: SHOP.y + SHOP.h - WALL / 2, w: SHOP.x + SHOP.w + WALL / 2 - SHOP_DOOR.to, h: WALL },
  // The side walls.
  { x: SHOP.x - WALL / 2, y: SHOP.y, w: WALL, h: SHOP.h },
  { x: SHOP.x + SHOP.w - WALL / 2, y: SHOP.y, w: WALL, h: SHOP.h },
];
/**
 * Where the doctor can't walk: the shop's front and side walls, and its back wall with the street
 * behind it, which only customers use.
 */
export const SHOP_BLOCKS = [
  { x: SHOP.x - WALL / 2, y: 0, w: SHOP.w + WALL, h: SHOP.y + WALL / 2 },
  ...SHOP_WALLS.slice(2),
];
/** Where the doctor lines up to walk through the front door: just inside it and just outside it. */
export const SHOP_DOORWAY = { inside: SHOP.y + SHOP.h - WALL / 2 - 8, outside: SHOP.y + SHOP.h + WALL / 2 + 8 };

/** Labels for the stations, placed clear of their markers and pallets. */
export const LABELS = {
  refiner: { x: 110, y: 560 },
  cauldron: { x: 460, y: 860 },
  refiner2: mirror({ x: 110, y: 560 }),
  cauldron2: mirror({ x: 460, y: 860 }),
};

/**
 * Where each station's pallets stand, given by the middle of their bottom edge: one for each kind
 * of goods coming in and one for each kind going out, in the order of PLANTS, REFINED and POTIONS.
 * Each pair stands side by side across the end of the belt that brings or takes its goods, every
 * pallet at the end of its kind's lane: the refining table's plants above it and
 * refined goods below it, the cauldron's refined goods on its left and potions on its right, and the
 * counter's potions in front of it, where the belt comes in through the door.
 */
export interface StationPallets {
  in: { x: number; y: number }[];
  out: { x: number; y: number }[];
}
const REFINER_PALLETS: StationPallets = {
  in: [{ x: 348, y: 504 }, { x: 312, y: 504 }],
  out: [{ x: 348, y: 624 }, { x: 312, y: 624 }],
};
const CAULDRON_PALLETS: StationPallets = {
  in: [{ x: 398, y: 756 }, { x: 362, y: 756 }],
  out: [{ x: 558, y: 756 }, { x: 522, y: 756 }],
};
/**
 * The second line's pallets, mirrored. Its belts' lanes are not mirrored (a belt heading south keeps
 * its first lane on its right on both lines), so each pair also swaps over to keep every kind at the
 * end of its own lane.
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
  counter: { in: [{ x: 582, y: 316 }, { x: 618, y: 316 }], out: [] } as StationPallets,
};

/**
 * Conveyor belt routes, each from a station's out pallets to the next station's in pallets. The
 * first run of each is the main line goods ride along; further runs are feeders that join it at a
 * T. Each belt replaces the markers at its two ends once it is built. A belt that ends behind its
 * pallets stops at their back edge, so their stacks stand on its end; one that starts or ends in
 * front of them starts or stops at their front edge.
 */
export const BELT_PATHS: Record<BeltId, { x: number; y: number }[][]> = {
  // From both gardens down the left arm to the plants' pallets above the refining table.
  garden: [
    [{ x: 300, y: 152 }, { x: 330, y: 152 }, { x: 330, y: 472 }],
    [{ x: 300, y: 344 }, { x: 330, y: 344 }],
  ],
  // From the refined goods' pallets below the table, round to the cauldron's pallets on its left.
  refiner: [[{ x: 330, y: 640 }, { x: 330, y: 688 }, { x: 380, y: 688 }, { x: 380, y: 724 }]],
  // From the potions' pallets right of the cauldron, along the bottom and up through the shop door
  // to the counter's pallets.
  cauldron: [[{ x: 540, y: 772 }, { x: 540, y: 820 }, { x: 600, y: 820 }, { x: 600, y: 332 }]],
  // The second line mirrors the first; its cauldron belt meets the first's at a T at the bottom of
  // the U and shares the run up to the counter.
  garden2: [
    [{ x: 900, y: 152 }, { x: 870, y: 152 }, { x: 870, y: 472 }],
    [{ x: 900, y: 344 }, { x: 870, y: 344 }],
  ],
  refiner2: [[{ x: 870, y: 640 }, { x: 870, y: 688 }, { x: 820, y: 688 }, { x: 820, y: 724 }]],
  cauldron2: [[{ x: 660, y: 772 }, { x: 660, y: 820 }, { x: 600, y: 820 }, { x: 600, y: 332 }]],
};
/** Where the two cauldron belts meet, at the bottom of the run up to the counter. */
const CAULDRON_BELTS_MEET = { x: 600, y: 820 };

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

/** Each garden belt's line's fields' plants, in the order of the belt's runs. */
const GARDEN_RUNS: Partial<Record<BeltId, readonly PlantId[]>> = {
  garden: GARDENS.slice(0, LINE2_GARDEN),
  garden2: GARDENS.slice(LINE2_GARDEN, 2 * LINE2_GARDEN),
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
 * Where the doctor stands to pay for each belt; the cauldron belts' markers face the courtyard. The
 * garden belts' markers stand out of a long sickle's reach of the mandrakes, so the hands the belt
 * empties onto itself don't fill up again from the patch.
 */
export const BELT_BUILD: Record<BeltId, { x: number; y: number }> = {
  garden: { x: 170, y: 500 },
  refiner: { x: 170, y: 612 },
  cauldron: { x: 514, y: 576 },
  garden2: mirror({ x: 170, y: 500 }),
  refiner2: mirror({ x: 170, y: 612 }),
  cauldron2: mirror({ x: 514, y: 576 }),
};

/**
 * Craftsmen: the marker where each station's are hired, beside its upgrade marker or work spot, and
 * where the two of them stand once hired (their feet), by the station.
 */
export const CRAFTSMEN = {
  refiner: { hire: { x: 500, y: 466 }, stand: [{ x: 392, y: 575 }, { x: 468, y: 575 }] },
  cauldron: { hire: { x: 570, y: 600 }, stand: [{ x: 430, y: 712 }, { x: 466, y: 712 }] },
  refiner2: { hire: mirror({ x: 500, y: 466 }), stand: [mirror({ x: 392, y: 575 }), mirror({ x: 468, y: 575 })] },
  cauldron2: { hire: mirror({ x: 570, y: 600 }), stand: [mirror({ x: 430, y: 712 }), mirror({ x: 466, y: 712 })] },
  counter: { hire: { x: 725, y: 180 }, stand: [{ x: 544, y: 334 }, { x: 658, y: 334 }] },
};
