import Phaser from 'phaser';
import type { GoodId, ShopId } from '../game/town';
import { counterLayout, gardenLayout, shopWorld, FENCE_Y, SHOP_HUD } from '../scenes/shopLayout';
import { itemTexture } from './items';
import { WASH, both, chance, ellPts, hatch, ink, paint, paper, rectPts, rr, shadow, wash, type Ctx, type Pt } from './paint';

// The town's art, in the same ink and watercolour as the apothecary's: the town shops' goods, the
// bakery's mill, oven and beehives, each shop yard's painted ground, and the houses on the town map.

/** A good's icon: the apothecary's own for wheat and flour, the town's for the rest. 16x16 as shown. */
export const goodTexture = (good: GoodId) => (good === 'wheat' || good === 'flour' ? itemTexture(good) : `good-${good}`);
/** A beehive bed's skep, from empty to full of honey. */
export const hiveTexture = (stage: number) => `hive-${stage}`;
export const yardTexture = (shop: ShopId) => `yard-${shop}`;
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
  // The yard's earth, from the gardens to the shop.
  const yard = rectPts(gardenLayout(0).area.x + 150, SHOP_HUD + 70, floor.x - 170, FENCE_Y - SHOP_HUD - 80, 18);
  wash(c, yard, WASH.dirt, { layers: 5, spread: 2.5, alpha: 0.85, bloom: 5, cx: w / 2, cy: 240, edge: 3 });
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(42,29,20,${rr(0.15, 0.4)})`;
    c.beginPath();
    c.arc(rr(gardenLayout(0).area.x + 160, floor.x - 20), rr(SHOP_HUD + 80, FENCE_Y - 20), rr(0.4, 1.1), 0, Math.PI * 2);
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
}

/** Paints a shop's yard once it is first walked into; the yard is as wide as the shop's stations need. */
export function bakeYard(scene: Phaser.Scene, shop: ShopId) {
  if (scene.textures.exists(yardTexture(shop))) return;
  const { w, h } = shopWorld(shop);
  paint(scene, yardTexture(shop), w, h, (c) => drawYard(c, shop), 1.5);
}
