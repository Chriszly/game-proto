import Phaser from 'phaser';
import type { ItemId } from '../game/items';
import { CLOTH, GLASS, GOLD, INK, LEAF, RED, ROOT, VIOLET, WOOD } from './palette';
import { PixelCanvas, type Palette } from './pixelArt';

// Item icons, 16x16 with an ink outline added when baking, plus the coin.

export const itemTexture = (id: ItemId) => `item-${id}`;

const ITEM_ART: Record<ItemId, { rows: string[]; palette: Palette }> = {
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
  // A cream flour sack with a wheat mark, tied at the neck.
  flour: {
    palette: { C: CLOTH.light, c: CLOTH.mid, d: CLOTH.dark, t: WOOD.mid, g: GOLD.mid },
    rows: [
      '................',
      '......c..c......',
      '.......cc.......',
      '.......tt.......',
      '......cCCc......',
      '.....cCCCCc.....',
      '....cCCCgCCc....',
      '...cCCCgCgCCc...',
      '...cCCCCgCCCc...',
      '...cCCCCgCCCc...',
      '...cCCCCCCCCd...',
      '...ccCCCCCCdd...',
      '....ccddddddd...',
      '................',
      '................',
      '................',
    ],
  },
  // A drawstring pouch of dark mandrake seeds, a few spilled beside it.
  mandrakeSeeds: {
    palette: { P: ROOT.mid, p: ROOT.dark, h: ROOT.light, t: CLOTH.mid, s: 0x3a2416 },
    rows: [
      '................',
      '................',
      '.......t..t.....',
      '......pPPPp.....',
      '.......ppp......',
      '......pPPPp.....',
      '.....pPhPPPp....',
      '....pPhPPPPPp...',
      '....pPPPPPPPp...',
      '....pPPPPPPPp...',
      '.....pPPPPPp....',
      '......ppppp.s...',
      '...........s.s..',
      '................',
      '................',
      '................',
    ],
  },
  // A round red flask with a cork.
  healingDraught: {
    palette: { k: WOOD.light, g: GLASS.mid, R: RED.mid, r: RED.dark, w: RED.shine, l: RED.light },
    rows: [
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
    ],
  },
  // A tall violet bottle with a moon on its label.
  sleepingTonic: {
    palette: { k: WOOD.light, g: GLASS.mid, V: VIOLET.mid, v: VIOLET.dark, w: VIOLET.shine, L: CLOTH.light, m: VIOLET.dark },
    rows: [
      '................',
      '.......kk.......',
      '......gkkg......',
      '.......gg.......',
      '.......gg.......',
      '.....gVVVVg.....',
      '.....VwVVVV.....',
      '.....VwVVVV.....',
      '.....LLLLLL.....',
      '.....LLmmLL.....',
      '.....LmLLLL.....',
      '.....LLmmLL.....',
      '.....VVVVvV.....',
      '.....Vvvvvv.....',
      '................',
      '................',
    ],
  },
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
  for (const [id, { rows, palette }] of Object.entries(ITEM_ART) as [ItemId, (typeof ITEM_ART)[ItemId]][]) {
    new PixelCanvas(16, 16).grid(0, 0, rows, palette).outline(INK).bake(scene, itemTexture(id));
  }
  new PixelCanvas(12, 12)
    .grid(0, 0, COIN, { g: GOLD.mid, G: GOLD.light, h: GOLD.shine, d: GOLD.dark })
    .outline(INK)
    .bake(scene, 'coin');
}
