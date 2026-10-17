/**
 * The rules of a run: moving, the heroes' weapons and signatures, every upgrade's effect, the
 * droids, pickups and level-ups. Pure state changes, no drawing; randomness comes from Math.random
 * and time from the `dt` the scene hands over, so a run replays exactly from the same inputs.
 */
import { HEROES, type HeroId } from './heroes';
import {
  BOSS, DIFF, ELITE, ENEMY, HERO_R, LEASH, MAX_ENEMIES, MAX_SHARDS, ROLLER, RUN_MS, SPAWN_RING,
  freshHero, freshState, refreshUnlocks, statsOf, xpFor,
  type BoltColor, type Bomb, type Bullet, type Enemy, type EnemyKind, type GameState, type Stats,
} from './state';
import { CAPSTONES, CROSSOVERS, FILLER, MAX_TIER, UPGRADES, at, rollChoices } from './upgrades';

/** What the player is doing this frame: a move direction (length up to 1) and the signature key. */
export interface Input {
  mx: number;
  my: number;
  signature: boolean;
}

/** The longest sim step, ms: a longer frame is split so fast bolts don't skip over droids. */
const STEP_MS = 16;
/** The longest frame the sim takes at once (a hidden tab or a hitch is cut to this). */
const MAX_FRAME_MS = 100;
/** After a hit the hero takes no damage for this long, ms. */
export const HURT_GRACE_MS = 450;
/** Colours of the blast rings. */
const BLAST = { hero: '#ffb347', droid: '#ff6a4d', frag: '#ffd36b', shield: '#ff9a5a' };

/** The stats for this frame, computed once per tick. */
let st: Stats = statsOf(freshState());

// ---------------------------------------------------------------------------------------------
// Starting and choosing

/** Starts a run with the chosen hero, from a fresh state. */
export function startRun(s: GameState, id: HeroId) {
  Object.assign(s, freshState());
  const hero = HEROES[id];
  s.hero = id;
  s.phase = 'run';
  s.player = freshHero();
  s.player.hp = s.player.maxHp = hero.maxHp;
  s.player.fireMs = 300;
  st = statsOf(s);
}

/** Takes the card at `index` during a level-up. */
export function choose(s: GameState, index: number) {
  if (s.phase !== 'levelup' || !s.choices) return;
  const id = s.choices[index];
  if (!id) return;
  if (id === FILLER.id) heal(s, 0.3 * s.player.maxHp);
  else raise(s, id);
  s.pendingLevels -= 1;
  if (s.pendingLevels > 0) s.choices = rollChoices(s.hero!, s.ranks);
  else {
    s.choices = null;
    s.phase = 'run';
  }
}

/** One more tier of an upgrade, with what follows from it: health, allies, unlocks. */
function raise(s: GameState, id: string) {
  const before = statsOf(s).maxHp;
  s.ranks[id] = Math.min(MAX_TIER, (s.ranks[id] ?? 0) + 1);
  for (const fresh of refreshUnlocks(s)) {
    const cap = CAPSTONES.find((c) => c.id === fresh);
    const cross = CROSSOVERS.find((c) => c.id === fresh);
    pop(s, cap ? `Capstone: ${cap.name}` : `Crossover: ${cross!.name}`, cap ? '#ffe066' : '#b48cff');
  }
  st = statsOf(s);
  const p = s.player;
  p.maxHp = st.maxHp;
  if (st.maxHp > before) p.hp += st.maxHp - before;
  syncAllies(s);
}

// ---------------------------------------------------------------------------------------------
// The frame

export function tick(s: GameState, dtMs: number, input: Input) {
  if (s.phase !== 'run') return;
  st = statsOf(s);
  const dt = Math.min(dtMs, MAX_FRAME_MS);
  if (input.signature) signature(s);
  const steps = Math.max(1, Math.ceil(dt / STEP_MS));
  for (let i = 0; i < steps && s.phase === 'run'; i++) step(s, dt / steps, input);
  // Visual leftovers age once per frame.
  for (const b of s.blasts) b.ms -= dt;
  s.blasts = s.blasts.filter((b) => b.ms > 0);
  for (const p of s.pops) p.ms -= dt;
  s.pops = s.pops.filter((p) => p.ms > 0);
  if (s.phase === 'run' && s.pendingLevels > 0) {
    s.phase = 'levelup';
    s.choices = rollChoices(s.hero!, s.ranks);
  }
}

function step(s: GameState, ms: number, input: Input) {
  const dt = ms / 1000;
  s.time += ms;
  buildGrid(s);
  moveHero(s, ms, input);
  director(s, ms);
  primary(s, ms);
  abilities(s, ms);
  moveAllies(s, ms);
  moveEnemies(s, ms);
  moveBullets(s, ms);
  bombs(s, ms);
  fires(s, dt);
  pickups(s, ms);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
}

// ---------------------------------------------------------------------------------------------
// A grid of the droids, so bolts and blasts only look at the ones nearby.

const CELL = 64;
let grid = new Map<number, Enemy[]>();
const keyOf = (cx: number, cy: number) => cx * 100_003 + cy;

function buildGrid(s: GameState) {
  grid = new Map();
  for (const e of s.enemies) {
    if (e.kind === 'boss' || e.hp <= 0) continue;
    const k = keyOf(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    const list = grid.get(k);
    if (list) list.push(e);
    else grid.set(k, [e]);
  }
}

/** Calls `fn` for each living droid whose body reaches within `r` of a point, the boss included. */
function near(s: GameState, x: number, y: number, r: number, fn: (e: Enemy, d: number) => void) {
  const reach = r + 20;
  const x0 = Math.floor((x - reach) / CELL);
  const x1 = Math.floor((x + reach) / CELL);
  const y0 = Math.floor((y - reach) / CELL);
  const y1 = Math.floor((y + reach) / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const list = grid.get(keyOf(cx, cy));
      if (!list) continue;
      for (const e of list) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d <= r + e.r) fn(e, d);
      }
    }
  }
  const boss = s.enemies.find((e) => e.kind === 'boss' && e.hp > 0);
  if (boss) {
    const d = Math.hypot(boss.x - x, boss.y - y);
    if (d <= r + boss.r) fn(boss, d);
  }
}

