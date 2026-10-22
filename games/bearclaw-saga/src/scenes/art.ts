// Placeholder art, drawn with Phaser's vector Graphics every frame: no image files. Each figure is
// drawn around its feet (0, 0), facing right; the scene flips the Graphics for facing left. Vector
// shapes stay sharp at any screen size, since the camera's zoom redraws them.

import Phaser from 'phaser';
import type { Form, FoeKind } from '../game/forms';
import type { ClueId, NpcId, Theme } from '../game/story';

type G = Phaser.GameObjects.Graphics;

/** What a figure is doing, for its pose. `t` runs 0 to 1 through the action; `walk` is a phase in radians. */
export interface Pose {
  act: 'idle' | 'walk' | 'windup' | 'strike' | 'block' | 'dodge' | 'hurt' | 'down' | 'stunned';
  t: number;
  walk: number;
  /** A telegraph over the head: yellow for a strike that can be blocked, red for one that can't. */
  warn?: 'yellow' | 'red';
  /** Drawn all white for a moment when hit. */
  flash?: boolean;
  /** Bjarn after the outburst: blood on his clothes. */
  bloody?: boolean;
}

const SKIN = 0xe6b48c;
const DARK = 0x1a1410;

/** The angle of a weapon arm, in radians from pointing straight ahead, by the pose. */
function armAngle(p: Pose) {
  switch (p.act) {
    case 'windup':
      return Phaser.Math.Linear(0.9, -2.2, Math.min(1, p.t * 1.6));
    case 'strike':
      return Phaser.Math.Linear(-2.2, 0.7, Math.min(1, p.t * 2.2));
    case 'block':
      return -1.2;
    case 'hurt':
    case 'stunned':
      return 1.4;
    default:
      return 0.9 + Math.sin(p.walk) * 0.15;
  }
}

function legs(g: G, p: Pose, hipY: number, spread: number, len: number, color: number, w = 7) {
  const swing = p.act === 'walk' ? Math.sin(p.walk) * 0.45 : 0;
  g.lineStyle(w, color);
  for (const [i, s] of [[-1, swing], [1, -swing]] as const) {
    const fx = i * spread * 0.3 + Math.sin(s) * len;
    g.lineBetween(i * spread * 0.3, hipY, fx, 0);
  }
}

function warnMark(g: G, p: Pose, top: number) {
  if (!p.warn) return;
  const col = p.warn === 'red' ? 0xff3b30 : 0xffd23f;
  g.fillStyle(col, 1);
  const n = p.warn === 'red' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 10;
    g.fillRect(x - 2.5, top - 30, 5, 14);
    g.fillCircle(x, top - 10, 3);
  }
}

function weapon(g: G, sx: number, sy: number, a: number, len: number, kind: 'axe' | 'sword' | 'spear' | 'stick' | 'claws', glow?: 'yellow' | 'red') {
  const ex = sx + Math.cos(a) * len;
  const ey = sy + Math.sin(a) * len;
  if (glow) {
    g.lineStyle(12, glow === 'red' ? 0xff3b30 : 0xffd23f, 0.35);
    g.lineBetween(sx, sy, ex, ey);
  }
  if (kind === 'claws') {
    g.lineStyle(3, 0xf2efe6);
    for (const d of [-0.35, 0, 0.35]) g.lineBetween(ex, ey, ex + Math.cos(a + d) * 14, ey + Math.sin(a + d) * 14);
    return;
  }
  g.lineStyle(kind === 'spear' ? 3 : 4, kind === 'sword' ? 0xc8ccd4 : 0x6b4a2b);
  g.lineBetween(sx, sy, ex, ey);
  if (kind === 'axe') {
    g.fillStyle(0xb9bec6, 1);
    const px = -Math.sin(a);
    const py = Math.cos(a);
    g.fillTriangle(ex, ey, ex - Math.cos(a) * 12 + px * 12, ey - Math.sin(a) * 12 + py * 12, ex + px * 4, ey + py * 4);
  } else if (kind === 'spear') {
    g.fillStyle(0xd0d4da, 1);
    const px = -Math.sin(a) * 4;
    const py = Math.cos(a) * 4;
    g.fillTriangle(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12, ex + px, ey + py, ex - px, ey - py);
  }
}

