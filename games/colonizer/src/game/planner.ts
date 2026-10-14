// The AI opponent's planner. Every few seconds it reads the state of its own side and gives the
// same commands a player would (train, place, research, gather, attack), in priority order: keep
// villagers coming, keep houses ahead of the population cap, feed and wood up, build the production
// line, research, then train and send the army. Only the AI's own units and buildings are touched.
import {
  BUILDINGS,
  TECHS,
  UNITS,
  type BuildingId,
  type Resource,
  type Role,
  unitFor,
} from './data';
import { AI, PLAYER, affordable, chooseBoon, hasBuildingFor, startRaid, issue, placeBuilding, popCap, popUsed, research, train, type Building, type GameState, type Unit } from './sim';
import { inMap, idx, type Node } from './map';

const THINK_MS = 1500;
const TARGET_VILLAGERS = 18;
const ARMY_TO_ATTACK = 14;
const ARMY_CAP = 40;
const RESEARCH_ORDER = ['axes', 'baskets', 'ironworks', 'fletching', 'age2', 'stirrups', 'bodkin', 'picks'];
const BUILD_PLAN: BuildingId[] = ['farm', 'lumber', 'mine', 'barracks', 'academy', 'range', 'stable', 'watchtower'];

/** Runs the planner once every THINK_MS of game time. */
export function think(s: GameState, dt: number) {
  if (s.winner !== null) return;
  s.aiClock += dt;
  if (s.aiClock < THINK_MS) return;
  s.aiClock = 0;
  plan(s);
}

function plan(s: GameState) {
  const town = [...s.buildings.values()].find((b) => b.owner === AI && b.type === 'town' && b.built);
  if (!town) return;
  const p = s.players[AI];
  const villagers = [...s.units.values()].filter((u) => u.owner === AI && UNITS[u.type].role === 'villager');
  const idleVillagers = villagers.filter((u) => u.order.t === 'idle');
  const military = [...s.units.values()].filter((u) => u.owner === AI && UNITS[u.type].role !== 'villager');

  // 0. Every unfinished building gets a builder, so none is left waiting for one.
  for (const b of s.buildings.values()) {
    if (b.owner !== AI || b.built) continue;
    const working = [...s.units.values()].some((u) => u.owner === AI && u.order.t === 'build' && u.order.b === b.id);
    if (working) continue;
    const builder = nearestUnit(idleVillagers, b.tx, b.ty) ?? nearestVillager(s, AI, b.tx, b.ty);
    if (builder) issue(s, AI, [builder.id], { t: 'build', b: b.id });
  }

  // 1. Economy: villagers from the Town Center until the target, when it's idle.
  if (town.queue.length === 0 && villagers.length < TARGET_VILLAGERS && affordable(p, UNITS.villager.cost)) {
    train(s, AI, town.id, 'villager');
  }

  // 2. Population: a house before the cap is hit.
  const houseQueued = [...s.buildings.values()].some((b) => b.owner === AI && b.type === 'house' && !b.built);
  if (popUsed(s, AI) >= popCap(s, AI) - 3 && !houseQueued) {
    buildNear(s, AI, 'house', town, idleVillagers);
  }

  // 3. Buildings in plan order, one at a time, as soon as the AI can pay for each.
  const under = [...s.buildings.values()].some((b) => b.owner === AI && !b.built);
  if (!under) {
    for (const type of BUILD_PLAN) {
      if (hasBuildingFor(s, AI, type) && type !== 'farm') continue;
      if (type === 'farm' && farmCount(s) >= 4) continue;
      if (!affordable(p, BUILDINGS[type].cost)) break;
      if (type === 'lumber' || type === 'mine') {
        if (buildAtResource(s, type === 'lumber' ? 'wood' : 'ore', idleVillagers)) break;
        continue;
      }
      if (buildNear(s, AI, type, town, idleVillagers)) break;
    }
  }

  // 4. Research at the Academy and the Town Center, in RESEARCH_ORDER.
  for (const b of s.buildings.values()) {
    if (b.owner !== AI || !b.built || b.queue.length > 0) continue;
    if (b.type !== 'academy' && b.type !== 'town') continue;
    const at = b.type === 'town' ? 'town' : 'academy';
    const tech = RESEARCH_ORDER.find((id) => {
      const def = TECHS[id];
      const done = id === 'age2' ? p.age >= 2 : p.techs.includes(id);
      return def.at === at && !done && (!def.age2 || p.age >= 2) && affordable(p, def.cost);
    });
    if (tech) research(s, AI, b.id, tech);
  }

  // 5. Military: train from each production building in turn, while the army is under the cap.
  const roles: Role[] = ['melee', 'ranged', 'cavalry'];
  if (military.length < ARMY_CAP) {
    for (const role of roles) {
      const type = unitFor(s.players[AI].faction, role).id;
      const producer = [...s.buildings.values()].find((b) => b.owner === AI && b.built && b.queue.length === 0 && BUILDINGS[b.type].trains?.includes(role));
      if (!producer) continue;
      const cost = UNITS[type].cost;
      if (!affordable(p, cost)) continue;
      train(s, AI, producer.id, type);
    }
  }

  // 6. Gather: idle villagers go to the resource the AI is shortest of.
  for (const u of idleVillagers) {
    const res = neediest(s);
    const src = nearestNode(s, res, u);
    if (src) issue(s, AI, [u.id], { t: 'gather', node: src });
  }

  // 7. Attack: once the army is big enough, attack-move on the player's Town Center, and keep
  // sending idle soldiers after a fight.
  const army = military.filter((u) => u.hp > 0);
  const target = [...s.buildings.values()].find((b) => b.owner === PLAYER && b.type === 'town');
  if (army.length >= ARMY_TO_ATTACK && target) {
    const idleArmy = army.filter((u) => u.order.t === 'idle');
    if (idleArmy.length >= army.length / 2) {
      issue(s, AI, army.map((u) => u.id), { t: 'attackMove', x: target.tx + 2, y: target.ty + 2 });
      // The player is told about each new raid; the one under way keeps its raiders.
      startRaid(s, AI, PLAYER, army.map((u) => u.id));
    }
  }

  // 8. The Age II boon: the AI always holds a shieldwall.
  if (p.boonPending) chooseBoon(s, AI, 'shieldwall');
}

