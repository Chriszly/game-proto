import { ENEMIES } from './enemies';
import {
  BOW,
  FIELD,
  SPAWN_X,
  HERO_FRONT,
  BARRICADE_FRONT,
  GUARD_SLOTS,
  offerable,
  progressOf,
  newRun,
  rainNeed,
  stats,
  streakBonus,
  xpToNext,
  type Effect,
  type Enemy,
  type GameState,
  type Stats,
} from './state';
import { ARCANE_RADIUS, GUARDS, MAX_GUARD_LEVEL, SPEAR_REACH, guardDamage, trainCost, type GuardKind } from './guards';
import { RELIC_IDS } from './relics';
import { ROAD_IDS, roadEffects, type RoadId } from './roads';
import { FILLERS, PURSE_COINS, type UpgradeId } from './upgrades';
import { BREAK_MS, bossBars, foeHp, isBossWave, spawnInterval, waveFoes } from './waves';

// The rules of a run, in plain TypeScript: `tick` moves the battle on, `pick` takes an upgrade.

/** Longest step simulated at once, so fast arrows can't skip past a foe. */
const SUBSTEP_MS = 16;
export const ARROW_SPEED = 720;
const FIREBALL_SPEED = 400;
const MAGIC_SPEED = 380;
/** How far lightning leaps from one foe to the next. */
const LEAP_RANGE = 170;
const HIT_FLASH_MS = 90;
/** Foes are shot once their middle has come into the 960px view. */
const VIEW_RIGHT = 950;
/** How long each kind of effect plays, in milliseconds. */
const EFFECT_MS = {
  blast: 260, fireblast: 360, bolt: 220, death: 320, crit: 400, rain: 520, xp: 900, orb: 750, block: 260, heal: 700, stab: 200, arcane: 360,
} as const;
/** How long an Arrow Rain volley takes to come down after it is loosed. */
export const RAIN_FALL_MS = 450;
/** The ring Arrow Rain lands on: half its width and height (it lies flat on the road). */
export const RAIN_RING = { rx: 80, ry: 50 };
/** The patch caltrops are strewn over: half its width and height. */
export const CALTROP_PATCH = { rx: 66, ry: 34 };
/** How long caltrops lie on the road. */
export const CALTROP_MS = 8_000;
/** Foes walking on caltrops are slowed by this share and take this many times an arrow's damage a second. */
const CALTROP_SLOW = 0.4;
const CALTROP_DPS = 0.8;
/** A shield takes this share of an arrow's hit off. */
export const SHIELD_BLOCK = 0.75;
/** A shaman heals the foes within this range every HEAL_MS by a share of their health (less for a boss). */
const HEAL_MS = 2_500;
const FIRST_HEAL_MS = 1_000;
const HEAL_RANGE = 120;
const HEAL_SHARE = 0.12;
const BOSS_HEAL_SHARE = 0.03;
/** How long a level-up waits for a tap before it takes one of the offered upgrades at random. */
export const AUTO_PICK_MS = 10_000;

export function tick(state: GameState, ms: number) {
  while (ms > 0 && state.phase !== 'over') {
    if (state.choices) {
      // The battle waits while the hero picks an upgrade, until the time to pick runs out.
      const dt = Math.min(ms, state.pickMs);
      state.pickMs -= dt;
      ageEffects(state, dt);
      ms -= dt;
      if (state.pickMs <= 0) pick(state, state.choices[Math.floor(Math.random() * state.choices.length)]);
      continue;
    }
    const dt = Math.min(ms, SUBSTEP_MS);
    step(state, dt);
    ms -= dt;
  }
  // Effects still play out once the run is over.
  if (ms > 0) ageEffects(state, ms);
}

