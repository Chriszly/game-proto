import Phaser from 'phaser';
import { GRID, MAP, PATH_CORNERS, cellCentre, pathPoint } from '../game/board';
import { HUD, PANEL, PREVIEW, SEED_BUTTONS, WAVE_BUTTON, BUTTON } from '../scenes/layout';
import { C, E, PI, Pp, R, bake, blur, ctx, drop, ellipse, flower, golem, pest, reseed, rnd, sprout, type ClayOptions } from './clay';

// Every texture, painted in clay at startup. Sizes and anchors are in view pixels; painters work in
// art units (2 per view pixel) around their anchor.
//
// bg              the studio table, the garden slab with its pressed path and soil beds, the HUD
//                 strip with its tags, the side panel and the wave preview's dark pad
// edge            the strip of table left of the board, drawn over pests coming in
// tree            the Heartwood without its flowers; bud and bloom are its flowers
// golem-<kind>    a golem standing, anchored at its feet
// sprout          a seed growing, anchored at its mound's foot
// pest-<kind>     a pest facing right, anchored where it stands on the path
// slow            the moss clumps over a slowed pest
// shot-<kind>     a thrown pellet
// sap, glow       a sap drop and the glow behind the sap counter
// splat           what a squashed pest leaves on the path
// leaf            the Heartwood's leaf in the HUD
// card-<h>[-dim]  a seed card, h 84 or 68 view pixels tall; rim-<h> is the gold rim of the picked one
// card-locked     the Thorn golem's card before the Heartwood blooms, with its padlock
// btn-wave[-off]  the wave button, lit or waiting; btn is the game-over button

const A = 2; // art units per view pixel
const G = { x: GRID.x * A, y: GRID.y * A, cell: GRID.cell * A, cols: GRID.cols, rows: GRID.rows };
const W = 960 * A;
const H = 540 * A;
const cc = (col: number, row: number) => {
  const p = cellCentre(col, row);
  return { x: p.x * A, y: p.y * A };
};
const PTS = PATH_CORNERS.map(([c, r]) => cc(c, r));
const shade = { print: false, sb: 2, sx: 2, sy: 2, rim: 2 } satisfies ClayOptions;

