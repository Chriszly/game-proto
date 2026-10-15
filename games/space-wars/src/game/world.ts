import { byDifficulty } from '../../../../shared/settings';
import { aiLog } from '../../../../shared/watch';
import { ARENA, BUILD_RANGE, NODE_AMOUNT, NODE_CLEARANCE } from './arena';
import { COMBAT_UNITS, FACTIONS, type Ability, type Faction, type Role, type UnitId } from './factions';
import type { MapLayout, Point } from './map';
import { CONTRACTS, NO_PERKS, type Perks } from './contracts';
import { Fog } from './fog';
import {
  RESEARCH_COSTS, RESEARCH_LEVELS, RESEARCH_MS, RESEARCH_STEP, TRACKS, TRACK_DEFS, noResearch, researchBonus,
  type Research, type Track,
} from './research';

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
/** After this much game time, the rival nearest the relay beacon sends one warship (a picket) to contest it. */
const AI_PICKET_MS = 30000;
/** Game time a harvester takes to mine one crystal, in ms. */
const MINE_MS = 500;
const UNIT_RADIUS = 10;
const BEAM_MS = 140;
const BOOM_MS = 450;
/** The relay beacon: how close a ship must be to hold it, how long a lone faction takes to capture it, and its pay. */
export const BEACON_RADIUS = 70;
export const CAPTURE_MS = 5000;
export const BEACON_PAY = 3;
const BEACON_PAY_MS = 1000;
/** Where the relay beacon goes: the loose crystal node nearest this share of the way from the player's start to the map's centre. */
const BEACON_TOWARD = 0.5;
/** How far the relay beacon stays from the player's start, beyond what the hub sees (HUB_VISION), so it has to be found. */
const BEACON_HOME_GAP = 200;
/** How far the relay beacon stays from every rival's start, so it sits in open space. */
const BEACON_RIVAL_GAP = 300;
/** Salvage: what a shard is worth, how far a ship pulls it in from, how fast it flies, and how long it lasts. */
export const SHARD_VALUE = 8;
export const SHARD_MAGNET = 260;
const SHARD_SPEED = 220;
const SHARD_LIFE_MS = 45000;
/** How long a floating number (+8, +3) shows, in ms. */
export const POP_MS = 1400;
/**
 * Fog of war: how far the player's ships and buildings see. A ship sees a share beyond its weapon
 * sight, a scout furthest of all, so scouts are the ones to send out; a harvester sees a little.
 */
const SCOUT_VISION = 1.6;
const SHIP_VISION = 1.2;
const HARVESTER_VISION = 80;
const HUB_VISION = 175;
/** A building other than a hub sees this far past its own edge. */
const BUILDING_VISION = 110;
/** How close a player ship must be to spot a rival's hidden mine. */
export const MINE_SPOT = 60;
/**
 * Expansions: a second hub at a far crystal field. Its cost and build time, its hit points as a
 * share of the main hub's, how close to a crystal node it must go and how far from the faction's
 * other hubs.
 */
export const EXPANSION_COST = 250;
const EXPANSION_MS = 18000;
const EXPANSION_HP = 0.6;
export const EXPANSION_NEAR = 120;
export const EXPANSION_GAP = 400;
/** The AI expands after this much game time, to a field at least this far from every other faction's hubs. */
const AI_EXPAND_MS = 150000;
const AI_EXPAND_RIVAL_GAP = 300;
/** Harvesters an AI faction adds for each expansion. */
const AI_EXPANSION_HARVESTERS = 3;
/** The AI starts research after this much game time. */
const AI_RESEARCH_MS = 120000;
/** How many rivals contest the beacon, and how much later each one after the nearest joins in. */
const AI_PICKETS = 2;
const AI_PICKET_STAGGER_MS = 90000;
/** The most warships an AI keeps; past it, it saves its crystal. */
const AI_MAX_ARMY = 20;
/** Warships an AI keeps home when it attacks, nearest its hub first. */
const AI_HOME_GUARD = 2;
/** How far an idle AI warship goes to fetch its faction's salvage shard. */
const AI_SALVAGE_REACH = 360;

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
  /** Counts toward an ability's cadence (a brood or a decoy), in ms. */
  timer: number;
  /** Time left before a shot shows a cloaked unit again, in ms. */
  revealMs: number;
  /** For a decoy: the time it has left, in ms; null for everything else. */
  decoyMs: number | null;
  /** The faction whose shot hit it last, or -1: who gets the kill. */
  lastHit: number;
  /** For a harvester: the hub (main or expansion) whose crystal it works, by id; -1 for the rest. */
  home: number;
}

/** What a faction can build: the buildings beside a hub, and an expansion (a second hub) at a far crystal field. */
export type Build = Exclude<Role, 'hub'> | 'expansion';

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
  /** Time a hack has left before a turret fires again, in ms. */
  disabledMs: number;
  /** Hack hits landed while it was dark; enough of them take it over. */
  hacks: number;
  /** Counts toward the next mine a Mine Lattice lays, in ms. */
  layMs: number;
  /** The faction whose shot hit it last, or -1. */
  lastHit: number;
  /** A hub built at a far crystal field: it trains harvesters and takes crystal, but its fall does not end the faction. */
  expansion: boolean;
  /** Game time the whole construction takes, in ms. */
  buildMs: number;
}

/** A hidden mine a Mine Lattice laid; an enemy ship that comes close sets it off. */
export interface Mine extends Point {
  id: number;
  faction: number;
  /** The lattice that laid it. */
  from: number;
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
  /** Rank perks from finished contracts (the player's only). */
  perks: Perks;
  /** The warship this rival has sent to contest the relay beacon, or -1. */
  picket: number;
  /** Hull, weapons and engines research, bought at the hub. */
  research: Research;
  /** The faction that hit this one last, or -1: an AI sends its army after it. */
  grudge: number;
}

