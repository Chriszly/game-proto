import Phaser from 'phaser';
import type { EnemyKind } from '../game/enemies';
import { BLUE, BONE, GOLD, GREEN, INK, IRON, PURPLE, RED, SKIN, WOOD } from './palette';
import { bakePixelArt, type Palette } from './pixelArt';

// The hero and the foes, side on, as character grids ('.' = clear) outlined in ink when baked.
// The hero faces right, towards the foes; the foes face left, towards the hero.

export const CHAR_SCALE = 4;

const PALETTE: Palette = {
  e: INK,
  i: IRON.shine,
  I: IRON.light,
  m: IRON.mid,
  d: IRON.dark,
  s: SKIN.mid,
  S: SKIN.shade,
  b: BLUE.mid,
  B: BLUE.light,
  n: BLUE.dark,
  w: WOOD.mid,
  W: WOOD.light,
  g: GOLD.mid,
  G: GOLD.light,
  r: RED.mid,
  R: RED.light,
  x: RED.dark,
  k: GREEN.dark,
  l: GREEN.mid,
  L: GREEN.light,
  h: GREEN.shine,
  o: BONE.dark,
  O: BONE.mid,
  c: BONE.light,
  p: PURPLE.dark,
  P: PURPLE.mid,
  q: PURPLE.light,
  y: 0xf8d460,
  t: 0x6a5a50,
  T: 0x8a7a6a,
  u: 0xd8a0a8,
};

// A knight in a blue tabard with a round shield and a raised sword.
const HERO = [
  '..........i.',
  '..........iI',
  '..........iI',
  '..........iI',
  '....III...iI',
  '...IiiiI..iI',
  '...IIddI..iI',
  '...IIsdI..iI',
  '...IIIII.gGg',
  '..bBBBBBbsw..',
  '.gGgBBBBbss..',
  'gGrGgbgBb....',
  'gGrrGbgBb....',
  'gGrGgbBBb....',
  '.gGgnbBBn....',
  '..g.nnnnn....',
  '....dd.dd....',
  '....mm.mm....',
  '....mm.mm....',
  '...ddd.ddd...',
];

const FOES: Record<EnemyKind, string[]> = {
  // A green blob with a shine.
  slime: [
    '.....LLLL.....',
    '...LLhhLLLL...',
    '..LLhhLLLLLL..',
    '.LLLLLLLLLLLL.',
    '.LeeLLLLeeLLL.',
    'LLeeLLLLeeLLLL',
    'LLLLLLLLLLLLLl',
    'LLLLLxxxxLLLLl',
    'LLLLLLLLLLLLll',
    '.lLLLLLLLLLlll',
    '..llllllllll..',
  ],
  // A grey rat with a long pink tail.
  rat: [
    '..TT...........',
    '.TuT...........',
    'TTTTTT.........',
    'eTTTTTTTTT.....',
    'TTTTTTTTTTT....',
    '.TTtTTTTTTTT...',
    '..tTTTTTTTTTuu.',
    '...tttttttt..uu',
    '...t.t..t.t...u',
  ],
  // A skeleton with a rusty sword.
  skeleton: [
    '.....OcccO...',
    '....Occcccc..',
    '....ceecec...',
    '....cccccc...',
    '.....cOcOc...',
    '..W...ccc....',
    '..W..cOcOc...',
    '..W.c.ccc.c..',
    '..WcO.OcO.Oc.',
    '.gWg..ccc..c.',
    '..w...OcO....',
    '......ccc....',
    '.....c...c...',
    '.....c...c...',
    '.....c...c...',
    '....cc...cc..',
  ],
  // A hooded cultist in purple robes with a glowing candle.
  cultist: [
    '.....pppp....',
    '....pPPPPp...',
    '...pPPPPPPp..',
    '...pPeyPeyp..',
    '...pPPPPPPp..',
    '....pPPPPp...',
    '..y.pqPPqPp..',
    '..G.PqPPqPPp.',
    '..sPPqPPqPPp.',
    '...PPqPPqPPp.',
    '...pPPPPPPPp.',
    '...pPPPPPPPpp',
    '..pPPPPPPPPpp',
    '..pppppppppp.',
  ],
  // The Bone King: a big crowned skeleton with a great axe.
  boneKing: [
    '.......g.g.g.......',
    '.......gGgGg.......',
    '......OcccccO......',
    '.....Occcccccc.....',
    '.....crrcccrrc.....',
    '.....crrcccrrc.....',
    '.....ccccOcccc.....',
    '......cOcOcOc......',
    '.I.....ccccc.......',
    'IiI...xxccccxx.....',
    'IiiW.xcOcOcOcOcx...',
    'IiI.W.c.ccccc.c.c..',
    '.I...WcOcOcOcOc.c..',
    '......W.ccccc...c..',
    '.......WcOcOc...c..',
    '......xxxcccxxx....',
    '.....xxxxxxxxxxx...',
    '.....xx.c...c.xx...',
    '........c...c......',
    '........c...c......',
    '.......cc...cc.....',
  ],
};

export function bakeCharacters(scene: Phaser.Scene) {
  bakePixelArt(scene, 'hero', HERO, PALETTE, CHAR_SCALE, INK);
  for (const [kind, rows] of Object.entries(FOES)) bakePixelArt(scene, `foe-${kind}`, rows, PALETTE, CHAR_SCALE, INK);
  // A small version of the hero for the map.
  bakePixelArt(scene, 'hero-token', HERO, PALETTE, 2, INK);
}

export const foeTexture = (kind: EnemyKind) => `foe-${kind}`;
