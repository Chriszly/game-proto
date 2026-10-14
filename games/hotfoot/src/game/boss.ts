import type { Boss, GameState } from './state';

// The Gatekeeper, on every fifth stage. It waits on the open road until the knight comes near,
// then keeps a fixed way ahead of them throwing things back down the road: barrels that roll along
// it (jump them) and axes that fly at head height (slide under them). After a volley it tires and
// stands still, panting, and the knight runs up to it: land on its head to stomp it, run into it to
// be hurt. Either way it flees ahead and throws again, faster each time it is stomped. Three stomps
// beat it; the run goes on to a checkpoint a little way past. Contact (stomps and bumps) is in sim.ts.

export const BOSS = {
  /** Its box: width, and height up from the road (its head, where a stomp lands). */
  w: 60,
  h: 70,
  hp: 3,
  /** How far ahead of the knight it keeps while throwing. */
  station: 400,
  /** How much faster than the knight it runs when it flees ahead. */
  flee: 520,
  /** Throws in a volley, and the time between them, by stomps left (3, 2, 1). */
  throws: (hp: number) => 6 - hp,
  throwEvery: (hp: number) => 800 + 150 * hp,
  /** The first throw comes this long after it starts a volley. */
  windUp: 600,
  /** A thrown barrel and axe: width, height over the road, and speed towards the knight. */
  barrel: { w: 26, h: 0, vx: -140 },
  axe: { w: 28, h: 34, vx: -200 },
  /** How long it flashes after a stomp, the coins it pays when beaten, and how far on the checkpoint then stands. */
  hurtMs: 600,
  reward: 25,
  after: 1400,
  /** While it stands, the checkpoint is kept at least this far ahead of the knight. */
  holdBack: 2000,
};

/** Moves the Gatekeeper on by `dt` ms, once the knight has moved, and throws its volleys. */
export function moveBoss(s: GameState, dt: number) {
  const b = s.boss;
  if (!b) return;
  const sec = dt / 1000;
  b.hurtMs = Math.max(0, b.hurtMs - dt);
  const keep = s.distance + BOSS.station;
  switch (b.mode) {
    case 'wait':
      if (b.x <= keep) startVolley(b);
      break;
    case 'throw':
      b.x = keep;
      b.ms -= dt;
      if (b.ms <= 0) {
        throwOne(s, b);
        b.thrown += 1;
        b.ms = BOSS.throwEvery(b.hp);
        if (b.thrown >= BOSS.throws(b.hp)) b.mode = 'tired';
      }
      break;
    case 'flee':
      b.x += (s.speed + BOSS.flee) * sec;
      if (b.x >= keep) {
        b.x = keep;
        startVolley(b);
      }
      break;
    // Tired and down, it stands where it is.
  }
}

function startVolley(b: Boss) {
  b.mode = 'throw';
  b.thrown = 0;
  b.ms = BOSS.windUp;
}

/** Barrels and axes by turns, starting with a barrel. */
function throwOne(s: GameState, b: Boss) {
  const axe = b.thrown % 2 === 1;
  const t = axe ? BOSS.axe : BOSS.barrel;
  s.traps.push({ id: s.nextId++, kind: axe ? 'axe' : 'barrel', x: b.x - t.w, w: t.w, h: t.h, vx: t.vx });
}

/** Whether the Gatekeeper is still in the way (not yet beaten). */
export const bossStands = (s: Pick<GameState, 'boss'>) => !!s.boss && s.boss.hp > 0;
