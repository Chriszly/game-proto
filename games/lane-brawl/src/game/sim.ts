// The rules of a match: movement, combat, abilities, the AI of every champion and minion, and the
// shop. Free of Phaser, so the rules can be read without the view.

import {
  ABILITY_KEYS,
  AbilityDef,
  AbilityKey,
  BASE,
  CAMP,
  CHAMP_AGGRO,
  ITEMS,
  KILL,
  MINION,
  RESPAWN_BASE_MS,
  RESPAWN_PER_LEVEL_MS,
  SHOP_RANGE,
  MAX_LEVEL,
  TOWER,
  Vec,
  WORLD,
  XP_RANGE,
  GOLD_PER_SEC,
  SIDE_COLOR,
  CAMPS,
  LAST_HIT_LOOK,
  OBJECTIVES,
  OBJECTIVE_GAP_MS,
  SIEGE,
  STREAK,
  TOWERS,
  UPGRADES,
  upgradeById,
} from './data';
import { GameState, Unit, dist, getUnit, levelFor, refreshStats, spawnWave } from './state';

/** How long a shield lasts, in ms. */
const SHIELD_MS = 3000;

/** Advances the match by `dt` ms of game time. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'playing') return;
  s.time += dt;
  if (s.time >= s.nextWave) spawnWave(s);
  for (const u of [...s.units]) updateUnit(s, u, dt);
  updateProjectiles(s, dt);
  // Dead minions are gone for good; their slots are cleaned up here.
  s.units = s.units.filter((u) => !(u.dead && u.kind === 'minion'));
  if (s.phase !== 'playing') return;
  updateObjective(s);
  updateLastHitMark(s);
}

/** An ability as the champion casts it now: its definition with the upgrades it chose applied. */
export function abilityFor(u: Unit, key: AbilityKey): AbilityDef | undefined {
  const base = u.champ?.abilities.find((a) => a.key === key);
  if (!base || u.upgrades.length === 0) return base;
  const ab: AbilityDef = { ...base };
  const pct = (v: number | undefined, p: number | undefined) => (v === undefined || !p ? v : v * (1 + p / 100));
  for (const id of u.upgrades) {
    const up = upgradeById(id);
    if (!up || up.key !== key) continue;
    ab.radius = pct(ab.radius, up.radius);
    ab.damage = pct(ab.damage, up.damage);
    ab.heal = pct(ab.heal, up.heal);
    ab.shield = pct(ab.shield, up.shield);
    ab.range = pct(ab.range, up.range) ?? ab.range;
    if (up.cd) ab.cd *= 1 + up.cd / 100;
    if (up.stun) ab.stun = (ab.stun ?? 0) + up.stun;
    if (up.slow) ab.slow = Math.max(ab.slow ?? 0, up.slow);
    if (up.count) ab.count = (ab.count ?? 1) + up.count;
  }
  return ab;
}

/** The player keeps one of the two upgrades on offer (0 or 1). Returns false if none is on offer. */
export function chooseUpgrade(s: GameState, choice: number): boolean {
  const p = getUnit(s, s.player);
  const offer = s.upgradeOffers[0];
  if (!p || !offer || (choice !== 0 && choice !== 1)) return false;
  p.upgrades.push(offer.options[choice]);
  s.upgradeOffers.shift();
  return true;
}