function farmCount(s: GameState) {
  let n = 0;
  for (const b of s.buildings.values()) if (b.owner === AI && b.type === 'farm') n++;
  return n;
}

/** The resource with the least income-relevant stock, weighted to keep food and wood up. */
function neediest(s: GameState): Resource {
  const r = s.players[AI].res;
  if (r.food < 100) return 'food';
  if (r.wood < 150) return 'wood';
  return r.ore < 100 ? 'ore' : r.wood <= r.food ? 'wood' : 'food';
}

function nearestNode(s: GameState, res: Resource, u: Unit): number | null {
  let best: { id: number; d: number } | null = null;
  for (const n of s.nodes.values()) {
    if (n.res !== res || n.amount <= 0) continue;
    const d = Math.hypot(n.tx + 0.5 - u.x, n.ty + 0.5 - u.y);
    if (!best || d < best.d) best = { id: n.id, d };
  }
  if (res === 'food') {
    for (const b of s.buildings.values()) {
      if (b.owner !== AI || !b.built || b.type !== 'farm') continue;
      const d = Math.hypot(b.tx + 1 - u.x, b.ty + 1 - u.y);
      if (!best || d < best.d) best = { id: b.id, d };
    }
  }
  return best?.id ?? null;
}

/** Places a building near the Town Center, sent to the nearest idle villager to build. */
function buildNear(s: GameState, owner: number, type: BuildingId, town: Building, idle: Unit[]): boolean {
  const def = BUILDINGS[type];
  const spot = findSpot(s, town.tx + 2, town.ty + 2, 4, 11, def.w, def.h);
  if (!spot) return false;
  return startBuild(s, owner, type, spot, idle);
}

/** Places a camp beside the nearest node of a resource, so the villagers drop off close by. */
function buildAtResource(s: GameState, res: Resource, idle: Unit[]): boolean {
  const town = [...s.buildings.values()].find((b) => b.owner === AI && b.type === 'town');
  if (!town) return false;
  let best: Node | null = null;
  for (const n of s.nodes.values()) {
    if (n.res !== res || n.amount <= 0) continue;
    if (!best || Math.hypot(n.tx - town.tx, n.ty - town.ty) < Math.hypot(best.tx - town.tx, best.ty - town.ty)) best = n;
  }
  if (!best) return false;
  const camp = type2(res);
  const spot = findSpot(s, best.tx, best.ty, 2, 5, BUILDINGS[camp].w, BUILDINGS[camp].h);
  if (!spot) return false;
  return startBuild(s, AI, camp, spot, idle);
}

const type2 = (res: Resource): BuildingId => (res === 'wood' ? 'lumber' : 'mine');

function startBuild(s: GameState, owner: number, type: BuildingId, spot: { tx: number; ty: number }, idle: Unit[]) {
  const id = placeBuilding(s, owner, type, spot.tx, spot.ty);
  if (id === null) return false;
  const builder = nearestUnit(idle, spot.tx, spot.ty) ?? nearestVillager(s, owner, spot.tx, spot.ty);
  if (builder) issue(s, owner, [builder.id], { t: 'build', b: id });
  return true;
}

function nearestUnit(list: Unit[], x: number, y: number): Unit | null {
  let best: Unit | null = null;
  for (const u of list) if (!best || Math.hypot(u.x - x, u.y - y) < Math.hypot(best.x - x, best.y - y)) best = u;
  return best;
}

function nearestVillager(s: GameState, owner: number, x: number, y: number): Unit | null {
  const list = [...s.units.values()].filter((u) => u.owner === owner && UNITS[u.type].role === 'villager');
  return nearestUnit(list, x, y);
}

/**
 * A free spot for a footprint `w` x `h`, between `min` and `max` tiles from (x, y), with each ring
 * tried in random order so the AI doesn't build in a neat row.
 */
function findSpot(s: GameState, x: number, y: number, min: number, max: number, w: number, h: number): { tx: number; ty: number } | null {
  for (let r = min; r <= max; r++) {
    const candidates: { tx: number; ty: number }[] = [];
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        candidates.push({ tx: Math.round(x + dx), ty: Math.round(y + dy) });
      }
    candidates.sort(() => Math.random() - 0.5);
    for (const c of candidates) if (fits(s, c.tx, c.ty, w, h)) return c;
  }
  return null;
}

function fits(s: GameState, tx: number, ty: number, w: number, h: number) {
  for (let y = ty; y < ty + h; y++)
    for (let x = tx; x < tx + w; x++) if (!inMap(x, y) || s.solid[idx(x, y)]) return false;
  return true;
}
