import Phaser from 'phaser';
import { WASH, both, ellPts, ink, paint, paper, pathOf, rectPts, shadow, sparkle, wash, type Ctx, type Pt } from './paint';

// Interface pieces as parchment cards with ink rules: the top bar, buttons, hand slots, the signs
// behind place names, panels, the contract card, the town card, the away chip and customers' order
// bubbles, and the town card's weather icons.

/** Each kind of card's paper colour. */
const CARD = {
  bar: '#c8b48a',
  button: '#c09a5e',
  contract: '#d8c8a2',
  chip: '#c6b4d6',
  town: '#c4d0aa',
  plague: '#cdb4a6',
  bubble: '#e6dcc4',
  sign: '#cfb27c',
  small: '#c4a46c',
  panel: '#d6c49c',
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
  if (kind === 'contract' || kind === 'chip' || kind === 'panel' || kind === 'plague') ink(c, rectPts(x + 3, y + 3, w - 6, h - 6, r - 2), { w: 0.6, alpha: 0.5 });
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
  c.fillStyle = 'rgba(230,220,196,0.75)';
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

/** The plague card's bell: the town crier's handbell, rung for the sickness. 22x22 as shown. */
function drawBell(c: Ctx) {
  ink(c, [[11, 1.5], [11, 5]], { closed: false, w: 2 });
  both(c, [[11, 4], [16, 7], [17, 15], [20, 18], [2, 18], [5, 15], [6, 7]], '#b8923a', { layers: 2, edge: 0 }, { w: 1 });
  both(c, ellPts(11, 19.5, 2.2, 1.8, 10), '#2a1d14', { layers: 1, edge: 0 }, { w: 0.6 });
}

/**
 * The rival's stall across the street: a counter under a striped awning, with a potion bottle and a
 * price board on it. 72x64 as shown, its feet at the bottom.
 */
function drawRivalStall(c: Ctx) {
  shadow(c, 36, 60, 30, 4, 0.18);
  for (const px of [6, 62]) both(c, rectPts(px, 14, 4, 44, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(4, 36, 64, 20, 2), WASH.wood, { layers: 3, bloom: 2, cx: 20, cy: 40 }, { w: 1.2 });
  for (const y of [42, 49]) ink(c, [[7, y], [65, y]], { closed: false, w: 0.5, alpha: 0.4 });
  // The awning, with a scalloped edge.
  both(c, [[2, 14], [70, 14], [70, 22], [2, 22]], '#8a3a40', { layers: 2 }, { w: 1.1 });
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 11.3;
    wash(c, rectPts(x, 14, 5.6, 8), '#e8dcc0', { layers: 1, edge: 0 });
  }
  c.save();
  c.fillStyle = '#8a3a40';
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.arc(7.6 + i * 11.3, 22, 5.6, 0, Math.PI);
    c.fill();
  }
  c.restore();
  ink(c, [[2, 22], [70, 22]], { closed: false, w: 1, alpha: 0.7 });
  // A bottle and a price board on the counter.
  both(c, rectPts(14, 24, 6, 12, 2), '#6a5bd6', { layers: 2 }, { w: 0.8 });
  both(c, rectPts(15, 20, 4, 5, 1), '#efe6cc', { layers: 1 }, { w: 0.7 });
  both(c, rectPts(38, 23, 22, 13, 1.5), '#2a2a2a', { layers: 1 }, { w: 0.9 });
  ink(c, [[41, 28], [52, 28]], { closed: false, w: 1, col: '#f4f0e6' });
  ink(c, [[41, 32], [56, 32]], { closed: false, w: 1, col: '#f4f0e6' });
}

/** The merchant wagon at the street door: a covered cart with crates on its tail and two big wheels. */
function drawWagon(c: Ctx) {
  shadow(c, 42, 56, 38, 4, 0.2);
  // The canvas cover, arched over the bed.
  both(c, [[12, 34], [12, 16], [20, 6], [62, 6], [70, 16], [70, 34]], '#d8cba4', { layers: 3, bloom: 2, cx: 40, cy: 14 }, { w: 1.2 });
  for (const x of [26, 41, 56]) ink(c, [[x, 7], [x, 34]], { closed: false, w: 0.7, alpha: 0.45 });
  // The bed and the shaft.
  both(c, rectPts(8, 32, 68, 10, 2), WASH.wood, { layers: 3 }, { w: 1.2 });
  ink(c, [[76, 38], [84, 44]], { closed: false, w: 1.6, alpha: 0.8 });
  // A crate of potions on the tail.
  both(c, rectPts(2, 22, 14, 12, 1), WASH.woodDark, { layers: 2 }, { w: 0.9 });
  for (const [x, col] of [[5, '#6fa8d6'], [10, '#7a8f22']] as const) both(c, rectPts(x, 18, 3.5, 6, 1), col, { layers: 1 }, { w: 0.6 });
  // Two spoked wheels.
  for (const cx of [22, 60]) {
    both(c, ellPts(cx, 46, 10, 10, 28), WASH.woodDark, { layers: 2 }, { w: 1.2 });
    wash(c, ellPts(cx, 46, 7, 7, 24), '#cdb88c', { layers: 1, edge: 0 });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4;
      ink(c, [[cx - Math.cos(a) * 7, 46 - Math.sin(a) * 7], [cx + Math.cos(a) * 7, 46 + Math.sin(a) * 7]], { closed: false, w: 0.8, alpha: 0.8 });
    }
    both(c, ellPts(cx, 46, 2, 2, 10), WASH.woodDark, { layers: 1 }, { w: 0.6 });
  }
}

