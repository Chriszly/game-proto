// The rules of Colonizer, free of Phaser: economy, production, research, pathing, combat and fog.
// The scene and the planner change the world only through `issue`, `placeBuilding`, `train` and
// `research`; `tick` moves everything forward.
import {
  BUILDINGS,
  CARRY,
  GATHER_MS,
  START,
  START_VILLAGERS,
  TECHS,
  UNITS,
  MAP_SIZE,
  type BuildingId,
  type Cost,
  type FactionId,
  type Resource,
  type UnitDef,
} from './data';
import { START_TILES, WATER, ROCK, idx, inMap, type MapData, type Node } from './map';

export type Order =
  | { t: 'idle' }
  | { t: 'move'; x: number; y: number }
  | { t: 'attackMove'; x: number; y: number }
  | { t: 'attack'; target: number; resume: { x: number; y: number } | null }
  | { t: 'gather'; node: number }
  | { t: 'build'; b: number }
  | { t: 'return' };

export interface Unit {
  id: number;
  owner: number;
  type: string;
  x: number;
  y: number;
  hp: number;
  order: Order;
  path: { x: number; y: number }[];
  repath: number;
  cool: number;
  /** The resource this villager carries, and how many. */
  carry: Resource | null;
  amount: number;
  /** Progress towards the next unit gathered. */
  gatherMs: number;
  /** The node a villager goes back to after dropping off. */
  home: number | null;
  /** The resource this villager last gathered, so it can find more when its node runs out. */
  lastRes: Resource | null;
}

export type QueueItem = { kind: 'unit'; key: string; left: number } | { kind: 'tech'; key: string; left: number };

export interface Building {
  id: number;
  owner: number;
  type: BuildingId;
  tx: number;
  ty: number;
  hp: number;
  built: boolean;
  /** Time still to build, counted down by builders. */
  buildLeft: number;
  queue: QueueItem[];
  cool: number;
}

export interface Player {
  id: number;
  faction: FactionId;
  res: Record<Resource, number>;
  techs: string[];
  age: 1 | 2;
  /** Multiplies how fast a player gathers; the AI's depends on difficulty. */
  gatherMul: number;
}

export interface GameState {
  time: number;
  winner: number | null;
  terrain: Uint8Array;
  /** 1 where a tile is blocked for walking: terrain, buildings and nodes. */
  solid: Uint8Array;
  /** 0 unseen, 1 explored, 2 in sight of the player right now. */
  sight: Uint8Array;
  nodes: Map<number, Node>;
  units: Map<number, Unit>;
  buildings: Map<number, Building>;
  players: Player[];
  nextId: number;
  notice: string;
  noticeMs: number;
  /** Time since the planner last thought; see planner.ts. */
  aiClock: number;
}

export type Command =
  | { t: 'move'; x: number; y: number }
  | { t: 'attackMove'; x: number; y: number }
  | { t: 'attack'; target: number }
  | { t: 'gather'; node: number }
  | { t: 'build'; b: number }
  | { t: 'stop' };

export const PLAYER = 0;
export const AI = 1;

/**
 * Starts a match. `aiGatherMul` scales how fast the AI gathers (the difficulty's number; 1 is the game
 * as designed).
 */
export function createGame(faction: FactionId, aiFaction: FactionId, aiGatherMul: number, map: MapData): GameState {
  const s: GameState = {
    time: 0,
    winner: null,
    terrain: map.terrain,
    solid: new Uint8Array(MAP_SIZE * MAP_SIZE),
    sight: new Uint8Array(MAP_SIZE * MAP_SIZE),
    nodes: new Map(),
    units: new Map(),
    buildings: new Map(),
    players: [
      { id: PLAYER, faction, res: { ...START }, techs: [], age: 1, gatherMul: 1 },
      { id: AI, faction: aiFaction, res: { ...START }, techs: [], age: 1, gatherMul: aiGatherMul },
    ],
    nextId: 1000,
    notice: '',
    noticeMs: 0,
    aiClock: 0,
  };
  for (const n of map.nodes) s.nodes.set(n.id, n);
  // Node ids come from the map, so units and buildings count on from the largest of them.
  s.nextId = Math.max(s.nextId, ...[...s.nodes.keys()]) + 1;
  START_TILES.forEach((start, owner) => {
    addBuilding(s, owner, 'town', start.tx, start.ty, true);
  });
  rebuildSolid(s);
  START_TILES.forEach((_, owner) => {
    const town = [...s.buildings.values()].find((b) => b.owner === owner && b.type === 'town');
    if (!town) return;
    // The starting villagers go straight to work: two on wood, the rest on the berry bushes.
    for (let i = 0; i < START_VILLAGERS; i++) {
      const u = spawnUnit(s, owner, 'villager', town);
      const src = u && nearestSource(s, owner, i < 2 ? 'wood' : 'food', u.x, u.y);
      if (u && src) {
        u.home = src.id;
        u.order = { t: 'gather', node: src.id };
      }
    }
  });
  updateSight(s);
  return s;
}