/** The `n` living droids nearest a point within `range`, nearest first. */
function nearest(s: GameState, x: number, y: number, n: number, range: number, skip: number[] = []): Enemy[] {
  const found: { e: Enemy; d: number }[] = [];
  for (const e of s.enemies) {
    if (e.hp <= 0 || skip.includes(e.id)) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
    if (d > range) continue;
    if (found.length < n) {
      found.push({ e, d });
      found.sort((a, b) => a.d - b.d);
    } else if (d < found[n - 1].d) {
      found[n - 1] = { e, d };
      found.sort((a, b) => a.d - b.d);
    }
  }
  return found.map((f) => f.e);
}

/** A spot in the thickest swarm near the hero: the droid with the most others around it. */
function swarmSpot(s: GameState, range: number) {
  const p = s.player;
  const pool = nearest(s, p.x, p.y, 16, range);
  if (!pool.length) {
    return { x: p.x + Math.cos(p.facing) * 140, y: p.y + Math.sin(p.facing) * 140 };
  }
  let best = pool[0];
  let most = -1;
  for (const e of pool) {
    let count = 0;
    near(s, e.x, e.y, 70, () => (count += 1));
    if (count > most) {
      most = count;
      best = e;
    }
  }
  return { x: best.x, y: best.y };
}

// ---------------------------------------------------------------------------------------------
// The hero

function moveHero(s: GameState, ms: number, input: Input) {
  const p = s.player;
  const dt = ms / 1000;
  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.05;
  if (p.moving) p.facing = Math.atan2(input.my, input.mx);
  if (p.dashMs > 0) {
    p.dashMs -= ms;
    p.x += Math.cos(p.dashAngle) * 750 * dt;
    p.y += Math.sin(p.dashAngle) * 750 * dt;
    s.fires.push({ id: s.nextId++, x: p.x, y: p.y, r: 22, ms: 2000, dps: at([12, 12, 20, 20, 26], s.ranks['jump-trooper'] ?? 0, 12) });
    if (p.dashMs <= 0 && s.capstones.includes('skyfall')) explode(s, p.x, p.y, 110, 60, BLAST.frag);
  } else if (p.moving) {
    const k = Math.min(1, len) * st.speed * dt;
    p.x += (input.mx / len) * k;
    p.y += (input.my / len) * k;
  }
  p.sigMs = Math.max(0, p.sigMs - ms);
  p.sigActiveMs = Math.max(0, p.sigActiveMs - ms);
  p.hurtMs = Math.max(0, p.hurtMs - ms);
  if (st.regen > 0 && p.hp < p.maxHp) {
    p.regen += st.regen * dt;
    if (p.regen >= 1) {
      const whole = Math.floor(p.regen);
      p.regen -= whole;
      p.hp = Math.min(p.maxHp, p.hp + whole);
    }
  }
}

function heal(s: GameState, amount: number) {
  s.player.hp = Math.min(s.player.maxHp, s.player.hp + amount);
}

/** Whether the hero takes no damage right now (Brace, mid-dash, or just hit). */
function untouchable(s: GameState) {
  return (s.hero === 'tr9' && s.player.sigActiveMs > 0) || s.player.dashMs > 0 || s.player.hurtMs > 0;
}

function hurtHero(s: GameState, dmg: number) {
  if (untouchable(s) || s.phase !== 'run') return;
  const taken = dmg * (1 - st.armour);
  s.player.hp -= taken;
  s.damageTaken += taken;
  // A moment of grace after each hit, so a crowd can't take it all at once.
  s.player.hurtMs = HURT_GRACE_MS;
  if (s.player.hp <= 0) {
    s.player.hp = 0;
    s.phase = 'lost';
  }
}

/** The signature move on Space or its button, when it is ready. */
function signature(s: GameState) {
  const p = s.player;
  if (p.sigMs > 0 || !s.hero) return;
  const hero = HEROES[s.hero];
  p.sigMs = hero.signature.cooldownMs * st.cooldown;
  s.signatures += 1;
  if (s.hero === 'rook') p.sigActiveMs = 5000;
  else if (s.hero === 'tr9') {
    p.sigActiveMs = 3000;
    // The bracing pulse throws every droid near back.
    near(s, p.x, p.y, 150, (e) => {
      knock(e, p.x, p.y, 340);
      damage(s, e, 10);
    });
    s.blasts.push({ id: s.nextId++, x: p.x, y: p.y, r: 150, ms: 420, maxMs: 420, color: BLAST.shield });
  } else {
    const tx = p.x + Math.cos(p.facing) * 170;
    const ty = p.y + Math.sin(p.facing) * 170;
    addBomb(s, 'frag', tx, ty, 600, 130, 90, { fromX: p.x, fromY: p.y });
  }
}

// ---------------------------------------------------------------------------------------------
// Weapons

interface BoltOpts {
  speed?: number;
  life?: number;
  pierce?: number;
  bounces?: number;
  color?: BoltColor;
  homing?: number;
  r?: number;
}

function bolt(s: GameState, x: number, y: number, angle: number, dmg: number, o: BoltOpts = {}) {
  const hero = HEROES[s.hero ?? 'rook'];
  const speed = o.speed ?? hero.boltSpeed;
  const range = hero.range * ((s.ranks.marksman ?? 0) >= 3 ? 1.3 : 1);
  s.bullets.push({
    id: s.nextId++, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg,
    pierce: o.pierce ?? st.pierce, bounces: o.bounces ?? st.bounces,
    lifeMs: o.life ?? (range / speed) * 1000, hostile: false, color: o.color ?? s.hero ?? 'rook',
    hit: [], homing: o.homing ?? 0, bounced: false, r: o.r ?? 4,
  });
}

