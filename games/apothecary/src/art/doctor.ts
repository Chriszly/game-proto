import Phaser from 'phaser';
import { both, ellPts, hatch, ink, paint, rectPts, shadow, wash, type Ctx, type Pt } from './paint';

// The plague doctor, painted like an almanac's woodcut gone to watercolour: tall hat, beaked mask
// with a brass goggle, long violet-grey cloak, facing right. 48x72 as shown, feet at the bottom.

export const DOCTOR_W = 48;
export const DOCTOR_H = 72;

/** Where each boot stands (x offset from the middle, how far it is lifted) and how high the body bobs. */
interface Pose {
  near: [number, number];
  far: [number, number];
  bob: number;
}
const POSES: Record<string, Pose> = {
  'doctor-idle': { near: [5, 0], far: [-5, 0], bob: 0 },
  'doctor-stride': { near: [10, 0], far: [-9, 1], bob: 0 },
  'doctor-pass': { near: [2, 1.5], far: [-2, 0], bob: -1.5 },
  'doctor-stride-far': { near: [-8, 1], far: [10, 0], bob: 0 },
};

/** Walk cycle, in order. */
export const DOCTOR_WALK = ['doctor-stride', 'doctor-pass', 'doctor-stride-far', 'doctor-pass'];

function drawDoctor(c: Ctx, pose: Pose) {
  const x = 22;
  const y = 66 + pose.bob;
  shadow(c, x + 4, 69, 15, 3.5, 0.22);
  // Boots: the far one darker, behind.
  const boot = ([dx, lift]: [number, number], col: string) =>
    both(c, rectPts(x + dx - 3.5, 62 - lift, 8, 7, 2), col, { layers: 2 }, { w: 1 });
  boot(pose.far, '#2a2430');
  // The cloak, wide at the hem.
  const cloak: Pt[] = [[x - 13, y], [x - 11, y - 22], [x - 6, y - 36], [x + 7, y - 36], [x + 12, y - 22], [x + 14, y], [x + 5, y + 2], [x - 5, y + 2]];
  boot(pose.near, '#3a3040');
  wash(c, cloak, '#4a4466', { layers: 4, spread: 0.8 });
  hatch(c, cloak.map(([a, b]) => [a + 9, b] as Pt), { gap: 2.4, alpha: 0.45, w: 0.55 });
  ink(c, cloak, { w: 1.3 });
  // Folds and a belt.
  ink(c, [[x - 2, y - 30], [x - 5, y - 2]], { closed: false, w: 0.7, alpha: 0.7 });
  ink(c, [[x + 5, y - 30], [x + 7, y - 3]], { closed: false, w: 0.7, alpha: 0.7 });
  both(c, rectPts(x - 11.5, y - 20, 24, 3), '#7a5236', { layers: 2 }, { w: 0.8 });
  both(c, rectPts(x + 1, y - 20.5, 4, 4, 1), '#d4a84a', { layers: 1 }, { w: 0.6 });
  // A gloved hand at the front.
  both(c, ellPts(x + 11, y - 16, 3, 3.4, 12), '#6b4426', { layers: 2 }, { w: 0.9 });
  // Hood and head.
  const head = y - 42;
  both(c, ellPts(x, head, 9, 8.5, 20), '#3e3a56', { layers: 3 }, { w: 1.2 });
  // The beak, bone white.
  const beak: Pt[] = [[x + 3, head - 5], [x + 12, head - 4], [x + 19, head + 1], [x + 24, head + 8], [x + 15, head + 5], [x + 3, head + 5]];
  both(c, beak, '#f4e8c8', { layers: 2 }, { w: 1 });
  ink(c, [[x + 6, head + 2], [x + 18, head + 4]], { closed: false, w: 0.6, alpha: 0.6 });
  // A brass-rimmed goggle with an amber lens.
  both(c, ellPts(x + 4, head - 2, 3.2, 3.2, 12), '#f3a63a', { layers: 2 }, { w: 1 });
  // The hat: wide brim, tall crown, a band.
  both(c, ellPts(x, head - 9, 15, 4, 24), '#2e2a40', { layers: 3 }, { w: 1.2 });
  both(c, rectPts(x - 7, head - 23, 14, 14, 2), '#38324e', { layers: 3 }, { w: 1.2 });
  both(c, rectPts(x - 7, head - 13, 14, 2.6), '#b08a4a', { layers: 1 }, { w: 0.7 });
  hatch(c, rectPts(x + 1, head - 23, 6, 14), { gap: 2, alpha: 0.35, w: 0.5 });
}

/** The harvesting sickle: a curved steel blade on a wooden handle, spun around the doctor. */
function drawSickle(c: Ctx) {
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#8a5a32';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(13, 13);
  c.lineTo(13, 7);
  c.stroke();
  c.restore();
  ink(c, [[12, 13.5], [12, 6.5], [14, 6.5], [14, 13.5]], { w: 0.6 });
  const blade: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1.05 + 0.95 * (i / 10));
    blade.push([8 + Math.cos(a) * 6.5, 7 + Math.sin(a) * 5.5]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = Math.PI * (1.05 + 0.95 * (i / 10));
    blade.push([8.6 + Math.cos(a) * 4.6, 7.4 + Math.sin(a) * 3.6]);
  }
  both(c, blade, '#c8ced4', { layers: 2, edge: 0 }, { w: 0.7 });
}

export function bakeDoctor(scene: Phaser.Scene) {
  paint(scene, 'sickle', 16, 14, drawSickle, 3);
  for (const [key, pose] of Object.entries(POSES)) paint(scene, key, DOCTOR_W, DOCTOR_H, (c) => drawDoctor(c, pose), 3, 77);
  scene.anims.create({
    key: 'doctor-walk',
    frames: DOCTOR_WALK.map((key) => ({ key })),
    frameRate: 9,
    repeat: -1,
  });
}
