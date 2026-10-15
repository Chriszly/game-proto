import Phaser from 'phaser';
import type { EnemyKind } from '../game/enemies';
import { BLUE, BONE, GOLD, GREEN, INK, IRON, PURPLE, RED, SKIN, WOOD } from './palette';
import { addTexture, bakePainted, paint, sketch } from './paint';
import { type Palette } from './pixelArt';

// The hero and the foes, side on, in the painterly style. The knight and the slime are drawn as
// shapes; the other foes are character grids ('.' = clear) outlined in ink. Every one is then
// repainted with brush strokes. The hero faces right, towards the foes; the foes face left.

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
  // An undead knight in dark plate with glowing eyes and a greatsword.
  graveKnight: [
    '......tttt.....',
    '.....tTTTTt....',
    '....tTTTTTTt...',
    '....tGtTGtTt...',
    '....tTTTTTTt...',
    '.i...tTTTTt....',
    '.Ii..xxxxxx....',
    '.Ii.tTIITTTt...',
    '.Ii.tTTIITTTt..',
    '.Ii.tTTTTTTTt..',
    'gggt.tTTTTTt...',
    '.w...txxxxxt...',
    '.w...tTTtTTt...',
    '.....tTt.tTt...',
    '.....tTt.tTt...',
    '.....tTt.tTt...',
    '....ttTt.tTtt..',
  ],
  // A hunched witch with green skin, a tall purple hat and a crooked staff.
  bogWitch: [
    '.......p.......',
    '......pp.......',
    '.....pPp.......',
    '....pPPPp......',
    '...pppppppp....',
    '.....lLLl......',
    '.w...LeLeL.....',
    '.W...lLLLl.....',
    '.w....lkl......',
    '.w..pPPPPPp....',
    '.wlLPPqPPPPp...',
    '.w..pPqPPPPp...',
    '.w..pPPPPPPpp..',
    '.w.pPPPPPPPPp..',
    '.w.pPPPPPPPPPp.',
    '.w.ppppppppppp.',
  ],
  // A grey-green ghoul, hunched, with long claws.
  ghoul: [
    '....kkkk.....',
    '...kllllk....',
    '..kllllllk...',
    '..klRlllRl...',
    '..kllllllk...',
    '...klxxlk....',
    '....klllk....',
    '..kllllllk...',
    '.kllkllllkl..',
    'cklk.kllk.klc',
    'c.c..kllk..c.',
    '.....kllk....',
    '....kl..lk...',
    '....kl..lk...',
    '...kkl..lkk..',
  ],
  // A hooded wraith, pale blue and fading out below.
  wraith: [
    '.....nnnn.....',
    '....nbbbbn....',
    '...nbbbbbbn...',
    '...nbeBBebn...',
    '...nbeBBebn...',
    '...nbbbbbbn...',
    '..nbbBbbBbbn..',
    '.cnbbBbbBbbnc.',
    'c.nbbBbbBbbn.c',
    '..nbbbbbbbbn..',
    '..nbBbbbbBbn..',
    '...nb.bb.bn...',
    '...n..b...n...',
    '......n.......',
  ],
  // A big purple spider, low and wide.
  spider: [
    '...............',
    '....pppp.......',
    '..ppPPPPpp.....',
    '.pPPqPPPPPp....',
    '.pPPPPPPPPPp...',
    '.pPPPPPPPPPppp.',
    'p.pPPPPPPPpRRRp',
    'p.p.ppppp.pRpRp',
    '.p.p.p.p.p.ppp.',
    '.p.p.p..p.p.p..',
    'p..p..p..p..p..',
  ],
  // A mummy wrapped in old bandages.
  mummy: [
    '.....oooo....',
    '....oOcOOo...',
    '....OcOcOO...',
    '....OeOOeO...',
    '....OOcOOO...',
    '.....OOcO....',
    '..OOcOOOcOO..',
    '.OcOOcOOcOcO.',
    '.Oc.OOcOOO.cO',
    '.O..OcOOcO..O',
    '....OOOcOO...',
    '....OcO.OO...',
    '....OO..OcO..',
    '....cO..OO...',
    '...OOO..OOO..',
  ],
  // A stone gargoyle with horns and folded wings.
  gargoyle: [
    '.T..........T....',
    '.TT........TT....',
    '..T.tttttt.T.....',
    '...tTTTTTTt......',
    '...tTyTTyTt......',
    'tt.tTTTTTTt..tt..',
    'tTt.tTxxTt..tTTt.',
    'tTTt.tttt..tTTTt.',
    'tTTTttTTTttTTTTt.',
    '.tTTtTTTTTtTTTt..',
    '..tttTTTTTttTt...',
    '....tTTTTTt.t....',
    '....tTTtTTt......',
    '...tTTt.tTTt.....',
    '...tTt...tTt.....',
    '..ttTt...tTtt....',
  ],
  // The Hollow Queen: a tall crowned ghost queen in purple with a staff of green fire.
  hollowQueen: [
    '...h...............',
    '..hLh..g.g.g.......',
    '..LhL..gGgGg.......',
    '...L..OcccccO......',
    '...w..cqqcqqc......',
    '...w..ccccccc......',
    '...w...cOcOc.......',
    '...w..ppPPPpp......',
    '...wppPPqPqPPpp....',
    '...wPPPPqPqPPPPp...',
    '..cwpPPPqPqPPPPp...',
    '...w.pPPqPqPPPPp...',
    '...w.pPPPPPPPPPp...',
    '...w.pPPqPPqPPPPp..',
    '...wpPPPqPPqPPPPp..',
    '...wpPPPPPPPPPPPPp.',
    '...pPPPqPPPqPPPPPp.',
    '..pPPPPqPPPqPPPPPPp',
    '..ppppppppppppppppp',
  ],
};

