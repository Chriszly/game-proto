import Phaser from 'phaser';
import { LANTERN_SPOTS } from '../game/places';
import { PixelCanvas, seeded } from './pixelArt';

// Every texture, drawn in code and baked at startup: the castle, the lanterns, the moths, the jar,
// a soft glow and the HUD icons. Art pixels are baked at 2x, the moths at 3x so they read at a glance.

const SCALE = 2;

const C = {
  stone: 0x575c78,
  stoneLight: 0x6c7290,
  stoneDark: 0x41455e,
  slit: 0x1d1f30,
  gate: 0x17182a,
  door: 0x4a3424,
  doorDark: 0x33231a,
  grass: 0x22301f,
  grassLight: 0x2e4129,
  iron: 0x26262e,
  ironLight: 0x45454f,
  glassDark: 0x353a52,
  glassGlint: 0x5d6584,
  glass: 0xffd36a,
  glassLight: 0xfff1b0,
  flame: 0xff9a2e,
  wing: 0xece2c6,
  wingShade: 0xc6b48a,
  body: 0x5a4632,
  jar: 0xa9cfe0,
  jarLight: 0xe2f2f8,
  cork: 0x9b6b3d,
  corkDark: 0x6e4a28,
  gold: 0xf3c64e,
  goldDark: 0xb98a22,
  ash: 0x5a5560,
};

/** The castle's top edge in view pixels: the texture covers the view from here to the bottom. */
export const CASTLE_TOP = 100;

/** Paints a rectangle given in view pixels onto the castle's art canvas. */
function viewRect(c: PixelCanvas, x: number, y: number, w: number, h: number, color: number) {
  c.rect(Math.round(x / 2), Math.round((y - CASTLE_TOP) / 2), Math.round(w / 2), Math.round(h / 2), color);
}

/** A row of merlons along a top edge, leaving a gap wherever a lantern stands. */
function merlons(c: PixelCanvas, x0: number, x1: number, top: number, color: number) {
  for (let x = x0; x + 12 <= x1; x += 24) {
    if (LANTERN_SPOTS.some((s) => Math.abs(x + 6 - s.x) < 18 && Math.abs(top + 12 - (s.y + 16)) < 8)) continue;
    viewRect(c, x, top, 12, 12, color);
  }
}

/** Speckles a stretch of wall with darker and lighter stones. */
function stones(c: PixelCanvas, x: number, y: number, w: number, h: number, seed: number) {
  const rnd = seeded(seed);
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    const sx = x + rnd() * (w - 8);
    const sy = y + rnd() * (h - 4);
    viewRect(c, sx, sy, 8, 4, rnd() < 0.6 ? C.stoneDark : C.stoneLight);
  }
}

function castle() {
  const c = new PixelCanvas(480, (540 - CASTLE_TOP) / 2);
  // The curtain wall, two towers and the keep in the middle.
  viewRect(c, 40, 320, 880, 180, C.stone);
  merlons(c, 40, 920, 308, C.stone);
  stones(c, 40, 332, 880, 160, 3);
  for (const x of [120, 740]) {
    viewRect(c, x, 200, 100, 300, C.stoneLight);
    viewRect(c, x + 84, 200, 16, 300, C.stone);
    merlons(c, x, x + 112, 188, C.stoneLight);
    stones(c, x, 212, 100, 280, x);
    viewRect(c, x + 44, 250, 10, 26, C.slit);
    viewRect(c, x + 44, 330, 10, 26, C.slit);
  }
  viewRect(c, 400, 128, 160, 372, C.stoneLight);
  viewRect(c, 540, 128, 20, 372, C.stone);
  merlons(c, 400, 572, 116, C.stoneLight);
  stones(c, 400, 140, 160, 260, 7);
  for (const x of [432, 516]) {
    viewRect(c, x, 300, 14, 30, C.slit);
    viewRect(c, x + 2, 296, 10, 4, C.slit);
  }
  // The gate: an arch over a wooden door.
  viewRect(c, 440, 410, 80, 90, C.gate);
  viewRect(c, 448, 400, 64, 10, C.gate);
  viewRect(c, 460, 394, 40, 6, C.gate);
  viewRect(c, 450, 420, 60, 80, C.door);
  for (let x = 462; x < 510; x += 14) viewRect(c, x, 420, 2, 80, C.doorDark);
  // The ground in front.
  viewRect(c, 0, 500, 960, 40, C.grass);
  const rnd = seeded(11);
  for (let i = 0; i < 90; i++) viewRect(c, rnd() * 956, 500 + rnd() * 36, 4, 2, C.grassLight);
  return c;
}

