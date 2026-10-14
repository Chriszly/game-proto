// Where the lanterns hang on the castle and where the moths live, in view pixels. The castle art in
// src/art/sprites.ts is drawn around these spots.

/** The moth jar in front of the gate, where idle moths wait and return to. */
export const JAR = { x: 480, y: 500 };

/**
 * Every lantern spot, in the order nights light them up: the first night uses the first five, and
 * each later night adds the next one.
 */
export const LANTERN_SPOTS: readonly { x: number; y: number }[] = [
  { x: 170, y: 184 }, // left tower
  { x: 790, y: 184 }, // right tower
  { x: 480, y: 112 }, // top of the keep
  { x: 330, y: 304 }, // left wall
  { x: 630, y: 304 }, // right wall
  { x: 64, y: 304 }, // far left of the wall
  { x: 896, y: 304 }, // far right of the wall
  { x: 424, y: 230 }, // keep, left sconce
  { x: 536, y: 230 }, // keep, right sconce
  { x: 480, y: 392 }, // over the gate
];

/** Where idle moth `i` of `n` rests on the jar's rim. */
export function mothRest(i: number, n: number) {
  return { x: JAR.x + (i - (n - 1) / 2) * 20, y: JAR.y - 30 };
}
