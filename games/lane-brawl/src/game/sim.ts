// The rules of a match: movement, combat, abilities, vision, the AI of every champion and minion,
// the jungle and the shop. Free of Phaser, so the rules can be read without the view.

import {
  ABILITY_KEYS,
  AbilityDef,
  AbilityKey,
  BASE,
  BuffDef,
  BUFFS,
  CAMP_KINDS,
  CHAMP_AGGRO,
  ITEMS,
  KILL,
  MINION,
  RESPAWN_BASE_MS,
  RESPAWN_PER_LEVEL_MS,
  SHOP_RANGE,
  FOUNTAIN,
  SIGHT,
  MAX_LEVEL,
  TOWER,
  Vec,
  WORLD,
  XP_RANGE,
  GOLD_PER_SEC,
  SIDE_COLOR,
  LAST_HIT_LOOK,
  OBJECTIVES,
  OBJECTIVE_GAP_MS,
  SIEGE,
  STREAK,
  TOWERS,
  UPGRADES,
  upgradeById,
  ACTIVES,
  ActiveId,
  BEAST,
  BEAST_BUFF,
  BEAST_CONTESTERS,
  BUSH_REVEAL,
  GANK,
  INHIBITOR,
  ItemDef,
  JUNGLE,
  MAX_ITEMS,
  RETREAT,
  REVEAL_MS,
  Team,
  UpgradeDef,
  WATCH,
  bushAt,
} from './data';
import { GameState, Unit, dist, getUnit, laneNear, levelFor, refreshStats, spawnWave } from './state';
import { shortName } from './names';
import { aiLog } from '../../../../shared/watch';

const TEAMS: Team[] = ['blue', 'red'];

/** How long a shield lasts, in ms. */
const SHIELD_MS = 3000;
/** A champion that has not attacked or cast for this long lands its next attack as an ambush. */
const LULL_MS = 2000;
/** A ranged AI champion (this reach or more) backs off a melee one this close past its reach between shots. */
const KITE = { range: 300, margin: 70, minCd: 250 };
/** Ability cooldowns never get shorter than this share of their length. */
const MIN_CD = 0.55;

/** Advances the match by `dt` ms of game time. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'playing') return;
  s.time += dt;
  if (s.time >= s.nextWave) spawnWave(s);
  updateVision(s);
  updateWatchstones(s, dt);
  updateContesters(s);
  updateGanks(s);
  updateJungle(s);
  for (const u of [...s.units]) updateUnit(s, u, dt);
  updateProjectiles(s, dt);
  updateZones(s, dt);
  // Dead minions are gone for good; their slots are cleaned up here.
  s.units = s.units.filter((u) => !(u.dead && u.kind === 'minion'));
  if (s.phase !== 'playing') return;
  // Objectives are the player's errands, so a watched match runs none.
  if (!s.watch) updateObjective(s);
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
    ab.dps = pct(ab.dps, up.damage);
    ab.heal = pct(ab.heal, up.heal);
    ab.shield = pct(ab.shield, up.shield);
    ab.ms = pct(ab.ms, up.ms);
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

// ---------------------------------------------------------------------------------------------
// Stats as buffs and passives change them.

/** The sum of one field over a unit's buffs. */
function buffSum(u: Unit, key: Exclude<keyof BuffDef, 'stealth'>): number {
  let n = 0;
  for (const b of u.buffs) n += b.def[key] ?? 0;
  return n;
}

/** Whether a unit is in stealth now. */
export function stealthed(u: Unit): boolean {
  return u.buffs.some((b) => b.def.stealth);
}

function armorOf(u: Unit): number {
  return u.armor + buffSum(u, 'armor');
}

function attackMsOf(u: Unit): number {
  return u.attackMs / (1 + buffSum(u, 'atk') / 100);
}

/** Walking speed now: slowed by half, faster with a haste or a buff. */
export function speedOf(u: Unit): number {
  const haste = u.hasteMs > 0 ? (u.champ?.passive.haste ?? 0) : 0;
  return u.speed * (u.slowMs > 0 ? 0.5 : 1) * (1 + (buffSum(u, 'speed') + haste) / 100);
}

/** Gives a unit a buff, or renews it if it already has one of that id. */
export function addBuff(u: Unit, id: string, def: BuffDef, ms: number, color: string, look?: string) {
  const had = u.buffs.find((b) => b.id === id);
  if (had) {
    had.ms = Math.max(had.ms, ms);
    had.def = def;
  } else u.buffs.push({ id, ms, def, color, look });
}

/** An ability's look, which the view draws its effects, bolts, zone and buff in. */
export function lookOf(u: Unit, key: AbilityKey): string {
  return `${u.champ?.id ?? 'none'}.${key}`;
}

/** Ends a unit's stealth: attacking or casting shows it. */
function breakStealth(u: Unit) {
  if (u.buffs.some((b) => b.def.stealth)) u.buffs = u.buffs.filter((b) => !b.def.stealth);
}

// ---------------------------------------------------------------------------------------------
// Objectives and last hits.

/** Starts the next objective when it is due, and settles the current one when it is done or late. */
function updateObjective(s: GameState) {
  const o = s.objective;
  if (o) {
    const t = getUnit(s, o.target);
    // The beast only counts when blue slew it: its kill sets blue's buff (it outlasts no respawn).
    const done = (!t || t.dead) && (o.kind !== 'beast' || s.beastBuff.blue > s.time);
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
      // The nearest boar or wolf pack (its alpha) on blue's half of the jungle: the brutes are a
      // fight of their own, and red's half is red's to defend.
      target = closest(s.units.filter((u) => u.kind === 'camp' && !u.dead && (u.campKind === 'boar' || u.campKind === 'wolf') && ownHalf('blue', u)), from);
      title = `Clear the ${target?.campKind === 'wolf' ? 'wolf pack' : `${CAMP_KINDS[target?.campKind ?? 'boar'].name.toLowerCase()}`}`;
    } else if (def.kind === 'champion') {
      target = closest(s.units.filter((u) => u.kind === 'champion' && u.side === 'red' && !u.dead && !hiddenFrom(s, 'blue', u)), from);
      title = `Defeat ${target?.name ?? 'a red champion'}`;
    } else {
      const beast = getUnit(s, s.beast);
      target = beast && !beast.dead ? beast : null;
      title = 'Slay the guardian beast';
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
    const hit = ((p.dmg * (1 + buffSum(p, 'dmg') / 100) * 100) / (100 + armorOf(e))) * takenMult(s, e);
    if (e.hp + e.shield > hit) continue;
    s.lastHitMark = e.id;
    bestD = d;
  }
}

