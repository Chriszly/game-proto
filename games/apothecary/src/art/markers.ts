import Phaser from 'phaser';
import { paint, pathOf, type Ctx, type Pt } from './paint';

// Floor markers: a dashed ring in its marker's colour with nothing inside but a faint symbol, so the
// ground shows through. Bright colours, so they read on the dark earth. 44x44 as shown.

/** Marker colours, one per kind of marker. */
export const MARKER = { drop: '#7fe39a', pickUp: '#ffd45e', work: '#86c8ff', upgrade: '#d2adff' };

type Symbol = 'drop' | 'pickUp' | 'work' | 'upgrade';

/**
 * The icons of the purple markers, one for each kind of thing they buy: a station's level or the
 * station itself, an outfitter's or guild's upgrade, the study, a craftsman, and each build.
 */
export const UPGRADE_ICONS = [
  'refiner',
  'cauldron',
  'counter',
  'pack',
  'boots',
  'sickle',
  'growth',
  'belts',
  'storage',
  'prices',
  'slots',
  'customers',
  'research',
  'herbalist',
  'hire',
  'land',
  'field',
  'shade',
  'pixies',
  'guild',
] as const;
export type UpgradeIcon = (typeof UPGRADE_ICONS)[number];

/** The texture of a purple marker with an icon. */
export const upgradePad = (icon: UpgradeIcon) => `pad-up-${icon}`;

const circle = (c: Ctx, x: number, y: number, r: number) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
};
const line = (c: Ctx, points: Pt[]) => {
  c.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.stroke();
};
/** A head and shoulders standing on the ground at `x`, `y`. */
const person = (c: Ctx, x: number, y: number, s = 1) => {
  circle(c, x, y - 11 * s, 3 * s);
  c.fill();
  c.beginPath();
  c.moveTo(x - 6 * s, y);
  c.quadraticCurveTo(x - 6 * s, y - 7 * s, x, y - 7 * s);
  c.quadraticCurveTo(x + 6 * s, y - 7 * s, x + 6 * s, y);
  c.closePath();
  c.fill();
};
const sprout = (c: Ctx, x: number, y: number, s = 1) => {
  line(c, [[x, y], [x, y - 7 * s]]);
  c.beginPath();
  c.ellipse(x - 3.5 * s, y - 7 * s, 3.5 * s, 1.8 * s, -0.5, 0, Math.PI * 2);
  c.ellipse(x + 3.5 * s, y - 8 * s, 3.5 * s, 1.8 * s, 0.5, 0, Math.PI * 2);
  c.fill();
};
/** A four-pointed sparkle. */
const sparkle = (c: Ctx, x: number, y: number, r: number) => {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.32;
    c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  c.closePath();
  c.fill();
};