/** The herb market's stall by the outfitter: a green awning over a table of sacks and bundles. */
function drawHerbStall(c: Ctx) {
  shadow(c, 32, 49, 28, 3.5, 0.18);
  for (const px of [6, 54]) both(c, rectPts(px, 12, 4, 36, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  both(c, rectPts(4, 30, 56, 16, 2), WASH.wood, { layers: 3 }, { w: 1.2 });
  both(c, [[2, 8], [62, 8], [62, 16], [2, 16]], '#4f6a2e', { layers: 2 }, { w: 1.1 });
  for (let i = 0; i < 5; i++) wash(c, rectPts(4 + i * 12, 8, 6, 8), '#e8dcc0', { layers: 1, edge: 0 });
  ink(c, [[2, 16], [62, 16]], { closed: false, w: 1, alpha: 0.7 });
  // A sack of flour, a bundle of wheat and a mandrake on the table.
  both(c, ellPts(17, 26, 7, 6, 18), '#f1e8d0', { layers: 2 }, { w: 0.8 });
  for (let k = -2; k <= 2; k++) ink(c, [[32 + k, 30], [32 + k * 2, 19]], { closed: false, w: 1, col: '#d9b24a' });
  both(c, ellPts(47, 26, 5, 4, 14), '#b07a4a', { layers: 2 }, { w: 0.8 });
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

/** A puffy cloud centred on (x, y), `w` wide. */
function cloud(c: Ctx, x: number, y: number, w: number, col = '#eef2f4') {
  const r = w / 4;
  both(c, ellPts(x, y + r * 0.2, w / 2, r * 1.1, 24), col, { layers: 2, edge: 0 }, { w: 0.9 });
  wash(c, ellPts(x, y - r * 0.2, r * 1.2, r * 1.1, 18), col, { layers: 2, edge: 0 });
  ink(c, ellPts(x, y - r * 0.2, r * 1.2, r * 1.1, 18), { w: 0.8, alpha: 0.6 });
}

function sun(c: Ctx, x: number, y: number, r: number, col = '#f0b040') {
  c.save();
  c.strokeStyle = '#c47a20';
  c.lineWidth = 1;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
    c.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
    c.stroke();
  }
  c.restore();
  both(c, ellPts(x, y, r, r, 18), col, { layers: 2, edge: 0 }, { w: 0.9 });
}

/** The weather icons on the town card, 22x22 as shown: a sun and cloud, rain, a bright sun and a parched sun over cracked earth. */
function drawWeather(c: Ctx, kind: string) {
  if (kind === 'fair') sun(c, 11, 11, 5.5);
  if (kind === 'mild') {
    sun(c, 14, 8, 4.2);
    cloud(c, 9, 14, 14);
  }
  if (kind === 'rain') {
    cloud(c, 11, 8, 18, '#cfd8de');
    c.save();
    c.strokeStyle = '#3f6fb0';
    c.lineWidth = 1.3;
    c.lineCap = 'round';
    for (const x of [6, 11, 16]) {
      c.beginPath();
      c.moveTo(x, 14);
      c.lineTo(x - 1.5, 19);
      c.stroke();
    }
    c.restore();
  }
  if (kind === 'drought') {
    sun(c, 11, 8, 4.8, '#e8803a');
    both(c, rectPts(2, 16, 18, 4, 1), '#c9a06a', { layers: 1, edge: 0 }, { w: 0.8 });
    ink(c, [[6, 16], [8, 18], [7, 20]], { closed: false, w: 0.6 });
    ink(c, [[14, 16], [13, 18], [15, 20]], { closed: false, w: 0.6 });
  }
}

export function bakeUi(scene: Phaser.Scene) {
  for (const kind of ['mild', 'rain', 'fair', 'drought']) paint(scene, `weather-${kind}`, 22, 22, (c) => drawWeather(c, kind), 3, 700);
  // The badge on a regular's order bubble.
  paint(scene, 'regular', 12, 12, (c) => sparkle(c, 6, 6, 5.5), 4);
  paint(scene, 'slot', 32, 32, drawSlot, 3);
  paint(scene, 'hourglass', 14, 18, drawHourglass, 3);
  paint(scene, 'sun', 16, 16, drawSun, 3);
  paint(scene, 'bell', 22, 22, drawBell, 3);
  paint(scene, 'rival-stall', 72, 64, drawRivalStall, 3);
  paint(scene, 'wagon', 84, 60, drawWagon, 3);
  paint(scene, 'herb-stall', 64, 52, drawHerbStall, 3);
}
