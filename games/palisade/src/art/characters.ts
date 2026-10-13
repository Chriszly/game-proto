import Phaser from 'phaser';
import type { EnemyKind } from '../game/enemies';
import { CLOTH, FIRE, FROST, GOLD, INK, IRON, RED, STONE, WOOD } from './palette';
import { PixelCanvas, bakePixelArt, padRows, type Palette } from './pixelArt';

// The hero and the foes, side on, drawn as character grids ('.' = clear) and outlined in ink when
// baked. The hero faces right towards the foes; the foes are drawn facing right too and flipped
// when placed. Each foe has two walking frames that differ in the legs.

export const CHAR_SCALE = 3;

const HERO_PALETTE: Palette = {
  h: 0x2a4a26, // hood shadow
  H: 0x3f7a35, // hood
  g: 0x62a046, // hood highlight
  s: 0xe0b888, // skin
  S: 0xb88a60, // skin shade
  e: INK,
  t: WOOD.mid, // tunic
  T: WOOD.light,
  b: WOOD.dark, // belt
  G: GOLD.mid,
  w: WOOD.light, // bow
  W: WOOD.shine,
  c: CLOTH.light, // bowstring
  a: CLOTH.mid, // arrow shaft
  i: IRON.shine, // arrowhead
  q: WOOD.dark, // quiver
  f: RED.mid, // fletching
  p: 0x4a3f58, // breeches
  B: WOOD.dark, // boots
};

// A ranger in a green hood, drawing an arrow on the bow, the quiver on the back.
const HERO = [
  '.....hhhh.........',
  '....hHHHHh........',
  '..f.hHgHHHHh..ww..',
  '..fhHgHHsssH..cWw.',
  '..qhHHHsseS...c.Ww',
  '..qhHHHssss...c..W',
  '..qqhHHsSs....c..Ww',
  '..qqhhHHHhh...c...W',
  '..qhHHHHHHHh..c...W',
  '..htTTttttsssaaaaiW',
  '..htTttttt....c...W',
  '..htbbGbbt....c...W',
  '..htttTttt....c..Ww',
  '...htttTtt....c..W',
  '...hhttttt....c.Ww',
  '....pppppp....cWw',
  '....pp..pp....ww',
  '....pp..pp',
  '....BB..BB',
  '...BBB.BBB',
];

const GOBLIN_PALETTE: Palette = {
  k: 0x3f6a2a,
  K: 0x62a046,
  l: 0x8cc35a,
  y: FIRE.light,
  m: INK,
  n: CLOTH.light,
  r: WOOD.mid,
  R: WOOD.light,
  d: IRON.light,
  D: STONE.shine,
};

const GOBLIN = [
  '.....kKKk',
  'k...kKKKKk..k',
  'Kk..KKlKKyKkK',
  '.KkKKKKKKKKk',
  '....KKKmnmK',
  '.....kKKKk',
  '....rRRRRr',
  '...KrRrRRrK..D',
  '...KrRRRRrKKdD',
  '....rRrRRr..d',
  '....rrRrrr',
];
const GOBLIN_LEGS = [
  ['....KK..KK', '....KK..KK', '...kk...kk'],
  ['.....KKKK', '.....KKKK', '....kk..kk'],
];

const ORC_PALETTE: Palette = {
  o: 0x4a6a3a,
  O: 0x6a8a4a,
  p: 0x8aa860,
  i: IRON.mid,
  I: IRON.light,
  y: RED.light,
  m: INK,
  n: CLOTH.light,
  a: WOOD.dark,
  A: WOOD.mid,
  b: WOOD.dark,
  G: GOLD.mid,
  w: WOOD.light,
  x: STONE.light,
  X: STONE.shine,
};

const ORC = [
  '.....iiiii.......xX',
  '....iIIIIIi.....xXX',
  '....iIIIIIIi....wxX',
  '....OOOOOyOi....w',
  '....OOpOOOOO....w',
  '....OOOnmnmO...Ow',
  '.....OOOOOO...OOw',
  '...aaAAAAAAaaOO',
  '..OaAAAAAAAAa',
  '..OaAaaAAaaAa',
  '..OOaAAAAAAa',
  '...OabbGbbba',
  '....aAAAAAAa',
  '....aaAaaAaa',
];
const ORC_LEGS = [
  ['....OO...OO', '....OO...OO', '...ooo..ooo'],
  ['.....OO.OO', '.....OO.OO', '....ooo.ooo'],
];

const KNIGHT_PALETTE: Palette = {
  P: RED.mid,
  i: IRON.dark,
  I: IRON.mid,
  J: IRON.light,
  v: RED.light,
  S: RED.dark,
  g: GOLD.mid,
  d: STONE.light,
  D: STONE.shine,
  G: GOLD.dark,
  b: WOOD.dark,
};