/**
 * The relay beacon, on a crystal node in mid-map. A faction alone in its ring fills `capture`
 * (draining a rival's first); at 1 it owns the beacon, which pays BEACON_PAY crystal a second
 * while one of its ships is in the ring (`held`).
 */
export interface Beacon extends Point {
  owner: number;
  /** Who the capture progress belongs to, or -1. */
  capturer: number;
  capture: number;
  held: boolean;
  payMs: number;
  /** Crystal the beacon has paid the player so far. */
  paid: number;
}

/** A glowing salvage shard left by a destroyed ship for the faction that destroyed it; its nearest ship pulls it in. */
export interface Shard extends Point {
  id: number;
  /** The faction the shard pays. */
  faction: number;
  value: number;
  life: number;
}

/** A floating number over the map (+8 salvage, +3 relay), for the scene to show. */
export interface Pop extends Point {
  text: string;
  color: number;
  life: number;
}

/** The current contract: its index in CONTRACTS (CONTRACTS.length once all are done) and progress. */
export interface ContractState {
  index: number;
  progress: number;
}

/** Things the scene shows once: a notice on the command bar, or crystal gained (flashed by the count). */
export type WorldEvent = { kind: 'notice'; text: string } | { kind: 'gain'; amount: number };

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
  const p = side.perks;
  const r = side.research;
  return {
    name: d.name,
    cost: Math.round(d.cost * t.cost),
    trainMs: Math.round(d.trainMs * p.train),
    hp: Math.round(d.hp * t.hp * p.hp * researchBonus(r, 'hull')),
    speed: d.speed * t.speed * p.speed * researchBonus(r, 'engines'),
    sight: d.sight,
    weapon: d.weapon && {
      damage: Math.round(d.weapon.damage * t.damage * p.damage * researchBonus(r, 'weapons')),
      range: d.weapon.range,
      cooldownMs: d.weapon.cooldownMs,
    },
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
    weapon: d.weapon && { damage: Math.round(d.weapon.damage * t.damage), range: Math.round(d.weapon.range * side.perks.turretRange), cooldownMs: d.weapon.cooldownMs },
  };
}

/** An expansion's numbers in a faction: a smaller copy of its hub. */
export function expansionStats(side: Side) {
  const hub = buildingStats(side, 'hub');
  return {
    name: `${hub.name.split(' ')[0]} Outpost`,
    cost: Math.round(EXPANSION_COST * side.def.tune.cost),
    hp: Math.round(hub.hp * EXPANSION_HP),
    radius: hub.radius,
    buildMs: EXPANSION_MS,
  };
}

/** What something on the build buttons costs and is called in a faction. */
export function buildInfo(side: Side, what: Build) {
  if (what === 'expansion') return expansionStats(side);
  const s = buildingStats(side, what);
  return { ...s, buildMs: side.def.buildings[what].buildMs };
}