// ---------------------------------------------------------------- helpers

export const playerOf = (s: GameState, owner: number) => s.players[owner];

export function affordable(p: Player, cost: Cost) {
  return (Object.keys(cost) as Resource[]).every((r) => p.res[r] >= (cost[r] ?? 0));
}

function pay(p: Player, cost: Cost) {
  for (const r of Object.keys(cost) as Resource[]) p.res[r] -= cost[r] ?? 0;
}

function footprint(e: Unit | Building | Node): { x0: number; y0: number; x1: number; y1: number } {
  if ('kind' in e) return { x0: e.tx, y0: e.ty, x1: e.tx + e.w, y1: e.ty + e.h };
  if ('queue' in e) {
    const def = BUILDINGS[e.type];
    return { x0: e.tx, y0: e.ty, x1: e.tx + def.w, y1: e.ty + def.h };
  }
  return { x0: e.x - 0.3, y0: e.y - 0.3, x1: e.x + 0.3, y1: e.y + 0.3 };
}

/** Distance from a point to the nearest edge of a footprint; 0 inside it. */
function gap(px: number, py: number, f: { x0: number; y0: number; x1: number; y1: number }) {
  const dx = Math.max(f.x0 - px, 0, px - f.x1);
  const dy = Math.max(f.y0 - py, 0, py - f.y1);
  return Math.hypot(dx, dy);
}

export function unitDef(u: Unit): UnitDef {
  return UNITS[u.type];
}

export function ownedBy(s: GameState, owner: number) {
  const units = [...s.units.values()].filter((u) => u.owner === owner);
  const buildings = [...s.buildings.values()].filter((b) => b.owner === owner);
  return { units, buildings };
}

export function getEntity(s: GameState, id: number): Unit | Building | undefined {
  return s.units.get(id) ?? s.buildings.get(id);
}

/** The tiles an entity covers: a unit, building or resource node. */
export function footprintOf(s: GameState, id: number) {
  const e = s.nodes.get(id) ?? getEntity(s, id);
  return e ? footprint(e) : null;
}

/** The entity under a tile or point, own entities first: units, then buildings, then nodes. */
export function entityAt(s: GameState, x: number, y: number): { kind: 'unit' | 'building' | 'node'; id: number; owner: number } | null {
  let best: { kind: 'unit' | 'building' | 'node'; id: number; owner: number; d: number } | null = null;
  for (const u of s.units.values()) {
    const d = Math.hypot(u.x - x, u.y - y);
    if (d <= 0.6 && (!best || d < best.d)) best = { kind: 'unit', id: u.id, owner: u.owner, d };
  }
  if (best) return best;
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (x >= b.tx && y >= b.ty && x < b.tx + def.w && y < b.ty + def.h) return { kind: 'building', id: b.id, owner: b.owner };
  }
  for (const n of s.nodes.values()) {
    if (x >= n.tx && y >= n.ty && x < n.tx + n.w && y < n.ty + n.h) return { kind: 'node', id: n.id, owner: -1 };
  }
  return null;
}

export function popUsed(s: GameState, owner: number) {
  let used = 0;
  for (const u of s.units.values()) if (u.owner === owner) used++;
  for (const b of s.buildings.values()) if (b.owner === owner) for (const q of b.queue) if (q.kind === 'unit') used++;
  return used;
}

