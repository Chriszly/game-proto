import { ENEMIES } from './enemies';
import {
  BOW,
  FIELD,
  SPAWN_X,
  TOWER_FRONT,
  WALL_FRONT,
  offerable,
  progressOf,
  newRun,
  stats,
  xpToNext,
  type Effect,
  type Enemy,
  type GameState,
  type Stats,
} from './state';
import { UPGRADES, type UpgradeId } from './upgrades';
import { BREAK_MS, bossBars, foeHp, spawnInterval, waveFoes } from './waves';

// The rules of a run, in plain TypeScript: `tick` moves the battle on, `pick` takes an upgrade.

/** Longest step simulated at once, so fast arrows can't skip past a foe. */
const SUBSTEP_MS = 16;
export const ARROW_SPEED = 720;
const FIREBALL_SPEED = 400;
/** How far lightning leaps from one foe to the next. */
const LEAP_RANGE = 170;
/** How much of its health the wall gets back after each wave cleared. */
const WALL_REPAIR = 0.1;
const HIT_FLASH_MS = 90;
/** Foes are shot once their middle has come into the 960px view. */
const VIEW_RIGHT = 950;
/** How long each kind of effect plays, in milliseconds. */
const EFFECT_MS = { blast: 260, fireblast: 360, bolt: 220, death: 320, crit: 400 } as const;

export function tick(state: GameState, ms: number) {
  // The battle waits while the hero picks an upgrade, and once the run is over.
  while (ms > 0 && !state.choices && state.phase !== 'over') {
    const dt = Math.min(ms, SUBSTEP_MS);
    step(state, dt);
    ms -= dt;
  }
  // Effects still play out while the battle waits.
  if (ms > 0) ageEffects(state, ms);
}

function step(state: GameState, dt: number) {
  const s = stats(state);
  ageEffects(state, dt);
  if (state.phase === 'break') {
    state.breakMs -= dt;
    if (state.breakMs <= 0) {
      state.phase = 'fighting';
      state.toSpawn = waveFoes(state.wave);
      state.spawnMs = 0;
    }
  } else {
    spawn(state, dt);
  }
  shoot(state, s, dt);
  moveMissiles(state, s, dt);
  moveEnemies(state, dt);
  if (state.phase === 'fighting' && state.toSpawn.length === 0 && state.enemies.length === 0) clearWave(state);
}

function spawn(state: GameState, dt: number) {
  state.spawnMs -= dt;
  if (state.spawnMs > 0 || state.toSpawn.length === 0) return;
  const kind = state.toSpawn.shift()!;
  const type = ENEMIES[kind];
  const hp = foeHp(kind, state.wave);
  // Bosses walk down the middle of the field, the rest anywhere on it.
  const margin = type.radius / 2;
  const y = type.boss
    ? (FIELD.top + FIELD.bottom) / 2
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
  });
  state.spawnMs = spawnInterval(state.wave);
}

/** Foes that have come into view, nearest to the wall first: the ones to shoot. */
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
    const speed = m.kind === 'arrow' ? ARROW_SPEED : FIREBALL_SPEED;
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
    arrowHit(state, s, struck, m.x, m.y);
    m.hit.push(struck.id);
    if (m.pierce > 0) {
      m.pierce--;
      const next = nearest(state.enemies.filter((e) => !m.hit.includes(e.id) && e.x > m.x - 20), m.x, m.y);
      m.target = next?.id ?? null;
    } else gone.add(m.id);
  }
  state.missiles = state.missiles.filter((m) => !gone.has(m.id));
  removeDead(state);
}

function arrowHit(state: GameState, s: Stats, foe: Enemy, x: number, y: number) {
  const crit = Math.random() < s.critChance;
  const damage = s.damage * (crit ? 2 : 1);
  hurt(foe, damage, true);
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

/** Lightning strikes the foe nearest the wall and leaps on to the nearest foe it has not struck. */
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

function moveEnemies(state: GameState, dt: number) {
  const wallUp = state.wall.hp > 0;
  for (const e of state.enemies) {
    const type = ENEMIES[e.kind];
    e.hitMs = Math.max(0, e.hitMs - dt);
    if (e.burnMs > 0) {
      e.hp -= (e.burnDps * Math.min(dt, e.burnMs)) / 1000;
      e.burnMs = Math.max(0, e.burnMs - dt);
      if (e.burnMs === 0) e.burnDps = 0;
    }
    const pace = e.slowMs > 0 ? 1 - e.slow : 1;
    if (e.slowMs > 0) {
      e.slowMs = Math.max(0, e.slowMs - dt);
      if (e.slowMs === 0) e.slow = 0;
    }
    const stop = (wallUp ? WALL_FRONT : TOWER_FRONT) + type.radius;
    e.attacking = wallUp && e.x <= stop;
    if (e.attacking) {
      e.x = stop;
      state.wall.hp = Math.max(0, state.wall.hp - (type.dps * pace * dt) / 1000);
    } else {
      e.x -= (type.speed * pace * dt) / 1000;
    }
    if (!wallUp && e.x - type.radius <= TOWER_FRONT) {
      gameOver(state);
      return;
    }
  }
  removeDead(state);
}

function removeDead(state: GameState) {
  const dead = state.enemies.filter((e) => e.hp <= 0);
  if (dead.length === 0) return;
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  for (const e of dead) {
    state.kills++;
    addEffect(state, { kind: 'death', x: e.x, y: e.y, radius: ENEMIES[e.kind].radius });
    gainXp(state, ENEMIES[e.kind].xp * stats(state).xpGain);
  }
}

function gainXp(state: GameState, xp: number) {
  state.xp += xp;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level++;
    state.levelUps++;
  }
  if (state.levelUps > 0 && !state.choices) state.choices = rollChoices(state);
}

/** Three different upgrades to choose from, with fillers once fewer than three are left. */
export function rollChoices(state: GameState): UpgradeId[] {
  const pool = offerable(state);
  const picks: UpgradeId[] = [];
  while (picks.length < 3 && pool.length > 0) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  if (picks.length < 3) picks.push('mend');
  return picks;
}

/** Takes one of the offered upgrades; the battle goes on once no level-ups are left to pick. */
export function pick(state: GameState, id: UpgradeId) {
  if (!state.choices?.includes(id)) return false;
  if (!UPGRADES[id].filler) state.ranks[id] = (state.ranks[id] ?? 0) + 1;
  const wallMax = stats(state).wallMax;
  if (id === 'mason') state.wall = { hp: wallMax, max: wallMax };
  if (id === 'mend') state.wall.hp = Math.min(state.wall.max, state.wall.hp + state.wall.max / 2);
  state.levelUps--;
  state.choices = state.levelUps > 0 ? rollChoices(state) : null;
  return true;
}

function clearWave(state: GameState) {
  state.bestWave = Math.max(state.bestWave, state.wave);
  state.wave++;
  state.phase = 'break';
  state.breakMs = BREAK_MS;
  state.missiles = [];
  state.wall.hp = Math.min(state.wall.max, state.wall.hp + state.wall.max * WALL_REPAIR);
}

function gameOver(state: GameState) {
  state.phase = 'over';
  state.runs++;
  state.missiles = [];
}

/** After a fall, a new run from wave 1 with the hero's level and upgrades kept. */
export function fightAgain(state: GameState): GameState {
  const next = newRun(progressOf(state));
  if (next.levelUps > 0) next.choices = state.choices ?? rollChoices(next);
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
