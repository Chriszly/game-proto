// The HUD as the tapestry's borders: linen bands edged in ink thread, slanted bars between the
// compartments, border beasts, stitched cards and buttons, and small wool icons.
import { AGE_PIPS, BUTTONS, MINI, PANEL_BARS, PANEL_Y, TOP_BARS, TOP_H, W, H } from '../scenes/layout';
import { bar, band, canvas, card, knot, linen, mix, PI, reseed, rrect, se, sew, sp, T, thread, type Ctx } from './stitch';

export type IconKind = 'wood' | 'food' | 'ore' | 'pop' | 'clock' | 'horn' | 'shield' | 'wheat' | 'banner' | 'sword' | 'feather' | 'stone' | 'drum';

/** A small wool icon centred at (x, y), about 2s across. */
export function icon(c: Ctx, kind: IconKind, x: number, y: number, s: number, col: string = T.red) {
  if (kind === 'wood') for (let k = 0; k < 3; k++) thread(c, [[x - s, y - s * 0.4 + k * s * 0.4], [x + s, y - s * 0.7 + k * s * 0.4]], k % 2 ? '#a0703a' : T.brown, s * 0.35);
  if (kind === 'food') {
    for (const [dx, dy] of [[-0.4, 0.25], [0.4, 0.25], [0, -0.35]]) knot(c, x + dx * s, y + dy * s, s * 0.45, T.red);
    thread(c, [[x, y - s * 0.7], [x + s * 0.6, y - s * 1.1]], T.green, 1);
  }
  if (kind === 'ore') sp(c, [[x, y - s], [x + s * 0.9, y - s * 0.2], [x + s * 0.5, y + s * 0.8], [x - s * 0.5, y + s * 0.8], [x - s * 0.9, y - s * 0.2]], T.ochre, { noCouch: true, lw: 0.6 });
  if (kind === 'pop') {
    se(c, x, y - s * 0.45, s * 0.38, s * 0.4, T.skin, { noCouch: true, lw: 0.5 });
    sp(c, [[x - s * 0.6, y + s * 0.9], [x - s * 0.4, y], [x + s * 0.4, y], [x + s * 0.6, y + s * 0.9]], T.red, { noCouch: true, lw: 0.5 });
  }
  if (kind === 'clock') {
    c.save();
    c.strokeStyle = T.ink;
    c.lineWidth = 0.9;
    c.setLineDash([2, 0.6]);
    c.beginPath();
    c.arc(x, y, s, 0, PI * 2);
    c.stroke();
    c.restore();
    thread(c, [[x, y], [x, y - s * 0.7]], T.ink, 0.9);
    thread(c, [[x, y], [x + s * 0.5, y + s * 0.2]], T.ink, 0.9);
  }
  if (kind === 'horn') {
    sp(c, [[x - s, y + s * 0.4], [x + s * 0.4, y - s * 0.5], [x + s, y - s * 0.9], [x + s * 1.1, y - s * 0.1], [x + s * 0.6, y + s * 0.15], [x - s * 0.9, y + s * 0.65]], T.buff, { noCouch: true, lw: 0.7 });
    thread(c, [[x - s * 0.5, y + s * 0.25], [x + s * 0.25, y - s * 0.25]], T.ochre, 1);
  }
  if (kind === 'shield') {
    sp(c, [[x - s * 0.8, y - s], [x + s * 0.8, y - s], [x + s * 0.9, y - s * 0.1], [x, y + s * 1.2], [x - s * 0.9, y - s * 0.1]], col, { ang: PI / 2, noCouch: true, lw: 0.8 });
    knot(c, x, y - s * 0.2, s * 0.25, T.ochre);
  }
  if (kind === 'wheat')
    for (let k = -1; k <= 1; k++) {
      thread(c, [[x + k * s * 0.3, y + s], [x + k * s * 0.45, y - s * 0.3]], T.ochre, 1);
      se(c, x + k * s * 0.45, y - s * 0.5, s * 0.2, s * 0.45, T.ochre, { noCouch: true, lw: 0.5 });
    }
  if (kind === 'sword') {
    thread(c, [[x - s * 0.8, y + s * 0.8], [x + s * 0.8, y - s * 0.8]], T.grey, s * 0.32);
    thread(c, [[x - s * 0.75, y + s * 0.15], [x - s * 0.15, y + s * 0.75]], T.ink, s * 0.25);
    knot(c, x - s * 0.85, y + s * 0.85, s * 0.18, T.ochre);
  }
  if (kind === 'feather') {
    se(c, x, y, s * 0.35, s * 0.95, T.indigo, { rot: 0.6, noCouch: true, lw: 0.5 });
    thread(c, [[x - s * 0.7, y + s * 0.95], [x + s * 0.45, y - s * 0.75]], T.ink, 0.7);
  }
  // Masonry: a little stretch of coursed stone.
  if (kind === 'stone')
    for (const [dx, dy, w] of [[-1, 0.15, 1], [0.05, 0.15, 0.95], [-0.5, -0.75, 1]] as const)
      sp(c, [[x + dx * s, y + dy * s], [x + (dx + w) * s, y + dy * s], [x + (dx + w) * s, y + (dy + 0.8) * s], [x + dx * s, y + (dy + 0.8) * s]], T.grey, { noCouch: true, lw: 0.6 });
  // Muster: a war drum and its two sticks.
  if (kind === 'drum') {
    sp(c, [[x - s * 0.8, y - s * 0.3], [x + s * 0.8, y - s * 0.3], [x + s * 0.7, y + s * 0.9], [x - s * 0.7, y + s * 0.9]], T.red, { ang: PI / 2, noCouch: true, lw: 0.6 });
    se(c, x, y - s * 0.3, s * 0.8, s * 0.3, T.buff, { noCouch: true, lw: 0.6 });
    thread(c, [[x - s * 0.9, y - s * 1.1], [x - s * 0.15, y - s * 0.35]], T.brown, 1.1);
    thread(c, [[x + s * 0.9, y - s * 1.1], [x + s * 0.15, y - s * 0.35]], T.brown, 1.1);
  }
  if (kind === 'banner') sp(c, [[x - s * 0.5, y - s], [x + s * 0.5, y - s], [x + s * 0.5, y + s], [x, y + s * 0.6], [x - s * 0.5, y + s]], col, { ang: PI / 2, noCouch: true });
}