export function popCap(s: GameState, owner: number) {
  let cap = 0;
  for (const b of s.buildings.values()) if (b.owner === owner && b.built) cap += BUILDINGS[b.type].pop ?? 0;
  return cap;
}

export function hasBuilt(s: GameState, owner: number, type: BuildingId) {
  for (const b of s.buildings.values()) if (b.owner === owner && b.type === type && b.built) return true;
  return false;
}

export function hasBuildingFor(s: GameState, owner: number, type: BuildingId) {
  for (const b of s.buildings.values()) if (b.owner === owner && b.type === type) return true;
  return false;
}

export function visible(s: GameState, x: number, y: number) {
  return inMap(x, y) && s.sight[idx(x, y)] === 2;
}

// ---------------------------------------------------------------- map state

function addBuilding(s: GameState, owner: number, type: BuildingId, tx: number, ty: number, built: boolean): Building {
  const def = BUILDINGS[type];
  const b: Building = {
    id: s.nextId++,
    owner,
    type,
    tx,
    ty,
    hp: built ? def.hp : Math.round(def.hp * 0.1),
    built,
    buildLeft: def.time,
    queue: [],
    cool: 0,
  };
  s.buildings.set(b.id, b);
  return b;
}

function spawnUnit(s: GameState, owner: number, type: string, near: Building): Unit | null {
  const spot = freeSpotNear(s, near);
  if (!spot) return null;
  const def = UNITS[type];
  const u: Unit = {
    id: s.nextId++,
    owner,
    type,
    x: spot.x,
    y: spot.y,
    hp: def.hp,
    order: { t: 'idle' },
    path: [],
    repath: 0,
    cool: 0,
    carry: null,
    amount: 0,
    gatherMs: 0,
    home: null,
    lastRes: null,
  };
  s.units.set(u.id, u);
  return u;
}

/** A walkable tile next to a building, nearest first; the building's own tiles are not walkable. */
function freeSpotNear(s: GameState, b: Building): { x: number; y: number } | null {
  const def = BUILDINGS[b.type];
  for (let r = 1; r <= 4; r++) {
    for (let y = b.ty - r; y < b.ty + def.h + r; y++)
      for (let x = b.tx - r; x < b.tx + def.w + r; x++) {
        const edge = x < b.tx || y < b.ty || x >= b.tx + def.w || y >= b.ty + def.h;
        if (!edge || !inMap(x, y) || s.solid[idx(x, y)]) continue;
        return { x: x + 0.5, y: y + 0.5 };
      }
  }
  return null;
}

/** Marks every blocked tile: terrain, buildings (even unfinished ones) and nodes. */
export function rebuildSolid(s: GameState) {
  for (let i = 0; i < s.solid.length; i++) s.solid[i] = s.terrain[i] === WATER || s.terrain[i] === ROCK ? 1 : 0;
  const mark = (tx: number, ty: number, w: number, h: number) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (inMap(x, y)) s.solid[idx(x, y)] = 1;
  };
  for (const n of s.nodes.values()) mark(n.tx, n.ty, n.w, n.h);
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    mark(b.tx, b.ty, def.w, def.h);
  }
}

/** Recomputes what the player sees: sight circles of every own unit and building. */
export function updateSight(s: GameState) {
  for (let i = 0; i < s.sight.length; i++) if (s.sight[i] === 2) s.sight[i] = 1;
  const reveal = (cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r); y <= Math.floor(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++) {
        if (!inMap(x, y) || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue;
        s.sight[idx(x, y)] = 2;
      }
  };
  for (const u of s.units.values()) if (u.owner === PLAYER) reveal(u.x, u.y, unitDef(u).sight);
  for (const b of s.buildings.values()) {
    if (b.owner !== PLAYER) continue;
    const def = BUILDINGS[b.type];
    reveal(b.tx + def.w / 2, b.ty + def.h / 2, def.sight);
  }
}

// ---------------------------------------------------------------- pathing

const visited = new Int32Array(MAP_SIZE * MAP_SIZE);
const parent = new Int32Array(MAP_SIZE * MAP_SIZE);
const queue = new Int32Array(MAP_SIZE * MAP_SIZE);
let stamp = 0;
const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/**
 * Breadth-first search from a point to the nearest tile that `goal` accepts. Returns the tile
 * centres to walk through (empty if the start already qualifies), or null when nothing is reachable.
 */
