import Phaser from 'phaser';
import { DESKS, SLOTS } from '../game/state';
import { BOARD, FORGE_BUTTON, FURNACE_WINDOW, HUD_HEIGHT, VIEW, deskBox, slotCentre } from '../scenes/layout';
import { ART, LEAD, PI, bake, ctx, diamond, glass, glow, hex, mix, panel, path, rect, reseed, ring, rnd, type Pt } from './glass';

// The smithy as one great window: a mosaic of glass behind everything, glowing orange round the
// furnace, cobalt panes under the anvils and amber behind the counter. Painted once into the
// `background` texture, with the furnace's flame window in two frames (`furnace-0/1`) on top.

const W = VIEW.w * ART;
/** A point of the view in art units. */
const a = (n: number) => n * ART;

export function bakeScenery(scene: Phaser.Scene) {
  bake(scene, 'background', VIEW.w, VIEW.h, () => {
    mosaic();
    furnaceStones();
    board();
    counter();
    hudBar();
  });
  for (let frame = 0; frame < 2; frame++) {
    const f = FURNACE_WINDOW;
    bake(scene, `furnace-${frame}`, f.w, f.h, () => {
      ctx.translate(-a(f.x), -a(f.y));
      flames(frame);
    });
  }
}

/** The colour of the mosaic piece around a point (in art units), with a little random shade. */
function regionCol(x: number, y: number, r: number) {
  const desk = deskBox(0);
  if (y < a(HUD_HEIGHT)) return mix('#2a2238', '#352a46', r);
  if (x >= a(desk.x) - 28) return mix('#7a4a1e', '#9a5e24', r);
  const bx = a(BOARD.x) - 16;
  const by = a(BOARD.y) - 16;
  const bw = a(BOARD.cell * 4) + 32;
  if (x >= bx && x < bx + bw && y >= by && y < by + bw) return mix('#1c2450', '#2a2a62', r);
  if (x < bx) {
    const d = Math.hypot(x - 260, y - 420);
    return d < 300 ? mix('#8a3a1c', '#b85a24', r * 0.6 + (1 - d / 300) * 0.4) : mix('#3a4660', '#4a5672', r);
  }
  return mix('#30304a', '#3c3a58', r);
}

/** Voronoi glass over the whole view, with lead where two cells meet. Painted pixel by pixel. */
function mosaic() {
  const w = VIEW.w;
  const h = VIEW.h;
  const sp = 32;
  reseed(3);
  const gw = Math.ceil(w / sp) + 1;
  const gh = Math.ceil(h / sp) + 1;
  const seeds: { x: number; y: number; c: [number, number, number] }[] = [];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = (i + 0.15 + rnd() * 0.7) * sp;
      const y = (j + 0.15 + rnd() * 0.7) * sp;
      seeds.push({ x, y, c: hex(regionCol(a(x), a(y), rnd())) });
    }
  }
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const ld = hex(LEAD);
  for (let y = 0; y < h; y++) {
    const gj = Math.floor(y / sp);
    for (let x = 0; x < w; x++) {
      const gi = Math.floor(x / sp);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = seeds[0];
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = gi + di;
          const jj = gj + dj;
          if (ii < 0 || jj < 0 || ii >= gw || jj >= gh) continue;
          const s = seeds[jj * gw + ii];
          const dd = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = s;
          } else if (dd < d2) d2 = dd;
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const o = (y * w + x) * 4;
      if (edge < 2.2) {
        d[o] = ld[0];
        d[o + 1] = ld[1];
        d[o + 2] = ld[2];
      } else {
        const k = 1.18 - (Math.sqrt(d1) / (sp * 1.1)) * 0.45 + Math.sin(x * 0.1 + y * 0.06) * 0.03;
        d[o] = Math.min(255, best.c[0] * k);
        d[o + 1] = Math.min(255, best.c[1] * k);
        d[o + 2] = Math.min(255, best.c[2] * k);
      }
      d[o + 3] = 255;
    }
  }
  // putImageData ignores the canvas transform, so it takes view pixels.
  ctx.putImageData(img, 0, 0);
}

/** The arch of the furnace window, shared by the stones and the flame frames. */
function arch(): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = PI + (k / 12) * PI;
    pts.push([260 + Math.cos(t) * 82, 424 + Math.sin(t) * 86]);
  }
  pts.push([342, 556], [178, 556]);
  return pts;
}

/** The furnace: a chimney and a wall of grey stone glass round a dark arch, and the Forge's glow. */
function furnaceStones() {
  reseed(5);
  glow(260, 450, 360, '#ff8a2a', 0.45);
  glass(rect(200, 196, 120, 100), '#5a6680');
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const x = 96 + c * 84 - (r % 2) * 42;
      const y = 290 + r * 58;
      const x0 = Math.max(96, x);
      const x1 = Math.min(436, x + 84);
      if (x1 - x0 < 20) continue;
      glass(rect(x0, y, x1 - x0, 58), mix('#5e6a84', '#76829c', rnd()), { lw: 5 });
    }
  }
  glass(arch(), '#2a1008', { hi: 0.05 });
  glow(a(FORGE_BUTTON.x), a(FORGE_BUTTON.y), 220, '#ff9a3a', 0.35);
}

