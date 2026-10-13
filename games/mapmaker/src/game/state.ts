import { byDifficulty } from '../../../../shared/settings';
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

export interface Tile {
  terrain: Terrain;
  revealed: boolean;
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