function step(state: GameState, dt: number) {
  const s = stats(state);
  ageEffects(state, dt);
  // A streak ends when no kill follows in time.
  const streak = state.streak;
  if (streak.ms > 0) {
    streak.ms = Math.max(0, streak.ms - dt);
    if (streak.ms === 0) streak.count = 0;
  }
  state.rain.need = rainNeed(state.wave, s);
  state.rain.charge = Math.min(state.rain.charge, state.rain.need);
  landVolleys(state, s, dt);
  for (const p of state.caltrops.patches) p.ms -= dt;
  state.caltrops.patches = state.caltrops.patches.filter((p) => p.ms > 0);
  if (state.phase === 'break') {
    if (state.roadChoices) {
      // After a boss the break waits on the choice of the next road, taking one at random in time.
      state.roadMs -= dt;
      if (state.roadMs <= 0) pickRoad(state, state.roadChoices[Math.floor(Math.random() * state.roadChoices.length)]);
    } else state.breakMs -= dt;
    if (state.breakMs <= 0) {
      state.phase = 'fighting';
      state.relicFound = null;
      state.toSpawn = waveFoes(state.wave, state.road);
      state.spawnMs = 0;
    }
  } else {
    spawn(state, dt);
  }
  shoot(state, s, dt);
  guardsAct(state, dt);
  moveMissiles(state, s, dt);
  moveEnemies(state, s, dt);
  if (state.phase === 'fighting' && state.toSpawn.length === 0 && state.enemies.length === 0) clearWave(state);
}

function spawn(state: GameState, dt: number) {
  state.spawnMs -= dt;
  if (state.spawnMs > 0 || state.toSpawn.length === 0) return;
  const kind = state.toSpawn.shift()!;
  const type = ENEMIES[kind];
  const hp = foeHp(kind, state.wave, state.road);
  // Bosses walk down the middle of the field, the rest anywhere on it, and flyers above its far edge.
  const margin = type.radius / 2;
  const y = type.boss
    ? (FIELD.top + FIELD.bottom) / 2
    : type.flying
      ? FIELD.top - 50 + Math.random() * 70
      : FIELD.top + margin + Math.random() * (FIELD.bottom - FIELD.top - 2 * margin);
  state.enemies.push({
    id: state.nextId++,
    kind,
    x: SPAWN_X + type.radius,
    y,
    hp,
    maxHp: hp,
    bars: type.boss ? bossBars(state.wave) : 1,
    slow: 0,
    slowMs: 0,
    burnDps: 0,
    burnMs: 0,
    attacking: false,
    hitMs: 0,
    // A shaman heals for the first time soon after coming into view, then every HEAL_MS.
    castMs: FIRST_HEAL_MS,
  });
  state.spawnMs = spawnInterval(state.wave);
}

/** Foes that have come into view, nearest to the barricade first: the ones to shoot. */
function targets(state: GameState) {
  return state.enemies.filter((e) => e.x < VIEW_RIGHT).sort((a, b) => a.x - b.x);
}

function shoot(state: GameState, s: Stats, dt: number) {
  const cd = state.cooldown;
  cd.arrow = Math.max(0, cd.arrow - dt);
  cd.fireball = Math.max(0, cd.fireball - dt);
  cd.storm = Math.max(0, cd.storm - dt);
  const foes = targets(state);
  if (foes.length === 0) return;

  if (cd.arrow === 0) {
    // Each arrow of a volley goes at a different foe while there are enough of them.
    for (let i = 0; i < s.arrows; i++) launch(state, 'arrow', foes[i % foes.length], s.pierce, i, s.arrows);
    cd.arrow = s.shotMs;
  }
  if (s.fireball && cd.fireball === 0) {
    // Fireballs go where the foes are thickest: at the one with the most others around it.
    const crowd = (e: Enemy) => foes.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) < s.fireball!.radius).length;
    const target = foes.reduce((best, e) => (crowd(e) > crowd(best) ? e : best), foes[0]);
    launch(state, 'fireball', target, 0, 0, 1);
    cd.fireball = s.fireball.ms;
  }
  if (s.storm && cd.storm === 0) {
    lightning(state, s, foes[0]);
    cd.storm = s.storm.ms;
  }
}

function launch(state: GameState, kind: 'arrow' | 'fireball', target: Enemy, pierce: number, i: number, of: number) {
  const speed = kind === 'arrow' ? ARROW_SPEED : FIREBALL_SPEED;
  // A volley fans out a little before the arrows turn towards their foes.
  const fan = of > 1 ? (i / (of - 1) - 0.5) * 0.5 : 0;
  const angle = Math.atan2(target.y - BOW.y, target.x - BOW.x) + fan;
  state.missiles.push({
    id: state.nextId++,
    kind,
    x: BOW.x,
    y: BOW.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    target: target.id,
    hit: [],
    pierce,
  });
}

