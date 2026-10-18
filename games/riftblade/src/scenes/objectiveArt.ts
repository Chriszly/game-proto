/**
 * Drawing the side objectives (zones, spots, structures, the pilgrim) and the power-ups, in code
 * with the graphics layers, in the game's glow style. No textures are baked for them, so boot
 * makes the same textures (and Phaser the same Math.random draws) as before.
 */
import type Phaser from 'phaser';
import { POWER, isStructure, type Enemy, type GameState, type Pickup, type PowerUp } from '../game/state';
import { OBJ_MISC } from '../game/objectives';
import { C, hex } from '../art/glow';

type G = Phaser.GameObjects.Graphics;

/** The objectives' colour: a cool cyan, apart from every hero's accent and the foes' colours. */
export const OBJ_COLOR = 0x7fe3ff;

/** Under the sprites: the zone, the spots to reach, the escort's goal and the pilgrim. */
export function drawObjectiveGround(g: G, s: GameState, still: boolean) {
  const o = s.objective;
  if (!o) return;
  const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(s.time / 260);
  const zone = ['defend', 'dropzone', 'lift', 'signal', 'zone'].includes(o.id);
  if (zone) {
    const k = o.id === 'zone' ? 1 : Math.min(1, o.done / o.goal);
    g.fillStyle(OBJ_COLOR, o.id === 'zone' ? 0.04 : 0.07).fillCircle(o.x, o.y, o.r);
    g.lineStyle(3, OBJ_COLOR, 0.5 + 0.3 * pulse).strokeCircle(o.x, o.y, o.r);
    if (o.id !== 'zone' && o.id !== 'signal') {
      g.lineStyle(5, OBJ_COLOR, 0.9).beginPath().arc(o.x, o.y, o.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
    }
    // A drop zone gets a landing cross-hatch of chevrons (in cyan, never a cross).
    if (o.id === 'dropzone') {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const x = o.x + Math.cos(a) * o.r * 0.55;
        const y = o.y + Math.sin(a) * o.r * 0.55;
        g.lineStyle(2, OBJ_COLOR, 0.6).lineBetween(x, y, x - Math.cos(a - 0.5) * 12, y - Math.sin(a - 0.5) * 12);
        g.lineBetween(x, y, x - Math.cos(a + 0.5) * 12, y - Math.sin(a + 0.5) * 12);
      }
    }
  }
  if (o.id === 'escort') {
    g.lineStyle(2, OBJ_COLOR, 0.5).strokeCircle(o.toX, o.toY, 30);
    g.fillStyle(OBJ_COLOR, 0.12 + 0.1 * pulse).fillCircle(o.toX, o.toY, 30);
    const w = o.ward!;
    g.lineStyle(1, OBJ_COLOR, 0.25).strokeCircle(w.x, w.y, OBJ_MISC.escortNear);
  }
  const need = OBJ_MISC.standMs[o.id];
  if (need !== undefined) {
    for (const q of o.points) {
      const done = need === 0 ? q.ms > 0 : q.ms > need;
      const k = need === 0 ? (done ? 1 : 0) : Math.min(1, q.ms / need);
      drawSpot(g, o.id, q.x, q.y, o.r, done, k, pulse);
    }
  }
  if (o.id === 'pilgrim' && o.ward) drawPilgrim(g, o.ward.x, o.ward.y, s.time, still);
  if (o.ward) bar(g, o.ward.x, o.ward.y - 42, o.ward.hp / o.ward.maxHp, 40);
  // The marked elite of a duel.
  if (o.id === 'duel') {
    for (const e of s.enemies) if (o.ids.includes(e.id)) g.lineStyle(3, OBJ_COLOR, 0.6 + 0.3 * pulse).strokeCircle(e.x, e.y, e.r + 10);
  }
}

/** A spot to reach: a frozen trooper's ice block, a lava vent, a recon marker or a scrap pile. */
function drawSpot(g: G, id: string, x: number, y: number, r: number, done: boolean, k: number, pulse: number) {
  if (id === 'seal') {
    // A vent: a glowing crack, cooled to grey once sealed.
    g.fillStyle(done ? 0x3a3a44 : 0xff6a3c, done ? 0.5 : 0.22 + 0.15 * pulse).fillCircle(x, y, r * 0.8);
    g.lineStyle(3, done ? 0x6a6a78 : 0xffb347, 0.9).lineBetween(x - 14, y - 4, x - 2, y + 3).lineBetween(x - 2, y + 3, x + 12, y - 6);
  } else if (id === 'thaw') {
    // An ice block (the trooper is drawn by the scene on top of it).
    if (!done) {
      g.fillStyle(0xbfe9ff, 0.35).fillRoundedRect(x - 16, y - 24, 32, 44, 6);
      g.lineStyle(2, 0xe6f7ff, 0.8).strokeRoundedRect(x - 16, y - 24, 32, 44, 6);
    }
  } else if (id === 'salvage') {
    // A scrap pile: a few plates.
    g.fillStyle(done ? 0x3a3a44 : 0x8a8f9e, 1).fillTriangle(x - 18, y + 8, x - 4, y - 10, x + 8, y + 8);
    g.fillStyle(done ? 0x2e2e38 : 0xb8bcc8, 1).fillTriangle(x - 4, y + 8, x + 8, y - 6, x + 18, y + 8);
    g.fillStyle(done ? 0x2e2e38 : 0xffb347, 1).fillRect(x - 6, y - 2, 6, 4);
  } else if (id === 'recon') {
    // A marker: a beacon diamond.
    const c = done ? 0x4a5a6a : OBJ_COLOR;
    g.fillStyle(c, done ? 0.5 : 0.85).fillTriangle(x, y - 22, x - 9, y - 8, x + 9, y - 8);
    g.fillTriangle(x, y + 6, x - 9, y - 8, x + 9, y - 8);
  }
  if (done) return;
  g.lineStyle(2, OBJ_COLOR, 0.45 + 0.3 * pulse).strokeCircle(x, y, r);
  if (k > 0) g.lineStyle(4, OBJ_COLOR, 0.95).beginPath().arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
}

