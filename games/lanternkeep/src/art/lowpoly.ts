import Phaser from 'phaser';
import { JAR, LANTERN_SPOTS } from '../game/places';
import type { MothKind } from '../game/state';

// The low-poly look: every object is flat polygons, split into a lit face (turned to the upper left,
// where the light comes from) and a shaded face, with a soft drop shadow under it. Everything is
// drawn with Phaser Graphics in view pixels, so it stays sharp at any scale.

export type Pt = readonly [number, number];

const SHADOW = 0x05060e;

/** A seeded random number in [0, 1), so the facets and stars are the same on every run. */
export function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blends colour `a` towards `b` by `t` (0 is `a`, 1 is `b`). */
export function mix(a: number, b: number, t: number) {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Lighter (amount > 0) or darker (amount < 0) by a small step. */
export const tone = (c: number, amount: number) => (amount >= 0 ? mix(c, 0xffffff, amount) : mix(c, 0x000000, -amount));

/** One flat polygon in one colour. */
export function poly(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], color: number, alpha = 1) {
  g.fillStyle(color, alpha).fillPoints(
    pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)),
    true,
  );
}

/** A soft drop shadow under a rounded thing: three nested ellipses, the widest the faintest. */
export function dropShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, alpha = 0.3) {
  for (const k of [1.5, 1.2, 1]) g.fillStyle(SHADOW, alpha / 3).fillEllipse(x, y, rx * 2 * k, ry * 2 * k);
}

/** A soft drop shadow under a rectangle, cast `dx`, `dy` away from it. */
export function boxShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, dx: number, dy: number, alpha = 0.3) {
  for (const k of [6, 4, 2]) g.fillStyle(SHADOW, alpha / 3).fillRect(x + dx - k, y + dy - k, w + 2 * k, h + 2 * k);
}

/**
 * A rectangle split into a grid of cells, each cut across its diagonal into two triangles of
 * slightly different tones. Gives a stone or wood face its faceted look.
 */
export function facetRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, base: number, rnd: () => number, cell = 44) {
  const cols = Math.max(1, Math.round(w / cell));
  const rows = Math.max(1, Math.round(h / cell));
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = x + c * cw;
      const y0 = y + r * ch;
      const x1 = x0 + cw;
      const y1 = y0 + ch;
      const a = tone(base, (rnd() - 0.5) * 0.14);
      const b = tone(base, (rnd() - 0.5) * 0.14);
      if (rnd() < 0.5) {
        poly(g, [[x0, y0], [x1, y0], [x0, y1]], a);
        poly(g, [[x1, y0], [x1, y1], [x0, y1]], b);
      } else {
        poly(g, [[x0, y0], [x1, y0], [x1, y1]], a);
        poly(g, [[x0, y0], [x1, y1], [x0, y1]], b);
      }
    }
  }
}

/**
 * A block seen from the front and a little from the right: a lit front face, a shaded side face
 * and a lighter top, each `d` pixels deep.
 */
function block(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  d: number,
  faces: { front: number; side: number; top: number },
  rnd: () => number,
) {
  poly(g, [[x, y], [x + d, y - d], [x + w + d, y - d], [x + w, y]], faces.top);
  poly(g, [[x + w, y], [x + w + d, y - d], [x + w + d, y + h - d], [x + w, y + h]], faces.side);
  facetRect(g, x, y, w, h, faces.front, rnd);
}

/** A row of merlons on a top edge, skipping any that a lantern spot would cover. */
function merlons(g: Phaser.GameObjects.Graphics, x0: number, x1: number, top: number, faces: { front: number; side: number; top: number }) {
  for (let x = x0; x + 12 <= x1; x += 24) {
    if (LANTERN_SPOTS.some((s) => Math.abs(x + 6 - s.x) < 18 && Math.abs(top + 12 - (s.y + 16)) < 8)) continue;
    poly(g, [[x, top + 12], [x + 12, top + 12], [x + 12, top], [x, top]], faces.front);
    poly(g, [[x + 12, top + 12], [x + 16, top + 8], [x + 16, top - 2], [x + 12, top]], faces.side);
    poly(g, [[x, top], [x + 4, top - 4], [x + 16, top - 4], [x + 12, top]], faces.top);
  }
}

