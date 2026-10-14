// The flat vector art of Lane Brawl's units, towers and projectiles, drawn with Phaser's Graphics.
// Every shape is a few filled layers: a team ring, the body, shading, a face and the champion's
// gear. Attack swings and hit flashes come from the unit's own timers.

import Phaser from 'phaser';
import { SIDE_COLOR } from '../game/data';
import { Projectile, Unit } from '../game/state';

type G = Phaser.GameObjects.Graphics;

const INK = 0x1d2430;
const WHITE = 0xffffff;

/** A CSS hex colour as a number Phaser's Graphics take. */
export function hex(c: string): number {
  return parseInt(c.slice(1), 16);
}

/** A rectangle w by h, centred on (x, y) and turned by `a` radians. */
function rect(g: G, x: number, y: number, w: number, h: number, a: number, color: number, alpha = 1) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([px, py]) => new Phaser.Math.Vector2(x + px * c - py * s, y + px * s + py * c));
  g.fillStyle(color, alpha).fillPoints(pts, true);
}

/** A line of `width` pixels from (x1, y1) to (x2, y2). */
function stroke(g: G, x1: number, y1: number, x2: number, y2: number, width: number, color: number) {
  g.lineStyle(width, color, 1).lineBetween(x1, y1, x2, y2);
}

/** Two eyes on the front half of a round body. */
function eyes(g: G, x: number, y: number, r: number, facing: number) {
  const fx = Math.cos(facing);
  const fy = Math.sin(facing);
  const px = -fy;
  const py = fx;
  for (const side of [-1, 1]) {
    const ex = x + fx * r * 0.42 + px * r * 0.32 * side;
    const ey = y + fy * r * 0.42 + py * r * 0.32 * side;
    g.fillStyle(INK, 1).fillCircle(ex, ey, Math.max(1.6, r * 0.12));
    g.fillStyle(WHITE, 1).fillCircle(ex + fx * 0.8, ey + fy * 0.8 - 0.8, Math.max(0.7, r * 0.04));
  }
}

/** Round body with a team ring, a lit top and a shaded underside. */
function body(g: G, x: number, y: number, r: number, side: Unit['side'], color: number) {
  g.fillStyle(INK, 1).fillCircle(x, y, r + 3);
  g.fillStyle(hex(SIDE_COLOR[side]), 1).fillCircle(x, y, r + 1.5);
  g.fillStyle(color, 1).fillCircle(x, y, r);
  g.fillStyle(0x000000, 0.2).fillCircle(x, y + r * 0.35, r * 0.85);
  g.fillStyle(color, 1).fillCircle(x, y - r * 0.06, r * 0.88);
  g.fillStyle(WHITE, 0.22).fillCircle(x - r * 0.32, y - r * 0.4, r * 0.38);
}