function moveMissiles(state: GameState, s: Stats, dt: number) {
  const gone = new Set<number>();
  for (const m of state.missiles) {
    const speed = m.kind === 'arrow' ? ARROW_SPEED : m.kind === 'magic' ? MAGIC_SPEED : FIREBALL_SPEED;
    let target = state.enemies.find((e) => e.id === m.target);
    // A foe that fell before the arrow got there: turn to the nearest one not yet hit.
    if (!target && m.target !== null) {
      target = nearest(state.enemies.filter((e) => !m.hit.includes(e.id)), m.x, m.y);
      m.target = target?.id ?? null;
    }
    if (target) {
      // Homing: turn fully towards the foe each step.
      const a = Math.atan2(target.y - m.y, target.x - m.x);
      m.vx = Math.cos(a) * speed;
      m.vy = Math.sin(a) * speed;
    }
    m.x += (m.vx * dt) / 1000;
    m.y += (m.vy * dt) / 1000;
    if (m.x < -40 || m.x > SPAWN_X + 80 || m.y < 0 || m.y > 560) {
      gone.add(m.id);
      continue;
    }
    const struck = state.enemies.find(
      (e) => !m.hit.includes(e.id) && Math.hypot(e.x - m.x, e.y - m.y) < ENEMIES[e.kind].radius + 4,
    );
    if (!struck) continue;
    if (m.kind === 'fireball') {
      explode(state, m.x, m.y, s.fireball!.radius, s.fireball!.damage, 'fireblast', s);
      gone.add(m.id);
      continue;
    }
    if (m.kind === 'magic') {
      // An arcane burst: magic, so armour and shields don't stop it.
      addEffect(state, { kind: 'arcane', x: m.x, y: m.y, radius: ARCANE_RADIUS });
      for (const e of state.enemies) {
        if (Math.hypot(e.x - m.x, e.y - m.y) <= ARCANE_RADIUS + ENEMIES[e.kind].radius) hurt(e, m.damage ?? 0, false);
      }
      gone.add(m.id);
      continue;
    }
    const blocked = arrowHit(state, s, struck, m.x, m.y);
    m.hit.push(struck.id);
    // An arrow that glances off a shield goes no further.
    if (m.pierce > 0 && !blocked) {
      m.pierce--;
      const next = nearest(state.enemies.filter((e) => !m.hit.includes(e.id) && e.x > m.x - 20), m.x, m.y);
      m.target = next?.id ?? null;
    } else gone.add(m.id);
  }
  state.missiles = state.missiles.filter((m) => !gone.has(m.id));
  removeDead(state);
}

/**
 * An arrow strikes a foe: a crit, burning, chill and a burst. A shield bearer's shield takes most
 * of the hit and all of the burning and chill, though a burst still gets through. Returns whether
 * the shield blocked it.
 */
function arrowHit(state: GameState, s: Stats, foe: Enemy, x: number, y: number) {
  const crit = Math.random() < s.critChance;
  const damage = s.damage * (crit ? 2 : 1);
  const shield = !!ENEMIES[foe.kind].shield;
  hurt(foe, shield ? damage * (1 - SHIELD_BLOCK) : damage, true);
  if (shield) {
    addEffect(state, { kind: 'block', x: foe.x - ENEMIES[foe.kind].radius, y: foe.y - 10 });
    if (s.burst) explode(state, x, y, s.burst.radius, damage * s.burst.share, 'blast', s);
    return true;
  }
  if (crit) addEffect(state, { kind: 'crit', x: foe.x, y: foe.y - ENEMIES[foe.kind].radius });
  if (s.burn) {
    foe.burnDps = Math.max(foe.burnDps, s.burn.dps);
    foe.burnMs = s.burn.ms;
  }
  if (s.chill) {
    foe.slow = Math.max(foe.slow, s.chill.slow);
    foe.slowMs = s.chill.ms;
  }
  if (s.burst) explode(state, x, y, s.burst.radius, damage * s.burst.share, 'blast', s, foe.id);
  return false;
}

