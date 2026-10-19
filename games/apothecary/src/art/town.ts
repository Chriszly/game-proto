import Phaser from 'phaser';
import { SHOPS, isFineGood, type GoodId, type Held, type ShopId } from '../game/town';
import { counterLayout, shopFence, shopWorld, yardGround } from '../scenes/shopLayout';
import { plantTexture } from './garden';
import { itemTexture } from './items';
import { WASH, both, chance, ellPts, hatch, ink, paint, paper, rectPts, rr, shadow, sparkle, wash, type Ctx, type Pt } from './paint';

// The town's art, in the same ink and watercolour as the apothecary's: the town shops' goods, the
// bakery's mill, oven and beehives, each shop yard's painted ground, and the houses on the town map.

/** A good's icon: the apothecary's own for wheat and flour, the town's for the rest. 16x16 as shown. */
export const goodTexture = (held: Held): string => {
  if (isFineGood(held)) return `good-${held}`;
  return held === 'wheat' || held === 'flour' ? itemTexture(held) : `good-${held}`;
};
/** A beehive bed's skep, from empty to full of honey. */
export const hiveTexture = (stage: number) => `hive-${stage}`;
export const yardTexture = (shop: ShopId) => `yard-${shop}`;
/** What grows on a town garden's bed at a stage: a skep for honeycomb, the apothecary's wheat, or flax. */
export const bedTexture = (good: GoodId, stage: number) =>
  good === 'honeycomb' ? hiveTexture(stage) : good === 'wheat' ? plantTexture('wheat', stage) : `bed-${good}-${stage}`;
/** A house on the town map, for a shop or the apothecary. */
export const lotTexture = (lot: ShopId | 'apothecary') => `lot-${lot}`;

/** A honeycomb: a slab of gold hexagon cells. */
function drawHoneycomb(c: Ctx) {
  const cell = (x: number, y: number, r: number): Pt[] => Array.from({ length: 6 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 3), y + r * Math.sin((i * Math.PI) / 3)] as Pt);
  const cells: Pt[] = [[5, 6], [10.2, 3], [10.2, 9], [5, 12], [15.4, 6], [15.4, 12]];
  for (const [x, y] of cells) both(c, cell(x - 2.4, y - 0.5, 3), '#e6ac3a', { layers: 2, edge: 0 }, { w: 0.7 });
  wash(c, ellPts(8, 8.5, 2, 1.5, 10), '#f6d27a', { layers: 1, edge: 0, alpha: 0.7 });
}

/** A round loaf with three scores across its crust. */
function drawBread(c: Ctx) {
  shadow(c, 8.5, 13, 6.5, 1.6, 0.25);
  both(c, ellPts(8, 9, 7, 4.8, 22), '#c0803e', { layers: 2, bloom: 1, cx: 6, cy: 7 }, { w: 0.9 });
  for (const x of [5, 8, 11]) ink(c, [[x - 1.2, 7.6], [x + 1.4, 6.2]], { closed: false, w: 0.7, col: '#6e4426' });
  ink(c, [[3, 11.5], [13, 11.5]], { closed: false, w: 0.5, alpha: 0.5 });
}

/** A round honey cake with honey running down its sides. */
function drawHoneyCake(c: Ctx) {
  shadow(c, 8.5, 14, 6.5, 1.5, 0.25);
  both(c, rectPts(2, 7, 12, 6.5, 2), '#d49a52', { layers: 2 }, { w: 0.9 });
  both(c, ellPts(8, 7, 6, 2.6, 18), '#e8b860', { layers: 2 }, { w: 0.8 });
  for (const x of [4.5, 8, 11.5]) both(c, [[x - 1, 7.5], [x + 1, 7.5], [x + 0.5, 10.5], [x - 0.5, 10.5]], '#f0b830', { layers: 1, edge: 0 }, { w: 0.4 });
}

/** A straw skep on a little stand, its door dark; ripening fills its comb with honey and brings the bees. 40x44 as shown. */
function drawHive(c: Ctx, stage: number) {
  shadow(c, 21, 41, 15, 3, 0.2);
  both(c, rectPts(8, 36, 24, 4, 1), WASH.woodDark, { layers: 2 }, { w: 0.9 });
  const dome: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    dome.push([20 + Math.cos(a) * 14, 36 + Math.sin(a) * (12 + stage * 4)]);
  }
  both(c, dome, stage === 2 ? '#d8a848' : '#c8a060', { layers: 3, bloom: 1, cx: 16, cy: 26 }, { w: 1.1 });
  // The coils of straw.
  for (let k = 1; k < 4; k++) {
    const y = 36 - k * (3 + stage);
    const half = Math.sqrt(Math.max(0, 1 - ((36 - y) / (12 + stage * 4)) ** 2)) * 14;
    ink(c, [[20 - half, y], [20 + half, y]], { closed: false, w: 0.6, alpha: 0.6 });
  }
  hatch(c, dome.map(([x, y]) => [x + 6, y] as Pt), { gap: 2.2, alpha: 0.25, w: 0.5 });
  both(c, ellPts(20, 33.5, 3, 2.4, 12), '#3a2614', { layers: 2, edge: 0 }, { w: 0.6 });
  if (stage === 2) both(c, [[25, 30], [28, 30], [27.5, 35], [25.5, 35]], '#f0b830', { layers: 1, edge: 0 }, { w: 0.5 });
  // Bees: a dark body with pale wings, more as the comb fills.
  for (let b = 0; b < stage * 2; b++) {
    const x = rr(6, 34), y = rr(6, 22);
    both(c, ellPts(x, y, 1.6, 1.1, 8), '#e8b830', { layers: 1, edge: 0 }, { w: 0.5 });
    wash(c, ellPts(x - 0.6, y - 1.5, 1.2, 0.9, 8), '#f4f0e0', { layers: 1, edge: 0, alpha: 0.8 });
  }
}

/** Flax: thin stalks that grow tall and open sky-blue flowers when ripe. 48x44 as shown. */
function drawFlax(c: Ctx, stage: number) {
  const height = [8, 24, 36][stage];
  for (let i = 0; i < 7; i++) {
    const x = 4 + i * 6.6 + rr(-1, 1);
    const top = 43 - height + (i % 2) * 3;
    const lean = rr(-1.5, 1.5);
    ink(c, [[x, 43], [x + lean * 0.5, (43 + top) / 2], [x + lean, top]], { closed: false, w: 1.2, col: '#6f9a4a' });
    if (stage > 0) both(c, [[x, top + 10], [x - 3.5, top + 7], [x - 0.5, top + 8.5]], '#7fae52', { layers: 1, edge: 0 }, { w: 0.4 });
    if (stage === 2) {
      both(c, ellPts(x + lean, top - 1, 2.6, 2.2, 10), '#7a8fc8', { layers: 2, edge: 0 }, { w: 0.6 });
      wash(c, ellPts(x + lean, top - 1, 0.8, 0.8, 6), '#f0e6a0', { layers: 1, edge: 0 });
    }
  }
}

/** A cake of yellow beeswax. */
function drawWax(c: Ctx) {
  shadow(c, 8.5, 13.5, 6.5, 1.5, 0.25);
  both(c, rectPts(2.5, 6, 11, 7, 1.5), '#e0c45a', { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.9 });
  both(c, [[2.5, 6], [5.5, 3.5], [16, 3.5], [13.5, 6]], '#f0d878', { layers: 1 }, { w: 0.8 });
}

/** A coil of spun flax wick. */
function drawWick(c: Ctx) {
  shadow(c, 8.5, 13.5, 6, 1.4, 0.25);
  for (const r of [5.5, 4, 2.5]) ink(c, ellPts(8, 9, r, r * 0.7, 18), { w: 1.3, col: '#d8cfb2' });
  for (const r of [5.5, 4, 2.5]) ink(c, ellPts(8, 9, r, r * 0.7, 18), { w: 0.4, alpha: 0.7 });
  ink(c, [[13, 9], [15, 4]], { closed: false, w: 1, col: '#d8cfb2' });
}