/** A champion: body, face and the gear that tells the classes apart. The swing timer moves the gear. */
export function drawChampion(g: G, u: Unit, time: number) {
  const c = u.champ!;
  const r = u.radius;
  const bob = Math.sin(u.walk / 5) * 1.2;
  const x = u.x;
  const y = u.y + bob;
  const f = u.facing;
  const fx = Math.cos(f);
  const fy = Math.sin(f);
  const swing = u.swing / 180;
  const lunge = Math.sin(swing * Math.PI) * r * 0.5;

  g.fillStyle(0x000000, 0.25).fillEllipse(u.x, u.y + r * 0.9, r * 2.3, r * 0.8);
  if (u.player) g.lineStyle(2, WHITE, 0.9).strokeCircle(u.x, u.y, r + 7);

  switch (c.id) {
    case 'warden': {
      // Shield in front, pushed forward on a bash.
      const sx = x + fx * (r + 4 + lunge);
      const sy = y + fy * (r + 4 + lunge);
      rect(g, sx, sy, 8, 26, f, INK);
      rect(g, sx, sy, 5, 20, f, 0x9aa7b8);
      body(g, x, y, r, u.side, hex(c.color));
      eyes(g, x, y, r, f);
      break;
    }
    case 'blade': {
      body(g, x, y, r, u.side, hex(c.color));
      eyes(g, x, y, r, f);
      // Two daggers, angled out and forward; they flick on a swing.
      for (const side of [-1, 1]) {
        const a = f + side * (0.55 + swing * 0.9 * -side);
        const bx = x + Math.cos(a) * (r * 0.4);
        const by = y + Math.sin(a) * (r * 0.4);
        rect(g, bx + Math.cos(a) * 11, by + Math.sin(a) * 11, 22, 3, a, INK);
        rect(g, bx + Math.cos(a) * 11, by + Math.sin(a) * 11, 18, 1.6, a, 0xe8edf5);
      }
      break;
    }
    case 'archer': {
      // A bow in front that draws back on a shot.
      const bowX = x + fx * (r + 6);
      const bowY = y + fy * (r + 6);
      const pull = swing * r * 0.7;
      g.lineStyle(3, 0x6b4a2b, 1);
      g.beginPath();
      const pts = [-1.1, -0.55, 0, 0.55, 1.1].map((k) => ({ px: bowX + Math.cos(f + k) * 14, py: bowY + Math.sin(f + k) * 14 }));
      g.moveTo(pts[0].px, pts[0].py);
      for (const p of pts.slice(1)) g.lineTo(p.px, p.py);
      g.strokePath();
      stroke(g, pts[0].px, pts[0].py, pts[4].px, pts[4].py, 1, 0xe8edf5);
      stroke(g, pts[0].px, pts[0].py, bowX - fx * pull, bowY - fy * pull, 1.4, 0xe8edf5);
      body(g, x, y, r, u.side, hex(c.color));
      eyes(g, x, y, r, f);
      break;
    }
    case 'mage': {
      // A staff with a glowing orb; the orb pulses.
      const tipX = x + fx * (r + 16);
      const tipY = y + fy * (r + 16);
      stroke(g, x + fx * r * 0.3, y + fy * r * 0.3, tipX, tipY, 3, 0x6b4a2b);
      const pulse = 0.5 + 0.5 * Math.sin(time / 180);
      g.fillStyle(hex(c.color), 0.3 + 0.2 * pulse).fillCircle(tipX, tipY, 9 + pulse * 2);
      g.fillStyle(hex(c.color), 1).fillCircle(tipX, tipY, 5);
      g.fillStyle(WHITE, 0.7).fillCircle(tipX - 1.5, tipY - 1.5, 1.6);
      body(g, x, y, r, u.side, hex(c.color));
      eyes(g, x, y, r, f);
      break;
    }
    case 'priest': {
      // A gold halo over the head and a green focus light in front.
      g.lineStyle(2.5, 0xf4d35e, 1).strokeEllipse(x, y - r - 6, r * 1.5, 7);
      body(g, x, y, r, u.side, hex(c.color));
      eyes(g, x, y, r, f);
      g.fillStyle(0xbff5c9, 0.9).fillCircle(x + fx * (r + 6), y + fy * (r + 6), 4);
      break;
    }
  }

  // A hit flashes the body white, then fades.
  if (u.flash > 0) g.fillStyle(WHITE, 0.6 * (u.flash / 120)).fillCircle(x, y, r);
}

/** A minion: a small round body in its team's colour, a helmet band and eyes. */
export function drawMinion(g: G, u: Unit) {
  const r = u.radius;
  const wobble = Math.sin(u.swing / 180 * Math.PI) * 2;
  const x = u.x + Math.cos(u.facing) * wobble;
  const y = u.y + Math.sin(u.facing) * wobble;
  g.fillStyle(0x000000, 0.25).fillEllipse(u.x, u.y + r * 0.9, r * 2.1, r * 0.7);
  body(g, x, y, r, u.side, hex(SIDE_COLOR[u.side]));
  g.fillStyle(INK, 0.55).fillRect(x - r, y - r * 0.55, r * 2, 2.5);
  eyes(g, x, y, r, u.facing);
  if (u.flash > 0) g.fillStyle(WHITE, 0.6 * (u.flash / 120)).fillCircle(x, y, r);
}

