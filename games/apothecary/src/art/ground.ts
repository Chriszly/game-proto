import Phaser from 'phaser';
import { EXPANSION_YARDS, GARDEN_AREAS, SHOP, SHOP_WALLS, STREET_PATH, WORLD, YARDS } from '../scenes/layout';
import { INK, WASH, both, chance, ellPts, hatch, ink, paint, paper, pathOf, rectPts, reseed, rr, seeded, wash, type Ctx, type Pt } from './paint';

// The ground as one painted page: cream paper under a broad grass wash, the compressed-earth yard,
// forecourt and markets, the street, and the shop's plank floor inside its stone walls. Things bought later (the
// expansion's yard, the second line's fields) are painted on their own pieces of paper laid on top.
// Trees and bushes stand in the grass round the edges.

/** How many canvas pixels the ground has per world pixel: enough to stay soft rather than blurry when zoomed in. */
const GROUND_RES = 1.5;

export const gardenTexture = (garden: number) => `garden-${garden}`;

/** Compressed earth: a dark brown wash with darker blotches, speckled grit and an inked edge. */
function dirt(c: Ctx, outline: Pt[], box: { x: number; y: number; w: number; h: number }) {
  wash(c, outline, WASH.dirt, { layers: 5, spread: 2.5, alpha: 0.85, bloom: 6, cx: box.x + box.w / 2, cy: box.y + box.h / 3, edge: 3 });
  c.save();
  pathOf(c, outline);
  c.clip();
  for (let i = 0; i < (box.w * box.h) / 16000; i++) {
    wash(c, ellPts(box.x + rr(0, box.w), box.y + rr(0, box.h), rr(25, 70), rr(15, 40), 14), WASH.dirtDark, { layers: 3, spread: 8, alpha: 0.16, edge: 0 });
  }
  for (let i = 0; i < (box.w * box.h) / 300; i++) {
    c.fillStyle = `rgba(42,29,20,${rr(0.15, 0.4)})`;
    c.beginPath();
    c.arc(box.x + rr(0, box.w), box.y + rr(0, box.h), rr(0.4, 1.1), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  ink(c, outline, { w: 1.5, wob: 0.8 });
}

function grassTufts(c: Ctx, x: number, y: number, w: number, h: number, n: number, skip: (x: number, y: number) => boolean) {
  c.save();
  c.strokeStyle = 'rgba(42,60,20,0.55)';
  c.lineWidth = 0.9;
  for (let i = 0; i < n; i++) {
    const tx = x + rr(0, w), ty = y + rr(0, h);
    if (skip(tx, ty)) continue;
    c.beginPath();
    c.moveTo(tx - 3.5, ty - 4);
    c.lineTo(tx, ty);
    c.lineTo(tx + 0.7, ty - 6);
    c.moveTo(tx, ty);
    c.lineTo(tx + 4, ty - 3.5);
    c.stroke();
  }
  c.restore();
}

/** Stone blocks along a wall, each washed grey and inked, in courses. */
function stones(c: Ctx, x0: number, y0: number, w: number, h: number) {
  const across = w >= h;
  const len = across ? w : h;
  const size = 13;
  for (let i = 0; i < len - 1; i += size) {
    const s = Math.min(size - 1, len - i);
    const pts = across ? rectPts(x0 + i, y0, s, h, 3) : rectPts(x0, y0 + i, w, s, 3);
    both(c, pts, chance(0.5) ? WASH.stone : WASH.stoneDark, { layers: 2, spread: 0.6, edge: 0 }, { w: 0.8 });
  }
}

function drawWorld(c: Ctx) {
  const { w, h } = WORLD;
  paper(c, 0, 0, w, h);
  // Grass: a broad wash in two greens, with lighter and darker pools.
  wash(c, rectPts(-10, -10, w + 20, h + 20), WASH.grass, { layers: 5, spread: 10, alpha: 0.75, edge: 0 });
  for (let i = 0; i < 22; i++) {
    wash(c, ellPts(rr(0, w), rr(0, h), rr(40, 120), rr(25, 70), 18), chance(0.5) ? WASH.grassDark : WASH.grassLight, { layers: 3, spread: 8, alpha: 0.3, edge: 0 });
  }
  // A deeper green at the world's edges.
  for (const x0 of [-20, w - 10]) wash(c, rectPts(x0, -10, 30, h + 20), WASH.forest, { layers: 3, spread: 6, alpha: 0.45, edge: 0 });
  const inYard = (x: number, y: number) => YARDS.some((r) => x > r.x - 6 && x < r.x + r.w + 6 && y > r.y - 6 && y < r.y + r.h + 6);
  const inShop = (x: number, y: number) => x > SHOP.x - 14 && x < SHOP.x + SHOP.w + 14 && y > SHOP.y - 14;
  grassTufts(c, 0, 0, w, h, 620, (x, y) => inYard(x, y) || inShop(x, y));
  for (const yard of YARDS) dirt(c, rectPts(yard.x, yard.y, yard.w, yard.h), yard);
  // The street, a sandy path from the storefront's door to the bottom edge.
  const p = STREET_PATH;
  both(c, [[p.x - 2, p.y], [p.x + p.w + 2, p.y], [p.x + p.w + 8, h + 4], [p.x - 8, h + 4]], '#a8845a', { layers: 3 }, { w: 1.1 });
  // The shop: a plank floor, with a hatched shadow under the walls on its lit side.
  const s = SHOP;
  both(c, rectPts(s.x, s.y, s.w, s.h), WASH.planks, { layers: 4, bloom: 4, cx: s.x + s.w / 2, cy: s.y + s.h / 2 }, { w: 1.4 });
  c.save();
  pathOf(c, rectPts(s.x + 8, s.y + 8, s.w - 16, s.h - 16));
  c.clip();
  for (let y = s.y + 8; y < s.y + s.h; y += 14) {
    ink(c, [[s.x, y], [s.x + s.w, y]], { closed: false, w: 0.6, alpha: 0.5, wob: 0.3 });
    for (let x = s.x + rr(6, 50); x < s.x + s.w; x += rr(55, 95)) ink(c, [[x, y], [x, y + 14]], { closed: false, w: 0.6, alpha: 0.45, wob: 0.2 });
    for (let k = 0; k < 3; k++) {
      const gx = rr(s.x, s.x + s.w);
      c.strokeStyle = 'rgba(42,29,20,0.22)';
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(gx, y + rr(4, 10));
      c.lineTo(gx + rr(12, 30), y + rr(4, 10));
      c.stroke();
    }
  }
  c.restore();
  hatch(c, [[s.x + 8, s.y + 8], [s.x + s.w - 8, s.y + 8], [s.x + s.w - 8, s.y + 18], [s.x + 18, s.y + 18], [s.x + 18, s.y + s.h - 8], [s.x + 8, s.y + s.h - 8]], { gap: 3, alpha: 0.3, w: 0.6 });
}

/**
 * The shop's stone walls, painted on their own and laid above the expansion's yard, so the yard's
 * edge never washes over the right wall.
 */
const WALLS_MARGIN = 6;
const WALLS_BOX = (() => {
  const x = Math.min(...SHOP_WALLS.map((w) => w.x)) - WALLS_MARGIN;
  const y = Math.min(...SHOP_WALLS.map((w) => w.y)) - WALLS_MARGIN;
  const w = Math.max(...SHOP_WALLS.map((w) => w.x + w.w)) + WALLS_MARGIN - x;
  const h = Math.max(...SHOP_WALLS.map((w) => w.y + w.h)) + WALLS_MARGIN - y;
  return { x, y, w, h };
})();
function drawWalls(c: Ctx) {
  for (const wall of SHOP_WALLS) stones(c, wall.x - WALLS_BOX.x, wall.y - WALLS_BOX.y, wall.w, wall.h);
}

/** The expansion's yard, painted on its own with a margin of paper-free edge, laid once the land is bought. */
const EXPANSION_MARGIN = 8;
function drawExpansion(c: Ctx) {
  const y = EXPANSION_YARDS[0];
  const m = EXPANSION_MARGIN;
  dirt(c, rectPts(m, m, y.w, y.h), { x: m, y: m, w: y.w, h: y.h });
}

/**
 * A garden: a meadow wash with flowers, inside a picket fence. A shade garden is a darker, mossy
 * green under the dappled shadow of the trees round it.
 */
function drawGarden(c: Ctx, w: number, h: number, shaded = false) {
  const m = 6;
  wash(c, rectPts(m, m, w, h, 6), shaded ? '#4f7438' : '#6e9450', { layers: 4, spread: 2, bloom: 4, cx: w / 2, cy: h / 3 });
  if (shaded) {
    for (let i = 0; i < 9; i++) {
      wash(c, ellPts(m + rr(10, w - 10), m + rr(10, h - 10), rr(18, 40), rr(12, 26), 16), '#3f5a30', { layers: 3, spread: 6, alpha: 0.22, edge: 0 });
    }
    hatch(c, rectPts(m + 4, m + 4, w - 8, 14), { gap: 3, alpha: 0.2, w: 0.5 });
  }
  for (let i = 0; i < 26; i++) {
    c.fillStyle = ['#e8a33c', '#d97aa0', '#fff8e8', '#8a7ad8'][i % 4];
    c.beginPath();
    c.arc(m + rr(6, w - 6), m + rr(20, h - 8), 1.3, 0, Math.PI * 2);
    c.fill();
  }
  // Picket fence: posts round the edge on two rails.
  const fence: Pt[] = rectPts(m, m, w, h);
  ink(c, fence, { w: 1.2, col: '#6e4426' });
  ink(c, rectPts(m + 2.5, m + 2.5, w - 5, h - 5), { w: 0.8, col: '#8a5a32', alpha: 0.7 });
  const post = (x: number, y: number) => both(c, rectPts(x - 1.8, y - 3.5, 3.6, 5.5, 1), '#d9b48a', { layers: 1, edge: 0 }, { w: 0.6 });
  for (let x = m; x <= m + w; x += 11) {
    post(x, m + 1);
    post(x, m + h + 1);
  }
  for (let y = m + 11; y < m + h; y += 11) {
    post(m, y);
    post(m + w, y);
  }
}

/** A round tree: a lobed canopy washed green, hatched on its shaded side, on a short trunk. 80x88 as shown, foot at (40, 84). */
function drawTree(c: Ctx, tint: string) {
  const x = 40, y = 84, r = 30;
  c.save();
  c.fillStyle = 'rgba(40,60,30,0.25)';
  pathOf(c, ellPts(x + 8, y - 1, r * 0.9, r * 0.3, 20));
  c.fill();
  c.restore();
  both(c, rectPts(x - 4, y - 16, 8, 17, 2), '#8a6040', { layers: 2 }, { w: 1 });
  const pts: Pt[] = [];
  const lobes = 9;
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2, a1 = ((i + 1) / lobes) * Math.PI * 2;
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (a1 - a0) * (k / 6);
      const bump = Math.sin((k / 6) * Math.PI) * 5;
      pts.push([x + Math.cos(a) * (r + bump), y - r * 1.2 + Math.sin(a) * (r * 0.85 + bump)]);
    }
  }
  wash(c, pts, tint, { layers: 4, spread: 1.5, bloom: 3, cx: x - r * 0.3, cy: y - r * 1.6 });
  hatch(c, ellPts(x + r * 0.35, y - r, r * 0.75, r * 0.55, 20), { gap: 3, alpha: 0.32, w: 0.6 });
  ink(c, pts, { w: 1.3, wob: 0.4 });
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 0.9;
  c.globalAlpha = 0.65;
  for (let k = 0; k < 4; k++) {
    const a = rr(3.4, 5.4), d = r * rr(0.2, 0.6);
    c.beginPath();
    c.arc(x + Math.cos(a) * d, y - r * 1.2 + Math.sin(a) * d, 4.5, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
  }
  c.restore();
}

/** A flowering bush. 48x32 as shown, foot at (24, 28). */
function drawBush(c: Ctx) {
  const x = 24, y = 28;
  c.save();
  c.fillStyle = 'rgba(40,60,30,0.22)';
  pathOf(c, ellPts(x + 4, y, 19, 4, 16));
  c.fill();
  c.restore();
  const blob = ellPts(x, y - 9, 19, 12, 26).map(([a, b], i) => [a + Math.sin(i * 1.7) * 2, b + Math.cos(i * 2.3) * 2] as Pt);
  both(c, blob, '#57803a', { layers: 3 }, { w: 1.1 });
  hatch(c, ellPts(x + 8, y - 7, 11, 7, 16), { gap: 2.5, alpha: 0.28, w: 0.5 });
  for (let f = 0; f < 5; f++) {
    c.fillStyle = ['#e8a33c', '#d97aa0', '#fff8e8', '#8a7ad8', '#e8a33c'][f];
    c.beginPath();
    c.arc(x + rr(-13, 13), y - 9 + rr(-7, 5), 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 0.5;
    c.stroke();
  }
}

/** Where the scenery stands: its texture and its foot, in the grass clear of everything the doctor uses. */
export interface Scenery {
  key: string;
  x: number;
  y: number;
}

/**
 * Trees and bushes in the grass below the gardens, either side of the street and above the shop.
 * Placed by a seeded scatter, so they stand in the same spots on every load.
 */
export function sceneryLayout(): Scenery[] {
  const rand = seeded(97);
  const between = (a: number, b: number) => a + rand() * (b - a);
  const spots: Scenery[] = [];
  const zones = [
    { x0: 30, x1: 210, y0: 700, y1: 895, trees: 3, bushes: 2 },
    { x0: 1470, x1: 1650, y0: 700, y1: 895, trees: 3, bushes: 2 },
    { x0: 660, x1: 800, y0: 700, y1: 895, trees: 2, bushes: 2 },
    { x0: 880, x1: 1020, y0: 700, y1: 895, trees: 2, bushes: 2 },
    { x0: 700, x1: 980, y0: 60, y1: 140, trees: 2, bushes: 3 },
  ];
  for (const z of zones) {
    for (let n = 0, tries = 0; n < z.trees + z.bushes && tries < 400; tries++) {
      const tree = n < z.trees;
      const x = between(z.x0, z.x1), y = between(tree ? Math.max(z.y0, 140) : z.y0, z.y1);
      if (spots.some((s) => Math.hypot(s.x - x, (s.y - y) * 1.4) < (tree ? 70 : 46))) continue;
      spots.push({ key: tree ? `tree-${n % 3}` : `bush-${n % 2}`, x: Math.round(x), y: Math.round(y) });
      n++;
    }
  }
  return spots;
}

export function bakeGround(scene: Phaser.Scene) {
  paint(scene, 'ground-world', WORLD.w, WORLD.h, drawWorld, GROUND_RES);
  const yard = EXPANSION_YARDS[0];
  paint(scene, 'ground-expansion', yard.w + 2 * EXPANSION_MARGIN, yard.h + 2 * EXPANSION_MARGIN, drawExpansion, GROUND_RES);
  paint(scene, 'ground-walls', WALLS_BOX.w, WALLS_BOX.h, drawWalls, GROUND_RES);
  GARDEN_AREAS.forEach((area, i) =>
    paint(scene, gardenTexture(i), area.w + 12, area.h + 12, (c) => drawGarden(c, area.w, area.h, area.name === 'Shade garden'), 2, 300 + (i % 2)),
  );
  ['#527a36', '#5e8a3e', '#466e30'].forEach((tint, i) => paint(scene, `tree-${i}`, 80, 88, (c) => drawTree(c, tint), 2, 500 + i));
  [0, 1].forEach((i) => paint(scene, `bush-${i}`, 48, 32, drawBush, 2, 600 + i));
  reseed(1);
}

/** Where the expansion's yard image goes: its painting has a margin round the yard. */
export const EXPANSION_IMAGE = { x: EXPANSION_YARDS[0].x - EXPANSION_MARGIN, y: EXPANSION_YARDS[0].y - EXPANSION_MARGIN };
/** Where the shop walls' image goes. */
export const WALLS_IMAGE = { x: WALLS_BOX.x, y: WALLS_BOX.y };
/** A garden's painting has a 6 pixel margin round its fenced area. */
export const GARDEN_MARGIN = 6;