// ---------------------------------------------------------------------------------------------
// The player's commands, the shop and abilities.

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

/** What an item costs a champion: its price less the parts it builds from that the champion owns. */
export function priceFor(u: Unit, item: ItemDef): number {
  const parts = (item.from ?? []).filter((id) => u.items.includes(id));
  return item.cost - parts.reduce((n, id) => n + (ITEMS.find((i) => i.id === id)?.cost ?? 0), 0);
}

/** Buys an item for a champion that stands near its Nexus. Parts it builds from are used up. */
export function buy(u: Unit, id: string): boolean {
  const item = ITEMS.find((i) => i.id === id);
  if (!item || u.side === 'neutral' || u.items.includes(id)) return false;
  const parts = (item.from ?? []).filter((p) => u.items.includes(p));
  const price = priceFor(u, item);
  if (u.gold < price || u.items.length - parts.length >= MAX_ITEMS) return false;
  // A champion shops at its Nexus, or anywhere while it waits to respawn.
  if (!u.dead && !atShop(u)) return false;
  u.gold -= price;
  u.items = u.items.filter((i) => !parts.includes(i));
  u.items.push(id);
  refreshStats(u);
  return true;
}

/** Whether a champion stands near enough to its Nexus to shop. */
export function atShop(u: Unit): boolean {
  return u.side !== 'neutral' && dist(u, BASE[u.side]) <= SHOP_RANGE;
}

/** Whether a champion stands in its Nexus's healing ground. */
export function atFountain(u: Unit): boolean {
  return u.side !== 'neutral' && dist(u, BASE[u.side]) <= FOUNTAIN.radius;
}

/** Uses an item's active (a short dash, or a drink from the healing flask). */
export function useActive(s: GameState, u: Unit, id: ActiveId, aim: Vec): boolean {
  const def = ACTIVES.find((a) => a.id === id);
  if (!def || s.phase !== 'playing' || u.dead || u.stunMs > 0 || (u.activeCds[id] ?? 0) > 0) return false;
  if (!u.items.some((i) => ITEMS.find((d) => d.id === i)?.active === id)) return false;
  u.activeCds[id] = def.cd;
  if (id === 'dash') {
    const to = towards(u, aim, def.range ?? 0);
    s.fx.push({ kind: 'line', x: u.x, y: u.y, x2: to.x, y2: to.y, color: '#7fb6ff', ms: 250 });
    if (dist(u, to) > 1) u.facing = Math.atan2(to.y - u.y, to.x - u.x);
    u.x = to.x;
    u.y = to.y;
    u.moveTo = null;
  } else {
    u.hp = Math.min(u.maxHp, u.hp + (def.heal ?? 0));
    s.fx.push({ kind: 'ring', x: u.x, y: u.y, r: 34, color: '#62d86f', ms: 500 });
  }
  return true;
}

/** Whether a unit can be hit by attacks and abilities at all (watchstones can't). */
function hittable(e: Unit): boolean {
  return e.kind !== 'watchstone';
}

/** An ability's damage as its caster deals it: the passive's spell power, buffs and the difficulty. */
function abilityDamage(s: GameState, caster: Unit, base: number): number {
  const sp = caster.champ?.passive.spellpower ?? 0;
  return dealt(s, caster, base * (1 + sp / 100) * (1 + buffSum(caster, 'dmg') / 100));
}

/** Hurts an enemy with an ability: double damage below an execute threshold, then the stun and slow. */
function abilityHit(s: GameState, caster: Unit, e: Unit, amount: number, ab: { stun?: number; slow?: number; executeBelow?: number }) {
  if (amount > 0) damage(s, e, ab.executeBelow && e.hp < e.maxHp * ab.executeBelow ? amount * 2 : amount, caster.id);
  if (e.kind === 'champion' || e.kind === 'minion') {
    if (ab.slow) e.slowMs = Math.max(e.slowMs, ab.slow);
    if (ab.stun) e.stunMs = Math.max(e.stunMs, ab.stun);
  }
}

