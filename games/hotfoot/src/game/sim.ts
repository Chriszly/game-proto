import { ARMOURY_EACH, nextPrice, noArmoury, type Armoury, type ArmouryId } from './armoury';
import { BOONS, BOON_IDS, CURSE, forSale, type BoonId } from './boons';
import { BOSS, bossStands, moveBoss } from './boss';
import { buildStage, nextStage } from './course';
import {
  AWAKE,
  BOON_PRICE,
  COIN_REACH,
  DROP_V,
  FOES,
  GRAVITY,
  ICE,
  RUNNER,
  SHRINE,
  TRAP_SPAN,
  canTake,
  flameOf,
  floorAt,
  freshState,
  metres,
  rand,
  speedOf,
  stats,
  streakMult,
  type GameState,
  type Trap,
  type TrapKind,
  WIND,
} from './state';

// Moves the run on: the knight runs, jumps, slides and lands, climbs onto ledges and drops off
// them, goblins and bats move and can be stomped on, traps hurt, coins are picked up (worth more
// on a streak), wayside shrines trade coins for a heart, the stage's ground bends the rules (ice,
// fen, wind), a Gatekeeper is fought on every fifth stage, and each checkpoint stops the run on a
// choice of two boons, sometimes a cursed one. Between runs the bank buys the missed boon or the
// armoury's lasting upgrades.

/** A pulled coin's speed towards the knight. */
const PULL_SPEED = 700;
/** How far behind the knight traps, ledges and coins are dropped. */
const BEHIND = 600;
/** A stomp: how far below a foe's top the feet may have been last frame, and the bounce off it. */
const STOMP_REACH = 8;
const STOMP_BOUNCE = 0.65;
/** Feet this little below a ledge's top as the knight reaches it still climb up it unhurt. */
const STEP_UP = 16;

/** What a new run carries over from the runs before it. */
export interface Carry {
  /** The best distance this run chases: the overall best, or the daily course's. */
  best: number;
  bank: number;
  pending: BoonId | null;
  armoury: Armoury;
}

/**
 * A new run: an ordinary one, or the daily course of the date given. A boon bought at the last
 * game over starts it with one rank of that boon, and the armoury's levels apply.
 */
export function newRun({ best, bank, pending, armoury }: Carry = { best: 0, bank: 0, pending: null, armoury: noArmoury() }, daily: string | null = null): GameState {
  const s = freshState(best, bank, armoury, daily);
  if (pending) s.ranks[pending] = 1;
  const st = stats(s);
  s.hearts = st.maxHearts;
  s.shields = st.shields;
  s.coins = armoury.purse * ARMOURY_EACH.purse;
  buildStage(s);
  return s;
}

/** Height of the ground under the knight's feet. */
const floorOf = (s: GameState) => floorAt(s, s.distance - RUNNER.w / 2, s.distance + RUNNER.w / 2);
const grounded = (s: GameState) => s.runner.h <= floorOf(s) && s.runner.vh <= 0;

/** Jump: off the ground, or again in the air with Second Leap. A jump ends a slide. On ice, a jump during a landing's skid waits for it to end. */
export function jump(s: GameState) {
  if (s.phase !== 'running') return false;
  const r = s.runner;
  if (r.skidMs > 0 && grounded(s)) {
    r.jumpQueued = true;
    return true;
  }
  if (r.jumps <= 0) return false;
  r.jumps -= 1;
  r.vh = stats(s).jumpV;
  r.h = Math.max(r.h, floorOf(s) + 0.01);
  r.slideMs = 0;
  r.slideQueued = false;
  return true;
}

/** Slide under a blade; in the air, drop fast and slide on landing. */
export function slide(s: GameState) {
  if (s.phase !== 'running') return false;
  const r = s.runner;
  if (grounded(s)) {
    r.slideMs = stats(s).slideMs;
  } else {
    r.vh = Math.min(r.vh, -DROP_V);
    r.slideQueued = true;
  }
  return true;
}

/** The knight's box this moment: x along the course, and heights from feet to head. */
export function runnerBox(s: GameState) {
  const tall = s.runner.slideMs > 0 ? RUNNER.slideH : RUNNER.h;
  return { x0: s.distance - RUNNER.w / 2, x1: s.distance + RUNNER.w / 2, lo: s.runner.h, hi: s.runner.h + tall };
}

