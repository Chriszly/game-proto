// The world in tapestry work: buildings in elevation, Bayeux trees, berry bushes, gold mines, the
// linen ground with its lakes, ridges and grass tufts, and the fog of unworked linen with the needle
// still at its edge.
import { BUILDINGS, MAP_SIZE, TILE, type BuildingId, type FactionId } from '../game/data';
import { DIRT, ROCK, WATER } from '../game/map';
import { WOOL } from './figures';
import { canvas, knot, linen, mix, outline, P, PI, reseed, rnd, rr, se, sew, sp, sr, T, thread, type Ctx, type Pt } from './stitch';

/** Room above a building's footprint for roofs, domes and flags. */
export const BUILDING_TOP = 22;
/** Room above a tree's tile for its crown. */
export const TREE_TOP = 24;

// ---------------------------------------------------------------- buildings

function tiles(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, row = 4) {
  // A roof of scale tiles: rows of little arcs over a laid fill.
  const pts: Pt[] = [[x0, y1], [x1, y1], [x1 - 6, y0], [x0 + 6, y0]];
  sp(c, pts, col, { ang: 0, noCouch: true, line: false });
  c.save();
  P(pts)(c);
  c.clip();
  c.strokeStyle = mix(col, '#000000', 0.35);
  c.lineWidth = 0.7;
  for (let y = y0 + row, r = 0; y < y1 + row; y += row, r++)
    for (let x = x0 + (r % 2) * row; x < x1 + row; x += row * 1.6) {
      c.beginPath();
      c.arc(x, y - row, row * 0.8, 0.15, PI - 0.15);
      c.stroke();
    }
  c.restore();
  outline(c, P(pts), T.ink, 1);
}

function arch(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  sew(
    c,
    (cc) => {
      cc.beginPath();
      cc.moveTo(x, y + h);
      cc.lineTo(x, y + w / 2);
      cc.arc(x + w / 2, y + w / 2, w / 2, PI, 0);
      cc.lineTo(x + w, y + h);
      cc.closePath();
    },
    col,
    { bb: [x, y, x + w, y + h], ang: PI / 2, sp: 1.1 },
  );
}

function dome(c: Ctx, x: number, y: number, r: number, col: string) {
  sew(
    c,
    (cc) => {
      cc.beginPath();
      cc.arc(x, y, r, PI, 0);
      cc.closePath();
    },
    col,
    { bb: [x - r, y - r, x + r, y], ang: 0.4 },
  );
  knot(c, x, y - r - 1.5, 1.6, T.ochre);
}

function wall(c: Ctx, x0: number, y0: number, x1: number, y1: number, courses = 0) {
  sr(c, x0, y0, x1 - x0, y1 - y0, T.buff, { ang: 0 });
  for (let i = 1; i <= courses; i++) {
    const y = y0 + ((y1 - y0) * i) / (courses + 1);
    thread(c, [[x0 + 1, y], [x1 - 1, y]], mix(T.buff, '#000000', 0.25), 0.6);
  }
}

function pennant(c: Ctx, x: number, y: number, col: string) {
  thread(c, [[x, y], [x, y - 12]], T.ink, 1);
  sp(c, [[x, y - 12], [x + 11, y - 9], [x, y - 6]], col, { ang: 0, noCouch: true, lw: 0.6 });
}

type Painter = (c: Ctx, x: number, y: number, w: number, h: number, roof: string, trim: string) => void;