/** Hurts every foe within `radius`, except `spare` (the one the arrow already hit). */
function explode(state: GameState, x: number, y: number, radius: number, damage: number, kind: 'blast' | 'fireblast', s: Stats, spare?: number) {
  addEffect(state, { kind, x, y, radius });
  for (const e of state.enemies) {
    if (e.id === spare || Math.hypot(e.x - x, e.y - y) > radius + ENEMIES[e.kind].radius) continue;
    hurt(e, damage, true);
    // Fireballs set foes alight when the arrows burn.
    if (kind === 'fireblast' && s.burn) {
      e.burnDps = Math.max(e.burnDps, s.burn.dps);
      e.burnMs = s.burn.ms;
    }
  }
}

/** Lightning strikes the foe nearest the barricade and leaps on to the nearest foe it has not struck. */
function lightning(state: GameState, s: Stats, first: Enemy) {
  const struck: Enemy[] = [first];
  while (struck.length < s.storm!.leaps) {
    const last = struck[struck.length - 1];
    const next = nearest(state.enemies.filter((e) => !struck.includes(e) && Math.hypot(e.x - last.x, e.y - last.y) < LEAP_RANGE), last.x, last.y);
    if (!next) break;
    struck.push(next);
  }
  for (const e of struck) hurt(e, s.storm!.damage, false);
  addEffect(state, { kind: 'bolt', x: first.x, y: first.y, points: struck.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y) })) });
  removeDead(state);
}

function hurt(foe: Enemy, damage: number, armored: boolean) {
  foe.hp -= armored ? Math.max(1, damage - ENEMIES[foe.kind].armor) : damage;
  foe.hitMs = HIT_FLASH_MS;
}

function moveEnemies(state: GameState, s: Stats, dt: number) {
  const barricadeUp = state.barricade.hp > 0;
  const roadSpeed = roadEffects(state.road).speed;
  for (const e of state.enemies) {
    const type = ENEMIES[e.kind];
    e.hitMs = Math.max(0, e.hitMs - dt);
    if (e.burnMs > 0) {
      e.hp -= (e.burnDps * Math.min(dt, e.burnMs)) / 1000;
      e.burnMs = Math.max(0, e.burnMs - dt);
      if (e.burnMs === 0) e.burnDps = 0;
    }
    // Caltrops slow and prick every foe walking on them; flyers pass over.
    const pricked = !type.flying && onCaltrops(state, e);
    if (pricked) e.hp -= (s.damage * CALTROP_DPS * dt) / 1000;
    const pace = (e.slowMs > 0 ? 1 - e.slow : 1) * (pricked ? 1 - CALTROP_SLOW : 1) * roadSpeed;
    if (e.slowMs > 0) {
      e.slowMs = Math.max(0, e.slowMs - dt);
      if (e.slowMs === 0) e.slow = 0;
    }
    if (type.healer && e.x < VIEW_RIGHT) heal(state, e, dt);
    // Flyers go over the barricade, straight at the hero.
    const stop = (barricadeUp && !type.flying ? BARRICADE_FRONT : HERO_FRONT) + type.radius;
    // Only a foe at the barricade's face hacks at it: one that got behind it while it was down
    // (and was then repaired) keeps walking to the hero. A foe walking up oversteps the face by
    // at most one substep's walk, so that is how far behind it still counts as at the face.
    e.attacking = barricadeUp && !type.flying && e.x <= stop && e.x >= stop - (type.speed * roadSpeed * SUBSTEP_MS) / 1000;
    if (e.attacking) {
      e.x = stop;
      state.barricade.hp = Math.max(0, state.barricade.hp - (type.dps * pace * dt) / 1000);
    } else {
      e.x -= (type.speed * pace * dt) / 1000;
    }
    if (e.hp > 0 && e.x - type.radius <= HERO_FRONT) {
      gameOver(state);
      return;
    }
  }
  removeDead(state);
}