export function findPath(s: GameState, sx: number, sy: number, goal: (tx: number, ty: number) => boolean) {
  const startX = Math.floor(sx);
  const startY = Math.floor(sy);
  if (goal(startX, startY)) return [];
  stamp++;
  let head = 0;
  let tail = 0;
  const start = idx(startX, startY);
  visited[start] = stamp;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % MAP_SIZE;
    const cy = (cur - cx) / MAP_SIZE;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inMap(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (visited[ni] === stamp || s.solid[ni]) continue;
      // A diagonal step needs both straight neighbours free, so units never squeeze past a corner.
      if (dx && dy && (s.solid[idx(cx + dx, cy)] || s.solid[idx(cx, cy + dy)])) continue;
      visited[ni] = stamp;
      parent[ni] = cur;
      if (goal(nx, ny)) {
        const path: { x: number; y: number }[] = [];
        let at = ni;
        while (at !== start) {
          path.push({ x: (at % MAP_SIZE) + 0.5, y: Math.floor(at / MAP_SIZE) + 0.5 });
          at = parent[at];
        }
        return path.reverse();
      }
      queue[tail++] = ni;
    }
  }
  return null;
}

function stepAlong(u: Unit, speed: number, dt: number) {
  const next = u.path[0];
  if (!next) return;
  const dx = next.x - u.x;
  const dy = next.y - u.y;
  const d = Math.hypot(dx, dy);
  const step = (speed * dt) / 1000;
  if (d <= step) {
    u.x = next.x;
    u.y = next.y;
    u.path.shift();
  } else {
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  }
}

/** Walks towards a goal tile set, repathing now and then. Returns false if the goal can't be reached. */
function pursue(s: GameState, u: Unit, speed: number, dt: number, goal: (tx: number, ty: number) => boolean): boolean {
  u.repath -= dt;
  if (u.path.length === 0 || u.repath <= 0) {
    const path = findPath(s, u.x, u.y, goal);
    if (path === null) return false;
    // Already on a qualifying tile: still walk to its centre, so the unit is in reach of the goal.
    u.path = path.length > 0 ? path : [{ x: Math.floor(u.x) + 0.5, y: Math.floor(u.y) + 0.5 }];
    u.repath = 700;
  }
  stepAlong(u, speed, dt);
  return true;
}

// ---------------------------------------------------------------- orders

/** Gives a command to some of a player's units. Buildings are ignored; only villagers can build. */
export function issue(s: GameState, owner: number, ids: number[], cmd: Command) {
  for (const id of ids) {
    const u = s.units.get(id);
    if (!u || u.owner !== owner) continue;
    const role = unitDef(u).role;
    u.path = [];
    u.repath = 0;
    switch (cmd.t) {
      case 'move':
        u.order = { t: 'move', x: cmd.x, y: cmd.y };
        break;
      case 'attackMove':
        if (role !== 'villager') u.order = { t: 'attackMove', x: cmd.x, y: cmd.y };
        break;
      case 'attack': {
        const target = getEntity(s, cmd.target);
        if (target && target.owner !== owner && role !== 'villager') u.order = { t: 'attack', target: cmd.target, resume: null };
        break;
      }
      case 'gather':
        if (role === 'villager') {
          u.home = cmd.node;
          u.order = { t: 'gather', node: cmd.node };
        }
        break;
      case 'build':
        if (role === 'villager') u.order = { t: 'build', b: cmd.b };
        break;
      case 'stop':
        u.order = { t: 'idle' };
        break;
    }
  }
}

/** Places a building if the footprint is free and the owner can pay. Returns its id, or null. */
export function placeBuilding(s: GameState, owner: number, type: BuildingId, tx: number, ty: number): number | null {
  const def = BUILDINGS[type];
  const p = s.players[owner];
  if (!affordable(p, def.cost)) return null;
  if (!canPlace(s, type, tx, ty)) return null;
  pay(p, def.cost);
  const b = addBuilding(s, owner, type, tx, ty, false);
  rebuildSolid(s);
  return b.id;
}

