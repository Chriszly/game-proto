import Phaser from 'phaser';
import { INK } from './palette';
import { PixelCanvas, type Palette } from './pixelArt';

// Plague doctor, side view facing right: wide-brimmed hat, brass goggles, bone-white beak mask,
// long belted coat, leather gloves and boots. Drawn without outlines; the ink outline is added when
// baking. The far leg is drawn darker so the walk reads clearly.
export const DOCTOR_PALETTE: Palette = {
  K: 0x231c26, // hat
  k: 0x3e3446, // hat highlight
  H: 0x7a2a2a, // hat band
  C: 0x2e2638, // coat
  c: 0x4a3f58, // coat fold highlight
  d: 0x1c1622, // coat shadow
  D: 0x17121c, // far leg
  M: 0xe8dcb8, // beak mask
  m: 0xb3a27e, // beak underside
  n: 0x7d6e52, // beak shadow
  G: 0xc9a040, // goggle rim
  R: 0xe2593f, // goggle lens
  r: 0xffd0a0, // lens glint
  L: 0x5a3a22, // near glove and boot
  l: 0x83593a, // leather highlight
  E: 0x3a2416, // far boot
};

const BODY = [
  '........................',
  '........................',
  '.........kKKKK..........',
  '.........kKKKKK.........',
  '.........kKKKKK.........',
  '.........HHHHHH.........',
  '.........kKKKKK.........',
  '....kkkkkKKKKKKKKKK.....',
  '...kKKKKKKKKKKKKKKKKK...',
  '.......dCCCCCGGG........',
  '......dCCCCCGRrG........',
  '......dCCCCCGRRGMm......',
  '......dCCCCCCGGMMMMm....',
  '......dCCCCCCMMMMMMMMm..',
  '......dCCCCCCmmmmmmmmn..',
  '......dCCCCCCCnnnn......',
  '.....dCCCcCCCCCC........',
  '.....dCCcCCCCCCCC.......',
  '....dCCCcCCCcCCCC.......',
  '....dCCcCCCCcCCCCC......',
  '....dCCcCCCCcCCCCC......',
  '....dCCcCCCCCcCCLl......',
  '...dCCCcCCCCCCcLLl......',
  '...dCCcCCCCCCCCCLl......',
  '...dLLLLLLLLLGGLL.......',
  '...dCCcCCCCCCCCCC.......',
  '..dCCCcCCCCCCCCCCC......',
  '..dCCcCCCCCCCCCCCC......',
  '..dCCcCCCCCCCCCCCCC.....',
  '..ddCcCCCCCCCCCCCCC.....',
  '...dddddddddddddddd.....',
];

const LEGS_IDLE = [
  '......DD...CC...........',
  '......DD...CC...........',
  '......EE...LL...........',
  '.....EEEE..LLLl.........',
  '........................',
];

const LEGS_NEAR_FORWARD = [
  '.....DD.....CC..........',
  '....DD.......CC.........',
  '...EE.........LL........',
  '..EEEE........LLLl......',
  '........................',
];

const LEGS_FAR_FORWARD = [
  '.....CC.....DD..........',
  '....CC.......DD.........',
  '...LL.........EE........',
  '..LLLl........EEEE......',
  '........................',
];

// Legs passing each other. The body is drawn one pixel higher here, so the doctor bobs as they walk.
const LEGS_PASS = [
  '.......DDCC.............',
  '.......DDCC.............',
  '.......DDCC.............',
  '.......EELL.............',
  '......EELLLl............',
  '........................',
];

/** Texture keys and pixel rows for the idle frame and the four walk frames. */
export const DOCTOR_FRAMES: Record<string, string[]> = {
  'doctor-idle': [...BODY, ...LEGS_IDLE],
  'doctor-stride': [...BODY, ...LEGS_NEAR_FORWARD],
  'doctor-pass': [...BODY.slice(1), ...LEGS_PASS],
  'doctor-stride-far': [...BODY, ...LEGS_FAR_FORWARD],
};

/** Walk cycle, in order. */
export const DOCTOR_WALK = ['doctor-stride', 'doctor-pass', 'doctor-stride-far', 'doctor-pass'];

export function bakeDoctor(scene: Phaser.Scene) {
  for (const [key, rows] of Object.entries(DOCTOR_FRAMES)) {
    new PixelCanvas(rows[0].length, rows.length).grid(0, 0, rows, DOCTOR_PALETTE).outline(INK).bake(scene, key);
  }
  scene.anims.create({
    key: 'doctor-walk',
    frames: DOCTOR_WALK.map((key) => ({ key })),
    frameRate: 9,
    repeat: -1,
  });
}