/** The pilgrim: a hooded figure in pale robes with a lantern. */
function drawPilgrim(g: G, x: number, y: number, time: number, still: boolean) {
  const sway = still ? 0 : Math.sin(time / 400) * 2;
  const k = 1.5;
  g.lineStyle(2, OBJ_COLOR, 0.45).strokeCircle(x, y, 30);
  g.fillStyle(0x000000, 0.3).fillRect(x - 11 * k, y + 13 * k, 22 * k, 5);
  g.fillStyle(0xd9cfb8, 1).fillTriangle(x - 12 * k, y + 14 * k, x + 12 * k, y + 14 * k, x, y - 10 * k);
  g.fillStyle(0xb8ac92, 1).fillCircle(x, y - 12 * k, 7 * k);
  g.fillStyle(0x2a2418, 1).fillCircle(x + 1, y - 11 * k, 4 * k);
  g.lineStyle(2, 0x8a7f68, 1).lineBetween(x + 12 * k, y - 14 * k, x + 12 * k, y + 14 * k);
  g.fillStyle(0xffd36b, 0.9).fillCircle(x + 12 * k + sway, y - 4 * k, 4);
  g.fillStyle(0xffd36b, 0.2).fillCircle(x + 12 * k + sway, y - 4 * k, 12);
}

/** A small health bar. */
function bar(g: G, x: number, y: number, k: number, w: number) {
  g.fillStyle(0x0d1426, 0.85).fillRect(x - w / 2, y, w, 4);
  g.fillStyle(OBJ_COLOR, 1).fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), 4);
}

/** A structure the objective put up: a relay beacon, a spore nest, the crawler's cache or a monolith. */
export function drawStructure(g: G, e: Enemy, time: number, still: boolean) {
  const { x, y, r } = e;
  const blink = still ? 1 : 0.5 + 0.5 * Math.sin(time / 180 + e.id);
  const hit = e.flashMs > 0 ? 0.35 : 0;
  if (e.kind === 'beacon') {
    g.fillStyle(0x000000, 0.3).fillRect(x - 12, y + r - 2, 24, 5);
    g.fillStyle(0x3a4256, 1).fillRect(x - 5, y - r - 8, 10, r * 2 + 6);
    g.fillStyle(0x5a6680, 1).fillTriangle(x - 13, y + r, x + 13, y + r, x, y + 2);
    g.fillStyle(0xffb347, 0.6 + 0.4 * blink).fillCircle(x, y - r - 10, 5);
    g.fillStyle(0xffb347, 0.18 * blink).fillCircle(x, y - r - 10, 14);
    g.lineStyle(1.5, 0xffb347, 0.5 * blink).beginPath().arc(x, y - r - 10, 20, -2.4, -0.7).strokePath();
  } else if (e.kind === 'nest') {
    g.fillStyle(0x2f5a12, 1).fillCircle(x, y, r);
    g.fillStyle(hex(C.beast), 0.9).fillCircle(x - 6, y - 4, r * 0.45);
    g.fillStyle(hex(C.beast), 0.7).fillCircle(x + 7, y + 3, r * 0.38);
    g.fillStyle(0xe4ff8a, 0.5 + 0.4 * blink).fillCircle(x - 6, y - 5, 3);
    g.fillStyle(0xe4ff8a, 0.5 + 0.4 * blink).fillCircle(x + 7, y + 2, 2.5);
  } else if (e.kind === 'cache') {
    g.fillStyle(0x000000, 0.3).fillRect(x - r, y + r * 0.55, r * 2, 8);
    g.fillStyle(0x6a4a2a, 1).fillRoundedRect(x - r, y - r * 0.6, r * 2, r * 1.2, 6);
    g.fillStyle(0x8a8f9e, 1).fillRect(x - r, y - r * 0.15, r * 2, 6).fillRect(x - 6, y - r * 0.6, 12, r * 1.2);
    g.fillStyle(0xffd36b, 0.7 + 0.3 * blink).fillRect(x - 4, y - 5, 8, 8);
  } else if (e.kind === 'monolith') {
    g.fillStyle(0x000000, 0.3).fillRect(x - r * 0.7, y + r + 2, r * 1.4, 6);
    g.fillStyle(0x1c1830, 1).fillTriangle(x - r * 0.6, y + r + 4, x + r * 0.6, y + r + 4, x, y - r * 1.5);
    g.fillStyle(0x2c2648, 1).fillTriangle(x, y + r + 4, x + r * 0.6, y + r + 4, x, y - r * 1.5);
    g.lineStyle(2, 0xb48cff, 0.5 + 0.4 * blink).lineBetween(x - 4, y - 10, x + 3, y + 2).lineBetween(x + 3, y + 2, x - 2, y + 14);
  }
  if (hit) g.fillStyle(0xffffff, hit).fillCircle(x, y, r);
  bar(g, x, y - r - (e.kind === 'beacon' || e.kind === 'monolith' ? 30 : 12), e.hp / e.maxHp, Math.max(30, r * 2));
}