/** Whether a building fits: free ground, with no unit standing on any of its tiles. */
export function canPlace(s: GameState, type: BuildingId, tx: number, ty: number) {
  const def = BUILDINGS[type];
  for (let y = ty; y < ty + def.h; y++)
    for (let x = tx; x < tx + def.w; x++) if (!inMap(x, y) || s.solid[idx(x, y)]) return false;
  for (const u of s.units.values()) {
    const ux = Math.floor(u.x);
    const uy = Math.floor(u.y);
    if (ux >= tx && ux < tx + def.w && uy >= ty && uy < ty + def.h) return false;
  }
  // Someone has to be able to reach it to build it.
  return touchable(s, { x0: tx, y0: ty, x1: tx + def.w, y1: ty + def.h });
}

/** Queues a unit at a finished building the owner controls. */
export function train(s: GameState, owner: number, bid: number, type: string): boolean {
  const b = s.buildings.get(bid);
  const def = UNITS[type];
  if (!b || b.owner !== owner || !b.built || !def) return false;
  if (!BUILDINGS[b.type].trains?.includes(def.role)) return false;
  const p = s.players[owner];
  if (!affordable(p, def.cost) || popUsed(s, owner) + 1 > popCap(s, owner)) return false;
  pay(p, def.cost);
  b.queue.push({ kind: 'unit', key: type, left: def.time });
  return true;
}

/** Queues research at a building that teaches it, once its prerequisites are met. */
export function research(s: GameState, owner: number, bid: number, techId: string): boolean {
  const b = s.buildings.get(bid);
  const tech = TECHS[techId];
  const p = s.players[owner];
  if (!b || !tech || b.owner !== owner || !b.built || b.type !== (tech.at === 'town' ? 'town' : 'academy')) return false;
  if (tech.age2 && p.age < 2) return false;
  if (p.techs.includes(techId) || b.queue.some((q) => q.key === techId)) return false;
  if (!affordable(p, tech.cost)) return false;
  pay(p, tech.cost);
  b.queue.push({ kind: 'tech', key: techId, left: tech.time });
  return true;
}

export function say(s: GameState, text: string) {
  s.notice = text;
  s.noticeMs = 2500;
}

// ---------------------------------------------------------------- time

export function tick(s: GameState, dt: number) {
  if (s.winner !== null) return;
  s.time += dt;
  s.noticeMs = Math.max(0, s.noticeMs - dt);
  for (const b of [...s.buildings.values()]) updateBuilding(s, b, dt);
  for (const u of [...s.units.values()]) if (u.hp > 0) updateUnit(s, u, dt);
  reap(s);
  updateSight(s);
  checkWinner(s);
}

function updateBuilding(s: GameState, b: Building, dt: number) {
  if (b.hp <= 0 || !b.built) return;
  const def = BUILDINGS[b.type];
  if (def.tower) {
    b.cool -= dt;
    if (b.cool <= 0) {
      const target = nearestEnemy(s, b.owner, b.tx + 0.5 * def.w, b.ty + 0.5 * def.h, def.tower.range);
      if (target) {
        target.hp -= def.tower.dmg;
        b.cool = def.tower.cooldown;
      }
    }
  }
  const head = b.queue[0];
  if (!head) return;
  const p = s.players[b.owner];
  head.left -= dt;
  if (head.left > 0) return;
  if (head.kind === 'tech') {
    b.queue.shift();
    if (head.key === 'age2') p.age = 2;
    else p.techs.push(head.key);
    return;
  }
  // A unit that can't leave yet (no room around the building) waits in the queue.
  const unit = spawnUnit(s, b.owner, head.key, b);
  if (!unit) {
    head.left = 0;
    return;
  }
  b.queue.shift();
  // A new villager goes to work on whichever of wood and food is short.
  if (UNITS[unit.type].role === 'villager') {
    const res: Resource = s.players[b.owner].res.food < s.players[b.owner].res.wood ? 'food' : 'wood';
    const src = nearestSource(s, b.owner, res, unit.x, unit.y);
    if (src) {
      unit.home = src.id;
      unit.order = { t: 'gather', node: src.id };
    }
  }
}