/** Starts the next objective when it is due, and settles the current one when it is done or late. */
function updateObjective(s: GameState) {
  const o = s.objective;
  if (o) {
    const t = getUnit(s, o.target);
    const done = !t || t.dead;
    if (!done && s.time < o.endsAt) return;
    const p = getUnit(s, s.player);
    if (done && p) {
      p.gold += o.gold;
      if (o.banner === 'siege') s.siegeUntil = s.time + SIEGE.ms;
      s.objectivesDone++;
      if (t) s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 80, color: '#f2c14e', ms: 700 });
    }
    s.lastObjective = { title: o.title, done, gold: o.gold, at: s.time };
    s.objective = null;
    s.nextObjectiveAt = s.time + OBJECTIVE_GAP_MS;
    return;
  }
  if (s.time < s.nextObjectiveAt) return;
  const p = getUnit(s, s.player);
  const from = p && !p.dead ? p : BASE.blue;
  for (let n = 0; n < OBJECTIVES.length; n++) {
    const def = OBJECTIVES[(s.objectiveIndex + n) % OBJECTIVES.length];
    let target: Unit | null = null;
    let title = '';
    if (def.kind === 'tower') {
      // The red tower closest to the blue Nexus: the next one in the way.
      target = closest(s.units.filter((u) => u.kind === 'tower' && u.side === 'red' && !u.dead), BASE.blue);
      const spot = target && TOWERS.find((t) => t.x === target!.x && t.y === target!.y);
      title = `Topple the red ${spot ? spot.lane : ''} tower`.replace('  ', ' ');
    } else if (def.kind === 'camp') {
      target = closest(s.units.filter((u) => u.kind === 'camp' && !u.dead && CAMPS.some((c) => c.x === u.spawnX && c.y === u.spawnY)), from);
      title = 'Clear the jungle camp';
    } else {
      target = closest(s.units.filter((u) => u.kind === 'champion' && u.side === 'red' && !u.dead), from);
      title = `Defeat the red ${target?.champ?.name ?? 'champion'}`;
    }
    if (!target) continue;
    s.objective = { kind: def.kind, target: target.id, title, gold: def.gold, banner: def.banner ?? null, startAt: s.time, endsAt: s.time + def.ms };
    s.objectiveIndex = (s.objectiveIndex + n + 1) % OBJECTIVES.length;
    return;
  }
  s.nextObjectiveAt = s.time + OBJECTIVE_GAP_MS;
}

function closest(units: Unit[], to: Vec): Unit | null {
  let best: Unit | null = null;
  for (const u of units) if (!best || dist(u, to) < dist(best, to)) best = u;
  return best;
}

/** Marks the nearest enemy minion near the player that the player's next hit would kill. */
function updateLastHitMark(s: GameState) {
  s.lastHitMark = null;
  const p = getUnit(s, s.player);
  if (!p || p.dead) return;
  let bestD = Infinity;
  for (const e of s.units) {
    if (e.dead || e.kind !== 'minion' || e.side === p.side) continue;
    const d = dist(p, e) - e.radius;
    if (d > p.range + LAST_HIT_LOOK || d >= bestD) continue;
    const hit = (p.dmg * 100) / (100 + e.armor);
    if (e.hp + e.shield > hit) continue;
    s.lastHitMark = e.id;
    bestD = d;
  }
}

/** Sends a player's champion to a point on the ground. */
export function commandMove(s: GameState, point: Vec) {
  const p = getUnit(s, s.player);
  if (!p || p.dead) return;
  p.moveTo = { x: clampWorld(point).x, y: clampWorld(point).y };
  p.target = null;
}

/** Sends a player's champion to attack an enemy unit. */
export function commandAttack(s: GameState, id: number) {
  const p = getUnit(s, s.player);
  if (!p || p.dead) return;
  p.target = id;
  p.moveTo = null;
}

/** Buys an item for a champion that stands near its Nexus. */
export function buy(u: Unit, id: string): boolean {
  const item = ITEMS.find((i) => i.id === id);
  if (!item || u.dead || u.side === 'neutral' || u.items.includes(id) || u.gold < item.cost) return false;
  if (dist(u, BASE[u.side]) > SHOP_RANGE) return false;
  u.gold -= item.cost;
  u.items.push(id);
  refreshStats(u);
  return true;
}