const PAINT: Record<BuildingId, Painter> = {
  town(c, x, y, w, h, roof) {
    wall(c, x + 8, y + 60, x + w - 8, y + h - 4, 4);
    arch(c, x + 24, y + 84, 18, 40, T.indigo);
    arch(c, x + w / 2 - 12, y + 80, 24, 44, T.red);
    arch(c, x + w - 42, y + 84, 18, 40, T.indigo);
    sr(c, x + w / 2 - 6, y + 98, 12, h - 102, T.ink, { line: false });
    tiles(c, x + 4, y + 30, x + w - 4, y + 62, roof);
    for (const tx of [x + 2, x + w - 18]) {
      sr(c, tx, y + 40, 16, h - 44, T.sage, { ang: 0 });
      dome(c, tx + 8, y + 40, 8, T.ochre);
      arch(c, tx + 4, y + 60, 8, 16, T.ink);
    }
    sr(c, x + w / 2 - 12, y + 12, 24, 28, T.teal, { ang: 0 });
    arch(c, x + w / 2 - 6, y + 20, 12, 16, T.ink);
    knot(c, x + w / 2, y + 29, 3, T.ochre);
    dome(c, x + w / 2, y + 12, 12, roof);
    pennant(c, x + w / 2, y - 2, T.ochre);
  },
  house(c, x, y, w, h, roof) {
    wall(c, x + 10, y + 32, x + w - 10, y + h - 4);
    arch(c, x + w / 2 - 5, y + 40, 10, 20, T.indigo);
    tiles(c, x + 4, y + 10, x + w - 4, y + 34, roof, 3.5);
    knot(c, x + w / 2, y + 8, 2, T.ochre);
  },
  farm(c, x, y, w, h, _roof, trim) {
    const cols = [T.ochre, T.sage, T.tan, T.sage, T.ochre];
    for (let r = 0; r < 5; r++) sr(c, x + 4, y + 5 + r * 11, w - 8, 8, cols[r], { ang: 0, lw: 0.6, noCouch: r % 2 === 1 });
    for (let r = 0; r < 5; r++)
      for (let i = 0; i < 9; i++) {
        const sx = x + 8 + i * 6;
        const sy = y + 12 + r * 11;
        c.strokeStyle = r % 2 ? T.green : '#8a6a20';
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(sx + 1, sy - 6);
        c.moveTo(sx + 1, sy - 4);
        c.lineTo(sx + 3, sy - 6);
        c.stroke();
      }
    thread(c, [[x + 2, y + 2], [x + w - 2, y + 2], [x + w - 2, y + h - 2], [x + 2, y + h - 2], [x + 2, y + 2]], T.brown, 1.2);
    for (const [px, py] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2], [x + w / 2, y + 2], [x + w / 2, y + h - 2]] as Pt[]) knot(c, px, py, 1.5, T.brown);
    pennant(c, x + w - 4, y + 2, trim);
  },
  lumber(c, x, y, w, h, roof) {
    for (const px of [x + 10, x + w - 12]) sr(c, px, y + 24, 3, h - 30, T.brown, { line: false });
    tiles(c, x + 4, y + 14, x + w - 4, y + 28, roof, 3);
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3 - i; k++) {
        const cx = x + 18 + k * 10 + i * 5;
        const cy = y + h - 10 - i * 8;
        se(c, cx, cy, 5, 4.5, '#c49a62', { ang: 0, noCouch: true });
        c.strokeStyle = T.brown;
        c.lineWidth = 0.6;
        c.beginPath();
        c.arc(cx, cy, 2.2, 0, PI * 2);
        c.stroke();
      }
    thread(c, [[x + w - 6, y + h - 4], [x + w - 2, y + h - 18]], T.brown, 1.4);
    sp(c, [[x + w - 4, y + h - 20], [x + w + 1, y + h - 18], [x + w - 1, y + h - 14]], T.grey, { noCouch: true });
  },
  mine(c, x, y, w, h, roof) {
    for (const px of [x + 8, x + w - 11]) sr(c, px, y + 22, 3, h - 28, T.brown, { line: false });
    tiles(c, x + 3, y + 12, x + w - 3, y + 26, roof, 3);
    // A heap of ore under the shed, with gold knots in it.
    sp(c, [[x + 12, y + h - 4], [x + 18, y + h - 20], [x + 30, y + h - 26], [x + 44, y + h - 18], [x + 52, y + h - 4]], T.grey, { ang: 0.5 });
    for (const [dx, dy] of [[20, -10], [30, -16], [38, -9], [26, -6], [44, -8]]) knot(c, x + dx, y + h + dy, 1.6, T.ochre);
    thread(c, [[x + 4, y + h - 3], [x + 10, y + h - 20]], T.brown, 1.3);
    thread(c, [[x + 5, y + h - 21], [x + 10, y + h - 20], [x + 14, y + h - 17]], T.grey, 1.6);
  },
  barracks(c, x, y, w, h, roof, trim) {
    wall(c, x + 6, y + 44, x + w - 6, y + h - 4);
    for (let i = 0; i < 4; i++) arch(c, x + 12 + i * 19, y + 56, 12, 32, i % 2 ? T.indigo : T.ink);
    tiles(c, x + 2, y + 18, x + w - 2, y + 46, roof);
    // Kite shields hung along the eaves.
    for (let i = 0; i < 3; i++) {
      const sx = x + 22 + i * 26;
      const sy = y + 34;
      sp(c, [[sx - 5, sy - 6], [sx + 5, sy - 6], [sx + 5, sy], [sx, sy + 9], [sx - 5, sy]], [trim, T.sage, trim][i], { ang: PI / 2, noCouch: true });
      knot(c, sx, sy - 2, 1.4, T.red);
    }
    dome(c, x + w / 2, y + 18, 9, T.sage);
  },
  range(c, x, y, w, h, roof) {
    wall(c, x + 6, y + 44, x + w - 30, y + h - 4, 2);
    arch(c, x + 14, y + 58, 14, 30, T.ink);
    arch(c, x + 36, y + 58, 14, 30, T.indigo);
    tiles(c, x + 2, y + 20, x + w - 26, y + 46, roof);
    // The butt: a straw target on a stand, ringed in wool, with arrows in it.
    thread(c, [[x + w - 22, y + h - 4], [x + w - 16, y + 52]], T.brown, 1.6);
    thread(c, [[x + w - 8, y + h - 4], [x + w - 14, y + 52]], T.brown, 1.6);
    se(c, x + w - 15, y + 52, 12, 12, T.buff, { noCouch: true, ang: 0.6 });
    se(c, x + w - 15, y + 52, 8, 8, T.indigo, { noCouch: true, lw: 0.6 });
    se(c, x + w - 15, y + 52, 3.5, 3.5, T.ochre, { noCouch: true, lw: 0.6 });
    for (const [dx, dy, a] of [[-4, -3, -0.4], [3, 2, 0.3]] as [number, number, number][]) {
      const ax = x + w - 15 + dx;
      const ay = y + 52 + dy;
      thread(c, [[ax, ay], [ax - Math.cos(a) * 8, ay - Math.sin(a) * 8 - 2]], T.brown, 0.8);
    }
  },
  stable(c, x, y, w, h, roof) {
    wall(c, x + 4, y + 48, x + w - 4, y + h - 4, 1);
    arch(c, x + 30, y + 56, 34, h - 60, T.ink);
    // A horse looking out of the stable door.
    sp(c, [[x + 38, y + h - 18], [x + 42, y + 66], [x + 52, y + 62], [x + 58, y + 68], [x + 52, y + 72], [x + 46, y + h - 18]], T.teal, { ang: 0.7, lw: 0.8 });
    thread(c, [[x + 41, y + 68], [x + 45, y + 62], [x + 50, y + 61]], T.ochre, 1.4);
    knot(c, x + 52, y + 65, 0.6, T.ink);
    tiles(c, x + 2, y + 24, x + w - 2, y + 50, roof);
    // Hay at the side.
    se(c, x + 16, y + h - 12, 9, 7, T.ochre, { ang: 1.1, noCouch: true });
    for (let k = -2; k <= 2; k++) thread(c, [[x + 16 + k * 2.5, y + h - 6], [x + 16 + k * 3.5, y + h - 18]], mix(T.ochre, '#000000', 0.25), 0.5);
  },
  academy(c, x, y, w, h, roof) {
    wall(c, x + 6, y + 50, x + w - 6, y + h - 4);
    for (let i = 0; i < 5; i++) sr(c, x + 12 + i * 17, y + 52, 5, h - 56, '#efe2c2', { ang: PI / 2, sp: 1, noCouch: true, lw: 0.6 });
    sp(c, [[x + 2, y + 52], [x + w / 2, y + 30], [x + w - 2, y + 52]], roof, { ang: 0 });
    dome(c, x + w / 2, y + 30, 14, T.teal);
    sr(c, x + w / 2 - 4, y + 2, 8, 14, T.ochre, { noCouch: true });
  },
  watchtower(c, x, y, w, h, roof) {
    wall(c, x + 18, y + 18, x + w - 18, y + h - 4, 6);
    arch(c, x + w / 2 - 4, y + h - 24, 8, 20, T.ink);
    for (const wy of [y + 28, y + 42]) sr(c, x + w / 2 - 1.5, wy, 3, 7, T.ink, { line: false, noCouch: true });
    // The fighting platform, with merlons, and a cone roof above it.
    sr(c, x + 12, y + 10, w - 24, 9, T.sage, { ang: 0 });
    for (let i = 0; i < 4; i++) sr(c, x + 13 + i * 10.5, y + 5, 5, 5, T.sage, { noCouch: true, lw: 0.6 });
    sp(c, [[x + 16, y + 5], [x + w / 2, y - 14], [x + w - 16, y + 5]], roof, { ang: 0 });
    pennant(c, x + w / 2, y - 14, T.ochre);
  },
};