/** Whether a foe stands on a patch of caltrops. */
const onCaltrops = (state: GameState, e: Enemy) =>
  state.caltrops.patches.some(
    (p) => ((e.x - p.x) / (CALTROP_PATCH.rx + ENEMIES[e.kind].radius / 2)) ** 2 + ((e.y - p.y) / (CALTROP_PATCH.ry + ENEMIES[e.kind].radius / 2)) ** 2 <= 1,
  );

/** A shaman's healing: every HEAL_MS it mends the hurt foes around it (itself too). */
function heal(state: GameState, shaman: Enemy, dt: number) {
  shaman.castMs -= dt;
  if (shaman.castMs > 0) return;
  shaman.castMs = HEAL_MS;
  const hurtFoes = state.enemies.filter((o) => o.hp > 0 && o.hp < o.maxHp && Math.hypot(o.x - shaman.x, o.y - shaman.y) <= HEAL_RANGE);
  if (hurtFoes.length === 0) return;
  for (const o of hurtFoes) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (ENEMIES[o.kind].boss ? BOSS_HEAL_SHARE : HEAL_SHARE));
  addEffect(state, {
    kind: 'heal',
    x: shaman.x,
    y: shaman.y,
    radius: HEAL_RANGE,
    points: hurtFoes.map((o) => ({ x: Math.round(o.x), y: Math.round(o.y) })),
  });
}

/**
 * The hired guards: a spearman stabs the foe at the barricade nearest his slot, a mage throws an
 * arcane bolt at the foe nearest the barricade.
 */
function guardsAct(state: GameState, dt: number) {
  state.guards.forEach((g, i) => {
    if (!g) return;
    g.cd = Math.max(0, g.cd - dt);
    if (g.cd > 0) return;
    const slot = GUARD_SLOTS[i];
    const damage = guardDamage(g.kind, g.level);
    if (g.kind === 'spear') {
      const near = state.enemies.filter((e) => e.x - ENEMIES[e.kind].radius <= BARRICADE_FRONT + SPEAR_REACH);
      const foe = near.sort((a, b) => Math.abs(a.y - slot.y) - Math.abs(b.y - slot.y))[0];
      if (!foe) return;
      hurt(foe, damage, true);
      addEffect(state, { kind: 'stab', x: foe.x, y: foe.y, points: [{ x: slot.x + 10, y: slot.y - 30 }, { x: Math.round(foe.x), y: Math.round(foe.y) }] });
    } else {
      const foe = targets(state)[0];
      if (!foe) return;
      const from = { x: slot.x + 14, y: slot.y - 44 };
      const angle = Math.atan2(foe.y - from.y, foe.x - from.x);
      state.missiles.push({
        id: state.nextId++,
        kind: 'magic',
        x: from.x,
        y: from.y,
        vx: Math.cos(angle) * MAGIC_SPEED,
        vy: Math.sin(angle) * MAGIC_SPEED,
        target: foe.id,
        hit: [],
        pierce: 0,
        damage,
      });
    }
    g.cd = GUARDS[g.kind].ms;
  });
  removeDead(state);
}

/** Hires a guard of this kind on an empty slot, if the coins are there. Returns whether it did. */
export function hire(state: GameState, slot: number, kind: GuardKind) {
  if (state.phase === 'over' || state.choices || state.guards[slot] !== null || state.coins < GUARDS[kind].cost) return false;
  state.coins -= GUARDS[kind].cost;
  state.guards[slot] = { kind, level: 1, cd: 0 };
  return true;
}

/** Trains the guard on a slot to the next level, if the coins are there. Returns whether it did. */
export function train(state: GameState, slot: number) {
  const g = state.guards[slot];
  if (state.phase === 'over' || state.choices || !g || g.level >= MAX_GUARD_LEVEL) return false;
  const cost = trainCost(g.kind, g.level);
  if (state.coins < cost) return false;
  state.coins -= cost;
  g.level++;
  return true;
}

