import Phaser from 'phaser';
import type { Cargo } from '../game/map';
import { DRAGON, GOLD, INK, ROCK, WOOD } from './palette';
import { PixelCanvas, bakePixelArt } from './pixelArt';

// Everything on the map besides the land: the villages and the Roost, the wyrm and its wagon
// (seen from above, facing right, so they turn with the track), the cargo icons and the HUD icons.

const SCALE = 4;

export function bakeSprites(scene: Phaser.Scene) {
  bakeRoost(scene);
  for (const [name, roof] of Object.entries(ROOFS)) bakeVillage(scene, `village-${name}`, roof);
  bakeWyrm(scene);
  for (const [cargo, rows] of Object.entries(CARGO_ICONS)) bakePixelArt(scene, `cargo-${cargo}`, rows, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'coin', COIN, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'heart', HEART, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'heart-empty', HEART.map((r) => r.replace(/[rp]/g, 'x')), ICON_COLORS, 3, INK);
}

/** Each village's roof colour, by name. */
const ROOFS: Record<string, number> = {
  Millbrook: 0xd9a94a,
  Ashford: 0x8a8494,
  Fernhollow: 0x4f9a52,
  Stonereach: 0xa0603a,
  Saltmere: 0x4a7ac0,
};

/** Two cottages and a well-trodden yard, filling one tile. */
function bakeVillage(scene: Phaser.Scene, key: string, roof: number) {
  const c = new PixelCanvas(16, 16);
  c.ellipse(1, 6, 14, 10, 0xb89a68);
  cottage(c, 1, 5, 8, roof);
  cottage(c, 8, 8, 7, roof);
  c.outline(INK);
  c.bake(scene, key, SCALE);
}

function cottage(c: PixelCanvas, x: number, y: number, w: number, roof: number) {
  const wall = 0xe9dcc0;
  c.rect(x, y + 3, w, 4, wall);
  c.rect(x + Math.floor(w / 2) - 1, y + 5, 2, 2, WOOD.dark);
  c.px(x + 1, y + 4, 0x7fb0d8);
  for (let j = 0; j < 4; j++) c.rect(x - 1 + j, y + j - 1, w + 2 - 2 * j, 1, j === 0 ? shade(roof, 0.75) : roof);
}

const shade = (color: number, f: number) => {
  const r = Math.round(((color >> 16) & 255) * f);
  const g = Math.round(((color >> 8) & 255) * f);
  const b = Math.round((color & 255) * f);
  return (r << 16) | (g << 8) | b;
};

/** The wyrm's Roost: a rocky hill with a cave, and a glint of hoard inside. */
function bakeRoost(scene: Phaser.Scene) {
  const c = new PixelCanvas(16, 16);
  c.ellipse(0, 2, 16, 15, ROCK.base);
  c.ellipse(1, 2, 9, 8, ROCK.light);
  c.ellipse(10, 6, 5, 6, ROCK.dark);
  c.ellipse(4, 7, 9, 10, INK);
  c.rect(4, 12, 9, 4, INK);
  c.rect(6, 13, 4, 2, GOLD);
  c.px(7, 12, 0xfff2b0);
  c.outline(INK);
  c.bake(scene, 'roost', SCALE);
}

const WYRM_COLORS = {
  g: DRAGON.base,
  d: DRAGON.dark,
  l: DRAGON.light,
  h: DRAGON.horn,
  e: DRAGON.eye,
  k: INK,
  s: DRAGON.spine,
  w: DRAGON.wing,
  m: DRAGON.membrane,
};

/** The head from above, snout to the right. */
const HEAD = [
  'hh............',
  '.hh...........',
  '..dgggd.......',
  '.dgggggggd....',
  'dggekglgggggd.',
  'dsgggglggggggd',
  'dsgggglgggggkd',
  'dggekglgggggd.',
  '.dgggggggd....',
  '..dgggd.......',
  '.hh...........',
  'hh............',
];

/** A body coil from above, with the spine down its middle. */
const COIL = [
  '...dddd...',
  '.ddggggdd.',
  '.dggllggd.',
  'dggggggggd',
  'dsssssssss',
  'dggggggggd',
  '.dggllggd.',
  '.ddggggdd.',
  '...dddd...',
];

/** The wings, spread to both sides of the first coil. */
const WINGS = [
  '..w.w.w...',
  '.wmwmwmw..',
  '.wmmmmmmw.',
  '..wmmmmmw.',
  '...wwmmw..',
  '..........',
  '..........',
  '..........',
  '...wwmmw..',
  '..wmmmmmw.',
  '.wmmmmmmw.',
  '.wmwmwmw..',
  '..w.w.w...',
];

function bakeWyrm(scene: Phaser.Scene) {
  bakePixelArt(scene, 'wyrm-head', HEAD, WYRM_COLORS, 3, INK);
  bakePixelArt(scene, 'wyrm-coil', COIL, WYRM_COLORS, 3, INK);
  bakePixelArt(scene, 'wyrm-wings', WINGS, WYRM_COLORS, 3, INK);
  // The wagon it pulls, from above: a plank bed in a frame, with a hitch at the front.
  const c = new PixelCanvas(15, 11);
  c.rect(0, 0, 13, 11, WOOD.dark);
  c.rect(1, 1, 11, 9, WOOD.base);
  for (let x = 3; x < 12; x += 3) c.rect(x, 1, 1, 9, WOOD.light);
  c.rect(13, 5, 2, 1, WOOD.dark);
  c.outline(INK);
  c.bake(scene, 'wagon', 3);
}

const ICON_COLORS = {
  y: 0xe8c45a, // grain
  t: 0xc9a46a, // sack
  b: 0x8a6a40,
  i: 0xb9b4c2, // iron
  w: WOOD.base,
  W: WOOD.light,
  D: WOOD.dark,
  o: 0x6e6878, // ore
  O: 0x9a94a6,
  c: 0x6ad0e8, // crystal glint
  f: 0x7aa8d0, // fish
  F: 0xc8e0f0,
  G: GOLD,
  L: 0xfff2b0,
  r: 0xd8483f, // heart
  p: 0xf08a8a,
  x: 0x4a3a3a,
};

const CARGO_ICONS: Record<Cargo, string[]> = {
  grain: ['..y.y..', '.yyyyy.', '..ttt..', '.ttttt.', 'tttbttt', 'ttttttt', '.ttttt.'],
  tools: ['.iiiii.', '.iiiii.', '...w...', '...w...', '...w...', '...w...', '...D...'],
  timber: ['.......', 'WbWbWb.', 'wwwwwwb', '.WbWbWb', 'wwwwwww', 'WbWbWb.', '.......'],
  ore: ['...O...', '..OOo..', '.OcOoo.', 'OOOoooo', 'OOocooo', '.Ooooo.', '.......'],
  fish: ['.......', 'f..fff.', 'ff.fFfF', '.fffffF', 'ff.ffff', 'f..fff.', '.......'],
};

const COIN = ['.GGG.', 'GLGGG', 'GLGGG', 'GGGGG', '.GGG.'];
const HEART = ['.rr.rr.', 'rpprrrr', 'rprrrrr', '.rrrrr.', '..rrr..', '...r...'];
