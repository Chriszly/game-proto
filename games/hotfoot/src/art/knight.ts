import Phaser from 'phaser';
import { MAT, bake, disk, edge, limb, poly, ring, slab, type Canvas, type Pt } from './facets';

// The knight, side on and facing right, in low-poly so the running, jumping and sliding poses share
// one body. Each pose is baked into its own texture. Art is drawn in units of `K` screen pixels; the
// standing poses are 20x24 units with the feet on row 22, and the slide is 26x11 with the feet on 9.

export const KNIGHT_SCALE = 3;
export type KnightPose = 'run0' | 'run1' | 'run2' | 'run3' | 'jump' | 'fall' | 'slide';

const K = KNIGHT_SCALE;

/** A leg from the hip to the foot, with a boot at the foot; the far leg is in shade. */
function leg(g: Canvas, hip: Pt, foot: Pt, front: boolean) {
  limb(g, front ? MAT.steel.mid : MAT.steel.shade, hip, foot, 2.2, K);
  const [fx, fy] = foot;
  poly(g, [[fx - 1.5, fy - 0.6], [fx + 2, fy - 0.6], [fx + 2, fy + 0.6], [fx - 1.5, fy + 0.6]], MAT.wood.dark, K);
}

/** An arm from the shoulder to a gauntlet. */
function arm(g: Canvas, shoulder: Pt, hand: Pt, front: boolean) {
  limb(g, front ? MAT.steel.mid : MAT.steel.shade, shoulder, hand, 2, K);
  const [hx, hy] = hand;
  poly(g, [[hx - 1, hy - 1], [hx + 1, hy - 1], [hx + 1, hy + 1], [hx - 1, hy + 1]], front ? MAT.steel.shade : MAT.steel.dark, K);
}

/** Helmet with a plume and a visor slit, centred at (cx, cy). */
function helmet(g: Canvas, cx: number, cy: number, rx: number, ry: number, plumeX: number, plumeY: number) {
  // The plume leans back over the helmet.
  poly(g, [[plumeX, plumeY + 2], [plumeX + 3, plumeY - 1], [plumeX + 3.5, plumeY + 2]], MAT.red.mid, K);
  poly(g, [[plumeX + 1.5, plumeY + 1.4], [plumeX + 3, plumeY - 1], [plumeX + 2.6, plumeY + 0.8]], MAT.red.lit, K);
  disk(g, MAT.steel, cx, cy, rx, ry, K, 10);
  edge(g, ring(cx, cy, rx, ry, 10), K, 1);
  poly(g, [[cx + 1, cy - 0.5], [cx + 3.6, cy - 0.5], [cx + 3.6, cy + 0.5], [cx + 1, cy + 0.5]], 0x1a1216, K);
}

/** The tabard over the mail: blue, lit on the left, with a gold cross and a belt. */
function torso(g: Canvas, x: number, y: number, w: number, h: number) {
  slab(g, MAT.tabard, x, y, w, h, K);
  const cx = x + w / 2;
  poly(g, [[cx - 0.5, y + 1], [cx + 0.5, y + 1], [cx + 0.5, y + h - 2], [cx - 0.5, y + h - 2]], MAT.gold.mid, K);
  poly(g, [[cx - 1.5, y + 2], [cx + 1.5, y + 2], [cx + 1.5, y + 3], [cx - 1.5, y + 3]], MAT.gold.lit, K);
  poly(g, [[x, y + h], [x + w, y + h], [x + w, y + h + 1], [x, y + h + 1]], MAT.wood.mid, K);
  poly(g, [[x - 1, y], [x + 1, y], [x + 1, y + 2], [x - 1, y + 2]], MAT.steel.lit, K);
  poly(g, [[x + w - 1, y], [x + w + 1, y], [x + w + 1, y + 2], [x + w - 1, y + 2]], MAT.steel.mid, K);
}

function draw(g: Canvas, pose: KnightPose) {
  if (pose === 'slide') {
    // Feet first along the ground, leaning back on one elbow.
    helmet(g, 5.5, 5.5, 3.5, 3, 2, 2);
    slab(g, MAT.tabard, 8, 5, 7, 4, K);
    poly(g, [[11, 6], [12, 6], [12, 9], [11, 9]], MAT.gold.mid, K);
    arm(g, [9, 8], [6, 9], false);
    limb(g, MAT.steel.mid, [15, 7.5], [22, 7.5], 2.6, K);
    poly(g, [[22, 6], [24, 6], [24, 9], [22, 9]], MAT.wood.dark, K);
    return;
  }
  const up = pose === 'jump' || pose === 'fall';
  const bob = pose === 'run1' || pose === 'run3' ? -1 : 0;
  const top = 3 + bob;
  // Legs behind the body first, then the near leg in front.
  if (pose === 'run0') {
    leg(g, [7, 16], [4, 21], false);
    leg(g, [9, 16], [12, 21], true);
  } else if (pose === 'run2') {
    leg(g, [7, 16], [11, 21], false);
    leg(g, [9, 16], [5, 21], true);
  } else if (pose === 'run1' || pose === 'run3') {
    leg(g, [7, 15], pose === 'run1' ? [6, 20] : [10, 20], false);
    leg(g, [9, 15], pose === 'run1' ? [11, 18] : [7, 18], true);
  } else {
    // Knees tucked in a jump; reaching down for the ground on the way down.
    leg(g, [7, 16], pose === 'jump' ? [10, 19] : [6, 21], false);
    leg(g, [9, 16], pose === 'jump' ? [13, 18] : [10, 21], true);
  }
  // The far arm swings opposite the near leg.
  const swing = pose === 'run0' ? -1 : pose === 'run2' ? 1 : 0;
  arm(g, [7, top + 8], [7 + swing * 3, top + 12], false);
  torso(g, 6, top + 7, 7, 6);
  helmet(g, 9.5, top + 3, 3.8, 3.2, 5, top - 3);
  if (up) arm(g, [12, top + 8], [15, top + 4], true);
  else arm(g, [12, top + 8], [12 - swing * 3, top + 12], true);
}

export function bakeKnight(scene: Phaser.Scene) {
  for (const pose of ['run0', 'run1', 'run2', 'run3', 'jump', 'fall'] as KnightPose[]) {
    bake(scene, `knight-${pose}`, 20 * K, 24 * K, (g) => draw(g, pose));
  }
  bake(scene, 'knight-slide', 26 * K, 11 * K, (g) => draw(g, 'slide'));
}
