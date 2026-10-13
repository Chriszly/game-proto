// World positions for the 960x540 view: garden on the left, workshop in the middle, shop on the right.

export const HUD_HEIGHT = 44;

export const GARDEN = { x: 24, y: 68, w: 300, h: 440 };
/** Plot i sits in column i / 3 and row i % 3, so each plant gets its own column. */
export const plotPosition = (i: number) => ({ x: 104 + Math.floor(i / 3) * 140, y: 150 + (i % 3) * 130 });

export const REFINER = { x: 450, y: 170 };
export const CAULDRON = { x: 450, y: 400 };

export const SHOP = { x: 610, y: 68, w: 326, h: 440 };
export const COUNTER = { x: 773, y: 250 };
/** Where waiting customer i stands, on the far side of the counter. */
export const customerPosition = (i: number) => ({ x: 713 + i * 60, y: 190 });
