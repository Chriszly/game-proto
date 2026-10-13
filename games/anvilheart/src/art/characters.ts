import Phaser from 'phaser';
import { GOLD, INK, IRON, LEAF, MAGIC, RED, SKIN, WOOD } from './palette';
import { bakePixelArt, type Palette } from './pixelArt';

// The adventurers who come to the counter, from the waist up: a knight, a ranger, a barbarian and
// a mage. Each shares the same body, with their own headgear and colours.

const HEADS: string[][] = [
  // Knight: an iron helm with a slit visor.
  ['....hhhhhh....', '...hHHHHHHh...', '...hhhhhhhh...', '...hkkkkkkh...', '...hhhhhhhh...', '...hhhhhhhh...', '....hhhhhh....'],
  // Ranger: a green hood over the face.
  ['.....hhhh.....', '....hHHHHh....', '...hHssssHh...', '...hsesseshh..', '...hssssssh...', '...hsmmmmsh...', '....hssssh....'],
  // Barbarian: a horned cap and a red beard.
  ['k..........k..', 'kk.hhhhhh.kk..', '.kkhHHHHhkk...', '...ssssssss...', '...sesssses...', '...bbssssbb...', '....bbbbbb....'],
  // Mage: a tall pointed hat.
  ['......hh......', '.....hHHh.....', '....hHHHHh....', '.hhhhhhhhhhhh.', '...ssssssss...', '...sesssses...', '....ssmmss....'],
];

const BODY = [
  '.....ssss.....',
  '..cccccccccc..',
  '.cCCCcccccccc.',
  'cCcccbbbbcccsc',
  'scccccccccccss',
  'ssccccggccccs.',
  '.sccccggcccc..',
  '..cccccccccc..',
  '..cccccccccc..',
];

const PALETTES: Palette[] = [
  { h: IRON.light, H: IRON.shine, k: INK, c: IRON.mid, C: IRON.shine, b: RED.mid, g: GOLD.mid },
  { h: LEAF.mid, H: LEAF.light, c: LEAF.dark, C: LEAF.mid, b: WOOD.light, g: WOOD.shine },
  { h: WOOD.mid, H: WOOD.light, k: 0xf1e8d0, c: WOOD.light, C: WOOD.shine, b: RED.mid, g: GOLD.mid },
  { h: MAGIC.dark, H: MAGIC.mid, c: MAGIC.dark, C: MAGIC.mid, b: GOLD.light, g: GOLD.light },
];

export const LOOKS = PALETTES.length;
export const adventurerTexture = (look: number) => `adventurer-${look % LOOKS}`;

export function bakeAdventurers(scene: Phaser.Scene) {
  PALETTES.forEach((palette, look) => {
    const p: Palette = { s: SKIN.mid, e: INK, m: SKIN.dark, ...palette };
    if (look === 2) p.b = RED.mid;
    bakePixelArt(scene, adventurerTexture(look), [...HEADS[look], ...BODY], p, 5, INK);
  });
}
