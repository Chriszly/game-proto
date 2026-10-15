import { byDifficulty } from '../../../../shared/settings';
import type { IsleKind } from './kinds';
import type { Terrain } from './terrain';
import type { UpgradeId } from './upgrades';

/** The island grid, in tiles. */
export const GRID = { w: 15, h: 11 };
/** Supplies at the start of every voyage before Provisions; each survey costs one. */
export const BASE_SUPPLIES = byDifficulty(16, 12, 9);
/** Supplies each rank of Provisions adds. */
export const PROVISIONS_STEP = 3;
/** How much each rank of Fine Ink adds to a chart's price. */
export const INK_STEP = 0.25;
/** Coins each unused supply sells back for on Return to port, up to the chart's own tile value. */
export const SELL_BACK = 3;
/**
 * The isle completion goal: how much of the isle has been charted, in percent, pays these once
 * each, on the voyage that reaches them. The last one binds the isle into the atlas.
 */
export const MILESTONES: Milestone[] = [
  { pct: 50, coins: 20, atlas: false },
  { pct: 75, coins: 40, atlas: false },
  { pct: 100, coins: 0, atlas: true },
];

/** Supplies a shipwreck's stores add to the voyage. */
export const WRECK_SUPPLIES = 3;
/** What an artifact from a cave sells for at the port. */
export const ARTIFACT_VALUE = 15;
/** What a base camp costs in supplies, and how far (in steps along the grid) it lets you survey. */
export const CAMP_COST = 3;
export const CAMP_REACH = 2;
/** What digging a charted tile for the riddle's treasure costs, and what the treasure pays. */
export const DIG_COST = 1;
export const TREASURE_VALUE = 60;

export interface Milestone {
  pct: number;
  coins: number;
  atlas: boolean;
}

/** A finished isle, bound into the atlas when its last tile is charted. */
export interface AtlasPage {
  island: number;
  kind: IsleKind;
  /** Voyages it took. */
  voyages: number;
  /** Tiles charted on it. */
  tiles: number;
}

/**
 * What a tile can hide, found when it is charted: a shipwreck's stores (+supplies), a cave with an
 * artifact that sells at the port, or a storm that blocks a tile near it for the rest of the voyage.
 */
export type Find = 'wreck' | 'cave' | 'storm';

export interface Tile {
  terrain: Terrain;
  revealed: boolean;
  find?: Find;
}

/**
 * The isle's treasure riddle: its clues point at one hidden tile. The ruins hold the riddle chart
 * (`known` once they are charted); digging the right charted tile finds the treasure.
 */
export interface Riddle {
  at: Point;
  clues: string[];
  known: boolean;
  found: boolean;
}

/** A buyer at the port pays a bonus for a chart that shows enough of one terrain. */
export interface Commission {
  terrain: Terrain;
  need: number;
  bonus: number;
}

/** What a voyage's chart sells for. */
export interface Chart {
  counts: Partial<Record<Terrain, number>>;
  /** The tiles' values added up, before Fine Ink. */
  base: number;
  /** What Fine Ink adds. */
  ink: number;
  /** The commission's bonus, if the chart meets it. */
  bonus: number;
  /** Artifacts brought back from caves, and what they sell for; the riddle's treasure, if dug up. */
  artifacts: number;
  artifactCoins: number;
  treasure: number;
  /** Supplies left when the voyage ended, and what they sell back for (`SELL_BACK` each, capped at `base`). */
  unused: number;
  sellBack: number;
  /** How many isle milestones this voyage reached, what they pay, and whether it finished the isle. */
  milestones: number;
  milestoneCoins: number;
  atlas: boolean;
  total: number;
}

/**
 * - `survey`: on the island, revealing tiles.
 * - `chart`: back at port with the voyage's chart, not sold yet.
 * - `harbor`: chart sold; buy upgrades and set sail.
 */
export type Phase = 'survey' | 'chart' | 'harbor';

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  /** The island being charted, from 1; a new one comes once every tile you can reach is charted. */
  island: number;
  kind: IsleKind;
  /** Voyages made, from 1. */
  voyage: number;
  phase: Phase;
  /** Row by row, `GRID.w` x `GRID.h`. */
  tiles: Tile[];
  port: Point;
  /** The tile the surveyor stands on. */
  surveyor: Point;
  supplies: number;
  coins: number;
  ranks: Partial<Record<UpgradeId, number>>;
  /** The tiles revealed on this voyage, in order, surveyed or seen from hills and peaks. */
  surveyed: Point[];
  commission: Commission | null;
  /** Set on the way back to port. */
  chart: Chart | null;
  /** What the last chart sold for, shown at the harbor. */
  lastSale: number;
  /** How many of `MILESTONES` this isle has paid out. */
  milestones: number;
  /** The voyage this isle was first sailed to. */
  isleStart: number;
  /** Every isle charted to the last tile, in order. */
  atlas: AtlasPage[];
  /** Base camps on this isle: each lets the surveyor survey `CAMP_REACH` tiles out from it. */
  camps: Point[];
  /** Tiles a storm blocks until the voyage ends. */
  storms: Point[];
  /** Artifacts found on this voyage, and the treasure (in coins) dug up on it. */
  artifacts: number;
  treasure: number;
  riddle: Riddle | null;
  /** Charted tiles already dug for the treasure on this isle. */
  dug: Point[];
}

export const rankOf = (s: GameState, id: UpgradeId) => s.ranks[id] ?? 0;
export const maxSupplies = (s: GameState) => BASE_SUPPLIES + PROVISIONS_STEP * rankOf(s, 'provisions');
export const inkBonus = (s: GameState) => INK_STEP * rankOf(s, 'ink');

export const indexOf = (x: number, y: number) => y * GRID.w + x;
export const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID.w && y < GRID.h;
export const tileAt = (s: GameState, x: number, y: number) => (inGrid(x, y) ? s.tiles[indexOf(x, y)] : undefined);

/** The four tiles next to (x, y), in the grid. */
export function neighbours(x: number, y: number): Point[] {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].filter((p) => inGrid(p.x, p.y));
}
