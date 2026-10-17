/**
 * Where everything sits on the 960x540 view, and the board's fake 3D: an 8x8 grid tilted away from
 * the viewer, far rows narrower and shorter than near ones. `project` turns a (fractional) tile
 * position into a screen point and a scale; `tileAt` turns a screen point back into a tile.
 */
import { watching } from '../../../../shared/watch';

export const VIEW = { w: 960, h: 540 };

export const BOARD_VIEW = { topY: 92, bottomY: 362, topW: 380, bottomW: 512, cx: 480 };

/** The screen y of the board line `z` rows down (0 is the far edge, 8 the near edge). */
function rowY(z: number) {
  const t = z / 8;
  return BOARD_VIEW.topY + (BOARD_VIEW.bottomY - BOARD_VIEW.topY) * (t * 0.8 + t * t * 0.2);
}

const rowW = (z: number) => BOARD_VIEW.topW + (BOARD_VIEW.bottomW - BOARD_VIEW.topW) * (z / 8);

/** A corner or point of the board: `col` 0 to 8 across, `z` 0 to 8 down. */
export function boardPoint(col: number, z: number) {
  return { x: BOARD_VIEW.cx + (col / 8 - 0.5) * rowW(z), y: rowY(z) };
}

/** The centre of a (fractional) tile and how big things there are drawn (1 at the near edge). */
export function project(col: number, row: number) {
  const p = boardPoint(col + 0.5, row + 0.5);
  return { x: p.x, y: p.y, s: rowW(row + 0.5) / BOARD_VIEW.bottomW };
}

/** The tile under a screen point, or null off the board. */
export function tileAt(x: number, y: number): { col: number; row: number } | null {
  if (y < BOARD_VIEW.topY || y > BOARD_VIEW.bottomY) return null;
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (rowY(mid) < y) lo = mid;
    else hi = mid;
  }
  const z = lo;
  const left = boardPoint(0, z).x;
  const width = rowW(z);
  const col = Math.floor(((x - left) / width) * 8);
  const row = Math.floor(z);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return { col, row };
}

/** Units are drawn at this times the tile scale. */
export const UNIT_SCALE = 1.45;

export const BENCH = { y: 394, w: 50, h: 46, gap: 6, count: 9 };
export const benchX = (i: number) => VIEW.w / 2 - (BENCH.count * BENCH.w + (BENCH.count - 1) * BENCH.gap) / 2 + BENCH.w / 2 + i * (BENCH.w + BENCH.gap);

export const SHOP = { y: 432, h: 100, cardW: 116, x0: 172, gap: 8 };
export const shopCardX = (i: number) => SHOP.x0 + i * (SHOP.cardW + SHOP.gap);
/** The zone a robot is dropped on to sell it: the whole shop row. */
export const SELL_ZONE = { x: SHOP.x0, y: SHOP.y, w: 5 * SHOP.cardW + 4 * SHOP.gap, h: SHOP.h };

export const LEFT = { x: 8, w: 152 };
export const BUTTONS = {
  reroll: { x: 12, y: 464, w: 70, h: 28 },
  xp: { x: 88, y: 464, w: 70, h: 28 },
  sell: { x: 76, y: 500, w: 82, h: 30 },
  fight: { x: 800, y: 440, w: 150, h: 48 },
  speed: { x: 800, y: 496, w: 72, h: 30 },
  skill: { x: 800, y: 440, w: 150, h: 48 },
  watchSkill: { x: 878, y: 496, w: 72, h: 30 },
};

export const TRAITS_PANEL = { x: 8, y: 38, rowH: 21, maxRows: 9 };
export const ITEMS_PANEL = { x: 12, y: 264, size: 26, cols: 5 };
/** Under ?watch the watch panel takes the top right corner, so the list of players moves down. */
export const PLAYERS_PANEL = { x: 808, y: watching ? 76 : 38, w: 144, rowH: 30 };
export const INFO_PANEL = watching ? { x: 808, y: 322, w: 144, h: 102 } : { x: 808, y: 286, w: 144, h: 138 };

export const COMMANDER_HOME = { x: 196, y: 352 };
export const RIVAL_HOME = { x: 754, y: 104 };

export const DRAFT_RING = { cx: 480, cy: 226, rx: 180, ry: 72 };