function touches(s: GameState, t: Trap) {
  const box = runnerBox(s);
  if (t.kind === 'pit') {
    // The knight falls in when standing over the middle of the pit.
    return grounded(s) && s.distance > t.x + 8 && s.distance < t.x + t.w - 8;
  }
  if (t.kind === 'flames' && flameOf(s, t) !== 'lit') return false;
  const span = TRAP_SPAN[t.kind];
  return box.x1 > t.x && box.x0 < t.x + t.w && box.hi > t.h + span.lo && box.lo < t.h + span.hi;
}

/** Walks goblins back and forth and flies bats on, once they are close enough to wake. */
function moveFoes(s: GameState, sec: number) {
  for (const t of s.traps) {
    if (t.vx === 0 || t.x - s.distance > AWAKE) continue;
    t.x += t.vx * sec;
    if (t.kind !== 'goblin') continue;
    if (t.from !== undefined && t.x <= t.from) {
      t.x = t.from;
      t.vx = Math.abs(t.vx);
    }
    if (t.to !== undefined && t.x + t.w >= t.to) {
      t.x = t.to - t.w;
      t.vx = -Math.abs(t.vx);
    }
  }
}

/** Landing on a goblin or bat from above knocks it out and bounces the knight back up. */
function stomp(s: GameState, prevH: number) {
  const r = s.runner;
  if (r.h >= prevH) return;
  const box = runnerBox(s);
  const foe = s.traps.find((t) => {
    if (!FOES.includes(t.kind) || box.x1 <= t.x || box.x0 >= t.x + t.w) return false;
    const top = t.h + TRAP_SPAN[t.kind as Exclude<TrapKind, 'pit'>].hi;
    return prevH >= top - STOMP_REACH && r.h <= top;
  });
  if (!foe) return;
  const st = stats(s);
  const top = foe.h + TRAP_SPAN[foe.kind as Exclude<TrapKind, 'pit'>].hi;
  s.traps = s.traps.filter((t) => t !== foe);
  s.stomps += 1;
  gainCoin(s, foe.x + foe.w / 2, top);
  effect(s, 'stomp', foe.x + foe.w / 2, top, 450);
  r.h = Math.max(r.h, top);
  r.vh = st.jumpV * STOMP_BOUNCE;
  r.jumps = st.jumps;
  r.slideMs = 0;
  r.slideQueued = false;
}

function effect(s: GameState, kind: GameState['effects'][number]['kind'], x: number, h: number, total: number, text?: string) {
  s.effects.push({ id: s.nextId++, kind, x, h, ms: total, total, ...(text ? { text } : {}) });
}

/**
 * One coin taken (picked up, or knocked out of a stomped foe): worth its value times the streak's
 * multiplier, and one more on the streak. A coin worth more than one pops its value over the knight.
 */
function gainCoin(s: GameState, x: number, h: number) {
  const value = stats(s).coinValue * streakMult(s.streak);
  s.streak += 1;
  s.coins += value;
  if (value > 1) effect(s, 'pop', x, h + 40, 700, `+${value}`);
}

/**
 * Sliding into a wayside shrine trades `SHRINE.price` coins for a heart, if the knight has the
 * coins and is hurt; otherwise it says why not, once.
 */
function visitShrines(s: GameState) {
  const r = s.runner;
  if (r.slideMs <= 0 || !grounded(s) || r.h > 0) return;
  const box = runnerBox(s);
  for (const sh of s.shrines) {
    if (sh.used || sh.tried || box.x1 <= sh.x || box.x0 >= sh.x + sh.w) continue;
    const max = stats(s).maxHearts;
    if (s.hearts < max && s.coins >= SHRINE.price) {
      s.coins -= SHRINE.price;
      s.hearts += 1;
      sh.used = true;
      effect(s, 'heal', sh.x + sh.w / 2, 60, 900);
    } else {
      sh.tried = true;
      effect(s, 'refuse', sh.x + sh.w / 2, 90, 1100, s.hearts >= max ? 'Hearts full' : `Needs ${SHRINE.price} coins`);
    }
  }
}

/** A hit from a trap, from running into the side of a ledge (`'wall'`), or from running into the Gatekeeper. */
function hurt(s: GameState, kind: TrapKind | 'wall' | 'boss') {
  const st = stats(s);
  const r = s.runner;
  s.hits += 1;
  s.streak = 0;
  r.hurtMs = st.hurtMs;
  if (kind === 'pit') {
    // Thrown back up out of the pit, high enough to clear it.
    r.vh = st.jumpV;
    r.h = 0.01;
    r.slideMs = 0;
    r.jumps = st.jumps - 1;
  }
  if (s.shields > 0) {
    s.shields -= 1;
    effect(s, 'block', s.distance, r.h + RUNNER.h / 2, 500);
    return;
  }
  s.hearts -= 1;
  effect(s, 'hit', s.distance, r.h + RUNNER.h / 2, 500);
  if (s.hearts <= 0) {
    s.hearts = 0;
    s.phase = 'over';
    s.best = Math.max(s.best, metres(s.distance));
    s.bank += s.coins;
  }
}