function updateUnit(s: GameState, u: Unit, dt: number) {
  const def = unitDef(u);
  u.cool = Math.max(0, u.cool - dt);
  if (def.role === 'villager') villagerUpdate(s, u, def, dt);
  else militaryUpdate(s, u, def, dt);
}

function militaryUpdate(s: GameState, u: Unit, def: UnitDef, dt: number) {
  const o = u.order;
  if (o.t === 'idle') {
    const t = nearestEnemy(s, u.owner, u.x, u.y, def.sight);
    if (t) u.order = { t: 'attack', target: t.id, resume: null };
    return;
  }
  if (o.t === 'move') {
    if (u.path.length === 0 && Math.hypot(u.x - o.x, u.y - o.y) < 0.9) return void (u.order = { t: 'idle' });
    const goal = goalNear(s, o.x, o.y);
    if (!pursue(s, u, def.speed, dt, goal)) u.order = { t: 'idle' };
    return;
  }
  if (o.t === 'attackMove') {
    const t = nearestEnemy(s, u.owner, u.x, u.y, def.sight);
    if (t) {
      u.order = { t: 'attack', target: t.id, resume: { x: o.x, y: o.y } };
      return;
    }
    if (u.path.length === 0 && Math.hypot(u.x - o.x, u.y - o.y) < 0.9) return void (u.order = { t: 'idle' });
    if (!pursue(s, u, def.speed, dt, goalNear(s, o.x, o.y))) u.order = { t: 'idle' };
    return;
  }
  if (o.t === 'attack') {
    const target = getEntity(s, o.target);
    if (!target || target.hp <= 0) {
      u.order = o.resume ? { t: 'attackMove', ...o.resume } : { t: 'idle' };
      return;
    }
    const f = footprintOf(s, o.target);
    if (!f) return;
    if (gap(u.x, u.y, f) <= def.range + 0.5) {
      u.path = [];
      if (u.cool <= 0) {
        strike(s, u, def, target);
        u.cool = def.cooldown;
      }
      return;
    }
    const range = def.range;
    if (!pursue(s, u, def.speed, dt, (tx, ty) => !s.solid[idx(tx, ty)] && gap(tx + 0.5, ty + 0.5, f) <= range)) {
      u.order = o.resume ? { t: 'attackMove', ...o.resume } : { t: 'idle' };
    }
    return;
  }
}