/** One trigger pull: the hero's pellets, plus Scatter Shot's side bolts. */
function volley(s: GameState, x: number, y: number, angle: number, dmg: number, o: BoltOpts = {}, extraPellets = 0) {
  const hero = HEROES[s.hero ?? 'rook'];
  const pellets = hero.pellets + extraPellets;
  const spread = pellets > 1 ? hero.spread * (1 + 0.15 * extraPellets) : 0;
  for (let i = 0; i < pellets; i++) {
    const off = pellets > 1 ? -spread + (2 * spread * i) / (pellets - 1) : 0;
    bolt(s, x, y, angle + off + (Math.random() * 2 - 1) * hero.jitter, dmg, o);
  }
  const scatter = s.ranks.scatter ?? 0;
  if (scatter > 0) {
    const pct = at([0.5, 0.7, 0.85, 0.85, 1], scatter, 0);
    const sides = scatter >= 4 ? [0.28, 0.5] : [0.3];
    for (const a of sides) {
      bolt(s, x, y, angle - a, dmg * pct, o);
      bolt(s, x, y, angle + a, dmg * pct, o);
    }
  }
}

function fireRate(s: GameState) {
  const rally = s.hero === 'rook' && s.player.sigActiveMs > 0 ? 1.5 : 1;
  return st.fireRate * rally;
}

function primary(s: GameState, ms: number) {
  const p = s.player;
  const hero = HEROES[s.hero!];
  p.fireMs -= ms * fireRate(s);
  if (p.fireMs > 0) return;
  if (hero.aim === 'facing') {
    // Bram fires the way he walks; standing still, he turns to the nearest droid.
    if (!p.moving) {
      const t = nearest(s, p.x, p.y, 1, hero.range)[0];
      if (t) p.facing = Math.atan2(t.y - p.y, t.x - p.x);
    }
    p.fireMs += hero.fireMs;
    // A little aim assist: the nearest droid within 35 degrees of the way he faces.
    let aim = p.facing;
    let best = hero.range;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < best && Math.abs(angleDiff(Math.atan2(e.y - p.y, e.x - p.x), p.facing)) < 0.6) {
        best = d;
        aim = Math.atan2(e.y - p.y, e.x - p.x);
      }
    }
    p.aim = aim;
    p.shots += 1;
    const heavyEvery = s.capstones.includes('longshot') ? 2 : (s.ranks.marksman ?? 0) >= 4 ? 4 : 0;
    const heavy = heavyEvery > 0 && p.shots % heavyEvery === 0;
    const o: BoltOpts = heavy ? { pierce: 999, color: 'heavy', r: 6 } : {};
    const dmg = hero.damage * (heavy ? 3 : 1);
    volley(s, p.x, p.y, aim, dmg, o);
    // Brothers in Arms: every brother fires the same shot from where he stands.
    const bro = s.ranks.brothers ?? 0;
    if (bro > 0) {
      const pct = at([0.6, 0.8, 0.8, 1, 1], bro, 0);
      const cone = s.crossovers.includes('shoulder-to-shoulder');
      for (const a of s.allies) {
        if (a.kind !== 'brother') continue;
        a.aim = aim;
        bolt(s, a.x, a.y, aim, dmg * pct, o);
        if (cone) {
          bolt(s, a.x, a.y, aim - 0.22, dmg * pct * 0.7, o);
          bolt(s, a.x, a.y, aim + 0.22, dmg * pct * 0.7, o);
        }
      }
    }
    return;
  }
  const targets = nearest(s, p.x, p.y, 2, hero.range);
  if (!targets.length) {
    // Nothing in range: hold the shot until something is.
    p.fireMs = 0;
    return;
  }
  p.fireMs += hero.fireMs;
  p.shots += 1;
  if (hero.aim === 'nearest-two') {
    const twin = s.capstones.includes('twin-storm');
    const sides = twin ? [0, 1] : [p.side];
    p.side = 1 - p.side;
    for (const side of sides) {
      const t = targets[side] ?? targets[0];
      const gx = p.x + (side === 0 ? -11 : 11);
      const gy = p.y + 6;
      const a = Math.atan2(t.y - gy, t.x - gx);
      p.aim = a;
      volley(s, gx, gy, a, hero.damage);
      if ((s.ranks.gunslinger ?? 0) >= 4) volley(s, gx, gy, a + 0.07, hero.damage);
    }
  } else {
    const t = targets[0];
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    p.aim = a;
    const suppressor = s.ranks.suppressor ?? 0;
    volley(s, p.x, p.y, a, hero.damage, {}, (suppressor >= 4 ? 1 : 0) + (s.capstones.includes('hailstorm') ? 2 : 0));
  }
}

/** Counts down an ability's cooldown; true when it goes off (and the next one is set). */
function ready(s: GameState, name: string, periodMs: number, ms: number) {
  if (s.cd[name] === undefined) s.cd[name] = periodMs * 0.4;
  s.cd[name] -= ms;
  if (s.cd[name] > 0) return false;
  s.cd[name] = periodMs * st.cooldown;
  return true;
}

