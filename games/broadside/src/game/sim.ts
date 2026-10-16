import { byDifficulty } from '../../../../shared/settings';
import { bountyMet, bountyPay, drawBounty } from './bounties';
import { HULLS } from './hulls';
import { drawOrder, ORDERS } from './orders';
import { CARRONADE_DAMAGE, drawDraft, FIRST_DRAFT, OWN_MORTAR, RICOCHET_FLIGHT, SALVAGE_HULL, type PerkId } from './perks';
import { ENEMIES, GRAPE_RANGE, type EnemyKind } from './ships';
import { JAM_MS, nextShot, PELLET_FAN, SHOTS, SLOW_MS } from './shot';
import {
  AGROUND_DAMAGE,
  AGROUND_MS,
  ARC,
  BALL_SPEED,
  BLAST_KILLS,
  BOARD_HP,
  BOARD_MS,
  BOARD_REACH,
  BREAK_MS,
  CHARGE_DAMAGE,
  CHARGE_MS,
  CREW_TO_BOARD,
  crewPace,
  FORT,
  GRAPE_KILLS,
  hasPerk,
  ISLANDS,
  LOOT_MS,
  LOOT_PULL,
  PRIZE_CREW,
  WIN_MEDALS,
  WORLD,
  loadedShot,
  newShip,
  offset,
  radiusOf,
  reachOf,
  sideRange,
  stats,
  windReach,
  windSpeed,
  type Ball,
  type Effect,
  type Fort,
  type GameState,
  type Loot,
  type Ship,
  type Side,
  wrapCoord,
  wrapPoint,
} from './state';
import { medalsFor } from './admiralty';
import { costOf, HIRE, REPAIR_COST, type UpgradeId } from './upgrades';
import { fortsFor, HAVEN_WAVE, hpScale, waveShips } from './waves';

/** Time between enemy ships coming over the horizon. */
const SPAWN_MS = 2500;
/** How far from the player a new enemy ship appears. */
const SPAWN_DISTANCE = 520;
/** How fast loot drifts toward the player once in reach, pixels per second. */
const LOOT_DRIFT = 140;
/** How far off an enemy gun crew's aim can be, in radians. */
const ENEMY_SPREAD = 0.12;
/** What the crew patches up for free on reaching the harbor, as a share of the hull. */
const HARBOR_PATCH = 0.25;
/** The sea room an enemy captain keeps from a beach when planning a course round an island. */
const SEA_ROOM = 26;
/** How far ahead of its bow an enemy captain watches for shoals, beyond its turning circle. */
const LOOKOUT = 20;
/** The share of its speed an enemy ship keeps with sail shortened to come about off a beach. */
const SHORTEN_SAIL = 0.25;
const SIDES: Side[] = ['port', 'starboard'];
/** How far outside a broadside's arc the player's crews still pick a target, in radians. */
const TRAIN_SLACK = (12 * Math.PI) / 180;
/** The share of its speed a crippled ship (one that can be boarded) still makes. */
const CRIPPLED = 0.7;
/** How far from the player an escort goes after an enemy ship. */
const ESCORT_HUNT = 360;
/** How close to the player an escort keeps station when there is nothing to fight. */
const ESCORT_STATION = 110;
/** How long a mortar shell is in the air, how far its blast reaches and how far off its aim can be. */
export const SHELL_MS = 2000;
export const SHELL_R = 40;
const SHELL_SPREAD = 24;
/** How far a fireship's blast reaches. */
export const FIRE_BLAST = 70;
/** How far off a shore fort's shells can land. */
const FORT_SPREAD = 30;

/** An angle brought into (-PI, PI]. */
export function wrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// Both measure the shortest way across the sea, which may wrap over an edge.
const bearing = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const { dx, dy } = offset(from, to);
  return Math.atan2(dy, dx);
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const { dx, dy } = offset(a, b);
  return Math.hypot(dx, dy);
};

/** Which side of `ship`, if any, has `target` within its broadside's arc. */
export function sideFacing(ship: Ship, target: { x: number; y: number }): Side | null {
  const rel = wrap(bearing(ship, target) - ship.heading);
  if (Math.abs(wrap(rel - Math.PI / 2)) < ARC) return 'starboard';
  if (Math.abs(wrap(rel + Math.PI / 2)) < ARC) return 'port';
  return null;
}

function effect(s: GameState, kind: Effect['kind'], x: number, y: number, total: number, extra: Partial<Effect> = {}) {
  s.effects.push({ id: s.nextId++, kind, x, y, ms: total, total, ...extra });
}

