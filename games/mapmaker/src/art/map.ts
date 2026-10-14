import { GRID, indexOf, type Point, type Tile } from '../game/state';
import type { Terrain } from '../game/terrain';
import { BLUE, GREEN, INK, SHEET, TREE, VELLUM, circle, poly, rng, type Ctx } from './paint';

// The island as a survey sheet. `paintTerrain` paints the whole island once (it is hidden under the
// fog until surveyed): layered height tints, hillshade from the north-west, brown contours, the blue
// coastline and black map symbols. `paintFog` paints the blank, gridded drafting paper over every
// tile not charted yet and the dashed survey limit round the charted land. Both paint at 2x onto a
// canvas of GRID x TS pixels, shown at half size over the map.

/** A tile's size on the painted canvases (twice its 40 px on screen). */
export const TS = 80;
export const CANVAS = { w: GRID.w * TS, h: GRID.h * TS };

/** Each terrain's height, before noise: the tints and contours follow it. */
const ELEV: Record<Terrain, number> = {
  sea: -0.22,
  beach: 0.04,
  port: 0.02,
  grass: 0.16,
  forest: 0.22,
  village: 0.18,
  ruins: 0.2,
  hills: 0.48,
  mountain: 1.0,
};

/** Hypsometric tints: the colour from each height up. */
const BANDS: [number, string][] = [
  [-9, '#a9d3ec'],
  [-0.16, '#bcdff1'],
  [-0.06, '#d2eaf5'],
  [-0.02, '#f2e6bf'],
  [0.08, '#dcebc8'],
  [0.2, '#cfe2b2'],
  [0.32, '#e3e3b0'],
  [0.46, '#ead39f'],
  [0.62, '#e2bf8e'],
  [0.8, '#d6ab86'],
  [1.0, '#ece6e2'],
  [1.15, '#ffffff'],
];
const FOREST_TINT = '#a7cf8a';

/** One flat colour per terrain, for the panel's live chart and the chart rows. */
export const TINT: Record<Terrain, string> = {
  sea: '#bcdff1',
  beach: '#f2e6bf',
  port: INK,
  grass: '#cfe2b2',
  forest: FOREST_TINT,
  village: INK,
  ruins: '#5b6670',
  hills: '#ead39f',
  mountain: '#d6ab86',
};

const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function terrainOf(tiles: Tile[]) {
  return (x: number, y: number): Terrain =>
    x < 0 || y < 0 || x >= GRID.w || y >= GRID.h ? 'sea' : tiles[indexOf(x, y)].terrain;
}

/** The ground's height at a canvas point: tile heights blended between tile centres, plus noise, peaks pointed. */
function heightField(tiles: Tile[]) {
  const T = terrainOf(tiles);
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (px: number, py: number) => {
    const gx = px / TS - 0.5;
    const gy = py / TS - 0.5;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const u = sm(gx - x0);
    const v = sm(gy - y0);
    const e = (x: number, y: number) => ELEV[T(x, y)];
    let h = e(x0, y0) * (1 - u) * (1 - v) + e(x0 + 1, y0) * u * (1 - v) + e(x0, y0 + 1) * (1 - u) * v + e(x0 + 1, y0 + 1) * u * v;
    h += (vnoise(px / 70, py / 70) - 0.5) * 0.12;
    const tx = Math.round(gx);
    const ty = Math.round(gy);
    if (T(tx, ty) === 'mountain') {
      const d = Math.hypot(px - (tx + 0.5) * TS, py - (ty + 0.5) * TS) / TS;
      h += Math.max(0, 0.6 - d) * 1.4;
    }
    return h;
  };
}