/** A building for one side, with its footprint's top-left at (0, BUILDING_TOP). */
export function bakeBuilding(type: BuildingId, faction: FactionId) {
  const def = BUILDINGS[type];
  const w = def.w * TILE;
  const h = def.h * TILE;
  const { cv, c } = canvas(w + 4, h + BUILDING_TOP);
  reseed(type.length * 31 + faction.length);
  // A soft ground shadow so the building sits on the linen.
  c.fillStyle = 'rgba(110,90,60,0.14)';
  c.beginPath();
  c.ellipse(w / 2, BUILDING_TOP + h - 3, w / 2, 5, 0, 0, PI * 2);
  c.fill();
  PAINT[type](c, 0, BUILDING_TOP, w, h, WOOL[faction].cloth, WOOL[faction].trim);
  return cv;
}

// ---------------------------------------------------------------- nodes

/** A Bayeux tree: a trunk that splits and curls into leaf fans. Its tile's top-left is at (0, TREE_TOP). */
export function bakeTree(variant: number) {
  const { cv, c } = canvas(TILE, TILE + TREE_TOP);
  reseed(40 + variant);
  const cx = TILE / 2;
  const by = TREE_TOP + TILE - 3;
  sp(c, [[cx - 2.5, by], [cx + 2.5, by], [cx + 2, by - 14], [cx - 2, by - 14]], T.bark, { ang: PI / 2, noCouch: true });
  thread(c, [[cx, by - 13], [cx - 4, by - 17], [cx - 8, by - 20]], T.bark, 2.2);
  thread(c, [[cx, by - 13], [cx + 4, by - 17], [cx + 8, by - 20]], T.bark, 2.2);
  const a = variant % 2 ? T.sage : T.green;
  const b = variant % 2 ? T.green : T.sage;
  const leaves: [number, number, string, number][] = [[-8, -26, a, -0.3], [8, -26, b, 0.3], [0, -34, a, 0]];
  for (const [dx, dy, col, rot] of leaves) {
    se(c, cx + dx, by + dy, 6.5, 9, col, { rot, ang: PI / 2 + rot, sp: 1.1, noCouch: true });
    for (let k = -2; k <= 2; k++) thread(c, [[cx + dx, by + dy + 7], [cx + dx + k * 2.4 + rot * 4, by + dy - 6]], mix(col, '#ffffff', 0.3), 0.5);
  }
  return cv;
}

