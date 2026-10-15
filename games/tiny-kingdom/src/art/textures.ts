import Phaser from 'phaser';
import { BUTTON, DECREE, GIFT_CARD, ISLAND_BUTTON, ISLANDS_CARD, PANEL, TILE_BUTTONS, TITLE, TRAY, UNDO_BUTTON, VIEW } from '../scenes/layout';
import { bake, ball, circle, crown, ctx, grain, harbor, house, lumber, manor, market, peg, PI, reseed, rnd, rrect, stripes, T, tile, tower, walnut, windmill } from './wood';

// Every texture the game uses, painted once at boot:
// - `bg`: the table, the decree sign, the walnut tray and the panel with its title plaque.
// - `tile-grass-0..3` (grass with painted flowers), `tile-plain` (grass under a building or wood),
//   `tile-lake`, `tile-farm`: one 64px cell each.
// - `prop-<kind>` for every building but the farm (house, tower, windmill, market, harbor, lumber,
//   manor) and for the forest: what stands on a cell, 80x100 with the cell's centre at
//   PROP_ORIGIN, so roofs and flags reach into the row above.
// - `icon-<building>` and `icon-<building>-big`: icons for the gift chips and the gift card; `spot-farm`, `spot-house`: the decree's open
//   spots; `tick`, `bead-on`, `bead-off`, `crown`, `count`, `star-on` and `star-off` (campaign stars).
// - `plaque-<w>x<h>`, `plaque-<w>x<h>-sel`, `glow-<w>x<h>`: beech plaques for buttons;
//   `walnut-<w>x<h>`: walnut boards for the gift card, the islands card, the round banner and the
//   game-over card.

/** One cell in art units. */
const CELL = 128;
/** A prop texture's size, and where the cell's centre sits in it (as a fraction, for setOrigin). */
export const PROP = { w: 80, h: 100 };
export const PROP_ORIGIN = { x: 0.5, y: 0.68 };
export const GRASS_VARIANTS = 4;

/** A cell's tile, painted with its top left at (0, 0). */
function cellTile(kind: 'grass' | 'plain' | 'lake' | 'farm', variant = 0) {
  const pad = 5;
  const X = CELL / 2;
  const Y = CELL / 2;
  reseed(900 + variant * 31 + kind.length * 7);
  if (kind === 'lake') {
    tile(pad, pad, CELL - 2 * pad, CELL - 2 * pad - 6, 14, T.beech);
    rrect(16, 15, CELL - 32, CELL - 40, 12);
    const g = ctx.createLinearGradient(0, 0, CELL, CELL);
    g.addColorStop(0, '#4a92dc');
    g.addColorStop(1, '#2f6bab');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    rrect(16, 15, CELL - 32, CELL - 40, 12);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,30,70,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(13, 12, CELL - 26, CELL - 34);
    grain(16, 15, CELL - 32, CELL - 40, '#0c2a50', 7, 3, 0.18);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [px, py] of [
      [X - 18, Y - 14],
      [X + 14, Y + 6],
    ]) {
      ctx.beginPath();
      ctx.arc(px, py, 9, PI * 1.1, PI * 1.9);
      ctx.stroke();
    }
    return;
  }
  if (kind === 'farm') {
    tile(pad, pad, CELL - 2 * pad, CELL - 2 * pad - 6, 14, T.soil);
    stripes(18, 16, CELL - 36, CELL - 44);
    return;
  }
  tile(pad, pad, CELL - 2 * pad, CELL - 2 * pad - 6, 14, T.green);
  if (kind === 'plain' || variant === 0) return;
  // little painted flowers: a dimple and a cream or yellow bead
  reseed(40 + variant * 17);
  const n = variant === 3 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const fx = 24 + rnd() * 80;
    const fy = 24 + rnd() * 66;
    circle(fx + 1, fy + 2, 4, 'rgba(30,80,20,0.25)');
    ball(fx, fy, 3.5, rnd() < 0.5 ? T.cream : T.yellow);
  }
}

/** A building or wood standing on a cell, around the cell's centre (0, 0). */
type PropKind = 'house' | 'tower' | 'forest' | 'windmill' | 'market' | 'harbor' | 'lumber' | 'manor';
const PROPS: PropKind[] = ['house', 'tower', 'forest', 'windmill', 'market', 'harbor', 'lumber', 'manor'];

function prop(kind: PropKind) {
  reseed(500 + kind.length * 13);
  if (kind === 'forest') {
    peg(-24, 2, 0.95);
    peg(24, -4, 1);
    peg(2, 30, 1.05);
  } else if (kind === 'house') house(0, -2, 1.15);
  else if (kind === 'tower') tower(0, -4, 1.05);
  else if (kind === 'windmill') windmill(0, 0, 1.3);
  else if (kind === 'market') market(0, 0, 1.05);
  else if (kind === 'harbor') harbor(0, -6, 1);
  else if (kind === 'lumber') lumber(0, 0, 1.05);
  else manor(0, 2, 1);
}