/** A person on two legs: Bjarn as a human, his father, the cultists, Torvald, Sigrun and the others. */
interface Person {
  height: number;
  body: number;
  trim?: number;
  hair: number;
  beard?: number;
  hood?: number;
  mane?: number;
  pelt?: number;
  shield?: number;
  weapon: 'axe' | 'sword' | 'spear' | 'stick';
  hunch?: number;
}

const PEOPLE: Record<string, Person> = {
  bjarn: { height: 64, body: 0x3f6e9e, trim: 0x2a4a6b, hair: 0x6b3f1f, weapon: 'axe' },
  father: { height: 66, body: 0x7a5a3a, trim: 0x4f3a25, hair: 0x9a9a9a, beard: 0xb5b5b5, weapon: 'spear' },
  cultist: { height: 64, body: 0x5a1f24, trim: 0x2b1013, hair: 0x2b1013, hood: 0x3a1418, weapon: 'sword' },
  ulfgar: { height: 78, body: 0x3b3f46, trim: 0x22252a, hair: 0x2a2a2a, beard: 0x3a3a3a, pelt: 0x8d8f94, weapon: 'axe' },
  skarn: { height: 80, body: 0x1d1d22, trim: 0x8a6a1f, hair: 0xc8952e, mane: 0xd9a441, weapon: 'sword' },
  torvald: { height: 58, body: 0x3f5a32, trim: 0x2a3d21, hair: 0xd8d8d8, beard: 0xe8e8e8, weapon: 'stick', hunch: 8 },
  sigrun: { height: 66, body: 0x7d848c, trim: 0x4a5058, hair: 0xe0c070, shield: 0x2f5d9a, weapon: 'spear' },
  warrior: { height: 66, body: 0x6c6255, trim: 0x403a31, hair: 0x5a4a3a, beard: 0x5a4a3a, shield: 0xa8302a, weapon: 'axe' },
};