export function bakeCharacters(scene: Phaser.Scene) {
  addTexture(scene, 'hero', paintedFigure(KNIGHT, 1));
  addTexture(scene, 'hero-token', paintedFigure(KNIGHT, 0.5));
  addTexture(scene, 'foe-slime', paintedFigure(SLIME, 1));
  for (const [kind, rows] of Object.entries(FOES)) {
    if (kind !== 'slime') bakePainted(scene, `foe-${kind}`, rows, PALETTE, CHAR_SCALE, INK, 3.5, true);
  }
}

export const foeTexture = (kind: EnemyKind) => `foe-${kind}`;

/** A figure drawn as shapes at twice its size, around its feet at (`fx`, `fy`), `w` x `h` at its own size. */
interface Figure {
  w: number;
  h: number;
  fx: number;
  fy: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

function paintedFigure(f: Figure, scale: number) {
  const { canvas, ctx } = sketch(f.w * scale, f.h * scale);
  ctx.translate((f.w / 2) * scale, f.h * scale - 2 * scale);
  ctx.scale(0.5 * scale, 0.5 * scale);
  ctx.translate(-f.fx, -f.fy);
  f.draw(ctx);
  return paint(canvas, { sizes: [3 * scale, 1.6 * scale, Math.max(0.7, 0.9 * scale)], seed: Math.round(f.fx), cutout: true, threshold: 28 });
}

const shapes = (ctx: CanvasRenderingContext2D) => ({
  poly(pts: number[][], fill: string) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  },
  ell(x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  },
  rrect(x: number, y: number, w: number, h: number, r: number, fill: string) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  },
});

/** A knight in mail and a blue tabard, a red cape, a raised sword and a round blue shield with a gold boss. */
const KNIGHT: Figure = {
  w: 84,
  h: 130,
  fx: 462,
  fy: 656,
  draw(ctx) {
    const { poly, ell, rrect } = shapes(ctx);
    poly([[432, 540], [492, 540], [508, 640], [416, 640]], '#6e2b38');
    poly([[432, 540], [462, 540], [452, 640], [416, 640]], '#5a2230');
    for (const lx of [444, 476]) {
      rrect(lx - 11, 600, 22, 46, 6, '#8b92a3');
      rrect(lx - 7, 604, 6, 36, 3, '#c3c9d6');
      rrect(lx - 14, 640, 30, 16, 5, '#4a3222');
    }
    rrect(428, 540, 68, 70, 14, '#7d8494');
    poly([[434, 548], [490, 548], [500, 612], [424, 612]], '#2f5f9e');
    poly([[434, 548], [462, 548], [462, 612], [424, 612]], '#3a71b4');
    rrect(428, 586, 70, 10, 3, '#5a3a22');
    ell(462, 591, 7, 6, '#d9b24a');
    poly([[486, 552], [502, 548], [512, 520], [498, 516]], '#7d8494');
    ell(504, 516, 9, 9, '#5a3a22');
    rrect(486, 506, 38, 8, 3, '#d9b24a');
    poly([[499, 506], [509, 506], [507, 426], [504, 414], [501, 426]], '#c9cfdb');
    poly([[504, 506], [509, 506], [507, 426], [504, 414]], '#eef2f8');
    ell(504, 526, 6, 6, '#d9b24a');
    ell(462, 522, 30, 32, '#9aa2b2');
    ell(452, 512, 16, 18, '#c6ccd8');
    rrect(440, 520, 46, 7, 3, '#15121a');
    poly([[460, 492], [470, 480], [490, 478], [474, 494]], '#2f5f9e');
    ell(428, 586, 38, 40, '#c9a24a');
    ell(428, 586, 31, 33, '#3a67a8');
    ell(420, 576, 16, 18, '#4f7fc0');
    ell(428, 586, 10, 10, '#e2bd5c');
    ell(425, 583, 4, 4, '#fff1c2');
  },
};

/** A glossy green slime with a highlight, two dark eyes and a small mouth. */
const SLIME: Figure = {
  w: 100,
  h: 64,
  fx: 1402,
  fy: 664,
  draw(ctx) {
    const { ell, rrect } = shapes(ctx);
    ctx.beginPath();
    ctx.moveTo(1332, 656);
    ctx.bezierCurveTo(1318, 600, 1360, 556, 1402, 556);
    ctx.bezierCurveTo(1446, 556, 1490, 600, 1472, 656);
    ctx.bezierCurveTo(1440, 668, 1366, 668, 1332, 656);
    const g = ctx.createRadialGradient(1380, 590, 10, 1402, 620, 90);
    g.addColorStop(0, '#a8ef7c');
    g.addColorStop(0.55, '#5cbf48');
    g.addColorStop(1, '#2c7a2e');
    ctx.fillStyle = g;
    ctx.fill();
    ell(1372, 584, 16, 9, 'rgba(255,255,255,0.75)', -0.5);
    ell(1386, 614, 7, 10, '#1a2a18');
    ell(1420, 614, 7, 10, '#1a2a18');
    ell(1384, 610, 2.5, 3, '#ffffff');
    ell(1418, 610, 2.5, 3, '#ffffff');
    rrect(1393, 634, 18, 4, 2, '#1f3a1c');
    ell(1350, 660, 10, 6, '#4aa83e');
  },
};