/** Moves the battle on by `dt` milliseconds. */
export function tick(s: GameState, dt: number) {
  for (const e of s.effects) e.ms -= dt;
  s.effects = s.effects.filter((e) => e.ms > 0);
  for (const ship of [s.player, ...s.enemies, ...s.escorts]) {
    ship.hitMs = Math.max(0, ship.hitMs - dt);
    ship.agroundMs = Math.max(0, ship.agroundMs - dt);
    ship.slowMs = Math.max(0, ship.slowMs - dt);
    ship.jamMs = Math.max(0, ship.jamMs - dt);
  }
  for (const fort of s.forts) fort.hitMs = Math.max(0, fort.hitMs - dt);
  if (s.phase === 'harbor' || s.phase === 'over' || s.phase === 'won') return;

  if (s.phase === 'break') {
    s.breakMs -= dt;
    if (s.breakMs <= 0) {
      s.phase = 'fighting';
      s.spawnMs = 0;
    }
  }

  const p = stats(s);
  steer(s.player, s.player.heading + (s.helm * Math.PI) / 2, p.turn * Math.abs(s.helm), p.speed * windSpeed(s.wind, s.player.heading), dt);
  if (s.phase !== 'fighting') {
    // Nothing to shoot at yet: the guns can't be aimed until the wave comes.
    s.charge = { port: null, starboard: null };
    runAground(s, s.player);
    playerSunk(s);
    return;
  }

  s.waveMs += dt;
  spawn(s, dt);
  for (const e of s.enemies) sailEnemy(s, e, dt);
  for (const e of s.escorts) sailEscort(s, e, dt);
  separate(s);
  for (const ship of [s.player, ...s.enemies, ...s.escorts]) runAground(s, ship);
  board(s, dt);
  aimBroadsides(s, dt);
  ownMortar(s, dt);
  enemyBroadsides(s, dt);
  escortBroadsides(s, dt);
  fortsFire(s, dt);
  moveBalls(s, dt);
  landShells(s, dt);
  ram(s);
  for (const fort of s.forts.filter((f) => f.hp <= 0)) raze(s, fort);
  s.forts = s.forts.filter((f) => f.hp > 0);

  // A fireship sunk blows up and may take others down with it, so keep sinking until none are left.
  for (let down = s.enemies.filter((e) => e.hp <= 0); down.length; down = s.enemies.filter((e) => e.hp <= 0)) {
    s.enemies = s.enemies.filter((e) => e.hp > 0);
    for (const e of down) sink(s, e);
  }
  for (const e of s.escorts.filter((e) => e.hp <= 0)) effect(s, 'sink', e.x, e.y, 1400, { heading: e.heading, ship: e.kind as EnemyKind });
  s.escorts = s.escorts.filter((e) => e.hp > 0);
  if (playerSunk(s)) return;

  gatherLoot(s, dt);
  if (s.toSpawn.length === 0 && s.enemies.length === 0) {
    // The wave is beaten: the crew hauls in every barrel still afloat before putting into harbor.
    for (const l of s.loot) haulIn(s, l);
    s.loot = [];
    reachHarbor(s);
    // The pirate haven razed and the admiral sunk: the campaign is won, though the waves go on.
    if (s.wave === HAVEN_WAVE && !s.won) {
      s.won = true;
      s.phase = 'won';
      s.medals = medalsFor(s.wave, s.bestBefore) + WIN_MEDALS;
      s.medalsBanked = s.medals;
    }
  }
}

/** Ends the run if the player's hull is gone. Medals banked at the haven are not awarded twice. */
function playerSunk(s: GameState) {
  if (s.player.hp > 0) return false;
  s.player.hp = 0;
  s.phase = 'over';
  s.bestWave = Math.max(s.bestWave, s.wave - 1);
  s.medals = Math.max(0, medalsFor(s.wave - 1, s.bestBefore) - s.medalsBanked);
  return true;
}

/** Hurts a ship. The player's losses this wave are counted for the Admiralty's `hull` bounty. */
function hurt(s: GameState, ship: Ship, damage: number) {
  ship.hp -= damage;
  ship.hitMs = 160;
  if (ship === s.player) s.waveDamage += damage;
}

/** Kills sailors aboard: grapeshot and blasts cut up the crew, and fewer hands reload slower. */
const kill = (ship: Ship, sailors: number) => {
  ship.crew = Math.max(0, ship.crew - sailors);
};

/**
 * A ship that sails onto an island's beach, player or enemy, is pushed back off it, glances away
 * as off a wall and takes `AGROUND_DAMAGE` to its hull, at most once every `AGROUND_MS`. The beach
 * is an ellipse, grown by part of the ship's radius so the bow touches sand before the hull does.
 */
function runAground(s: GameState, ship: Ship) {
  const reach = radiusOf(ship) * 0.6;
  for (const island of ISLANDS) {
    const { dx, dy } = offset(island, ship);
    const ax = island.rx + reach;
    const ay = island.ry + reach;
    const n = Math.hypot(dx / ax, dy / ay);
    if (n >= 1) continue;
    // Out to the edge of the grown ellipse, along the line from its centre.
    const scale = n === 0 ? 0 : 1 / n;
    ship.x = island.x + (n === 0 ? ax : dx * scale);
    ship.y = island.y + dy * scale;
    wrapPoint(ship);
    // Glance off: mirror the heading in the beach's normal when sailing into it.
    let nx = dx / (ax * ax);
    let ny = dy / (ay * ay);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (n === 0) [nx, ny] = [1, 0];
    const vx = Math.cos(ship.heading);
    const vy = Math.sin(ship.heading);
    const into = vx * nx + vy * ny;
    if (into < 0) ship.heading = Math.atan2(vy - 2 * into * ny, vx - 2 * into * nx);
    if (ship.agroundMs <= 0) {
      hurt(s, ship, AGROUND_DAMAGE);
      if (ship === s.player) s.waveAground++;
      ship.agroundMs = AGROUND_MS;
      effect(s, 'hit', wrapCoord(ship.x - nx * reach, WORLD.w), wrapCoord(ship.y - ny * reach, WORLD.h), 400);
    }
  }
}

/**
 * Turns a ship toward `heading` at up to `turn` radians a second, then sails it forward, over the
 * edge of the sea and back in on the other side if it gets there.
 */
function steer(ship: Ship, heading: number, turn: number, speed: number, dt: number) {
  const diff = wrap(heading - ship.heading);
  const most = (turn * dt) / 1000;
  ship.heading = wrap(ship.heading + Math.max(-most, Math.min(most, diff)));
  ship.x += (Math.cos(ship.heading) * speed * dt) / 1000;
  ship.y += (Math.sin(ship.heading) * speed * dt) / 1000;
  wrapPoint(ship);
}

function spawn(s: GameState, dt: number) {
  s.spawnMs -= dt;
  if (s.spawnMs > 0 || s.toSpawn.length === 0) return;
  s.spawnMs = SPAWN_MS;
  const kind = s.toSpawn.shift()!;
  let angle = Math.random() * Math.PI * 2;
  let x = 0;
  let y = 0;
  // Never on top of an island: further round the horizon until the sea is clear.
  for (let k = 0; k < 12; k++) {
    x = wrapCoord(s.player.x + Math.cos(angle) * SPAWN_DISTANCE, WORLD.w);
    y = wrapCoord(s.player.y + Math.sin(angle) * SPAWN_DISTANCE, WORLD.h);
    const clear = ISLANDS.every((i) => {
      const { dx, dy } = offset(i, { x, y });
      return Math.hypot(dx / (i.rx + 60), dy / (i.ry + 60)) >= 1;
    });
    if (clear) break;
    angle += 0.5;
  }
  const type = ENEMIES[kind];
  const hp = Math.round(type.hp * hpScale(s.wave) * byDifficulty(0.75, 1, 1.3));
  s.enemies.push(newShip(s.nextId++, kind, x, y, bearing({ x, y }, s.player), hp, type.radius, type.crew));
}

