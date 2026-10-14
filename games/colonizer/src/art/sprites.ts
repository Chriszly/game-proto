// Pixel art for Colonizer, drawn in code: each sprite is a short list of rectangles on a coarse
// grid, so every piece is a chunky pixel block. Units are 16x16 cells drawn 3px to a cell (48px);
// buildings are 4px cells, a tile being 8 cells across. Faction colours come from data.ts.
import { BUILDINGS, FACTIONS, MAP_SIZE, TILE, type BuildingId, type FactionId } from '../game/data';
import { DIRT, GRASS, ROCK, WATER } from '../game/map';

/** A rectangle in grid cells: x, y, width, height, colour. */
type Rect = [number, number, number, number, number];

const INK = 0x1d1418;
const SKIN = 0xe8b98a;
const HAIR = 0x3b2a1e;
const BOOT = 0x3b2416;
const WOOD = 0x8a5a32;
const WOOD_DARK = 0x5c3a21;
const WOOD_LIGHT = 0xb07d48;
const STEEL = 0xc9c6d2;
const STEEL_DARK = 0x8a8794;
const STONE = { dark: 0x5d5a66, mid: 0x8a8794, light: 0xb5b2bd };
const GOLD = 0xe6c766;
const GOLD_DARK = 0xc9a040;
const LEAF = { dark: 0x2d5a2a, mid: 0x3f7a35, light: 0x62a046, shine: 0x8cc35a };
const SOIL = 0x46301f;
const GLASS = 0xcfd8e0;
const VIOLET = 0x6a5bd6;
const VIOLET_DARK = 0x3c2c6e;
const HORSE_DARK = 0x2b1d14;

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function paint(ctx: CanvasRenderingContext2D, cell: number, rects: Rect[]) {
  for (const [x, y, w, h, c] of rects) {
    ctx.fillStyle = hex(c);
    ctx.fillRect(x * cell, y * cell, w * cell, h * cell);
  }
}

// ---------------------------------------------------------------- terrain

const PALETTE: Record<number, number[]> = {
  [GRASS]: [0x4f7536, 0x577f3d, 0x476b2f, 0x5f8a44],
  [DIRT]: [0x8a6a40, 0x7d5e38, 0x95744a],
  [WATER]: [0x2f6f9a, 0x3a7fae, 0x25608a],
  [ROCK]: [0x6d6a72, 0x7d7a82, 0x5d5a62],
};

/** Paints the terrain at 4 pixels per tile, with a fixed per-pixel speckle so it looks the same every time. */
export function bakeTerrain(ctx: CanvasRenderingContext2D, terrain: Uint8Array) {
  const cell = 4;
  for (let ty = 0; ty < MAP_SIZE; ty++)
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const kind = terrain[ty * MAP_SIZE + tx];
      const colours = PALETTE[kind];
      for (let py = 0; py < cell; py++)
        for (let px = 0; px < cell; px++) {
          const h = (tx * 31 + ty * 17 + px * 7 + py * 13) * 2654435761;
          const pick = Math.abs(h >>> 3) % colours.length;
          ctx.fillStyle = hex(colours[pick]);
          ctx.fillRect(tx * cell + px, ty * cell + py, 1, 1);
        }
    }
  // Water gets a lighter rim where it meets land.
  ctx.fillStyle = hex(0x9fd3f0);
  for (let ty = 0; ty < MAP_SIZE; ty++)
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      if (terrain[ty * MAP_SIZE + tx] !== WATER) continue;
      const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = tx + dx;
        const ny = ty + dy;
        return nx >= 0 && ny >= 0 && nx < MAP_SIZE && ny < MAP_SIZE && terrain[ny * MAP_SIZE + nx] !== WATER;
      });
      if (shore) ctx.fillRect(tx * cell, ty * cell, cell, 1);
    }
}

// ---------------------------------------------------------------- nodes

export function bakeTree(ctx: CanvasRenderingContext2D, variant: number) {
  const c = TILE / 8;
  paint(ctx, c, [
    [1, 6, 2, 2, WOOD_DARK],
    [0, 1, 4, 5, LEAF.mid],
    [1, 0, 2, 1, LEAF.mid],
    [3, 2, 1, 4, LEAF.dark],
    [1, 2, 1, 2, LEAF.light],
    [0, 2, 1, 1, LEAF.light],
    [variant ? 2 : 1, 4, 1, 1, LEAF.shine],
  ]);
  // Canopies are drawn over 4 by 5 cells, so the trunk sticks out below.
  paint(ctx, c, [
    [4, 1, 3, 4, LEAF.mid],
    [5, 0, 1, 1, LEAF.mid],
    [4, 1, 1, 2, LEAF.light],
    [6, 3, 1, 2, LEAF.dark],
    [5, 4, 1, 1, variant ? LEAF.shine : LEAF.light],
    [5, 6, 1, 2, WOOD_DARK],
  ]);
}

