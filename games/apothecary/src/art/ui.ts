import Phaser from 'phaser';
import { both, ink, paint, paper, pathOf, rectPts, wash, type Ctx, type Pt } from './paint';

// Interface pieces as parchment cards with ink rules: the top bar, buttons, hand slots, the signs
// behind place names, panels, the contract card, the away chip and customers' order bubbles.

/** Each kind of card's paper colour. */
const CARD = {
  bar: '#e9d8b0',
  button: '#d9b47a',
  contract: '#f7ecd2',
  chip: '#e3d2f0',
  bubble: '#fffaf0',
  sign: '#ecd3a0',
  small: '#e2c48c',
  panel: '#f4e6c6',
} as const;
export type CardKind = keyof typeof CARD;

/** Room left round a card for its shadow, and below a bubble for its tail. */
const PAD = 4;
export const BUBBLE_TAIL = 6;

function drawCard(c: Ctx, kind: CardKind, w: number, h: number) {
  const col = CARD[kind];
  const x = kind === 'bar' ? 0 : PAD, y = kind === 'bar' ? 0 : PAD;
  if (kind === 'bar') {
    paper(c, 0, 0, w, h, col);
    wash(c, rectPts(-4, -4, w + 8, h - 2), col, { layers: 2, spread: 2, alpha: 0.5, edge: 0 });
    ink(c, [[0, h - 2], [w, h - 2]], { closed: false, w: 1.5 });
    ink(c, [[0, h - 5.5], [w, h - 5.5]], { closed: false, w: 0.6, alpha: 0.6 });
    return;
  }
  const r = kind === 'small' || kind === 'sign' ? 4 : 6;
  if (kind === 'bubble') {
    const tail: Pt[] = [[x + w / 2 - 5, y + h - 1], [x + w / 2, y + h + BUBBLE_TAIL], [x + w / 2 + 5, y + h - 1]];
    c.save();
    c.fillStyle = col;
    pathOf(c, tail);
    c.fill();
    c.restore();
    ink(c, tail, { closed: false, w: 1 });
  }
  c.save();
  c.fillStyle = 'rgba(42,29,20,0.18)';
  pathOf(c, rectPts(x + 2.5, y + 3, w, h, r));
  c.fill();
  c.fillStyle = col;
  pathOf(c, rectPts(x, y, w, h, r));
  c.fill();
  c.restore();
  wash(c, rectPts(x, y, w, h, r), col, { layers: 2, spread: 0.8, alpha: 0.5 });
  ink(c, rectPts(x, y, w, h, r), { w: kind === 'button' || kind === 'small' || kind === 'bubble' ? 1.1 : 1.3 });
  if (kind === 'contract' || kind === 'chip' || kind === 'panel') ink(c, rectPts(x + 3, y + 3, w - 6, h - 6, r - 2), { w: 0.6, alpha: 0.5 });
}

/**
 * Returns the key of a card of `kind`, `w` x `h` pixels as shown (plus room for its shadow, and a
 * bubble's tail), painting it the first time that size is asked for. Its image is centred on the card.
 */
export function cardTexture(scene: Phaser.Scene, kind: CardKind, w: number, h: number) {
  w = Math.round(w);
  h = Math.round(h);
  const key = `card-${kind}-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const tw = kind === 'bar' ? w : w + PAD * 2, th = kind === 'bar' ? h : h + PAD * 2 + (kind === 'bubble' ? BUBBLE_TAIL : 0);
  paint(scene, key, tw, th, (c) => drawCard(c, kind, w, h), 2);
  return key;
}

/** Where a card's own top-left corner is inside its image, for placing it by its card rather than its shadow. */
export const cardInset = (kind: CardKind) => (kind === 'bar' ? 0 : PAD);

/**
 * Returns the key of a parchment sign at least `minWidth` pixels wide, for a place name, painting it
 * the first time that width is asked for.
 */
export function signTexture(scene: Phaser.Scene, minWidth: number, small = false) {
  return cardTexture(scene, small ? 'small' : 'sign', Math.ceil(minWidth / 4) * 4, small ? 18 : 20);
}

/** A hand slot: an inked square on pale paper. 32x32 as shown. */
function drawSlot(c: Ctx) {
  c.save();
  c.fillStyle = 'rgba(255,250,236,0.75)';
  pathOf(c, rectPts(2, 2, 28, 28, 4));
  c.fill();
  c.restore();
  ink(c, rectPts(2, 2, 28, 28, 4), { w: 1.1 });
}

/** A violet hourglass, for the away chip. 14x18 as shown. */
function drawHourglass(c: Ctx) {
  both(c, [[2, 2], [12, 2], [7, 9], [12, 16], [2, 16], [7, 9]], '#c99a3a', { layers: 2, edge: 0 }, { w: 0.9 });
  ink(c, [[1, 1.5], [13, 1.5]], { closed: false, w: 1.3 });
  ink(c, [[1, 16.5], [13, 16.5]], { closed: false, w: 1.3 });
}

/** The dusk dial: a sun half under the horizon, which the contract card moves down as the day passes. */
function drawSun(c: Ctx) {
  c.save();
  c.beginPath();
  c.arc(8, 8, 7, 0, Math.PI * 2);
  c.fillStyle = '#f0a040';
  c.fill();
  c.lineWidth = 0.9;
  c.strokeStyle = '#2a1d14';
  c.stroke();
  c.restore();
}

export function bakeUi(scene: Phaser.Scene) {
  paint(scene, 'slot', 32, 32, drawSlot, 3);
  paint(scene, 'hourglass', 14, 18, drawHourglass, 3);
  paint(scene, 'sun', 16, 16, drawSun, 3);
}