/** A short candle on a brass dish, lit: plain wax, or another colour. */
function drawCandle(c: Ctx, wax = '#f0e2a8') {
  shadow(c, 8.5, 14, 6, 1.4, 0.25);
  both(c, ellPts(8, 13, 6, 1.8, 14), WASH.brass, { layers: 1 }, { w: 0.7 });
  both(c, rectPts(5.5, 5.5, 5, 7.5, 1), wax, { layers: 2 }, { w: 0.8 });
  wash(c, [[8, 1], [9.6, 4], [8, 5.5], [6.4, 4]], WASH.flameLight, { layers: 2, edge: 0 });
}

/** A tall, thin taper, lit. */
function drawTaper(c: Ctx) {
  shadow(c, 8.5, 14.5, 4, 1.2, 0.25);
  both(c, rectPts(6.6, 4, 2.8, 10.5, 0.8), '#f4e8c0', { layers: 2 }, { w: 0.7 });
  wash(c, [[8, 0], [9.3, 2.4], [8, 3.8], [6.7, 2.4]], WASH.flameLight, { layers: 2, edge: 0 });
}

/** A wax press: a timber frame with a big screw over a tub, and wax dripping into a pan. 88x60 as shown. */
function drawPress(c: Ctx) {
  shadow(c, 46, 55, 40, 5, 0.18);
  for (const lx of [14, 68]) both(c, rectPts(lx, 8, 7, 46, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(10, 4, 66, 7, 1.5), WASH.wood, { layers: 2 }, { w: 1.1 });
  both(c, rectPts(41, 8, 5, 20, 1), WASH.iron, { layers: 1 }, { w: 0.8 });
  for (let y = 10; y < 28; y += 3) ink(c, [[40, y], [47, y + 1.5]], { closed: false, w: 0.5, col: WASH.ironRim });
  ink(c, [[30, 12], [57, 12]], { closed: false, w: 2.2, col: WASH.woodDeep });
  both(c, rectPts(26, 28, 36, 20, 3), '#b07a46', { layers: 2, bloom: 1, cx: 36, cy: 34 }, { w: 1.1 });
  for (const y of [33, 42]) ink(c, [[26, y], [62, y]], { closed: false, w: 1, col: WASH.iron });
  both(c, ellPts(44, 28, 18, 3, 18), '#e0a83a', { layers: 2, edge: 0 }, { w: 0.6 });
  both(c, ellPts(72, 53, 10, 3, 14), WASH.ironRim, { layers: 1 }, { w: 0.8 });
  wash(c, ellPts(72, 52, 7, 1.8, 12), '#e8d070', { layers: 2, edge: 0 });
  ink(c, [[62, 44], [68, 50]], { closed: false, w: 1.2, col: '#e8d070' });
}

/** A spinning wheel: a spoked wheel on a slanted bench, with a spindle of flax. 80x64 as shown. */
function drawWheel(c: Ctx) {
  shadow(c, 40, 60, 34, 4, 0.18);
  both(c, [[8, 50], [72, 40], [74, 46], [10, 56]], WASH.wood, { layers: 2 }, { w: 1 });
  for (const [x, y] of [[12, 54], [66, 44], [30, 51]]) ink(c, [[x, y], [x - 2, y + 7]], { closed: false, w: 2, col: WASH.woodDark });
  ink(c, [[30, 48], [30, 36]], { closed: false, w: 2, col: WASH.woodDark });
  ink(c, ellPts(30, 26, 20, 20, 30), { w: 2.4, col: WASH.woodDark });
  ink(c, ellPts(30, 26, 20, 20, 30), { w: 0.7 });
  for (let i = 0; i < 8; i++) ink(c, [[30, 26], [30 + Math.cos((i * Math.PI) / 4) * 19, 26 + Math.sin((i * Math.PI) / 4) * 19]], { closed: false, w: 0.7, col: WASH.woodDeep });
  both(c, ellPts(30, 26, 3, 3, 10), WASH.woodDeep, { layers: 1 }, { w: 0.6 });
  ink(c, [[58, 42], [62, 22]], { closed: false, w: 1.6, col: WASH.woodDark });
  both(c, ellPts(62, 20, 5, 8, 14), '#c8c0a0', { layers: 2 }, { w: 0.8 });
  ink(c, [[30, 6], [62, 14]], { closed: false, w: 0.5, alpha: 0.6 });
}

/** A dipping vat: a copper pot of wax over a little fire, with candles hung on a rack to dry. 84x60 as shown. */
function drawVat(c: Ctx) {
  shadow(c, 42, 56, 38, 5, 0.18);
  both(c, rectPts(52, 8, 4, 46, 1), WASH.woodDark, { layers: 1 }, { w: 0.8 });
  both(c, rectPts(78, 8, 4, 46, 1), WASH.woodDark, { layers: 1 }, { w: 0.8 });
  ink(c, [[52, 10], [82, 10]], { closed: false, w: 2, col: WASH.woodDeep });
  for (const x of [58, 64, 70, 76]) {
    ink(c, [[x, 10], [x, 14]], { closed: false, w: 0.5 });
    both(c, rectPts(x - 1.5, 14, 3, 18, 0.8), '#f0e2a8', { layers: 1 }, { w: 0.6 });
  }
  for (const [dx, h, col] of [[-6, 7, WASH.flame], [2, 9, WASH.flameLight], [-2, 5, WASH.flameCore]] as [number, number, string][]) {
    wash(c, [[26 + dx - 4, 56], [26 + dx, 56 - h], [26 + dx + 4, 56]], col, { layers: 2, edge: 0 });
  }
  both(c, [[6, 22], [46, 22], [42, 48], [10, 48]], '#b8683a', { layers: 3, bloom: 1, cx: 18, cy: 30 }, { w: 1.2 });
  hatch(c, [[30, 22], [46, 22], [42, 48], [30, 48]], { gap: 2.4, alpha: 0.25, w: 0.5 });
  both(c, ellPts(26, 22, 20, 4, 20), '#e8d070', { layers: 2 }, { w: 1 });
  ink(c, [[18, 22], [22, 4]], { closed: false, w: 0.6 });
  both(c, rectPts(20.5, 4, 3, 12, 0.6), '#f0e2a8', { layers: 1 }, { w: 0.5 });
}

/** Woad: a clump of broad blue-green leaves, crowned with yellow flowers when ripe. 48x44 as shown. */
function drawWoad(c: Ctx, stage: number) {
  const height = [8, 20, 30][stage];
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 10.5 + rr(-1, 1);
    const top = 43 - height + (i % 2) * 3;
    both(c, [[x, 43], [x - 5, top + height * 0.5], [x, top], [x + 5, top + height * 0.5]], '#5f8a5a', { layers: 2, edge: 0 }, { w: 0.6 });
    ink(c, [[x, 43], [x, top + 2]], { closed: false, w: 0.4, alpha: 0.6 });
    if (stage === 2) for (const [dx, dy] of [[-2, -2], [1.5, -3.5], [0, -1]]) both(c, ellPts(x + dx, top + dy, 1.6, 1.4, 8), '#e8cc3a', { layers: 1, edge: 0 }, { w: 0.4 });
  }
}

/** A folded length of undyed linen. */
function drawLinen(c: Ctx) {
  shadow(c, 8.5, 14, 6.5, 1.4, 0.25);
  both(c, rectPts(2, 5, 12, 8.5, 1), '#e6dcc0', { layers: 2 }, { w: 0.8 });
  for (const y of [7.8, 10.6]) ink(c, [[2.5, y], [13.5, y]], { closed: false, w: 0.5, alpha: 0.6 });
}

/** A pot of deep blue dye, or of another colour. */
function drawDye(c: Ctx, dye = '#3a5aa8') {
  shadow(c, 8.5, 14.5, 5.5, 1.4, 0.25);
  both(c, [[3.5, 6], [12.5, 6], [11.5, 14], [4.5, 14]], '#9a7a5a', { layers: 2 }, { w: 0.8 });
  both(c, ellPts(8, 6, 4.5, 1.6, 12), dye, { layers: 2, edge: 0 }, { w: 0.6 });
}