/** Each purple marker's icon, centred on the marker, in the stroke and fill already set. */
const ICONS: Record<UpgradeIcon, (c: Ctx, x: number, y: number) => void> = {
  // A table with a mortar on it.
  refiner: (c, x, y) => {
    line(c, [[x - 10, y + 1], [x + 10, y + 1]]);
    line(c, [[x - 7, y + 1], [x - 7, y + 9]]);
    line(c, [[x + 7, y + 1], [x + 7, y + 9]]);
    c.beginPath();
    c.moveTo(x - 5, y - 6);
    c.lineTo(x + 5, y - 6);
    c.quadraticCurveTo(x + 4, y - 1, x, y - 1);
    c.quadraticCurveTo(x - 4, y - 1, x - 5, y - 6);
    c.fill();
  },
  // A pot on legs with a bubble over it.
  cauldron: (c, x, y) => {
    c.beginPath();
    c.moveTo(x - 9, y - 3);
    c.lineTo(x + 9, y - 3);
    c.quadraticCurveTo(x + 9, y + 7, x, y + 7);
    c.quadraticCurveTo(x - 9, y + 7, x - 9, y - 3);
    c.fill();
    line(c, [[x - 5, y + 6], [x - 7, y + 10]]);
    line(c, [[x + 5, y + 6], [x + 7, y + 10]]);
    circle(c, x - 2, y - 8, 2);
    c.stroke();
    circle(c, x + 4, y - 10, 1.4);
    c.stroke();
  },
  // A shop's scalloped awning over its counter.
  counter: (c, x, y) => {
    c.beginPath();
    c.moveTo(x - 10, y - 9);
    c.lineTo(x + 10, y - 9);
    c.lineTo(x + 10, y - 3);
    for (let i = 0; i < 4; i++) c.arc(x + 7.5 - i * 5, y - 3, 2.5, 0, Math.PI);
    c.closePath();
    c.fill();
    c.strokeRect(x - 8, y + 2, 16, 7);
  },
  // A backpack with its flap and pocket.
  pack: (c, x, y) => {
    c.beginPath();
    c.roundRect(x - 7, y - 7, 14, 17, 4);
    c.stroke();
    line(c, [[x - 7, y - 1], [x + 7, y - 1]]);
    c.fillRect(x - 3, y + 2, 6, 4);
    c.beginPath();
    c.arc(x, y - 7, 3, Math.PI, 0);
    c.stroke();
  },
  // A boot, toe to the right.
  boots: (c, x, y) => {
    c.beginPath();
    c.moveTo(x - 6, y - 10);
    c.lineTo(x + 1, y - 10);
    c.lineTo(x + 1, y + 1);
    c.lineTo(x + 9, y + 4);
    c.lineTo(x + 9, y + 9);
    c.lineTo(x - 6, y + 9);
    c.closePath();
    c.fill();
  },
  // A curved blade on a handle.
  sickle: (c, x, y) => {
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x + 1, y - 1, 8, Math.PI * 1.05, Math.PI * 0.2);
    c.stroke();
    c.lineWidth = 3.5;
    line(c, [[x - 1, y + 4], [x - 7, y + 10]]);
  },
  // A sprout taller than the bed beside it.
  growth: (c, x, y) => {
    sprout(c, x - 1, y + 9, 1.5);
    line(c, [[x - 10, y + 9], [x + 10, y + 9]]);
    line(c, [[x + 8, y - 2], [x + 8, y - 9]]);
    line(c, [[x + 5, y - 6], [x + 8, y - 9], [x + 11, y - 6]]);
  },
  // A sparkle with speed lines behind it: faster pixies.
  belts: (c, x, y) => {
    sparkle(c, x + 4, y, 8);
    line(c, [[x - 11, y - 4], [x - 4, y - 4]]);
    line(c, [[x - 12, y + 1], [x - 5, y + 1]]);
    line(c, [[x - 10, y + 6], [x - 3, y + 6]]);
  },
  // A crate braced across.
  storage: (c, x, y) => {
    c.strokeRect(x - 9, y - 8, 18, 16);
    line(c, [[x - 9, y - 8], [x + 9, y + 8]]);
    line(c, [[x - 9, y - 2], [x + 9, y - 2]]);
  },
  // A price tag with its hole and string.
  prices: (c, x, y) => {
    c.beginPath();
    c.moveTo(x - 9, y - 3);
    c.lineTo(x - 3, y - 9);
    c.lineTo(x + 9, y - 9);
    c.lineTo(x + 9, y + 9);
    c.lineTo(x - 3, y + 9);
    c.lineTo(x - 9, y + 3);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    circle(c, x - 3, y, 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  // Places in a queue, the last one new.
  slots: (c, x, y) => {
    person(c, x - 6, y + 6, 0.8);
    person(c, x + 3, y + 6, 0.8);
    c.setLineDash([2, 2]);
    circle(c, x + 10, y - 3, 3);
    c.stroke();
    c.setLineDash([]);
  },
  // A crowd: one in front of another.
  customers: (c, x, y) => {
    person(c, x + 4, y + 4, 0.9);
    person(c, x - 3, y + 9, 1);
  },
  // An open book.
  research: (c, x, y) => {
    c.beginPath();
    c.moveTo(x, y - 5);
    c.quadraticCurveTo(x - 5, y - 9, x - 10, y - 7);
    c.lineTo(x - 10, y + 7);
    c.quadraticCurveTo(x - 5, y + 5, x, y + 9);
    c.quadraticCurveTo(x + 5, y + 5, x + 10, y + 7);
    c.lineTo(x + 10, y - 7);
    c.quadraticCurveTo(x + 5, y - 9, x, y - 5);
    c.closePath();
    c.stroke();
    line(c, [[x, y - 5], [x, y + 9]]);
  },
  // A leaf with a drop of dew on it: the herbalist who keeps the beds clear of blight.
  herbalist: (c, x, y) => {
    c.beginPath();
    c.moveTo(x - 9, y + 8);
    c.quadraticCurveTo(x - 9, y - 8, x + 9, y - 9);
    c.quadraticCurveTo(x + 9, y + 7, x - 9, y + 8);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    line(c, [[x - 8, y + 7], [x + 7, y - 7]]);
    c.globalCompositeOperation = 'source-over';
    circle(c, x + 6, y + 5, 2.2);
    c.fill();
  },
  // A craftsman in a cap.
  hire: (c, x, y) => {
    person(c, x, y + 10, 1.2);
    c.fillRect(x - 5, y - 9, 10, 2);
    c.fillRect(x - 3, y - 12, 6, 3);
  },
  // A flag planted on a mound.
  land: (c, x, y) => {
    line(c, [[x - 4, y + 7], [x - 4, y - 10]]);
    c.beginPath();
    c.moveTo(x - 4, y - 10);
    c.lineTo(x + 8, y - 6);
    c.lineTo(x - 4, y - 2);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(x - 11, y + 10);
    c.quadraticCurveTo(x, y + 3, x + 11, y + 10);
    c.stroke();
  },
  // Three sprouts in a row.
  field: (c, x, y) => {
    for (const dx of [-7, 0, 7]) sprout(c, x + dx, y + 7, 1);
    line(c, [[x - 11, y + 8], [x + 11, y + 8]]);
  },
  // A crescent moon over a sprout: nightshade.
  shade: (c, x, y) => {
    c.beginPath();
    c.arc(x + 1, y - 3, 7, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    circle(c, x + 5, y - 6, 6);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    sprout(c, x + 6, y + 10, 0.8);
  },
  // A pixie's wings with a sparkle.
  pixies: (c, x, y) => {
    c.beginPath();
    c.ellipse(x - 5, y - 2, 5, 8, -0.5, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(x + 5, y - 2, 5, 8, 0.5, 0, Math.PI * 2);
    c.stroke();
    sparkle(c, x, y + 6, 4);
  },
  // The guild's banner on its pole.
  guild: (c, x, y) => {
    line(c, [[x - 9, y - 10], [x + 9, y - 10]]);
    c.beginPath();
    c.moveTo(x - 7, y - 10);
    c.lineTo(x + 7, y - 10);
    c.lineTo(x + 7, y + 9);
    c.lineTo(x, y + 4);
    c.lineTo(x - 7, y + 9);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    sparkle(c, x, y - 3, 4);
    c.globalCompositeOperation = 'source-over';
  },
};

/** The marker's symbol, faint, in its colour: a mortar and pestle to work, an arrow down to drop off, up to pick up or pay. */
function symbol(c: Ctx, kind: Symbol, color: string, x = 22) {
  const y = 22;
  c.save();
  c.globalAlpha = 0.6;
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'work') {
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 1, y - 2);
    c.lineTo(x + 6, y - 9);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 8, y - 1);
    c.lineTo(x + 8, y - 1);
    c.quadraticCurveTo(x + 6, y + 8, x, y + 8);
    c.quadraticCurveTo(x - 6, y + 8, x - 8, y - 1);
    c.closePath();
    c.stroke();
  } else {
    const d = kind === 'drop' ? 1 : -1;
    pathOf(c, [[x - 3, y - 8 * d], [x + 3, y - 8 * d], [x + 3, y], [x + 7, y], [x, y + 8 * d], [x - 7, y], [x - 3, y]]);
    c.fill();
  }
  c.restore();
}

