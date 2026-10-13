import { PLOTS_PER_GARDEN, type BeltId } from '../game/state';

// World positions for the U-shaped apothecary. Goods flow down the left arm (gardens, refining
// table), along the bottom (cauldron) and up the middle into the shop at the top. The right arm is
// plain grass until the expansion is bought; its second production line mirrors the first, so
// goods flow down the right arm and join the first line at the bottom of the U. The world is bigger
// than the 960x540 view, so the camera follows the doctor.

export const HUD_HEIGHT = 44;
export const WORLD = { w: 1200, h: 810 };

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
  { x: 24, y: 448, w: 736, h: 344 },
  { x: 316, y: 400, w: 444, h: 60 },
];
/** The right arm's yard, laid once the expansion's land is bought. */
export const EXPANSION_YARDS = [
  { x: 760, y: 448, w: 416, h: 344 },
  { x: 760, y: 400, w: 124, h: 60 },
];
/** Where the doctor stands to buy the expansion's land: on the grass just right of the shop door. */
export const EXPANSION_LAND = { x: 820, y: 430 };

/** The refining table stands below the gardens; goods run through it from top to bottom. */
export const REFINER = { x: 330, y: 540 };
/** The cauldron stands at the bottom of the U; goods run through it from left to right. */
export const CAULDRON = { x: 460, y: 720 };

/**
 * Markers around a station: drop-off where goods come in and pick-up where they leave, in the
 * direction goods flow along the U. The work spot, where the doctor stands to craft, and the upgrade
 * marker face the open courtyard inside the U.
 */
export interface StationMarkers {
  drop: { x: number; y: number };
  pickUp: { x: number; y: number };
  work: { x: number; y: number };
  upgrade: { x: number; y: number };
}

export const REFINER_MARKERS: StationMarkers = {
  drop: { x: REFINER.x, y: REFINER.y - 72 },
  pickUp: { x: REFINER.x, y: REFINER.y + 72 },
  work: { x: REFINER.x + 100, y: REFINER.y },
  upgrade: { x: REFINER.x + 100, y: REFINER.y - 70 },
};
export const CAULDRON_MARKERS: StationMarkers = {
  drop: { x: CAULDRON.x - 80, y: CAULDRON.y + 8 },
  pickUp: { x: CAULDRON.x + 80, y: CAULDRON.y + 8 },
  work: { x: CAULDRON.x - 10, y: CAULDRON.y - 70 },
  upgrade: { x: CAULDRON.x + 70, y: CAULDRON.y - 70 },
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
  // Behind the counter, to the side of the doorway where goods will come in.
  work: { x: COUNTER.x - 80, y: COUNTER.y + 70 },
  upgrade: { x: COUNTER.x + 110, y: COUNTER.y + 76 },
};
/** Where waiting customer i stands, on the far side of the counter. */
export const customerPosition = (i: number) => ({ x: COUNTER.x - 60 + i * 60, y: COUNTER.y - 60 });

/** Labels for the stations, placed clear of their markers. */
export const LABELS = {
  refiner: { x: 170, y: 540 },
  cauldron: { x: 330, y: 770 },
  refiner2: mirror({ x: 170, y: 540 }),
  cauldron2: mirror({ x: 330, y: 770 }),
};

/**
 * Conveyor belt routes. The first run of each is the main line goods ride along; further runs are
 * feeders that join it at a T. Each belt replaces the markers at its two ends once it is built.
 */
export const BELT_PATHS: Record<BeltId, { x: number; y: number }[][]> = {
  // From both gardens down the left arm into the top of the refining table.
  garden: [
    [{ x: 300, y: 152 }, { x: 330, y: 152 }, { x: 330, y: 514 }],
    [{ x: 300, y: 344 }, { x: 330, y: 344 }],
  ],
  // Out of the bottom of the table and along to the cauldron.
  refiner: [[{ x: 330, y: 566 }, { x: 330, y: 720 }, { x: 424, y: 720 }]],
  // Out of the cauldron, up through the shop door into the counter.
  cauldron: [[{ x: 496, y: 720 }, { x: 600, y: 720 }, { x: 600, y: 292 }]],
  // The second line mirrors the first; its cauldron belt meets the first's at a T at the bottom of
  // the U and shares the run up to the counter.
  garden2: [
    [{ x: 900, y: 152 }, { x: 870, y: 152 }, { x: 870, y: 514 }],
    [{ x: 900, y: 344 }, { x: 870, y: 344 }],
  ],
  refiner2: [[{ x: 870, y: 566 }, { x: 870, y: 720 }, { x: 776, y: 720 }]],
  cauldron2: [[{ x: 704, y: 720 }, { x: 600, y: 720 }, { x: 600, y: 292 }]],
};
/** Where the doctor stands to pay for each belt; the cauldron belts' markers face the courtyard. */
export const BELT_BUILD: Record<BeltId, { x: number; y: number }> = {
  garden: { x: 230, y: 468 },
  refiner: { x: 230, y: 612 },
  cauldron: { x: 520, y: 576 },
  garden2: mirror({ x: 230, y: 468 }),
  refiner2: mirror({ x: 230, y: 612 }),
  cauldron2: mirror({ x: 520, y: 576 }),
};