/** A bolt of blue cloth, or of another colour. */
function drawCloth(c: Ctx, cloth = '#4a6ab8', end = '#34508e') {
  shadow(c, 8.5, 14, 7, 1.4, 0.25);
  both(c, rectPts(2, 6, 12, 7.5, 2), cloth, { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.8 });
  both(c, ellPts(14, 9.8, 1.8, 3.8, 10), end, { layers: 1 }, { w: 0.6 });
}

/** A hooded blue cloak. */
function drawCloak(c: Ctx) {
  shadow(c, 8.5, 15, 6, 1.2, 0.25);
  both(c, [[8, 1.5], [11, 3.5], [11.5, 6], [14, 14.5], [2, 14.5], [4.5, 6], [5, 3.5]], '#34508e', { layers: 2, bloom: 1, cx: 7, cy: 8 }, { w: 0.8 });
  ink(c, [[8, 6.5], [8, 14]], { closed: false, w: 0.5, alpha: 0.6 });
  both(c, ellPts(8, 6.6, 1, 1, 8), WASH.brass, { layers: 1, edge: 0 }, { w: 0.4 });
}

/** A loom: a timber frame with the warp strung down it and linen wound on its front beam. 84x64 as shown. */
function drawLoom(c: Ctx) {
  shadow(c, 42, 60, 38, 4, 0.18);
  for (const lx of [8, 72]) both(c, rectPts(lx, 6, 6, 52, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(6, 6, 72, 6, 1.5), WASH.wood, { layers: 2 }, { w: 1.1 });
  for (let x = 17; x < 70; x += 3) ink(c, [[x, 12], [x, 40]], { closed: false, w: 0.45, col: '#e6dcc0' });
  both(c, rectPts(14, 22, 58, 4, 1), WASH.woodDeep, { layers: 1 }, { w: 0.8 });
  both(c, rectPts(14, 30, 58, 10, 1), '#e6dcc0', { layers: 2 }, { w: 0.8 });
  both(c, rectPts(10, 40, 66, 6, 2), WASH.wood, { layers: 2 }, { w: 1 });
  ink(c, [[14, 52], [72, 52]], { closed: false, w: 1.4, col: WASH.woodDeep });
}

/** A grinding stone for woad leaves: a stone wheel rolling in a round trough, pushed by a beam. 84x60 as shown. */
function drawGrinder(c: Ctx) {
  shadow(c, 42, 55, 38, 5, 0.18);
  both(c, ellPts(42, 44, 34, 10, 30), WASH.stoneDark, { layers: 3 }, { w: 1.2 });
  both(c, ellPts(42, 42, 26, 7, 30), '#4f6a4a', { layers: 2, edge: 0 }, { w: 0.6 });
  both(c, ellPts(30, 30, 9, 14, 24), WASH.stone, { layers: 3, bloom: 1, cx: 28, cy: 26 }, { w: 1.2 });
  both(c, ellPts(30, 30, 3, 5, 12), '#5a6066', { layers: 1, edge: 0 }, { w: 0.6 });
  ink(c, [[30, 30], [80, 18]], { closed: false, w: 3, col: WASH.woodDark });
  ink(c, [[42, 44], [42, 20]], { closed: false, w: 2.4, col: WASH.woodDeep });
}

/** A dye vat: a wide wooden tub of blue dye, steaming, with cloth hung over a pole beside it. 84x60 as shown. */
function drawDyeVat(c: Ctx) {
  shadow(c, 42, 56, 38, 5, 0.18);
  both(c, rectPts(58, 6, 4, 48, 1), WASH.woodDark, { layers: 1 }, { w: 0.8 });
  ink(c, [[56, 8], [82, 8]], { closed: false, w: 2, col: WASH.woodDeep });
  both(c, [[64, 8], [80, 8], [79, 34], [65, 30]], '#4a6ab8', { layers: 2 }, { w: 0.8 });
  both(c, [[4, 22], [52, 22], [48, 52], [8, 52]], '#a0703e', { layers: 3, bloom: 1, cx: 16, cy: 30 }, { w: 1.2 });
  for (const y of [30, 44]) ink(c, [[5, y], [51, y]], { closed: false, w: 1.2, col: WASH.iron });
  both(c, ellPts(28, 22, 24, 5, 22), '#3a5aa8', { layers: 2 }, { w: 1 });
  ink(c, [[24, 22], [36, 2]], { closed: false, w: 1.6, col: WASH.woodDark });
}

/** A coppice bed: hazel shoots from a cut stool, grown into poles ready to cut. 48x44 as shown. */
function drawCoppice(c: Ctx, stage: number) {
  const height = [8, 22, 36][stage];
  both(c, ellPts(24, 41, 12, 3.5, 16), WASH.woodDark, { layers: 2 }, { w: 0.9 });
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 4;
    const tip = x + (i - 2) * 3;
    ink(c, [[x, 40], [tip, 41 - height]], { closed: false, w: stage === 2 ? 2.2 : 1.3, col: '#8a6a40' });
    if (stage > 0) both(c, ellPts(tip, 41 - height + 3, 3.2, 2.2, 10), WASH.leaf, { layers: 1, edge: 0 }, { w: 0.4 });
  }
}

/** An ore pit: a dug hollow in the earth, filling with rust-red stones of ore (or copper's). 48x44 as shown. */
function drawOrePit(c: Ctx, stage: number, stone = ['#8a5a4a', '#7a4e40']) {
  both(c, ellPts(24, 34, 18, 7, 20), '#4a3628', { layers: 2 }, { w: 0.9 });
  const stones: Pt[] = [[17, 33], [24, 31], [31, 33], [20, 28], [28, 28], [24, 25]];
  for (const [x, y] of stones.slice(0, [1, 3, 6][stage])) both(c, ellPts(x, y, 4, 3, 10), chance(0.5) ? stone[0] : stone[1], { layers: 2, bloom: 1, cx: x - 1, cy: y - 1 }, { w: 0.7 });
  ink(c, [[38, 30], [44, 14]], { closed: false, w: 1.6, col: WASH.woodDark });
  both(c, [[42, 12], [48, 15], [45, 17]], WASH.ironRim, { layers: 1 }, { w: 0.6 });
}

function drawOre(c: Ctx, stone = '#8a5a4a', fleck = '#c08a5a') {
  shadow(c, 8.5, 14, 6, 1.4, 0.25);
  both(c, [[2.5, 12], [4, 6], [9, 3.5], [13.5, 7], [13, 12.5]], stone, { layers: 2, bloom: 1, cx: 6, cy: 7 }, { w: 0.8 });
  for (const [x, y] of [[6, 8], [10, 9]]) wash(c, ellPts(x, y, 1, 0.8, 6), fleck, { layers: 1, edge: 0 });
}

function drawTimber(c: Ctx) {
  shadow(c, 8.5, 14, 7, 1.4, 0.25);
  for (const y of [11, 7]) {
    both(c, rectPts(2, y - 2.5, 11, 5, 2), '#9a6a3a', { layers: 2 }, { w: 0.7 });
    both(c, ellPts(13, y, 2, 2.5, 10), '#d8b07a', { layers: 1 }, { w: 0.6 });
  }
}

function drawCharcoal(c: Ctx) {
  shadow(c, 8.5, 14, 6.5, 1.4, 0.25);
  for (const [x, y] of [[5, 11], [10.5, 11.5], [8, 7]]) both(c, rectPts(x - 3, y - 2.2, 6, 4.4, 1.4), '#2e2a2a', { layers: 2 }, { w: 0.6, col: '#151212' });
}

function drawIron(c: Ctx) {
  shadow(c, 8.5, 13.5, 6.5, 1.4, 0.25);
  both(c, [[2, 11], [4.5, 7], [14, 7], [12, 11]], '#6a707a', { layers: 2 }, { w: 0.8 });
  both(c, [[2, 11], [12, 11], [12, 13], [2, 13]], '#4f545c', { layers: 1 }, { w: 0.7 });
}

