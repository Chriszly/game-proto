import { makeIsland } from './island';
import {
  ARTIFACT_VALUE,
  CAMP_COST,
  CAMP_REACH,
  DIG_COST,
  GRID,
  TREASURE_VALUE,
  WRECK_SUPPLIES,
  indexOf,
  inkBonus,
  maxSupplies,
  MILESTONES,
  SELL_BACK,
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
  const { kind, tiles, port, riddle } = makeIsland(1);
  const s: GameState = {
    island: 1,
    kind,
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
    milestones: 0,
    isleStart: 1,
    atlas: [],
    camps: [],
    storms: [],
    artifacts: 0,
    treasure: 0,
    riddle,
    dug: [],
  };
  s.supplies = maxSupplies(s);
  s.commission = rollCommission(s);
  return s;
}

const dist = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const has = (list: Point[], x: number, y: number) => list.some((p) => p.x === x && p.y === y);

/** Land, or sea beside land: the tiles that count toward the isle and that a camp can reach. */
function isChartable(s: GameState, x: number, y: number) {
  const t = tileAt(s, x, y);
  return !!t && (t.terrain !== 'sea' || neighbours(x, y).some((n) => tileAt(s, n.x, n.y)!.terrain !== 'sea'));
}

/**
 * A fogged tile can be surveyed from a charted land tile next to it (sea leads nowhere), or from a
 * base camp up to `CAMP_REACH` steps away; never while a storm sits on it.
 */
export function canSurvey(s: GameState, x: number, y: number) {
  const tile = tileAt(s, x, y);
  if (!tile || tile.revealed || has(s.storms, x, y)) return false;
  const beside = neighbours(x, y).some((n) => {
    const t = tileAt(s, n.x, n.y)!;
    return t.revealed && t.terrain !== 'sea';
  });
  return beside || (isChartable(s, x, y) && s.camps.some((c) => dist(c, { x, y }) <= CAMP_REACH));
}

/** Every tile that can be surveyed now, whatever it costs. */
export function frontier(s: GameState): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) if (canSurvey(s, x, y)) out.push({ x, y });
  return out;
}

/** Supplies it costs to survey a tile: 2 for forests and peaks, nothing for rivers and roads. */
export const costOf = (s: GameState, x: number, y: number) => TERRAIN[tileAt(s, x, y)!.terrain].cost;

/** True while a survey can still be paid for. */
export const canAfford = (s: GameState, p: Point) => costOf(s, p.x, p.y) <= s.supplies;

/** How far and in what shape the surveyor sees from a tile, with the Spyglass. */
export function sightOf(s: GameState, terrain: Terrain) {
  const info = TERRAIN[terrain];
  return { range: info.sight > 0 ? info.sight + rankOf(s, 'spyglass') : 0, shape: info.shape };
}

/**
 * Surveys the fogged tile (x, y) for its cost: reveals it, walks the surveyor there (or to the
 * shore beside it, for sea), and from hills and peaks also reveals the tiles in sight for free.
 * Finds under the revealed tiles turn up at once. The voyage ends when nothing more can be done.
 */
export function survey(s: GameState, x: number, y: number) {
  if (s.phase !== 'survey' || !canSurvey(s, x, y) || !canAfford(s, { x, y })) return false;
  s.supplies -= costOf(s, x, y);
  const tile = tileAt(s, x, y)!;
  const storms: Point[] = [];
  reveal(s, x, y, storms);
  if (tile.terrain === 'sea') {
    const shore = neighbours(x, y).filter((n) => {
      const t = tileAt(s, n.x, n.y)!;
      return t.revealed && t.terrain !== 'sea';
    });
    // Surveyed from a camp out of reach of the shore: the surveyor stays at the camp.
    const from = shore.length ? shore : s.camps.filter((c) => dist(c, { x, y }) <= CAMP_REACH);
    from.sort((a, b) => dist(a, s.surveyor) - dist(b, s.surveyor));
    if (from.length) s.surveyor = { ...from[0] };
  } else {
    s.surveyor = { x, y };
  }

  const { range, shape } = sightOf(s, tile.terrain);
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const inSight = shape === 'ring' ? true : Math.abs(dx) + Math.abs(dy) <= range;
      if (inSight) reveal(s, x + dx, y + dy, storms);
    }
  }
  // Each storm settles on the nearest fogged tile within two steps, once the lookout has seen what
  // it can.
  for (const p of storms) {
    const near: Point[] = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        const t = tileAt(s, q.x, q.y);
        if (t && !t.revealed && dist(p, q) <= 2 && isChartable(s, q.x, q.y) && !has(s.storms, q.x, q.y)) near.push(q);
      }
    }
    near.sort((a, b) => dist(a, p) - dist(b, p));
    if (near.length) s.storms.push(near[0]);
  }

  endIfDone(s);
  return true;
}

/**
 * Charts a tile, and turns up what it hides: stores from a wreck, an artifact, the riddle chart. A
 * storm's tile goes on `storms`, for `survey` to settle it beside.
 */
function reveal(s: GameState, x: number, y: number, storms: Point[]) {
  const tile = tileAt(s, x, y);
  if (!tile || tile.revealed) return;
  tile.revealed = true;
  s.surveyed.push({ x, y });
  if (tile.terrain === 'ruins' && s.riddle) s.riddle.known = true;
  if (tile.find === 'wreck') s.supplies += WRECK_SUPPLIES;
  if (tile.find === 'cave') s.artifacts += 1;
  if (tile.find === 'storm') storms.push({ x, y });
}