function abilities(s: GameState, ms: number) {
  const p = s.player;
  const r = (id: string) => s.ranks[id] ?? 0;
  const cap = (id: string) => s.capstones.includes(id);
  // Captain Rook
  const gs = r('gunslinger');
  if (gs >= 3 && ready(s, 'quickdraw', gs >= 5 ? 2000 : 3000, ms)) {
    const targets = nearest(s, p.x, p.y, gs >= 5 ? 10 : 6, 420);
    for (const t of targets) bolt(s, p.x, p.y, Math.atan2(t.y - p.y, t.x - p.x), HEROES.rook.damage, { speed: 700 });
  }
  const demo = r('demolitions');
  if (demo > 0 && ready(s, 'charge', demo >= 5 ? 3000 : 5000, ms)) {
    addBomb(s, 'charge', p.x, p.y, 1200, at([70, 70, 95, 95, 100], demo, 70), at([30, 45, 45, 45, 90], demo, 30), { cluster: demo >= 4 ? 3 : 0 });
  }
  if (cap('carpet-strike') && ready(s, 'carpet', 6000, ms)) {
    const spot = swarmSpot(s, 420);
    const a = Math.atan2(spot.y - p.y, spot.x - p.x);
    for (let i = 0; i < 6; i++) {
      const d = Math.hypot(spot.x - p.x, spot.y - p.y) - 110 + i * 50;
      addBomb(s, 'carpet', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 350 + i * 110, 62, 55);
    }
  }
  // Legionary TR-9
  const sup = r('suppressor');
  if (sup > 0) {
    const len = suppressorLength(s);
    const half = suppressorHalf(s);
    const slow = at([0.3, 0.4, 0.4, 0.45, 0.55], sup, 0.3);
    const dps = at([3, 3, 10, 10, 18], sup, 3);
    near(s, p.x, p.y, len, (e) => {
      const diff = Math.abs(angleDiff(Math.atan2(e.y - p.y, e.x - p.x), p.aim));
      if (diff > half) return;
      e.slowMs = Math.max(e.slowMs, 250);
      e.slowPct = Math.max(e.slowPct, slow);
      damage(s, e, (dps * ms) / 1000, { noCrit: true });
    });
  }
  if (cap('hailstorm') && ready(s, 'hail', 1500, ms)) {
    for (let i = 0; i < 12; i++) bolt(s, p.x, p.y, (i / 12) * Math.PI * 2 + s.time / 900, HEROES.tr9.damage);
  }
  const shield = r('riot-shield');
  if (shield >= 2 && ready(s, 'bash', at([2500, 2500, 2500, 1800, 1200], shield, 2500), ms)) {
    const stun = s.crossovers.includes('stunning-bash');
    const half = shieldHalf(s) + 0.25;
    near(s, p.x, p.y, 95, (e) => {
      if (Math.abs(angleDiff(Math.atan2(e.y - p.y, e.x - p.x), p.facing)) > half) return;
      damage(s, e, shield >= 4 ? 30 : 15);
      knock(e, p.x, p.y, 380);
      if (stun) e.stunMs = Math.max(e.stunMs, 1200);
    });
    s.blasts.push({ id: s.nextId++, x: p.x + Math.cos(p.facing) * 40, y: p.y + Math.sin(p.facing) * 40, r: 60, ms: 260, maxMs: 260, color: BLAST.shield });
  }
  if (cap('phalanx')) {
    for (const spot of phalanxSpots(s)) {
      near(s, spot.x, spot.y, 16, (e) => {
        if (e.bashMs > 0) return;
        e.bashMs = 500;
        damage(s, e, 20);
        knock(e, p.x, p.y, 320);
      });
    }
  }
  const drop = r('drop-doctrine');
  if (drop > 0 && ready(s, 'sentry', at([12000, 12000, 10000, 10000, 8000], drop, 12000), ms)) {
    const max = at([1, 1, 2, 2, 3], drop, 1);
    const sentries = s.allies.filter((a) => a.kind === 'sentry');
    if (sentries.length >= max) s.allies = s.allies.filter((a) => a !== sentries[0]);
    const a = Math.random() * Math.PI * 2;
    s.allies.push({ id: s.nextId++, kind: 'sentry', x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, cdMs: 300, lifeMs: drop >= 3 ? 15000 : 10000, slot: 0, aim: 0 });
  }
  if (drop >= 2 && ready(s, 'supply', 20000, ms)) {
    const spot = swarmSpot(s, 250);
    addBomb(s, 'crate', spot.x, spot.y, 1000, 80, 50, { heal: 15 });
  }
  if (cap('orbital-drop') && ready(s, 'orbital', 8000, ms)) {
    const spot = swarmSpot(s, 380);
    addBomb(s, 'orbital', spot.x, spot.y, 900, 120, 80, { turret: true });
  }
  // Corporal Bram-17
  const jump = r('jump-trooper');
  if (jump > 0) {
    const period = at([5000, 5000, 3500, 3500, 2500], jump, 5000);
    if ((s.cd.dash ?? 0) > 0) s.cd.dash -= ms;
    else if (p.moving && p.dashMs <= 0) {
      p.dashMs = 180;
      p.dashAngle = p.facing;
      s.cd.dash = period * st.cooldown;
    }
    const rockets = at([0, 2, 2, 4, 6], jump, 0) * (cap('skyfall') ? 2 : 1);
    if (rockets > 0 && ready(s, 'rockets', 2000, ms)) {
      for (let i = 0; i < rockets; i++) {
        const a = p.facing + Math.PI + (i - (rockets - 1) / 2) * 0.5;
        bolt(s, p.x, p.y, a, 14, { speed: 380, life: 2600, homing: 6, color: 'rocket', pierce: 0, bounces: 0, r: 5 });
      }
    }
  }
  if (cap('the-batch') && ready(s, 'batch', 6000, ms)) {
    for (const a of s.allies) {
      if (a.kind !== 'brother') continue;
      const t = nearest(s, a.x, a.y, 1, 300)[0];
      if (t) addBomb(s, 'grenade', t.x, t.y, 600, 70, 40, { fromX: a.x, fromY: a.y });
    }
  }
  // The Blaster pool
  const thermal = r('thermal');
  if (thermal > 0 && ready(s, 'thermal', at([4000, 3600, 3200, 2800, 2400], thermal, 4000), ms)) {
    const pool = nearest(s, p.x, p.y, 8, 320);
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (t) {
      addBomb(s, 'grenade', t.x, t.y, 600, at([55, 60, 70, 70, 85], thermal, 55), at([25, 32, 32, 45, 60], thermal, 25), {
        fromX: p.x, fromY: p.y, cluster: s.crossovers.includes('cluster-grenades') ? 3 : 0,
      });
    } else s.cd.thermal = 300;
  }
  const callin = r('callin');
  if (callin > 0 && ready(s, 'callin', at([30000, 27000, 24000, 21000, 18000], callin, 30000), ms)) {
    const spot = swarmSpot(s, 300);
    addBomb(s, 'crate', spot.x, spot.y, 1000, 90, at([60, 75, 90, 110, 140], callin, 60), { heal: at([15, 20, 25, 30, 35], callin, 15) });
  }
}

/** How far the Suppressor's cone reaches, px (0 without it), and half its angle, radians. */
export function suppressorLength(s: GameState) {
  return at([140, 150, 190, 200, 240], s.ranks.suppressor ?? 0, 0);
}
export function suppressorHalf(s: GameState) {
  return (s.ranks.suppressor ?? 0) >= 3 ? 0.55 : 0.45;
}

/** Half the angle the Riot Shield covers, radians. */
export function shieldHalf(s: GameState) {
  return (s.ranks['riot-shield'] ?? 0) >= 4 ? 1.3 : 0.9;
}