/** The castle: the curtain wall, two towers, the keep and its gate, on a grassy green. */
export function drawCastle(g: Phaser.GameObjects.Graphics) {
  const rnd = seeded(3);
  const wall = { front: 0x5d6482, side: 0x3b3f57, top: 0x7d84a6 };
  const tower = { front: 0x6b7293, side: 0x41455f, top: 0x8c93b3 };
  const keep = { front: 0x737a9b, side: 0x454a66, top: 0x9298b8 };
  const slit = 0x14162a;

  // The ground, grass in lit and shaded facets.
  poly(g, [[0, 500], [960, 500], [960, 540], [0, 540]], 0x22301f);
  for (let x = -20; x < 960; x += 60) {
    poly(g, [[x, 500], [x + 60, 500], [x + 30, 512]], rnd() < 0.5 ? 0x2e4129 : 0x293a25);
  }

  // Soft shadows the castle casts on the grass.
  boxShadow(g, 40, 500, 880, 4, 12, 8, 0.45);
  boxShadow(g, 120, 500, 100, 4, 14, 10, 0.4);
  boxShadow(g, 740, 500, 100, 4, 14, 10, 0.4);
  boxShadow(g, 400, 500, 160, 4, 16, 10, 0.4);

  // The curtain wall, with its walk along the top.
  block(g, 40, 320, 880, 180, 10, wall, rnd);
  merlons(g, 40, 920, 308, wall);

  // The two towers and the keep.
  for (const x of [120, 740]) {
    block(g, x, 200, 100, 300, 14, tower, rnd);
    merlons(g, x, x + 112, 188, tower);
    poly(g, [[x + 44, 250], [x + 54, 250], [x + 54, 276], [x + 44, 276]], slit);
    poly(g, [[x + 44, 330], [x + 54, 330], [x + 54, 356], [x + 44, 356]], slit);
    poly(g, [[x + 44, 330], [x + 47, 330], [x + 47, 356], [x + 44, 356]], tone(slit, 0.25));
  }
  block(g, 400, 128, 160, 372, 16, keep, rnd);
  merlons(g, 400, 572, 116, keep);
  for (const x of [432, 516]) {
    poly(g, [[x, 300], [x + 14, 300], [x + 14, 330], [x, 330]], slit);
    poly(g, [[x, 300], [x + 14, 300], [x + 14, 302], [x, 302]], tone(slit, 0.3));
  }

  // The gate: a pointed arch over a planked door with iron bands.
  poly(g, [[440, 500], [440, 430], [452, 410], [468, 400], [492, 400], [508, 410], [520, 430], [520, 500]], 0x14162a);
  poly(g, [[450, 500], [450, 430], [458, 418], [470, 410], [480, 408], [480, 500]], 0x4a3424);
  poly(g, [[480, 500], [480, 408], [492, 410], [502, 418], [510, 430], [510, 500]], 0x33231a);
  for (const x of [462, 470, 490, 498]) poly(g, [[x, 420], [x + 2, 420], [x + 2, 500], [x, 500]], 0x2a1c14);
  poly(g, [[450, 440], [480, 440], [480, 444], [450, 444]], 0x26262e);
  poly(g, [[480, 440], [510, 440], [510, 444], [480, 444]], 0x1a1a22);
}

/** A lantern's colours, lit or dark. */
const LAMP = {
  lit: { left: 0xfff1b0, right: 0xf2b050, flame: 0xff9a2e, core: 0xfff8d8 },
  dark: { left: 0x6d7596, right: 0x3e4462, flame: 0x000000, core: 0x000000 },
} as const;
const IRON = { lit: 0x4a4a56, shade: 0x26262e };

/**
 * A hanging lantern centred on (x, y): a cap, a glass body in a lit and a shaded face, and a flame
 * when lit. Its shadow falls on the wall to the lower right.
 */
export function drawLantern(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean, flicker = 0) {
  dropShadow(g, x + 5, y + 12, 11, 5, 0.35);
  const c = lit ? LAMP.lit : LAMP.dark;
  // Cap and base.
  poly(g, [[x - 10, y - 18], [x + 10, y - 18], [x + 7, y - 12], [x - 7, y - 12]], IRON.lit);
  poly(g, [[x, y - 18], [x + 10, y - 18], [x + 7, y - 12], [x, y - 12]], IRON.shade);
  poly(g, [[x - 9, y + 10], [x + 9, y + 10], [x + 7, y + 15], [x - 7, y + 15]], IRON.shade);
  // Glass in two faces.
  poly(g, [[x - 7, y - 12], [x, y - 12], [x, y + 10], [x - 7, y + 10]], c.left);
  poly(g, [[x, y - 12], [x + 7, y - 12], [x + 7, y + 10], [x, y + 10]], c.right);
  if (lit) {
    // The flame's tip wavers by `flicker` (0 when reduce motion is on).
    const tip = y - 8 - flicker * 2;
    poly(g, [[x, tip], [x + 4, y + 6], [x - 4, y + 6]], c.flame);
    poly(g, [[x, y - 3], [x + 2, y + 5], [x - 2, y + 5]], c.core);
  } else {
    poly(g, [[x - 4, y - 8], [x - 2, y - 8], [x - 2, y - 1], [x - 4, y - 1]], 0xc9d2ee, 0.5);
  }
  // Frame bars down each side, lit on the left and shaded on the right.
  poly(g, [[x - 9, y - 12], [x - 7, y - 12], [x - 7, y + 10], [x - 9, y + 10]], IRON.lit);
  poly(g, [[x + 7, y - 12], [x + 9, y - 12], [x + 9, y + 10], [x + 7, y + 10]], IRON.shade);
}

/** How each moth kind looks: its size, wing faces and body. */
const MOTH = {
  fast: { size: 0.9, lit: 0xdcefff, shade: 0x8db4dc, body: 0x2f3d55 },
  slow: { size: 1.15, lit: 0xeaf6d4, shade: 0xa6c388, body: 0x3d4a2a },
  heavy: { size: 1.3, lit: 0xf6dfb4, shade: 0xb98b56, body: 0x2c211b },
} as const satisfies Record<MothKind, { size: number; lit: number; shade: number; body: number }>;

