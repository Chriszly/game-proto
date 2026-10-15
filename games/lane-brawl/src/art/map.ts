// Paints the whole 2400x1600 map once at boot onto one canvas: faceted grass, flagstone lanes with
// stone kerbs, paved plazas round the Nexuses, dirt clearings for the camps, the guardian beast's
// pit, patches of tall grass (the bushes), and low-poly pines and rocks rendered with the same renderer as the units. The same seed paints the same map every time.

import Phaser from 'phaser';
import { BASE, BEAST, BUSHES, Bush, CAMPS, LANES, Team, Vec, WORLD } from '../game/data';
import { sharpRes } from '../../../../shared/scaling';
import { render, seeded } from './lowpoly';
import { TEAM_GLOW, pineModel, rockModel } from './models';

export const MAP_KEY = 'lb-map';
/** Canvas pixels per world pixel in the map's texture: 1, or more on a big screen (see `sharpRes`). */
export let MAP_RES = 1;
/** Half the width of a lane's paving, in pixels. */
const LANE_HALF = 50;

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** The distance from a point to the nearest lane's centre line. */
function laneDist(p: Vec): number {
  let best = Infinity;
  for (const lane of Object.values(LANES)) {
    for (let i = 0; i < lane.length - 1; i++) best = Math.min(best, segDist(p, lane[i], lane[i + 1]));
  }
  return best;
}
function segDist(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function grass(ctx: CanvasRenderingContext2D, rnd: () => number) {
  const cell = 56;
  const cols = Math.ceil(WORLD.w / cell) + 1;
  const rows = Math.ceil(WORLD.h / cell) + 1;
  const pts: Vec[][] = [];
  for (let r = 0; r <= rows; r++) {
    pts.push([]);
    for (let c = 0; c <= cols; c++) {
      const edge = r === 0 || c === 0 || r === rows || c === cols;
      pts[r].push({ x: c * cell + (edge ? 0 : (rnd() - 0.5) * cell * 0.55), y: r * cell + (edge ? 0 : (rnd() - 0.5) * cell * 0.55) });
    }
  }
  const tri = (a: Vec, b: Vec, c: Vec) => {
    // Each facet tilts a little at random: lit from the top left, some catch more light.
    const cx = (a.x + b.x + c.x) / 3;
    const patch = 0.06 * Math.sin(cx / 260) + 0.05 * Math.cos((a.y + b.y + c.y) / 3 / 210 + cx / 400);
    const k = 0.9 + rnd() * 0.2 + patch;
    ctx.fillStyle = shade('#4f8d44', k);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.lineWidth = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p00 = pts[r][c], p10 = pts[r][c + 1], p01 = pts[r + 1][c], p11 = pts[r + 1][c + 1];
      if ((r + c) % 2) {
        tri(p00, p10, p11);
        tri(p00, p11, p01);
      } else {
        tri(p00, p10, p01);
        tri(p10, p11, p01);
      }
    }
  }
  // A few grass tufts: small pale triangles.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
    if (laneDist({ x, y }) < LANE_HALF + 12) continue;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(160,210,120,0.55)' : 'rgba(40,90,40,0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y - 8);
    ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fill();
  }
}