export function bakeTextures(scene: Phaser.Scene) {
  const bg = bake(scene, 'bg', 960, 540, paintBackground);
  if (bg && !scene.textures.exists('edge')) {
    const edge = document.createElement('canvas');
    edge.width = GRID.x - 3;
    edge.height = 540;
    edge.getContext('2d')!.drawImage(bg, 0, 0);
    scene.textures.addCanvas('edge', edge);
  }

  bake(scene, 'tree', 130, 120, paintTree, 65, 70);
  bake(scene, 'bud', 28, 28, () => flower(0, 0, 1.05, false), 14, 14);
  bake(scene, 'bloom', 28, 28, () => flower(0, 0, 1.05, true), 14, 14);

  for (const kind of ['pebble', 'moss', 'thorn'] as const) {
    reseed(kind.length * 11);
    bake(scene, `golem-${kind}`, 100, 88, () => golem(0, 0, kind), 50, 78);
  }
  bake(scene, 'sprout', 70, 50, () => sprout(0, 0), 35, 40);
  for (const kind of ['beetle', 'slug', 'crow'] as const) bake(scene, `pest-${kind}`, 100, 60, () => pest(kind), 50, 34);
  bake(scene, 'slow', 50, 22, () => {
    for (let k = -1; k <= 1; k++) E(k * 18, k ? 0 : -6, 8, 6, '#8cd05a', shade);
  }, 25, 13);

  bake(scene, 'shot-pebble', 20, 20, () => E(0, 0, 12, 11, '#a8a49a', { print: false, sb: 3, sx: 2, sy: 4, sa: 0.3 }), 10, 10);
  bake(scene, 'shot-moss', 20, 20, () => E(0, 0, 12, 11, '#6fb048', { print: false, sb: 3, sx: 2, sy: 4, sa: 0.3 }), 10, 10);
  bake(scene, 'shot-thorn', 20, 20, () => Pp([[-10, 6], [14, -2], [-10, -8]], C.thornSpike, { print: false, sb: 3, rim: 2 }), 10, 10);

  bake(scene, 'sap', 24, 30, () => drop(0, 0, 1), 12, 16);
  bake(scene, 'glow', 64, 64, () => {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
    g.addColorStop(0, 'rgba(255,214,120,0.8)');
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-64, -64, 128, 128);
  }, 32, 32);
  bake(scene, 'splat', 50, 32, () => {
    reseed(40);
    Pp(
      Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * PI * 2;
        const r = k % 2 ? 16 : 30 + rnd() * 6;
        return [Math.cos(a) * r, Math.sin(a) * r * 0.45] as [number, number];
      }),
      '#e08a2a',
      { print: false, sb: 3, sx: 2, sy: 3, rim: 3 },
    );
  }, 25, 16);
  bake(scene, 'leaf', 32, 32, paintLeaf, 16, 16);

  for (const h of [84, 68]) {
    const w = SEED_BUTTONS.w * A - 8;
    const ha = h * A - 8;
    bake(scene, `card-${h}`, 150, h + 16, () => R(-w / 2, -ha / 2, w, ha, 22, C.card, { sb: 6, sa: 0.45, rim: 6 }), 75, h / 2 + 6);
    bake(scene, `card-${h}-dim`, 150, h + 16, () => R(-w / 2, -ha / 2, w, ha, 22, '#c4b48f', { sb: 6, sa: 0.45, rim: 6 }), 75, h / 2 + 6);
    bake(scene, `rim-${h}`, 150, h + 16, () => R(-w / 2 - 6, -ha / 2 - 6, w + 12, ha + 12, 26, C.gold, { sb: 6, rim: 6 }), 75, h / 2 + 6);
  }
  bake(scene, 'card-locked', 150, 84, paintLockedCard, 75, 40);
  bake(scene, 'btn-wave', 150, 64, () => R(-WAVE_BUTTON.w, -WAVE_BUTTON.h, WAVE_BUTTON.w * A, WAVE_BUTTON.h * A, 30, '#e0a23a', { sb: 8, sx: 5, sy: 9, rim: 8 }), 72, 28);
  bake(scene, 'btn-wave-off', 150, 64, () => R(-WAVE_BUTTON.w, -WAVE_BUTTON.h, WAVE_BUTTON.w * A, WAVE_BUTTON.h * A, 30, '#9c8a68', { sb: 8, sx: 5, sy: 9, rim: 8 }), 72, 28);
  bake(scene, 'btn', BUTTON.w + 16, BUTTON.h + 16, () => R(-BUTTON.w, -BUTTON.h, BUTTON.w * A, BUTTON.h * A, 30, '#e0a23a', { sb: 8, sx: 5, sy: 9, rim: 8 }), BUTTON.w / 2 + 6, BUTTON.h / 2 + 6);
}

function paintLeaf() {
  Pp([[-22, 20], [-12, -12], [18, -24], [22, 4], [-2, 24]], '#4ea548', { print: false, sb: 3, rim: 3 });
  ctx.strokeStyle = 'rgba(20,60,20,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(16, -18);
  ctx.stroke();
}

function paintTree() {
  Pp([[-40, 56], [-16, 30], [-12, -20], [12, -20], [16, 30], [44, 56]], '#8a5530', { sb: 8 });
  reseed(31);
  for (const [dx, dy, rx, ry, col] of [
    [-40, -30, 42, 36, '#3e8c3e'],
    [38, -32, 40, 34, '#45963f'],
    [0, -66, 50, 38, '#4ea548'],
    [-2, -22, 52, 38, '#57b04e'],
  ] as const) {
    E(dx, dy, rx, ry, col, { sb: 10 });
  }
}