/** Casts an ability at a point. Returns false if it is not ready or not yet learned. */
export function cast(s: GameState, caster: Unit, key: AbilityKey, aim: Vec): boolean {
  if (s.phase !== 'playing' || caster.dead || !caster.champ || caster.stunMs > 0) return false;
  const ab = abilityFor(caster, key);
  if (!ab || caster.level < ab.level || caster.cds[key] > 0) return false;
  caster.cds[key] = ab.cd * Math.max(MIN_CD, 1 - (caster.cdr + buffSum(caster, 'cdr')) / 100);
  caster.castMs = 300;
  caster.revealMs = REVEAL_MS;
  caster.lullMs = 0;
  breakStealth(caster);
  if (dist(caster, aim) > 1) caster.facing = Math.atan2(aim.y - caster.y, aim.x - caster.x);
  const color = caster.champ.color;
  const dmg = abilityDamage(s, caster, ab.damage ?? 0);
  const look = lookOf(caster, key);
  const shot = (at: Vec, r: number) => s.fx.push({ kind: 'skill', look, x: at.x, y: at.y, x2: caster.x, y2: caster.y, r, a: caster.facing, color, ms: 600 });

  switch (ab.kind) {
    case 'burst': {
      const c = ab.range > 0 ? towards(caster, aim, ab.range) : { x: caster.x, y: caster.y };
      const r = ab.radius ?? 0;
      shot(c, r);
      for (const e of [...s.units]) {
        if (e.dead || e.side === caster.side || !hittable(e) || dist(e, c) > r + e.radius) continue;
        abilityHit(s, caster, e, dmg, ab);
        // A knock pushes champions and minions away from the centre.
        if (ab.knock && !e.dead && (e.kind === 'champion' || e.kind === 'minion')) {
          const d = Math.max(dist(e, c), 1);
          const to = clampWorld({ x: e.x + ((e.x - c.x) / d) * ab.knock, y: e.y + ((e.y - c.y) / d) * ab.knock });
          e.x = to.x;
          e.y = to.y;
        }
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
          damage: dmg,
          width: ab.width ?? 24,
          pierce: !!ab.pierce,
          hit: [],
          color,
          stun: ab.stun ?? 0,
          slow: ab.slow ?? 0,
          pull: !!ab.pull,
          executeBelow: ab.executeBelow ?? 0,
          look,
        });
      }
      shot(caster, 0);
      break;
    }
    case 'dash': {
      const to = towards(caster, aim, ab.range);
      shot(to, ab.radius ?? 0);
      caster.x = to.x;
      caster.y = to.y;
      if (ab.damage) {
        for (const e of [...s.units]) {
          if (e.dead || e.side === caster.side || !hittable(e) || dist(e, to) > (ab.radius ?? 0) + e.radius) continue;
          abilityHit(s, caster, e, dmg, ab);
        }
      }
      break;
    }
    case 'ally': {
      const c = ab.range > 0 ? towards(caster, aim, ab.range) : { x: caster.x, y: caster.y };
      const r = ab.radius ?? 0;
      shot(c, r);
      for (const e of s.units) {
        if (e.dead || e.kind !== 'champion' || e.side !== caster.side || dist(e, c) > r + e.radius) continue;
        if (ab.heal) e.hp = Math.min(e.maxHp, e.hp + ab.heal);
        if (ab.shield) {
          e.shield += ab.shield;
          e.shieldMs = Math.max(SHIELD_MS, ab.ms ?? 0);
        }
        if (ab.buff) addBuff(e, ab.name, ab.buff, ab.ms ?? SHIELD_MS, color, look);
      }
      break;
    }
    case 'buff': {
      if (ab.buff) addBuff(caster, ab.name, ab.buff, ab.ms ?? 3000, color, look);
      if (ab.heal) caster.hp = Math.min(caster.maxHp, caster.hp + ab.heal);
      if (ab.shield) {
        caster.shield += ab.shield;
        caster.shieldMs = Math.max(SHIELD_MS, ab.ms ?? 0);
      }
      shot(caster, 46);
      break;
    }
    case 'zone': {
      const c = towards(caster, aim, ab.range);
      const ms = ab.ms ?? 3000;
      s.zones.push({ x: c.x, y: c.y, r: ab.radius ?? 100, side: caster.side as Team, owner: caster.id, dps: abilityDamage(s, caster, ab.dps ?? 0), slow: ab.slow ?? 0, left: ms, ms, color, look });
      shot(c, ab.radius ?? 100);
      break;
    }
  }
  return true;
}

/** Hurts a unit after its armor and any shield. A unit reduced to 0 health dies. Returns the health it lost. */
export function damage(s: GameState, t: Unit, amount: number, sourceId: number): number {
  if (t.dead || amount <= 0 || !hittable(t) || invulnerable(s, t)) return 0;
  // A jungle camp is only hurt by a champion that goes for it or that it is already fighting:
  // splash, bursts and stray bolts from a fight near by pass it by.
  if (t.kind === 'camp') {
    const src = getUnit(s, sourceId);
    if (src && src.kind === 'champion' && src.target !== t.id && t.lastHitBy !== sourceId) return 0;
  }
  // The siege banner, an objective's reward, makes the player's champion hit structures harder.
  if (sourceId === s.player && s.time < s.siegeUntil && (t.kind === 'tower' || t.kind === 'nexus')) amount *= SIEGE.mult;
  let rest = ((amount * 100) / (100 + Math.max(0, armorOf(t)))) * takenMult(s, t);
  if (t.champ?.passive.tough) rest *= 1 - t.champ.passive.tough / 100;
  if (t.shield > 0) {
    const soak = Math.min(t.shield, rest);
    t.shield -= soak;
    rest -= soak;
  }
  const lost = Math.min(Math.max(0, t.hp), rest);
  t.hp -= rest;
  t.flash = 120;
  t.lastHitBy = sourceId;
  // Hurting a champion draws the fire of that champion's towers.
  if (t.kind === 'champion') {
    const src = getUnit(s, sourceId);
    if (src && src.kind === 'champion') src.aggroMs = TOWER.aggroMs;
  }
  // A jungle monster that is hit wakes its whole pack.
  if (t.kind === 'camp') {
    for (const m of s.units) if (m.kind === 'camp' && m.group === t.group && !m.dead && m.lastHitBy === null) m.lastHitBy = sourceId;
  }
  if (t.hp <= 0) kill(s, t, sourceId);
  return lost;
}

/** Damage a unit takes is scaled by this: minions empowered by the beast take less. */
function takenMult(s: GameState, t: Unit): number {
  return t.kind === 'minion' && t.side !== 'neutral' && s.beastBuff[t.side] > s.time ? BEAST_BUFF.taken : 1;
}

/**
 * A structure that can't be hurt yet: an inhibitor while a tower of its lane stands, a Nexus while
 * all of its inhibitors stand.
 */
export function invulnerable(s: GameState, u: Unit): boolean {
  if (u.kind === 'inhibitor') return s.units.some((t) => t.kind === 'tower' && !t.dead && t.side === u.side && t.lane === u.lane);
  if (u.kind === 'nexus') return !s.units.some((t) => t.kind === 'inhibitor' && t.dead && t.side === u.side);
  return false;
}

/** Whether a team can't see a unit this tick: in the fog, in a bush or in stealth. */
export function hiddenFrom(_s: GameState, team: Unit['side'], u: Unit): boolean {
  return team !== 'neutral' && u.hidden[team];
}

/** Red's units hit harder or softer on Hard and Easy. */
function dealt(s: GameState, u: Unit, amount: number): number {
  return u.side === 'red' ? amount * s.enemyDamage : amount;
}

// ---------------------------------------------------------------------------------------------
// Each unit's turn.