/** Moves the run on by `dt` milliseconds. Nothing moves at a checkpoint or after a fall. */
export function tick(s: GameState, dt: number) {
  for (const e of s.effects) e.ms -= dt;
  s.effects = s.effects.filter((e) => e.ms > 0);
  if (s.phase !== 'running') return;
  const sec = dt / 1000;
  const st = stats(s);
  const r = s.runner;
  s.time += dt;
  moveFoes(s, sec);
  // The checkpoint stays out of reach while the Gatekeeper stands.
  if (bossStands(s)) s.checkpointX = Math.max(s.checkpointX, Math.round(s.distance + BOSS.holdBack));

  // In the windy pass a headwind slows the knight while they are off the ground.
  const pace = s.terrain === 'wind' && !grounded(s) ? WIND.air : 1;
  s.distance = Math.min(s.checkpointX, s.distance + s.speed * pace * sec);
  moveBoss(s, dt);
  // Running into the side of a ledge hurts, and the knight scrambles up onto it. A jump that only
  // just falls short climbs up unhurt.
  const floor = floorOf(s);
  if (r.h < floor) {
    if (r.hurtMs <= 0 && floor - r.h > STEP_UP) hurt(s, 'wall');
    r.h = floor;
    r.vh = Math.max(0, r.vh);
  }
  const prevH = r.h;
  if (r.h > floor || r.vh > 0) {
    r.vh -= GRAVITY * sec;
    r.h += r.vh * sec;
    if (r.h <= floor) {
      r.h = floor;
      r.vh = 0;
      effect(s, 'dust', s.distance, floor, 300);
      if (r.slideQueued) r.slideMs = st.slideMs;
      r.slideQueued = false;
      // On ice a landing skids: a jump has to wait it out.
      if (s.terrain === 'ice') {
        r.skidMs = ICE.skidMs;
        effect(s, 'skid', s.distance, floor, ICE.skidMs + 120);
      }
    }
  }
  stomp(s, prevH);
  bossContact(s, prevH);
  if (grounded(s)) r.jumps = st.jumps;
  r.slideMs = Math.max(0, r.slideMs - dt);
  r.hurtMs = Math.max(0, r.hurtMs - dt);
  if (r.skidMs > 0) {
    r.skidMs = Math.max(0, r.skidMs - dt);
    if (r.skidMs === 0 && r.jumpQueued) {
      r.jumpQueued = false;
      if (grounded(s)) jump(s);
    }
  }

  if (r.hurtMs <= 0 && s.phase === 'running') {
    const hit = s.traps.find((t) => touches(s, t));
    if (hit) hurt(s, hit.kind);
  }
  if (s.phase === 'running') visitShrines(s);

  // Coins: picked up on touch, and drawn in from further off with a lodestone.
  const box = runnerBox(s);
  const midH = (box.lo + box.hi) / 2;
  for (const c of s.course) {
    const dx = Math.max(box.x0 - c.x, 0, c.x - box.x1);
    const dh = Math.max(box.lo - c.h, 0, c.h - box.hi);
    const near = Math.hypot(dx, dh);
    if (near < COIN_REACH) {
      c.x = Number.NaN;
      gainCoin(s, s.distance, midH);
      effect(s, 'coin', s.distance, midH, 400);
      continue;
    }
    if (near < st.reach) c.pulled = true;
    if (c.pulled) {
      const tx = s.distance - c.x;
      const th = midH - c.h;
      const len = Math.hypot(tx, th) || 1;
      const step = Math.min(len, PULL_SPEED * sec);
      c.x += (tx / len) * step;
      c.h += (th / len) * step;
    }
  }
  s.course = s.course.filter((c) => !Number.isNaN(c.x) && c.x > s.distance - BEHIND);
  s.traps = s.traps.filter((t) => t.x + t.w > s.distance - BEHIND);
  s.ledges = s.ledges.filter((l) => l.x + l.w > s.distance - BEHIND);
  s.shrines = s.shrines.filter((sh) => sh.x + sh.w > s.distance - BEHIND);
  if (s.boss && !bossStands(s) && s.boss.x + s.boss.w < s.distance - BEHIND) s.boss = null;

  if (s.phase === 'running' && s.distance >= s.checkpointX) {
    s.phase = 'checkpoint';
    s.banners.push(metres(s.checkpointX));
    s.best = Math.max(s.best, metres(s.distance));
    s.choices = rollChoices(s);
    r.slideMs = 0;
  }
}

