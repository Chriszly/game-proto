import { byDifficulty } from '../../../../shared/settings';
import { ARENA, BUILD_RANGE, NODE_CLEARANCE } from './arena';
import { COMBAT_UNITS, FACTIONS, type Faction, type Role, type UnitId } from './factions';
import type { MapLayout, Point } from './map';

/** The faction the player commands. */
export const PLAYER = 0;
/** Crystal every faction starts with. */
const START_CRYSTAL = 120;
/** How many units a building can have queued. */
const MAX_QUEUE = 5;
/** How many harvesters an AI faction keeps working. */
const AI_HARVESTERS = 4;
/** How often an AI faction spends and decides, in ms. */
const AI_THINK_MS = 1000;
/** How often an AI faction sends its army at the nearest enemy building, in ms. */
const AI_ATTACK_MS = 12000;
/** No AI faction attacks before this much game time, so every economy gets going first. */
const AI_GRACE_MS = 75000;
/** Game time a harvester takes to mine one crystal, in ms. */
const MINE_MS = 500;
const UNIT_RADIUS = 10;
const BEAM_MS = 140;
const BOOM_MS = 450;

/** Where a unit is going: a point to move to, or an entity to attack. */
export type Order = { kind: 'move'; x: number; y: number } | { kind: 'attack'; id: number; auto: boolean };

export interface Mining {
  node: number;
  phase: 'seek' | 'mine' | 'return';
  timer: number;
}

export interface Unit {
  kind: 'unit';
  id: number;
  faction: number;
  type: UnitId;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  order: Order | null;
  mining: Mining | null;
  carry: number;
}

export interface Building {
  kind: 'building';
  id: number;
  faction: number;
  type: Role;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  done: boolean;
  buildLeft: number;
  queue: UnitId[];
  trainLeft: number;
  cooldown: number;
}

export interface Node extends Point {
  id: number;
  amount: number;
}

/** A short-lived shot (a beam from x, y to x2, y2) or wreck (a ring of radius r at x, y). */
export interface Effect extends Point {
  color: number;
  life: number;
  x2?: number;
  y2?: number;
  r?: number;
}

export interface Side {
  index: number;
  def: Faction;
  crystal: number;
  alive: boolean;
  thinkMs: number;
  attackMs: number;
}

export interface Target {
  kind: 'unit' | 'building';
  id: number;
  faction: number;
}

/** How big an AI army gets before it attacks: the difficulty's balance number. */
const AI_ARMY_TO_ATTACK = byDifficulty(9, 6, 4);

/** A unit's numbers in its faction, with the faction's multipliers applied. */
export function unitStats(side: Side, type: UnitId) {
  const d = side.def.units[type];
  const t = side.def.tune;
  return {
    name: d.name,
    cost: Math.round(d.cost * t.cost),
    trainMs: d.trainMs,
    hp: Math.round(d.hp * t.hp),
    speed: d.speed * t.speed,
    sight: d.sight,
    weapon: d.weapon && { damage: Math.round(d.weapon.damage * t.damage), range: d.weapon.range, cooldownMs: d.weapon.cooldownMs },
  };
}