/** Casts an ability at a point. Returns false if it is not ready or not yet learned. */
export function cast(s: GameState, caster: Unit, key: AbilityKey, aim: Vec): boolean {
  if (s.phase !== 'playing' || caster.dead || !caster.champ) return false;
  const ab = abilityFor(caster, key);
  if (!ab || caster.level < ab.level || caster.cds[key] > 0) return false;
  caster.cds[key] = ab.cd * (1 - caster.cdr / 100);
  caster.castMs = 300;
  if (dist(caster, aim) > 1) caster.facing = Math.atan2(aim.y - caster.y, aim.x - caster.x);
  const color = caster.champ.color;

  switch (ab.kind) {
    case 'burst': {
      const c = ab.range > 0 ? towards(caster, aim, ab.range) : { x: caster.x, y: caster.y };
      const r = ab.radius ?? 0;
      s.fx.push({ kind: 'ring', x: c.x, y: c.y, r, color, ms: 350 });
      for (const e of s.units) {
        if (e.dead || e.side === caster.side || dist(e, c) > r + e.radius) continue;
        if (ab.damage) damage(s, e, dealt(s, caster, ab.damage), caster.id);
        if (ab.slow && (e.kind === 'champion' || e.kind === 'minion')) e.slowMs = Math.max(e.slowMs, ab.slow);
        if (ab.stun && (e.kind === 'champion' || e.kind === 'minion')) e.stunMs = Math.max(e.stunMs, ab.stun);
      }
      break;
    }
    case 'bolt': {
      const d = Math.max(dist(caster, aim), 1);
      const dir = { x: (aim.x - caster.x) / d, y: (aim.y - caster.y) / d };
      const count = ab.count ?? 1;
      const spread = ab.spread ?? 0;
      const speed = (ab.speed ?? 700) / 1000;
      for (let i = 0; i < count; i++) {
        const a = (i - (count - 1) / 2) * spread;
        const vx = Math.cos(a) * dir.x - Math.sin(a) * dir.y;
        const vy = Math.sin(a) * dir.x + Math.cos(a) * dir.y;
        s.projectiles.push({
          x: caster.x,
          y: caster.y,
          vx: vx * speed,
          vy: vy * speed,
          left: ab.range,
          side: caster.side,
          owner: caster.id,
          damage: dealt(s, caster, ab.damage ?? 0),
          width: ab.width ?? 24,
          pierce: !!ab.pierce,
          hit: [],
          color,
          stun: ab.stun ?? 0,
        });
      }
      break;
    }
    case 'dash': {
      const from = { x: caster.x, y: caster.y };
      const to = towards(caster, aim, ab.range);
      s.fx.push({ kind: 'line', x: from.x, y: from.y, x2: to.x, y2: to.y, color, ms: 250 });
      caster.x = to.x;
      caster.y = to.y;
      if (ab.damage) {
        for (const e of s.units) {
          if (e.dead || e.side === caster.side || dist(e, to) > (ab.radius ?? 0) + e.radius) continue;
          damage(s, e, dealt(s, caster, ab.damage), caster.id);
        }
      }
      break;
    }
    case 'ally': {
      const c = towards(caster, aim, ab.range);
      const r = ab.radius ?? 0;
      s.fx.push({ kind: 'ring', x: c.x, y: c.y, r, color: '#9af0b0', ms: 400 });
      for (const e of s.units) {
        if (e.dead || e.kind !== 'champion' || e.side !== caster.side || dist(e, c) > r + e.radius) continue;
        if (ab.heal) e.hp = Math.min(e.maxHp, e.hp + ab.heal);
        if (ab.shield) {
          e.shield += ab.shield;
          e.shieldMs = SHIELD_MS;
        }
      }
      break;
    }
  }
  return true;
}

/** Hurts a unit after its armor and any shield. A unit reduced to 0 health dies. */
export function damage(s: GameState, t: Unit, amount: number, sourceId: number) {
  if (t.dead || amount <= 0) return;
  // The siege banner, an objective's reward, makes the player's champion hit structures harder.
  if (sourceId === s.player && s.time < s.siegeUntil && (t.kind === 'tower' || t.kind === 'nexus')) amount *= SIEGE.mult;
  let rest = (amount * 100) / (100 + t.armor);
  if (t.shield > 0) {
    const soak = Math.min(t.shield, rest);
    t.shield -= soak;
    rest -= soak;
  }
  t.hp -= rest;
  t.flash = 120;
  t.lastHitBy = sourceId;
  if (t.hp <= 0) kill(s, t, sourceId);
}