function updateUnit(s: GameState, u: Unit, dt: number) {
  if (u.kind === 'watchstone') return;
  if (u.dead) {
    if ((u.kind === 'champion' || u.kind === 'camp' || u.kind === 'beast') && s.time >= u.respawnAt) {
      revive(u);
      if (u.kind === 'beast') notice(s, 'The guardian beast has awoken', '#f2c14e');
    }
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
  if (u.buffs.length) {
    for (const b of u.buffs) b.ms -= dt;
    u.buffs = u.buffs.filter((b) => b.ms > 0);
  }
  if (u.champ) {
    for (const k of ABILITY_KEYS) u.cds[k] = Math.max(0, u.cds[k] - dt);
    for (const k of Object.keys(u.activeCds)) u.activeCds[k] = Math.max(0, u.activeCds[k] - dt);
    u.revealMs = Math.max(0, u.revealMs - dt);
    u.aggroMs = Math.max(0, u.aggroMs - dt);
    u.aiCastMs = Math.max(0, u.aiCastMs - dt);
    u.hasteMs = Math.max(0, u.hasteMs - dt);
    u.lullMs += dt;
    u.gold += (GOLD_PER_SEC * dt) / 1000;
    const p = u.champ.passive;
    const regen = (p.regen ?? 0) + buffSum(u, 'regen');
    if (regen) u.hp = Math.min(u.maxHp, u.hp + (regen * dt) / 1000);
    // Its own Nexus heals a champion that comes home.
    if (atFountain(u)) u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * FOUNTAIN.share * dt) / 1000);
    if (p.aura) {
      for (const a of s.units) {
        if (a.kind === 'champion' && !a.dead && a.side === u.side && dist(a, u) <= (p.auraRadius ?? 0)) a.hp = Math.min(a.maxHp, a.hp + (p.aura * dt) / 1000);
      }
    }
  }
  // A stunned champion or minion stands still and holds its attack.
  if (u.stunMs > 0) return;
  switch (u.kind) {
    case 'nexus':
    case 'inhibitor':
      return;
    case 'beast':
      return beastAct(s, u, dt);
    case 'tower': {
      if (u.attackCd > 0) return;
      // A tower shoots a champion who just hurt one of its own, then minions, then any champion.
      const foe =
        nearest(s, u, u.range, (e) => e.kind === 'champion' && e.aggroMs > 0) ??
        nearest(s, u, u.range, (e) => e.kind === 'minion') ??
        nearest(s, u, u.range, (e) => e.kind === 'champion');
      if (foe) attack(s, u, foe);
      return;
    }
    case 'camp': {
      const who = getUnit(s, u.lastHitBy);
      if (!who || who.dead || dist(u, who) > 500) {
        // Left alone, a monster licks its wounds.
        u.lastHitBy = null;
        u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * 0.05 * dt) / 1000);
        return;
      }
      if (who.kind !== 'champion' || !stealthed(who)) {
        u.facing = Math.atan2(who.y - u.y, who.x - u.x);
        if (inRange(u, who)) attack(s, u, who);
      }
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
  u.buffs = [];
  u.lastHitBy = null;
  u.hasteMs = 0;
  if (u.path) u.wp = 1;
}

function kill(s: GameState, t: Unit, killerId: number) {
  t.hp = 0;
  t.dead = true;
  t.target = null;
  t.moveTo = null;
  t.buffs = [];
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
    case 'camp': {
      const def = CAMP_KINDS[t.campKind ?? 'boar'];
      t.respawnAt = s.time + def.respawnMs;
      if (champKiller) {
        champKiller.gold += def.gold;
        gainXp(s, champKiller, def.xp);
        // A brute's slayer carries its buff.
        if (def.buff) {
          const b = BUFFS[def.buff];
          addBuff(champKiller, def.buff, b.buff, b.ms, b.color);
          s.fx.push({ kind: 'ring', x: champKiller.x, y: champKiller.y, r: 60, color: b.color, ms: 700 });
          if (champKiller.side === 'blue') notice(s, `${champKiller.player ? 'You take' : `${shortName(champKiller.name)} takes`} the ${b.name} buff`, b.color);
        }
      }
      break;
    }
    case 'beast':
      t.respawnAt = s.time + BEAST.respawnMs;
      if (champKiller && champKiller.side !== 'neutral') {
        const team = champKiller.side;
        s.beastBuff[team] = s.time + BEAST.buffMs;
        s.beastKills[team]++;
        champKiller.gold += BEAST.gold;
        gainXp(s, champKiller, BEAST.xp);
        const secs = Math.round(BEAST.buffMs / 1000);
        aiLog(team, `${shortName(champKiller.name)} slays the guardian beast`);
        notice(s, team === 'blue' ? `Blue slew the guardian beast: your minions are empowered for ${secs}s` : `Red slew the guardian beast: red minions are empowered for ${secs}s`, SIDE_COLOR[team]);
      }
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 90, color: '#c79bff', ms: 800 });
      break;
    case 'inhibitor': {
      if (champKiller) champKiller.gold += INHIBITOR.gold;
      const foe = t.side === 'blue' ? 'red' : 'blue';
      aiLog(foe, `breaks the ${t.lane} inhibitor`);
      notice(s, t.side === 'red' ? `Red's ${t.lane} inhibitor fell: blue super minions march ${t.lane}` : `Your ${t.lane} inhibitor fell: red super minions march ${t.lane}`, SIDE_COLOR[foe]);
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 70, color: SIDE_COLOR[t.side], ms: 700 });
      break;
    }
    case 'tower':
      if (champKiller) champKiller.gold += TOWER.gold;
      aiLog(t.side === 'blue' ? 'red' : 'blue', `takes a ${t.lane} tower`);
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 60, color: SIDE_COLOR[t.side], ms: 600 });
      break;
    case 'nexus':
      s.phase = t.side === 'blue' ? 'lost' : 'won';
      s.winner = t.side === 'blue' ? 'red' : 'blue';
      break;
    case 'champion':
      t.deaths++;
      if (champKiller && champKiller.side !== t.side) {
        champKiller.gold += KILL.gold;
        champKiller.kills++;
        gainXp(s, champKiller, KILL.xp);
        const who = champKiller.player ? 'You' : shortName(champKiller.name);
        aiLog(champKiller.side, `${shortName(champKiller.name)} slays ${shortName(t.name)}`);
        notice(s, t.player ? `${who} slew you` : `${who} slew ${shortName(t.name)}`, SIDE_COLOR[champKiller.side as Team]);
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
    for (let l = c.level + 1; l <= level && c.champ; l++) {
      const pair = UPGRADES[c.champ.id]?.[l - 2];
      if (!pair) continue;
      // The player chooses on the cards; an AI champion takes the one it rates higher.
      if (c.player) s.upgradeOffers.push({ level: l, options: [pair[0].id, pair[1].id] });
      else {
        const up = aiRate(pair[1]) > aiRate(pair[0]) ? pair[1] : pair[0];
        c.upgrades.push(up.id);
        aiLog(c.side, `${shortName(c.name)} takes ${up.name} at level ${l}`);
      }
    }
    c.level = level;
    refreshStats(c);
    s.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 40, color: '#ffffff', ms: 500 });
  }
}