export function bakeBush() {
  const { cv, c } = canvas(TILE, TILE);
  reseed(77);
  const cx = 16;
  const cy = 19;
  se(c, cx, cy, 11, 8, T.sage, { ang: 0.6, noCouch: true });
  se(c, cx - 3, cy - 3, 6, 5, T.green, { ang: 0.6, noCouch: true, lw: 0.6 });
  for (let i = 0; i < 7; i++) knot(c, cx + Math.cos(i * 0.9) * 6.5, cy + Math.sin(i * 0.9) * 4.5, 1.6, T.red);
  return cv;
}

/** A gold mine: a grey mound with a dark adit and gold knots, 2x2 tiles. */
export function bakeMine() {
  const s = TILE * 2;
  const { cv, c } = canvas(s, s);
  reseed(91);
  sp(c, [[4, s - 6], [10, 24], [24, 10], [42, 12], [56, 26], [60, s - 6]], T.grey, { ang: 0.5 });
  sp(c, [[10, 24], [24, 10], [30, 22], [18, 30]], mix(T.grey, '#ffffff', 0.25), { ang: -0.6, noCouch: true, lw: 0.6 });
  sp(c, [[42, 12], [56, 26], [44, 30], [36, 20]], mix(T.grey, '#000000', 0.15), { ang: 0.9, noCouch: true, lw: 0.6 });
  sew(
    c,
    (cc) => {
      cc.beginPath();
      cc.moveTo(24, s - 6);
      cc.lineTo(24, 42);
      cc.arc(32, 42, 8, PI, 0);
      cc.lineTo(40, s - 6);
      cc.closePath();
    },
    T.ink,
    { bb: [24, 34, 40, s - 6], ang: PI / 2 },
  );
  thread(c, [[23, s - 6], [23, 41]], T.brown, 1.4);
  thread(c, [[41, s - 6], [41, 41]], T.brown, 1.4);
  thread(c, [[22, 40], [42, 40]], T.brown, 1.6);
  for (const [x, y] of [[14, 36], [18, 46], [48, 38], [50, 48], [34, 22], [28, 18], [46, 24]] as Pt[]) knot(c, x, y, 2, T.ochre);
  return cv;
}