export function bakeIcon(kind: IconKind, size = 18, col?: string) {
  const { cv, c } = canvas(size, size);
  reseed(kind.length * 17);
  icon(c, kind, size / 2, size / 2, size * 0.32, col);
  return cv;
}

function beast(c: Ctx, x: number, y: number, col: string, dir: 1 | -1) {
  sp(c, [[x - 14 * dir, y + 2], [x - 6 * dir, y - 5], [x + 6 * dir, y - 5], [x + 12 * dir, y - 9], [x + 16 * dir, y - 6], [x + 12 * dir, y - 2], [x + 10 * dir, y + 4], [x - 10 * dir, y + 6]], col, { ang: 0 });
  thread(c, [[x - 14 * dir, y + 2], [x - 20 * dir, y - 6], [x - 18 * dir, y - 9]], col, 1.2);
  for (const lx of [-8, -3, 4, 8]) thread(c, [[x + lx, y + 5], [x + lx, y + 10]], T.ink, 1);
  knot(c, x + 13 * dir, y - 6.5, 0.6, T.ink);
}

/** The top border: linen band, slanted bars and two border beasts. */
export function bakeTopBar() {
  const { cv, c } = canvas(W, TOP_H);
  band(c, 0, 0, W, TOP_H, 2);
  for (const [x, col] of TOP_BARS) bar(c, x, 0, TOP_H, T[col]);
  beast(c, 790, 14, T.sage, 1);
  beast(c, 906, 14, T.ochre, -1);
  thread(c, [[AGE_PIPS.x - 8, TOP_H - 6], [AGE_PIPS.x + AGE_PIPS.gap * 2 + 8, TOP_H - 6]], mix(T.ochre, T.band, 0.4), 0.6);
  return cv;
}

