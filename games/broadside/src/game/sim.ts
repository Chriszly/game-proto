import { byDifficulty } from '../../../../shared/settings';
import { drawOrder, ORDERS, PELLET_FAN, SLOW_MS } from './orders';
import { ENEMIES } from './ships';
import {
  AGROUND_DAMAGE,
  AGROUND_MS,
  ARC,
  BALL_SPEED,
  BREAK_MS,
  CHARGE_DAMAGE,
  CHARGE_MS,
  ISLANDS,
  LOOT_MS,
  LOOT_PULL,
  WORLD,
  newShip,
  offset,
  radiusOf,
  reachOf,
  stats,
  type Ball,
  type Effect,
  type GameState,
  type Loot,
  type Ship,
  type Side,
  wrapCoord,
  wrapPoint,
} from './state';
import { costOf, REPAIR_COST, type UpgradeId } from './upgrades';
import { hpScale, waveShips } from './waves';

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
  for (const ship of [s.player, ...s.enemies]) {
    ship.hitMs = Math.max(0, ship.hitMs - dt);
    ship.agroundMs = Math.max(0, ship.agroundMs - dt);
    ship.slowMs = Math.max(0, ship.slowMs - dt);
  }
  if (s.phase === 'harbor' || s.phase === 'over') return;

  if (s.phase === 'break') {
    s.breakMs -= dt;
    if (s.breakMs <= 0) {
      s.phase = 'fighting';
      s.spawnMs = 0;
    }
  }

  const p = stats(s);
  steer(s.player, s.player.heading + (s.helm * Math.PI) / 2, p.turn * Math.abs(s.helm), p.speed, dt);
  if (s.phase !== 'fighting') {
    // Nothing to shoot at yet: the guns can't be aimed until the wave comes.
    s.charge = { port: null, starboard: null };
    runAground(s, s.player);
    playerSunk(s);
    return;
  }

  spawn(s, dt);
  for (const e of s.enemies) sailEnemy(s, e, dt);
  separate(s);
  for (const ship of [s.player, ...s.enemies]) runAground(s, ship);
  aimBroadsides(s, dt);
  enemyBroadsides(s, dt);
  moveBalls(s, dt);

  for (const e of s.enemies.filter((e) => e.hp <= 0)) sink(s, e);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  if (playerSunk(s)) return;

  gatherLoot(s, dt);
  if (s.toSpawn.length === 0 && s.enemies.length === 0) {
    // The wave is beaten: the crew hauls in every barrel still afloat before putting into harbor.
    for (const l of s.loot) haulIn(s, l);
    s.loot = [];
    reachHarbor(s);
  }
}

/** Ends the run if the player's hull is gone. */
function playerSunk(s: GameState) {
  if (s.player.hp > 0) return false;
  s.player.hp = 0;
  s.phase = 'over';
  s.bestWave = Math.max(s.bestWave, s.wave - 1);
  return true;
}

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
      ship.hp -= AGROUND_DAMAGE;
      ship.hitMs = 160;
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
  const hp = Math.round(ENEMIES[kind].hp * hpScale(s.wave) * byDifficulty(0.75, 1, 1.3));
  s.enemies.push(newShip(s.nextId++, kind, x, y, bearing({ x, y }, s.player), hp));
}

/** How fast an enemy ship sails right now: slower while chain shot has its rigging tangled. */
export function speedOf(e: Ship) {
  const base = ENEMIES[e.kind as keyof typeof ENEMIES].speed;
  return e.slowMs > 0 ? base * (ORDERS.chain.slow ?? 1) : base;
}

/**
 * Enemy captains close in, then come about to bring a broadside to bear on the player, whichever
 * side needs the least turning, and bear away rather than ram. While closing in they plan a
 * course round any island in the way (`e.detour`), and they always keep a lookout ahead so they
 * bear off a beach rather than run onto it.
 */