/** The fire in the arch: flame shards fanning up from the coals, in one of two flickers. */
function flames(frame: number) {
  reseed(9 + frame);
  const pts = arch();
  glass(pts, '#3a140a', { hi: 0.1 });
  ctx.save();
  path(pts);
  ctx.clip();
  glow(260, 520, 170, '#ffd070', 0.9);
  const lift = (n: number, k: number) => n + (frame === 0 ? 0 : k);
  const shards: [string, Pt[]][] = [
    ['#c4301a', [[178, 556], [190, lift(430, 18)], [228, 556]]],
    ['#e8601e', [[200, 556], [lift(232, -8), lift(380, 22)], [262, 556]]],
    ['#c4301a', [[244, 556], [lift(262, 6), lift(338, 26)], [290, 556]]],
    ['#e8601e', [[270, 556], [lift(300, 6), lift(392, -28)], [324, 556]]],
    ['#c4301a', [[300, 556], [334, lift(440, -24)], [342, 556]]],
    ['#ffb02e', [[214, 556], [lift(246, 6), lift(430, -20)], [262, 556]]],
    ['#ffb02e', [[262, 556], [lift(282, -6), lift(420, 16)], [306, 556]]],
    ['#ffe9a0', [[236, 556], [lift(262, 4), lift(452, -14)], [288, 556]]],
  ];
  for (const [c, p] of shards) glass(p, c, { lw: 4, hi: 0.4 });
  ctx.restore();
  glass(pts, '#000000', { empty: true, lw: 7 });
  for (const [x, y] of [[194, 552], [226, 556], [262, 552], [298, 556], [330, 552]]) glass(ring(x, y, 12, 6, 0.3), '#2a1a1a', { lw: 3, flat: true });
}

/** The sixteen cobalt panes of the board with gold quarries at their corners, and an anvil on each. */
function board() {
  const size = a(BOARD.cell * 4);
  glass(rect(a(BOARD.x) - 16, a(BOARD.y) - 16, size + 32, size + 32), '#000000', { empty: true, lw: 10 });
  const tiles = ['#2a4a8e', '#33548f', '#274a86', '#3a5a9a'];
  reseed(20);
  const half = a(BOARD.cell) / 2 - 4;
  for (let i = 0; i < SLOTS; i++) {
    const c = slotCentre(i);
    glass(rect(a(c.x) - half, a(c.y) - half, half * 2, half * 2), tiles[(i + Math.floor(i / 4)) % 4], { hi: 0.25, lo: 0.25, lw: 6 });
  }
  // A warm light pooled on each pane, clipped to it, so the swords and anvils stand out from the cobalt.
  for (let i = 0; i < SLOTS; i++) {
    const c = slotCentre(i);
    ctx.save();
    path(rect(a(c.x) - half, a(c.y) - half, half * 2, half * 2));
    ctx.clip();
    glow(a(c.x), a(c.y) - a(8), half, '#ffe6a8', 0.32);
    ctx.restore();
  }
  for (let i = 0; i < SLOTS; i++) {
    const c = slotCentre(i);
    for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) glass(diamond(a(c.x) + qx * half, a(c.y) + qy * half, 14), '#c8962e', { lw: 3, flat: true });
  }
  for (let i = 0; i < SLOTS; i++) {
    const c = slotCentre(i);
    anvil(a(c.x), a(c.y));
  }
}

/** A leaded steel anvil: horn, face, waist, foot. */
function anvil(cx: number, cy: number) {
  const top = -16;
  glass([[cx - 94, cy + top + 4], [cx - 64, cy + top - 8], [cx - 64, cy + top + 16]], '#7c88a8', { lw: 4 });
  glass([[cx - 64, cy + top - 8], [cx + 78, cy + top - 8], [cx + 80, cy + top + 6], [cx - 64, cy + top + 6]], '#b4bed6', { lw: 4 });
  glass([[cx - 64, cy + top + 6], [cx + 80, cy + top + 6], [cx + 62, cy + 20], [cx - 48, cy + 20]], '#6a7696', { lw: 4 });
  glass([[cx - 30, cy + 20], [cx + 30, cy + 20], [cx + 42, cy + 48], [cx - 42, cy + 48]], '#56607e', { lw: 4 });
  glass([[cx - 62, cy + 48], [cx + 62, cy + 48], [cx + 70, cy + 70], [cx - 70, cy + 70]], '#454e6a', { lw: 4 });
}

/** The counter: a window frame per desk with an empty lancet, which an adventurer's figure fills. */
function counter() {
  for (let desk = 0; desk < DESKS; desk++) {
    const b = deskBox(desk);
    const x = a(b.x);
    const y = a(b.y);
    const h = a(b.h);
    reseed(40 + desk);
    panel(x, y, a(b.w), h, '#8a5e30', '#3a3266', 10);
    glass([[x + 14, y + h - 12], [x + 14, y + 80], [x + 94, y + 16], [x + 174, y + 80], [x + 174, y + h - 12]], '#2e4a8a', { hi: 0.3, lo: 0.15, lw: 5 });
  }
}

/** The top bar: a strip of dusk-violet glass, and the coin by the coin count. */
function hudBar() {
  glass(rect(-6, -6, W + 12, a(HUD_HEIGHT) + 6), '#221a2e', { flat: true, lw: 6 });
  glass(ring(412, 40, 15, 10), '#f0b830', { lw: 3, hi: 0.5 });
}
