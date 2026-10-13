import { byDifficulty } from '../../../../shared/settings';
import { ENEMIES } from './ships';
import {
  ARC,
  BALL_SPEED,
  BREAK_MS,
  LOOT_MS,
  LOOT_PULL,
  WORLD,
  newShip,
  radiusOf,
  stats,
  type Effect,
  type GameState,
  type Ship,
  type Side,
} from './state';
import { costOf, REPAIR_COST, type UpgradeId } from './upgrades';
import { hpScale, waveShips } from './waves';

/** Time between enemy ships coming over the horizon. */
const SPAWN_MS = 2500;
/** How far from the player a new enemy ship appears. */
const SPAWN_DISTANCE = 520;
/** Ships are kept this far inside the edge of the sea. */
const EDGE = 40;
/** How fast loot drifts toward the player once in reach, pixels per second. */
const LOOT_DRIFT = 140;
/** How far off an enemy gun crew's aim can be, in radians. */
const ENEMY_SPREAD = 0.12;
/** What the crew patches up for free on reaching the harbor, as a share of the hull. */
const HARBOR_PATCH = 0.25;

/** An angle brought into (-PI, PI]. */
export function wrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

const bearing = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.y - from.y, to.x - from.x);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);

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
  if (s.phase !== 'fighting') return;

  spawn(s, dt);
  for (const e of s.enemies) sailEnemy(s, e, dt);
  separate(s);
  fireBroadsides(s, dt);
  moveBalls(s, dt);

  for (const e of s.enemies.filter((e) => e.hp <= 0)) sink(s, e);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  if (s.player.hp <= 0) {
    s.player.hp = 0;
    s.phase = 'over';
    s.bestWave = Math.max(s.bestWave, s.wave - 1);
    return;
  }

  gatherLoot(s, dt);
  if (s.toSpawn.length === 0 && s.enemies.length === 0 && s.loot.length === 0) reachHarbor(s);
}

/** Turns a ship toward `heading` at up to `turn` radians a second, then sails it forward. */
function steer(ship: Ship, heading: number, turn: number, speed: number, dt: number) {
  const diff = wrap(heading - ship.heading);
  const most = (turn * dt) / 1000;
  ship.heading = wrap(ship.heading + Math.max(-most, Math.min(most, diff)));
  ship.x = Math.max(EDGE, Math.min(WORLD.w - EDGE, ship.x + (Math.cos(ship.heading) * speed * dt) / 1000));
  ship.y = Math.max(EDGE, Math.min(WORLD.h - EDGE, ship.y + (Math.sin(ship.heading) * speed * dt) / 1000));
  ship.hitMs = Math.max(0, ship.hitMs - dt);
}

function spawn(s: GameState, dt: number) {
  s.spawnMs -= dt;
  if (s.spawnMs > 0 || s.toSpawn.length === 0) return;
  s.spawnMs = SPAWN_MS;
  const kind = s.toSpawn.shift()!;
  const angle = Math.random() * Math.PI * 2;
  const x = Math.max(EDGE * 2, Math.min(WORLD.w - EDGE * 2, s.player.x + Math.cos(angle) * SPAWN_DISTANCE));
  const y = Math.max(EDGE * 2, Math.min(WORLD.h - EDGE * 2, s.player.y + Math.sin(angle) * SPAWN_DISTANCE));
  const hp = Math.round(ENEMIES[kind].hp * hpScale(s.wave) * byDifficulty(0.75, 1, 1.3));
  s.enemies.push(newShip(s.nextId++, kind, x, y, bearing({ x, y }, s.player), hp));
}

/**
 * Enemy captains close in, then come about to bring a broadside to bear on the player, whichever
 * side needs the least turning, and bear away rather than ram.
 */
function sailEnemy(s: GameState, e: Ship, dt: number) {
  const type = ENEMIES[e.kind as keyof typeof ENEMIES];
  const d = distance(e, s.player);
  const b = bearing(e, s.player);
  let want = b;
  if (d < radiusOf(e) + 70) want = b + Math.PI;
  else if (d < type.range * 0.9) {
    const starboard = b - Math.PI / 2;
    const port = b + Math.PI / 2;
    want = Math.abs(wrap(starboard - e.heading)) < Math.abs(wrap(port - e.heading)) ? starboard : port;
  }
  steer(e, want, type.turn, type.speed, dt);
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
      const nx = (b.x - a.x) / d;
      const ny = (b.y - a.y) / d;
      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;
    }
  }
}