/** An enemy ship crippled enough to board and take: under a fifth of its hull. Fireships burn instead. */
export const boardable = (e: Ship) => e.kind !== 'player' && e.kind !== 'fireship' && e.hp > 0 && e.hp <= e.maxHp * BOARD_HP;

/**
 * How fast an enemy ship (or a prize) sails right now on its heading: with or against the wind,
 * slower while chain shot has its rigging tangled, and slower still once crippled.
 */
export function speedOf(s: GameState, e: Ship) {
  let speed = ENEMIES[e.kind as keyof typeof ENEMIES].speed * windSpeed(s.wind, e.heading);
  if (e.slowMs > 0) speed *= SHOTS.chain.slow ?? 1;
  if (boardable(e)) speed *= CRIPPLED;
  return speed;
}

/**
 * Enemy captains close in, then come about to bring a broadside to bear on the player, whichever
 * side needs the least turning, and bear away rather than ram. While closing in they plan a
 * course round any island in the way (`e.detour`), and they always keep a lookout ahead so they
 * bear off a beach rather than run onto it.
 */
function sailEnemy(s: GameState, e: Ship, dt: number) {
  captain(s, e, s.player, dt);
}

/**
 * Sails `e` against `target`. A broadside ship closes in and turns side-on; a fireship sails
 * straight at it; a mortar ketch keeps to long range, circling. All plan a way round an island in
 * the way, and keep a lookout.
 */
function captain(s: GameState, e: Ship, target: Ship, dt: number) {
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  const d = distance(e, target);
  const b = bearing(e, target);
  const broadside = () => {
    const starboard = b - Math.PI / 2;
    const port = b + Math.PI / 2;
    return Math.abs(wrap(starboard - e.heading)) < Math.abs(wrap(port - e.heading)) ? starboard : port;
  };
  let want = b;
  const last = e.detour;
  e.detour = null;
  const close = () => {
    const round = planDetour(e, target, last);
    if (round) {
      e.detour = { island: round.island, side: round.side };
      want = round.heading;
    }
  };
  if (type.role === 'fireship') close();
  else if (type.role === 'mortar') {
    if (d < type.range * 0.55) want = b + Math.PI;
    else if (d < type.range * 0.85) want = broadside();
    else close();
  } else if (d < radiusOf(e) + 70) want = b + Math.PI;
  else if (d < type.range * 0.9) want = broadside();
  else close();
  // With a beach dead ahead on the ship's present heading, the crew shortens sail so it can come
  // about in a tighter circle.
  const shorten = shoalAhead(e, e.heading) ? SHORTEN_SAIL : 1;
  steer(e, fend(e, want), type.turn, speedOf(s, e) * shorten, dt);
}

/**
 * A prize taken by boarding sails with the player: it goes after the nearest enemy ship near the
 * player, as an enemy captain would go after the player, and otherwise keeps station close by.
 */
function sailEscort(s: GameState, e: Ship, dt: number) {
  const foe = nearestFoe(s, s.player, ESCORT_HUNT);
  if (foe) return captain(s, e, foe, dt);
  e.detour = null;
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  const want = distance(e, s.player) > ESCORT_STATION ? bearing(e, s.player) : s.player.heading;
  const shorten = shoalAhead(e, e.heading) ? SHORTEN_SAIL : 1;
  steer(e, fend(e, want), type.turn, speedOf(s, e) * shorten, dt);
}

/** The enemy ship afloat nearest `from`, within `within`. */
function nearestFoe(s: GameState, from: { x: number; y: number }, within: number) {
  let best: Ship | null = null;
  for (const e of s.enemies) {
    if (e.hp <= 0 || distance(from, e) >= within) continue;
    if (!best || distance(from, e) < distance(from, best)) best = e;
  }
  return best;
}

/** An island's no-go zone for a ship: the beach grown by the ship's reach and some sea room. */
function zoneOf(island: (typeof ISLANDS)[number], ship: Ship, room = SEA_ROOM) {
  const grow = radiusOf(ship) * 0.6 + room;
  return { ax: island.rx + grow, ay: island.ry + grow };
}

/**
 * The way round island `i` from `ship` to `target`, one way (`side` 1 or -1), worked out where the
 * island's zone is a unit circle: the angle at which the ship's course first touches the zone
 * (`t1`), the angle swept round the coast from there until the target is in clear sight, and the
 * route's rough length.
 */
function roundIsland(i: number, ship: Ship, target: { x: number; y: number }, side: 1 | -1) {
  const island = ISLANDS[i];
  const { ax, ay } = zoneOf(island, ship);
  const o = offset(island, ship);
  const q = { x: o.dx / ax, y: o.dy / ay };
  const to = offset(ship, target);
  const r = { x: q.x + to.dx / ax, y: q.y + to.dy / ay };
  const dq = Math.hypot(q.x, q.y);
  const dr = Math.hypot(r.x, r.y);
  const alpha = Math.acos(Math.min(1, 1 / Math.max(dq, 1e-6)));
  const beta = Math.acos(Math.min(1, 1 / Math.max(dr, 1e-6)));
  const t1 = Math.atan2(q.y, q.x) + side * alpha;
  const t2 = Math.atan2(r.y, r.x) - side * beta;
  const sweep = wrapCoord(side * (t2 - t1), Math.PI * 2);
  const length = Math.sqrt(Math.max(0, dq * dq - 1)) + sweep + Math.sqrt(Math.max(0, dr * dr - 1));
  return { island, ax, ay, t1, sweep, length };
}

/** Whether the straight line from `ship` to `target` crosses island `i`'s zone. */
function blocked(i: number, ship: Ship, target: { x: number; y: number }) {
  const island = ISLANDS[i];
  const { ax, ay } = zoneOf(island, ship);
  const o = offset(island, ship);
  const to = offset(ship, target);
  const q = { x: o.dx / ax, y: o.dy / ay };
  const v = { x: to.dx / ax, y: to.dy / ay };
  const vv = v.x * v.x + v.y * v.y || 1e-9;
  // The point of the line nearest the island's centre.
  const t = Math.max(0, Math.min(1, -(q.x * v.x + q.y * v.y) / vv));
  return Math.hypot(q.x + v.x * t, q.y + v.y * t) < 1;
}