function drawHorseshoe(c: Ctx) {
  shadow(c, 8.5, 14.5, 5.5, 1.3, 0.25);
  const outer: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * 0.85 + (i / 16) * Math.PI * 1.3;
    outer.push([8 + Math.cos(a) * 6, 8.5 + Math.sin(a) * 6]);
  }
  ink(c, outer, { closed: false, w: 3, col: '#7a808a' });
  ink(c, outer, { closed: false, w: 0.6 });
  for (const [x, y] of [[3.5, 10], [12.5, 10], [5, 4.5], [11, 4.5]]) wash(c, ellPts(x, y, 0.5, 0.5, 6), '#2a2a2a', { layers: 1, edge: 0 });
}

function drawPot(c: Ctx, body: string = WASH.iron, rim: string = WASH.ironRim) {
  shadow(c, 8.5, 14.5, 6.5, 1.4, 0.25);
  both(c, ellPts(8, 9.5, 6.2, 5, 20), body, { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.8 });
  both(c, ellPts(8, 5.5, 5, 1.4, 14), rim, { layers: 1 }, { w: 0.6 });
  ink(c, [[3, 5.5], [3, 3], [13, 3], [13, 5.5]], { closed: false, w: 0.7 });
}

/** A charcoal kiln: a turf-covered mound smouldering, smoke curling from its vent. 84x60 as shown. */
function drawKiln(c: Ctx) {
  shadow(c, 42, 56, 38, 5, 0.18);
  const mound: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    mound.push([42 + Math.cos(a) * 36, 54 + Math.sin(a) * 30]);
  }
  both(c, mound, '#5a4a32', { layers: 3, bloom: 1, cx: 32, cy: 34 }, { w: 1.2 });
  hatch(c, mound.map(([x, y]) => [x + 8, y] as Pt), { gap: 2.4, alpha: 0.25, w: 0.5 });
  for (const [x, y] of [[22, 44], [42, 34], [60, 44]]) both(c, ellPts(x, y, 6, 3, 10), WASH.grassDark, { layers: 1, edge: 0 }, { w: 0.4 });
  wash(c, ellPts(42, 50, 6, 4, 10), WASH.flame, { layers: 2, edge: 0 });
  for (const [x, y, r] of [[44, 20, 5], [48, 12, 6], [44, 4, 5]]) wash(c, ellPts(x, y, r, r * 0.8, 12), '#b8b0a8', { layers: 1, edge: 0, alpha: 0.6 });
}

/** A bloomery: a clay chimney furnace glowing at its foot, a pair of bellows beside it. 84x64 as shown. */
function drawBloomery(c: Ctx) {
  shadow(c, 42, 60, 36, 4, 0.18);
  both(c, [[24, 58], [30, 8], [46, 8], [52, 58]], '#a8704a', { layers: 3, bloom: 1, cx: 34, cy: 30 }, { w: 1.2 });
  hatch(c, [[38, 8], [46, 8], [52, 58], [38, 58]], { gap: 2.4, alpha: 0.25, w: 0.5 });
  both(c, ellPts(38, 8, 8, 2.4, 14), '#3a2614', { layers: 1 }, { w: 0.8 });
  wash(c, rectPts(32, 46, 12, 10, 3), WASH.flame, { layers: 2, edge: 0 });
  wash(c, rectPts(35, 49, 6, 6, 2), WASH.flameCore, { layers: 1, edge: 0 });
  both(c, [[58, 50], [80, 44], [80, 56], [58, 54]], WASH.leather, { layers: 2 }, { w: 0.9 });
  ink(c, [[58, 52], [50, 52]], { closed: false, w: 1.6, col: WASH.woodDark });
  ink(c, [[80, 44], [82, 36]], { closed: false, w: 1.4, col: WASH.woodDark });
}

/** An anvil on a stump, a hammer resting on it and a tub of water at its side. 84x60 as shown. */
function drawAnvil(c: Ctx) {
  shadow(c, 40, 56, 34, 5, 0.18);
  both(c, rectPts(26, 34, 26, 22, 3), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, ellPts(39, 34, 13, 3, 16), WASH.wood, { layers: 1 }, { w: 0.8 });
  both(c, [[14, 20], [62, 20], [56, 26], [46, 26], [46, 32], [32, 32], [32, 26], [22, 26]], WASH.iron, { layers: 2, bloom: 1, cx: 30, cy: 22 }, { w: 1 });
  both(c, [[14, 20], [4, 22], [14, 24]], WASH.iron, { layers: 1 }, { w: 0.8 });
  ink(c, [[44, 18], [60, 8]], { closed: false, w: 1.8, col: WASH.woodDark });
  both(c, rectPts(56, 4, 8, 6, 1), WASH.ironRim, { layers: 1 }, { w: 0.6 });
  both(c, [[64, 40], [80, 40], [78, 56], [66, 56]], WASH.woodDark, { layers: 2 }, { w: 0.9 });
  both(c, ellPts(72, 40, 8, 2, 12), '#5a7a9a', { layers: 1, edge: 0 }, { w: 0.5 });
}

/** Barley: bearded ears on pale stalks, nodding when ripe. 48x44 as shown. */
function drawBarley(c: Ctx, stage: number) {
  const height = [7, 20, 32][stage];
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 7.6 + rr(-1, 1);
    const top = 43 - height + (i % 2) * 3;
    const lean = rr(0, 3);
    ink(c, [[x, 43], [x + lean * 0.4, (43 + top) / 2], [x + lean, top + 3]], { closed: false, w: 1.3, col: stage === 2 ? '#c8b060' : '#7aa84c' });
    if (stage === 2) {
      both(c, ellPts(x + lean + 1, top + 3, 2.2, 4.5, 12), '#dcc470', { layers: 2, edge: 0 }, { w: 0.6 });
      for (const d of [-2, 0, 2]) ink(c, [[x + lean + 1 + d * 0.6, top], [x + lean + 1 + d * 1.6, top - 6]], { closed: false, w: 0.4, col: '#b89a50' });
    }
  }
}

/** Hops: bines twining up a pole, hung with pale green cones when ripe. 48x44 as shown. */
function drawHops(c: Ctx, stage: number) {
  const height = [10, 26, 40][stage];
  for (const x of [14, 34]) {
    ink(c, [[x, 44], [x, 44 - height]], { closed: false, w: 1.6, col: WASH.woodDark });
    const vine: Pt[] = [];
    for (let k = 0; k <= 10; k++) vine.push([x + Math.sin(k * 1.4) * 3, 44 - (k / 10) * height]);
    ink(c, vine, { closed: false, w: 1, col: '#5f8a42' });
    for (let k = 1; k < 5; k++) {
      const [lx, ly] = vine[k * 2];
      both(c, ellPts(lx + (k % 2 ? 4 : -4), ly, 3, 2, 8), WASH.leaf, { layers: 1, edge: 0 }, { w: 0.4 });
      if (stage === 2) both(c, ellPts(lx + (k % 2 ? -3 : 3), ly + 2, 2, 3, 8), '#b8d870', { layers: 1, edge: 0 }, { w: 0.4 });
    }
  }
}

function drawSack(c: Ctx, fill: string, mark: (c: Ctx) => void) {
  shadow(c, 8.5, 14.5, 6, 1.4, 0.25);
  both(c, [[4, 14.5], [2.5, 8], [5, 4], [11, 4], [13.5, 8], [12, 14.5]], '#c8b088', { layers: 2 }, { w: 0.8 });
  ink(c, [[4.5, 5.5], [11.5, 5.5]], { closed: false, w: 0.8 });
  both(c, ellPts(8, 4, 3, 1.2, 10), fill, { layers: 1, edge: 0 }, { w: 0.4 });
  mark(c);
}