/** The bottom border: the panel band, with bars between selection, buttons and minimap. */
export function bakePanel() {
  const h = H - PANEL_Y;
  const { cv, c } = canvas(W, h);
  band(c, 0, 0, W, h, 6);
  thread(c, [[0, 4], [W, 4]], T.ochre, 0.7);
  bar(c, PANEL_BARS[0], 0, h, T.sage);
  bar(c, PANEL_BARS[1], 0, h, T.ochre);
  // The minimap's frame: an embroidered square of darker linen.
  sew(c, (cc) => cc.rect(MINI.x - 3, MINI.y - PANEL_Y - 3, MINI.s + 6, MINI.s + 6), '#d3c4a0', { bb: [MINI.x - 3, MINI.y - PANEL_Y - 3, MINI.x + MINI.s + 3, MINI.y - PANEL_Y + MINI.s + 3], ang: 0, noCouch: true, lw: 1.2 });
  return cv;
}

/** A panel button: ochre laid wool with a red running thread inside; dull linen when disabled. */
export function bakeButton(state: 'on' | 'off' | 'hot', w = BUTTONS.w, h = BUTTONS.h) {
  const { cv, c } = canvas(w + 4, h + 4);
  reseed(state.length * 5 + w);
  const fill = state === 'off' ? '#dccfaf' : state === 'hot' ? mix(T.ochre, '#ffffff', 0.25) : T.ochre;
  sew(c, (cc) => rrect(cc, 2, 2, w, h, 3), fill, { bb: [2, 2, 2 + w, 2 + h], ang: 0, lw: 1.1, lineCol: state === 'off' ? T.faded : T.ink });
  thread(c, [[6, 6], [w - 2, 6], [w - 2, h - 2], [6, h - 2], [6, 6]], state === 'off' ? '#c8b890' : T.red, 0.7);
  return cv;
}

/** A stitched linen card of any size; `pill` rounds the ends fully, like the toast. */
export function bakeCard(w: number, h: number, o: { fill?: string; lw?: number; pill?: boolean; hot?: boolean } = {}) {
  const pad = o.hot ? 5 : 2;
  const { cv, c } = canvas(w + pad * 2, h + pad * 2);
  reseed(w * 3 + h);
  card(c, pad, pad, w, h, o.fill ?? T.card, o.lw ?? 1.1, o.pill ? h / 2 : 4);
  if (o.hot) {
    c.save();
    c.strokeStyle = T.ochre;
    c.lineWidth = 1.6;
    c.setLineDash([3, 1.2]);
    rrect(c, 2, 2, w + pad * 2 - 4, h + pad * 2 - 4, 6);
    c.stroke();
    c.restore();
  }
  return cv;
}

/** The menu and end-screen ground: linen with border bands top and bottom. */
export function bakeBackdrop() {
  const { cv, c } = canvas(W, H);
  linen(c, 0, 0, W, H, T.linen, 4);
  band(c, 0, 0, W, 34, 2);
  band(c, 0, H - 34, W, 34, 6);
  const cols = [T.red, T.sage, T.ochre, T.indigo];
  for (let i = 0; i < 16; i++) {
    bar(c, 30 + i * 60, 0, 34, cols[i % 4]);
    bar(c, 30 + i * 60, H - 34, 34, cols[(i + 2) % 4]);
  }
  beast(c, 180, 17, T.sage, 1);
  beast(c, 780, 17, T.ochre, -1);
  beast(c, 480, H - 17, T.teal, 1);
  return cv;
}
