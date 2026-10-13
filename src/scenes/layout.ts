import { PLOTS_PER_GARDEN } from '../game/state';

// World positions for the 960x540 view: garden on the left, workshop in the middle, shop on the right.

export const HUD_HEIGHT = 44;

/** Fenced garden areas, top to bottom, matching the order of GARDENS in the game state. */
export const GARDEN_AREAS = [
  { x: 24, y: 68, w: 300, h: 210, name: 'Wheat field' },
  { x: 24, y: 298, w: 300, h: 210, name: 'Mandrake patch' },
];
/** Plot i is slot i % 3 of garden i / 3, the slots spread across the garden in one row. */
export const plotPosition = (i: number) => {
  const area = GARDEN_AREAS[Math.floor(i / PLOTS_PER_GARDEN)];
  return { x: area.x + 60 + (i % PLOTS_PER_GARDEN) * 90, y: area.y + 118 };
};

/** The workshop yard between the gardens and the shop, where the refining table and cauldron stand. */
export const YARD = { x: 340, y: 68, w: 254, h: 440 };

export const REFINER = { x: 450, y: 170 };
export const CAULDRON = { x: 450, y: 400 };

/**
 * Markers around a station: drop-off on its left and pick-up on its right, so goods flow from the
 * garden side towards the shop side. The work spot, where the doctor stands to craft, is on the side
 * farthest from the walkway (the open row between the refining table and the cauldron), and the
 * upgrade marker has a corner of its own.
 */
export interface StationMarkers {
  drop: { x: number; y: number };
  pickUp: { x: number; y: number };
  work: { x: number; y: number };
  upgrade: { x: number; y: number };
}

export const REFINER_MARKERS: StationMarkers = {
  drop: { x: REFINER.x - 80, y: REFINER.y + 8 },
  pickUp: { x: REFINER.x + 80, y: REFINER.y + 8 },
  work: { x: REFINER.x, y: REFINER.y - 62 },
  upgrade: { x: REFINER.x + 80, y: REFINER.y - 62 },
};
export const CAULDRON_MARKERS: StationMarkers = {
  drop: { x: CAULDRON.x - 80, y: CAULDRON.y + 8 },
  pickUp: { x: CAULDRON.x + 80, y: CAULDRON.y + 8 },
  work: { x: CAULDRON.x, y: CAULDRON.y + 82 },
  upgrade: { x: CAULDRON.x + 80, y: CAULDRON.y + 82 },
};

export const SHOP = { x: 610, y: 68, w: 326, h: 440 };
export const COUNTER = { x: 773, y: 250 };
export const COUNTER_MARKERS: StationMarkers = {
  drop: { x: COUNTER.x - 128, y: COUNTER.y + 12 },
  pickUp: { x: COUNTER.x + 128, y: COUNTER.y + 12 },
  // Behind the counter, facing the customers.
  work: { x: COUNTER.x, y: COUNTER.y + 52 },
  // The far corner of the shop, away from the door and the path to the counter.
  upgrade: { x: SHOP.x + SHOP.w - 40, y: SHOP.y + SHOP.h - 50 },
};
/** Where waiting customer i stands, on the far side of the counter. */
export const customerPosition = (i: number) => ({ x: 713 + i * 60, y: 190 });