/** A tankard of ale (amber) or stout (near black), with a head of foam. */
function drawTankard(c: Ctx, beer: string) {
  shadow(c, 8, 14.5, 6, 1.3, 0.25);
  both(c, rectPts(3, 5, 9, 9.5, 1), beer, { layers: 2 }, { w: 0.8 });
  for (const y of [7.5, 12]) ink(c, [[3, y], [12, y]], { closed: false, w: 0.8, col: WASH.woodDeep });
  ink(c, [[12, 7], [14.5, 8], [14.5, 11.5], [12, 12.5]], { closed: false, w: 1.1 });
  both(c, ellPts(7.5, 5, 5, 2, 12), '#f4ecd8', { layers: 1, edge: 0 }, { w: 0.5 });
}

/** An apple tree in leaf, its apples reddening as it ripens. 48x44 as shown. */
function drawOrchard(c: Ctx, stage: number) {
  shadow(c, 24, 42, 13, 2.5, 0.2);
  both(c, [[22, 43], [22.5, 28], [25.5, 28], [26, 43]], WASH.woodDark, { layers: 2 }, { w: 0.8 });
  const r = [7, 11, 13][stage];
  both(c, ellPts(24, 30 - r, r * 1.3, r, 20), WASH.leaf, { layers: 3, bloom: 1, cx: 20, cy: 22 - r }, { w: 0.9 });
  const apples: Pt[] = [[17, 18], [29, 14], [24, 22], [33, 21], [20, 11], [27, 8]];
  if (stage > 0) for (const [x, y] of apples.slice(0, stage === 2 ? 6 : 3)) both(c, ellPts(x, y + (2 - stage) * 4, 2.2, 2.2, 10), stage === 2 ? '#c0443a' : '#9ab84a', { layers: 1, edge: 0 }, { w: 0.5 });
}

/** Lavender: grey-green tufts that send up purple spikes when ripe. 48x44 as shown. */
function drawLavender(c: Ctx, stage: number) {
  const height = [6, 16, 26][stage];
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 10.5 + rr(-1, 1);
    both(c, ellPts(x, 40, 5, 3.5, 12), '#7a9a7a', { layers: 2, edge: 0 }, { w: 0.5 });
    for (const d of [-2.5, 0, 2.5]) {
      const top = 40 - height + Math.abs(d);
      ink(c, [[x + d * 0.4, 40], [x + d, top]], { closed: false, w: 0.8, col: '#6a8a5a' });
      if (stage > 0) both(c, ellPts(x + d, top + 2, 1.3, stage === 2 ? 4 : 2, 8), stage === 2 ? '#8a6ac0' : '#a8a0b8', { layers: 1, edge: 0 }, { w: 0.4 });
    }
  }
}

/** Madder: low whorls of leaves, the red roots showing through the earth when ripe. 48x44 as shown. */
function drawMadder(c: Ctx, stage: number) {
  const height = [6, 14, 20][stage];
  if (stage === 2) for (const x of [12, 24, 36]) ink(c, [[x - 4, 42], [x, 38], [x + 5, 43]], { closed: false, w: 1.6, col: '#a8443a' });
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * 12 + rr(-1, 1);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      both(c, [[x, 40 - height / 2], [x + Math.cos(a) * 6, 40 - height / 2 + Math.sin(a) * 3 - height / 3], [x + Math.cos(a + 0.4) * 4, 40 - height / 2 + Math.sin(a + 0.4) * 2]], '#6a9a4a', { layers: 1, edge: 0 }, { w: 0.4 });
    }
    if (stage === 2) for (const dx of [-2, 2]) both(c, ellPts(x + dx, 40 - height, 1.2, 1.2, 6), '#e8d870', { layers: 1, edge: 0 }, { w: 0.3 });
  }
}

/** A slice of apple tart in its crust. */
function drawAppleTart(c: Ctx) {
  shadow(c, 8.5, 14, 7, 1.5, 0.25);
  both(c, ellPts(8, 10, 7, 3.6, 20), '#c88a48', { layers: 2 }, { w: 0.9 });
  both(c, ellPts(8, 9.4, 5.4, 2.6, 18), '#e8c070', { layers: 1, edge: 0 }, { w: 0.6 });
  for (const x of [5, 8, 11]) ink(c, [[x - 1.5, 9.4], [x + 1.5, 9.4]], { closed: false, w: 0.9, col: '#b8603a' });
}

/** A dark fruit cake, a cherry of apple on top. */
function drawFruitCake(c: Ctx) {
  shadow(c, 8.5, 14.5, 6.5, 1.4, 0.25);
  both(c, rectPts(2.5, 6, 11, 8, 1.5), '#8a5a36', { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.9 });
  both(c, ellPts(8, 6, 5.5, 1.6, 14), '#f0e2c8', { layers: 1 }, { w: 0.6 });
  for (const [x, y] of [[5, 10], [9, 12], [11, 9]]) wash(c, ellPts(x, y, 0.9, 0.9, 6), '#c0443a', { layers: 1, edge: 0 });
  both(c, ellPts(8, 4, 1.8, 1.8, 10), '#c0443a', { layers: 1, edge: 0 }, { w: 0.5 });
}

function drawApple(c: Ctx) {
  shadow(c, 8.5, 14.5, 5.5, 1.3, 0.25);
  both(c, ellPts(8, 9.5, 5.5, 5, 18), '#c0443a', { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.8 });
  ink(c, [[8, 5], [9, 2]], { closed: false, w: 0.9, col: WASH.woodDark });
  both(c, [[9, 3.5], [12.5, 2], [11, 4.5]], WASH.leaf, { layers: 1, edge: 0 }, { w: 0.4 });
}

/** A tied bunch of lavender. */
function drawLavenderBunch(c: Ctx) {
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 2;
    ink(c, [[8, 15], [x, 6]], { closed: false, w: 0.8, col: '#6a8a5a' });
    both(c, ellPts(x, 4.5, 1.2, 3, 8), '#8a6ac0', { layers: 1, edge: 0 }, { w: 0.4 });
  }
  ink(c, [[6.5, 11.5], [9.5, 11.5]], { closed: false, w: 1.4, col: '#c8a060' });
}

/** A lilac bar of soap. */
function drawSoap(c: Ctx) {
  shadow(c, 8.5, 13.5, 6.5, 1.4, 0.25);
  both(c, rectPts(2.5, 6, 11, 7, 3), '#c8b4e0', { layers: 2, bloom: 1, cx: 6, cy: 8 }, { w: 0.8 });
  for (const [x, y] of [[13, 4], [14.5, 2], [11.5, 2.5]]) ink(c, ellPts(x, y, 1, 1, 8), { w: 0.4, alpha: 0.6 });
}

/** A bundle of red madder roots. */
function drawMadderRoot(c: Ctx) {
  for (const [a, b] of [[3, 12], [5, 14], [8, 14.5]]) ink(c, [[8, 4], [a + 2, 9], [b - 2, b]], { closed: false, w: 1.5, col: '#a8443a' });
  both(c, [[6, 4], [8, 1], [10, 4]], WASH.leaf, { layers: 1, edge: 0 }, { w: 0.4 });
}

/** A gown: a fitted bodice in blue and a full red skirt. */
function drawGown(c: Ctx) {
  shadow(c, 8.5, 15, 6, 1.2, 0.25);
  both(c, [[5.5, 7], [10.5, 7], [14, 14.5], [2, 14.5]], '#a83a4a', { layers: 2, bloom: 1, cx: 7, cy: 11 }, { w: 0.8 });
  both(c, [[5.5, 2], [10.5, 2], [10.5, 7.5], [5.5, 7.5]], '#34508e', { layers: 2 }, { w: 0.7 });
  ink(c, [[5.5, 7.3], [10.5, 7.3]], { closed: false, w: 0.6, col: WASH.brass });
}