export function bakeBush(ctx: CanvasRenderingContext2D) {
  const c = TILE / 8;
  paint(ctx, c, [
    [1, 3, 6, 3, LEAF.mid],
    [2, 2, 4, 1, LEAF.mid],
    [2, 3, 2, 1, LEAF.light],
    [0, 4, 1, 2, LEAF.dark],
    [7, 4, 1, 2, LEAF.dark],
    [2, 1, 1, 1, 0xc8464f],
    [5, 2, 1, 1, 0xc8464f],
    [4, 5, 1, 1, 0xc8464f],
    [1, 6, 6, 1, LEAF.dark],
  ]);
}

export function bakeMine(ctx: CanvasRenderingContext2D) {
  const c = (TILE * 2) / 16;
  paint(ctx, c, [
    [1, 2, 14, 12, STONE.mid],
    [2, 1, 12, 1, STONE.light],
    [1, 3, 2, 10, STONE.dark],
    [13, 3, 2, 10, STONE.dark],
    [5, 8, 6, 6, INK],
    [6, 7, 4, 1, STONE.dark],
    [2, 4, 2, 2, GOLD],
    [11, 5, 2, 2, GOLD_DARK],
    [9, 11, 2, 2, GOLD],
    [4, 11, 1, 1, GOLD_DARK],
  ]);
}

// ---------------------------------------------------------------- units

const BODY: Rect[] = [
  [5, 1, 6, 2, HAIR],
  [5, 3, 6, 4, SKIN],
  [6, 4, 1, 1, INK],
  [9, 4, 1, 1, INK],
  [3, 7, 1, 4, SKIN],
  [12, 7, 1, 4, SKIN],
  [5, 11, 2, 3, 0],
  [9, 11, 2, 3, 0],
  [5, 14, 2, 1, BOOT],
  [9, 14, 2, 1, BOOT],
];

/** The rectangles of one unit, from its role and faction colours. */
function unitRects(role: string, faction: FactionId | 'neutral'): Rect[] {
  const f = faction === 'neutral' ? { cloth: 0x8a6b4a, clothDark: 0x5c4530, trim: 0xc9a040, horse: 0x8b5a2b } : FACTIONS[faction];
  const body: Rect[] = BODY.map((r) => (r[4] === 0 ? [r[0], r[1], r[2], r[3], f.clothDark] : r));
  const torso: Rect[] = [
    [4, 7, 8, 5, f.cloth],
    [4, 7, 8, 1, f.trim],
    [4, 10, 8, 1, WOOD_DARK],
  ];
  const out: Rect[] = [];
  if (role === 'cavalry') {
    // Horse first, so the rider sits on top of it.
    out.push([1, 11, 14, 3, f.horse], [2, 14, 2, 2, HORSE_DARK], [12, 14, 2, 2, HORSE_DARK], [14, 8, 2, 4, f.horse], [15, 7, 1, 1, HORSE_DARK]);
  }
  out.push(...body.slice(0, 2), ...torso, ...body.slice(2));
  if (role === 'villager') out.push([11, 6, 3, 3, WOOD_LIGHT], [11, 6, 3, 1, WOOD_DARK]);
  if (role === 'melee') out.push([13, 3, 1, 7, STEEL], [12, 9, 3, 1, WOOD], [1, 7, 2, 4, f.trim], [1, 7, 2, 1, f.clothDark]);
  if (role === 'ranged') out.push([13, 4, 1, 8, WOOD], [14, 5, 1, 1, WOOD_DARK], [14, 10, 1, 1, WOOD_DARK], [2, 6, 1, 4, WOOD_DARK]);
  if (role === 'cavalry') out.push([13, 1, 1, 7, STEEL_DARK], [13, 0, 1, 1, STEEL]);
  return out;
}

export function bakeUnit(ctx: CanvasRenderingContext2D, role: string, faction: FactionId | 'neutral') {
  const rects = unitRects(role, faction);
  // Bodies start at the top of the cell grid, so a cavalry rider's lance (row 0) is in view.
  paint(ctx, 3, rects);
}

// ---------------------------------------------------------------- buildings

const STONE_TYPES: BuildingId[] = ['town', 'barracks', 'range', 'stable', 'academy', 'watchtower'];