function person(g: G, look: Person, p: Pose) {
  if (p.act === 'down') return lying(g, look);
  const h = look.height;
  const hip = -h * 0.42;
  const lean = p.act === 'dodge' ? 0 : (look.hunch ?? 0);
  const white = p.flash ? 0xffffff : 0;
  const col = (c: number) => white || c;
  if (p.act === 'dodge') {
    // Rolled up into a ball, turning.
    g.fillStyle(col(look.body), 1);
    g.fillCircle(0, -h * 0.25, h * 0.25);
    g.fillStyle(col(look.hair), 1);
    const a = p.t * Math.PI * 2;
    g.fillCircle(Math.cos(a) * h * 0.16, -h * 0.25 + Math.sin(a) * h * 0.16, h * 0.1);
    return;
  }
  legs(g, p, hip, 14, h * 0.32, col(look.trim ?? DARK));
  // The body, leaning forward a little for a hunched figure.
  const top = -h * 0.82;
  g.fillStyle(col(look.body), 1);
  g.fillPoints([
    new Phaser.Math.Vector2(-10, hip + 4),
    new Phaser.Math.Vector2(10, hip + 4),
    new Phaser.Math.Vector2(9 + lean, top),
    new Phaser.Math.Vector2(-9 + lean, top),
  ], true);
  if (look.pelt) {
    g.fillStyle(col(look.pelt), 1);
    g.fillEllipse(lean, top + 2, 30, 12);
  }
  if (p.bloody) {
    g.fillStyle(0x7a1010, 1);
    g.fillCircle(-3 + lean, top + 14, 3);
    g.fillCircle(4 + lean, top + 22, 2.5);
    g.fillCircle(2, hip + 2, 2);
  }
  // The head.
  const hx = 2 + lean * 1.4;
  const hy = top - 9;
  if (look.mane) {
    g.fillStyle(col(look.mane), 1);
    g.fillCircle(hx - 2, hy, 15);
  }
  if (look.hood) {
    g.fillStyle(col(look.hood), 1);
    g.fillCircle(hx, hy, 11);
    g.fillTriangle(hx - 9, hy - 6, hx - 4, hy - 18, hx + 1, hy - 8);
    g.fillTriangle(hx + 1, hy - 8, hx + 6, hy - 18, hx + 10, hy - 5);
    g.fillStyle(col(0x1a0a0c), 1);
    g.fillCircle(hx + 3, hy + 1, 7);
    g.fillStyle(0xffb000, 1);
    g.fillCircle(hx + 6, hy, 1.5);
  } else {
    g.fillStyle(col(SKIN), 1);
    g.fillCircle(hx, hy, 9);
    g.fillStyle(col(look.hair), 1);
    g.fillEllipse(hx - 3, hy - 5, 18, 9);
    if (look.beard) {
      g.fillStyle(col(look.beard), 1);
      g.fillEllipse(hx + 3, hy + 6, 12, 9);
    }
    g.fillStyle(DARK, 1);
    g.fillCircle(hx + 5, hy - 1, 1.4);
  }
  if (look.shield) {
    g.fillStyle(col(look.shield), 1);
    const raised = p.act === 'block';
    g.fillCircle(raised ? 14 : -2 + lean, raised ? top + 10 : top + 18, 13);
    g.fillStyle(col(0xd8d0b0), 1);
    g.fillCircle(raised ? 14 : -2 + lean, raised ? top + 10 : top + 18, 3);
  }
  // The weapon arm.
  const a = armAngle(p);
  const sx = 4 + lean;
  const sy = top + 6;
  const len = 18;
  const hx2 = sx + Math.cos(a) * len;
  const hy2 = sy + Math.sin(a) * len;
  g.lineStyle(6, col(look.body));
  g.lineBetween(sx, sy, hx2, hy2);
  weapon(g, hx2, hy2, a, look.weapon === 'spear' ? 40 : look.weapon === 'stick' ? 34 : 24, look.weapon, p.warn);
  if (p.act === 'block' && !look.shield) {
    // A forearm raised across the face.
    g.lineStyle(6, col(SKIN));
    g.lineBetween(sx + 4, top + 2, sx + 14, top - 12);
  }
  if (p.act === 'stunned') stars(g, hx, hy - 18, p.walk);
  warnMark(g, p, hy - 12);
}

function lying(g: G, look: Person) {
  const h = look.height;
  g.fillStyle(look.body, 1);
  g.fillRoundedRect(-h * 0.45, -12, h * 0.75, 12, 4);
  g.fillStyle(look.mane ?? (look.hood ? look.hood : SKIN), 1);
  g.fillCircle(h * 0.38, -8, 8);
  g.lineStyle(6, look.trim ?? DARK);
  g.lineBetween(-h * 0.45, -5, -h * 0.75, -3);
  g.fillStyle(0x5a0c0c, 0.6);
  g.fillEllipse(0, 0, h * 0.8, 6);
}

function stars(g: G, x: number, y: number, phase: number) {
  g.fillStyle(0xffe680, 1);
  for (let i = 0; i < 3; i++) {
    const a = phase * 2 + (i * Math.PI * 2) / 3;
    g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 4, 2.5);
  }
}