// ---------------------------------------------------------------- ground

/** Tiles per side of a ground chunk; chunks are painted when they first come into view. */
export const CHUNK = 16;
let linenTile: HTMLCanvasElement | null = null;

function linenPattern() {
  if (!linenTile) {
    const { cv, c } = canvas(256, 256);
    linen(c, 0, 0, 256, 256, T.linen, 4);
    linenTile = cv;
  }
  return linenTile;
}

/** Paints one CHUNK x CHUNK chunk of the map at full size: linen, lakes, ridges, dirt and grass. */
export function paintChunk(terrain: Uint8Array, cx: number, cy: number) {
  const px = CHUNK * TILE;
  const { cv, c } = canvas(px, px);
  const pat = linenPattern();
  for (let y = 0; y < px; y += 256) for (let x = 0; x < px; x += 256) c.drawImage(pat, x, y);
  c.fillStyle = 'rgba(150,160,90,0.12)';
  c.fillRect(0, 0, px, px);
  reseed(1000 + cy * 64 + cx);
  const at = (tx: number, ty: number) =>
    tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE ? -1 : terrain[ty * MAP_SIZE + tx];
  const tx0 = cx * CHUNK;
  const ty0 = cy * CHUNK;
  // Dirt and grass first, so lakes and ridges sit over the tufts at their edges.
  for (let j = 0; j < CHUNK; j++)
    for (let i = 0; i < CHUNK; i++) {
      const k = at(tx0 + i, ty0 + j);
      const x = i * TILE;
      const y = j * TILE;
      if (k === DIRT) {
        const pts: Pt[] = [];
        for (let a = 0; a < 6; a++) pts.push([x + 16 + Math.cos(a * 1.05) * rr(9, 14), y + 16 + Math.sin(a * 1.05) * rr(7, 11)]);
        sp(c, pts, T.tan, { ang: 0.4, lw: 0.6 });
        continue;
      }
      if (k !== 0) continue;
      const tufts = rnd() < 0.45 ? (rnd() < 0.3 ? 2 : 1) : 0;
      for (let n = 0; n < tufts; n++) {
        const gx = x + rr(4, 28);
        const gy = y + rr(8, 30);
        c.strokeStyle = rnd() < 0.5 ? T.sage : T.green;
        c.lineWidth = 0.9;
        c.lineCap = 'round';
        for (const a of [-0.5, 0, 0.5]) {
          c.beginPath();
          c.moveTo(gx, gy);
          c.quadraticCurveTo(gx + a * 3, gy - 3, gx + a * 5, gy - 5.5);
          c.stroke();
        }
      }
      if (rnd() < 0.04) knot(c, x + rr(6, 26), y + rr(6, 26), 1.2, rnd() < 0.5 ? T.ochre : T.teal);
    }
  for (let j = 0; j < CHUNK; j++)
    for (let i = 0; i < CHUNK; i++) {
      const tx = tx0 + i;
      const ty = ty0 + j;
      const k = at(tx, ty);
      const x = i * TILE;
      const y = j * TILE;
      if (k === WATER) {
        // The Bayeux sea: a laid field of blue with wavy teal bands, stitched shut where it meets land.
        sr(c, x - 0.5, y - 0.5, TILE + 1, TILE + 1, T.indigo, { line: false, ang: 0, noCouch: true });
        c.strokeStyle = T.teal;
        c.lineWidth = 1;
        for (let b = 0; b < 4; b++) {
          c.beginPath();
          for (let xx = 0; xx <= TILE; xx += 2) c.lineTo(x + xx, y + 5 + b * 8 + Math.sin((tx * TILE + xx) / 4 + b + ty) * 1.5);
          c.stroke();
        }
        const edge = (nx: number, ny: number, a: Pt, b: Pt) => {
          const n = at(nx, ny);
          if (n !== WATER && n !== -1) thread(c, [a, b], T.ink, 1.1);
        };
        edge(tx, ty - 1, [x, y + 0.6], [x + TILE, y + 0.6]);
        edge(tx, ty + 1, [x, y + TILE - 0.6], [x + TILE, y + TILE - 0.6]);
        edge(tx - 1, ty, [x + 0.6, y], [x + 0.6, y + TILE]);
        edge(tx + 1, ty, [x + TILE - 0.6, y], [x + TILE - 0.6, y + TILE]);
      } else if (k === ROCK) {
        // A ridge: stitched hills in grey and sage, two to a tile.
        for (const [hx, w2, col] of [[x + 9, 11, T.grey], [x + 23, 12, mix(T.grey, T.sage, 0.4)]] as [number, number, string][]) {
          const base = y + TILE - 2;
          const top = y + rr(4, 9);
          sew(
            c,
            (cc) => {
              cc.beginPath();
              cc.moveTo(hx - w2, base);
              cc.quadraticCurveTo(hx - w2 * 0.6, top - 2, hx, top);
              cc.quadraticCurveTo(hx + w2 * 0.6, top - 2, hx + w2, base);
              cc.closePath();
            },
            col,
            { bb: [hx - w2, top, hx + w2, base], ang: -0.9, sp: 1.2 },
          );
          thread(c, [[hx - 3, top + 6], [hx, top + 3], [hx + 3, top + 6]], mix(col, '#ffffff', 0.35), 0.6);
        }
      }
    }
  return cv;
}