/**
 * When an island lies between `ship` and `target`, the heading that takes the ship round it and
 * which way round: the shorter way, except that a captain already going round one way keeps to it
 * unless the other way is much shorter. Null when the way is clear.
 */
function planDetour(ship: Ship, target: { x: number; y: number }, last: Ship['detour']) {
  let best: { island: number; heading: number; side: 1 | -1; dist: number } | null = null;
  for (let i = 0; i < ISLANDS.length; i++) {
    if (!blocked(i, ship, target)) continue;
    const dist = distance(ship, ISLANDS[i]);
    if (best && best.dist < dist) continue;
    const ways = { 1: roundIsland(i, ship, target, 1), [-1]: roundIsland(i, ship, target, -1) };
    let side: 1 | -1 = ways[1].length <= ways[-1].length ? 1 : -1;
    if (last && last.island === i && last.side !== side && ways[side].length > ways[last.side].length * 0.75) side = last.side;
    const way = ways[side];
    // Sail for a point a little further round the coast than where the course meets it, so the
    // ship follows the shore round instead of stopping short of it.
    const a = way.t1 + side * Math.min(0.35, way.sweep);
    const { dx, dy } = offset(ship, way.island);
    const heading = Math.atan2(dy + Math.sin(a) * way.ay, dx + Math.cos(a) * way.ax);
    best = { island: i, heading, side, dist };
  }
  return best;
}

/**
 * The course an enemy ship going round an island means to sail: from the ship to the coast, round
 * it, and a little way on toward the player, as points near the ship (not wrapped, so the line
 * never jumps across the sea). Empty when the ship is not detouring. The scene draws it dotted.
 */
export function detourCourse(s: GameState, e: Ship) {
  if (!e.detour) return [];
  const { side } = e.detour;
  const way = roundIsland(e.detour.island, e, s.player, side);
  const { island, ax, ay } = way;
  const o = offset(e, island);
  const cx = e.x + o.dx;
  const cy = e.y + o.dy;
  const at = (a: number) => ({ x: cx + Math.cos(a) * ax * 1.04, y: cy + Math.sin(a) * ay * 1.04 });
  const points = [{ x: e.x, y: e.y }];
  const steps = Math.max(1, Math.ceil(way.sweep / 0.18));
  for (let k = 0; k <= steps; k++) points.push(at(way.t1 + (side * way.sweep * k) / steps));
  // A short leg on toward the player once round.
  const end = points[points.length - 1];
  const b = bearing(end, s.player);
  points.push({ x: end.x + Math.cos(b) * 60, y: end.y + Math.sin(b) * 60 });
  return points;
}

/**
 * Whether sailing on `heading` would soon take the ship onto a beach (of `only` that island, or any):
 * looking far enough ahead to come about in time, so a slow-turning ship looks further.
 */
function shoalAhead(e: Ship, heading: number, only?: (typeof ISLANDS)[number]) {
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  const look = radiusOf(e) + LOOKOUT + type.speed / type.turn;
  return (only ? [only] : ISLANDS).some((island) => {
    const { ax, ay } = zoneOf(island, e, 8);
    const o = offset(island, e);
    const at = (k: number) => Math.hypot((o.dx + Math.cos(heading) * look * k) / ax, (o.dy + Math.sin(heading) * look * k) / ay) < 1;
    return at(0.5) || at(1);
  });
}

/**
 * The lookout: if the heading the captain wants would take the bow onto a beach within a short
 * way, bear off along the coast instead, whichever way round is nearer the wanted heading.
 */
function fend(e: Ship, want: number) {
  for (const island of ISLANDS) {
    if (!shoalAhead(e, want, island)) continue;
    const { ax, ay } = zoneOf(island, e, 8);
    const o = offset(island, e);
    // Along the coast: square to the beach's normal where the ship is, a little outward.
    const normal = Math.atan2(o.dy / (ay * ay), o.dx / (ax * ax));
    const out = Math.hypot(o.dx / ax, o.dy / ay) < 1 ? 0.5 : 0.15;
    const a = normal + Math.PI / 2 - out;
    const c = normal - Math.PI / 2 + out;
    return Math.abs(wrap(a - want)) < Math.abs(wrap(c - want)) ? a : c;
  }
  return want;
}

/** Pushes overlapping ships apart. */
function separate(s: GameState) {
  const ships = [s.player, ...s.enemies, ...s.escorts];
  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      const a = ships[i];
      const b = ships[j];
      const d = distance(a, b);
      const overlap = radiusOf(a) + radiusOf(b) - d;
      if (overlap <= 0 || d === 0) continue;
      const { dx, dy } = offset(a, b);
      const nx = dx / d;
      const ny = dy / d;
      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;
      wrapPoint(a);
      wrapPoint(b);
    }
  }
}

/**
 * The player's broadsides. Holding a side's fire control charges it once it is loaded; letting
 * go fires it, reaching further and hitting harder the longer it was held.
 */
function aimBroadsides(s: GameState, dt: number) {
  const player = s.player;
  for (const side of SIDES) {
    player.reload[side] = Math.max(0, player.reload[side] - dt * crewPace(player));
    const loaded = player.reload[side] <= 0;
    if (s.aim[side]) {
      if (loaded) s.charge[side] = Math.min(1, (s.charge[side] ?? 0) + dt / CHARGE_MS);
      continue;
    }
    const charge = s.charge[side];
    if (charge === null) continue;
    s.charge[side] = null;
    if (loaded) firePlayer(s, side, charge);
  }
}

/**
 * Fires one of the player's broadsides with the charge it was held to. On a Bomb Ketch the mortar
 * side lobs a shell instead, to where the broadside would have gone.
 */