function sailEnemy(s: GameState, e: Ship, dt: number) {
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  const d = distance(e, s.player);
  const b = bearing(e, s.player);
  let want = b;
  const last = e.detour;
  e.detour = null;
  if (d < radiusOf(e) + 70) want = b + Math.PI;
  else if (d < type.range * 0.9) {
    const starboard = b - Math.PI / 2;
    const port = b + Math.PI / 2;
    want = Math.abs(wrap(starboard - e.heading)) < Math.abs(wrap(port - e.heading)) ? starboard : port;
  } else {
    const round = planDetour(e, s.player, last);
    if (round) {
      e.detour = { island: round.island, side: round.side };
      want = round.heading;
    }
  }
  // With a beach dead ahead on the ship's present heading, the crew shortens sail so it can come
  // about in a tighter circle.
  const shorten = shoalAhead(e, e.heading) ? SHORTEN_SAIL : 1;
  steer(e, fend(e, want), type.turn, speedOf(e) * shorten, dt);
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
  const ships = [s.player, ...s.enemies];
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
    player.reload[side] = Math.max(0, player.reload[side] - dt);
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

/** Fires one of the player's broadsides with the charge it was held to. */
function firePlayer(s: GameState, side: Side, charge: number) {
  const p = stats(s);
  const player = s.player;
  const reach = reachOf(p.range, charge);
  const damage = p.damage * (1 + CHARGE_DAMAGE * charge);
  // The crews train their guns on the nearest enemy in the shot's reach that is within the arc, or
  // just outside it (then as far round as the guns go), or fire straight out if there is none.
  const out = player.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
  const target = s.enemies
    .filter((e) => e.hp > 0 && distance(player, e) < reach + radiusOf(e) && Math.abs(wrap(bearing(player, e) - out)) < ARC + TRAIN_SLACK)
    .sort((a, b) => distance(player, a) - distance(player, b))[0];
  const order = ORDERS[s.order];
  fire(s, player, side, target ?? null, target ? speedOf(target) : 0, p.guns, damage, reach, 0, order.shot, order.pellets ?? 1, order.pellet ?? 1);
  player.reload[side] = p.reloadMs;
}

/** Enemy broadsides go off on their own whenever the player is off a loaded side and in range. */
function enemyBroadsides(s: GameState, dt: number) {
  const p = stats(s);
  const player = s.player;
  // A ship already sunk this tick (on a beach) neither fires nor soaks up a broadside.
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const type = ENEMIES[e.kind as keyof typeof ENEMIES];
    for (const side of SIDES) {
      e.reload[side] = Math.max(0, e.reload[side] - dt);
      if (e.reload[side] > 0 || distance(e, player) >= type.range || sideFacing(e, player) !== side) continue;
      fire(s, e, side, player, p.speed, type.guns, type.damage, type.range, ENEMY_SPREAD);
      e.reload[side] = type.reloadMs;
    }
  }
}

/**
 * A broadside: every gun on one side fires, spread along the hull. The gun crews train their guns
 * as far as the arc allows to where the target will be when the shot gets there (straight out
 * with no target); enemy crews aim worse, off by up to `spread` radians either way. With
 * grapeshot each gun fires `pellets` shots in a fan, each hitting for `pellet` of `damage`.
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
) {
  const out = ship.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
  let aim = out;
  if (target) {
    const flight = distance(ship, target) / BALL_SPEED;
    const lead = { x: target.x + Math.cos(target.heading) * targetSpeed * flight, y: target.y + Math.sin(target.heading) * targetSpeed * flight };
    aim = out + Math.max(-ARC, Math.min(ARC, wrap(bearing(ship, lead) - out)));
  }
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
        ms: (range / BALL_SPEED) * 1000,
        damage: damage * pellet,
        fromPlayer: ship.kind === 'player',
        shot,
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
    const targets = ball.fromPlayer ? s.enemies : [s.player];
    const hit = targets.find((t) => t.hp > 0 && distance(ball, t) < radiusOf(t));
    if (hit) {
      hit.hp -= ball.damage;
      hit.hitMs = 160;
      if (ball.shot === 'chain') hit.slowMs = SLOW_MS;
      effect(s, 'hit', ball.x, ball.y, 400);
      return false;
    }
    if (ball.ms <= 0) {
      effect(s, 'splash', ball.x, ball.y, 450);
      return false;
    }
    return true;
  });
}

/** A sunk ship goes down and leaves a barrel of loot floating where it was. */
function sink(s: GameState, e: Ship) {
  const kind = e.kind as keyof typeof ENEMIES;
  s.sunk++;
  effect(s, 'sink', e.x, e.y, 1400, { heading: e.heading, ship: kind });
  s.loot.push({ id: s.nextId++, x: e.x, y: e.y, gold: ENEMIES[kind].loot + 2 * (s.wave - 1), ms: LOOT_MS });
}

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

/** A barrel of loot comes aboard: its gold goes into the hold. */
function haulIn(s: GameState, l: Loot) {
  s.gold += l.gold;
  s.plundered += l.gold;
  effect(s, 'coins', l.x, l.y, 900, { gold: l.gold });
}

function reachHarbor(s: GameState) {
  s.phase = 'harbor';
  s.balls = [];
  s.charge = { port: null, starboard: null };
  s.aim = { port: false, starboard: false };
  s.bestWave = Math.max(s.bestWave, s.wave);
  const max = stats(s).maxHp;
  s.player.hp = Math.min(max, s.player.hp + Math.round(max * HARBOR_PATCH));
  s.helm = 0;
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

/** Leaves the harbor for the next wave. */
export function setSail(s: GameState) {
  if (s.phase !== 'harbor') return;
  s.wave++;
  s.toSpawn = waveShips(s.wave);
  s.order = drawOrder(s.order);
  s.phase = 'break';
  s.breakMs = BREAK_MS;
  s.loot = [];
}