/** Unworked linen for the fog: a darker, mottled linen. */
export function bakeFogPattern(size: number) {
  const { cv, c } = canvas(size, size);
  linen(c, 0, 0, size, size, T.fog, 9);
  c.fillStyle = 'rgba(80,66,44,0.16)';
  c.fillRect(0, 0, size, size);
  reseed(13);
  for (let i = 0; i < 40; i++) {
    const x = rr(0, size);
    const y = rr(0, size);
    const r = rr(10, 40);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(80,66,44,0.16)');
    g.addColorStop(1, 'rgba(80,66,44,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return cv;
}

/** The needle at the edge of the known land, with its red working thread. The eye end is at (8, 36). */
export function bakeNeedle() {
  const { cv, c } = canvas(56, 56);
  c.save();
  c.translate(28, 24);
  c.rotate(-0.9);
  c.fillStyle = '#b8bcc4';
  c.beginPath();
  c.moveTo(-22, 0);
  c.lineTo(16, -1.2);
  c.lineTo(19, 0);
  c.lineTo(16, 1.2);
  c.closePath();
  c.fill();
  c.strokeStyle = '#6a6e78';
  c.lineWidth = 0.5;
  c.stroke();
  c.fillStyle = T.linen;
  c.beginPath();
  c.ellipse(-17, 0, 2.6, 0.6, 0, 0, PI * 2);
  c.fill();
  c.restore();
  c.strokeStyle = T.red;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(16, 38);
  c.bezierCurveTo(8, 44, 18, 48, 10, 55);
  c.stroke();
  return cv;
}
