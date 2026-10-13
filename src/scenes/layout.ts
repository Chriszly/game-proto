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

export const REFINER = { x: 450, y: 170 };
export const CAULDRON = { x: 450, y: 400 };

export const SHOP = { x: 610, y: 68, w: 326, h: 440 };
export const COUNTER = { x: 773, y: 250 };
/** Where waiting customer i stands, on the far side of the counter. */
export const customerPosition = (i: number) => ({ x: 713 + i * 60, y: 190 });