/** A tower: a stone keep with crenellations and a team banner. */
export function drawTower(g: G, u: Unit) {
  const r = u.radius;
  const x = u.x;
  const y = u.y;
  g.fillStyle(0x000000, 0.25).fillRect(x - r + 4, y - r + 6, r * 2, r * 2);
  g.fillStyle(INK, 1).fillRect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
  g.fillStyle(0x8a94a3, 1).fillRect(x - r, y - r, r * 2, r * 2);
  g.fillStyle(0x6e7889, 1);
  for (const k of [-0.5, 0, 0.5]) g.fillRect(x - r + 3, y + k * r * 0.9 - 1, r * 2 - 6, 1.5);
  // Battlements along the top edge.
  g.fillStyle(0xa9b2bf, 1);
  for (const k of [-0.66, 0, 0.66]) g.fillRect(x + k * r - 4, y - r - 5, 8, 6);
  // The team banner on a pole.
  stroke(g, x, y - r * 0.1, x, y - r * 0.1 - 18, 2, INK);
  g.fillStyle(hex(SIDE_COLOR[u.side]), 1).fillPoints([
    new Phaser.Math.Vector2(x, y - r * 0.1 - 18),
    new Phaser.Math.Vector2(x + 12, y - r * 0.1 - 15),
    new Phaser.Math.Vector2(x, y - r * 0.1 - 11),
  ], true);
  g.fillStyle(WHITE, 0.85).fillCircle(x, y, 5);
  g.fillStyle(hex(SIDE_COLOR[u.side]), 1).fillCircle(x, y, 3);
  if (u.flash > 0) g.fillStyle(WHITE, 0.6 * (u.flash / 120)).fillRect(x - r, y - r, r * 2, r * 2);
}

/** The Nexus: a crystal in a glowing ring that breathes. */
export function drawNexus(g: G, u: Unit, time: number) {
  const r = u.radius;
  const x = u.x;
  const y = u.y;
  const breathe = 0.5 + 0.5 * Math.sin(time / 300);
  g.fillStyle(hex(SIDE_COLOR[u.side]), 0.15 + 0.1 * breathe).fillCircle(x, y, r + 14 + breathe * 4);
  g.fillStyle(INK, 1).fillCircle(x, y, r + 4);
  g.fillStyle(0x3a4658, 1).fillCircle(x, y, r);
  g.fillStyle(hex(SIDE_COLOR[u.side]), 1).fillCircle(x, y, r * 0.78);
  const crystal = [
    new Phaser.Math.Vector2(x, y - r * 0.6),
    new Phaser.Math.Vector2(x + r * 0.34, y),
    new Phaser.Math.Vector2(x, y + r * 0.6),
    new Phaser.Math.Vector2(x - r * 0.34, y),
  ];
  g.fillStyle(WHITE, 0.9).fillPoints(crystal, true);
  g.fillStyle(WHITE, 0.25 + 0.3 * breathe).fillCircle(x, y, r * 0.42);
  if (u.flash > 0) g.fillStyle(WHITE, 0.5 * (u.flash / 120)).fillCircle(x, y, r);
}

/** A jungle camp monster: a brown boar with tusks. */
export function drawCamp(g: G, u: Unit) {
  const r = u.radius;
  const x = u.x;
  const y = u.y;
  g.fillStyle(0x000000, 0.25).fillEllipse(x, y + r * 0.9, r * 2.3, r * 0.8);
  g.fillStyle(hex(SIDE_COLOR.neutral), 1).fillCircle(x, y, r + 3);
  g.fillStyle(0x7a5c3a, 1).fillCircle(x, y, r);
  g.fillStyle(0x5a4128, 1).fillCircle(x, y + r * 0.3, r * 0.75);
  for (const side of [-1, 1]) {
    g.fillStyle(WHITE, 1).fillTriangle(x + side * r * 0.3, y + r * 0.2, x + side * r * 0.62, y + r * 0.3, x + side * r * 0.42, y - r * 0.2);
    g.fillStyle(INK, 1).fillCircle(x + side * r * 0.4, y - r * 0.3, r * 0.14);
  }
  if (u.flash > 0) g.fillStyle(WHITE, 0.6 * (u.flash / 120)).fillCircle(x, y, r);
}

/** A projectile: a bright streak in the direction it flies, with a head. */
export function drawProjectile(g: G, p: Projectile) {
  const speed = Math.hypot(p.vx, p.vy) || 1;
  const dx = p.vx / speed;
  const dy = p.vy / speed;
  const tail = p.width >= 28 ? 16 : 11;
  g.lineStyle(4, hex(p.color), 0.35).lineBetween(p.x - dx * tail * 1.6, p.y - dy * tail * 1.6, p.x, p.y);
  g.lineStyle(2, hex(p.color), 1).lineBetween(p.x - dx * tail, p.y - dy * tail, p.x, p.y);
  g.fillStyle(WHITE, 1).fillCircle(p.x, p.y, 3);
}