function villagerUpdate(s: GameState, u: Unit, def: UnitDef, dt: number) {
  const o = u.order;
  if (o.t === 'idle') {
    if (u.amount > 0) u.order = { t: 'return' };
    return;
  }
  if (o.t === 'move') {
    if (u.path.length === 0 && Math.hypot(u.x - o.x, u.y - o.y) < 0.9) return void (u.order = { t: 'idle' });
    if (!pursue(s, u, def.speed, dt, goalNear(s, o.x, o.y))) u.order = { t: 'idle' };
    return;
  }
  if (o.t === 'build') {
    const b = s.buildings.get(o.b);
    if (!b || b.built || b.hp <= 0) return void (u.order = { t: 'idle' });
    const f = footprintOf(s, b.id);
    if (!f) return;
    if (gap(u.x, u.y, f) <= 0.6) {
      u.path = [];
      b.buildLeft -= dt;
      b.hp = Math.min(BUILDINGS[b.type].hp, b.hp + (BUILDINGS[b.type].hp * dt) / BUILDINGS[b.type].time);
      if (b.buildLeft <= 0) {
        b.built = true;
        b.hp = BUILDINGS[b.type].hp;
        // A builder goes on to work the new farm, or else the nearest wood.
        const next = BUILDINGS[b.type].farm ? { id: b.id } : nearestSource(s, u.owner, 'wood', u.x, u.y);
        u.order = next ? { t: 'gather', node: next.id } : { t: 'idle' };
        u.home = next ? next.id : null;
      }
      return;
    }
    if (!pursue(s, u, def.speed, dt, (tx, ty) => !s.solid[idx(tx, ty)] && gap(tx + 0.5, ty + 0.5, f) <= 0.5)) {
      u.order = { t: 'idle' };
    }
    return;
  }
  if (o.t === 'gather') {
    const node = s.nodes.get(o.node);
    const farm = s.buildings.get(o.node);
    const src = node ?? (farm && BUILDINGS[farm.type].farm && farm.built ? farm : null);
    if (!src || (node && node.amount <= 0)) {
      // Depleted: go to the nearest node of the same resource, or stop.
      const next = nearestSource(s, u.owner, u.lastRes ?? 'wood', u.x, u.y);
      if (next && u.amount === 0) {
        u.home = next.id;
        u.order = { t: 'gather', node: next.id };
      } else u.order = u.amount > 0 ? { t: 'return' } : { t: 'idle' };
      return;
    }
    if (u.amount >= CARRY) return void (u.order = { t: 'return' });
    const f = footprintOf(s, src.id);
    if (!f) return;
    if (gap(u.x, u.y, f) <= 0.6) {
      u.path = [];
      const res: Resource = node ? node.res : 'food';
      if (u.carry && u.carry !== res) return void (u.order = { t: 'return' });
      u.carry = res;
      u.lastRes = res;
      u.gatherMs += dt * gatherBonus(s, u.owner, res) * s.players[u.owner].gatherMul;
      if (u.gatherMs >= GATHER_MS[res]) {
        u.gatherMs -= GATHER_MS[res];
        u.amount++;
        if (node) {
          node.amount--;
          if (node.amount <= 0) {
            s.nodes.delete(node.id);
            rebuildSolid(s);
          }
        }
      }
      return;
    }
    if (!pursue(s, u, def.speed, dt, (tx, ty) => !s.solid[idx(tx, ty)] && gap(tx + 0.5, ty + 0.5, f) <= 0.5)) {
      // Boxed in by other trees or buildings: try the nearest source that can be reached instead.
      const other = nearestSource(s, u.owner, node ? node.res : 'food', u.x, u.y, src.id);
      u.order = other ? { t: 'gather', node: other.id } : { t: 'idle' };
      u.home = other ? other.id : null;
    }
    return;
  }
  if (o.t === 'return') {
    const drop = nearestDropoff(s, u.owner, u.carry, u.x, u.y);
    if (!drop) {
      u.order = { t: 'idle' };
      return;
    }
    const f = footprintOf(s, drop.id);
    if (!f) return;
    if (gap(u.x, u.y, f) <= 0.6) {
      u.path = [];
      const p = s.players[u.owner];
      if (u.carry) p.res[u.carry] += u.amount;
      u.amount = 0;
      u.carry = null;
      u.gatherMs = 0;
      // Back to the same node if it still has wood or food, else the nearest of the same kind.
      const res = u.lastRes ?? 'wood';
      const home = u.home !== null ? s.nodes.get(u.home) ?? s.buildings.get(u.home) : undefined;
      const again = home && ('amount' in home ? home.amount > 0 : true) ? home : nearestSource(s, u.owner, res, u.x, u.y);
      u.order = again ? { t: 'gather', node: again.id } : { t: 'idle' };
      u.home = again ? again.id : null;
      return;
    }
    if (!pursue(s, u, def.speed, dt, (tx, ty) => !s.solid[idx(tx, ty)] && gap(tx + 0.5, ty + 0.5, f) <= 0.5)) {
      u.order = { t: 'idle' };
    }
  }
}

/** Gather speed from researched techs. */
function gatherBonus(s: GameState, owner: number, res: Resource) {
  const techs = s.players[owner].techs;
  const tech = res === 'wood' ? 'axes' : res === 'food' ? 'baskets' : 'picks';
  return techs.includes(tech) ? 1.25 : 1;
}

function goalNear(s: GameState, x: number, y: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const blocked = s.solid[idx(tx, ty)] === 1 && inMap(tx, ty);
  // A point inside a building is reached from the nearest free tile around it, a few tiles off.
  return (gx: number, gy: number) => !s.solid[idx(gx, gy)] && Math.hypot(gx + 0.5 - x, gy + 0.5 - y) <= (blocked ? 4.5 : 0.6);
}