/** Bjarn's hybrid: a hulking half bear on two legs, with claws. */
function hybrid(g: G, p: Pose) {
  const white = p.flash ? 0xffffff : 0;
  const col = (c: number) => white || c;
  if (p.act === 'dodge') {
    g.fillStyle(col(0x6b4426), 1);
    g.fillCircle(0, -30, 30);
    return;
  }
  if (p.act === 'down') {
    g.fillStyle(0x6b4426, 1);
    g.fillRoundedRect(-45, -18, 90, 18, 6);
    return;
  }
  legs(g, p, -34, 22, 26, col(0x4a2e18), 12);
  const top = -82;
  g.fillStyle(col(0x6b4426), 1);
  g.fillEllipse(2, -58, 46, 58);
  g.fillStyle(col(0x8a6040), 1);
  g.fillEllipse(6, -52, 24, 34);
  // A torn tunic: what is left of Bjarn's clothes.
  g.fillStyle(col(0x2a4a6b), 1);
  g.fillRect(-16, -42, 34, 10);
  const hx = 10;
  const hy = top - 6;
  g.fillStyle(col(0x6b4426), 1);
  g.fillCircle(hx - 8, hy - 12, 6);
  g.fillCircle(hx + 6, hy - 13, 6);
  g.fillCircle(hx, hy, 15);
  g.fillStyle(col(0xa07850), 1);
  g.fillEllipse(hx + 12, hy + 4, 14, 10);
  g.fillStyle(DARK, 1);
  g.fillCircle(hx + 18, hy + 2, 2.5);
  g.fillStyle(0xffc23a, 1);
  g.fillCircle(hx + 6, hy - 4, 2);
  const a = armAngle(p);
  const sx = 10;
  const sy = top + 14;
  const ex = sx + Math.cos(a) * 30;
  const ey = sy + Math.sin(a) * 30;
  g.lineStyle(12, col(0x5a3820));
  g.lineBetween(sx, sy, ex, ey);
  weapon(g, ex, ey, a, 0, 'claws');
  if (p.act === 'block') {
    g.lineStyle(11, col(0x5a3820));
    g.lineBetween(sx + 2, top + 8, sx + 22, top - 14);
  }
}

/** Bjarn's bear: a great brown bear on all fours. */
function bear(g: G, p: Pose) {
  const white = p.flash ? 0xffffff : 0;
  const col = (c: number) => white || c;
  const step = p.act === 'walk' ? Math.sin(p.walk) * 10 : 0;
  // A swipe rears the front up.
  const rear = p.act === 'windup' ? Math.min(1, p.t * 1.5) * 26 : p.act === 'strike' ? (1 - p.t) * 26 : 0;
  g.lineStyle(16, col(0x3f2612));
  g.lineBetween(-38, -40, -38 + step, 0);
  g.lineBetween(-20, -40, -20 - step, 0);
  g.lineBetween(26, -42 - rear, 26 - step + (rear ? 16 : 0), -rear * 0.6);
  g.lineBetween(42, -42 - rear, 42 + step + (rear ? 22 : 0), -rear * 0.4);
  g.fillStyle(col(0x5a3418), 1);
  g.fillEllipse(0, -56 - rear * 0.4, 120, 56);
  g.fillEllipse(-10, -76 - rear * 0.3, 70, 26);
  const hx = 62;
  const hy = -64 - rear;
  g.fillCircle(hx - 6, hy - 18, 8);
  g.fillCircle(hx + 10, hy - 18, 8);
  g.fillCircle(hx, hy, 22);
  g.fillStyle(col(0x8a6040), 1);
  g.fillEllipse(hx + 20, hy + 6, 22, 15);
  g.fillStyle(DARK, 1);
  g.fillCircle(hx + 30, hy + 3, 4);
  g.fillStyle(0xffc23a, 1);
  g.fillCircle(hx + 8, hy - 6, 2.5);
  if (p.act === 'strike') {
    g.lineStyle(4, 0xf2efe6, 1 - p.t);
    for (let i = 0; i < 3; i++) g.lineBetween(70 + i * 10, -90 + i * 6, 110 + i * 10, -20 + i * 6);
  }
  if (p.act === 'dodge') {
    g.lineStyle(3, 0xffffff, 0.4);
    g.lineBetween(-70, -40, -100, -40);
  }
}