/** Where the three Phalanx shields are around the hero. */
export function phalanxSpots(s: GameState) {
  const p = s.player;
  return [0, 1, 2].map((i) => {
    const a = s.time / 400 + (i * Math.PI * 2) / 3;
    return { x: p.x + Math.cos(a) * 58, y: p.y + Math.sin(a) * 58, a };
  });
}

export function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------------------------------------------------------------------------------------------
// Allies: troopers, brothers, sentry turrets and drones

/** Adds troopers, brothers and drones to match the upgrades held. */
export function syncAllies(s: GameState) {
  const r = (id: string) => s.ranks[id] ?? 0;
  const want: Record<'trooper' | 'brother' | 'drone', number> = {
    trooper: s.capstones.includes('last-company') ? 5 : at([1, 1, 2, 2, 3], r('commander'), 0),
    brother: s.capstones.includes('the-batch') ? 5 : at([1, 1, 2, 2, 3], r('brothers'), 0),
    drone: at([1, 1, 2, 2, 3], r('drone'), 0),
  };
  for (const kind of ['trooper', 'brother', 'drone'] as const) {
    const have = s.allies.filter((a) => a.kind === kind);
    for (let i = have.length; i < want[kind]; i++) {
      s.allies.push({ id: s.nextId++, kind, x: s.player.x, y: s.player.y, cdMs: 400 + i * 150, lifeMs: 0, slot: i, aim: 0 });
    }
  }
}

function moveAllies(s: GameState, ms: number) {
  const p = s.player;
  const dt = ms / 1000;
  const rally = s.hero === 'rook' && p.sigActiveMs > 0 ? 1.5 : 1;
  const counts = { trooper: 0, brother: 0, drone: 0, sentry: 0 };
  for (const a of s.allies) counts[a.kind] += 1;
  for (const a of s.allies) {
    if (a.kind === 'sentry') {
      a.lifeMs -= ms;
    } else {
      // Troopers and brothers keep formation behind the hero; drones circle.
      const n = counts[a.kind];
      const ang = a.kind === 'drone' ? s.time / 550 + (a.slot * Math.PI * 2) / n : p.facing + Math.PI + (a.slot - (n - 1) / 2) * 0.8;
      const dist = a.kind === 'drone' ? 52 : a.kind === 'brother' ? 50 : 44;
      const tx = p.x + Math.cos(ang) * dist;
      const ty = p.y + Math.sin(ang) * dist;
      const k = a.kind === 'drone' ? 1 : Math.min(1, 8 * dt);
      a.x += (tx - a.x) * k;
      a.y += (ty - a.y) * k;
    }
    if (a.kind === 'brother') continue;
    a.cdMs -= ms * (a.kind === 'trooper' ? rally : 1);
    if (a.cdMs > 0) continue;
    const range = a.kind === 'trooper' ? 340 : 300;
    const t = nearest(s, a.x, a.y, 1, range)[0];
    if (!t) {
      a.cdMs = 0;
      continue;
    }
    const ang = Math.atan2(t.y - a.y, t.x - a.x);
    a.aim = ang;
    const plain = { pierce: 0, bounces: 0 };
    if (a.kind === 'trooper') {
      const cm = s.ranks.commander ?? 0;
      const dmg = 7 * (cm >= 2 ? 1.3 : 1) * (s.capstones.includes('last-company') ? 1.5 : 1);
      bolt(s, a.x, a.y, ang, dmg, { ...plain, color: 'rook' });
      if (cm >= 4) bolt(s, a.x, a.y, ang + 0.05, dmg, { ...plain, color: 'rook' });
      a.cdMs = 900 * (cm >= 2 ? 0.75 : 1);
    } else if (a.kind === 'sentry') {
      bolt(s, a.x, a.y, ang, 8 * ((s.ranks['drop-doctrine'] ?? 0) >= 4 ? 1.6 : 1), { ...plain, color: 'drone' });
      a.cdMs = 500;
    } else {
      bolt(s, a.x, a.y, ang, 10, { ...plain, color: 'drone', speed: 600 });
      a.cdMs = at([1100, 850, 850, 700, 600], s.ranks.drone ?? 0, 1100);
    }
  }
  s.allies = s.allies.filter((a) => a.kind !== 'sentry' || a.lifeMs > 0);
}

// ---------------------------------------------------------------------------------------------
// The droids

function spawnAt(s: GameState, kind: EnemyKind, x: number, y: number, elite = false) {
  const spec = ENEMY[kind];
  const t = s.time / 1000;
  const hpScale = kind === 'boss' ? DIFF.hp : DIFF.hp * (1 + t / 240);
  const hp = spec.hp * hpScale * (elite ? ELITE.hp : 1);
  const speed = spec.speed * (kind === 'boss' ? 1 : 1 + t / 1200) * (elite ? ELITE.speed : 1) * (0.92 + Math.random() * 0.16);
  const e: Enemy = {
    id: s.nextId++, kind, elite, x, y, r: spec.r * (elite ? ELITE.size : 1), hp, maxHp: hp, speed,
    dmg: spec.dmg * (elite ? 1.5 : 1), hitMs: 0, slowMs: 0, slowPct: 0, stunMs: 0, flashMs: 0, kx: 0, ky: 0,
    mode: 'walk', modeMs: 0, vx: 0, vy: 0, shellMs: BOSS.shellMs, spawnMs: BOSS.spawnMs, bashMs: 0,
  };
  s.enemies.push(e);
  return e;
}

/** A point on the spawn ring around the hero, at `angle` or a random one. */
function ringPoint(s: GameState, angle = Math.random() * Math.PI * 2) {
  const d = SPAWN_RING.min + Math.random() * (SPAWN_RING.max - SPAWN_RING.min);
  return { x: s.player.x + Math.cos(angle) * d, y: s.player.y + Math.sin(angle) * d };
}

/** Droids per second at a run time (s), before difficulty. */
export function spawnRate(t: number) {
  return 1.4 + t / 75 + (t / 160) ** 2;
}