function background() {
  const W = VIEW.w * 2;
  reseed(2);
  // the table: planks with grain
  ctx.fillStyle = '#cfa673';
  ctx.fillRect(0, 0, W, VIEW.h * 2);
  for (let i = 0; i < 9; i++) {
    const y = i * 120;
    ctx.fillStyle = i % 2 ? '#d3ab78' : '#caa06c';
    ctx.fillRect(0, y, W, 120);
    grain(0, y, W, 120, '#7a5530', 10, 5, 0.18);
    ctx.fillStyle = 'rgba(80,50,20,0.25)';
    ctx.fillRect(0, y + 118, W, 2);
  }
  // the decree sign: a cream plank with a navy crown token and the crowns' navy pill
  const R = { x: DECREE.x * 2, y: DECREE.y * 2, w: DECREE.w * 2, h: DECREE.h * 2 };
  tile(R.x + 8, R.y + 2, R.w - 16, R.h - 6, 18, T.sign, { blur: 8, grain: 4 });
  ball(R.x + 52, R.y + R.h / 2 - 1, 23, T.navy);
  crown(R.x + 52, R.y + R.h / 2, 0.85);
  rrect(R.x + R.w - 156, R.y + 12, 120, R.h - 22, 14);
  ctx.fillStyle = T.navy;
  ctx.fill();
  crown(R.x + R.w - 124, R.y + R.h / 2, 1);
  // the tray
  const F = { x: TRAY.x * 2, y: TRAY.y * 2, w: TRAY.w * 2, h: TRAY.h * 2 };
  walnut(F.x - 6, F.y - 4, F.w + 12, F.h + 14, 24);
  rrect(F.x + 6, F.y + 6, F.w - 12, F.h - 6, 14);
  ctx.fillStyle = T.walnutD;
  ctx.fill();
  rrect(F.x + 6, F.y + 6, F.w - 12, F.h - 6, 14);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 6;
  ctx.stroke();
  // the panel and its red title plaque between two crowns
  const P = { x: PANEL.x * 2, y: PANEL.y * 2, w: PANEL.w * 2, h: PANEL.h * 2 };
  walnut(P.x, P.y, P.w, P.h, 24);
  tile(TITLE.x * 2, TITLE.y * 2, TITLE.w * 2, TITLE.h * 2, 18, T.red, { blur: 6, grain: 4 });
  const ty = (TITLE.y + TITLE.h / 2) * 2 - 4;
  crown(P.x + 54, ty, 0.95);
  crown(P.x + P.w - 54, ty, 0.95);
}

/** A dashed rounded box with a small building in it: where the decree's next farm or house could go. */
function spot(kind: 'farm' | 'house') {
  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.lineCap = 'round';
  rrect(-32, -28, 64, 56, 14);
  ctx.fillStyle = 'rgba(255,240,180,0.25)';
  ctx.fill();
  ctx.strokeStyle = T.cream;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
  if (kind === 'farm') stripes(-17, -15, 34, 30, 0.5);
  else house(0, 2, 0.5);
}

/** A building on its own, `k` times the size of a gift chip's icon. */
type IconKind = 'farm' | 'house' | 'tower' | 'windmill' | 'market' | 'harbor' | 'lumber';
const ICONS: IconKind[] = ['farm', 'house', 'tower', 'windmill', 'market', 'harbor', 'lumber'];

function icon(kind: IconKind, k = 1) {
  reseed(77);
  if (kind === 'farm') {
    rrect(-16 * k, -14 * k, 32 * k, 28 * k, 6 * k);
    ctx.fillStyle = T.soil;
    ctx.fill();
    stripes(-12 * k, -11 * k, 24 * k, 22 * k, 0.4 * k);
  } else if (kind === 'house') house(0, 3 * k, 0.4 * k);
  else if (kind === 'tower') tower(0, 6 * k, 0.36 * k);
  else if (kind === 'windmill') windmill(0, 2 * k, 0.38 * k);
  else if (kind === 'market') market(0, 4 * k, 0.4 * k);
  else if (kind === 'harbor') harbor(0, 0, 0.4 * k);
  else lumber(0, 2 * k, 0.42 * k);
}

