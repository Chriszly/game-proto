import Phaser from 'phaser';
import { DESKS, SLOTS } from '../game/state';
import { BOARD, FORGE_BUTTON, FURNACE_WINDOW, HUD_HEIGHT, VIEW, deskBox, slotCentre } from '../scenes/layout';
import { ART, LEAD, PI, bake, ctx, diamond, glass, glow, mix, panel, path, rect, reseed, ring, rnd, type Pt } from './glass';

// The smithy as one great window: a mosaic of glass behind everything, glowing orange round the
// furnace, cobalt panes under the anvils and amber behind the counter. Painted once into the
// `background` texture, with the furnace's flame window in two frames (`furnace-0/1`) on top.

const W = VIEW.w * ART;
/** A point of the view in art units. */
const a = (n: number) => n * ART;

export function bakeScenery(scene: Phaser.Scene) {
  bake(scene, 'background', VIEW.w, VIEW.h, () => {
    lancets();
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

/** Gothic lancets: six tall panes of amber, rose and violet glass, each with a dark arched window. */
function lancets() {
  reseed(3);
  const cols = ['#b8562a', '#d88a3a', '#8a2a3a', '#e0b04a', '#6a2a4a'];
  for (let i = 0; i < 6; i++) glass(rect(a(i * 160), 0, a(160), a(VIEW.h)), cols[i % 5], { lw: 8, hi: 0.2, lo: 0.2 });
  for (let i = 0; i < 6; i++) {
    const x = i * 160 + 20;
    ctx.beginPath();
    ctx.moveTo(a(x), a(VIEW.h));
    ctx.lineTo(a(x), a(200));
    ctx.quadraticCurveTo(a(x + 60), a(60), a(x + 120), a(200));
    ctx.lineTo(a(x + 120), a(VIEW.h));
    ctx.closePath();
    ctx.fillStyle = '#2a1a2e';
    ctx.fill();
    ctx.strokeStyle = LEAD;
    ctx.lineWidth = 8;
    ctx.stroke();
  }
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
  const tiles = ['#1e5a46', '#24684f', '#1a4e3e', '#28705a'];
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
  glass([[cx - 94, cy + top + 4], [cx - 64, cy + top - 8], [cx - 64, cy + top + 16]], '#9a6a3a', { lw: 4 });
  glass([[cx - 64, cy + top - 8], [cx + 78, cy + top - 8], [cx + 80, cy + top + 6], [cx - 64, cy + top + 6]], '#e0b070', { lw: 4 });
  glass([[cx - 64, cy + top + 6], [cx + 80, cy + top + 6], [cx + 62, cy + 20], [cx - 48, cy + 20]], '#8a5a2a', { lw: 4 });
  glass([[cx - 30, cy + 20], [cx + 30, cy + 20], [cx + 42, cy + 48], [cx - 42, cy + 48]], '#6a4420', { lw: 4 });
  glass([[cx - 62, cy + 48], [cx + 62, cy + 48], [cx + 70, cy + 70], [cx - 70, cy + 70]], '#4a2e14', { lw: 4 });
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