function removeDead(state: GameState) {
  const dead = state.enemies.filter((e) => e.hp <= 0);
  if (dead.length === 0) return;
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  for (const e of dead) {
    const s = stats(state);
    state.kills++;
    const road = roadEffects(state.road);
    state.coins += ENEMIES[e.kind].coins * road.coins;
    // Each kill charges Arrow Rain and the caltrops and carries the streak on (or starts a new one).
    state.rain.charge = Math.min(state.rain.need, state.rain.charge + 1);
    state.caltrops.charge = Math.min(state.caltrops.need, state.caltrops.charge + 1);
    const streak = state.streak;
    streak.count = streak.ms > 0 ? streak.count + 1 : 1;
    streak.ms = s.streakMs;
    streak.best = Math.max(streak.best, streak.count);
    const base = ENEMIES[e.kind].xp * s.xpGain * road.xp;
    const bonus = base * streakBonus(streak.count);
    streak.bonusXp += bonus;
    const radius = ENEMIES[e.kind].radius;
    addEffect(state, { kind: 'death', x: e.x, y: e.y, radius });
    addEffect(state, { kind: 'xp', x: e.x, y: e.y - radius * 1.6, amount: base + bonus, streak: streak.count });
    addEffect(state, { kind: 'orb', x: e.x, y: e.y - radius, amount: base + bonus });
    gainXp(state, base + bonus);
  }
}

/**
 * Looses Arrow Rain on the ring around (x, y), kept on the road in front of the barricade, once
 * kills have charged it. Returns whether it was loosed.
 */
export function loose(state: GameState, x: number, y: number) {
  if (state.phase === 'over' || state.choices || state.rain.charge < state.rain.need) return false;
  state.rain.charge = 0;
  state.rain.volleys.push({
    id: state.nextId++,
    x: Math.round(Math.min(VIEW_RIGHT - 10, Math.max(BARRICADE_FRONT + 30, x))),
    y: Math.round(Math.min(FIELD.bottom, Math.max(FIELD.top, y))),
    ms: RAIN_FALL_MS,
  });
  return true;
}

/**
 * Strews caltrops over the patch around (x, y), kept on the road in front of the barricade, once
 * kills have charged them. Returns whether they were dropped.
 */
export function strew(state: GameState, x: number, y: number) {
  const c = state.caltrops;
  if (state.phase === 'over' || state.choices || c.charge < c.need) return false;
  c.charge = 0;
  c.patches.push({
    id: state.nextId++,
    x: Math.round(Math.min(VIEW_RIGHT - 10, Math.max(BARRICADE_FRONT + 30, x))),
    y: Math.round(Math.min(FIELD.bottom, Math.max(FIELD.top, y))),
    ms: CALTROP_MS,
  });
  return true;
}

/** Whether a foe at (x, y) with this radius stands in the Arrow Rain ring around (cx, cy). */
export const inRing = (cx: number, cy: number, x: number, y: number, radius: number) =>
  ((x - cx) / (RAIN_RING.rx + radius / 2)) ** 2 + ((y - cy) / (RAIN_RING.ry + radius / 2)) ** 2 <= 1;

/** Where Arrow Rain hits the most foes in view: on the one with the most others in its ring. */
export function crowdSpot(state: GameState) {
  const foes = targets(state);
  if (foes.length === 0) return null;
  const crowd = (e: Enemy) => foes.filter((o) => inRing(e.x, e.y, o.x, o.y, ENEMIES[o.kind].radius)).length;
  const best = foes.reduce((a, e) => (crowd(e) > crowd(a) ? e : a), foes[0]);
  return { x: best.x, y: best.y };
}

/** Brings Arrow Rain volleys down: each hurts every foe in its ring when it lands. */
function landVolleys(state: GameState, s: Stats, dt: number) {
  const volleys = state.rain.volleys;
  if (volleys.length === 0) return;
  for (const v of volleys) {
    v.ms -= dt;
    if (v.ms > 0) continue;
    addEffect(state, { kind: 'rain', x: v.x, y: v.y });
    for (const e of state.enemies) {
      if (inRing(v.x, v.y, e.x, e.y, ENEMIES[e.kind].radius)) hurt(e, s.damage * s.rainDamage, true);
    }
  }
  state.rain.volleys = volleys.filter((v) => v.ms > 0);
  removeDead(state);
}

function gainXp(state: GameState, xp: number) {
  state.xp += xp;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level++;
    state.levelUps++;
  }
  if (state.levelUps > 0 && !state.choices) offer(state);
}