function firePlayer(s: GameState, side: Side, charge: number) {
  const p = stats(s);
  const hull = HULLS[s.hull];
  const player = s.player;
  const reach = reachOf(sideRange(s, side), charge);
  let damage = p.damage * (1 + CHARGE_DAMAGE * charge);
  // The crews train their guns on the nearest enemy in the shot's reach (further downwind) that is
  // within the arc, or just outside it (then as far round as the guns go), or fire straight out if
  // there is none.
  const out = player.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
  const inReach = reach * windReach(s.wind, out);
  const target = s.enemies
    .filter((e) => e.hp > 0 && distance(player, e) < inReach + radiusOf(e) && Math.abs(wrap(bearing(player, e) - out)) < p.arc + TRAIN_SLACK)
    .sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (hull.mortarSide === side) {
    // The shell comes down where the target will be (as far round as the mortar trains), or straight out at the reach.
    const shell = (hull.shell ?? 0) * (1 + CHARGE_DAMAGE * charge);
    let aim = out;
    let far = inReach;
    if (target) {
      const lead = SHELL_MS / 1000;
      const spot = { x: target.x + Math.cos(target.heading) * speedOf(s, target) * lead, y: target.y + Math.sin(target.heading) * speedOf(s, target) * lead };
      aim = out + Math.max(-p.arc, Math.min(p.arc, wrap(bearing(player, spot) - out)));
      far = Math.min(inReach, distance(player, spot));
    }
    lob(s, player, wrapCoord(player.x + Math.cos(aim) * far, WORLD.w), wrapCoord(player.y + Math.sin(aim) * far, WORLD.h), shell, 0);
    player.reload[side] = p.reloadMs;
    return;
  }
  // Carronades: shot at a ship inside half the reach hits harder.
  if (target && hasPerk(s, 'carronades') && distance(player, target) < sideRange(s, side) / 2) damage *= CARRONADE_DAMAGE;
  const kind = loadedShot(s, side);
  const shot = SHOTS[kind];
  const look = kind === 'round' && ORDERS[s.order].powder ? 'powder' : kind;
  fire(s, player, side, target ?? null, target ? speedOf(s, target) : 0, p.guns, damage, reach, 0, look, shot.pellets ?? 1, shot.pellet ?? 1, true, p.arc);
  player.reload[side] = p.reloadMs;
}

/** The player's own mortar (a perk): every `OWN_MORTAR.reloadMs` a shell at the nearest enemy in range. */
function ownMortar(s: GameState, dt: number) {
  if (!hasPerk(s, 'mortar')) return;
  s.mortarMs = Math.max(0, s.mortarMs - dt);
  if (s.mortarMs > 0) return;
  const foe = nearestFoe(s, s.player, OWN_MORTAR.range);
  if (!foe) return;
  lobAt(s, s.player, foe, speedOf(s, foe), OWN_MORTAR.damage, SHELL_SPREAD);
  s.mortarMs = OWN_MORTAR.reloadMs;
}

/**
 * How much a ship's reload runs down in `dt`: at the jam's share of the pace after a grapeshot hit,
 * and slower with sailors lost.
 */
const reloadStep = (ship: Ship, dt: number) => (ship.jamMs > 0 ? dt * (SHOTS.grape.jam ?? 1) : dt) * crewPace(ship);

/**
 * Enemy broadsides go off on their own whenever the player, or else one of the player's prizes,
 * is off a loaded side and in range. Mortar ketches lob a shell at the player instead.
 */
function enemyBroadsides(s: GameState, dt: number) {
  const player = s.player;
  const playerSpeed = stats(s).speed * windSpeed(s.wind, player.heading);
  // A ship already sunk this tick (on a beach) neither fires nor soaks up a broadside.
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const type = ENEMIES[e.kind as keyof typeof ENEMIES];
    if (type.role === 'mortar') {
      mortar(s, e, player, playerSpeed, dt);
      continue;
    }
    if (type.guns === 0) continue;
    for (const side of SIDES) {
      e.reload[side] = Math.max(0, e.reload[side] - reloadStep(e, dt));
      if (e.reload[side] > 0) continue;
      const target = [player, ...s.escorts].find((t) => t.hp > 0 && distance(e, t) < type.range && sideFacing(e, t) === side);
      if (!target) continue;
      // Close in, a ship that carries grapeshot rakes the deck with it instead.
      const grape = type.grape && distance(e, target) < GRAPE_RANGE;
      const shot = grape ? SHOTS.grape : SHOTS.round;
      fire(s, e, side, target, target === player ? playerSpeed : speedOf(s, target), type.guns, type.damage, type.range * (shot.range ?? 1), ENEMY_SPREAD, grape ? 'grape' : 'round', shot.pellets ?? 1, shot.pellet ?? 1);
      e.reload[side] = type.reloadMs;
    }
  }
}

/**
 * The player's prizes fire their broadsides on their own at any enemy off a loaded side, as
 * enemies do; with Prize gun crews they reload twice as fast.
 */
function escortBroadsides(s: GameState, dt: number) {
  const pace = hasPerk(s, 'gunners') ? 2 : 1;
  for (const e of s.escorts) {
    if (e.hp <= 0) continue;
    const type = ENEMIES[e.kind as keyof typeof ENEMIES];
    if (type.role === 'mortar') {
      const foe = nearestFoe(s, e, type.range);
      if (foe) mortar(s, e, foe, speedOf(s, foe), dt * pace);
      else e.reload.port = Math.max(0, e.reload.port - reloadStep(e, dt * pace));
      continue;
    }
    for (const side of SIDES) {
      e.reload[side] = Math.max(0, e.reload[side] - reloadStep(e, dt * pace));
      if (e.reload[side] > 0) continue;
      const target = s.enemies.find((t) => t.hp > 0 && distance(e, t) < type.range && sideFacing(e, t) === side);
      if (!target) continue;
      fire(s, e, side, target, speedOf(s, target), type.guns, type.damage, type.range, ENEMY_SPREAD, 'round', 1, 1, true);
      e.reload[side] = type.reloadMs;
    }
  }
}

/**
 * A mortar ketch lobs a shell at `target` whenever loaded and in range: it marks the spot where the
 * shell will land (where the target will be if it holds its course), and the shell comes down there
 * `SHELL_MS` later. Its one mortar reloads on the port side's timer. Uses Math.random twice.
 */
function mortar(s: GameState, e: Ship, target: Ship, targetSpeed: number, dt: number) {
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  e.reload.port = Math.max(0, e.reload.port - reloadStep(e, dt));
  if (e.reload.port > 0 || distance(e, target) >= type.range) return;
  lobAt(s, e, target, targetSpeed, type.damage, SHELL_SPREAD);
  e.reload.port = type.reloadMs;
}