/**
 * A moth centred on (x, y), in its kind's colours. Its wings are a lit and a shaded triangle each
 * side; `wingsUp` raises them, otherwise they sit low. The shadow is cast below it.
 */
export function drawMoth(g: Phaser.GameObjects.Graphics, x: number, y: number, kind: MothKind, wingsUp: boolean) {
  const m = MOTH[kind];
  const k = m.size;
  const sp = wingsUp ? 1 : 0.45;
  const P = (px: number, py: number): Pt => [x + px * k, y + py * k];
  dropShadow(g, x + 4, y + 14, 8 * k, 3 * k, 0.22);
  // Left wings catch the light, right wings are in shade.
  poly(g, [P(-1, -1), P(-11, -9 * sp), P(-7, 0)], m.lit);
  poly(g, [P(-1, 0), P(-7, 0), P(-5, 4 * sp + 1)], tone(m.lit, -0.1));
  poly(g, [P(1, -1), P(11, -9 * sp), P(7, 0)], m.shade);
  poly(g, [P(1, 0), P(7, 0), P(5, 4 * sp + 1)], tone(m.shade, -0.12));
  // Body, a slim diamond with antennae.
  poly(g, [P(0, -4), P(1.6, 0), P(0, 5), P(-1.6, 0)], m.body);
  poly(g, [P(0, -4), P(1.6, 0), P(0, 5)], tone(m.body, 0.12));
  g.lineStyle(Math.max(1, k), m.body, 1).lineBetween(P(0, -4)[0], P(0, -4)[1], P(-2, -7)[0], P(-2, -7)[1]);
  g.lineBetween(P(0, -4)[0], P(0, -4)[1], P(2, -7)[0], P(2, -7)[1]);
}

/** The moth jar at the gate: a cork, a glass body lit on the left and a shaded base. */
export function drawJar(g: Phaser.GameObjects.Graphics) {
  const cx = JAR.x;
  const cy = JAR.y - 20;
  dropShadow(g, cx + 6, cy + 22, 22, 6, 0.4);
  // The cork.
  poly(g, [[cx - 6, cy - 20], [cx + 6, cy - 20], [cx + 5, cy - 14], [cx - 5, cy - 14]], 0xb07a46);
  poly(g, [[cx, cy - 20], [cx + 6, cy - 20], [cx + 5, cy - 14], [cx, cy - 14]], 0x7c5030);
  // The glass, a lit face and a shaded face, with a bright rim on the left.
  poly(g, [[cx - 9, cy - 14], [cx + 9, cy - 14], [cx + 9, cy - 10], [cx - 9, cy - 10]], 0xbfe0ee, 0.8);
  poly(g, [[cx - 16, cy - 10], [cx, cy - 10], [cx, cy + 18], [cx - 16, cy + 18]], 0xa9cfe0, 0.5);
  poly(g, [[cx, cy - 10], [cx + 16, cy - 10], [cx + 16, cy + 18], [cx, cy + 18]], 0x6d96ab, 0.5);
  poly(g, [[cx - 13, cy - 6], [cx - 10, cy - 6], [cx - 10, cy + 14], [cx - 13, cy + 14]], 0xe2f2f8, 0.9);
  // The base.
  poly(g, [[cx - 16, cy + 18], [cx + 16, cy + 18], [cx + 14, cy + 21], [cx - 14, cy + 21]], 0x6e4a28);
}

/** A hearth's flame on the HUD, lit or gone to ash. */
export function drawHearth(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean) {
  if (lit) {
    poly(g, [[x - 6, y + 6], [x, y - 9], [x, y + 6]], 0xff9a2e);
    poly(g, [[x, y - 9], [x + 6, y + 6], [x, y + 6]], 0xd9651f);
    poly(g, [[x - 2, y + 6], [x, y - 1], [x + 2, y + 6]], 0xfff1b0);
  } else {
    poly(g, [[x - 6, y + 7], [x - 2, y + 1], [x + 3, y + 2], [x + 6, y + 7]], 0x5a5560);
  }
  poly(g, [[x - 8, y + 6], [x + 8, y + 6], [x + 8, y + 9], [x - 8, y + 9]], 0x9b6b3d);
}

/** A coin on the HUD: a flat gold disc with a lit half and a shaded half. */
export function drawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  const hex = (rad: number): Pt[] => [0, 1, 2, 3, 4, 5].map((i) => [x + Math.cos((i * Math.PI) / 3) * rad, y + Math.sin((i * Math.PI) / 3) * rad]);
  poly(g, hex(r), 0xb98a22);
  poly(g, [[x, y - r], [x - r * 0.87, y - r / 2], [x - r * 0.87, y + r / 2], [x, y + r]], 0xf3c64e);
  poly(g, hex(r * 0.6), 0xf3c64e);
  poly(g, [[x, y - r * 0.6], [x - r * 0.52, y - r * 0.3], [x - r * 0.52, y + r * 0.3], [x, y + r * 0.6]], 0xffe08a);
}