/** Puts three upgrades up for the next pending level-up and starts the time to pick one. */
export function offer(state: GameState) {
  state.choices = rollChoices(state);
  state.pickMs = AUTO_PICK_MS;
}

/** Three different upgrades to choose from, always three: fillers take the cards no upgrade is left for. */
export function rollChoices(state: GameState): UpgradeId[] {
  const pool = offerable(state);
  const picks: UpgradeId[] = [];
  while (picks.length < 3 && pool.length > 0) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  for (const filler of FILLERS) if (picks.length < 3) picks.push(filler);
  return picks;
}

/** Takes one of the offered upgrades; the battle goes on once no level-ups are left to pick. */
export function pick(state: GameState, id: UpgradeId) {
  if (!state.choices?.includes(id)) return false;
  // Fillers count too, so the skill book can show how often the barricade was mended.
  state.ranks[id] = (state.ranks[id] ?? 0) + 1;
  const barricadeMax = stats(state).barricadeMax;
  if (id === 'timber') state.barricade = { hp: barricadeMax, max: barricadeMax };
  if (id === 'mend') state.barricade.hp = Math.min(state.barricade.max, state.barricade.hp + state.barricade.max / 2);
  if (id === 'purse') state.coins += PURSE_COINS;
  if (id === 'wind') {
    state.rain.charge = state.rain.need;
    state.caltrops.charge = state.caltrops.need;
  }
  state.levelUps--;
  state.choices = null;
  if (state.levelUps > 0) offer(state);
  return true;
}

function clearWave(state: GameState) {
  state.bestWave = Math.max(state.bestWave, state.wave);
  // The relic chest at the end of the road: a lasting bonus for beating the boss (two after a
  // Hardened Road). Then the hero picks the next road from two.
  if (isBossWave(state.wave)) {
    state.relicFound = [];
    for (let i = 0; i < roadEffects(state.road).relics; i++) {
      const id = RELIC_IDS[Math.floor(Math.random() * RELIC_IDS.length)];
      state.relics[id] = (state.relics[id] ?? 0) + 1;
      state.relicFound.push(id);
    }
    const roads = [...ROAD_IDS];
    state.roadChoices = [0, 1].map(() => roads.splice(Math.floor(Math.random() * roads.length), 1)[0]);
    state.roadMs = AUTO_PICK_MS;
  }
  state.wave++;
  state.phase = 'break';
  state.breakMs = BREAK_MS;
  state.missiles = [];
  // An Oakheart Charm from the chest makes the barricade bigger at once.
  const s = stats(state);
  const max = s.barricadeMax;
  if (max > state.barricade.max) state.barricade = { hp: state.barricade.hp + max - state.barricade.max, max };
  state.barricade.hp = Math.min(state.barricade.max, state.barricade.hp + state.barricade.max * s.repair);
}

/** Takes one of the two roads offered after a boss; the break then counts down to its first wave. */
export function pickRoad(state: GameState, road: RoadId) {
  if (!state.roadChoices?.includes(road)) return false;
  state.road = road;
  state.roadChoices = null;
  state.breakMs = BREAK_MS;
  return true;
}

function gameOver(state: GameState) {
  state.phase = 'over';
  state.runs++;
  state.missiles = [];
}

/** After a fall, a new run from wave 1 with the hero's level and upgrades kept. */
export function fightAgain(state: GameState): GameState {
  const next = newRun(progressOf(state));
  if (next.levelUps > 0) {
    // The same cards stay up, with the full time to pick again.
    next.choices = state.choices ?? rollChoices(next);
    next.pickMs = AUTO_PICK_MS;
  }
  return next;
}

function nearest(foes: Enemy[], x: number, y: number) {
  let best: Enemy | undefined;
  let bestD = Infinity;
  for (const e of foes) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bestD) [best, bestD] = [e, d];
  }
  return best;
}

function addEffect(state: GameState, e: Omit<Effect, 'id' | 'ms' | 'total'>) {
  const total = EFFECT_MS[e.kind];
  state.effects.push({ ...e, id: state.nextId++, ms: total, total });
}

function ageEffects(state: GameState, dt: number) {
  for (const e of state.effects) e.ms -= dt;
  state.effects = state.effects.filter((e) => e.ms > 0);
}