/** How much an AI champion likes an upgrade: stuns and damage first, then the rest. */
function aiRate(u: UpgradeDef): number {
  return (u.damage ?? 0) + (u.heal ?? 0) + (u.shield ?? 0) + (u.stun ? 45 : 0) + (u.slow ? 25 : 0) + (u.count ? 35 : 0) + (u.radius ?? 0) * 0.8 + (u.range ?? 0) * 0.5 + (u.ms ?? 0) * 0.6 - (u.cd ?? 0);
}

function notice(s: GameState, text: string, color: string) {
  s.notices.push({ text, color, at: s.time });
  if (s.notices.length > 3) s.notices.shift();
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
  // A target that slipped into a bush or the fog is lost.
  if (t && !t.dead && t.side !== u.side && !hiddenFrom(s, u.side, t)) {
    if (inRange(u, t)) attack(s, u, t);
    else moveToward(u, t, dt);
    return;
  }
  u.target = null;
  // Standing in stealth, the player's champion waits for a click before it strikes.
  if (stealthed(u)) return;
  const near = nearest(s, u, u.range, (e) => e.kind !== 'camp' && e.kind !== 'beast');
  if (near) attack(s, u, near);
}

/** The AI for allies, enemies and minions: fight what is in reach, otherwise walk the lane. */
function aiAct(s: GameState, u: Unit, dt: number) {
  if (u.kind === 'champion' && championPlan(s, u, dt)) return;
  const reach = u.kind === 'champion' ? CHAMP_AGGRO : MINION.aggro;
  const t =
    nearest(s, u, reach, (e) => e.kind === 'champion') ??
    nearest(s, u, reach, (e) => e.kind === 'minion') ??
    nearest(s, u, u.range, (e) => e.kind === 'tower' || e.kind === 'nexus' || e.kind === 'inhibitor');
  u.target = t ? t.id : null;
  if (t && u.kind === 'champion') castAi(s, u, t);
  // A ranged champion steps back from a melee champion between its shots.
  if (t && u.kind === 'champion' && u.range >= KITE.range && t.kind === 'champion' && t.range < KITE.range && u.attackCd > KITE.minCd && dist(u, t) < t.range + KITE.margin) {
    const d = Math.max(dist(u, t), 1);
    moveToward(u, clampWorld({ x: u.x + ((u.x - t.x) / d) * 60, y: u.y + ((u.y - t.y) / d) * 60 }), dt);
    return;
  }
  if (t) {
    if (inRange(u, t)) attack(s, u, t);
    else moveToward(u, t, dt);
    return;
  }
  moveToward(u, nextWaypoint(u), dt);
}

/**
 * An AI champion's plan beyond its lane, before the lane fight: fall back with its allies when hurt
 * or outnumbered, fight over the guardian beast, roam to gang up on a weak enemy, or go into the
 * jungle for a buff or a watchstone. Returns true when the plan moved the champion this tick.
 */
function championPlan(s: GameState, u: Unit, dt: number): boolean {
  if (s.time < u.retreatUntil) {
    u.target = null;
    moveToward(u, fallbackPoint(s, u), dt);
    return true;
  }
  if (nearest(s, u, RETREAT.look, (e) => e.kind === 'champion')) {
    const foes = s.units.filter((e) => e.kind === 'champion' && !e.dead && e.side !== u.side && !hiddenFrom(s, u.side, e) && dist(e, u) <= RETREAT.look).length;
    const friends = s.units.filter((a) => a.kind === 'champion' && !a.dead && a.side === u.side && dist(a, u) <= RETREAT.look).length;
    const low = u.hp < u.maxHp * RETREAT.hp;
    const outnumbered = foes >= friends + RETREAT.outnumber;
    if (low || outnumbered) {
      // Hurt allies near by (or all of them, when outnumbered) fall back with it.
      u.retreatUntil = s.time + RETREAT.ms;
      if (outnumbered) aiLog(u.side, `${shortName(u.name)} calls a retreat, ${foes} against ${friends}`);
      for (const a of s.units) {
        if (a === u || a.kind !== 'champion' || a.player || a.dead || a.side !== u.side || dist(a, u) > RETREAT.call) continue;
        if (outnumbered || a.hp < a.maxHp * 0.5) a.retreatUntil = s.time + RETREAT.ms;
      }
      u.target = null;
      // A champion with an escape uses it on the way out.
      for (const key of ABILITY_KEYS) {
        const ab = abilityFor(u, key);
        if (!ab || u.cds[key] > 0 || u.level < ab.level) continue;
        if ((ab.kind === 'dash' && !ab.damage) || (ab.kind === 'buff' && ab.buff?.stealth)) {
          const home = fallbackPoint(s, u);
          if (cast(s, u, key, home)) break;
        }
      }
      moveToward(u, fallbackPoint(s, u), dt);
      return true;
    }
  }
  // An enemy champion in reach: the lane fight below handles it.
  if (nearest(s, u, CHAMP_AGGRO, (e) => e.kind === 'champion')) return false;
  const beast = s.contesters.includes(u.id) ? getUnit(s, s.beast) : null;
  if (beast && !beast.dead) {
    u.target = beast.id;
    castAi(s, u, beast);
    if (inRange(u, beast)) attack(s, u, beast);
    else moveToward(u, beast, dt);
    return true;
  }
  if (u.gankTarget !== null) {
    const prey = getUnit(s, u.gankTarget);
    if (!prey || prey.dead || s.time >= u.gankUntil || hiddenFrom(s, u.side, prey)) u.gankTarget = null;
    else {
      u.target = null;
      moveToward(u, prey, dt);
      return true;
    }
  }
  if (u.jungleTarget !== null) {
    const goal = getUnit(s, u.jungleTarget);
    const done = !goal || s.time >= u.jungleUntil || (goal.kind === 'camp' ? goal.dead : goal.side === u.side);
    if (done) u.jungleTarget = null;
    else if (goal.kind === 'camp') {
      // A pack fights as one: hit whichever of it is nearest, the leader last.
      const pack = s.units.filter((m) => m.kind === 'camp' && !m.dead && m.group === goal.group);
      const t = pack.sort((a, b) => dist(a, u) - dist(b, u))[0] ?? goal;
      u.target = t.id;
      castAi(s, u, t);
      if (inRange(u, t)) attack(s, u, t);
      else moveToward(u, t, dt);
      return true;
    } else {
      u.target = null;
      if (dist(u, goal) > WATCH.radius * 0.6) moveToward(u, goal, dt);
      return true;
    }
  }
  return false;
}