/** The boar of the hunt. */
function boar(g: G, p: Pose) {
  const col = (c: number) => (p.flash ? 0xffffff : c);
  const step = p.act === 'walk' ? Math.sin(p.walk * 1.4) * 7 : 0;
  const dip = p.act === 'windup' ? 6 : 0;
  g.lineStyle(7, col(0x2a1d14));
  g.lineBetween(-20, -18, -20 + step, 0);
  g.lineBetween(18, -18, 18 - step, 0);
  g.fillStyle(col(0x4a3426), 1);
  g.fillEllipse(0, -26 + dip * 0.3, 66, 34);
  g.fillStyle(col(0x2a1d14), 1);
  g.fillTriangle(-20, -40, 10, -46, 20, -36);
  g.fillStyle(col(0x5a4030), 1);
  g.fillEllipse(32, -24 + dip, 26, 22);
  g.fillStyle(col(0x7a5a48), 1);
  g.fillEllipse(44, -20 + dip, 10, 10);
  g.fillStyle(0xf0ead8, 1);
  g.fillTriangle(38, -16 + dip, 46, -28 + dip, 42, -14 + dip);
  g.fillStyle(DARK, 1);
  g.fillCircle(34, -30 + dip, 2);
  if (p.act === 'stunned') stars(g, 30, -50, p.walk);
  warnMark(g, p, -50);
}

/** A wolf, or Ulfgar's giant wolf (drawn bigger and darker by the scene). */
function wolf(g: G, p: Pose, giant: boolean) {
  const col = (c: number) => (p.flash ? 0xffffff : c);
  const fur = giant ? 0x3a3c42 : 0x7d8088;
  const belly = giant ? 0x5a5c62 : 0xa6a9b0;
  const step = p.act === 'walk' ? Math.sin(p.walk * 1.5) * 9 : 0;
  const crouch = p.act === 'windup' ? 6 : 0;
  const leap = p.act === 'strike' ? Math.sin(p.t * Math.PI) * 14 : 0;
  g.lineStyle(6, col(fur));
  g.lineBetween(-22, -22 + crouch - leap, -24 + step, -leap);
  g.lineBetween(20, -22 + crouch - leap, 22 - step, -leap);
  g.fillStyle(col(fur), 1);
  g.fillEllipse(0, -30 + crouch - leap, 64, 24);
  g.fillStyle(col(belly), 1);
  g.fillEllipse(4, -24 + crouch - leap, 40, 10);
  g.fillStyle(col(fur), 1);
  g.fillTriangle(-30, -34 - leap, -56, -44 - leap, -48, -30 - leap);
  const hx = 34;
  const hy = -38 + crouch - leap;
  g.fillCircle(hx, hy, 11);
  g.fillTriangle(hx - 6, hy - 6, hx - 2, hy - 20, hx + 3, hy - 8);
  g.fillTriangle(hx + 18, hy - 2, hx + 6, hy - 6, hx + 6, hy + 6);
  g.fillStyle(giant ? 0xffd23f : 0xf0e080, 1);
  g.fillCircle(hx + 3, hy - 3, giant ? 2.4 : 1.6);
  if (p.act === 'strike') {
    g.fillStyle(0xf2efe6, 1);
    g.fillTriangle(hx + 8, hy + 2, hx + 18, hy + 2, hx + 12, hy + 7);
  }
  if (p.act === 'stunned') stars(g, hx, hy - 16, p.walk);
  warnMark(g, p, hy - 10);
}

/** Ratatoskr, the squirrel of the World Tree: small, red and with a big curled tail. */
export function drawSquirrel(g: G, hop: number) {
  g.clear();
  const y = -Math.abs(Math.sin(hop)) * 6;
  g.fillStyle(0xb5521f, 1);
  g.fillEllipse(-9, y - 18, 14, 26);
  g.fillCircle(-12, y - 30, 7);
  g.fillEllipse(0, y - 8, 14, 14);
  g.fillCircle(6, y - 16, 6);
  g.fillTriangle(4, y - 21, 6, y - 28, 9, y - 21);
  g.fillStyle(0xf0d8b0, 1);
  g.fillEllipse(2, y - 6, 6, 8);
  g.fillStyle(DARK, 1);
  g.fillCircle(8, y - 17, 1.3);
}