/** Red's units hit harder or softer on Hard and Easy. */
function dealt(s: GameState, u: Unit, amount: number): number {
  return u.side === 'red' ? amount * s.enemyDamage : amount;
}

function updateUnit(s: GameState, u: Unit, dt: number) {
  if (u.dead) {
    if ((u.kind === 'champion' || u.kind === 'camp') && s.time >= u.respawnAt) revive(u);
    return;
  }
  u.attackCd = Math.max(0, u.attackCd - dt);
  u.swing = Math.max(0, u.swing - dt);
  u.flash = Math.max(0, u.flash - dt);
  u.slowMs = Math.max(0, u.slowMs - dt);
  u.castMs = Math.max(0, u.castMs - dt);
  u.stunMs = Math.max(0, u.stunMs - dt);
  if (u.shieldMs > 0) {
    u.shieldMs -= dt;
    if (u.shieldMs <= 0) u.shield = 0;
  }
  if (u.champ) {
    for (const k of ABILITY_KEYS) u.cds[k] = Math.max(0, u.cds[k] - dt);
    u.gold += (GOLD_PER_SEC * dt) / 1000;
  }
  // A stunned champion or minion stands still and holds its attack.
  if (u.stunMs > 0) return;
  switch (u.kind) {
    case 'nexus':
      return;
    case 'tower': {
      if (u.attackCd > 0) return;
      const foe = nearest(s, u, u.range, (e) => e.kind === 'champion') ?? nearest(s, u, u.range, (e) => e.kind === 'minion');
      if (foe) attack(s, u, foe);
      return;
    }
    case 'camp': {
      const who = getUnit(s, u.lastHitBy);
      if (!who || who.dead || dist(u, who) > 500) {
        u.lastHitBy = null;
        return;
      }
      if (inRange(u, who)) attack(s, u, who);
      return;
    }
  }
  if (u.player) return playerAct(s, u, dt);
  aiAct(s, u, dt);
}

function revive(u: Unit) {
  u.dead = false;
  u.hp = u.maxHp;
  u.x = u.spawnX;
  u.y = u.spawnY;
  u.target = null;
  u.moveTo = null;
  u.slowMs = 0;
  u.stunMs = 0;
  u.shield = 0;
  u.lastHitBy = null;
  if (u.path) u.wp = 1;
}

function kill(s: GameState, t: Unit, killerId: number) {
  t.hp = 0;
  t.dead = true;
  t.target = null;
  t.moveTo = null;
  const killer = getUnit(s, killerId);
  const champKiller = killer && killer.kind === 'champion' ? killer : null;
  switch (t.kind) {
    case 'minion':
      if (champKiller && champKiller.player) {
        // A last hit by the player: the streak grows, and a long one pays more.
        s.streak++;
        s.lastHits++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        const gold = Math.round(MINION.gold * (s.streak >= STREAK.at ? 1 + STREAK.bonus : 1));
        champKiller.gold += gold;
        s.fx.push({ kind: 'coin', x: t.x, y: t.y, gold, color: '#f2c14e', ms: 900 });
      } else {
        if (champKiller) champKiller.gold += MINION.gold;
        // The minion the player could have finished fell to someone else: the streak breaks.
        if (s.lastHitMark === t.id) s.streak = 0;
      }
      for (const c of s.units) {
        if (c.kind === 'champion' && !c.dead && c.side !== t.side && c.side !== 'neutral' && dist(c, t) <= XP_RANGE) {
          gainXp(s, c, MINION.xp);
        }
      }
      break;
    case 'camp':
      t.respawnAt = s.time + CAMP.respawnMs;
      if (champKiller) {
        champKiller.gold += CAMP.gold;
        gainXp(s, champKiller, CAMP.xp);
      }
      break;
    case 'tower':
      if (champKiller) champKiller.gold += TOWER.gold;
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 60, color: SIDE_COLOR[t.side], ms: 600 });
      break;
    case 'nexus':
      s.phase = t.side === 'blue' ? 'lost' : 'won';
      s.winner = t.side === 'blue' ? 'red' : 'blue';
      break;
    case 'champion':
      if (champKiller && champKiller.side !== t.side) {
        champKiller.gold += KILL.gold;
        gainXp(s, champKiller, KILL.xp);
      }
      t.respawnAt = s.time + RESPAWN_BASE_MS + t.level * RESPAWN_PER_LEVEL_MS;
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 50, color: SIDE_COLOR[t.side], ms: 500 });
      break;
  }
}