/** Where a falling-back champion heads: the nearest of its own towers behind it, or its Nexus. */
function fallbackPoint(s: GameState, u: Unit): Vec {
  const home = BASE[u.side as Team];
  const behind = s.units.filter((t) => t.kind === 'tower' && !t.dead && t.side === u.side && dist(t, home) < dist(u, home) - 60);
  return closest(behind, u) ?? home;
}

/** Whether an AI champion is free for a team plan: healthy, not falling back, not on another plan. */
function free(s: GameState, u: Unit, minHp: number): boolean {
  return u.kind === 'champion' && !u.player && !u.dead && u.hp >= u.maxHp * minHp && s.time >= u.retreatUntil && u.gankTarget === null && u.jungleTarget === null;
}

/** Each tick, picks the AI champions of each team that go for the beast while it is awake. */
function updateContesters(s: GameState) {
  const beast = getUnit(s, s.beast);
  if (!beast || beast.dead) {
    s.contesters = [];
    return;
  }
  const next: number[] = [];
  for (const team of TEAMS) {
    // Those already on their way stay on it until badly hurt; the nearest healthy ones fill up.
    const mine = s.contesters.map((id) => getUnit(s, id)).filter((u): u is Unit => !!u && u.side === team && free(s, u, 0.3));
    const fresh = s.units
      .filter((u) => u.side === team && free(s, u, 0.5) && !mine.includes(u))
      .sort((a, b) => dist(a, beast) - dist(b, beast) || a.id - b.id);
    next.push(...[...mine, ...fresh].slice(0, BEAST_CONTESTERS).map((u) => u.id));
  }
  s.contesters = next;
}

/** Now and then each team sends one AI champion from another lane to gang up on the weakest enemy. */
function updateGanks(s: GameState) {
  if (s.time < s.nextGank) return;
  s.nextGank = s.time + GANK.every;
  for (const team of TEAMS) {
    const prey = s.units
      .filter((u) => u.kind === 'champion' && !u.dead && u.side !== team && !hiddenFrom(s, team, u))
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)[0];
    if (!prey) continue;
    const hunter = s.units
      .filter((u) => u.side === team && free(s, u, GANK.minHp) && !s.contesters.includes(u.id) && dist(u, prey) > GANK.from)
      .sort((a, b) => dist(a, prey) - dist(b, prey) || a.id - b.id)[0];
    if (!hunter) continue;
    hunter.gankTarget = prey.id;
    hunter.gankUntil = s.time + GANK.ms;
    const lane = laneNear(prey);
    aiLog(team, `${shortName(hunter.name)} roams to the ${lane} lane after ${shortName(prey.name)}`);
    if (team === 'red') notice(s, prey.player ? `Red's ${shortName(hunter.name)} is coming for you` : `Red's ${shortName(hunter.name)} roams to the ${lane} lane`, SIDE_COLOR.red);
    else notice(s, `Your ${shortName(hunter.name)} roams to the ${lane} lane`, SIDE_COLOR.blue);
  }
}

/** Whether a point is on a team's half of the map (the river splits the halves). */
function ownHalf(team: Team, p: Vec): boolean {
  return team === 'blue' ? p.y > p.x : p.y < p.x;
}

/** Now and then each team sends one AI champion for a jungle buff on its half, or a watchstone it lacks. */
function updateJungle(s: GameState) {
  if (s.time < s.nextJungle) return;
  s.nextJungle = s.time + JUNGLE.every;
  for (const team of TEAMS) {
    const buffs = s.units.filter((u) => u.kind === 'camp' && !u.dead && (u.campKind === 'ember' || u.campKind === 'moss') && ownHalf(team, u));
    const stones = s.units.filter((u) => u.kind === 'watchstone' && u.side !== team);
    const goals = buffs.length ? buffs : stones;
    let best: { u: Unit; goal: Unit; d: number } | null = null;
    for (const u of s.units) {
      if (u.side !== team || !free(s, u, JUNGLE.minHp) || s.contesters.includes(u.id)) continue;
      for (const goal of goals) {
        const d = dist(u, goal);
        if (!best || d < best.d) best = { u, goal, d };
      }
    }
    if (!best) continue;
    best.u.jungleTarget = best.goal.id;
    best.u.jungleUntil = s.time + JUNGLE.ms;
    const goal = best.goal;
    aiLog(team, `${shortName(best.u.name)} heads into the jungle for ${goal.kind === 'camp' ? `the ${CAMP_KINDS[goal.campKind ?? 'boar'].name.toLowerCase()}` : 'a watchstone'}`);
  }
}

/** Champions standing by a watchstone take it for their team when no enemy champion stands there too. */
function updateWatchstones(s: GameState, dt: number) {
  for (const w of s.units) {
    if (w.kind !== 'watchstone') continue;
    const near = new Set<Team>();
    for (const c of s.units) if (c.kind === 'champion' && !c.dead && dist(c, w) <= WATCH.radius) near.add(c.side as Team);
    if (near.size !== 1) {
      // Nobody there drops the progress; both teams there hold it where it is.
      if (near.size === 0) w.capture = null;
      continue;
    }
    const team = [...near][0];
    if (w.side === team) {
      w.capture = null;
      continue;
    }
    if (!w.capture || w.capture.team !== team) w.capture = { team, ms: 0 };
    w.capture.ms += dt;
    if (w.capture.ms >= WATCH.captureMs) {
      w.side = team;
      w.capture = null;
      s.fx.push({ kind: 'ring', x: w.x, y: w.y, r: 90, color: SIDE_COLOR[team], ms: 700 });
      notice(s, team === 'blue' ? 'Your team took a watchstone' : 'Red took a watchstone', SIDE_COLOR[team]);
      aiLog(team, 'takes a watchstone');
    }
  }
}

