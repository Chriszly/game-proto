import type { TextKey } from '../i18n';
import type { Boss, BossKind, GameState, TrapKind } from './state';

// The bosses: the Gatekeeper, on every fifth stage, and the dragon of the Dragon's Keep, on the
// first stage past 1500 m. A boss waits on the open road until the knight comes near, then keeps
// a fixed way ahead of them throwing things back down the road: the Gatekeeper rolls barrels (jump
// them) and flings axes at head height (slide under them); the dragon breathes gouts of fire that
// roll along the road (jump them) and lashes its tail at head height (slide under it). After a
// volley it tires and stands still, panting, and the knight runs up to it: land on its head to
// stomp it, run into it to be hurt. Either way it flees ahead and throws again, faster each time it
// is stomped (and if the knight leaps clean over it, it runs on past them and starts again). Three
// stomps beat it; the run goes on to a checkpoint a little way past. Contact (stomps and bumps) is
// in sim.ts.

/** Something a boss throws: its trap kind, width, height over the road, and speed towards the knight. */
export interface Missile {
  kind: TrapKind;
  w: number;
  h: number;
  vx: number;
}

export interface BossNumbers {
  /** Its name, a key of `i18n/en.ts`. */
  name: TextKey;
  /** Its box: width, and height up from the road (its head, where a stomp lands). */
  w: number;
  h: number;
  hp: number;
  /** How far ahead of the knight it keeps while throwing. */
  station: number;
  /** How much faster than the knight it runs when it flees ahead. */
  flee: number;
  /** Throws in a volley, and the time between them, by stomps left (3, 2, 1). */
  throws: (hp: number) => number;
  throwEvery: (hp: number) => number;
  /** The first throw comes this long after it starts a volley. */
  windUp: number;
  /** What it throws, by turns, starting with the first. */
  missiles: [Missile, Missile];
  /** How long it flashes after a stomp, the coins it pays when beaten, and how far on the checkpoint then stands. */
  hurtMs: number;
  reward: number;
  after: number;
  /** While it stands, the checkpoint is kept at least this far ahead of the knight. */
  holdBack: number;
}

export const BOSS: Record<BossKind, BossNumbers> = {
  gate: {
    name: 'gateName',
    w: 60,
    h: 86,
    hp: 3,
    station: 400,
    flee: 520,
    throws: (hp) => 6 - hp,
    throwEvery: (hp) => 800 + 150 * hp,
    windUp: 600,
    missiles: [
      { kind: 'barrel', w: 26, h: 0, vx: -140 },
      { kind: 'axe', w: 28, h: 34, vx: -200 },
    ],
    hurtMs: 600,
    reward: 25,
    after: 1400,
    holdBack: 2000,
  },
  dragon: {
    name: 'dragonName',
    w: 80,
    h: 96,
    hp: 3,
    station: 420,
    flee: 560,
    throws: (hp) => 7 - hp,
    throwEvery: (hp) => 700 + 150 * hp,
    windUp: 700,
    missiles: [
      { kind: 'fire', w: 40, h: 0, vx: -190 },
      { kind: 'tail', w: 60, h: 34, vx: -260 },
    ],
    hurtMs: 600,
    reward: 60,
    after: 1400,
    holdBack: 2000,
  },
};

/** The numbers of this boss. */
export const bossOf = (b: Boss) => BOSS[b.kind];

/** A boss's thrown things. */
export const MISSILES: readonly TrapKind[] = ['barrel', 'axe', 'fire', 'tail'];

/** Moves the boss on by `dt` ms, once the knight has moved, and throws its volleys. */
export function moveBoss(s: GameState, dt: number) {
  const b = s.boss;
  if (!b) return;
  const n = bossOf(b);
  const sec = dt / 1000;
  b.hurtMs = Math.max(0, b.hurtMs - dt);
  const keep = s.distance + n.station;
  switch (b.mode) {
    case 'wait':
      if (b.x <= keep) startVolley(b, n);
      break;
    case 'throw':
      b.x = keep;
      b.ms -= dt;
      if (b.ms <= 0) {
        throwOne(s, b, n);
        b.thrown += 1;
        b.ms = n.throwEvery(b.hp);
        if (b.thrown >= n.throws(b.hp)) b.mode = 'tired'; // still holding its distance (ms > 0)
      }
      break;
    case 'flee':
      b.x += (s.speed + n.flee) * sec;
      if (b.x >= keep) {
        b.x = keep;
        startVolley(b, n);
      }
      break;
    case 'tired':
      // It keeps its distance until its last throw is past the knight and they are back on the
      // road, so the stomp never comes in the middle of a dodge; then it stands, panting. If the
      // knight leaps clean over it, it gets up and runs ahead again.
      if (b.ms > 0) {
        b.x = keep;
        const busy = s.runner.h > 0 || s.traps.some((t) => MISSILES.includes(t.kind) && t.x + t.w > s.distance - t.w);
        if (!busy) b.ms = 0;
      } else if (b.x + b.w < s.distance - n.w) b.mode = 'flee';
      break;
    // Beaten, it lies where it fell.
  }
}

function startVolley(b: Boss, n: BossNumbers) {
  b.mode = 'throw';
  b.thrown = 0;
  b.ms = n.windUp;
}

/** Its two missiles by turns, starting with the first (a barrel, or a gout of fire). */
function throwOne(s: GameState, b: Boss, n: BossNumbers) {
  const m = n.missiles[b.thrown % 2];
  s.traps.push({ id: s.nextId++, kind: m.kind, x: b.x - m.w, w: m.w, h: m.h, vx: m.vx });
}

/** Whether the boss is still in the way (not yet beaten). */
export const bossStands = (s: Pick<GameState, 'boss'>) => !!s.boss && s.boss.hp > 0;