/** Bjarn in his current form. */
export function drawBjarn(g: G, form: Form, p: Pose) {
  g.clear();
  if (form === 'human') person(g, PEOPLE.bjarn, p);
  else if (form === 'hybrid') hybrid(g, p);
  else bear(g, p);
}

export function drawFoe(g: G, kind: FoeKind, p: Pose) {
  g.clear();
  if (kind === 'boar') boar(g, p);
  else if (kind === 'wolf') wolf(g, p, false);
  else if (kind === 'giantWolf') wolf(g, p, true);
  else person(g, PEOPLE[kind === 'torvald' ? 'torvald' : kind], p);
}

export function drawNpc(g: G, id: NpcId, p: Pose) {
  g.clear();
  if (id === 'ulfgarBody') return person(g, PEOPLE.ulfgar, { ...p, act: 'down' });
  person(g, PEOPLE[id === 'warrior1' || id === 'warrior2' ? 'warrior' : id], p);
}

/** A track to look at in the trail chapter, drawn at its spot on the ground. */
export function drawClue(g: G, id: ClueId, seen: boolean) {
  g.clear();
  if (id === 'torn') {
    for (const [x, r] of [[-40, 0.2], [30, -0.1]] as const) {
      g.fillStyle(0x3a1418, 1);
      g.fillRoundedRect(x - 26, -10 + r * 10, 52, 10, 3);
      g.fillStyle(0x1a0a0c, 1);
      g.fillCircle(x + 28, -6, 7);
    }
    g.lineStyle(3, 0x5a0c0c);
    for (let i = 0; i < 3; i++) g.lineBetween(-20 + i * 8, -16, -8 + i * 8, 0);
  } else if (id === 'paws') {
    g.fillStyle(0x4a3a30, 0.8);
    for (let i = 0; i < 4; i++) {
      const x = -90 + i * 46;
      g.fillEllipse(x, -2, 20, 8);
      for (let k = 0; k < 4; k++) g.fillCircle(x + 8 + k * 0 - 6 + k * 4, -7, 2);
    }
    g.fillStyle(0x6a5a4a, 0.8);
    g.fillEllipse(96, -2, 12, 5);
    g.fillEllipse(118, -3, 12, 5);
  } else {
    g.fillStyle(0x3d2c20, 1);
    g.fillRect(-60, -70, 120, 70);
    g.fillStyle(0x22180f, 1);
    g.fillTriangle(-70, -70, 0, -110, 70, -70);
    g.fillStyle(0x0d0906, 1);
    g.fillPoints([new Phaser.Math.Vector2(-20, 0), new Phaser.Math.Vector2(-30, -50), new Phaser.Math.Vector2(0, -66), new Phaser.Math.Vector2(28, -40), new Phaser.Math.Vector2(18, 0)], true);
    g.lineStyle(4, 0x6b4a2b);
    g.lineBetween(-60, -30, -90, -6);
    g.lineBetween(50, -60, 84, -40);
  }
  if (!seen) {
    g.fillStyle(0xffe680, 0.9);
    g.fillCircle(0, id === 'hut' ? -126 : -40, 5);
  }
}

/** A sprig of healing herbs: green leaves and small white flowers. */
export function drawHerb(g: G) {
  g.clear();
  g.lineStyle(2, 0x2f6b2a);
  g.lineBetween(0, 0, 0, -18);
  g.fillStyle(0x4fa83f, 1);
  g.fillEllipse(-6, -8, 10, 5);
  g.fillEllipse(6, -12, 10, 5);
  g.fillEllipse(-5, -16, 9, 4);
  g.fillStyle(0xf4f4ea, 1);
  g.fillCircle(0, -20, 2.5);
  g.fillCircle(4, -18, 2);
}