/** A building, `w` x `h` tiles, in faction colours. Cells are 4px, so a tile is 8 cells. */
export function bakeBuilding(ctx: CanvasRenderingContext2D, type: BuildingId, faction: FactionId) {
  const f = FACTIONS[faction];
  const def = BUILDINGS[type];
  const cols = def.w * 8;
  const rows = def.h * 8;
  const cell = 4;
  const c = (n: number) => Math.round(n);
  const mid = c(cols / 2);
  if (type === 'farm') {
    // A field: furrows of crops with a fence around them.
    const rects: Rect[] = [[0, 0, cols, rows, SOIL]];
    for (let r = 1; r < rows - 1; r += 3) rects.push([1, r, cols - 2, 2, LEAF.light], [1, r + 2, cols - 2, 1, LEAF.dark]);
    rects.push([0, 0, cols, 1, WOOD_LIGHT], [0, rows - 1, cols, 1, WOOD_LIGHT], [0, 0, 1, rows, WOOD_LIGHT], [cols - 1, 0, 1, rows, WOOD_LIGHT]);
    rects.push([mid - 1, 0, 2, 1, f.trim]);
    paint(ctx, cell, rects);
    return;
  }
  if (type === 'mine') {
    paint(ctx, cell, [
      [0, 0, cols, rows, STONE.mid],
      [0, 0, cols, 1, STONE.light],
      [1, 1, cols - 2, 1, STONE.light],
      [mid - 3, rows - 6, 6, 6, INK],
      [mid - 3, rows - 7, 6, 1, STONE.dark],
      [mid - 5, rows - 8, 2, 2, GOLD],
      [mid + 3, rows - 9, 2, 2, GOLD_DARK],
      [mid - 1, rows - 3, 2, 2, GOLD],
    ]);
    return;
  }
  const stone = STONE_TYPES.includes(type);
  const wall = stone ? STONE : { dark: WOOD_DARK, mid: WOOD, light: WOOD_LIGHT };
  const roofRows = Math.round(rows * 0.42);
  const rects: Rect[] = [];
  // Shadow, walls and a door.
  rects.push([1, rows - 1, cols - 2, 1, INK]);
  rects.push([1, roofRows, cols - 2, rows - roofRows - 1, wall.mid]);
  rects.push([1, roofRows, cols - 2, 1, wall.light], [1, rows - 2, cols - 2, 1, wall.dark]);
  const doorH = Math.max(3, Math.round(rows * 0.22));
  rects.push([mid - 2, rows - 2 - doorH, 4, doorH, WOOD_DARK]);
  // Roof: stripes in the faction colours, narrowing towards the top.
  for (let r = 0; r < roofRows; r++) {
    const inset = Math.max(0, Math.round((roofRows - r) * 0.7));
    rects.push([inset, r, cols - 2 * inset, 1, r % 2 ? f.clothDark : f.cloth]);
  }
  rects.push([mid - 1, 0, 1, 3, STEEL], [mid, 0, 2, 2, f.trim]);
  // Windows on either side of the door.
  if (cols >= 16) {
    rects.push([4, roofRows + 2, 3, 3, GLASS], [cols - 7, roofRows + 2, 3, 3, GLASS]);
  }
  // A pictogram in the middle of the wall shows what the building is.
  const iy = roofRows + 2;
  switch (type) {
    case 'town':
      rects.push([mid - 2, iy, 4, 5, GOLD], [mid - 1, iy - 1, 2, 1, GOLD_DARK]);
      break;
    case 'house':
      rects.push([mid - 3, iy + 1, 6, 1, WOOD_LIGHT], [mid - 2, iy + 2, 4, 1, WOOD_LIGHT]);
      break;
    case 'lumber':
      rects.push([mid - 3, iy, 6, 2, WOOD_LIGHT], [mid - 3, iy + 2, 6, 2, WOOD], [mid - 3, iy + 4, 6, 2, WOOD_LIGHT]);
      break;
    case 'barracks':
      for (let i = 0; i < 6; i++) rects.push([mid - 3 + i, iy + i, 1, 1, STEEL], [mid + 2 - i, iy + i, 1, 1, STEEL]);
      break;
    case 'range':
      rects.push([mid - 1, iy, 1, 7, WOOD], [mid + 1, iy + 1, 1, 5, WOOD_DARK], [mid, iy + 3, 1, 1, STEEL]);
      break;
    case 'stable':
      rects.push([mid - 3, iy, 1, 5, GOLD], [mid + 2, iy, 1, 5, GOLD], [mid - 3, iy + 4, 6, 1, GOLD]);
      break;
    case 'academy':
      rects.push([mid - 3, iy, 6, 4, VIOLET], [mid - 3, iy, 6, 1, VIOLET_DARK], [mid - 1, iy + 1, 2, 2, GLASS]);
      break;
    case 'watchtower':
      rects.push([mid - 1, iy - 1, 2, 6, INK], [mid - 2, iy + 5, 4, 1, STONE.dark]);
      break;
    default:
      break;
  }
  paint(ctx, cell, rects);
}

// ---------------------------------------------------------------- fog helpers

/** Colours used by the scene for the health bars and the selection ring. */
export const UI = { hp: 0x62c45a, hpBack: 0x2a1d14, select: 0xf3c64e, enemy: 0xd2473a, green: 0x62c45a };