/** Whether some free tile touches a footprint, so a villager can stand next to it. */
export function touchable(s: GameState, f: { x0: number; y0: number; x1: number; y1: number }) {
  for (let x = f.x0; x < f.x1; x++) {
    if (!s.solid[idx(x, f.y0 - 1)] && inMap(x, f.y0 - 1)) return true;
    if (!s.solid[idx(x, f.y1)] && inMap(x, f.y1)) return true;
  }
  for (let y = f.y0; y < f.y1; y++) {
    if (!s.solid[idx(f.x0 - 1, y)] && inMap(f.x0 - 1, y)) return true;
    if (!s.solid[idx(f.x1, y)] && inMap(f.x1, y)) return true;
  }
  return false;
}

/** The nearest node of a resource a villager can reach, or a finished farm for food. */
function nearestSource(s: GameState, owner: number, res: Resource, x: number, y: number, skip = -1): { id: number } | null {
  let best: { id: number; d: number } | null = null;
  for (const n of s.nodes.values()) {
    if (n.res !== res || n.amount <= 0 || n.id === skip) continue;
    const f = { x0: n.tx, y0: n.ty, x1: n.tx + n.w, y1: n.ty + n.h };
    if (!touchable(s, f)) continue;
    const d = gap(x, y, f);
    if (!best || d < best.d) best = { id: n.id, d };
  }
  if (res === 'food') {
    for (const b of s.buildings.values()) {
      if (b.owner !== owner || !b.built || !BUILDINGS[b.type].farm || b.id === skip) continue;
      const f = { x0: b.tx, y0: b.ty, x1: b.tx + 2, y1: b.ty + 2 };
      const d = gap(x, y, f);
      if (!best || d < best.d) best = { id: b.id, d };
    }
  }
  return best;
}

function nearestDropoff(s: GameState, owner: number, res: Resource | null, x: number, y: number): Building | null {
  let best: { b: Building; d: number } | null = null;
  for (const b of s.buildings.values()) {
    if (b.owner !== owner || !b.built) continue;
    const def = BUILDINGS[b.type];
    const drops = def.drops;
    if (!drops) continue;
    if (drops !== 'all' && (!res || !drops.includes(res))) continue;
    const d = gap(x, y, { x0: b.tx, y0: b.ty, x1: b.tx + def.w, y1: b.ty + def.h });
    if (!best || d < best.d) best = { b, d };
  }
  return best?.b ?? null;
}

/** The closest living enemy unit or building within `range` tiles of a point. */
function nearestEnemy(s: GameState, owner: number, x: number, y: number, range: number): Unit | Building | null {
  const foes: (Unit | Building)[] = [...s.units.values(), ...s.buildings.values()];
  let best: Unit | Building | null = null;
  let bestD = Infinity;
  for (const e of foes) {
    if (e.owner === owner || e.hp <= 0) continue;
    const d = gap(x, y, footprint(e));
    if (d <= range && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function strike(s: GameState, u: Unit, def: UnitDef, target: Unit | Building) {
  let dmg = def.dmg + ownBonus(s, u, def);
  if (def.vsCavalry && 'type' in target && UNITS[target.type].role === 'cavalry') dmg *= def.vsCavalry;
  target.hp -= dmg;
}

function ownBonus(s: GameState, u: Unit, def: UnitDef) {
  const techs = s.players[u.owner].techs;
  let bonus = 0;
  if (def.role === 'melee' && techs.includes('ironworks')) bonus += 2;
  if (def.role === 'ranged' && techs.includes('fletching')) bonus += 2;
  if (def.role === 'ranged' && techs.includes('bodkin')) bonus += 2;
  return bonus;
}

function reap(s: GameState) {
  let changed = false;
  for (const u of [...s.units.values()]) {
    if (u.hp > 0) continue;
    s.units.delete(u.id);
    changed = true;
  }
  for (const b of [...s.buildings.values()]) {
    if (b.hp > 0) continue;
    s.buildings.delete(b.id);
    changed = true;
  }
  if (changed) rebuildSolid(s);
}

function checkWinner(s: GameState) {
  for (const p of s.players) {
    if (!hasBuildingFor(s, p.id, 'town')) {
      s.winner = p.id === PLAYER ? AI : PLAYER;
      return;
    }
  }
}