function gainXp(s: GameState, c: Unit, amount: number) {
  c.xp += amount;
  const level = Math.min(levelFor(c.xp), MAX_LEVEL);
  if (level > c.level) {
    if (c.player && c.champ) {
      for (let l = c.level + 1; l <= level; l++) {
        const pair = UPGRADES[c.champ.id]?.[l - 2];
        if (pair) s.upgradeOffers.push({ level: l, options: [pair[0].id, pair[1].id] });
      }
    }
    c.level = level;
    refreshStats(c);
    s.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 40, color: '#ffffff', ms: 500 });
  }
}

/** Plays a player's champion: walk to a point, attack a clicked unit, or hit whatever is in reach. */
function playerAct(s: GameState, u: Unit, dt: number) {
  if (u.moveTo) {
    if (dist(u, u.moveTo) < 4) u.moveTo = null;
    else {
      moveToward(u, u.moveTo, dt);
      return;
    }
  }
  const t = getUnit(s, u.target);
  if (t && !t.dead && t.side !== u.side) {
    if (inRange(u, t)) attack(s, u, t);
    else moveToward(u, t, dt);
    return;
  }
  u.target = null;
  const near = nearest(s, u, u.range, (e) => e.kind !== 'camp');
  if (near) attack(s, u, near);
}

/** The AI for allies, enemies and minions: fight what is in reach, otherwise walk the lane. */
function aiAct(s: GameState, u: Unit, dt: number) {
  const base = u.side === 'neutral' ? u : BASE[u.side];
  const reach = u.kind === 'champion' ? CHAMP_AGGRO : MINION.aggro;
  if (u.kind === 'champion' && u.hp < u.maxHp * 0.25 && nearest(s, u, CHAMP_AGGRO, (e) => e.kind === 'champion')) {
    u.target = null;
    moveToward(u, base, dt);
    return;
  }
  const t =
    nearest(s, u, reach, (e) => e.kind === 'champion') ??
    nearest(s, u, reach, (e) => e.kind === 'minion') ??
    nearest(s, u, u.range, (e) => e.kind === 'tower' || e.kind === 'nexus');
  u.target = t ? t.id : null;
  if (t && u.kind === 'champion') castAi(s, u, t);
  if (t) {
    if (inRange(u, t)) attack(s, u, t);
    else moveToward(u, t, dt);
    return;
  }
  moveToward(u, nextWaypoint(u), dt);
}

/** An AI champion uses an ability when it has a clear use for it. */
function castAi(s: GameState, u: Unit, t: Unit) {
  for (const ab of u.champ!.abilities) {
    if (u.cds[ab.key] > 0 || u.level < ab.level) continue;
    const aim = aimFor(s, u, t, ab);
    if (aim && cast(s, u, ab.key, aim)) return;
  }
}

function aimFor(s: GameState, u: Unit, t: Unit, ab: AbilityDef): Vec | null {
  const d = Math.max(dist(u, t), 1);
  switch (ab.kind) {
    case 'ally': {
      const allies = s.units.filter((a) => a.kind === 'champion' && !a.dead && a.side === u.side && dist(a, u) <= ab.range + (ab.radius ?? 0));
      const low = allies.reduce<Unit | null>((best, a) => (!best || a.hp / a.maxHp < best.hp / best.maxHp ? a : best), null);
      if (low && (low.hp < low.maxHp * 0.8 || (t.kind === 'champion' && dist(t, u) < 400))) return { x: low.x, y: low.y };
      return null;
    }
    case 'burst':
      if (ab.range === 0) return dist(t, u) - t.radius <= (ab.radius ?? 0) * 0.8 ? { x: t.x, y: t.y } : null;
      return dist(t, u) <= ab.range ? { x: t.x, y: t.y } : null;
    case 'bolt':
      return dist(t, u) - t.radius <= ab.range ? { x: t.x, y: t.y } : null;
    case 'dash':
      if (ab.damage) {
        return t.kind === 'champion' && dist(t, u) - t.radius <= ab.range + 80 && dist(t, u) > u.range ? { x: t.x, y: t.y } : null;
      }
      // A blink with no damage is an escape: it takes the caster away from the enemy.
      return u.hp < u.maxHp * 0.4 && d < 300 ? clampWorld({ x: u.x + ((u.x - t.x) / d) * ab.range, y: u.y + ((u.y - t.y) / d) * ab.range }) : null;
  }
  return null;
}