/** Where the Heartwood's five flowers sit, in view pixels from its cell's centre. */
export const TREE_FLOWERS: readonly [number, number][] = [
  [-26, -20],
  [-7, -41],
  [15, -25],
  [26, -10],
  [-10, -6],
];

function paintLockedCard() {
  const w = SEED_BUTTONS.w * A - 8;
  const h = SEED_BUTTONS.hs[2] * A - 8;
  const x = -w / 2;
  const y = -h / 2;
  R(x, y, w, h, 22, '#b9ad94', { sb: 6, rim: 6 });
  const tx = x + 58;
  const ty = y + 66;
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2;
    Pp(
      [
        [tx + Math.cos(a - 0.25) * 26, ty + Math.sin(a - 0.25) * 30],
        [tx + Math.cos(a) * 46, ty + Math.sin(a) * 50],
        [tx + Math.cos(a + 0.25) * 26, ty + Math.sin(a + 0.25) * 30],
      ],
      '#6a5a40',
      { print: false, shadow: false, rim: 2 },
    );
  }
  E(tx, ty, 32, 36, '#7a6a4c', { shadow: false });
  ctx.restore();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#9a7a2a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(tx, ty - 6, 12, PI, 0);
  ctx.stroke();
  R(tx - 18, ty - 6, 36, 28, 8, C.gold, { sb: 3, print: false, rim: 3 });
  ellipse(tx, ty + 7, 4, 4, '#6a4a10');
}