/** True while the surveyor can still survey something they can pay for, or dig for the treasure. */
export const canAct = (s: GameState) => frontier(s).some((p) => canAfford(s, p)) || diggable(s).length > 0;

function endIfDone(s: GameState) {
  if (!canAct(s)) returnToPort(s);
}

/** A base camp can go on the surveyor's tile (not the port, not twice) for `CAMP_COST` supplies. */
export function canCamp(s: GameState) {
  const t = tileAt(s, s.surveyor.x, s.surveyor.y)!;
  return s.phase === 'survey' && s.supplies >= CAMP_COST && t.terrain !== 'port' && t.terrain !== 'sea' && !has(s.camps, s.surveyor.x, s.surveyor.y);
}

/** Pitches a base camp where the surveyor stands; it lasts as long as the isle. */
export function pitchCamp(s: GameState) {
  if (!canCamp(s)) return false;
  s.supplies -= CAMP_COST;
  s.camps.push({ ...s.surveyor });
  endIfDone(s);
  return true;
}

/** The charted tiles that can still be dug for the riddle's treasure, once the riddle is known. */
export function diggable(s: GameState): Point[] {
  const r = s.riddle;
  if (s.phase !== 'survey' || !r || !r.known || r.found || s.supplies < DIG_COST) return [];
  const out: Point[] = [];
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      const t = tileAt(s, x, y)!;
      if (t.revealed && t.terrain !== 'sea' && t.terrain !== 'port' && !has(s.dug, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/** Digs a charted tile for `DIG_COST`: on the riddle's tile, the treasure goes on this voyage's chart. */
export function dig(s: GameState, x: number, y: number) {
  if (!has(diggable(s), x, y)) return false;
  s.supplies -= DIG_COST;
  s.dug.push({ x, y });
  s.surveyor = { x, y };
  const r = s.riddle!;
  if (r.at.x === x && r.at.y === y) {
    r.found = true;
    s.treasure += TREASURE_VALUE;
  }
  endIfDone(s);
  return true;
}

/** What a list of revealed tiles adds to the chart, before Fine Ink: a lookout's tally. */
export const valueOf = (s: GameState, tiles: Point[]) =>
  tiles.reduce((sum, p) => sum + TERRAIN[s.tiles[indexOf(p.x, p.y)].terrain].value, 0);

/**
 * Ends the voyage: the surveyor sails home and the voyage's tiles are drawn into a chart. Supplies
 * left over sell back with it (see `sellBackOf`).
 */
export function returnToPort(s: GameState) {
  if (s.phase !== 'survey') return false;
  s.chart = chartOf(s);
  s.phase = 'chart';
  s.storms = [];
  return true;
}

/**
 * How many tiles of each terrain the voyage revealed, and what the chart sells for: the tiles,
 * Fine Ink, the commission, artifacts and treasure, the unused supplies sold back and any isle
 * milestones reached.
 */
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
  const unused = s.supplies;
  const sellBack = sellBackOf(s, base);
  const due = milestonesDue(s);
  const milestoneCoins = due.reduce((sum, m) => sum + m.coins, 0);
  const atlas = due.some((m) => m.atlas);
  const artifactCoins = s.artifacts * ARTIFACT_VALUE;
  return {
    counts,
    base,
    ink,
    bonus,
    artifacts: s.artifacts,
    artifactCoins,
    treasure: s.treasure,
    unused,
    sellBack,
    milestones: due.length,
    milestoneCoins,
    atlas,
    total: base + ink + bonus + artifactCoins + s.treasure + sellBack + milestoneCoins,
  };
}

/** What the unused supplies sell back for: `SELL_BACK` each, never more than the chart's tiles are worth. */
export function sellBackOf(s: GameState, base = chartOf(s).base) {
  return Math.min(s.supplies * SELL_BACK, base);
}

/**
 * The tiles of this isle that can ever be charted: every land tile (the land is one patch the
 * surveyor can walk) and every sea tile beside land.
 */
export function chartable(s: GameState): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) if (isChartable(s, x, y)) out.push({ x, y });
  return out;
}

/** How much of the isle is charted: tiles done, out of how many, and the whole percent (100 only when all are). */
export function isleProgress(s: GameState) {
  const all = chartable(s);
  const done = all.filter((p) => tileAt(s, p.x, p.y)!.revealed).length;
  const pct = done === all.length ? 100 : Math.min(99, Math.floor((100 * done) / all.length));
  return { done, total: all.length, pct };
}

/** The isle milestones reached but not paid yet. */
export function milestonesDue(s: GameState) {
  const { pct } = isleProgress(s);
  return MILESTONES.slice(s.milestones).filter((m) => pct >= m.pct);
}

/** Sells the chart at the port for its total, and opens the harbor. */
export function sellChart(s: GameState) {
  if (s.phase !== 'chart' || !s.chart) return false;
  s.coins += s.chart.total;
  s.lastSale = s.chart.total;
  s.milestones += s.chart.milestones;
  if (s.chart.atlas) s.atlas.push({ island: s.island, kind: s.kind, voyages: s.voyage - s.isleStart + 1, tiles: isleProgress(s).total });
  s.chart = null;
  s.surveyed = [];
  s.artifacts = 0;
  s.treasure = 0;
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
    const { kind, tiles, port, riddle } = makeIsland(s.island);
    s.kind = kind;
    s.tiles = tiles;
    s.port = port;
    s.riddle = riddle;
    s.camps = [];
    s.dug = [];
    s.milestones = 0;
    s.isleStart = s.voyage + 1;
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