function director(s: GameState, ms: number) {
  const t = s.time / 1000;
  const living = s.enemies.length - (s.bossSpawned ? 1 : 0);
  s.spawnDebt += (spawnRate(t) * DIFF.spawn * (s.bossSpawned ? 0.35 : 1) * ms) / 1000;
  const rollerChance = t < 35 ? 0 : Math.min(0.28, 0.08 + t / 900);
  let made = 0;
  while (s.spawnDebt >= 1) {
    s.spawnDebt -= 1;
    if (living + made >= MAX_ENEMIES) {
      s.spawnDebt = Math.min(s.spawnDebt, 1);
      break;
    }
    const spot = ringPoint(s);
    spawnAt(s, Math.random() < rollerChance ? 'rollerbomb' : 'clanker', spot.x, spot.y);
    made += 1;
  }
  if (s.time >= s.nextElite && !s.bossSpawned) {
    s.nextElite += ELITE.every;
    const spot = ringPoint(s);
    spawnAt(s, s.time > 120_000 && Math.random() < 0.5 ? 'rollerbomb' : 'clanker', spot.x, spot.y, true);
    pop(s, 'Elite droid', '#ffe066');
  }
  while (s.waves.length && s.time >= s.waves[0]) {
    s.waves.shift();
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      spawnAt(s, 'clanker', s.player.x + Math.cos(a) * 440, s.player.y + Math.sin(a) * 440);
    }
    pop(s, 'They surround you!', '#ff8a6a');
  }
  if (!s.bossSpawned && s.time >= RUN_MS) {
    s.bossSpawned = true;
    const spot = ringPoint(s, s.player.facing);
    spawnAt(s, 'boss', spot.x, spot.y);
    pop(s, 'The Grinder Crawler', '#ff9a3c');
  }
}

function knock(e: Enemy, fromX: number, fromY: number, power: number) {
  if (e.kind === 'boss') return;
  const a = Math.atan2(e.y - fromY, e.x - fromX);
  e.kx = Math.cos(a) * power;
  e.ky = Math.sin(a) * power;
  if (e.mode === 'rush') e.mode = 'walk';
}

function moveEnemies(s: GameState, ms: number) {
  const p = s.player;
  const dt = ms / 1000;
  const blockHalf = shieldHalf(s);
  const shield = s.ranks['riot-shield'] ?? 0;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.hitMs -= ms;
    e.flashMs = Math.max(0, e.flashMs - ms);
    e.bashMs = Math.max(0, e.bashMs - ms);
    e.stunMs = Math.max(0, e.stunMs - ms);
    if (e.slowMs > 0) e.slowMs -= ms;
    else e.slowPct = 0;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Left far behind: brought back round ahead of the hero.
    if (dist > LEASH && e.kind !== 'boss') {
      const spot = ringPoint(s, p.facing + (Math.random() - 0.5) * 1.6);
      e.x = spot.x;
      e.y = spot.y;
      e.mode = 'walk';
      continue;
    }
    const resist = e.kind === 'boss' ? 0.3 : 1;
    const slow = 1 - e.slowPct * resist;
    const still = e.stunMs > 0 && e.kind !== 'boss';
    // The boss never falls far behind: out past the view it rolls in three times as fast.
    const catchUp = e.kind === 'boss' && dist > 480 ? 3 : 1;
    const speed = still ? 0 : e.speed * slow * catchUp;
    let vx = (dx / dist) * speed;
    let vy = (dy / dist) * speed;
    if (e.kind === 'rollerbomb') {
      if (e.mode === 'walk' && dist < ROLLER.trigger && !still) {
        e.mode = 'arm';
        e.modeMs = ROLLER.armMs;
      } else if (e.mode === 'arm') {
        vx = vy = 0;
        e.modeMs -= ms;
        if (e.modeMs <= 0) {
          e.mode = 'rush';
          e.modeMs = ROLLER.rushMs;
          e.vx = (dx / dist) * ROLLER.rushSpeed;
          e.vy = (dy / dist) * ROLLER.rushSpeed;
        }
      } else if (e.mode === 'rush') {
        vx = e.vx * slow;
        vy = e.vy * slow;
        e.modeMs -= ms;
        if (e.modeMs <= 0) {
          detonate(s, e, false);
          continue;
        }
      }
    }
    if (e.kind === 'boss') bossAttacks(s, e, ms, dx / dist, dy / dist);
    e.x += (vx + e.kx) * dt;
    e.y += (vy + e.ky) * dt;
    const fade = Math.exp(-7 * dt);
    e.kx *= fade;
    e.ky *= fade;
    // Keep apart from the droids around, so a swarm spreads into a crowd rather than a dot.
    if (e.kind !== 'boss') {
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const list = grid.get(keyOf(gx, gy));
          if (!list) continue;
          for (const o of list) {
            if (o === e) continue;
            const ox = e.x - o.x;
            const oy = e.y - o.y;
            const min = e.r + o.r;
            const d2 = ox * ox + oy * oy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const push = ((min - d) / d) * 0.3;
            e.x += ox * push;
            e.y += oy * push;
          }
        }
      }
    } else {
      // The boss shoves smaller droids out of its way.
      near(s, e.x, e.y, e.r, (o, d) => {
        if (o === e || d === 0) return;
        const push = (e.r + o.r - d) / d;
        o.x += (o.x - e.x) * push * 0.5;
        o.y += (o.y - e.y) * push * 0.5;
      });
    }
    // Touching the hero.
    const reach = e.r + HERO_R;
    const ex = p.x - e.x;
    const ey = p.y - e.y;
    if (ex * ex + ey * ey > reach * reach || e.hitMs > 0) continue;
    e.hitMs = 700;
    const from = Math.atan2(e.y - p.y, e.x - p.x);
    const braced = s.hero === 'tr9' && p.sigActiveMs > 0;
    const blocked = shield > 0 && e.kind !== 'boss' && Math.abs(angleDiff(from, p.facing)) <= blockHalf;
    if (braced || blocked) {
      knock(e, p.x, p.y, braced ? 320 : 220);
      if (blocked && shield >= 3) damage(s, e, 12);
      continue;
    }
    if (e.kind === 'rollerbomb') {
      detonate(s, e, true);
      continue;
    }
    hurtHero(s, e.dmg);
  }
}