/** A purple marker's own icon, faint like the other symbols. */
function icon(c: Ctx, which: UpgradeIcon) {
  c.save();
  c.globalAlpha = 0.6;
  c.fillStyle = MARKER.upgrade;
  c.strokeStyle = MARKER.upgrade;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  ICONS[which](c, 22, 22);
  c.restore();
}

/** What a pick-up marker gives, drawn small beside its arrow: a sack of goods, an empty bottle or a coin. */
export type PickUpIcon = 'sack' | 'bottle' | 'coin';

/** A pick-up marker with what it gives beside the arrow. */
export const pickUpPad = (what: PickUpIcon) => `pad-out-${what}`;

/** The small schematic of what a pick-up marker gives, faint like the arrow, centred on (x, y). */
function pickUpIcon(c: Ctx, what: PickUpIcon, x: number, y: number) {
  c.save();
  c.globalAlpha = 0.75;
  c.strokeStyle = MARKER.pickUp;
  c.fillStyle = MARKER.pickUp;
  c.lineWidth = 1.6;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  if (what === 'sack') {
    // A sack tied at the neck.
    c.moveTo(x - 2, y - 5);
    c.lineTo(x + 2, y - 5);
    c.quadraticCurveTo(x + 6, y + 1, x + 4.5, y + 6);
    c.lineTo(x - 4.5, y + 6);
    c.quadraticCurveTo(x - 6, y + 1, x - 2, y - 5);
    c.stroke();
    c.beginPath();
    c.moveTo(x - 3, y - 3.2);
    c.lineTo(x + 3, y - 3.2);
    c.stroke();
  } else if (what === 'bottle') {
    // An empty round flask with a neck.
    c.moveTo(x - 1.5, y - 6);
    c.lineTo(x - 1.5, y - 2);
    c.arc(x, y + 2.5, 4.8, -Math.PI / 2 - 0.32, Math.PI * 1.5 + 0.32, true);
    c.lineTo(x + 1.5, y - 6);
    c.stroke();
    c.beginPath();
    c.moveTo(x - 2.6, y - 6);
    c.lineTo(x + 2.6, y - 6);
    c.stroke();
  } else {
    c.arc(x, y, 5.5, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(x, y, 2.6, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawPad(c: Ctx, color: string, kind: Symbol | UpgradeIcon, ringOnly = false) {
  c.save();
  // A dark rim under the ring, so it reads on light boards as on dark earth.
  c.setLineDash([5, 4]);
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(42,29,20,0.45)';
  c.lineWidth = 4.2;
  c.beginPath();
  c.arc(22, 22, 18, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 2.6;
  c.stroke();
  c.restore();
  if (ringOnly) return;
  if (kind === 'drop' || kind === 'pickUp' || kind === 'work' || kind === 'upgrade') symbol(c, kind, color);
  else icon(c, kind);
}

export function bakeMarkers(scene: Phaser.Scene) {
  paint(scene, 'pad-in', 44, 44, (c) => drawPad(c, MARKER.drop, 'drop'), 3);
  paint(scene, 'pad-out', 44, 44, (c) => drawPad(c, MARKER.pickUp, 'pickUp'), 3);
  paint(scene, 'pad-work', 44, 44, (c) => drawPad(c, MARKER.work, 'work'), 3);
  paint(scene, 'pad-up', 44, 44, (c) => drawPad(c, MARKER.upgrade, 'upgrade'), 3);
  // Pick-up markers that say what they give: the arrow moves left and the icon stands right of it.
  for (const what of ['sack', 'bottle', 'coin'] as const) {
    paint(scene, pickUpPad(what), 44, 44, (c) => {
      drawPad(c, MARKER.pickUp, 'drop', true);
      symbol(c, 'pickUp', MARKER.pickUp, 17);
      pickUpIcon(c, what, 28, 22);
    }, 3);
  }
  for (const which of UPGRADE_ICONS) paint(scene, upgradePad(which), 44, 44, (c) => drawPad(c, MARKER.upgrade, which), 3);
}