/** A brass-topped lantern with a candle lit inside. */
function drawLantern(c: Ctx) {
  shadow(c, 8.5, 15, 5, 1.2, 0.25);
  ink(c, ellPts(8, 2, 1.6, 1.4, 8), { w: 0.7 });
  both(c, [[4.5, 5], [8, 2.8], [11.5, 5]], '#c07a48', { layers: 1 }, { w: 0.6 });
  wash(c, rectPts(5, 5, 6, 8, 0.5), '#f6e0a0', { layers: 2, edge: 0 });
  wash(c, [[8, 6.5], [9.3, 9], [8, 10.5], [6.7, 9]], WASH.flameLight, { layers: 2, edge: 0 });
  for (const x of [5, 11]) ink(c, [[x, 5], [x, 13]], { closed: false, w: 0.8, col: WASH.iron });
  both(c, rectPts(4, 13, 8, 1.8, 0.4), '#c07a48', { layers: 1 }, { w: 0.6 });
}

/** A malting floor: a wide wooden tray of sprouting barley with a rake across it. 88x60 as shown. */
function drawMaltings(c: Ctx) {
  shadow(c, 44, 55, 40, 5, 0.18);
  both(c, [[4, 30], [84, 30], [80, 52], [8, 52]], WASH.wood, { layers: 2 }, { w: 1.1 });
  both(c, [[9, 32], [79, 32], [76, 46], [12, 46]], '#c8a860', { layers: 3, bloom: 1, cx: 30, cy: 38 }, { w: 0.6 });
  for (let i = 0; i < 40; i++) wash(c, ellPts(rr(14, 74), rr(34, 44), 1, 0.7, 6), '#a8883e', { layers: 1, edge: 0 });
  ink(c, [[20, 40], [64, 8]], { closed: false, w: 1.8, col: WASH.woodDark });
  ink(c, [[14, 44], [26, 36]], { closed: false, w: 2.2, col: WASH.woodDeep });
  for (const leg of [10, 76]) ink(c, [[leg, 52], [leg, 58]], { closed: false, w: 2, col: WASH.woodDark });
}

/** An oast: a round brick kiln under a white conical cowl, drying hops. 72x68 as shown. */
function drawOast(c: Ctx) {
  shadow(c, 36, 64, 30, 4, 0.18);
  both(c, rectPts(14, 32, 44, 32, 2), '#a8603e', { layers: 3, bloom: 1, cx: 24, cy: 40 }, { w: 1.2 });
  for (let y = 38; y < 64; y += 6) ink(c, [[14, y], [58, y]], { closed: false, w: 0.45, alpha: 0.45 });
  both(c, [[10, 34], [36, 6], [62, 34]], '#e8e2d2', { layers: 3 }, { w: 1.2 });
  hatch(c, [[36, 6], [62, 34], [36, 34]], { gap: 2.4, alpha: 0.2, w: 0.5 });
  both(c, [[34, 2], [42, 2], [44, 8], [34, 8]], WASH.woodDark, { layers: 1 }, { w: 0.8 });
  wash(c, rectPts(30, 52, 12, 12, 2), WASH.flame, { layers: 2, edge: 0 });
}

/** A copper brew kettle over a fire, with a cask beside it. 88x64 as shown. */
function drawKettle(c: Ctx) {
  shadow(c, 44, 60, 40, 4, 0.18);
  for (const [dx, h, col] of [[-6, 7, WASH.flame], [2, 9, WASH.flameLight], [-2, 5, WASH.flameCore]] as [number, number, string][]) {
    wash(c, [[30 + dx - 4, 60], [30 + dx, 60 - h], [30 + dx + 4, 60]], col, { layers: 2, edge: 0 });
  }
  both(c, ellPts(30, 34, 24, 20, 30), '#c07a3a', { layers: 3, bloom: 2, cx: 22, cy: 28 }, { w: 1.3 });
  hatch(c, ellPts(38, 36, 14, 16, 20), { gap: 2.4, alpha: 0.22, w: 0.5 });
  both(c, ellPts(30, 16, 16, 4, 20), '#8a4a26', { layers: 2 }, { w: 1 });
  both(c, ellPts(30, 15, 12, 2.6, 16), '#d89a3a', { layers: 1, edge: 0 }, { w: 0.5 });
  both(c, ellPts(70, 46, 14, 14, 24), WASH.wood, { layers: 2, bloom: 1, cx: 66, cy: 42 }, { w: 1 });
  for (const x of [62, 78]) ink(c, [[x, 33], [x, 59]], { closed: false, w: 1.2, col: WASH.iron });
  both(c, ellPts(70, 46, 3, 3, 10), WASH.woodDeep, { layers: 1 }, { w: 0.5 });
}

/** A millstone on a timber frame, a hopper of grain above it and a sack catching the flour. 88x60 as shown. */
function drawMill(c: Ctx) {
  shadow(c, 46, 55, 40, 5, 0.18);
  for (const lx of [8, 74]) both(c, rectPts(lx, 18, 6, 38, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(4, 14, 80, 6, 1.5), WASH.wood, { layers: 2 }, { w: 1.1 });
  both(c, rectPts(14, 38, 60, 12, 2), '#d4ac72', { layers: 2 }, { w: 1.1 });
  // The stone, edge on, with dressed grooves.
  both(c, ellPts(42, 34, 22, 9, 30), WASH.stone, { layers: 3, bloom: 1, cx: 36, cy: 30 }, { w: 1.3 });
  both(c, ellPts(42, 32, 22, 8, 30), '#9aa0a6', { layers: 2 }, { w: 1.1 });
  for (let i = 0; i < 6; i++) ink(c, [[42, 32], [42 + Math.cos(i) * 19, 32 + Math.sin(i) * 6.5]], { closed: false, w: 0.5, alpha: 0.5 });
  both(c, ellPts(42, 32, 3.5, 1.6, 12), '#3a3f45', { layers: 1, edge: 0 }, { w: 0.6 });
  // The hopper, full of wheat.
  both(c, [[30, 4], [54, 4], [46, 20], [38, 20]], WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, ellPts(42, 5, 11, 2.6, 16), '#d9b24a', { layers: 2, edge: 0 }, { w: 0.6 });
  // A sack of flour at its foot.
  both(c, [[66, 54], [62, 44], [66, 38], [76, 38], [80, 44], [77, 54]], '#efe6cc', { layers: 2 }, { w: 1 });
  ink(c, [[64, 41], [78, 41]], { closed: false, w: 0.8 });
}

/** A brick bake oven: a dome over a glowing mouth, a chimney and a peel leaning on it. 80x62 as shown. */
function drawOven(c: Ctx) {
  shadow(c, 42, 57, 36, 5, 0.18);
  const glow = c.createRadialGradient(40, 46, 0, 40, 46, 26);
  glow.addColorStop(0, 'rgba(255,170,70,0.35)');
  glow.addColorStop(1, 'rgba(255,170,70,0)');
  c.fillStyle = glow;
  c.fillRect(0, 20, 80, 42);
  both(c, rectPts(52, 2, 9, 20, 1), '#8a4e36', { layers: 2 }, { w: 1 });
  const dome: Pt[] = [];
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI + (i / 26) * Math.PI;
    dome.push([40 + Math.cos(a) * 34, 54 + Math.sin(a) * 38]);
  }
  both(c, dome, '#a8603e', { layers: 3, bloom: 2, cx: 30, cy: 30 }, { w: 1.3 });
  // Courses of brick.
  for (let row = 0; row < 5; row++) {
    const y = 50 - row * 7;
    const half = Math.sqrt(Math.max(0, 1 - ((54 - y) / 38) ** 2)) * 34;
    ink(c, [[40 - half, y], [40 + half, y]], { closed: false, w: 0.55, alpha: 0.5 });
    for (let x = 40 - half + (row % 2) * 4 + 4; x < 40 + half - 2; x += 8) ink(c, [[x, y], [x, y - 7]], { closed: false, w: 0.45, alpha: 0.4 });
  }
  hatch(c, dome.map(([x, y]) => [x + 10, y] as Pt), { gap: 2.4, alpha: 0.22, w: 0.5 });
  // The mouth and its fire.
  const mouth: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    mouth.push([40 + Math.cos(a) * 12, 54 + Math.sin(a) * 13]);
  }
  wash(c, mouth, '#2a160c', { layers: 2, edge: 0 });
  for (const [dx, h, col] of [[-5, 8, WASH.flame], [3, 10, WASH.flameLight], [-1, 5, WASH.flameCore]] as [number, number, string][]) {
    wash(c, [[40 + dx - 4, 54], [40 + dx, 54 - h], [40 + dx + 4, 54]], col, { layers: 2, edge: 0 });
  }
  ink(c, mouth, { w: 1.1 });
  // A peel leaning on its side.
  ink(c, [[72, 56], [64, 18]], { closed: false, w: 2, col: WASH.woodDark });
  both(c, ellPts(63, 15, 4, 6, 12), WASH.wood, { layers: 2 }, { w: 0.8 });
}