function fireBroadsides(s: GameState, dt: number) {
  const p = stats(s);
  const player = s.player;
  for (const side of ['port', 'starboard'] as Side[]) {
    player.reload[side] = Math.max(0, player.reload[side] - dt);
    if (player.reload[side] > 0) continue;
    const target = s.enemies.find((e) => distance(player, e) < p.range && sideFacing(player, e) === side);
    if (!target) continue;
    fire(s, player, side, target, ENEMIES[target.kind as keyof typeof ENEMIES].speed, p.guns, p.damage, p.range, 0);
    player.reload[side] = p.reloadMs;
  }
  for (const e of s.enemies) {
    const type = ENEMIES[e.kind as keyof typeof ENEMIES];
    for (const side of ['port', 'starboard'] as Side[]) {
      e.reload[side] = Math.max(0, e.reload[side] - dt);
      if (e.reload[side] > 0 || distance(e, player) >= type.range || sideFacing(e, player) !== side) continue;
      fire(s, e, side, player, p.speed, type.guns, type.damage, type.range, ENEMY_SPREAD);
      e.reload[side] = type.reloadMs;
    }
  }
}

/**
 * A broadside: every gun on one side fires, spread along the hull. The gun crews train their guns
 * as far as the arc allows to where the target will be when the shot gets there; enemy crews aim
 * worse, off by up to `spread` radians either way.
 */
function fire(s: GameState, ship: Ship, side: Side, target: Ship, targetSpeed: number, guns: number, damage: number, range: number, spread: number) {
  const out = ship.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
  const flight = distance(ship, target) / BALL_SPEED;
  const lead = { x: target.x + Math.cos(target.heading) * targetSpeed * flight, y: target.y + Math.sin(target.heading) * targetSpeed * flight };
  const aim = out + Math.max(-ARC, Math.min(ARC, wrap(bearing(ship, lead) - out)));
  const r = radiusOf(ship);
  for (let i = 0; i < guns; i++) {
    const along = guns === 1 ? 0 : (i / (guns - 1) - 0.5) * r * 1.2;
    const x = ship.x + Math.cos(ship.heading) * along + Math.cos(out) * r * 0.6;
    const y = ship.y + Math.sin(ship.heading) * along + Math.sin(out) * r * 0.6;
    const dir = aim + (Math.random() * 2 - 1) * spread;
    s.balls.push({
      id: s.nextId++,
      x,
      y,
      vx: Math.cos(dir) * BALL_SPEED,
      vy: Math.sin(dir) * BALL_SPEED,
      ms: (range / BALL_SPEED) * 1000,
      damage,
      fromPlayer: ship.kind === 'player',
    });
    effect(s, 'smoke', x, y, 500);
  }
}

function moveBalls(s: GameState, dt: number) {
  s.balls = s.balls.filter((ball) => {
    ball.x += (ball.vx * dt) / 1000;
    ball.y += (ball.vy * dt) / 1000;
    ball.ms -= dt;
    const targets = ball.fromPlayer ? s.enemies : [s.player];
    const hit = targets.find((t) => t.hp > 0 && distance(ball, t) < radiusOf(t));
    if (hit) {
      hit.hp -= ball.damage;
      hit.hitMs = 160;
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
      s.gold += l.gold;
      s.plundered += l.gold;
      effect(s, 'coins', l.x, l.y, 900, { gold: l.gold });
      return false;
    }
    if (d < LOOT_PULL) {
      const step = Math.min(d, (LOOT_DRIFT * dt) / 1000);
      l.x += ((player.x - l.x) / d) * step;
      l.y += ((player.y - l.y) / d) * step;
    }
    return l.ms > 0;
  });
}

function reachHarbor(s: GameState) {
  s.phase = 'harbor';
  s.balls = [];
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
  s.phase = 'break';
  s.breakMs = BREAK_MS;
  s.loot = [];
}
