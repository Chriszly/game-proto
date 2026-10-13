import Phaser from 'phaser';
import type { Kind } from '../game/kinds';
import type { PotionId } from '../game/orders';
import { BLUE, BREW, CLOTH, GLASS, GOLD, INK, LEAF, RED, ROOT, VIOLET, WOOD } from './palette';
import { PixelCanvas, type Palette } from './pixelArt';

// Ingredient tiles and potions, 16x16 with an ink outline added when baking. Wheat, mandrake and the
// two flasks are Apothecary's.

export const kindTexture = (kind: Kind) => `kind-${kind}`;
export const potionTexture = (potion: PotionId) => `potion-${potion}`;
/** Ingredients are drawn three times their art size on the board. */
export const TILE_SCALE = 3;

const KIND_ART: Record<Kind, { rows: string[]; palette: Palette }> = {
  // A sheaf of wheat tied with twine.
  wheat: {
    palette: { h: GOLD.shine, G: GOLD.light, g: GOLD.mid, s: GOLD.dark, t: WOOD.mid },
    rows: [
      '................',
      '......h...h.....',
      '....h.G.h.G.h...',
      '....G.Gh.Gh.G...',
      '...hG.GG.GG.Gh..',
      '...GG.Gg.Gg.GG..',
      '....g.gs.gs.g...',
      '.....s.sgs.s....',
      '......sgsgs.....',
      '......ttttt.....',
      '......sgsgs.....',
      '.....sg.s.gs....',
      '....sg..g..gs...',
      '....s...s...s...',
      '................',
      '................',
    ],
  },
  // A mandrake root with a grumpy little face under its leaves.
  mandrake: {
    palette: { l: LEAF.light, L: LEAF.mid, R: ROOT.light, r: ROOT.mid, k: ROOT.dark, h: ROOT.shine },
    rows: [
      '................',
      '.....l...l......',
      '....lLl.lLl.l...',
      '.....lLLLLlLl...',
      '.......LLLL.....',
      '......rRRRRr....',
      '.....rhRRRRRr...',
      '.....rRkRRkRr...',
      '.....rRRRRRRr...',
      '......rRkkRr....',
      '......rRRRRr....',
      '.....rr.RR.rr...',
      '....r...rr...r..',
      '........r.......',
      '................',
      '................',
    ],
  },
  // A sprig of sage leaves on a woody stem.
  sage: {
    palette: { h: LEAF.shine, l: LEAF.light, L: LEAF.mid, d: LEAF.dark, s: WOOD.light },
    rows: [
      '................',
      '.......hh.......',
      '......hLLd......',
      '......lLLd......',
      '..hh..lLLd..hh..',
      '.hLLd.lLLd.lLLd.',
      '.lLLLdlLLdlLLLd.',
      '..lLLLdLLdLLLd..',
      '...ldLLdLdLdd...',
      '.....ddsdd......',
      '.......s........',
      '.......s........',
      '.......s........',
      '......s.........',
      '................',
      '................',
    ],
  },
  // A glowing red crystal of ember salt.
  ember: {
    palette: { w: RED.shine, l: RED.light, R: RED.mid, r: RED.dark },
    rows: [
      '................',
      '................',
      '.......ww.......',
      '......wlRR......',
      '.....wlRRRR.....',
      '....wlRRRRRR....',
      '...lwlRRRRRRr...',
      '..llwRRRRRRRrr..',
      '..lRRRRRRRRrrr..',
      '...RRRRRRRRrr...',
      '....RRRRRRrr....',
      '.....RRRRrr.....',
      '......RRrr......',
      '.......rr.......',
      '................',
      '................',
    ],
  },
  // A violet moonpetal flower with a golden heart.
  moonpetal: {
    palette: { w: VIOLET.shine, l: VIOLET.light, V: VIOLET.mid, v: VIOLET.dark, y: GOLD.light, g: GOLD.mid, L: LEAF.mid },
    rows: [
      '................',
      '......lll.......',
      '.....lwVVv......',
      '..ll.lVVVv.ll...',
      '.lwVVlVVVvlVVv..',
      '.lVVVVvyyvVVVv..',
      '..vVVVygyyVVv...',
      '..lVVVvyyvVVVl..',
      '.lVVVVlvvlVVVVv.',
      '.vVVVv.lVv.vVVv.',
      '..vvv..lVv..vvv.',
      '.......vv.......',
      '........L.......',
      '.......L........',
      '................',
      '................',
    ],
  },
};

// The two flask shapes, filled with each potion's colour.
const ROUND_FLASK = [
  '................',
  '.......kk.......',
  '.......kk.......',
  '.......gg.......',
  '.......gg.......',
  '......gRRg......',
  '.....RlRRRR.....',
  '....RwlRRRRR....',
  '....RwRRRRRR....',
  '....RlRRRRrR....',
  '....RRRRRrrR....',
  '.....RrrrrR.....',
  '......rrrr......',
  '................',
  '................',
  '................',
];
const TALL_FLASK = [
  '................',
  '.......kk.......',
  '......gkkg......',
  '.......gg.......',
  '.......gg.......',
  '.....gRRRRg.....',
  '.....RwRRRR.....',
  '.....RwRRRR.....',
  '.....LLLLLL.....',
  '.....LLmmLL.....',
  '.....LmLLLL.....',
  '.....LLmmLL.....',
  '.....RRRRrR.....',
  '.....Rrrrrr.....',
  '................',
  '................',
];

const flask = (rows: string[], liquid: { dark: number; mid: number; light: number; shine: number }) => ({
  rows,
  palette: { k: WOOD.light, g: GLASS.mid, R: liquid.mid, r: liquid.dark, l: liquid.light, w: liquid.shine, L: CLOTH.light, m: liquid.dark },
});

const POTION_ART: Record<PotionId, { rows: string[]; palette: Palette }> = {
  healingDraught: flask(ROUND_FLASK, RED),
  sleepingTonic: flask(TALL_FLASK, VIOLET),
  mandrakeTincture: flask(ROUND_FLASK, BREW),
  goldenElixir: flask(TALL_FLASK, GOLD),
  moonlitPhilter: flask(ROUND_FLASK, BLUE),
};

const COIN = [
  '............',
  '....gggg....',
  '...gGGGGg...',
  '..gGhhGGGd..',
  '..gGhGGGGd..',
  '..gGGGGGGd..',
  '..gGGGGGGd..',
  '..gGGGGGgd..',
  '..gGGGGggd..',
  '...dGGggd...',
  '....dddd....',
  '............',
];

export function bakeItems(scene: Phaser.Scene) {
  for (const [kind, { rows, palette }] of Object.entries(KIND_ART) as [Kind, (typeof KIND_ART)[Kind]][]) {
    new PixelCanvas(16, 16).grid(0, 0, rows, palette).outline(INK).bake(scene, kindTexture(kind));
  }
  for (const [potion, { rows, palette }] of Object.entries(POTION_ART) as [PotionId, (typeof POTION_ART)[PotionId]][]) {
    new PixelCanvas(16, 16).grid(0, 0, rows, palette).outline(INK).bake(scene, potionTexture(potion));
  }
  new PixelCanvas(12, 12)
    .grid(0, 0, COIN, { g: GOLD.mid, G: GOLD.light, h: GOLD.shine, d: GOLD.dark })
    .outline(INK)
    .bake(scene, 'coin');
}