interface Palette {
  skyTop: number;
  skyBottom: number;
  far: number;
  farCap?: number;
  trees: number;
  treeCap?: number;
  ground: number;
  groundEdge: number;
}

const PALETTES: Record<Theme, Palette> = {
  snow: { skyTop: 0x1b2a4a, skyBottom: 0x8aa3c4, far: 0x4a5a78, farCap: 0xe8eef6, trees: 0x1f3a2c, treeCap: 0xe8eef6, ground: 0xdfe6ee, groundEdge: 0xb8c4d2 },
  village: { skyTop: 0x1b2a4a, skyBottom: 0x8aa3c4, far: 0x4a5a78, trees: 0x1f3a2c, ground: 0xcfd6de, groundEdge: 0x9aa4b0 },
  fire: { skyTop: 0x1a0606, skyBottom: 0xb2451c, far: 0x3a1a14, trees: 0x1a0f0c, ground: 0x6a5a52, groundEdge: 0x3a2e2a },
  dawn: { skyTop: 0x34507a, skyBottom: 0xf0a878, far: 0x6a6a8a, farCap: 0xf6e6e0, trees: 0x24402e, treeCap: 0xf0e6e6, ground: 0xe6e0e0, groundEdge: 0xbab0b4 },
  forest: { skyTop: 0x0c1810, skyBottom: 0x3a5a3e, far: 0x1c3022, trees: 0x10241a, ground: 0x3c4a2c, groundEdge: 0x26301c },
  clearing: { skyTop: 0x0a0e1e, skyBottom: 0x34405e, far: 0x1a2236, trees: 0x0e1a16, ground: 0x4a5848, groundEdge: 0x2e3a2e },
};

/** A seeded number generator, so a chapter's backdrop is the same every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function fir(g: G, x: number, base: number, h: number, color: number, cap?: number) {
  g.fillStyle(color, 1);
  g.fillRect(x - 3, base - h * 0.2, 6, h * 0.2);
  for (let i = 0; i < 3; i++) {
    const w = h * (0.42 - i * 0.1);
    const y0 = base - h * 0.15 - i * h * 0.24;
    g.fillTriangle(x - w, y0, x + w, y0, x, y0 - h * 0.42);
    if (cap) {
      g.fillStyle(cap, 0.85);
      g.fillTriangle(x - w * 0.35, y0 - h * 0.28, x + w * 0.35, y0 - h * 0.28, x, y0 - h * 0.42);
      g.fillStyle(color, 1);
    }
  }
}

function house(g: G, x: number, base: number, burning: boolean, rnd: () => number) {
  const w = 120 + rnd() * 40;
  const h = 70 + rnd() * 20;
  g.fillStyle(burning ? 0x2a1a14 : 0x5a4030, 1);
  g.fillRect(x - w / 2, base - h, w, h);
  g.fillStyle(burning ? 0x1a0f0c : 0x3a2a20, 1);
  g.fillTriangle(x - w / 2 - 14, base - h, x + w / 2 + 14, base - h, x, base - h - 60);
  g.fillStyle(burning ? 0xff8a2a : 0xffcf70, 1);
  g.fillRect(x - 12, base - h * 0.6, 22, 18);
  if (burning) {
    for (let i = 0; i < 4; i++) {
      const fx = x - w / 2 + 20 + rnd() * (w - 40);
      const fh = 30 + rnd() * 50;
      g.fillStyle(0xff6a1a, 0.9);
      g.fillTriangle(fx - 16, base - h - 10, fx + 16, base - h - 10, fx, base - h - 10 - fh);
      g.fillStyle(0xffd23f, 0.9);
      g.fillTriangle(fx - 8, base - h - 10, fx + 8, base - h - 10, fx, base - h - 10 - fh * 0.55);
    }
  }
}

/**
 * Paints a chapter's backdrop: the sky, far mountains and trees that scroll slower than the ground
 * (parallax), and the ground strip Bjarn walks on. Returns the layers so the scene can destroy them.
 */