/** How far a unit sees, or 0 if it gives its team no sight. */
function sightOf(u: Unit): number {
  switch (u.kind) {
    case 'champion':
    case 'minion':
    case 'tower':
    case 'inhibitor':
    case 'nexus':
      return SIGHT[u.kind];
    case 'watchstone':
      return u.side === 'neutral' ? 0 : SIGHT.watchstone;
    default:
      return 0;
  }
}

/** The units that give a team sight, with how far each sees. */
export function viewers(s: GameState, team: Team): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = [];
  for (const v of s.units) {
    if (v.dead || v.side !== team) continue;
    const r = sightOf(v);
    if (r > 0) out.push({ x: v.x, y: v.y, r });
  }
  return out;
}

/**
 * Works out what each team can't see: units outside the sight of all of its units (the fog of
 * war), champions in a bush with no enemy in or by it, and champions in stealth with no enemy right
 * next to them. Structures and watchstones are always seen.
 */
function updateVision(s: GameState) {
  for (const team of TEAMS) {
    const eyes = viewers(s, team);
    const close = s.units.filter((v) => !v.dead && v.side === team && (v.kind === 'champion' || v.kind === 'minion' || v.kind === 'tower'));
    for (const c of s.units) {
      if (c.dead || c.side === team || c.kind === 'tower' || c.kind === 'inhibitor' || c.kind === 'nexus' || c.kind === 'watchstone') {
        c.hidden[team] = false;
        continue;
      }
      let seen = eyes.some((v) => (v.x - c.x) ** 2 + (v.y - c.y) ** 2 <= v.r * v.r);
      if (seen && c.kind === 'champion') {
        if (stealthed(c)) seen = close.some((v) => dist(v, c) <= BUSH_REVEAL);
        else if (c.revealMs <= 0) {
          const bush = bushAt(c);
          if (bush >= 0) seen = close.some((v) => dist(v, c) <= BUSH_REVEAL || bushAt(v) === bush);
        }
      }
      c.hidden[team] = !seen;
    }
  }
}

/** The guardian beast: claws whoever hurt it last (and those beside them), hurls rocks at range, and heals when left alone. */
function beastAct(s: GameState, u: Unit, dt: number) {
  const who = getUnit(s, u.lastHitBy);
  if (!who || who.dead || dist(who, u) > BEAST.leash) {
    u.lastHitBy = null;
    u.hp = Math.min(u.maxHp, u.hp + (BEAST.regenPerSec * dt) / 1000);
    return;
  }
  if (u.attackCd > 0) return;
  if (inRange(u, who)) {
    attack(s, u, who);
    for (const e of s.units) {
      if (e === who || e.dead || e.side === 'neutral' || (e.kind !== 'champion' && e.kind !== 'minion') || dist(e, who) > BEAST.splash) continue;
      damage(s, e, u.dmg * 0.6, u.id);
    }
    s.fx.push({ kind: 'ring', x: who.x, y: who.y, r: BEAST.splash, color: '#c79bff', ms: 300 });
    return;
  }
  // Out of reach: a hurled rock.
  u.attackCd = u.attackMs;
  u.swing = 180;
  u.facing = Math.atan2(who.y - u.y, who.x - u.x);
  const d = Math.max(dist(u, who), 1);
  const speed = 0.6;
  s.projectiles.push({
    x: u.x,
    y: u.y,
    vx: ((who.x - u.x) / d) * speed,
    vy: ((who.y - u.y) / d) * speed,
    left: d + 40,
    side: 'neutral',
    owner: u.id,
    damage: u.dmg,
    width: 28,
    pierce: false,
    hit: [],
    color: '#b98a5a',
    stun: 0,
    slow: 0,
    pull: false,
    executeBelow: 0,
  });
}

/** How long an AI champion waits between two abilities, in ms. */
const AI_CAST_GAP = 800;

/** An AI champion uses an ability when it has a clear use for it. */
function castAi(s: GameState, u: Unit, t: Unit) {
  // One ability at a time, as a player would, rather than all four in the same instant.
  if (u.aiCastMs > 0) return;
  for (const key of ABILITY_KEYS) {
    const ab = abilityFor(u, key);
    if (!ab || u.cds[ab.key] > 0 || u.level < ab.level) continue;
    // Ultimates are kept for champions and the beast.
    if (ab.level >= 3 && t.kind !== 'champion' && t.kind !== 'beast') continue;
    const aim = aimFor(s, u, t, ab);
    if (aim && cast(s, u, ab.key, aim)) {
      u.aiCastMs = AI_CAST_GAP;
      return;
    }
  }
}

function aimFor(s: GameState, u: Unit, t: Unit, ab: AbilityDef): Vec | null {
  const d = Math.max(dist(u, t), 1);
  switch (ab.kind) {
    case 'ally': {
      const allies = s.units.filter((a) => a.kind === 'champion' && !a.dead && a.side === u.side && dist(a, u) <= ab.range + (ab.radius ?? 0));
      const low = allies.reduce<Unit | null>((best, a) => (!best || a.hp / a.maxHp < best.hp / best.maxHp ? a : best), null);
      const fight = t.kind === 'champion' && dist(t, u) < 400;
      if (ab.range === 0) return fight || (low && low.hp < low.maxHp * 0.6 && dist(low, u) <= (ab.radius ?? 0)) ? { x: u.x, y: u.y } : null;
      if (low && (low.hp < low.maxHp * 0.8 || fight)) return { x: low.x, y: low.y };
      return null;
    }
    case 'burst':
      if (ab.range === 0) return dist(t, u) - t.radius <= (ab.radius ?? 0) * 0.8 ? { x: t.x, y: t.y } : null;
      return dist(t, u) <= ab.range ? { x: t.x, y: t.y } : null;
    case 'zone':
      return dist(t, u) <= ab.range + (ab.radius ?? 0) * 0.5 ? { x: t.x, y: t.y } : null;
    case 'bolt':
      // A harpoon is kept for champions.
      if (ab.pull && t.kind !== 'champion') return null;
      return dist(t, u) - t.radius <= ab.range ? { x: t.x, y: t.y } : null;
    case 'buff': {
      if (ab.buff?.stealth) return t.kind === 'champion' && d < 520 && d > u.range ? { x: u.x, y: u.y } : null;
      const near = d - t.radius <= u.range + 60;
      return near && (t.kind === 'champion' || t.kind === 'beast' || (ab.buff?.atk && t.kind !== 'minion')) ? { x: t.x, y: t.y } : null;
    }
    case 'dash':
      if (ab.damage) {
        return t.kind === 'champion' && dist(t, u) - t.radius <= ab.range + 80 && dist(t, u) > u.range ? { x: t.x, y: t.y } : null;
      }
      // A blink with no damage is an escape: it takes the caster away from the enemy.
      return u.hp < u.maxHp * 0.4 && d < 300 ? clampWorld({ x: u.x + ((u.x - t.x) / d) * ab.range, y: u.y + ((u.y - t.y) / d) * ab.range }) : null;
  }
  return null;
}

