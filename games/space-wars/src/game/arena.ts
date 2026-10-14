/** The whole battlefield, in world pixels. The camera shows a window of it and scrolls. */
export const ARENA = { x: 0, y: 0, w: 1600, h: 1000 };

/** Crystal a node holds when the map is made. */
export const NODE_AMOUNT = 1500;
/** How close a building can be to a crystal node. */
export const NODE_CLEARANCE = 26;
/** How far from its hub a player can place a building. */
export const BUILD_RANGE = 240;
/**
 * Where each faction's hub starts, in world pixels: the player's is first. The points are fixed
 * so every game starts from the same spots, spread across the battlefield; the map jitters each one
 * a little.
 */
export const START_POINTS = [
  { x: 260, y: 780 },
  { x: 1340, y: 220 },
  { x: 1340, y: 780 },
  { x: 260, y: 220 },
  { x: 800, y: 500 },
] as const;