function lantern(lit: boolean) {
  const c = new PixelCanvas(12, 16);
  c.rect(5, 0, 2, 1, C.iron).px(4, 1, C.iron).px(7, 1, C.iron);
  c.rect(3, 2, 6, 1, C.iron).rect(2, 3, 8, 1, C.ironLight);
  c.rect(2, 4, 8, 9, C.iron);
  if (lit) {
    c.rect(3, 4, 6, 9, C.glass);
    c.rect(4, 6, 4, 6, C.glassLight);
    c.rect(5, 8, 2, 3, C.flame).px(5, 7, C.flame);
  } else {
    c.rect(3, 4, 6, 9, C.glassDark);
    c.rect(4, 5, 1, 3, C.glassGlint);
    c.rect(5, 10, 2, 2, C.iron);
  }
  c.rect(2, 4, 1, 9, C.iron).rect(9, 4, 1, 9, C.iron);
  c.rect(1, 13, 10, 1, C.ironLight).rect(2, 14, 8, 2, C.iron);
  return c;
}

function moth(wingsUp: boolean) {
  const c = new PixelCanvas(11, 9);
  if (wingsUp) {
    c.rect(1, 0, 3, 4, C.wing).rect(7, 0, 3, 4, C.wing);
    c.rect(2, 4, 2, 2, C.wingShade).rect(7, 4, 2, 2, C.wingShade);
    c.px(2, 1, C.wingShade).px(8, 1, C.wingShade);
  } else {
    c.rect(0, 4, 4, 3, C.wing).rect(7, 4, 4, 3, C.wing);
    c.rect(1, 7, 3, 1, C.wingShade).rect(7, 7, 3, 1, C.wingShade);
    c.px(1, 5, C.wingShade).px(9, 5, C.wingShade);
  }
  c.rect(5, 2, 1, 6, C.body).rect(4, 3, 3, 3, C.body);
  c.px(4, 1, C.body).px(6, 1, C.body).px(3, 0, C.body).px(7, 0, C.body);
  return c;
}

function jar() {
  const c = new PixelCanvas(18, 20);
  c.rect(5, 0, 8, 3, C.cork).rect(5, 2, 8, 1, C.corkDark);
  c.rect(4, 3, 10, 2, C.jar, 0.7);
  c.rect(2, 5, 14, 14, C.jar, 0.45);
  c.frame(2, 5, 14, 14, C.jar, 0.9);
  c.rect(4, 7, 1, 8, C.jarLight, 0.9);
  c.rect(2, 19, 14, 1, C.corkDark);
  return c;
}

/** A small flame for each of the keep's hearths, lit or gone to ash. */
function hearth(lit: boolean) {
  const c = new PixelCanvas(8, 10);
  if (lit) {
    c.rect(2, 3, 4, 5, C.flame).rect(3, 1, 2, 2, C.flame).px(4, 0, C.flame);
    c.rect(3, 4, 2, 4, C.glass).px(3, 3, C.glass);
  } else {
    c.rect(2, 5, 4, 3, C.ash).rect(3, 4, 2, 1, C.ash);
  }
  c.rect(0, 8, 8, 2, C.door);
  return c;
}

function coin() {
  const c = new PixelCanvas(8, 8);
  c.ellipse(0, 0, 8, 8, C.goldDark).ellipse(1, 1, 6, 6, C.gold).rect(3, 2, 2, 4, C.goldDark);
  return c;
}

/** A soft round glow, brightest in the middle, laid behind lit lanterns. */
function bakeGlow(scene: Phaser.Scene) {
  const r = 64;
  const g = scene.add.graphics();
  for (let i = 16; i > 0; i--) g.fillStyle(0xffc860, 0.05).fillCircle(r, r, (r * i) / 16);
  if (scene.textures.exists('glow')) scene.textures.remove('glow');
  g.generateTexture('glow', r * 2, r * 2);
  g.destroy();
}

export function bakeSprites(scene: Phaser.Scene) {
  castle().bake(scene, 'castle', SCALE);
  lantern(true).bake(scene, 'lantern-lit', SCALE);
  lantern(false).bake(scene, 'lantern-dark', SCALE);
  moth(true).bake(scene, 'moth-0', 3);
  moth(false).bake(scene, 'moth-1', 3);
  jar().bake(scene, 'jar', SCALE);
  hearth(true).bake(scene, 'hearth-lit', SCALE);
  hearth(false).bake(scene, 'hearth-out', SCALE);
  coin().bake(scene, 'coin', SCALE);
  bakeGlow(scene);
}