/** A five-pointed star, gold when won and a faint dimple when not. */
function star(on: boolean) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 6 : 14;
    const a = -PI / 2 + (i * PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = on ? T.yellow : 'rgba(120,80,40,0.18)';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = on ? '#a87a12' : 'rgba(120,80,40,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Bakes a beech plaque (plain and picked) and its glow for a button of `w` x `h`. */
function plaques(scene: Phaser.Scene, w: number, h: number, r = 18) {
  const key = `plaque-${w}x${h}`;
  bake(scene, key, w + 4, h + 4, () => {
    reseed(70 + w + h);
    tile(6, 2, w * 2 - 4, h * 2 - 8, r, T.beech, { blur: 8, grain: Math.max(4, Math.round(h / 9)) });
  });
  bake(scene, `${key}-sel`, w + 4, h + 4, () => {
    reseed(70 + w + h);
    tile(6, 2, w * 2 - 4, h * 2 - 8, r, '#f0d29c', { blur: 8, grain: Math.max(4, Math.round(h / 9)) });
  });
  bake(scene, `glow-${w}x${h}`, w + 40, h + 40, () => {
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,80,0.9)';
    ctx.shadowBlur = 11;
    rrect(32, 32, w * 2 + 16, h * 2 + 16, 22);
    ctx.fillStyle = T.yellow;
    ctx.fill();
    ctx.restore();
  });
}

function walnutBoard(scene: Phaser.Scene, w: number, h: number) {
  bake(scene, `walnut-${w}x${h}`, w + 24, h + 24, () => {
    reseed(w + h);
    walnut(12, 12, w * 2, h * 2, 24);
    rrect(24, 24, w * 2 - 24, h * 2 - 24, 16);
    ctx.strokeStyle = 'rgba(255,220,170,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

export function bakeTextures(scene: Phaser.Scene) {
  bake(scene, 'bg', VIEW.w, VIEW.h, background);
  for (let v = 0; v < GRASS_VARIANTS; v++) bake(scene, `tile-grass-${v}`, 64, 64, () => cellTile('grass', v));
  bake(scene, 'tile-plain', 64, 64, () => cellTile('plain'));
  bake(scene, 'tile-lake', 64, 64, () => cellTile('lake'));
  bake(scene, 'tile-farm', 64, 64, () => cellTile('farm'));
  for (const kind of PROPS) {
    bake(scene, `prop-${kind}`, PROP.w, PROP.h, () => prop(kind), PROP.w * PROP_ORIGIN.x, PROP.h * PROP_ORIGIN.y);
  }
  for (const kind of ICONS) {
    bake(scene, `icon-${kind}`, 24, 24, () => icon(kind), 12, 12);
    bake(scene, `icon-${kind}-big`, 44, 44, () => icon(kind, 1.75), 22, 22);
  }
  bake(scene, 'spot-farm', 36, 32, () => spot('farm'), 18, 16);
  bake(scene, 'spot-house', 36, 32, () => spot('house'), 18, 16);
  bake(scene, 'tick', 20, 20, () => {
    ball(0, 0, 17, T.tick);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-2, 6);
    ctx.lineTo(8, -6);
    ctx.stroke();
  }, 10, 10);
  bake(scene, 'bead-on', 15, 15, () => ball(0, 0, 13, T.yellow), 7.5, 7.5);
  bake(scene, 'bead-off', 15, 15, () => circle(0, 0, 12.5, 'rgba(120,80,40,0.15)', 'rgba(120,80,40,0.5)', 2), 7.5, 7.5);
  bake(scene, 'crown', 20, 16, () => crown(0, 2, 1), 10, 8);
  bake(scene, 'count', 30, 20, () => {
    rrect(1, 1, 58, 38, 19);
    ctx.fillStyle = T.navy;
    ctx.fill();
  });
  bake(scene, 'star-on', 16, 16, () => star(true), 8, 8);
  bake(scene, 'star-off', 16, 16, () => star(false), 8, 8);
  plaques(scene, TILE_BUTTONS.w, TILE_BUTTONS.three.h);
  plaques(scene, TILE_BUTTONS.w, TILE_BUTTONS.four.h);
  plaques(scene, TILE_BUTTONS.grid.w, TILE_BUTTONS.grid.h, 14);
  plaques(scene, ISLAND_BUTTON.w, ISLAND_BUTTON.h, 14);
  const C = ISLANDS_CARD;
  for (const b of [C.level, C.daily, C.random, C.key, C.close]) plaques(scene, b.w, b.h, 14);
  walnutBoard(scene, C.w, C.h);
  plaques(scene, UNDO_BUTTON.w, UNDO_BUTTON.h, 20);
  plaques(scene, BUTTON.w, BUTTON.h, 18);
  plaques(scene, GIFT_CARD.button.w, GIFT_CARD.button.h);
  walnutBoard(scene, GIFT_CARD.w, GIFT_CARD.h);
  walnutBoard(scene, 440, 96);
  walnutBoard(scene, 520, 260);
}

/** The texture of a cell's tile: grass shows one of its flower variants, picked by position. */
export function tileKey(cell: string, col: number, row: number) {
  if (cell === 'grass') return `tile-grass-${(col * 7 + row * 13 + ((col * row) % 5)) % GRASS_VARIANTS}`;
  if (cell === 'lake' || cell === 'farm') return `tile-${cell}`;
  return 'tile-plain';
}

/** The prop standing on a cell, or null for flat cells. */
export function propKey(cell: string) {
  return (PROPS as string[]).includes(cell) ? `prop-${cell}` : null;
}