/**
 * A shop yard's ground: grass, the earth of the yard the doctor works, the shop's plank floor, and the
 * cobbled street along the bottom with a low fence between the yard and it.
 */
function drawYard(c: Ctx, shop: ShopId) {
  const { w, h } = shopWorld(shop);
  paper(c, 0, 0, w, h);
  wash(c, rectPts(-10, -10, w + 20, h + 20), WASH.grass, { layers: 4, spread: 3, alpha: 0.85, edge: 0 });
  const floor = counterLayout(shop).floor;
  const FENCE_Y = shopFence(shop);
  // The yard's earth, from the gardens to the far end.
  const ground = yardGround(shop);
  const yard = rectPts(ground.x, ground.y, ground.w, ground.h, 18);
  wash(c, yard, WASH.dirt, { layers: 5, spread: 2.5, alpha: 0.85, bloom: 5, cx: w / 2, cy: ground.y + 170, edge: 3 });
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(42,29,20,${rr(0.15, 0.4)})`;
    c.beginPath();
    c.arc(rr(ground.x + 10, ground.x + ground.w - 10), rr(ground.y + 10, ground.y + ground.h - 10), rr(0.4, 1.1), 0, Math.PI * 2);
    c.fill();
  }
  ink(c, yard, { w: 1.5, wob: 0.8 });
  // The street.
  const street = rectPts(-10, FENCE_Y + 70, w + 20, h - FENCE_Y - 60);
  wash(c, street, '#7a6a55', { layers: 3, spread: 1, alpha: 0.95, edge: 0 });
  for (let y = FENCE_Y + 78; y < h; y += 14) {
    for (let x = (y / 14) % 2 ? -6 : 2; x < w; x += 16) both(c, rectPts(x, y, 14, 12, 3), chance(0.5) ? WASH.stone : WASH.stoneDark, { layers: 1, spread: 0.4, edge: 0 }, { w: 0.5, alpha: 0.6 });
  }
  // The shop's plank floor and its back wall.
  both(c, rectPts(floor.x, floor.y, floor.w, floor.h, 4), WASH.planks, { layers: 3, bloom: 2, cx: floor.x + 60, cy: floor.y + 60 }, { w: 1.4 });
  for (let y = floor.y + 16; y < floor.y + floor.h; y += 16) ink(c, [[floor.x + 4, y], [floor.x + floor.w - 4, y]], { closed: false, w: 0.5, alpha: 0.45 });
  both(c, rectPts(floor.x - 6, floor.y - 10, floor.w + 12, 16, 3), WASH.stoneDark, { layers: 2 }, { w: 1.2 });
  // A low fence along the yard's edge, over the grass between it and the street.
  for (let x = 6; x < floor.x - 10; x += 22) both(c, rectPts(x, FENCE_Y + 22, 5, 22, 1), WASH.woodDark, { layers: 1 }, { w: 0.7 });
  both(c, rectPts(0, FENCE_Y + 28, floor.x - 8, 5, 1), WASH.wood, { layers: 1 }, { w: 0.8 });
  for (let x = floor.x + floor.w + 14; x < w; x += 22) both(c, rectPts(x, FENCE_Y + 22, 5, 22, 1), WASH.woodDark, { layers: 1 }, { w: 0.7 });
  both(c, rectPts(floor.x + floor.w + 8, FENCE_Y + 28, w - floor.x - floor.w - 8, 5, 1), WASH.wood, { layers: 1 }, { w: 0.8 });
}

/** A town house front: timber and plaster under a roof, with the shop's sign hung out. 96x84 as shown. */
function drawLot(c: Ctx, roof: string, wall: string, sign: (c: Ctx) => void) {
  shadow(c, 50, 80, 42, 5, 0.2);
  both(c, rectPts(10, 34, 76, 46, 2), wall, { layers: 3, bloom: 1, cx: 30, cy: 50 }, { w: 1.2 });
  for (const x of [10, 48, 86]) ink(c, [[x, 34], [x, 80]], { closed: false, w: 2, col: WASH.woodDeep });
  ink(c, [[10, 56], [86, 56]], { closed: false, w: 1.6, col: WASH.woodDeep });
  both(c, [[4, 36], [48, 6], [92, 36]], roof, { layers: 3 }, { w: 1.3 });
  hatch(c, [[48, 6], [92, 36], [48, 36]], { gap: 2.6, alpha: 0.3, w: 0.5 });
  both(c, rectPts(40, 60, 16, 20, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(18, 62, 14, 10, 1), '#e8d8a0', { layers: 1 }, { w: 0.8 });
  both(c, rectPts(64, 62, 14, 10, 1), '#e8d8a0', { layers: 1 }, { w: 0.8 });
  ink(c, [[76, 40], [92, 40]], { closed: false, w: 1.2 });
  both(c, ellPts(88, 49, 8, 8, 18), '#d8c8a2', { layers: 2 }, { w: 1 });
  sign(c);
}

export function bakeTown(scene: Phaser.Scene) {
  paint(scene, 'good-honeycomb', 16, 16, drawHoneycomb, 4);
  paint(scene, 'good-bread', 16, 16, drawBread, 4);
  paint(scene, 'good-honeyCake', 16, 16, drawHoneyCake, 4);
  for (const stage of [0, 1, 2]) paint(scene, hiveTexture(stage), 40, 44, (c) => drawHive(c, stage), 3, 81 + stage);
  paint(scene, 'mill', 88, 60, drawMill, 3);
  paint(scene, 'oven', 80, 62, drawOven, 3);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('flax', stage), 48, 44, (c) => drawFlax(c, stage), 3, 91 + stage);
  paint(scene, 'good-flax', 16, 16, (c) => {
    for (let i = 0; i < 4; i++) ink(c, [[5 + i * 2, 15], [6 + i * 2, 4]], { closed: false, w: 0.9, col: '#6f9a4a' });
    both(c, ellPts(10, 4, 2.4, 2, 10), '#7a8fc8', { layers: 1, edge: 0 }, { w: 0.5 });
    ink(c, [[4, 11], [13, 11]], { closed: false, w: 1.2, col: WASH.woodDark });
  }, 4);
  paint(scene, 'good-wax', 16, 16, drawWax, 4);
  paint(scene, 'good-wick', 16, 16, drawWick, 4);
  paint(scene, 'good-candle', 16, 16, drawCandle, 4);
  paint(scene, 'good-taper', 16, 16, drawTaper, 4);
  paint(scene, 'press', 88, 60, drawPress, 3);
  paint(scene, 'wheel', 80, 64, drawWheel, 3);
  paint(scene, 'vat', 84, 60, drawVat, 3);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('woad', stage), 48, 44, (c) => drawWoad(c, stage), 3, 101 + stage);
  paint(scene, 'good-woad', 16, 16, (c) => drawWoad(c, 2), 4);
  paint(scene, 'good-linen', 16, 16, drawLinen, 4);
  paint(scene, 'good-dye', 16, 16, drawDye, 4);
  paint(scene, 'good-cloth', 16, 16, drawCloth, 4);
  paint(scene, 'good-cloak', 16, 16, drawCloak, 4);
  paint(scene, 'loom', 84, 64, drawLoom, 3);
  paint(scene, 'grinder', 84, 60, drawGrinder, 3);
  paint(scene, 'dyeVat', 84, 60, drawDyeVat, 3);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('timber', stage), 48, 44, (c) => drawCoppice(c, stage), 3, 111 + stage);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('ore', stage), 48, 44, (c) => drawOrePit(c, stage), 3, 121 + stage);
  paint(scene, 'good-ore', 16, 16, drawOre, 4);
  paint(scene, 'good-timber', 16, 16, drawTimber, 4);
  paint(scene, 'good-charcoal', 16, 16, drawCharcoal, 4);
  paint(scene, 'good-iron', 16, 16, drawIron, 4);
  paint(scene, 'good-horseshoe', 16, 16, drawHorseshoe, 4);
  paint(scene, 'good-pot', 16, 16, drawPot, 4);
  paint(scene, 'kiln', 84, 60, drawKiln, 3);
  paint(scene, 'bloomery', 84, 64, drawBloomery, 3);
  paint(scene, 'anvil', 84, 60, drawAnvil, 3);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('barley', stage), 48, 44, (c) => drawBarley(c, stage), 3, 131 + stage);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('hops', stage), 48, 44, (c) => drawHops(c, stage), 3, 141 + stage);
  paint(scene, 'good-barley', 16, 16, (c) => {
    for (const x of [5, 8, 11]) {
      ink(c, [[x, 15], [x + 1, 6]], { closed: false, w: 0.9, col: '#b89a50' });
      both(c, ellPts(x + 1, 5, 1.6, 3.4, 10), '#dcc470', { layers: 1, edge: 0 }, { w: 0.5 });
    }
  }, 4);
  paint(scene, 'good-hops', 16, 16, (c) => {
    for (const [x, y] of [[5.5, 8], [10.5, 9], [8, 12]]) both(c, ellPts(x, y, 2.6, 3.4, 10), '#a8d060', { layers: 2 }, { w: 0.6 });
    ink(c, [[8, 2], [8, 6]], { closed: false, w: 0.8, col: '#5f8a42' });
  }, 4);
  paint(scene, 'good-malt', 16, 16, (c) => drawSack(c, '#b08a4a', () => {}), 4);
  paint(scene, 'good-driedHops', 16, 16, (c) => drawSack(c, '#9aa05a', (s) => both(s, ellPts(8, 10, 2, 2.6, 8), '#9aa05a', { layers: 1 }, { w: 0.5 })), 4);
  paint(scene, 'good-ale', 16, 16, (c) => drawTankard(c, '#d89a3a'), 4);
  paint(scene, 'good-stout', 16, 16, (c) => drawTankard(c, '#3a2618'), 4);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('apple', stage), 48, 44, (c) => drawOrchard(c, stage), 3, 151 + stage);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('lavender', stage), 48, 44, (c) => drawLavender(c, stage), 3, 161 + stage);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('madder', stage), 48, 44, (c) => drawMadder(c, stage), 3, 171 + stage);
  for (const stage of [0, 1, 2]) paint(scene, bedTexture('copper', stage), 48, 44, (c) => drawOrePit(c, stage, ['#c07a48', '#5a9a7a']), 3, 181 + stage);
  paint(scene, 'good-apple', 16, 16, drawApple, 4);
  paint(scene, 'good-appleTart', 16, 16, drawAppleTart, 4);
  paint(scene, 'good-fruitCake', 16, 16, drawFruitCake, 4);
  paint(scene, 'good-lavender', 16, 16, drawLavenderBunch, 4);
  paint(scene, 'good-soap', 16, 16, drawSoap, 4);
  paint(scene, 'good-scentedCandle', 16, 16, (c) => drawCandle(c, '#c8b4e0'), 4);
  paint(scene, 'good-madder', 16, 16, drawMadderRoot, 4);
  paint(scene, 'good-redDye', 16, 16, (c) => drawDye(c, '#b8443a'), 4);
  paint(scene, 'good-redCloth', 16, 16, (c) => drawCloth(c, '#b8443a', '#8a3030'), 4);
  paint(scene, 'good-gown', 16, 16, drawGown, 4);
  paint(scene, 'good-copper', 16, 16, (c) => drawOre(c, '#c07a48', '#5a9a7a'), 4);
  paint(scene, 'good-copperPot', 16, 16, (c) => drawPot(c, '#c07a48', '#e0a070'), 4);
  paint(scene, 'good-lantern', 16, 16, drawLantern, 4);
  paint(scene, 'good-cider', 16, 16, (c) => drawTankard(c, '#e8c860'), 4);
  paint(scene, 'good-appleAle', 16, 16, (c) => {
    drawTankard(c, '#c8883a');
    both(c, ellPts(12.5, 13, 2.4, 2.2, 10), '#c0443a', { layers: 1 }, { w: 0.5 });
  }, 4);
  paint(scene, 'maltings', 88, 60, drawMaltings, 3);
  paint(scene, 'oast', 72, 68, drawOast, 3);
  paint(scene, 'kettle', 88, 64, drawKettle, 3);
  // Each good a shop sells, fine: its icon with a gold sparkle, like the apothecary's fine potions.
  for (const id of Object.keys(SHOPS) as ShopId[]) {
    for (const good of Object.keys(SHOPS[id].sells) as GoodId[]) {
      const plain = scene.textures.get(goodTexture(good)).getSourceImage() as CanvasImageSource;
      paint(scene, goodTexture(`${good}-fine`), 16, 16, (c) => {
        c.drawImage(plain, 0, 0, 16, 16);
        sparkle(c, 13, 3.2, 3);
      }, 4);
    }
  }
  paint(scene, lotTexture('apothecary'), 96, 84, (c) =>
    drawLot(c, '#5e6e46', '#d8c8a2', (s) => {
      // A green bottle on the sign.
      both(s, ellPts(88, 51, 3.6, 3.6, 12), '#4f9a5a', { layers: 1 }, { w: 0.7 });
      both(s, rectPts(86.6, 43, 2.8, 5, 0.5), '#d8e6ee', { layers: 1 }, { w: 0.5 });
    }), 3);
  paint(scene, lotTexture('bakery'), 96, 84, (c) =>
    drawLot(c, '#8a4e36', '#e0cfa8', (s) => {
      both(s, ellPts(88, 50, 5.4, 3.6, 14), '#c0803e', { layers: 1 }, { w: 0.7 });
      ink(s, [[86, 49], [88, 48], [90, 49]], { closed: false, w: 0.6 });
    }), 3);
  paint(scene, lotTexture('chandlery'), 96, 84, (c) =>
    drawLot(c, '#4e5a6e', '#e4d8b4', (s) => {
      both(s, rectPts(86.4, 47, 3.2, 8, 0.6), '#f0e2a8', { layers: 1 }, { w: 0.6 });
      wash(s, [[88, 41.5], [89.4, 44.5], [88, 46], [86.6, 44.5]], WASH.flameLight, { layers: 1, edge: 0 });
    }), 3);
  paint(scene, lotTexture('dyeHouse'), 96, 84, (c) =>
    drawLot(c, '#6e5a7a', '#dccfae', (s) => {
      both(s, rectPts(84, 46, 8, 7, 1), '#4a6ab8', { layers: 1 }, { w: 0.6 });
    }), 3);
  paint(scene, lotTexture('smithy'), 96, 84, (c) =>
    drawLot(c, '#4a4a4e', '#cfc2a2', (s) => {
      both(s, [[83, 47], [93, 47], [91, 50], [89, 50], [89, 53], [87, 53], [87, 50], [85, 50]], WASH.iron, { layers: 1 }, { w: 0.5 });
    }), 3);
  paint(scene, lotTexture('tavern'), 96, 84, (c) =>
    drawLot(c, '#7a5a3a', '#e0d0a8', (s) => {
      s.save();
      s.translate(83.5, 45);
      s.scale(0.6, 0.6);
      drawTankard(s, '#d89a3a');
      s.restore();
    }), 3);
}

/** Paints a shop's yard once it is first walked into; the yard is as wide as the shop's stations need. */
export function bakeYard(scene: Phaser.Scene, shop: ShopId) {
  if (scene.textures.exists(yardTexture(shop))) return;
  const { w, h } = shopWorld(shop);
  paint(scene, yardTexture(shop), w, h, (c) => drawYard(c, shop), 1.5);
}
