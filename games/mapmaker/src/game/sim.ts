import { makeIsland } from './island';
import {
  GRID,
  indexOf,
  inkBonus,
  maxSupplies,
  neighbours,
  rankOf,
  tileAt,
  type Chart,
  type Commission,
  type GameState,
  type Point,
} from './state';
import { CHART_ORDER, TERRAIN, type Terrain } from './terrain';
import { nextCost, type UpgradeId } from './upgrades';

/** What a commission can ask for: how many tiles of a terrain, and the bonus it pays. */
const COMMISSIONS: Commission[] = [
  { terrain: 'beach', need: 3, bonus: 10 },
  { terrain: 'grass', need: 3, bonus: 10 },
  { terrain: 'forest', need: 3, bonus: 12 },
  { terrain: 'hills', need: 2, bonus: 14 },
  { terrain: 'sea', need: 4, bonus: 8 },
  { terrain: 'village', need: 1, bonus: 15 },
];

/** A new game: the first island, the first voyage under way from its port. */
export function newGame(): GameState {
  const { tiles, port } = makeIsland(1);
  const s: GameState = {
    island: 1,
    voyage: 1,
    phase: 'survey',
    tiles,
    port,
    surveyor: { ...port },
    supplies: 0,
    coins: 0,
    ranks: {},
    surveyed: [],
    commission: null,
    chart: null,
    lastSale: 0,
  };
  s.supplies = maxSupplies(s);
  s.commission = rollCommission(s);
  return s;
}

/** A fogged tile can be surveyed from a revealed land tile next to it (sea leads nowhere). */
export function canSurvey(s: GameState, x: number, y: number) {
  const tile = tileAt(s, x, y);
  if (!tile || tile.revealed) return false;
  return neighbours(x, y).some((n) => {
    const t = tileAt(s, n.x, n.y)!;
    return t.revealed && t.terrain !== 'sea';
  });
}

/** Every tile that can be surveyed now. */
export function frontier(s: GameState): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) if (canSurvey(s, x, y)) out.push({ x, y });
  return out;
}

/** How far and in what shape the surveyor sees from a tile, with the Spyglass. */
export function sightOf(s: GameState, terrain: Terrain) {
  const info = TERRAIN[terrain];
  return { range: info.sight > 0 ? info.sight + rankOf(s, 'spyglass') : 0, shape: info.shape };
}

/**
 * Surveys the fogged tile (x, y) for one supply: reveals it, walks the surveyor there (or to the
 * shore beside it, for sea), and from hills and peaks also reveals the tiles in sight for free.
 * The voyage ends when the supplies run out or nothing is left to survey.
 */
export function survey(s: GameState, x: number, y: number) {
  if (s.phase !== 'survey' || s.supplies <= 0 || !canSurvey(s, x, y)) return false;
  s.supplies -= 1;
  const tile = tileAt(s, x, y)!;
  reveal(s, x, y);
  if (tile.terrain === 'sea') {
    const shore = neighbours(x, y).filter((n) => {
      const t = tileAt(s, n.x, n.y)!;
      return t.revealed && t.terrain !== 'sea';
    });
    shore.sort((a, b) => dist(a, s.surveyor) - dist(b, s.surveyor));
    s.surveyor = { ...shore[0] };
  } else {
    s.surveyor = { x, y };
  }

  const { range, shape } = sightOf(s, tile.terrain);
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const inSight = shape === 'ring' ? true : Math.abs(dx) + Math.abs(dy) <= range;
      if (inSight) reveal(s, x + dx, y + dy);
    }
  }

  if (s.supplies <= 0 || frontier(s).length === 0) returnToPort(s);
  return true;
}

function reveal(s: GameState, x: number, y: number) {
  const tile = tileAt(s, x, y);
  if (!tile || tile.revealed) return;
  tile.revealed = true;
  s.surveyed.push({ x, y });
}

const dist = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Ends the voyage: the surveyor sails home and the voyage's tiles are drawn into a chart. */
export function returnToPort(s: GameState) {
  if (s.phase !== 'survey') return false;
  s.chart = chartOf(s);
  s.phase = 'chart';
  return true;
}

/** How many tiles of each terrain the voyage revealed, and what the chart sells for. */
export function chartOf(s: GameState): Chart {
  const counts: Partial<Record<Terrain, number>> = {};
  for (const p of s.surveyed) {
    const t = s.tiles[indexOf(p.x, p.y)].terrain;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  const base = CHART_ORDER.reduce((sum, t) => sum + (counts[t] ?? 0) * TERRAIN[t].value, 0);
  const ink = Math.round(base * inkBonus(s));
  const c = s.commission;
  const bonus = c && (counts[c.terrain] ?? 0) >= c.need ? c.bonus : 0;
  return { counts, base, ink, bonus, total: base + ink + bonus };
}

/** Sells the chart at the port for its total, and opens the harbor. */
export function sellChart(s: GameState) {
  if (s.phase !== 'chart' || !s.chart) return false;
  s.coins += s.chart.total;
  s.lastSale = s.chart.total;
  s.chart = null;
  s.surveyed = [];
  s.phase = 'harbor';
  return true;
}

/** Buys the next rank of an upgrade at the harbor. */
export function buy(s: GameState, id: UpgradeId) {
  const cost = nextCost(id, rankOf(s, id));
  if (s.phase !== 'harbor' || cost === null || s.coins < cost) return false;
  s.coins -= cost;
  s.ranks[id] = rankOf(s, id) + 1;
  return true;
}

/** True once every tile that can be reached on this island is charted. */
export const islandCharted = (s: GameState) => frontier(s).length === 0;

/**
 * Sets out on the next voyage with full supplies and a new commission, to a new island once this
 * one is charted.
 */
export function setSail(s: GameState) {
  if (s.phase !== 'harbor') return false;
  if (islandCharted(s)) {
    s.island += 1;
    const { tiles, port } = makeIsland(s.island);
    s.tiles = tiles;
    s.port = port;
  }
  s.voyage += 1;
  s.surveyor = { ...s.port };
  s.supplies = maxSupplies(s);
  s.commission = rollCommission(s);
  s.phase = 'survey';
  return true;
}

/**
 * Picks a commission the fogged part of the island can still fill. Only sea beside land counts:
 * open sea can never be surveyed.
 */
function rollCommission(s: GameState): Commission | null {
  const fogged: Partial<Record<Terrain, number>> = {};
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      const t = tileAt(s, x, y)!;
      if (t.revealed) continue;
      if (t.terrain === 'sea' && !neighbours(x, y).some((n) => tileAt(s, n.x, n.y)!.terrain !== 'sea')) continue;
      fogged[t.terrain] = (fogged[t.terrain] ?? 0) + 1;
    }
  }
  const open = COMMISSIONS.filter((c) => (fogged[c.terrain] ?? 0) >= c.need);
  if (open.length === 0) return null;
  return { ...open[Math.floor(Math.random() * open.length)] };
}