/** Lobs a shell at where `target` will be in `SHELL_MS` if it holds its course, off by up to `spread`. Uses Math.random twice. */
function lobAt(s: GameState, from: { x: number; y: number }, target: Ship, targetSpeed: number, damage: number, spread: number) {
  const lead = (targetSpeed * SHELL_MS) / 1000;
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * spread;
  const x = wrapCoord(target.x + Math.cos(target.heading) * lead + Math.cos(a) * r, WORLD.w);
  const y = wrapCoord(target.y + Math.sin(target.heading) * lead + Math.sin(a) * r, WORLD.h);
  lob(s, from, x, y, damage, 0);
}

/** A shell in the air from `from` toward the spot marked, coming down `SHELL_MS` later. */
function lob(s: GameState, from: { x: number; y: number }, x: number, y: number, damage: number, spread: number) {
  if (spread) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * spread;
    x = wrapCoord(x + Math.cos(a) * r, WORLD.w);
    y = wrapCoord(y + Math.sin(a) * r, WORLD.h);
  }
  s.shells.push({ id: s.nextId++, x, y, ms: SHELL_MS, total: SHELL_MS, damage });
  effect(s, 'smoke', from.x, from.y, 800, { heading: bearing(from, { x, y }) });
}

/** Shore forts shell the player whenever loaded and in range, as a mortar ketch does. Uses Math.random twice per shell. */
function fortsFire(s: GameState, dt: number) {
  const player = s.player;
  const playerSpeed = stats(s).speed * windSpeed(s.wind, player.heading);
  for (const fort of s.forts) {
    fort.reload = Math.max(0, fort.reload - dt);
    if (fort.reload > 0 || distance(fort, player) >= FORT.range) continue;
    lobAt(s, fort, player, playerSpeed, FORT.damage, FORT_SPREAD);
    fort.reload = FORT.reloadMs;
  }
}

/** Shells in the air come down on the spots they marked, hurting every ship (and fort) under them. */
function landShells(s: GameState, dt: number) {
  s.shells = s.shells.filter((shell) => {
    shell.ms -= dt;
    if (shell.ms > 0) return true;
    blast(s, shell.x, shell.y, SHELL_R, shell.damage);
    return false;
  });
}

/**
 * A blast, from a shell or a fireship: every ship within `radius` (of its hull's middle half)
 * takes `damage` and loses `BLAST_KILLS` sailors, and so does any fort under it.
 */
function blast(s: GameState, x: number, y: number, radius: number, damage: number) {
  for (const ship of [s.player, ...s.enemies, ...s.escorts]) {
    if (ship.hp <= 0 || distance(ship, { x, y }) >= radius + radiusOf(ship) * 0.5) continue;
    hurt(s, ship, damage);
    kill(ship, BLAST_KILLS);
  }
  for (const fort of s.forts) {
    if (fort.hp <= 0 || distance(fort, { x, y }) >= radius + FORT.radius * 0.5) continue;
    fort.hp -= damage;
    fort.hitMs = 160;
  }
  effect(s, 'blast', x, y, 700, { size: radius });
}

/** A fort razed: it pays its bounty straight into the hold and goes up in a blast of its own magazine. */
function raze(s: GameState, fort: Fort) {
  s.forts = s.forts.filter((f) => f !== fort);
  effect(s, 'blast', fort.x, fort.y, 900, { size: FORT.radius + 10 });
  haulIn(s, { id: 0, x: fort.x, y: fort.y, gold: fortBounty(s.wave), ms: 0 });
}

/** What razing a fort pays on `wave`. */
export const fortBounty = (wave: number) => FORT.bounty + FORT.bountyStep * (wave - 1);

/** A fireship that reaches the player or a prize sets itself alight and blows up alongside: it is gone, with no loot. */
function ram(s: GameState) {
  for (const e of s.enemies) {
    if (e.kind !== 'fireship' || e.hp <= 0) continue;
    const touching = [s.player, ...s.escorts].some((t) => t.hp > 0 && distance(e, t) < radiusOf(e) + radiusOf(t) + 4);
    if (!touching) continue;
    // Gone without loot: taken out of the fleet here, so sinking doesn't drop any.
    s.enemies = s.enemies.filter((o) => o !== e);
    effect(s, 'sink', e.x, e.y, 1400, { heading: e.heading, ship: 'fireship' });
    blast(s, e.x, e.y, FIRE_BLAST, ENEMIES.fireship.damage);
    return ram(s);
  }
}

/**
 * A broadside: every gun on one side fires, spread along the hull. The gun crews train their guns
 * as far as the arc allows to where the target will be when the shot gets there (straight out
 * with no target); enemy crews aim worse, off by up to `spread` radians either way. With
 * grapeshot each gun fires `pellets` shots in a fan, each hitting for `pellet` of `damage`.
 * `friendly` shot (the player's and the prizes') hits enemies; the rest hits the player and prizes.
 */
function fire(
  s: GameState,
  ship: Ship,
  side: Side,
  target: Ship | null,
  targetSpeed: number,
  guns: number,
  damage: number,
  range: number,
  spread: number,
  shot: Ball['shot'] = 'round',
  pellets = 1,
  pellet = 1,
  friendly = ship.kind === 'player',
  arc = ARC,
) {
  const out = ship.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
  let aim = out;
  if (target) {
    const flight = distance(ship, target) / BALL_SPEED;
    const lead = { x: target.x + Math.cos(target.heading) * targetSpeed * flight, y: target.y + Math.sin(target.heading) * targetSpeed * flight };
    aim = out + Math.max(-arc, Math.min(arc, wrap(bearing(ship, lead) - out)));
  }
  // Bouncing shot: the player's own balls skip once off the water and fly on.
  const skip = ship.kind === 'player' && hasPerk(s, 'ricochet') ? ((range * RICOCHET_FLIGHT) / BALL_SPEED) * 1000 : 0;
  const r = radiusOf(ship);
  for (let i = 0; i < guns; i++) {
    const along = guns === 1 ? 0 : (i / (guns - 1) - 0.5) * r * 1.2;
    const x = wrapCoord(ship.x + Math.cos(ship.heading) * along + Math.cos(out) * r * 0.6, WORLD.w);
    const y = wrapCoord(ship.y + Math.sin(ship.heading) * along + Math.sin(out) * r * 0.6, WORLD.h);
    for (let k = 0; k < pellets; k++) {
      const dir = aim + (k - (pellets - 1) / 2) * PELLET_FAN + (Math.random() * 2 - 1) * spread;
      s.balls.push({
        id: s.nextId++,
        x,
        y,
        vx: Math.cos(dir) * BALL_SPEED,
        vy: Math.sin(dir) * BALL_SPEED,
        // Shot fired downwind carries further.
        ms: ((range * windReach(s.wind, dir)) / BALL_SPEED) * 1000,
        damage: damage * pellet,
        fromPlayer: friendly,
        shot,
        skip,
      });
    }
    effect(s, 'smoke', x, y, 600, { heading: out });
  }
}