function bossAttacks(s: GameState, e: Enemy, ms: number, ux: number, uy: number) {
  const enraged = e.hp < e.maxHp * BOSS.enragedAt;
  if (enraged) e.speed = ENEMY.boss.speed * 1.45;
  e.shellMs -= ms;
  if (e.shellMs <= 0) {
    e.shellMs = BOSS.shellMs * (enraged ? 0.75 : 1);
    const n = BOSS.shells + (enraged ? 2 : 0);
    const base = Math.atan2(uy, ux);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.24;
      s.bullets.push({
        id: s.nextId++, x: e.x + ux * 50, y: e.y + uy * 50, vx: Math.cos(a) * BOSS.shellSpeed, vy: Math.sin(a) * BOSS.shellSpeed,
        dmg: BOSS.shellDmg, pierce: 0, bounces: 0, lifeMs: 3800, hostile: true, color: 'shell', hit: [], homing: 0, bounced: false, r: 7,
      });
    }
  }
  e.spawnMs -= ms;
  if (e.spawnMs <= 0) {
    e.spawnMs = BOSS.spawnMs;
    for (let i = 0; i < BOSS.adds; i++) {
      const a = Math.atan2(-uy, -ux) + (i - (BOSS.adds - 1) / 2) * 0.4;
      spawnAt(s, 'clanker', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
  }
}

/** A rollerbomb goes off: on the hero when it touched them, and on every droid around it. */
function detonate(s: GameState, e: Enemy, onHero: boolean) {
  e.hp = 0;
  const p = s.player;
  if (onHero || Math.hypot(p.x - e.x, p.y - e.y) < ROLLER.blastR + HERO_R) hurtHero(s, e.dmg);
  explodeDroids(s, e.x, e.y, ROLLER.blastR, ROLLER.hurtOthers, e);
  s.blasts.push({ id: s.nextId++, x: e.x, y: e.y, r: ROLLER.blastR, ms: 380, maxMs: 380, color: BLAST.droid });
}

interface HitOpts {
  noCrit?: boolean;
  slow?: boolean;
}

/** Hero-side damage to a droid: the Power Cell, crits and Stun Rounds apply. Returns the damage. */
function damage(s: GameState, e: Enemy, base: number, o: HitOpts = {}) {
  if (e.hp <= 0) return 0;
  let dmg = base * st.damage;
  if (!o.noCrit && st.crit > 0 && Math.random() < st.crit) dmg *= 2;
  e.hp -= dmg;
  e.flashMs = 90;
  if (o.slow && st.slowPct > 0) {
    e.slowPct = Math.max(e.slowPct, st.slowPct);
    e.slowMs = Math.max(e.slowMs, st.slowMs);
  }
  if (e.hp <= 0) kill(s, e);
  return dmg;
}

function kill(s: GameState, e: Enemy) {
  e.hp = 0;
  s.kills += 1;
  if (e.kind === 'boss') {
    s.phase = 'won';
    s.blasts.push({ id: s.nextId++, x: e.x, y: e.y, r: 160, ms: 900, maxMs: 900, color: BLAST.hero });
    for (const o of s.enemies) if (o !== e && o.hp > 0) o.hp = 0;
    return;
  }
  const value = e.elite ? ELITE.xp : ENEMY[e.kind].xp;
  dropShard(s, e.x, e.y, value);
  if (e.elite) {
    s.elitesKilled += 1;
    s.pickups.push({ id: s.nextId++, kind: 'chest', x: e.x, y: e.y, heal: 0 });
  }
  // A rollerbomb shot down still blows up, but only hurts droids.
  if (e.kind === 'rollerbomb') {
    explodeDroids(s, e.x, e.y, ROLLER.blastR, ROLLER.hurtOthers, e);
    s.blasts.push({ id: s.nextId++, x: e.x, y: e.y, r: ROLLER.blastR, ms: 380, maxMs: 380, color: BLAST.droid });
  }
}

function dropShard(s: GameState, x: number, y: number, value: number) {
  if (s.shards.length >= MAX_SHARDS) {
    s.shards[Math.floor(Math.random() * s.shards.length)].value += value;
    return;
  }
  s.shards.push({ id: s.nextId++, x, y, value, pulled: false });
}

/** Damage to every droid near a point, apart from `skip` (no Power Cell: a droid's own blast). */
function explodeDroids(s: GameState, x: number, y: number, r: number, dmg: number, skip: Enemy) {
  near(s, x, y, r, (o) => {
    if (o === skip || o.hp <= 0) return;
    o.hp -= dmg;
    o.flashMs = 90;
    if (o.hp <= 0) kill(s, o);
  });
}

/** A hero-side blast: damages and pushes every droid within `r`. */
function explode(s: GameState, x: number, y: number, r: number, dmg: number, color: string) {
  near(s, x, y, r, (e) => {
    damage(s, e, dmg);
    knock(e, x, y, 160);
  });
  s.blasts.push({ id: s.nextId++, x, y, r, ms: 420, maxMs: 420, color });
}

// ---------------------------------------------------------------------------------------------
// Bolts, bombs, fire and pickups

function moveBullets(s: GameState, ms: number) {
  const dt = ms / 1000;
  const shield = s.ranks['riot-shield'] ?? 0;
  const keep: Bullet[] = [];
  for (const b of s.bullets) {
    b.lifeMs -= ms;
    if (b.lifeMs <= 0) continue;
    if (b.homing > 0) {
      const t = nearest(s, b.x, b.y, 1, 320)[0];
      if (t) {
        const want = Math.atan2(t.y - b.y, t.x - b.x);
        const have = Math.atan2(b.vy, b.vx);
        const turn = Math.max(-b.homing * dt, Math.min(b.homing * dt, angleDiff(want, have)));
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(have + turn) * speed;
        b.vy = Math.sin(have + turn) * speed;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.hostile) {
      if (hostileBolt(s, b, shield)) keep.push(b);
      continue;
    }
    let alive = true;
    near(s, b.x, b.y, b.r, (e) => {
      if (!alive || e.hp <= 0 || b.hit.includes(e.id)) return;
      b.hit.push(e.id);
      damage(s, e, b.dmg, { slow: true });
      if (b.color === 'heavy') knock(e, e.x - b.vx, e.y - b.vy, 60);
      if (b.pierce > 0) {
        b.pierce -= 1;
        return;
      }
      if (b.bounces > 0) {
        b.bounces -= 1;
        if (!b.bounced && (s.ranks.ricochet ?? 0) >= 3) b.dmg *= 1.25;
        b.bounced = true;
        const speed = Math.hypot(b.vx, b.vy);
        const next = st.seek ? nearest(s, b.x, b.y, 1, 240, b.hit)[0] : undefined;
        const a = next ? Math.atan2(next.y - b.y, next.x - b.x) : Math.atan2(b.vy, b.vx) + Math.PI + (Math.random() - 0.5) * 2.4;
        b.vx = Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
        b.lifeMs = Math.max(b.lifeMs, 450);
        return;
      }
      alive = false;
    });
    if (alive) keep.push(b);
  }
  s.bullets = keep;
}

/** A droid shell: blocked or reflected by shields, else it hurts the hero. Returns whether it flies on. */
function hostileBolt(s: GameState, b: Bullet, shield: number) {
  const p = s.player;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const d = Math.hypot(dx, dy);
  // The Phalanx shields catch shells around the hero.
  if (s.capstones.includes('phalanx')) {
    for (const spot of phalanxSpots(s)) {
      if (Math.hypot(b.x - spot.x, b.y - spot.y) < 20) return reflect(b);
    }
  }
  if (shield > 0 && d < HERO_R + 18 && Math.abs(angleDiff(Math.atan2(dy, dx), p.facing)) <= shieldHalf(s)) {
    return shield >= 3 ? reflect(b) : false;
  }
  if (d < HERO_R + b.r) {
    hurtHero(s, b.dmg);
    return false;
  }
  return true;
}

function reflect(b: Bullet) {
  b.hostile = false;
  b.vx = -b.vx * 1.5;
  b.vy = -b.vy * 1.5;
  b.dmg = 30;
  b.color = 'tr9';
  b.lifeMs = 1500;
  return true;
}

function addBomb(s: GameState, kind: Bomb['kind'], x: number, y: number, ms: number, r: number, dmg: number, o: Partial<Bomb> = {}) {
  s.bombs.push({ id: s.nextId++, kind, x, y, fromX: o.fromX ?? x, fromY: o.fromY ?? y, ms, maxMs: ms, r, dmg, cluster: o.cluster ?? 0, heal: o.heal ?? 0, turret: o.turret ?? false });
}

function bombs(s: GameState, ms: number) {
  const due = [];
  for (const b of s.bombs) {
    b.ms -= ms;
    if (b.ms <= 0) due.push(b);
  }
  if (!due.length) return;
  s.bombs = s.bombs.filter((b) => b.ms > 0);
  for (const b of due) {
    explode(s, b.x, b.y, b.r, b.dmg, b.kind === 'frag' || b.kind === 'grenade' ? BLAST.frag : BLAST.hero);
    for (let i = 0; i < b.cluster; i++) {
      const a = (i / b.cluster) * Math.PI * 2 + Math.random();
      addBomb(s, 'bomblet', b.x + Math.cos(a) * 48, b.y + Math.sin(a) * 48, 260 + i * 60, 45, b.dmg * 0.5);
    }
    if (b.heal > 0) s.pickups.push({ id: s.nextId++, kind: 'medkit', x: b.x, y: b.y, heal: b.heal });
    if (b.turret) s.allies.push({ id: s.nextId++, kind: 'sentry', x: b.x, y: b.y, cdMs: 200, lifeMs: 8000, slot: 0, aim: 0 });
  }
}

function fires(s: GameState, dt: number) {
  for (const f of s.fires) {
    f.ms -= dt * 1000;
    near(s, f.x, f.y, f.r, (e) => damage(s, e, f.dps * dt, { noCrit: true }));
  }
  s.fires = s.fires.filter((f) => f.ms > 0);
}

function pickups(s: GameState, ms: number) {
  const p = s.player;
  const dt = ms / 1000;
  const reach = st.pickup;
  const keep = [];
  for (const sh of s.shards) {
    const dx = p.x - sh.x;
    const dy = p.y - sh.y;
    const d = Math.hypot(dx, dy);
    if (d < reach) sh.pulled = true;
    if (sh.pulled) {
      if (d < HERO_R + 6) {
        gainXp(s, sh.value);
        continue;
      }
      const speed = Math.max(260, 900 - d * 2);
      const k = Math.min(1, (speed * dt) / d);
      sh.x += dx * k;
      sh.y += dy * k;
    }
    keep.push(sh);
  }
  s.shards = keep;
  s.pickups = s.pickups.filter((k) => {
    if (Math.hypot(p.x - k.x, p.y - k.y) > HERO_R + 16) return true;
    if (k.kind === 'medkit') {
      heal(s, k.heal);
      pop(s, `+${k.heal} health`, '#7dffa0');
    } else openChest(s);
    return false;
  });
}

function gainXp(s: GameState, value: number) {
  s.xp += value * st.xp;
  while (s.xp >= s.xpNext) {
    s.xp -= s.xpNext;
    s.level += 1;
    s.xpNext = xpFor(s.level);
    s.pendingLevels += 1;
  }
}

/** An elite's chest: a free tier of something held (which may unlock a capstone) and some health. */
function openChest(s: GameState) {
  s.chests += 1;
  heal(s, 25);
  const held = Object.keys(s.ranks).filter((id) => s.ranks[id] < MAX_TIER);
  if (!held.length) {
    heal(s, 25);
    pop(s, 'Supply chest: +50 health', '#ffe066');
    return;
  }
  const id = held[Math.floor(Math.random() * held.length)];
  raise(s, id);
  pop(s, `Chest: ${UPGRADES[id].name} tier ${s.ranks[id]}`, '#ffe066');
}

function pop(s: GameState, text: string, color: string) {
  s.pops.push({ id: s.nextId++, x: s.player.x, y: s.player.y - 40 - 18 * (s.pops.length % 3), text, color, ms: 2200 });
  if (s.pops.length > 6) s.pops.shift();
}