/** A building's numbers in its faction, with the faction's multipliers applied. */
export function buildingStats(side: Side, role: Role) {
  const d = side.def.buildings[role];
  const t = side.def.tune;
  return {
    name: d.name,
    cost: Math.round(d.cost * t.cost),
    hp: Math.round(d.hp * t.hp),
    radius: d.radius,
    weapon: d.weapon && { damage: Math.round(d.weapon.damage * t.damage), range: d.weapon.range, cooldownMs: d.weapon.cooldownMs },
  };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The battle on one map: crystal, the factions' bases and armies, and the rules that move them.
 * It has no Phaser in it; the scene draws `World` each frame and sends it the player's commands.
 */
export class World {
  readonly sides: Side[];
  readonly nodes: Node[];
  units: Unit[] = [];
  buildings: Building[] = [];
  beams: Effect[] = [];
  booms: Effect[] = [];
  phase: 'playing' | 'won' | 'lost' = 'playing';
  elapsedMs = 0;
  private nextId = 1;

  constructor(readonly layout: MapLayout) {
    this.sides = FACTIONS.map((def, index) => ({ index, def, crystal: START_CRYSTAL, alive: true, thinkMs: 0, attackMs: 0 }));
    this.nodes = layout.nodes.map((n) => ({ id: this.id(), x: n.x, y: n.y, amount: n.amount }));
    this.sides.forEach((side, index) => {
      const home = layout.homes[index];
      const hp = buildingStats(side, 'hub').hp;
      this.buildings.push({
        kind: 'building', id: this.id(), faction: index, type: 'hub', x: home.x, y: home.y,
        hp, maxHp: hp, done: true, buildLeft: 0, queue: [], trainLeft: 0, cooldown: 0,
      });
      this.spawn(index, 'harvester', home.x - 30, home.y + 34);
      this.spawn(index, 'harvester', home.x + 30, home.y + 34);
    });
  }

  private id() {
    return this.nextId++;
  }

  unit(id: number) {
    return this.units.find((u) => u.id === id);
  }

  building(id: number) {
    return this.buildings.find((b) => b.id === id);
  }

  hubOf(faction: number) {
    return this.buildings.find((b) => b.faction === faction && b.type === 'hub');
  }

  /** How many units of a faction are alive, or of one type. */
  count(faction: number, type?: UnitId) {
    return this.units.filter((u) => u.faction === faction && (!type || u.type === type)).length;
  }

  /** Why a building of `role` can't go at (x, y) for `faction`, or null when it can. */
  placementProblem(role: Role, x: number, y: number, faction = PLAYER): string | null {
    if (role === 'hub') return 'Hubs are not built';
    const side = this.sides[faction];
    const r = buildingStats(side, role).radius;
    if (x < ARENA.x + r || x > ARENA.x + ARENA.w - r || y < ARENA.y + r || y > ARENA.y + ARENA.h - r) {
      return 'Off the map';
    }
    const hub = this.hubOf(faction);
    if (!hub || dist(hub, { x, y }) > BUILD_RANGE) return 'Too far from your hub';
    if (this.buildings.some((b) => dist(b, { x, y }) < buildingStats(this.sides[b.faction], b.type).radius + r + 6)) {
      return 'Too close to a building';
    }
    if (this.layout.rocks.some((k) => dist(k, { x, y }) < k.r + r + 4)) return 'Blocked by rocks';
    if (this.nodes.some((n) => n.amount > 0 && dist(n, { x, y }) < NODE_CLEARANCE + r)) return 'Too close to crystal';
    return null;
  }

  /** Starts a building for `faction` at (x, y), paying for it. Returns why not, or null when it started. */
  build(role: Role, x: number, y: number, faction = PLAYER): string | null {
    if (this.phase !== 'playing') return 'The battle is over';
    const problem = this.placementProblem(role, x, y, faction);
    if (problem) return problem;
    const side = this.sides[faction];
    const stats = buildingStats(side, role);
    if (side.crystal < stats.cost) return 'Not enough crystal';
    side.crystal -= stats.cost;
    this.buildings.push({
      kind: 'building', id: this.id(), faction, type: role, x, y, hp: stats.hp, maxHp: stats.hp, done: false,
      buildLeft: side.def.buildings[role].buildMs, queue: [], trainLeft: 0, cooldown: 0,
    });
    return null;
  }

  /** Queues a unit for `faction`, paying for it: harvesters at the hub, the rest at a barracks. */
  train(type: UnitId, faction = PLAYER): string | null {
    if (this.phase !== 'playing') return 'The battle is over';
    const side = this.sides[faction];
    const cost = unitStats(side, type).cost;
    if (side.crystal < cost) return 'Not enough crystal';
    const producers = this.buildings.filter(
      (b) => b.faction === faction && b.done && b.type === (type === 'harvester' ? 'hub' : 'barracks'),
    );
    if (!producers.length) return type === 'harvester' ? 'No hub' : 'Build a Barracks first';
    const producer = producers.reduce((a, b) => (b.queue.length < a.queue.length ? b : a));
    if (producer.queue.length >= MAX_QUEUE) return 'Queue full';
    side.crystal -= cost;
    producer.queue.push(type);
    return null;
  }

  /**
   * The player's order to the selected combat units: attack what is at (x, y) when it is an enemy,
   * otherwise move there. Harvesters are not commanded.
   */
  command(ids: number[], x: number, y: number): boolean {
    if (this.phase !== 'playing') return false;
    const target = this.entityAt(x, y);
    const units = ids.map((id) => this.unit(id)).filter((u): u is Unit => !!u && this.commandable(u));
    for (const u of units) {
      u.order = target && target.faction !== PLAYER
        ? { kind: 'attack', id: target.id, auto: false }
        : { kind: 'move', x, y };
    }
    return units.length > 0;
  }

  /** The player's combat units inside a box, for box selection. */
  selectableIn(x0: number, y0: number, x1: number, y1: number): number[] {
    const left = Math.min(x0, x1), right = Math.max(x0, x1), top = Math.min(y0, y1), bottom = Math.max(y0, y1);
    return this.units
      .filter((u) => this.commandable(u) && u.x >= left && u.x <= right && u.y >= top && u.y <= bottom)
      .map((u) => u.id);
  }

  /** Whether a click on this unit selects it: only the player's combat units. */
  selectable(id: number): boolean {
    const u = this.unit(id);
    return !!u && this.commandable(u);
  }

  /** The nearest unit or building under (x, y), units first. */
  entityAt(x: number, y: number): Target | null {
    let best: Target | null = null;
    let bestD = Infinity;
    for (const u of this.units) {
      const d = dist(u, { x, y });
      if (d < UNIT_RADIUS + 2 && d < bestD) {
        best = { kind: 'unit', id: u.id, faction: u.faction };
        bestD = d;
      }
    }
    if (best) return best;
    for (const b of this.buildings) {
      const d = dist(b, { x, y });
      const r = buildingStats(this.sides[b.faction], b.type).radius + 4;
      if (d < r && d < bestD) {
        best = { kind: 'building', id: b.id, faction: b.faction };
        bestD = d;
      }
    }
    return best;
  }

  private commandable(u: Unit) {
    return u.faction === PLAYER && u.type !== 'harvester';
  }

  /** Advances the battle by `dt` milliseconds of game time. */
  update(dt: number) {
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    this.booms = this.booms.filter((b) => (b.life -= dt) > 0);
    if (this.phase !== 'playing') return;
    this.elapsedMs += dt;

    for (const b of [...this.buildings]) this.updateBuilding(b, dt);
    for (const u of [...this.units]) this.updateUnit(u, dt);
    for (const side of this.sides) {
      if (!side.alive || side.index === PLAYER) continue;
      side.thinkMs += dt;
      if (side.thinkMs >= AI_THINK_MS) {
        side.thinkMs = 0;
        this.think(side);
      }
    }
    this.removeDead();
    if (!this.sides[PLAYER].alive) this.phase = 'lost';
    else if (this.sides.every((s) => s.index === PLAYER || !s.alive)) this.phase = 'won';
  }

  private updateBuilding(b: Building, dt: number) {
    if (!b.done) {
      b.buildLeft -= dt;
      if (b.buildLeft <= 0) b.done = true;
      return;
    }
    const side = this.sides[b.faction];
    if (b.queue.length) {
      if (b.trainLeft <= 0) b.trainLeft = unitStats(side, b.queue[0]).trainMs;
      b.trainLeft -= dt;
      if (b.trainLeft <= 0) {
        const type = b.queue.shift()!;
        b.trainLeft = 0;
        this.spawn(b.faction, type, b.x, b.y + buildingStats(side, b.type).radius + 14);
      }
    }
    const weapon = buildingStats(side, b.type).weapon;
    if (!weapon) return;
    b.cooldown -= dt;
    if (b.cooldown > 0) return;
    const target = this.nearestEnemy(b, b.faction, weapon.range);
    if (target) {
      this.shoot(b, weapon.damage, target);
      b.cooldown = weapon.cooldownMs;
    }
  }

  private updateUnit(u: Unit, dt: number) {
    const stats = unitStats(this.sides[u.faction], u.type);
    u.cooldown -= dt;
    if (u.type === 'harvester') {
      this.harvest(u, dt, stats.speed);
      return;
    }
    if (!u.order) this.acquire(u, stats.sight);
    const order = u.order;
    if (!order) return;
    if (order.kind === 'move') {
      if (this.approach(u, order.x, order.y, 2, dt, stats.speed)) u.order = null;
      return;
    }
    const target = this.unit(order.id) ?? this.building(order.id);
    if (!target || target.hp <= 0) {
      u.order = null;
      return;
    }
    if (order.auto && dist(u, target) > stats.sight * 1.6) {
      u.order = null;
      return;
    }
    if (!stats.weapon) return;
    const stop = stats.weapon.range + this.radiusOf(target) - 4;
    if (dist(u, target) <= stop) {
      if (u.cooldown <= 0) {
        this.shoot(u, stats.weapon.damage, target);
        u.cooldown = stats.weapon.cooldownMs;
      }
    } else {
      this.approach(u, target.x, target.y, stop, dt, stats.speed);
    }
  }

  /** Units with no order pick the nearest enemy in sight. */
  private acquire(u: Unit, sight: number) {
    if (sight <= 0) return;
    const target = this.nearestEnemy(u, u.faction, sight);
    if (target) u.order = { kind: 'attack', id: target.id, auto: true };
  }

  /** The nearest enemy unit within range, or else the nearest enemy building. */
  private nearestEnemy(from: Point, faction: number, range: number): Unit | Building | null {
    for (const pool of [this.units, this.buildings] as (Unit | Building)[][]) {
      let best: Unit | Building | null = null;
      let bestD = range;
      for (const e of pool) {
        if (e.faction === faction) continue;
        const d = dist(from, e);
        if (d <= bestD) {
          best = e;
          bestD = d;
        }
      }
      if (best) return best;
    }
    return null;
  }

  private shoot(from: { x: number; y: number; faction: number }, damage: number, target: Unit | Building) {
    target.hp -= Math.round(damage);
    this.beams.push({ x: from.x, y: from.y, x2: target.x, y2: target.y, color: this.sides[from.faction].def.color, life: BEAM_MS });
  }

  private radiusOf(e: Unit | Building) {
    return e.kind === 'building' ? buildingStats(this.sides[e.faction], e.type).radius : UNIT_RADIUS;
  }

  /**
   * Moves `u` toward (x, y) at `speed`, stopping `stop` short of the point. Returns true once it is
   * there; the half pixel of slack lets a unit that stops at exactly `stop` count as arrived.
   */
  private approach(u: Point & { angle: number }, x: number, y: number, stop: number, dt: number, speed: number) {
    const d = Math.hypot(x - u.x, y - u.y);
    if (d <= stop + 0.5) return true;
    const step = Math.min(d - stop, (speed * dt) / 1000);
    u.x += ((x - u.x) / d) * step;
    u.y += ((y - u.y) / d) * step;
    u.angle = Math.atan2(y - u.y, x - u.x);
    return false;
  }

  /** Harvesters work on their own: seek a node, mine until full, carry the crystal to a drop-off. */
  private harvest(u: Unit, dt: number, speed: number) {
    const side = this.sides[u.faction];
    const m = u.mining ?? (u.mining = { node: -1, phase: 'seek', timer: 0 });
    if (m.phase === 'seek') {
      // Work the crystal nearest the hub first, so harvesters stay close to home and out of enemy range.
      const home = this.hubOf(u.faction) ?? u;
      const node = this.nodes.filter((n) => n.amount > 0).reduce<Node | null>(
        (best, n) => (!best || dist(n, home) < dist(best, home) ? n : best),
        null,
      );
      if (!node) return;
      m.node = node.id;
      m.phase = 'mine';
      m.timer = 0;
    }
    if (m.phase === 'mine') {
      const node = this.nodes.find((n) => n.id === m.node);
      if (!node || node.amount <= 0) {
        m.phase = u.carry > 0 ? 'return' : 'seek';
        return;
      }
      if (!this.approach(u, node.x, node.y, 12, dt, speed)) return;
      m.timer += dt;
      while (m.timer >= MINE_MS && node.amount > 0) {
        m.timer -= MINE_MS;
        node.amount -= 1;
        u.carry += 1;
        if (u.carry >= side.def.tune.carry) {
          m.phase = 'return';
          break;
        }
      }
      return;
    }
    const drops = this.buildings.filter((b) => b.faction === u.faction && b.done && (b.type === 'hub' || b.type === 'depot'));
    const drop = drops.reduce<Building | null>((best, b) => (!best || dist(b, u) < dist(best, u) ? b : best), null);
    if (!drop) return;
    const stop = buildingStats(side, drop.type).radius + 8;
    if (this.approach(u, drop.x, drop.y, stop, dt, speed)) {
      side.crystal += u.carry;
      u.carry = 0;
      m.phase = 'seek';
      m.timer = 0;
    }
  }

  private spawn(faction: number, type: UnitId, x: number, y: number) {
    const stats = unitStats(this.sides[faction], type);
    this.units.push({
      kind: 'unit', id: this.id(), faction, type,
      x: Math.min(ARENA.x + ARENA.w - 12, Math.max(ARENA.x + 12, x)),
      y: Math.min(ARENA.y + ARENA.h - 12, Math.max(ARENA.y + 12, y)),
      angle: -Math.PI / 2, hp: stats.hp, maxHp: stats.hp, cooldown: 0, order: null, mining: null, carry: 0,
    });
  }

  /** One AI round: keep harvesting, raise a base, train an army and send it at the nearest enemy building. */
  private think(side: Side) {
    const f = side.index;
    const hub = this.hubOf(f);
    if (!hub) return;
    const has = (role: Role) => this.buildings.some((b) => b.faction === f && b.type === role);
    if (this.count(f, 'harvester') < AI_HARVESTERS) this.train('harvester', f);
    if (!has('depot')) this.placeNear('depot', f);
    if (!has('barracks')) this.placeNear('barracks', f);
    const turrets = this.buildings.filter((b) => b.faction === f && b.type === 'turret').length;
    if (turrets < 2 && side.crystal >= buildingStats(side, 'turret').cost + 40) this.placeNear('turret', f);
    for (const type of [...COMBAT_UNITS].sort(() => Math.random() - 0.5)) {
      if (this.train(type, f) === null) break;
    }
    side.attackMs += AI_THINK_MS;
    const army = this.units.filter((u) => u.faction === f && u.type !== 'harvester');
    if (this.elapsedMs < AI_GRACE_MS || army.length < AI_ARMY_TO_ATTACK || side.attackMs < AI_ATTACK_MS) return;
    side.attackMs = 0;
    const target = this.nearestEnemyBuilding(hub, f);
    if (!target) return;
    for (const u of army) u.order = { kind: 'attack', id: target.id, auto: false };
  }

  private placeNear(role: Role, faction: number) {
    const hub = this.hubOf(faction);
    if (!hub) return;
    for (let tries = 0; tries < 16; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 90;
      const x = hub.x + Math.cos(angle) * d;
      const y = hub.y + Math.sin(angle) * d;
      if (this.placementProblem(role, x, y, faction) === null) {
        this.build(role, x, y, faction);
        return;
      }
    }
  }

  private nearestEnemyBuilding(from: Point, faction: number): Building | null {
    let best: Building | null = null;
    for (const b of this.buildings) {
      if (b.faction === faction) continue;
      if (!best || dist(b, from) < dist(best, from)) best = b;
    }
    return best;
  }

  /** Removes what has run out of hit points; a fallen hub takes its whole faction with it. */
  private removeDead() {
    const fallen = new Set<number>();
    for (const b of this.buildings) {
      if (b.hp > 0) continue;
      this.wreck(b);
      if (b.type === 'hub') fallen.add(b.faction);
    }
    for (const u of this.units) if (u.hp <= 0) this.wreck(u);
    // The rest of a fallen faction's ships and buildings go up with its hub.
    for (const b of this.buildings) if (fallen.has(b.faction) && b.hp > 0) this.wreck(b);
    for (const u of this.units) if (fallen.has(u.faction) && u.hp > 0) this.wreck(u);
    this.buildings = this.buildings.filter((b) => b.hp > 0 && !fallen.has(b.faction));
    this.units = this.units.filter((u) => u.hp > 0 && !fallen.has(u.faction));
    for (const f of fallen) {
      this.sides[f].alive = false;
      this.sides[f].crystal = 0;
    }
  }

  private wreck(e: Unit | Building) {
    this.booms.push({ x: e.x, y: e.y, color: this.sides[e.faction].def.color, life: BOOM_MS, r: this.radiusOf(e) });
  }
}