function moveBalls(s: GameState, dt: number) {
  s.balls = s.balls.filter((ball) => {
    ball.x += (ball.vx * dt) / 1000;
    ball.y += (ball.vy * dt) / 1000;
    wrapPoint(ball);
    ball.ms -= dt;
    const targets = ball.fromPlayer ? s.enemies : [s.player, ...s.escorts];
    const hit = targets.find((t) => t.hp > 0 && distance(ball, t) < radiusOf(t));
    if (hit) {
      hurt(s, hit, ball.damage);
      if (ball.shot === 'chain') hit.slowMs = SLOW_MS;
      if (ball.shot === 'grape') {
        hit.jamMs = JAM_MS;
        kill(hit, GRAPE_KILLS);
      }
      effect(s, 'hit', ball.x, ball.y, 400);
      return false;
    }
    // The player's shot (and the prizes') also batters any shore fort it flies into.
    const fort = ball.fromPlayer ? s.forts.find((f) => f.hp > 0 && distance(ball, f) < FORT.radius) : undefined;
    if (fort) {
      fort.hp -= ball.damage;
      fort.hitMs = 160;
      effect(s, 'hit', ball.x, ball.y, 400);
      return false;
    }
    if (ball.ms <= 0) {
      effect(s, 'splash', ball.x, ball.y, 450);
      if (ball.skip <= 0) return false;
      // Bouncing shot skips off the water once and flies on.
      ball.ms = ball.skip;
      ball.skip = 0;
    }
    return true;
  });
}

/** The gold a ship of `kind` is worth on `wave`. */
const lootOf = (kind: EnemyKind, wave: number) => ENEMIES[kind].loot + 2 * (wave - 1);

/**
 * A sunk ship goes down and leaves a barrel of loot floating where it was. A fireship blows up as
 * it goes. With Salvage the crew patches a little hull from the wreck.
 */
function sink(s: GameState, e: Ship) {
  const kind = e.kind as EnemyKind;
  s.sunk++;
  s.waveSunk.push(kind);
  effect(s, 'sink', e.x, e.y, 1400, { heading: e.heading, ship: kind });
  s.loot.push({ id: s.nextId++, x: e.x, y: e.y, gold: lootOf(kind, s.wave), ms: LOOT_MS });
  if (kind === 'fireship') blast(s, e.x, e.y, FIRE_BLAST, ENEMIES.fireship.damage);
  if (hasPerk(s, 'salvage')) s.player.hp = Math.min(s.player.maxHp, s.player.hp + SALVAGE_HULL);
}

/** The sailors a prize crew for `e` must number: half her full crew, a quarter with Grapnels. */
export const prizeCrew = (s: GameState, e: Ship) => Math.ceil(e.maxCrew * PRIZE_CREW * (hasPerk(s, 'grapnels') ? 0.5 : 1));
/** How long the player must stay alongside to take a prize: `BOARD_MS`, half with Grapnels. */
export const boardMs = (s: GameState) => BOARD_MS * (hasPerk(s, 'grapnels') ? 0.5 : 1);
/** Whether the player has sailors enough to send a prize crew across to `e` and still work the ship. */
export const canBoard = (s: GameState, e: Ship) => s.player.crew - prizeCrew(s, e) >= CREW_TO_BOARD;

/**
 * Boarding: staying alongside a crippled enemy (`boardable`) for `boardMs` takes her as a prize,
 * if the player can spare the prize crew. Those sailors go across (and come back when she is
 * scuttled or sold), her prize crew patches her up to half her hull and she sails as the
 * player's escort.
 */
function board(s: GameState, dt: number) {
  const player = s.player;
  for (const e of [...s.enemies]) {
    const gap = distance(player, e) - radiusOf(player) - radiusOf(e);
    e.boardMs = boardable(e) && canBoard(s, e) && gap < BOARD_REACH ? e.boardMs + dt : 0;
    if (e.boardMs < boardMs(s)) continue;
    s.enemies = s.enemies.filter((o) => o !== e);
    e.hp = Math.max(e.hp, Math.ceil(e.maxHp / 2));
    e.boardMs = 0;
    e.slowMs = 0;
    e.jamMs = 0;
    e.detour = null;
    e.reload = { port: 1000, starboard: 1000 };
    e.crew = prizeCrew(s, e);
    player.crew -= e.crew;
    s.escorts.push(e);
    s.taken++;
    s.wavePrizes++;
    effect(s, 'prize', e.x, e.y, 1400);
  }
}

/** A prize's crew rows back to the player's ship. */
function crewBack(s: GameState, e: Ship) {
  s.player.crew = Math.min(s.player.maxCrew, s.player.crew + e.crew);
  e.crew = 0;
}

/** Scuttles the prize `id` for twice its loot, straight into the hold; her prize crew comes back aboard. */
export function scuttle(s: GameState, id: number) {
  const e = s.escorts.find((o) => o.id === id);
  if (!e || s.phase !== 'fighting') return false;
  s.escorts = s.escorts.filter((o) => o !== e);
  crewBack(s, e);
  s.sunk++;
  effect(s, 'sink', e.x, e.y, 1400, { heading: e.heading, ship: e.kind as EnemyKind });
  haulIn(s, { id: 0, x: e.x, y: e.y, gold: 2 * lootOf(e.kind as EnemyKind, s.wave), ms: 0 });
  return true;
}