/** Paints the whole island (charted or not) onto a CANVAS-sized context. */
export function paintTerrain(ctx: Ctx, tiles: Tile[]) {
  const T = terrainOf(tiles);
  const heightAt = heightField(tiles);
  const R = 2;
  const gw = CANVAS.w / R + 1;
  const gh = CANVAS.h / R + 1;
  const H = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) H[j * gw + i] = heightAt(i * R, j * R);
  const hAt = (i: number, j: number) => H[Math.min(gh - 1, Math.max(0, j)) * gw + Math.min(gw - 1, Math.max(0, i))];

  // Tints and hillshade, pixel by pixel.
  const img = ctx.createImageData(CANVAS.w, CANVAS.h);
  const bandCol = BANDS.map(([, c]) => rgb(c));
  const forest = rgb(FOREST_TINT);
  for (let y = 0; y < CANVAS.h; y++) {
    for (let x = 0; x < CANVAS.w; x++) {
      const i = (x / R) | 0;
      const j = (y / R) | 0;
      const h = hAt(i, j);
      let b = 0;
      while (b + 1 < BANDS.length && h >= BANDS[b + 1][0]) b++;
      let [r, g, bl] = bandCol[b];
      if (T((x / TS) | 0, (y / TS) | 0) === 'forest' && h > -0.02) {
        r = r * 0.35 + forest[0] * 0.65;
        g = g * 0.35 + forest[1] * 0.65;
        bl = bl * 0.35 + forest[2] * 0.65;
      }
      if (h > -0.02) {
        const dx = hAt(i + 1, j) - hAt(i - 1, j);
        const dy = hAt(i, j + 1) - hAt(i, j - 1);
        const s = Math.max(-0.35, Math.min(0.3, (-dx - dy) * 9));
        if (s < 0) {
          r *= 1 + s * 0.6;
          g *= 1 + s * 0.55;
          bl *= 1 + s * 0.45;
        } else {
          r += (255 - r) * s * 0.7;
          g += (255 - g) * s * 0.7;
          bl += (255 - bl) * s * 0.7;
        }
      }
      const o = (y * CANVAS.w + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = bl;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Contours by marching squares.
  const contour = (lev: number, col: string, lw: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const S = 2;
    for (let j = 0; j < gh - S; j += S) {
      for (let i = 0; i < gw - S; i += S) {
        const a = hAt(i, j);
        const b = hAt(i + S, j);
        const c = hAt(i + S, j + S);
        const d = hAt(i, j + S);
        const X = i * R;
        const Y = j * R;
        const s = S * R;
        const pts: [number, number][] = [];
        const e = (p: number, q: number, x1: number, y1: number, x2: number, y2: number) => {
          if (p < lev !== q < lev) {
            const t = (lev - p) / (q - p);
            pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
          }
        };
        e(a, b, X, Y, X + s, Y);
        e(b, c, X + s, Y, X + s, Y + s);
        e(c, d, X + s, Y + s, X, Y + s);
        e(d, a, X, Y + s, X, Y);
        if (pts.length >= 2) {
          ctx.moveTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
        }
        if (pts.length === 4) {
          ctx.moveTo(pts[2][0], pts[2][1]);
          ctx.lineTo(pts[3][0], pts[3][1]);
        }
      }
    }
    ctx.stroke();
  };
  for (let k = 1; k < 16; k++) {
    const index = k % 5 === 0;
    contour(k / 10, index ? 'rgba(150,88,44,0.9)' : 'rgba(168,105,58,0.55)', index ? 2.4 : 1.3);
  }
  contour(-0.06, 'rgba(47,127,184,0.45)', 1.3);
  contour(-0.16, 'rgba(47,127,184,0.45)', 1.3);
  contour(-0.02, BLUE, 2.6);

  // Map symbols.
  const tree = (x: number, y: number) => {
    circle(ctx, x, y, 5.5, 'rgba(255,255,255,0.35)', TREE, 1.6);
    circle(ctx, x, y, 1.4, TREE);
  };
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      const t = T(x, y);
      const X = x * TS;
      const Y = y * TS;
      const cx = X + TS / 2;
      const cy = Y + TS / 2;
      if (t === 'forest') {
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) tree(X + 12 + i * 18 + (j % 2) * 4, Y + 12 + j * 18);
      } else if (t === 'beach') {
        const r = rng(x * 131 + y * 17 + 5);
        ctx.fillStyle = 'rgba(160,120,60,0.55)';
        for (let k = 0; k < 22; k++) ctx.fillRect(X + 4 + r() * (TS - 8), Y + 8 + r() * (TS - 16), 2, 2);
      } else if (t === 'mountain') {
        poly(ctx, [[cx, cy - 10], [cx + 9, cy + 6], [cx - 9, cy + 6]], INK);
      } else if (t === 'village') {
        // Buildings as black blocks round a green, and the church as a ringed dot.
        for (const [dx, dy, w, h] of [[-20, -12, 14, 10], [-2, -18, 12, 12], [14, -8, 12, 14], [-16, 6, 16, 10], [6, 12, 12, 10]]) {
          ctx.save();
          ctx.translate(cx + dx, cy + dy);
          ctx.rotate(0.12);
          ctx.fillStyle = INK;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        circle(ctx, cx + 2, cy + 2, 5, SHEET, INK, 2);
        circle(ctx, cx + 2, cy + 2, 1.8, INK);
      } else if (t === 'ruins') {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(cx - 18, cy - 14, 36, 28);
        ctx.setLineDash([]);
        for (const [dx, dy] of [[-10, -4], [8, 6], [0, -6]]) circle(ctx, cx + dx, cy + dy, 3, INK);
      } else if (t === 'port') {
        // A jetty out into the water and an anchor offshore.
        ctx.fillStyle = INK;
        ctx.fillRect(cx - 4, cy - 6, 8, 52);
        const ax = cx + 30;
        const ay = cy + 50;
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.5;
        circle(ctx, ax, ay - 14, 4, null, BLUE, 2.5);
        ctx.beginPath();
        ctx.moveTo(ax, ay - 10);
        ctx.lineTo(ax, ay + 10);
        ctx.moveTo(ax - 10, ay + 2);
        ctx.quadraticCurveTo(ax - 10, ay + 12, ax, ay + 12);
        ctx.quadraticCurveTo(ax + 10, ay + 12, ax + 10, ay + 2);
        ctx.stroke();
      }
    }
  }
}