export function paintBackdrop(scene: Phaser.Scene, theme: Theme, length: number, view: { width: number; height: number }, groundY: number) {
  const pal = PALETTES[theme];
  const rnd = seeded(length + theme.length * 97);
  const layers: Phaser.GameObjects.Graphics[] = [];
  const W = length + view.width;

  const sky = scene.add.graphics().setDepth(-100);
  // The sky's gradient in bands, which both the WebGL and the canvas renderer draw.
  const bands = 32;
  const top = Phaser.Display.Color.ValueToColor(pal.skyTop);
  const bottom = Phaser.Display.Color.ValueToColor(pal.skyBottom);
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
    sky.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    sky.fillRect(-view.width, Math.floor((groundY * i) / bands), W + view.width * 2, Math.ceil(groundY / bands) + 1);
  }
  if (theme === 'clearing' || theme === 'forest' || theme === 'snow') {
    sky.fillStyle(0xf4f0e0, 0.9);
    sky.fillCircle(length * 0.6, 80, 26);
    sky.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 60; i++) sky.fillCircle(rnd() * W, rnd() * groundY * 0.5, rnd() < 0.2 ? 1.6 : 1);
  }
  layers.push(sky);

  const far = scene.add.graphics().setDepth(-90).setScrollFactor(0.25, 1);
  far.fillStyle(pal.far, 1);
  for (let x = -200; x < W * 0.25 + view.width + 200; x += 180 + rnd() * 120) {
    const h = 110 + rnd() * 120;
    far.fillTriangle(x - 180, groundY - 20, x + 180, groundY - 20, x, groundY - 20 - h);
    if (pal.farCap) {
      far.fillStyle(pal.farCap, 0.9);
      far.fillTriangle(x - 40, groundY - 20 - h * 0.78, x + 40, groundY - 20 - h * 0.78, x, groundY - 20 - h);
      far.fillStyle(pal.far, 1);
    }
  }
  far.fillRect(-200, groundY - 30, W * 0.25 + view.width + 400, 40);
  layers.push(far);

  const mid = scene.add.graphics().setDepth(-80).setScrollFactor(0.55, 1);
  const midW = W * 0.55 + view.width + 200;
  if (theme === 'fire' || theme === 'village') {
    for (let x = 100; x < midW; x += 220 + rnd() * 120) house(mid, x, groundY - 6, theme === 'fire', rnd);
    mid.fillStyle(0xff8a2a, 0.12);
    mid.fillRect(-200, groundY - 160, midW + 400, 160);
  } else {
    const dense = theme === 'forest' ? 34 : 70;
    for (let x = -100; x < midW; x += dense + rnd() * dense) fir(mid, x, groundY - 4, 90 + rnd() * 90, pal.trees, pal.treeCap);
  }
  layers.push(mid);

  const ground = scene.add.graphics().setDepth(-70);
  ground.fillStyle(pal.groundEdge, 1);
  ground.fillRect(-view.width, groundY - 8, W + view.width * 2, 10);
  ground.fillStyle(pal.ground, 1);
  ground.fillRect(-view.width, groundY, W + view.width * 2, view.height);
  ground.fillStyle(pal.groundEdge, 0.5);
  for (let i = 0; i < length / 30; i++) ground.fillEllipse(rnd() * length, groundY + 20 + rnd() * (view.height - groundY), 30 + rnd() * 40, 4);
  // A few trees right on the walking strip, behind the fighters.
  if (theme !== 'fire') {
    for (let x = 300; x < length; x += 500 + rnd() * 400) fir(ground, x, groundY - 2, 160 + rnd() * 60, pal.trees, pal.treeCap);
  } else {
    for (let x = 400; x < length; x += 700 + rnd() * 300) house(ground, x, groundY - 2, true, rnd);
  }
  layers.push(ground);
  return layers;
}