/** A power-up on the ground: a glowing token with its own sign; it blinks in its last seconds. */
export function drawPowerUp(g: G, k: Pickup, time: number, still: boolean) {
  const kind = k.kind as PowerUp;
  const fading = (k.ms ?? POWER.lifeMs) < 5000;
  if (fading && !still && Math.floor(time / 150) % 2 === 0) return;
  const { x, y } = k;
  const bob = still ? 0 : Math.sin(time / 300 + k.id) * 2;
  const cy = y + bob;
  const color = POWER_COLORS[kind];
  g.fillStyle(color, 0.16).fillCircle(x, cy, 20);
  g.fillStyle(0x0d1426, 0.9).fillCircle(x, cy, 13);
  g.lineStyle(2, color, 1).strokeCircle(x, cy, 13);
  g.fillStyle(color, 1);
  g.lineStyle(2.5, color, 1);
  if (kind === 'bomb') {
    g.fillCircle(x - 1, cy + 2, 6);
    g.lineBetween(x + 3, cy - 3, x + 6, cy - 7);
    g.fillStyle(0xffe066, 1).fillCircle(x + 7, cy - 8, 2);
  } else if (kind === 'magnet') {
    g.beginPath().arc(x, cy, 6, 0, Math.PI, false).strokePath();
    g.lineBetween(x - 6, cy, x - 6, cy - 6).lineBetween(x + 6, cy, x + 6, cy - 6);
    g.fillStyle(0xffffff, 1).fillRect(x - 8, cy - 8, 4, 3).fillRect(x + 4, cy - 8, 4, 3);
  } else if (kind === 'lure') {
    g.lineStyle(1.5, color, 1).strokeCircle(x, cy, 7.5).strokeCircle(x, cy, 4);
    g.fillCircle(x, cy, 1.8);
  } else if (kind === 'overdrive') {
    for (const dx of [-4, 2]) g.lineBetween(x + dx - 2, cy - 6, x + dx + 3, cy).lineBetween(x + dx + 3, cy, x + dx - 2, cy + 6);
  } else if (kind === 'shield') {
    g.fillTriangle(x - 7, cy - 6, x + 7, cy - 6, x, cy + 8);
    g.fillStyle(0x0d1426, 1).fillTriangle(x - 3.5, cy - 3.5, x + 3.5, cy - 3.5, x, cy + 3);
  } else if (kind === 'freeze') {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      g.lineStyle(2, color, 1).lineBetween(x - Math.cos(a) * 7, cy - Math.sin(a) * 7, x + Math.cos(a) * 7, cy + Math.sin(a) * 7);
    }
  } else {
    g.fillRect(x - 6, cy + 1, 12, 4).fillRect(x - 5, cy - 4, 10, 4);
    g.fillStyle(0xffffff, 0.8).fillRect(x - 4, cy - 3, 3, 1.5);
  }
}

/** Each power-up's colour (no red: the bomb is amber). */
export const POWER_COLORS: Record<PowerUp, number> = {
  bomb: 0xffa040, magnet: 0x9fd8ff, lure: 0x7dffa0, overdrive: 0xffe066, shield: 0x8fb8ff, freeze: 0xbfefff, cache: 0xffd36b,
};

/** Where to point the HUD arrow: the objective's marker, or null when there is none. */
export function objectiveTarget(s: GameState) {
  const o = s.objective;
  if (!o) return null;
  if (o.id === 'escort' && o.ward && Math.hypot(s.player.x - o.ward.x, s.player.y - o.ward.y) <= OBJ_MISC.escortNear) return { x: o.toX, y: o.toY };
  if (['quickdraw', 'storm', 'bloodtrail', 'unbroken', 'zone'].includes(o.id)) return null;
  if (o.ids.length && !s.enemies.some((e) => o.ids.includes(e.id) && e.hp > 0)) return null;
  return { x: o.x, y: o.y };
}

/** Whether a foe is drawn by `drawStructure` rather than as a sprite. */
export const drawnAsStructure = (e: Enemy) => isStructure(e.kind);