/** The lane band as a clip path: a rectangle per segment and a disc at each joint. */
function lanePath(ctx: CanvasRenderingContext2D, half: number) {
  ctx.beginPath();
  for (const lane of Object.values(LANES)) {
    for (let i = 0; i < lane.length - 1; i++) {
      const a = lane[i], b = lane[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const nx = (-(b.y - a.y) / len) * half, ny = ((b.x - a.x) / len) * half;
      ctx.moveTo(a.x + nx, a.y + ny);
      ctx.lineTo(b.x + nx, b.y + ny);
      ctx.lineTo(b.x - nx, b.y - ny);
      ctx.lineTo(a.x - nx, a.y - ny);
      ctx.closePath();
    }
    for (const p of lane) {
      ctx.moveTo(p.x + half, p.y);
      ctx.arc(p.x, p.y, half, 0, Math.PI * 2);
    }
  }
}

function lanes(ctx: CanvasRenderingContext2D, rnd: () => number) {
  // A soft dark verge under the paving, then the grout, then the flagstones.
  ctx.save();
  lanePath(ctx, LANE_HALF + 10);
  ctx.fillStyle = 'rgba(30,50,25,0.35)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  lanePath(ctx, LANE_HALF);
  ctx.fillStyle = '#9b8058';
  ctx.fill();
  ctx.clip();
  const stone = 30;
  for (const lane of Object.values(LANES)) {
    for (let i = 0; i < lane.length - 1; i++) {
      const a = lane[i], b = lane[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const vx = -uy, vy = ux;
      for (let u = -LANE_HALF; u < len + LANE_HALF; u += stone) {
        let row = 0;
        for (let v = -LANE_HALF - 10; v < LANE_HALF + 10; v += stone * 0.86, row++) {
          const off = (Math.floor(u / stone) % 2) * stone * 0.43;
          const p = (du: number, dv: number) => {
            const uu = u + du + (rnd() - 0.5) * 3.5;
            const vv = v + off + dv + (rnd() - 0.5) * 3.5;
            return { x: a.x + ux * uu + vx * vv, y: a.y + uy * uu + vy * vv };
          };
          const g = 2.2;
          const q = [p(g, g), p(stone - g, g), p(stone - g, stone * 0.86 - g), p(g, stone * 0.86 - g)];
          const k = 0.88 + rnd() * 0.22;
          // Two halves of each stone in slightly different light: a faceted, chiselled look.
          ctx.fillStyle = shade('#d2b483', k * 1.04);
          ctx.beginPath();
          ctx.moveTo(q[0].x, q[0].y);
          ctx.lineTo(q[1].x, q[1].y);
          ctx.lineTo(q[3].x, q[3].y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade('#d2b483', k * 0.93);
          ctx.beginPath();
          ctx.moveTo(q[1].x, q[1].y);
          ctx.lineTo(q[2].x, q[2].y);
          ctx.lineTo(q[3].x, q[3].y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

function kerbs(ctx: CanvasRenderingContext2D, rnd: () => number) {
  const spots: Vec[] = [];
  for (const lane of Object.values(LANES)) {
    for (let i = 0; i < lane.length - 1; i++) {
      const a = lane[i], b = lane[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      for (let u = 0; u < len; u += 30) {
        for (const side of [-1, 1]) {
          const p = { x: a.x + ux * u - uy * side * (LANE_HALF + 3), y: a.y + uy * u + ux * side * (LANE_HALF + 3) };
          if (laneDist(p) < LANE_HALF - 2) continue;
          if (Math.hypot(p.x - BASE.blue.x, p.y - BASE.blue.y) < 250 || Math.hypot(p.x - BASE.red.x, p.y - BASE.red.y) < 250) continue;
          spots.push(p);
        }
      }
    }
  }
  spots.sort((p, q) => p.y - q.y);
  for (const p of spots) render(ctx, rockModel(5 + rnd() * 2.5, Math.floor(rnd() * 3)), p.x, p.y + 2, 1, { yaw: rnd() * 6 });
}

function plaza(ctx: CanvasRenderingContext2D, team: Team, rnd: () => number) {
  const c = BASE[team];
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, 236, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,50,25,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c.x, c.y, 226, 0, Math.PI * 2);
  ctx.fillStyle = '#8d8a85';
  ctx.fill();
  ctx.clip();
  // Rings of paving stones.
  for (let r = 20; r < 230; r += 26) {
    const n = Math.max(6, Math.round((Math.PI * 2 * r) / 30));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + r * 0.1;
      const a1 = ((i + 1) / n) * Math.PI * 2 + r * 0.1 - 0.06 * (30 / r);
      const k = 0.9 + rnd() * 0.2;
      ctx.fillStyle = shade('#b9b5ad', k);
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 23, a0, a1);
      ctx.arc(c.x, c.y, r, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  // An inlaid ring in the team's colour.
  ctx.strokeStyle = TEAM_GLOW[team];
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function clearing(ctx: CanvasRenderingContext2D, c: Vec, rnd: () => number) {
  const n = 11;
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 100 + (rnd() - 0.5) * 22;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.9 };
  });
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    ctx.fillStyle = shade('#8a6d48', 0.88 + rnd() * 0.22);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let i = 0; i < n; i += 2) render(ctx, rockModel(6 + rnd() * 3, i % 3), ring[i].x, ring[i].y, 1, { yaw: rnd() * 6 });
}

/** The guardian beast's pit: a ring of dark flagstones round a sunken floor, with standing stones. */
function pit(ctx: CanvasRenderingContext2D, rnd: () => number) {
  const c = { x: BEAST.x, y: BEAST.y };
  const n = 14;
  ctx.fillStyle = 'rgba(25,30,40,0.35)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 4, 132, 104, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [r, base] of [[124, '#6f6c78'], [96, '#4f4b5c']] as const) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.fillStyle = shade(base, 0.86 + rnd() * 0.26);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(a0) * r, c.y + Math.sin(a0) * r * 0.8);
      ctx.lineTo(c.x + Math.cos(a1) * r, c.y + Math.sin(a1) * r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // A faint violet glow in the floor, the colour of the beast's crystals.
  ctx.strokeStyle = 'rgba(185,140,255,0.45)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 70, 56, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    render(ctx, rockModel(7 + rnd() * 3, i % 3), c.x + Math.cos(a) * 126, c.y + Math.sin(a) * 101, 1, { yaw: rnd() * 6 });
  }
}

/** A patch of tall grass: a dark bed with clumps of faceted blades, lighter at the tips. */
function bush(ctx: CanvasRenderingContext2D, b: Bush, rnd: () => number) {
  ctx.fillStyle = 'rgba(20,45,22,0.45)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx + 4, b.ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f5f2c';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const tufts: Vec[] = [];
  for (let i = 0; i < 400 && tufts.length < Math.round((b.rx * b.ry) / 110); i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.92;
    tufts.push({ x: b.x + Math.cos(a) * b.rx * r, y: b.y + Math.sin(a) * b.ry * r });
  }
  tufts.sort((p, q) => p.y - q.y);
  for (const t of tufts) {
    for (let j = 0; j < 4; j++) {
      const lean = (j - 1.5) * 3 + (rnd() - 0.5) * 3;
      const h = 14 + rnd() * 9;
      const w = 3.2;
      const x = t.x + (j - 1.5) * 2.6;
      // Two facets per blade: the left one catches the light from the top left.
      ctx.fillStyle = shade('#5c9a3e', 0.95 + rnd() * 0.25);
      ctx.beginPath();
      ctx.moveTo(x - w, t.y);
      ctx.lineTo(x + lean, t.y - h);
      ctx.lineTo(x, t.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade('#3d7430', 0.9 + rnd() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, t.y);
      ctx.lineTo(x + lean, t.y - h);
      ctx.lineTo(x + w, t.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(214,230,140,0.55)';
      ctx.beginPath();
      ctx.moveTo(x + lean * 0.75 - 1, t.y - h * 0.75);
      ctx.lineTo(x + lean, t.y - h);
      ctx.lineTo(x + lean * 0.75 + 1, t.y - h * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function scenery(ctx: CanvasRenderingContext2D, rnd: () => number) {
  const things: { x: number; y: number; kind: 'pine' | 'rock'; s: number; v: number }[] = [];
  for (let i = 0; i < 1400 && things.length < 260; i++) {
    const p = { x: 20 + rnd() * (WORLD.w - 40), y: 30 + rnd() * (WORLD.h - 40) };
    if (laneDist(p) < LANE_HALF + 48) continue;
    if (Math.hypot(p.x - BASE.blue.x, p.y - BASE.blue.y) < 290 || Math.hypot(p.x - BASE.red.x, p.y - BASE.red.y) < 290) continue;
    if (CAMPS.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < 150)) continue;
    if (Math.hypot(p.x - BEAST.x, p.y - BEAST.y) < 175) continue;
    if (BUSHES.some((b) => ((p.x - b.x) / (b.rx + 40)) ** 2 + ((p.y - b.y) / (b.ry + 40)) ** 2 < 1)) continue;
    if (things.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 46)) continue;
    things.push({ ...p, kind: rnd() < 0.85 ? 'pine' : 'rock', s: 0.8 + rnd() * 0.5, v: Math.floor(rnd() * 4) });
  }
  things.sort((a, b) => a.y - b.y);
  for (const t of things) {
    // A soft shadow to the bottom right, away from the light.
    ctx.fillStyle = 'rgba(20,40,20,0.28)';
    ctx.beginPath();
    ctx.ellipse(t.x + 10 * t.s, t.y + 3, (t.kind === 'pine' ? 18 : 11) * t.s, 7 * t.s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.kind === 'pine') render(ctx, pineModel(t.v), t.x, t.y, t.s, { yaw: t.v });
    else render(ctx, rockModel(9, t.v), t.x, t.y, t.s, { yaw: t.v });
  }
}

/** Paints the map into a canvas texture once. */
export function paintMap(scene: Phaser.Scene) {
  if (scene.textures.exists(MAP_KEY)) return;
  MAP_RES = sharpRes(WORLD.w, WORLD.h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(WORLD.w * MAP_RES);
  canvas.height = Math.round(WORLD.h * MAP_RES);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(canvas.width / WORLD.w, canvas.height / WORLD.h);
  const rnd = seeded(20261014);
  grass(ctx, rnd);
  for (const c of CAMPS) clearing(ctx, c, rnd);
  // The pit and the bushes draw from their own seed, so the rest of the map stays as it was.
  const rnd2 = seeded(20261015);
  pit(ctx, rnd2);
  lanes(ctx, rnd);
  plaza(ctx, 'blue', rnd);
  plaza(ctx, 'red', rnd);
  kerbs(ctx, rnd);
  for (const b of BUSHES) bush(ctx, b, rnd2);
  scenery(ctx, rnd);
  // A dark frame round the edge of the world.
  ctx.strokeStyle = 'rgba(15,28,18,0.85)';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  scene.textures.addCanvas(MAP_KEY, canvas);
}