function paintBackground() {
  // The studio table: warm wood with a vignette.
  ctx.fillStyle = C.table;
  ctx.fillRect(0, 0, W, H);
  reseed(3);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '255,220,170' : '20,10,4'},0.06)`;
    ctx.lineWidth = 2 + rnd() * 6;
    ctx.beginPath();
    const y = rnd() * H;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(600, y + rnd() * 40 - 20, 1300, y + rnd() * 40 - 20, W, y + rnd() * 30 - 15);
    ctx.stroke();
  }
  const vignette = () => {
    const vg = ctx.createRadialGradient(W * 0.4, H * 0.4, 300, W / 2, H / 2, 1200);
    vg.addColorStop(0, 'rgba(255,200,140,0.12)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    return vg;
  };
  ctx.fillStyle = vignette();
  ctx.fillRect(0, 0, W, H);

  // The garden slab.
  const bx = G.x;
  const by = G.y;
  const bw = G.cols * G.cell;
  const bh = G.rows * G.cell;
  R(bx - 6, by - 6, bw + 12, bh + 12, 34, C.grass, { sb: 18, sa: 0.6, sx: 14, sy: 18, rim: 14, spec: false, print: false });
  reseed(5);
  for (let i = 0; i < 900; i++) {
    const x = bx + 10 + rnd() * (bw - 20);
    const y = by + 10 + rnd() * (bh - 20);
    const r = 4 + rnd() * 7;
    ellipse(x, y, r, r * 0.7, rnd() < 0.5 ? 'rgba(255,255,220,0.10)' : 'rgba(20,50,10,0.12)', rnd() * PI);
  }

  // The path: a flattened ribbon of tan clay.
  const pathLine = () => {
    ctx.beginPath();
    ctx.moveTo(G.x - 6, PTS[0].y);
    PTS.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.save();
  ctx.filter = blur(6);
  ctx.translate(6, 8);
  pathLine();
  ctx.strokeStyle = 'rgba(20,40,10,0.55)';
  ctx.lineWidth = 122;
  ctx.stroke();
  ctx.restore();
  pathLine();
  ctx.strokeStyle = '#b8935e';
  ctx.lineWidth = 120;
  ctx.stroke();
  pathLine();
  ctx.strokeStyle = C.path;
  ctx.lineWidth = 108;
  ctx.stroke();
  ctx.save();
  ctx.filter = blur(10);
  ctx.translate(-6, -6);
  pathLine();
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = 56;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Pressed tool marks along the path.
  reseed(8);
  for (let d = 20; d < 1210; d += 22) {
    const p = pathPoint(d);
    const q = pathPoint(d + 1);
    const along = Math.abs(q.x - p.x) > Math.abs(q.y - p.y);
    const ox = (rnd() - 0.5) * 80;
    const oy = (rnd() - 0.5) * 80;
    const x = along ? p.x * A : p.x * A + ox;
    const y = along ? p.y * A + oy : p.y * A;
    if (x < G.x + 8) continue;
    ellipse(x + 1.5, y + 1.5, 5, 3, 'rgba(255,240,200,0.35)');
    ellipse(x, y, 5, 3, 'rgba(90,60,30,0.35)');
  }
  // The table again left of the board, where pests come in.
  ctx.fillStyle = C.table;
  ctx.fillRect(0, by - 20, G.x - 6, bh + 40);
  ctx.fillStyle = vignette();
  ctx.fillRect(0, by - 20, G.x - 6, bh + 40);

  // Soil beds: brown clay pads with pressed furrows.
  reseed(12);
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (MAP[r][c] !== 'soil') continue;
      const { x, y } = cc(c, r);
      const jx = (rnd() - 0.5) * 6;
      const jy = (rnd() - 0.5) * 6;
      R(x - 38 + jx, y - 28 + jy, 76, 54, 18, C.soil, { sb: 4, sa: 0.4, sx: 4, sy: 5, rim: 6 });
      for (let k = 0; k < 3; k++) {
        const fy = y - 14 + k * 14 + jy;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(40,18,6,0.55)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x - 26 + jx, fy);
        ctx.quadraticCurveTo(x + jx, fy + 3, x + 26 + jx, fy);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,180,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 26 + jx, fy + 4);
        ctx.quadraticCurveTo(x + jx, fy + 7, x + 26 + jx, fy + 4);
        ctx.stroke();
      }
    }
  }
  // Little clay grass tufts.
  reseed(14);
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (MAP[r][c] !== 'soil' || rnd() < 0.4) continue;
      const x = G.x + c * G.cell + 14 + rnd() * 100;
      const y = G.y + r * G.cell + (rnd() < 0.5 ? 14 : 112);
      for (let k = -1; k <= 1; k++) {
        Pp([[x + k * 7 - 4, y], [x + k * 9, y - 16 - (k === 0 ? 6 : 0)], [x + k * 7 + 4, y]], k ? '#5d9a3a' : '#80c050', {
          shadow: false,
          print: false,
          spec: false,
          rim: 2,
        });
      }
    }
  }

  // The HUD: a strip of rolled clay with tags pressed on.
  ctx.save();
  ctx.filter = blur(10);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 100, W, 18);
  ctx.restore();
  R(-20, -30, W + 40, 136, 30, C.hud, { shadow: false, rim: 10, spec: false, print: false });
  const tag = (x: number, w: number, col = C.tag) => R(x * A, 28, w * A, 72, 30, col, { sb: 5, sx: 4, sy: 6, rim: 6 });
  tag(HUD.wave.x, HUD.wave.w);
  tag(HUD.leaf.x, HUD.leaf.w);
  tag(HUD.sap.x, HUD.sap.w);
  tag(HUD.bloom.x, HUD.bloom.w, '#d8e6b0');

  // The panel: a slab of moss-green clay; the cards are stuck on by the scene.
  R(PANEL.x * A, PANEL.y * A, PANEL.w * A, PANEL.h * A, 28, C.hud, { sb: 16, sa: 0.55, sx: 10, sy: 14, rim: 12, spec: false });
  R(PREVIEW.x * A, PREVIEW.y * A, PREVIEW.w * A, PREVIEW.h * A, 20, '#2f4422', { sb: 4, rim: 6, sa: 0.35 });
}