/** Paints the blank drafting paper over every fogged tile, and the dashed survey limit. */
export function paintFog(ctx: Ctx, tiles: Tile[]) {
  const fogged = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID.w && y < GRID.h && !tiles[indexOf(x, y)].revealed;
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.save();
  ctx.beginPath();
  for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) if (fogged(x, y)) ctx.rect(x * TS, y * TS, TS, TS);
  ctx.fillStyle = VELLUM;
  ctx.fill();
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(120,130,140,0.16)';
  ctx.beginPath();
  for (let x = 0; x <= CANVAS.w; x += 20) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CANVAS.h);
  }
  for (let y = 0; y <= CANVAS.h; y += 20) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(CANVAS.w, y + 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,130,140,0.32)';
  ctx.beginPath();
  for (let y = 0; y <= GRID.h; y++) {
    ctx.moveTo(0, y * TS + 0.5);
    ctx.lineTo(CANVAS.w, y * TS + 0.5);
  }
  for (let x = 0; x <= GRID.w; x++) {
    ctx.moveTo(x * TS + 0.5, 0);
    ctx.lineTo(x * TS + 0.5, CANVAS.h);
  }
  ctx.stroke();
  // UNSURVEYED, lettered across up to two wide stretches of blank paper.
  ctx.font = `700 26px Inter, system-ui, sans-serif`;
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = '10px';
  ctx.fillStyle = 'rgba(110,120,130,0.35)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let placed = -9;
  let count = 0;
  for (let y = 0; y < GRID.h && count < 2; y++) {
    if (y - placed < 4) continue;
    let run = 0;
    for (let x = 0; x <= GRID.w; x++) {
      if (x < GRID.w && fogged(x, y)) {
        run++;
        continue;
      }
      if (run >= 5) {
        ctx.fillText('UNSURVEYED', (x - run / 2) * TS, y * TS + TS / 2);
        placed = y;
        count++;
        break;
      }
      run = 0;
    }
  }
  ctx.restore();

  // The survey limit: a dashed pencil line where charted ground meets blank paper.
  ctx.strokeStyle = '#5b6670';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      if (fogged(x, y)) continue;
      const X = x * TS;
      const Y = y * TS;
      if (fogged(x, y - 1)) {
        ctx.moveTo(X, Y);
        ctx.lineTo(X + TS, Y);
      }
      if (fogged(x, y + 1)) {
        ctx.moveTo(X, Y + TS);
        ctx.lineTo(X + TS, Y + TS);
      }
      if (fogged(x - 1, y)) {
        ctx.moveTo(X, Y);
        ctx.lineTo(X, Y + TS);
      }
      if (fogged(x + 1, y)) {
        ctx.moveTo(X + TS, Y);
        ctx.lineTo(X + TS, Y + TS);
      }
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A place name printed on the sheet once its tile is charted. */
export interface PlaceName {
  tile: Point;
  /** Where its middle goes, in screen pixels relative to the tile's centre. */
  dx: number;
  dy: number;
  text: string;
  kind: 'village' | 'ruin' | 'height' | 'wood' | 'water' | 'port';
}