const KNIGHT = [
  '.....PPP',
  '....PPPP',
  '.....iIIIi',
  '....iIJJIIi.....D',
  '....iIIIvvi.....D',
  '....iIIIIIi.....D',
  '.....iIIIi......D',
  '...iiIJJIIii....D',
  '..SSiIJIIIIIi...D',
  '.SgSSiIIIIIIiIGGGG',
  '.SggSiIJIIIIiII',
  '.SgSSiIIIIIIi',
  '.SSgSiIIbbbIi',
  '..SSiIIIIIIIi',
  '...iIIIiIIIi',
];
const KNIGHT_LEGS = [
  ['....iII..iII', '....iII..iII', '...iiJI.iiJI'],
  ['.....iIIiII', '.....iIIiII', '....iiJIiiJ'],
];

const FOES: Record<Exclude<EnemyKind, 'troll'>, { rows: string[]; legs: string[][]; palette: Palette }> = {
  goblin: { rows: GOBLIN, legs: GOBLIN_LEGS, palette: GOBLIN_PALETTE },
  orc: { rows: ORC, legs: ORC_LEGS, palette: ORC_PALETTE },
  knight: { rows: KNIGHT, legs: KNIGHT_LEGS, palette: KNIGHT_PALETTE },
};

export const foeTexture = (kind: EnemyKind, frame: number) => `foe-${kind}-${frame}`;

export function bakeCharacters(scene: Phaser.Scene) {
  bakePixelArt(scene, 'hero', HERO, HERO_PALETTE, CHAR_SCALE, INK);
  for (const [kind, foe] of Object.entries(FOES)) {
    foe.legs.forEach((legs, frame) =>
      bakePixelArt(scene, foeTexture(kind as EnemyKind, frame), padRows([...foe.rows, ...legs]), foe.palette, CHAR_SCALE, INK),
    );
  }
  for (const frame of [0, 1]) bakeTroll(scene, frame);
}

/** The Troll King: a hulking blue-grey troll with a gold crown and a spiked club. */
function bakeTroll(scene: Phaser.Scene, frame: number) {
  const skin = { dark: 0x3e5260, mid: 0x5d7688, light: 0x8aa2b0 };
  const c = new PixelCanvas(34, 36);
  // Legs, apart on one frame and together on the other.
  const spread = frame === 0 ? 2 : 0;
  c.rect(10 - spread, 27, 5, 6, skin.dark).rect(19 + spread, 27, 5, 6, skin.mid);
  c.rect(9 - spread, 32, 7, 3, WOOD.dark).rect(18 + spread, 32, 7, 3, WOOD.dark);
  // Body and belly.
  c.ellipse(6, 11, 22, 19, skin.mid).ellipse(11, 16, 12, 11, skin.light);
  // Belt and loincloth.
  c.rect(8, 24, 18, 3, WOOD.dark).rect(15, 24, 3, 3, GOLD.mid).rect(10, 27, 14, 3, WOOD.mid);
  // Far arm hanging, near arm raising the club.
  c.rect(3, 14, 5, 11, skin.dark).ellipse(2, 23, 6, 5, skin.dark);
  c.rect(26, 12, 5, 9, skin.mid).ellipse(26, 7, 6, 6, skin.mid);
  c.rect(28, 0, 3, 12, WOOD.light).ellipse(25, 0, 9, 7, WOOD.mid);
  for (const [x, y] of [[25, 1], [33, 2], [29, 0], [26, 6], [33, 5]]) c.px(x, y, STONE.shine);
  // Head with tusks, a heavy brow and small red eyes.
  c.ellipse(10, 3, 14, 11, skin.mid).rect(12, 6, 11, 2, skin.dark);
  c.rect(19, 8, 2, 1, RED.light).rect(14, 8, 2, 1, RED.light);
  c.rect(14, 11, 7, 1, INK).px(14, 10, CLOTH.light).px(20, 10, CLOTH.light);
  // Crown.
  c.rect(11, 1, 12, 3, GOLD.mid).rect(11, 3, 12, 1, GOLD.dark);
  for (const x of [11, 15, 19, 22]) c.px(x, 0, GOLD.light);
  c.px(16, 2, RED.mid).px(13, 2, FROST.mid).px(20, 2, FROST.mid);
  c.outline(INK);
  c.bake(scene, foeTexture('troll', frame), CHAR_SCALE);
}

/** Missiles, drawn pointing right and turned to their flight. */
export function bakeMissiles(scene: Phaser.Scene) {
  const arrow = (key: string, tip: number, glow?: number) => {
    const c = new PixelCanvas(16, 5);
    c.rect(3, 2, 10, 1, CLOTH.mid);
    c.rect(0, 1, 3, 1, RED.mid).rect(0, 3, 3, 1, RED.mid).rect(1, 2, 2, 1, RED.light);
    if (glow !== undefined) c.rect(10, 0, 6, 5, glow, 0.45);
    c.rect(13, 1, 2, 3, tip).px(15, 2, tip);
    c.bake(scene, key, 2);
  };
  arrow('arrow', IRON.shine);
  arrow('arrow-fire', FIRE.light, FIRE.mid);
  arrow('arrow-frost', FROST.white, FROST.mid);

  const ball = new PixelCanvas(12, 12);
  ball.ellipse(0, 0, 12, 12, FIRE.dark, 0.5).ellipse(1, 1, 10, 10, FIRE.mid).ellipse(3, 3, 7, 6, FIRE.light).ellipse(5, 4, 3, 3, FIRE.white);
  ball.bake(scene, 'fireball', 2);
}
