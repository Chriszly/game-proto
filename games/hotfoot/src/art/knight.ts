import Phaser from 'phaser';
import { GOLD, INK, IRON, RED, TABARD, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

// The knight, side on and facing right, drawn from simple shapes so the running, jumping and
// sliding poses share one body. Each pose is baked into its own texture with an ink outline.

export const KNIGHT_SCALE = 3;
export type KnightPose = 'run0' | 'run1' | 'run2' | 'run3' | 'jump' | 'fall' | 'slide';

/** A leg from the hip down to the foot, two pixels thick, with a boot at the foot. */
function leg(c: PixelCanvas, hipX: number, hipY: number, footX: number, footY: number, front: boolean) {
  const shade = front ? IRON.mid : IRON.dark;
  c.line(hipX, hipY, footX, footY, shade).line(hipX + 1, hipY, footX + 1, footY, shade);
  c.rect(footX, footY, 3, 1, WOOD.dark).px(footX + 1, footY - 1, WOOD.dark);
}

/** An arm from the shoulder to the gauntlet. */
function arm(c: PixelCanvas, sx: number, sy: number, hx: number, hy: number, front: boolean) {
  c.line(sx, sy, hx, hy, front ? IRON.light : IRON.mid);
  c.rect(hx, hy, 2, 2, front ? IRON.mid : IRON.dark);
}

/** Helmet with a plume and a visor slit, its top left corner at (x, y). */
function helmet(c: PixelCanvas, x: number, y: number, plumeDx = -2) {
  c.rect(x + 1 + plumeDx, y - 2, 3, 2, RED.mid).px(x + plumeDx, y - 1, RED.dark).px(x + 2 + plumeDx, y - 3, RED.light);
  c.rect(x, y, 7, 6, IRON.mid).rect(x + 1, y, 5, 1, IRON.light).rect(x, y + 5, 7, 1, IRON.dark);
  c.rect(x + 1, y + 1, 1, 3, IRON.shine);
  c.rect(x + 4, y + 2, 3, 1, INK).px(x + 5, y + 4, IRON.dark);
}

/** The tabard over the mail: blue with a gold cross, and the belt. */
function torso(c: PixelCanvas, x: number, y: number, w = 7, h = 6) {
  c.rect(x, y, w, h, TABARD.mid).rect(x, y, 1, h, TABARD.dark).rect(x + w - 1, y, 1, h, TABARD.light);
  const cx = x + Math.floor(w / 2);
  c.rect(cx, y + 1, 1, h - 2, GOLD.mid).rect(cx - 1, y + 2, 3, 1, GOLD.light);
  c.rect(x, y + h, w, 1, WOOD.mid).px(cx, y + h, GOLD.light);
  c.rect(x - 1, y, 2, 2, IRON.light).rect(x + w - 1, y, 2, 2, IRON.light);
}

function draw(pose: KnightPose) {
  if (pose === 'slide') {
    // Feet first along the ground, leaning back on one elbow.
    const c = new PixelCanvas(26, 11);
    helmet(c, 2, 3, -2);
    c.rect(8, 5, 7, 4, TABARD.mid).rect(8, 5, 7, 1, TABARD.light).rect(11, 6, 1, 2, GOLD.mid).rect(10, 7, 3, 1, GOLD.light);
    arm(c, 9, 8, 6, 9, false);
    c.rect(15, 7, 7, 2, IRON.mid).rect(15, 7, 7, 1, IRON.light);
    c.rect(22, 6, 2, 3, WOOD.dark).rect(24, 8, 1, 1, WOOD.dark);
    c.outline(INK);
    return c;
  }
  const c = new PixelCanvas(20, 24);
  const up = pose === 'jump' || pose === 'fall';
  const bob = pose === 'run1' || pose === 'run3' ? -1 : 0;
  const top = 3 + bob;
  // Legs behind the body first, then the near leg in front.
  if (pose === 'run0') {
    leg(c, 7, 16, 4, 21, false);
    leg(c, 9, 16, 12, 21, true);
  } else if (pose === 'run2') {
    leg(c, 7, 16, 11, 21, false);
    leg(c, 9, 16, 5, 21, true);
  } else if (pose === 'run1' || pose === 'run3') {
    leg(c, 7, 15, pose === 'run1' ? 6 : 10, 20, false);
    leg(c, 9, 15, pose === 'run1' ? 11 : 7, 18, true);
  } else {
    // Knees tucked in a jump; reaching down for the ground on the way down.
    leg(c, 7, 16, pose === 'jump' ? 10 : 6, pose === 'jump' ? 19 : 21, false);
    leg(c, 9, 16, pose === 'jump' ? 13 : 10, pose === 'jump' ? 18 : 21, true);
  }
  // The far arm swings opposite the near leg.
  const swing = pose === 'run0' ? -1 : pose === 'run2' ? 1 : 0;
  arm(c, 7, top + 8, 7 + swing * 3, top + 12, false);
  torso(c, 6, top + 7, 7, 6);
  helmet(c, 6, top, up ? -1 : -2);
  if (up) arm(c, 12, top + 8, 15, top + 4, true);
  else arm(c, 12, top + 8, 12 - swing * 3, top + 12, true);
  c.outline(INK);
  return c;
}

export function bakeKnight(scene: Phaser.Scene) {
  for (const pose of ['run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'slide'] as KnightPose[]) {
    draw(pose).bake(scene, `knight-${pose}`, KNIGHT_SCALE);
  }
}