/** What scuttling a prize would bring in. */
export const scuttleGold = (s: GameState, e: Ship) => 2 * lootOf(e.kind as EnemyKind, s.wave);

function gatherLoot(s: GameState, dt: number) {
  const player = s.player;
  s.loot = s.loot.filter((l) => {
    l.ms -= dt;
    const d = distance(l, player);
    if (d < radiusOf(player) + 8) {
      haulIn(s, l);
      return false;
    }
    if (d < LOOT_PULL) {
      const step = Math.min(d, (LOOT_DRIFT * dt) / 1000);
      const { dx, dy } = offset(l, player);
      l.x += (dx / d) * step;
      l.y += (dy / d) * step;
      wrapPoint(l);
    }
    return l.ms > 0;
  });
}

/** A barrel of loot comes aboard: its gold goes into the hold (and counts toward the wave's bounty). */
function haulIn(s: GameState, l: Loot) {
  s.gold += l.gold;
  s.plundered += l.gold;
  s.waveLoot += l.gold;
  effect(s, 'coins', l.x, l.y, 900, { gold: l.gold });
}

/**
 * The wave is beaten: prizes are sold and their crews come home, the Admiralty pays its bounty
 * if it was met, the crew patches some hull, and the harbor opens with the prize draft on offer.
 */
function reachHarbor(s: GameState) {
  // Prizes still afloat are sold in harbor for their loot.
  for (const e of s.escorts) {
    crewBack(s, e);
    haulIn(s, { id: 0, x: e.x, y: e.y, gold: lootOf(e.kind as EnemyKind, s.wave), ms: 0 });
  }
  s.escorts = [];
  s.shells = [];
  s.phase = 'harbor';
  s.balls = [];
  s.charge = { port: null, starboard: null };
  s.aim = { port: false, starboard: false };
  s.bestWave = Math.max(s.bestWave, s.wave);
  const max = stats(s).maxHp;
  s.player.hp = Math.min(max, s.player.hp + Math.round(max * HARBOR_PATCH));
  s.helm = 0;
  if (s.bounty) {
    s.bountyPaid = bountyMet(s) ? bountyPay(s) : 0;
    if (s.bountyPaid) haulIn(s, { id: 0, x: s.player.x, y: s.player.y, gold: s.bountyPaid, ms: 0 });
  } else s.bountyPaid = null;
  // The prize draft: the first wave's is fixed, later ones draw from the perks not yet taken.
  s.draft = s.wave === 1 ? [...FIRST_DRAFT] : drawDraft(s.perks);
}

/** Takes one perk of the draft on offer at the harbor; false if it is not on offer. */
export function pickPerk(s: GameState, id: PerkId) {
  if (s.phase !== 'harbor' || !s.draft.includes(id)) return false;
  s.perks.push(id);
  s.draft = [];
  return true;
}

/** Hires sailors at the harbor, up to a full crew; false if none are needed or it can't be afforded. */
export function hire(s: GameState) {
  const player = s.player;
  if (s.phase !== 'harbor' || player.crew >= player.maxCrew || s.gold < HIRE.cost) return false;
  s.gold -= HIRE.cost;
  player.crew = Math.min(player.maxCrew, player.crew + HIRE.crew);
  return true;
}

/** After the campaign is won, puts into harbor to sail on through the waves beyond. */
export function sailOn(s: GameState) {
  if (s.phase !== 'won') return false;
  s.phase = 'harbor';
  return true;
}

/** Buys the next rank of an upgrade at the harbor; false if it can't be afforded or is maxed. */
export function buy(s: GameState, id: UpgradeId) {
  const cost = costOf(id, s.ranks[id] ?? 0);
  if (s.phase !== 'harbor' || cost === null || s.gold < cost) return false;
  s.gold -= cost;
  s.ranks[id] = (s.ranks[id] ?? 0) + 1;
  if (id === 'hull') {
    s.player.maxHp = stats(s).maxHp;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + 30);
  }
  return true;
}

/** Patches the hull back to full at the harbor. */
export function repair(s: GameState) {
  if (s.phase !== 'harbor' || s.player.hp >= s.player.maxHp || s.gold < REPAIR_COST) return false;
  s.gold -= REPAIR_COST;
  s.player.hp = s.player.maxHp;
  return true;
}

/**
 * Leaves the harbor for the next wave (not while the prize draft is still on offer): a new order,
 * wind and bounty, and shore forts on some islands from `FIRST_FORT_WAVE`.
 */
export function setSail(s: GameState) {
  if (s.phase !== 'harbor' || s.draft.length) return;
  s.wave++;
  s.toSpawn = waveShips(s.wave);
  s.order = drawOrder(s.order);
  // A new wind for the wave, from one of the eight main points of the compass.
  s.wind = Math.floor(Math.random() * 8) * (Math.PI / 4);
  s.bounty = drawBounty(s.wave, s.bounty);
  s.waveLoot = 0;
  s.waveDamage = 0;
  s.waveAground = 0;
  s.wavePrizes = 0;
  s.waveMs = 0;
  s.waveSunk = [];
  s.mortarMs = OWN_MORTAR.reloadMs;
  s.forts = [];
  // Forts on islands drawn at random, never two on one. Uses Math.random once per fort.
  const islands = ISLANDS.map((_, i) => i);
  for (let k = 0; k < fortsFor(s.wave) && islands.length; k++) {
    const island = islands.splice(Math.floor(Math.random() * islands.length), 1)[0];
    const { x, y } = ISLANDS[island];
    const hp = Math.round(FORT.hp * hpScale(s.wave) * byDifficulty(0.75, 1, 1.3));
    s.forts.push({ id: s.nextId++, island, x, y, hp, maxHp: hp, reload: FORT.reloadMs / 2, hitMs: 0 });
  }
  s.phase = 'break';
  s.breakMs = BREAK_MS;
  s.loot = [];
}

/** Loads the next kind of shot into one side's guns at the harbor: round, chain, grape, round... */
export function loadShot(s: GameState, side: Side) {
  if (s.phase !== 'harbor' || HULLS[s.hull].mortarSide === side) return false;
  s.loadout[side] = nextShot(s.loadout[side]);
  return true;
}