function attack(s: GameState, u: Unit, t: Unit) {
  if (u.attackCd > 0 || t.dead) return;
  u.attackCd = u.attackMs;
  u.swing = 180;
  u.facing = Math.atan2(t.y - u.y, t.x - u.x);
  if (u.range > 80) {
    s.fx.push({ kind: 'line', x: u.x, y: u.y, x2: t.x, y2: t.y, color: SIDE_COLOR[u.side], ms: 160 });
    s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 10, color: '#ffffff', ms: 120 });
  } else {
    s.fx.push({ kind: 'arc', x: u.x, y: u.y, r: u.radius + 14, a: u.facing, color: '#ffffff', ms: 180 });
    s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 12, color: '#ffffff', ms: 120 });
  }
  damage(s, t, dealt(s, u, u.dmg), u.id);
}

/** Whether `u` is close enough to `t` to hit it. Distances count from the edge of the target. */
function inRange(u: Unit, t: Unit): boolean {
  return dist(u, t) - t.radius <= u.range;
}

/** The nearest unit an enemy of `u` within `within` pixels of its edge, passing `filter`. */
function nearest(s: GameState, u: Unit, within: number, filter: (e: Unit) => boolean): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const e of s.units) {
    if (e.dead || e.side === u.side || !filter(e)) continue;
    const d = dist(u, e) - e.radius;
    if (d <= within && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function moveToward(u: Unit, goal: Vec, dt: number) {
  const d = dist(u, goal);
  if (d < 0.5) return;
  const speed = u.speed * (u.slowMs > 0 ? 0.5 : 1);
  const step = Math.min(d, (speed * dt) / 1000);
  u.x += ((goal.x - u.x) / d) * step;
  u.y += ((goal.y - u.y) / d) * step;
  u.walk += step;
  u.facing = Math.atan2(goal.y - u.y, goal.x - u.x);
}

/** The next point on a lane walk; the last point is the enemy Nexus. */
function nextWaypoint(u: Unit): Vec {
  if (!u.path) return u;
  while (u.wp < u.path.length - 1 && dist(u, u.path[u.wp]) < 14) u.wp++;
  return u.path[u.wp];
}

/** `aim`, or the point along the way to it that is `range` pixels from `from`. */
function towards(from: Vec, aim: Vec, range: number): Vec {
  const d = dist(from, aim);
  if (d <= range || d === 0) return clampWorld(aim);
  return clampWorld({ x: from.x + ((aim.x - from.x) * range) / d, y: from.y + ((aim.y - from.y) * range) / d });
}

function clampWorld(p: Vec): Vec {
  return { x: Math.min(WORLD.w, Math.max(0, p.x)), y: Math.min(WORLD.h, Math.max(0, p.y)) };
}

function updateProjectiles(s: GameState, dt: number) {
  for (const p of s.projectiles) {
    const step = Math.hypot(p.vx, p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.left -= step;
    for (const e of s.units) {
      if (e.dead || e.side === p.side || p.hit.includes(e.id)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > p.width + e.radius) continue;
      p.hit.push(e.id);
      if (p.stun && (e.kind === 'champion' || e.kind === 'minion')) e.stunMs = Math.max(e.stunMs, p.stun);
      damage(s, e, p.damage, p.owner);
      if (!p.pierce) {
        p.left = 0;
        break;
      }
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.left > 0);
}