/**
 * Two different boons the knight can still take; Field Dressing fills in when few are left. From
 * the second checkpoint, a cursed boon may take the second card. (The first checkpoint draws no
 * curse, so its draws are the same as before curses were added.)
 */
export function rollChoices(s: GameState): BoonId[] {
  const pool = BOON_IDS.filter((id) => !BOONS[id].filler && !BOONS[id].cursed && canTake(s, id));
  const picks: BoonId[] = [];
  while (picks.length < 2 && pool.length > 0) picks.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
  while (picks.length < 2) picks.push('mend');
  const curses = BOON_IDS.filter((id) => BOONS[id].cursed && canTake(s, id));
  if (s.stage >= CURSE.from && curses.length > 0 && rand(s) < CURSE.chance) picks[1] = curses[Math.floor(rand(s) * curses.length)];
  return picks;
}

/** Takes a boon at a checkpoint and starts the next stage. */
export function pick(s: GameState, id: BoonId) {
  if (s.phase !== 'checkpoint' || !s.choices?.includes(id)) return false;
  s.missed = s.choices.find((c) => c !== id) ?? null;
  s.ranks[id] = (s.ranks[id] ?? 0) + 1;
  const st = stats(s);
  if (id === 'heart') s.hearts = Math.min(st.maxHearts, s.hearts + 1);
  if (id === 'mend') s.hearts = Math.min(st.maxHearts, s.hearts + 2);
  // Cursed Gold takes a heart away.
  s.hearts = Math.max(1, Math.min(st.maxHearts, s.hearts));
  s.choices = null;
  s.phase = 'running';
  s.shields = st.shields;
  nextStage(s);
  s.speed = speedOf(s.stage);
  return true;
}

/** Landing on the Gatekeeper's head stomps it; running into it hurts. Either way it flees ahead. */
function bossContact(s: GameState, prevH: number) {
  const b = s.boss;
  const r = s.runner;
  if (!b || !bossStands(s) || b.mode === 'wait') return;
  const box = runnerBox(s);
  if (box.x1 <= b.x || box.x0 >= b.x + b.w || box.lo >= BOSS.h) return;
  const st = stats(s);
  if (r.h < prevH && prevH >= BOSS.h - STOMP_REACH && b.hurtMs <= 0) {
    b.hp -= 1;
    b.hurtMs = BOSS.hurtMs;
    s.stomps += 1;
    effect(s, 'stomp', b.x + b.w / 2, BOSS.h, 450);
    r.h = BOSS.h;
    r.vh = st.jumpV * STOMP_BOUNCE;
    r.jumps = st.jumps;
    r.slideMs = 0;
    r.slideQueued = false;
    if (b.hp > 0) {
      b.mode = 'flee';
      return;
    }
    // Beaten: it falls where it stands, pays out, and the checkpoint comes up a little way on.
    b.mode = 'down';
    s.bosses += 1;
    s.coins += BOSS.reward;
    effect(s, 'pop', b.x + b.w / 2, BOSS.h + 30, 1400, `Gatekeeper beaten! +${BOSS.reward}`);
    s.checkpointX = Math.round(s.distance + BOSS.after);
    for (let i = 0; i < 6; i++) s.course.push({ id: s.nextId++, x: s.distance + 500 + i * 40, h: 12, pulled: false });
    return;
  }
  if (r.hurtMs <= 0) hurt(s, 'boss');
  if (s.phase === 'running') b.mode = 'flee';
}

/**
 * At the game-over screen, buys the boon missed at the last checkpoint for `BOON_PRICE` coins, so
 * the next run starts with it. One purchase at a time; Field Dressing is never for sale.
 */
export function buyMissed(s: GameState) {
  const id = s.missed;
  if (s.phase !== 'over' || !id || !forSale(id) || s.pending || s.bank < BOON_PRICE) return false;
  s.bank -= BOON_PRICE;
  s.pending = id;
  return true;
}

/** At the game-over screen, buys the next level of an armoury item with banked coins, for every run after. */
export function buyArmoury(s: GameState, id: ArmouryId) {
  const price = nextPrice(s.armoury, id);
  if (s.phase !== 'over' || price === null || s.bank < price) return false;
  s.bank -= price;
  s.armoury[id] += 1;
  return true;
}