/** One attack: its passive and buffs shape the damage, then lifesteal, splash and slows follow. */
function attack(s: GameState, u: Unit, t: Unit) {
  if (u.attackCd > 0 || t.dead) return;
  u.attackCd = attackMsOf(u);
  u.swing = 180;
  u.facing = Math.atan2(t.y - u.y, t.x - u.x);
  let amount = u.dmg;
  const p = u.champ?.passive;
  if (u.kind === 'champion' && p) {
    amount *= 1 + buffSum(u, 'dmg') / 100;
    u.attackCount++;
    if (p.critEvery && u.attackCount % p.critEvery === 0) {
      amount *= p.critMult ?? 1.5;
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 22, color: u.champ!.color, ms: 220 });
    }
    if (p.ambush && (u.lullMs >= LULL_MS || stealthed(u))) {
      amount *= p.ambush;
      s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 28, color: u.champ!.color, ms: 300 });
    }
    if (p.hasteMs) u.hasteMs = p.hasteMs;
    u.revealMs = REVEAL_MS;
    u.lullMs = 0;
    breakStealth(u);
  }
  if (u.range > 80) {
    s.fx.push({ kind: 'line', x: u.x, y: u.y, x2: t.x, y2: t.y, color: SIDE_COLOR[u.side], ms: 160 });
    s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 10, color: '#ffffff', ms: 120 });
  } else {
    s.fx.push({ kind: 'arc', x: u.x, y: u.y, r: u.radius + 14, a: u.facing, color: '#ffffff', ms: 180 });
    s.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 12, color: '#ffffff', ms: 120 });
  }
  // Minions of the team that slew the beast hit harder while its buff lasts.
  const empowered = u.kind === 'minion' && u.side !== 'neutral' && s.beastBuff[u.side] > s.time;
  const hit = dealt(s, u, amount) * (empowered ? BEAST_BUFF.dmg : 1);
  const lost = damage(s, t, hit, u.id);
  if (u.kind !== 'champion' || !p) return;
  const steal = (p.lifesteal ?? 0) + buffSum(u, 'lifesteal');
  if (steal && lost > 0) u.hp = Math.min(u.maxHp, u.hp + (lost * steal) / 100);
  const slow = Math.max(p.slowHit ?? 0, buffSum(u, 'slowHit'));
  if (slow && (t.kind === 'champion' || t.kind === 'minion')) t.slowMs = Math.max(t.slowMs, slow);
  if (p.splash) {
    for (const e of [...s.units]) {
      if (e === t || e.dead || e.side === u.side || !hittable(e) || (e.kind !== 'champion' && e.kind !== 'minion' && e.kind !== 'camp') || dist(e, t) > (p.splashRadius ?? 0) + e.radius) continue;
      damage(s, e, (hit * p.splash) / 100, u.id);
    }
  }
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
    if (e.dead || e.side === u.side || !hittable(e) || !filter(e) || hiddenFrom(s, u.side, e) || invulnerable(s, e)) continue;
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
  const step = Math.min(d, (speedOf(u) * dt) / 1000);
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
      if (e.dead || e.side === p.side || !hittable(e) || p.hit.includes(e.id)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > p.width + e.radius) continue;
      p.hit.push(e.id);
      const owner = getUnit(s, p.owner);
      if (p.look) s.fx.push({ kind: 'skill', look: `${p.look}>hit`, x: e.x, y: e.y, x2: p.x, y2: p.y, r: 0, a: Math.atan2(p.vy, p.vx), color: p.color, ms: 400 });
      if (owner && owner.kind === 'champion') abilityHit(s, owner, e, p.damage, p);
      else damage(s, e, p.damage, p.owner);
      // A harpoon drags what it caught to the thrower.
      if (p.pull && owner && !e.dead && (e.kind === 'champion' || e.kind === 'minion')) {
        const d = Math.max(dist(owner, e), 1);
        const stop = owner.radius + e.radius + 20;
        if (!p.look) s.fx.push({ kind: 'line', x: owner.x, y: owner.y, x2: e.x, y2: e.y, color: p.color, ms: 300 });
        e.x = owner.x + ((e.x - owner.x) / d) * stop;
        e.y = owner.y + ((e.y - owner.y) / d) * stop;
      }
      if (!p.pierce) {
        p.left = 0;
        break;
      }
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.left > 0);
}

/** Zones hurt and slow the other team's units inside them, then fade. */
function updateZones(s: GameState, dt: number) {
  for (const z of s.zones) {
    z.left -= dt;
    for (const e of s.units) {
      if (e.dead || e.side === z.side || !hittable(e) || e.kind === 'tower' || e.kind === 'inhibitor' || e.kind === 'nexus') continue;
      if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 > (z.r + e.radius) ** 2) continue;
      damage(s, e, (z.dps * dt) / 1000, z.owner);
      if (z.slow && (e.kind === 'champion' || e.kind === 'minion')) e.slowMs = Math.max(e.slowMs, Math.min(z.slow, 400));
    }
  }
  s.zones = s.zones.filter((z) => z.left > 0);
}