const VILLAGES = ['Ashby', 'Kelwick', 'Marlow', 'Pennick', 'Brackenford', 'Oakhurst', 'Saltmere', 'Wendle', 'Hollin', 'Thistle End'];
const RUINS = ['Old Abbey (ruin)', 'Watchtower (ruin)', 'Old Fort (ruin)', 'Standing Stones'];
const WOODS = ['Thornwood', 'Ashgrove', 'Elder Wood', 'Blackthorn'];
const BAYS = ['South Bay', 'Calm Bay', 'Gull Bay', 'Seal Bay'];

/**
 * The names printed on an island: its villages, ruins, peak heights, its biggest wood, the harbour
 * and the bay below it. Picked from the island number and tile spots, never from Math.random.
 */
export function placeNames(tiles: Tile[], island: number, port: Point): PlaceName[] {
  const T = terrainOf(tiles);
  const out: PlaceName[] = [];
  let v = island * 3;
  let r = island;
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      const t = T(x, y);
      if (t === 'village') out.push({ tile: { x, y }, dx: 0, dy: 20, text: VILLAGES[v++ % VILLAGES.length], kind: 'village' });
      if (t === 'ruins') out.push({ tile: { x, y }, dx: 0, dy: 20, text: RUINS[r++ % RUINS.length], kind: 'ruin' });
      if (t === 'mountain') {
        const m = 480 + Math.floor(hash(x + island * 17, y) * 260);
        out.push({ tile: { x, y }, dx: -2, dy: 16, text: `${m} m`, kind: 'height' });
      }
    }
  }
  // The biggest wood: the forest tile with the most forest round it.
  let best: Point | null = null;
  let most = 2;
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      if (T(x, y) !== 'forest') continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (T(x + dx, y + dy) === 'forest') n++;
      if (n > most) {
        most = n;
        best = { x, y };
      }
    }
  }
  if (best) out.push({ tile: best, dx: 0, dy: 0, text: WOODS[island % WOODS.length], kind: 'wood' });
  out.push({ tile: port, dx: -26, dy: 12, text: 'Harbour', kind: 'port' });
  if (port.y + 1 < GRID.h && T(port.x, port.y + 1) === 'sea') {
    out.push({ tile: { x: port.x, y: port.y + 1 }, dx: 50, dy: 4, text: BAYS[island % BAYS.length], kind: 'water' });
  }
  return out;
}

export const NAME_COLOR: Record<PlaceName['kind'], string> = {
  village: INK,
  ruin: INK,
  height: INK,
  wood: GREEN,
  water: BLUE,
  port: INK,
};