/** What the next level of a research track costs a faction (the last level's cost once it is maxed). */
export function researchCost(side: Side, track: Track) {
  const level = Math.min(side.research.levels[track], RESEARCH_LEVELS - 1);
  return Math.round(RESEARCH_COSTS[level] * side.def.tune.cost);
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
  readonly beacon: Beacon;
  shards: Shard[] = [];
  mines: Mine[] = [];
  pops: Pop[] = [];
  /** What the player can see: cells in sight now and cells explored before. */
  readonly fog = new Fog();
  /** Rival buildings the player has seen, which stay drawn under the fog. */
  readonly known = new Set<number>();
  /** The contract chain's place: which contract is current and how far along it is. */
  contract: ContractState = { index: 0, progress: 0 };
  /** Crystal the player has collected from salvage shards. */
  salvaged = 0;
  /** Enemy ships the player has destroyed. */
  kills = 0;
  /** One-off things for the scene to show; it empties the list as it reads them. */
  events: WorldEvent[] = [];
  private nextId = 1;

  /** The last faction standing in a watched battle (a side index), or -1. */
  winner = -1;

  /**
   * `pick` is the faction the player commands, an index into `FACTIONS`. It takes the player's start
   * point (slot 0); the other factions fill the rest in their usual order. With `watch` the AI plays
   * slot 0 too, nothing is fogged, and the battle ends when one faction is left (`winner`).
   */
  constructor(readonly layout: MapLayout, pick = 0, readonly watch = false) {
    const order = [pick, ...FACTIONS.map((_, i) => i).filter((i) => i !== pick)];
    this.sides = order.map((f, index) => ({
      index, def: FACTIONS[f], crystal: START_CRYSTAL, alive: true, thinkMs: 0, attackMs: 0, perks: { ...NO_PERKS }, picket: -1,
      research: noResearch(), grudge: -1,
    }));
    const nodes = layout.nodes.map((n) => ({ id: this.id(), x: n.x, y: n.y, amount: n.amount }));
    // One loose crystal node partway to the centre becomes the relay beacon and is no longer mined.
    const home = layout.homes[0];
    const toward = { x: home.x + (ARENA.x + ARENA.w / 2 - home.x) * BEACON_TOWARD, y: home.y + (ARENA.y + ARENA.h / 2 - home.y) * BEACON_TOWARD };
    const loose = nodes.slice(layout.homes.length * 3).filter((n) => layout.homes.every((h, i) => dist(h, n) > (i === 0 ? BEACON_HOME_GAP : BEACON_RIVAL_GAP)));
    const spot = (loose.length ? loose : nodes).reduce((a, b) => (dist(b, toward) < dist(a, toward) ? b : a));
    this.nodes = nodes.filter((n) => n !== spot);
    this.beacon = { x: spot.x, y: spot.y, owner: -1, capturer: -1, capture: 0, held: false, payMs: 0, paid: 0 };
    this.sides.forEach((side, index) => {
      const home = layout.homes[index];
      const hp = buildingStats(side, 'hub').hp;
      const hub: Building = {
        kind: 'building', id: this.id(), faction: index, type: 'hub', x: home.x, y: home.y,
        hp, maxHp: hp, done: true, buildLeft: 0, queue: [], trainLeft: 0, cooldown: 0, disabledMs: 0, hacks: 0, layMs: 0,
        lastHit: -1, expansion: false, buildMs: 0,
      };
      this.buildings.push(hub);
      this.spawn(index, 'harvester', home.x - 30, home.y + 34).home = hub.id;
      this.spawn(index, 'harvester', home.x + 30, home.y + 34).home = hub.id;
    });
    this.updateFog();
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

  /** A faction's main hub: the one it started with, whose fall ends it. */
  hubOf(faction: number) {
    return this.buildings.find((b) => b.faction === faction && b.type === 'hub' && !b.expansion);
  }

  /** A faction's hubs, main and expansions; `done` leaves out expansions still being built. */
  hubsOf(faction: number, done = false) {
    return this.buildings.filter((b) => b.faction === faction && b.type === 'hub' && (!done || b.done));
  }

  /** Whether the player sees a unit now: its own, or a rival's in sight and not cloaked. */
  seesUnit(u: Unit) {
    return u.faction === PLAYER || (this.fog.sees(u) && !this.hidden(u, PLAYER));
  }

  /** Whether the player knows a building is there: its own, or a rival's it has seen. */
  knowsBuilding(b: Building) {
    return b.faction === PLAYER || this.known.has(b.id);
  }

  /** Whether the player sees a mine: its own, or a rival's in sight with a player ship close by. */
  seesMine(m: Mine) {
    if (m.faction === PLAYER) return true;
    return this.fog.sees(m) && this.units.some((u) => u.faction === PLAYER && dist(u, m) <= MINE_SPOT);
  }

  /** How many units of a faction are alive, or of one type. */
  count(faction: number, type?: UnitId) {
    return this.units.filter((u) => u.faction === faction && (!type || u.type === type)).length;
  }

  /**
   * Why a building of `role` can't go at (x, y) for `faction`, or null when it can. Buildings go
   * within BUILD_RANGE of one of the faction's finished hubs; an expansion goes beside a crystal
   * node far from them. The player can only build where it has explored.
   */
  placementProblem(role: Build, x: number, y: number, faction = PLAYER): string | null {
    const side = this.sides[faction];
    const r = buildInfo(side, role).radius;
    if (x < ARENA.x + r || x > ARENA.x + ARENA.w - r || y < ARENA.y + r || y > ARENA.y + ARENA.h - r) {
      return 'Off the map';
    }
    if (faction === PLAYER && !this.fog.knows({ x, y })) return 'Scout there first';
    if (!this.hubOf(faction)) return 'No hub';
    if (role === 'expansion') {
      if (this.hubsOf(faction).some((h) => dist(h, { x, y }) < EXPANSION_GAP)) return 'Too close to your hubs: pick a far crystal field';
      if (!this.nodes.some((n) => n.amount > 0 && dist(n, { x, y }) <= EXPANSION_NEAR)) return 'Build it beside a crystal field';
    } else if (!this.hubsOf(faction, true).some((h) => dist(h, { x, y }) <= BUILD_RANGE)) {
      return 'Too far from your hub';
    }
    if (this.buildings.some((b) => dist(b, { x, y }) < buildingStats(this.sides[b.faction], b.type).radius + r + 6)) {
      return 'Too close to a building';
    }
    if (this.layout.rocks.some((k) => dist(k, { x, y }) < k.r + r + 4)) return 'Blocked by rocks';
    if (this.nodes.some((n) => n.amount > 0 && dist(n, { x, y }) < NODE_CLEARANCE + r)) return 'Too close to crystal';
    if (dist(this.beacon, { x, y }) < NODE_CLEARANCE + r + 10) return 'Too close to the relay beacon';
    return null;
  }

  /** Starts a building for `faction` at (x, y), paying for it. Returns why not, or null when it started. */
  build(role: Build, x: number, y: number, faction = PLAYER): string | null {
    if (this.phase !== 'playing') return 'The battle is over';
    const problem = this.placementProblem(role, x, y, faction);
    if (problem) return problem;
    const side = this.sides[faction];
    const stats = buildInfo(side, role);
    if (side.crystal < stats.cost) return 'Not enough crystal';
    side.crystal -= stats.cost;
    this.buildings.push({
      kind: 'building', id: this.id(), faction, type: role === 'expansion' ? 'hub' : role, x, y, hp: stats.hp, maxHp: stats.hp,
      done: false, buildLeft: stats.buildMs, queue: [], trainLeft: 0, cooldown: 0, disabledMs: 0, hacks: 0, layMs: 0,
      lastHit: -1, expansion: role === 'expansion', buildMs: stats.buildMs,
    });
    return null;
  }

  /** Starts the next level of a research track at `faction`'s hub, paying for it. Returns why not, or null. */
  research(track: Track, faction = PLAYER): string | null {
    if (this.phase !== 'playing') return 'The battle is over';
    const side = this.sides[faction];
    if (!this.hubOf(faction)) return 'No hub';
    const r = side.research;
    if (r.current) return `Already researching ${TRACK_DEFS[r.current.track].name}`;
    if (r.levels[track] >= RESEARCH_LEVELS) return `${TRACK_DEFS[track].name} is fully researched`;
    const cost = researchCost(side, track);
    if (side.crystal < cost) return 'Not enough crystal';
    side.crystal -= cost;
    r.current = { track, left: RESEARCH_MS };
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
    if (!producers.length) {
      return type === 'harvester' ? 'No hub' : `Build the ${side.def.buildings.barracks.name} (barracks) first`;
    }
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
      if (d < UNIT_RADIUS + 2 && d < bestD && this.seesUnit(u)) {
        best = { kind: 'unit', id: u.id, faction: u.faction };
        bestD = d;
      }
    }
    if (best) return best;
    for (const b of this.buildings) {
      const d = dist(b, { x, y });
      const r = buildingStats(this.sides[b.faction], b.type).radius + 4;
      if (d < r && d < bestD && this.knowsBuilding(b)) {
        best = { kind: 'building', id: b.id, faction: b.faction };
        bestD = d;
      }
    }
    return best;
  }

  private commandable(u: Unit) {
    return u.faction === PLAYER && u.type !== 'harvester' && u.decoyMs === null;
  }

  /** Advances the battle by `dt` milliseconds of game time. */
  update(dt: number) {
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    this.booms = this.booms.filter((b) => (b.life -= dt) > 0);
    this.pops = this.pops.filter((p) => (p.life -= dt) > 0);
    if (this.phase !== 'playing') return;
    this.elapsedMs += dt;

    for (const b of [...this.buildings]) this.updateBuilding(b, dt);
    for (const u of [...this.units]) this.updateUnit(u, dt);
    for (const side of this.sides) {
      if (!side.alive || (side.index === PLAYER && !this.watch)) continue;
      side.thinkMs += dt;
      if (side.thinkMs >= AI_THINK_MS) {
        side.thinkMs = 0;
        this.think(side);
      }
    }
    this.updateMines();
    this.removeDead();
    this.updateResearch(dt);
    this.updateBeacon(dt);
    this.updateShards(dt);
    // Contracts are the player's; a watched battle gives nobody their perks.
    if (!this.watch) this.updateContract();
    this.updateFog();
    if (this.watch) {
      const left = this.sides.filter((s) => s.alive);
      if (left.length <= 1) {
        this.winner = left[0]?.index ?? -1;
        this.phase = 'won';
      }
    } else if (!this.sides[PLAYER].alive) this.phase = 'lost';
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
        const unit = this.spawn(b.faction, type, b.x, b.y + buildingStats(side, b.type).radius + 14);
        if (type === 'harvester') unit.home = b.id;
      }
    }
    if (b.disabledMs > 0) {
      b.disabledMs = Math.max(0, b.disabledMs - dt);
      // A hack that runs out before the takeover leaves the turret as it was.
      if (b.disabledMs <= 0) b.hacks = 0;
    }
    const ability = this.abilityOf(b);
    if (ability?.kind === 'mines' && b.disabledMs <= 0) {
      b.layMs += dt;
      if (b.layMs >= ability.everyMs) {
        b.layMs = 0;
        this.layMine(b, ability.reach, ability.cap);
      }
    }
    const weapon = buildingStats(side, b.type).weapon;
    if (!weapon) return;
    b.cooldown -= dt;
    if (b.cooldown > 0 || b.disabledMs > 0) return;
    const target = this.nearestEnemy(b, b.faction, weapon.range);
    if (target) {
      this.shoot(b, weapon.damage, target);
      b.cooldown = weapon.cooldownMs;
    }
  }

  private updateUnit(u: Unit, dt: number) {
    const stats = unitStats(this.sides[u.faction], u.type);
    const ability = this.abilityOf(u);
    u.cooldown -= dt;
    u.revealMs = Math.max(0, u.revealMs - dt);
    if (u.decoyMs !== null) {
      // A decoy only draws fire: it never acts, and it fades when its time runs out.
      u.decoyMs -= dt;
      if (u.decoyMs <= 0) u.hp = 0;
      return;
    }
    if (ability?.kind === 'decoy' || ability?.kind === 'brood') {
      u.timer += dt;
      if (u.timer >= ability.everyMs) {
        u.timer = 0;
        this.ability(u, ability);
      }
    }
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
    // A target can change sides when a hack takes it over.
    if (!target || target.hp <= 0 || target.faction === u.faction || this.hidden(target, u.faction)) {
      u.order = null;
      return;
    }
    if (order.auto && dist(u, target) > stats.sight * 1.6) {
      u.order = null;
      return;
    }
    if (!stats.weapon) return;
    const stop = stats.weapon.range + this.radiusOf(target) - 4;
    // Same slack as `approach`, so a unit that stopped at its range can always fire.
    if (dist(u, target) <= stop + 0.5) {
      if (u.cooldown <= 0) {
        this.shoot(u, stats.weapon.damage, target);
        u.cooldown = stats.weapon.cooldownMs;
      }
    } else {
      this.approach(u, target.x, target.y, stop, dt, stats.speed);
    }
  }

  /** The ability a unit or building carries, from its faction's definition. */
  private abilityOf(e: Unit | Building): Ability | undefined {
    const def = this.sides[e.faction].def;
    return e.kind === 'unit' ? def.units[e.type].ability : def.buildings[e.type].ability;
  }

  /** Whether `e` is hidden from `faction`: a cloaked unit that has not fired lately, seen only by its own side. */
  hidden(e: Unit | Building, faction: number) {
    return e.faction !== faction && e.kind === 'unit' && e.revealMs <= 0 && this.abilityOf(e)?.kind === 'cloak';
  }

  /** Carries out a unit's cadenced ability: a decoy copy of itself, or a scout from a brood carrier. */
  private ability(u: Unit, ability: Ability) {
    if (ability.kind === 'decoy') {
      const copy = this.spawn(u.faction, u.type, u.x + 14, u.y + 14, ability.lifeMs);
      copy.hp = Math.round(copy.maxHp / 2);
      copy.maxHp = copy.hp;
    } else if (ability.kind === 'brood' && this.count(u.faction, 'scout') < ability.cap) {
      this.spawn(u.faction, 'scout', u.x, u.y + 16);
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
        if (e.faction === faction || this.hidden(e, faction)) continue;
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

  /** One shot from `from` at `target`: shields soak part of it, and the shot's own ability acts. */
  private shoot(from: Unit | Building, damage: number, target: Unit | Building) {
    const dealt = Math.round(damage * this.shieldShare(target));
    target.hp -= dealt;
    target.lastHit = from.faction;
    this.beams.push({ x: from.x, y: from.y, x2: target.x, y2: target.y, color: this.sides[from.faction].def.color, life: BEAM_MS });
    if (from.kind === 'unit') {
      const ability = this.abilityOf(from);
      if (ability?.kind === 'cloak') from.revealMs = ability.revealMs;
    }
    // Whoever is hit holds a grudge: an AI sends its next attack at that faction.
    if (from.faction !== target.faction) this.sides[target.faction].grudge = from.faction;
    const ability = this.abilityOf(from);
    if (ability?.kind === 'hack' && target.kind === 'building' && this.sides[target.faction].def.buildings[target.type].weapon) {
      target.disabledMs = ability.disableMs;
      target.hacks += 1;
      if (target.hacks >= ability.takeover && target.hp > 0) this.takeOver(target, from.faction);
    }
    if (ability?.kind === 'splash') {
      this.booms.push({ x: target.x, y: target.y, color: this.sides[from.faction].def.color, life: BOOM_MS, r: ability.radius });
      for (const e of [...this.units, ...this.buildings]) {
        if (e === target || e.faction === from.faction || dist(e, target) > ability.radius) continue;
        e.hp -= Math.round(damage * ability.share);
        e.lastHit = from.faction;
      }
    }
  }

  /** A hacked turret changes sides: it becomes the hacker's own turret, as damaged as it was. */
  private takeOver(b: Building, faction: number) {
    const from = b.faction;
    const was = this.sides[from].def.buildings[b.type].name;
    const stats = buildingStats(this.sides[faction], b.type);
    b.faction = faction;
    b.hp = Math.max(1, Math.round((stats.hp * b.hp) / b.maxHp));
    b.maxHp = stats.hp;
    b.hacks = 0;
    b.disabledMs = 0;
    b.cooldown = 0;
    b.layMs = 0;
    b.lastHit = -1;
    this.booms.push({ x: b.x, y: b.y, color: this.sides[faction].def.color, life: BOOM_MS, r: stats.radius + 10 });
    if (faction === PLAYER) this.events.push({ kind: 'notice', text: `Hacked: the ${was} is yours now` });
    else if (from === PLAYER) this.events.push({ kind: 'notice', text: `Your ${was} was hacked and taken over` });
  }

  /** A Mine Lattice lays a mine at a random spot in its reach, while it has fewer than `cap` out. */
  private layMine(b: Building, reach: number, cap: number) {
    if (this.mines.filter((m) => m.from === b.id).length >= cap) return;
    const angle = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * (reach - 40);
    this.mines.push({
      id: this.id(), faction: b.faction, from: b.id,
      x: Math.min(ARENA.x + ARENA.w - 8, Math.max(ARENA.x + 8, b.x + Math.cos(angle) * d)),
      y: Math.min(ARENA.y + ARENA.h - 8, Math.max(ARENA.y + 8, b.y + Math.sin(angle) * d)),
    });
  }

  /** A mine goes off when an enemy ship comes close: it hurts every enemy ship in its blast. */
  private updateMines() {
    this.mines = this.mines.filter((m) => {
      const def = this.sides[m.faction].def.buildings.turret.ability;
      if (def?.kind !== 'mines' || !this.sides[m.faction].alive) return false;
      if (!this.units.some((u) => u.faction !== m.faction && u.hp > 0 && dist(u, m) <= def.trigger)) return true;
      for (const u of this.units) {
        if (u.faction === m.faction || dist(u, m) > def.radius) continue;
        u.hp -= Math.round(def.damage * this.shieldShare(u));
        u.lastHit = m.faction;
      }
      this.booms.push({ x: m.x, y: m.y, color: this.sides[m.faction].def.color, life: BOOM_MS, r: def.radius });
      return false;
    });
  }

  /** Research under way at each hub: when a level is done, it applies to every ship of the faction. */
  private updateResearch(dt: number) {
    for (const side of this.sides) {
      const cur = side.research.current;
      if (!side.alive || !cur) continue;
      cur.left -= dt;
      if (cur.left > 0) continue;
      const before = researchBonus(side.research, cur.track);
      side.research.levels[cur.track] += 1;
      side.research.current = null;
      if (cur.track === 'hull') {
        // Ships already flying get the new plating too, keeping their share of hit points.
        const k = researchBonus(side.research, 'hull') / before;
        for (const u of this.units) {
          if (u.faction !== side.index || u.decoyMs !== null) continue;
          u.maxHp = Math.round(u.maxHp * k);
          u.hp = Math.min(u.maxHp, u.hp * k);
        }
      }
      if (side.index === PLAYER) {
        this.events.push({
          kind: 'notice',
          text: `${TRACK_DEFS[cur.track].name} ${side.research.levels[cur.track]} done: ships +${Math.round(RESEARCH_STEP * 100)}% ${TRACK_DEFS[cur.track].effect}`,
        });
      }
    }
  }

  /** What the player sees this update: everything within sight of its ships and buildings. */
  private updateFog() {
    const fog = this.fog;
    if (this.watch) {
      // Watching, the whole battlefield is in sight.
      fog.visible.fill(1);
      fog.explored.fill(1);
      for (const b of this.buildings) this.known.add(b.id);
      return;
    }
    fog.clear();
    for (const u of this.units) {
      if (u.faction !== PLAYER) continue;
      const sight = this.sides[PLAYER].def.units[u.type].sight;
      fog.stamp(u.x, u.y, u.type === 'harvester' ? HARVESTER_VISION : sight * (u.type === 'scout' ? SCOUT_VISION : SHIP_VISION));
    }
    for (const b of this.buildings) {
      if (b.faction !== PLAYER) continue;
      fog.stamp(b.x, b.y, b.type === 'hub' ? HUB_VISION : buildingStats(this.sides[PLAYER], b.type).radius + BUILDING_VISION);
    }
    // A rival building, once seen, stays drawn where it was seen.
    for (const b of this.buildings) if (b.faction !== PLAYER && fog.sees(b)) this.known.add(b.id);
  }

  /** The share of a shot that reaches a unit: a Halo Cruiser's shield lets through half, from friends in range. */
  private shieldShare(target: Unit | Building) {
    if (target.kind !== 'unit') return 1;
    for (const s of this.units) {
      const ability = this.abilityOf(s);
      if (s.faction === target.faction && ability?.kind === 'shield' && dist(s, target) <= ability.range) return ability.share;
    }
    return 1;
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
      const home = this.building(u.home) ?? this.hubOf(u.faction) ?? u;
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

  /** Makes a unit of `faction` at (x, y), kept on the field; a decoy when `decoyMs` is given. */
  private spawn(faction: number, type: UnitId, x: number, y: number, decoyMs: number | null = null): Unit {
    const stats = unitStats(this.sides[faction], type);
    const unit: Unit = {
      kind: 'unit', id: this.id(), faction, type,
      x: Math.min(ARENA.x + ARENA.w - 12, Math.max(ARENA.x + 12, x)),
      y: Math.min(ARENA.y + ARENA.h - 12, Math.max(ARENA.y + 12, y)),
      angle: -Math.PI / 2, hp: stats.hp, maxHp: stats.hp, cooldown: 0, order: null, mining: null, carry: 0,
      timer: 0, revealMs: 0, decoyMs, lastHit: -1, home: -1,
    };
    this.units.push(unit);
    return unit;
  }

  /**
   * One AI round: keep harvesting, raise a base, expand and research once the economy is going,
   * train an army, fetch salvage, contest the beacon, and send the army at the faction that hit it
   * last (or else the nearest enemy building).
   */
  private think(side: Side) {
    const f = side.index;
    const hub = this.hubOf(f);
    if (!hub) return;
    const has = (role: Role) => this.buildings.some((b) => b.faction === f && b.type === role);
    const expansions = this.hubsOf(f).length - 1;
    if (this.count(f, 'harvester') < AI_HARVESTERS + expansions * AI_EXPANSION_HARVESTERS) this.train('harvester', f);
    if (!has('depot')) this.placeNear('depot', f);
    if (!has('barracks')) this.placeNear('barracks', f);
    const turrets = this.buildings.filter((b) => b.faction === f && b.type === 'turret').length;
    if (turrets < 2 && side.crystal >= buildingStats(side, 'turret').cost + 40) this.placeNear('turret', f);
    const army = this.units.filter((u) => u.faction === f && u.type !== 'harvester' && u.decoyMs === null);
    // Once the opening is over, an AI with a fair army saves up to expand and to research.
    let saving = false;
    if (this.elapsedMs >= AI_EXPAND_MS && expansions === 0) {
      if (side.crystal >= expansionStats(side).cost) {
        if (this.expand(f)) aiLog(String(f), 'builds an outpost on a new crystal field');
      }
      else saving = true;
    }
    if (this.elapsedMs >= AI_RESEARCH_MS && !side.research.current && has('barracks')) {
      // The lowest track next, picked at random among equals.
      const open = TRACKS.filter((t) => side.research.levels[t] < RESEARCH_LEVELS);
      const low = open.filter((t) => side.research.levels[t] === Math.min(...open.map((o) => side.research.levels[o])));
      const track = low[Math.floor(Math.random() * low.length)];
      if (track && side.crystal >= researchCost(side, track) && this.research(track, f) === null) {
        aiLog(String(f), `researches ${TRACK_DEFS[track].name} ${side.research.levels[track] + 1}`);
      }
      else if (track) saving = true;
    }
    if (army.length < AI_MAX_ARMY && !(saving && army.length >= AI_ARMY_TO_ATTACK)) {
      for (const type of [...COMBAT_UNITS].sort(() => Math.random() - 0.5)) {
        if (this.train(type, f) === null) break;
      }
    }
    this.contestBeacon(side);
    this.fetchSalvage(side);
    side.attackMs += AI_THINK_MS;
    if (this.elapsedMs < AI_GRACE_MS || army.length < AI_ARMY_TO_ATTACK || side.attackMs < AI_ATTACK_MS) return;
    side.attackMs = 0;
    const foe = side.grudge >= 0 && this.sides[side.grudge].alive ? side.grudge : -1;
    const target = this.nearestEnemyBuilding(hub, f, foe);
    if (!target) return;
    // The picket stays on the beacon and a few ships stay home; the rest go.
    const raid = army.filter((u) => u.id !== side.picket).sort((a, b) => dist(b, hub) - dist(a, hub));
    const sent = raid.slice(0, Math.max(0, raid.length - AI_HOME_GUARD));
    for (const u of sent) u.order = { kind: 'attack', id: target.id, auto: false };
    if (sent.length > 0) {
      const at = this.sides[target.faction];
      aiLog(String(f), `sends ${sent.length} ships at the ${at.def.name} ${at.def.buildings[target.type].name}`);
    }
  }

  /** Idle AI warships go to fetch their faction's salvage shards when one lies within reach. */
  private fetchSalvage(side: Side) {
    const f = side.index;
    for (const s of this.shards) {
      if (s.faction !== f) continue;
      const idle = this.units.find((u) => u.faction === f && u.type !== 'harvester' && u.decoyMs === null && !u.order
        && u.id !== side.picket && dist(u, s) <= AI_SALVAGE_REACH);
      if (idle) idle.order = { kind: 'move', x: s.x, y: s.y };
    }
  }

  /** An AI expansion: a second hub beside the richest-looking crystal field away from everyone. */
  private expand(f: number): boolean {
    const hub = this.hubOf(f)!;
    const others = this.buildings.filter((b) => b.type === 'hub' && b.faction !== f);
    const sites = this.nodes
      .filter((n) => n.amount > NODE_AMOUNT / 3 && dist(n, hub) >= EXPANSION_GAP && dist(n, this.beacon) >= 150
        && others.every((o) => dist(o, n) >= AI_EXPAND_RIVAL_GAP))
      .sort((a, b) => dist(a, hub) - dist(b, hub));
    for (const n of sites.slice(0, 3)) {
      for (let tries = 0; tries < 8; tries++) {
        const angle = Math.random() * Math.PI * 2;
        const d = 50 + Math.random() * 50;
        const x = n.x + Math.cos(angle) * d;
        const y = n.y + Math.sin(angle) * d;
        if (this.placementProblem('expansion', x, y, f) === null) {
          return this.build('expansion', x, y, f) === null;
        }
      }
    }
    return false;
  }

  /**
   * The rivals nearest the relay beacon each keep one idle warship on it (a picket): the nearest
   * once the opening is over, the next one AI_PICKET_STAGGER_MS later. A lost picket is replaced.
   */
  private contestBeacon(side: Side) {
    const f = side.index;
    const bc = this.beacon;
    if (this.elapsedMs < AI_PICKET_MS) return;
    const rank = this.sides
      .filter((s) => (s.index !== PLAYER || this.watch) && s.alive && this.hubOf(s.index))
      .sort((a, b) => dist(this.hubOf(a.index)!, bc) - dist(this.hubOf(b.index)!, bc))
      .findIndex((s) => s.index === f);
    if (rank < 0 || rank >= AI_PICKETS || this.elapsedMs < AI_PICKET_MS + rank * AI_PICKET_STAGGER_MS) return;
    const current = this.unit(side.picket);
    if (current && current.faction === f) return;
    const idle = this.units.find((u) => u.faction === f && u.type !== 'harvester' && u.decoyMs === null && !u.order);
    if (!idle) return;
    side.picket = idle.id;
    idle.order = { kind: 'move', x: bc.x, y: bc.y };
  }

  private placeNear(role: Exclude<Role, 'hub'>, faction: number) {
    const hub = this.hubOf(faction);
    if (!hub) return;
    for (let tries = 0; tries < 16; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 90;
      const x = hub.x + Math.cos(angle) * d;
      const y = hub.y + Math.sin(angle) * d;
      if (this.placementProblem(role, x, y, faction) === null) {
        if (this.build(role, x, y, faction) === null) aiLog(String(faction), `builds a ${buildInfo(this.sides[faction], role).name}`);
        return;
      }
    }
  }

  /** The nearest building of another faction, of `only` when it is given and has any. */
  private nearestEnemyBuilding(from: Point, faction: number, only = -1): Building | null {
    let best: Building | null = null;
    for (const b of this.buildings) {
      if (b.faction === faction || (only >= 0 && b.faction !== only)) continue;
      if (!best || dist(b, from) < dist(best, from)) best = b;
    }
    return best ?? (only >= 0 ? this.nearestEnemyBuilding(from, faction) : null);
  }

  /** Removes what has run out of hit points; a fallen hub takes its whole faction with it. */
  private removeDead() {
    const fallen = new Set<number>();
    for (const b of this.buildings) {
      if (b.hp > 0) continue;
      this.wreck(b);
      const main = b.type === 'hub' && !b.expansion;
      if (main) fallen.add(b.faction);
      if (b.faction !== PLAYER && b.lastHit === PLAYER) {
        this.score('razes');
        if (main) this.score('hubs');
      }
    }
    for (const u of this.units) {
      if (u.hp > 0) continue;
      this.salvage(u);
      this.wreck(u);
      // A destroyed ship leaves a salvage shard for whoever destroyed it; the player's count as kills.
      if (u.decoyMs !== null || u.lastHit < 0 || u.lastHit === u.faction) continue;
      this.shards.push({ id: this.id(), faction: u.lastHit, x: u.x, y: u.y, value: SHARD_VALUE, life: SHARD_LIFE_MS });
      if (u.lastHit === PLAYER) {
        this.kills += 1;
        this.score('kills');
      }
    }
    // The rest of a fallen faction's ships and buildings go up with its hub.
    for (const b of this.buildings) if (fallen.has(b.faction) && b.hp > 0) this.wreck(b);
    for (const u of this.units) if (fallen.has(u.faction) && u.hp > 0) this.wreck(u);
    this.buildings = this.buildings.filter((b) => b.hp > 0 && !fallen.has(b.faction));
    this.units = this.units.filter((u) => u.hp > 0 && !fallen.has(u.faction));
    for (const f of fallen) {
      this.sides[f].alive = false;
      this.sides[f].crystal = 0;
    }
    this.shards = this.shards.filter((s) => this.sides[s.faction].alive);
  }

  /** A salvage yard pays its faction for each enemy unit destroyed within its range. */
  private salvage(u: Unit) {
    if (u.decoyMs !== null) return;
    for (const b of this.buildings) {
      const ability = this.abilityOf(b);
      if (b.done && b.faction !== u.faction && ability?.kind === 'salvage' && dist(b, u) <= ability.range) {
        this.sides[b.faction].crystal += ability.pay;
      }
    }
  }

  /** Counts one more toward the current contract when it is of `goal`. */
  private score(goal: 'kills' | 'razes' | 'hubs') {
    const c = CONTRACTS[this.contract.index];
    if (c?.goal === goal) this.contract.progress += 1;
  }

  /**
   * The relay beacon: a faction alone in the ring fills its capture (after draining a rival's),
   * owns the beacon once full, and is paid every second it keeps a ship in the ring.
   */
  private updateBeacon(dt: number) {
    const bc = this.beacon;
    const present = new Set<number>();
    for (const u of this.units) {
      if (u.type !== 'harvester' && u.decoyMs === null && dist(u, bc) <= BEACON_RADIUS) present.add(u.faction);
    }
    if (bc.owner >= 0 && !this.sides[bc.owner].alive) {
      bc.owner = -1;
      bc.capturer = -1;
      bc.capture = 0;
    }
    if (present.size === 1) {
      const f = [...present][0];
      const step = dt / CAPTURE_MS;
      if (bc.capturer === f || bc.capturer < 0) {
        bc.capturer = f;
        bc.capture = Math.min(1, bc.capture + step);
        if (bc.capture >= 1 && bc.owner !== f) {
          bc.owner = f;
          if (f === PLAYER) this.events.push({ kind: 'notice', text: `Relay beacon captured: +${BEACON_PAY} crystal a second while your ships hold it` });
        }
      } else {
        bc.capture = Math.max(0, bc.capture - step);
        if (bc.capture <= 0) {
          if (bc.owner === PLAYER) this.events.push({ kind: 'notice', text: 'The relay beacon was lost' });
          bc.owner = -1;
          bc.capturer = f;
        }
      }
    }
    bc.held = bc.owner >= 0 && present.has(bc.owner);
    if (!bc.held) {
      bc.payMs = 0;
      return;
    }
    if (bc.owner === PLAYER && CONTRACTS[this.contract.index]?.goal === 'hold') this.contract.progress += dt / 1000;
    bc.payMs += dt;
    while (bc.payMs >= BEACON_PAY_MS) {
      bc.payMs -= BEACON_PAY_MS;
      this.sides[bc.owner].crystal += BEACON_PAY;
      if (bc.owner === PLAYER) {
        bc.paid += BEACON_PAY;
        this.pops.push({ x: bc.x, y: bc.y - 30, text: `+${BEACON_PAY}`, color: 0xffd36a, life: POP_MS });
      }
    }
  }

  /** Salvage shards drift to the nearest ship of their faction in reach and pay out when it picks them up. */
  private updateShards(dt: number) {
    this.shards = this.shards.filter((s) => {
      s.life -= dt;
      let near: Unit | null = null;
      for (const u of this.units) {
        if (u.faction !== s.faction || u.decoyMs !== null) continue;
        if (!near || dist(u, s) < dist(near, s)) near = u;
      }
      if (near && dist(near, s) <= SHARD_MAGNET) {
        const d = dist(near, s);
        if (d <= 8) {
          this.sides[s.faction].crystal += s.value;
          if (s.faction === PLAYER) {
            this.salvaged += s.value;
            this.pops.push({ x: s.x, y: s.y - 12, text: `+${s.value}`, color: 0x8dff9a, life: POP_MS });
            this.events.push({ kind: 'gain', amount: s.value });
          }
          return false;
        }
        const step = Math.min(d, (SHARD_SPEED * dt) / 1000);
        s.x += ((near.x - s.x) / d) * step;
        s.y += ((near.y - s.y) / d) * step;
      }
      return s.life > 0;
    });
  }

  /** Checks the current contract; when it is met, pays its reward and perk and starts the next one. */
  private updateContract() {
    const c = CONTRACTS[this.contract.index];
    if (!c) return;
    if (c.goal === 'barracks') {
      this.contract.progress = this.buildings.some((b) => b.faction === PLAYER && b.type === 'barracks' && b.done) ? 1 : 0;
    }
    if (this.contract.progress < c.target) return;
    const side = this.sides[PLAYER];
    side.crystal += c.reward;
    c.apply(side.perks);
    this.events.push({ kind: 'gain', amount: c.reward });
    this.events.push({ kind: 'notice', text: `Contract done: +${c.reward} crystal and ${c.perk(side.def)}` });
    this.contract = { index: this.contract.index + 1, progress: 0 };
  }

  private wreck(e: Unit | Building) {
    this.booms.push({ x: e.x, y: e.y, color: this.sides[e.faction].def.color, life: BOOM_MS, r: this.radiusOf(e) });
  }
}
