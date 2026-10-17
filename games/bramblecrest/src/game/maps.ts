// The four places of the first chapter, built in code from rectangles and lines on a grid of
// TILE-pixel tiles: Mossford (the village), Bramble Woods, Glimmer Fen and the Sunken Shrine.
// Everything that is not ground (houses, lamps, people, foes, chests, posts) is listed beside the
// tiles. Tile coordinates count from the map's top-left corner.

export const TILE = 32;

export type Tile =
  | 'grass'
  | 'path'
  | 'flowers'
  | 'tree'
  | 'faketree'
  | 'bush'
  | 'thorns'
  | 'water'
  | 'reeds'
  | 'wall'
  | 'floor'
  | 'pit'
  | 'ring';

/** Tiles nothing walks through. `faketree` looks like a tree but is walkable (a secret way). */
export const SOLID: ReadonlySet<Tile> = new Set<Tile>(['tree', 'bush', 'thorns', 'water', 'wall', 'pit', 'ring']);
/** Solid tiles the hookvine flies over. */
export const LOW: ReadonlySet<Tile> = new Set<Tile>(['water', 'pit', 'bush', 'ring']);
/** Tiles the sword clears. */
export const CUTTABLE: ReadonlySet<Tile> = new Set<Tile>(['bush', 'thorns']);

export type MapId = 'village' | 'woods' | 'fen' | 'shrine';
export type Theme = 'village' | 'woods' | 'fen' | 'shrine';
export type Facing = 'up' | 'down' | 'left' | 'right';
export type PropKind = 'house' | 'shed' | 'well' | 'lamp' | 'statue' | 'arch' | 'hut' | 'brazier' | 'shroom' | 'bench' | 'rock';
export type EnemyKind = 'slug' | 'moth' | 'thornling';
export type NpcId = 'elder' | 'pip' | 'baker' | 'cat' | 'hermit';

export interface Prop {
  kind: PropKind;
  /** Top-left tile of its footprint. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Which way a statue points, for the fen's riddle. */
  facing?: Facing;
}
export interface Npc { id: NpcId; name: string; x: number; y: number }
export interface Chest { id: string; x: number; y: number; item: ItemId }
export interface Sign { x: number; y: number; text: string }
export interface Exit {
  /** The tiles that lead out. */
  x: number;
  y: number;
  w: number;
  h: number;
  to: MapId;
  /** The tile the player arrives on there, and which way they face. */
  tx: number;
  ty: number;
  facing: Facing;
  /** A flag that must be set before the way opens. */
  flag?: string;
}
export interface EnemySpawn { kind: EnemyKind; x: number; y: number; room?: string }
export interface Post { x: number; y: number }
/** A door across one or more tiles: `key` needs a small key, `bars` opens on a flag, `shut` closes while its room has foes. */
export interface Door { id: string; x: number; y: number; w: number; h: number; kind: 'key' | 'bars' | 'shut'; flag?: string; room?: string }
/** A moonstone: lying in the open, under a bush (shows once the bush is cut) or buried (a sword swing on the spot digs it up). */
export interface Moonstone { id: string; x: number; y: number; hidden?: 'buried' }
export interface Room { id: string; x: number; y: number; w: number; h: number }

export type ItemId = 'sword' | 'hookvine' | 'key' | 'heart' | 'oil';

export interface MapDef {
  id: MapId;
  name: string;
  theme: Theme;
  w: number;
  h: number;
  /** How dark the night is here, 0 to 1. */
  dark: number;
  tiles: Tile[];
  props: Prop[];
  npcs: Npc[];
  chests: Chest[];
  signs: Sign[];
  exits: Exit[];
  enemies: EnemySpawn[];
  posts: Post[];
  doors: Door[];
  stones: Moonstone[];
  rooms: Room[];
  /** Push blocks and the plate one of them opens. */
  blocks: { x: number; y: number }[];
  plates: { x: number; y: number; flag: string }[];
  /** The boss arena's middle, in tiles, in the shrine only. */
  boss?: { x: number; y: number };
  /** The fen's will-o'-wisp hops between these tiles. */
  wisp?: { x: number; y: number }[];
}

/** A small fixed-seed random number generator, so the maps are the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

class Builder {
  readonly def: MapDef;
  constructor(id: MapId, name: string, theme: Theme, w: number, h: number, dark: number, ground: Tile) {
    this.def = {
      id, name, theme, w, h, dark,
      tiles: new Array<Tile>(w * h).fill(ground),
      props: [], npcs: [], chests: [], signs: [], exits: [], enemies: [], posts: [], doors: [], stones: [], rooms: [], blocks: [], plates: [],
    };
  }
  set(x: number, y: number, t: Tile) {
    if (x >= 0 && y >= 0 && x < this.def.w && y < this.def.h) this.def.tiles[y * this.def.w + x] = t;
    return this;
  }
  get(x: number, y: number): Tile | undefined {
    if (x < 0 || y < 0 || x >= this.def.w || y >= this.def.h) return undefined;
    return this.def.tiles[y * this.def.w + x];
  }
  rect(x: number, y: number, w: number, h: number, t: Tile) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, t);
    return this;
  }
  border(t: Tile, thick: number) {
    const { w, h } = this.def;
    this.rect(0, 0, w, thick, t).rect(0, h - thick, w, thick, t).rect(0, 0, thick, h, t).rect(w - thick, 0, thick, h, t);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, t: Tile) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++)
        if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1) this.set(i, j, t);
    return this;
  }
  /** Sprinkles `t` over plain ground in an area, keeping `gap` tiles clear of anything else. */
  scatter(t: Tile, n: number, area: { x: number; y: number; w: number; h: number }, seed: number, on: Tile = 'grass', gap = 1) {
    const r = rng(seed);
    for (let k = 0, tries = 0; k < n && tries < n * 40; tries++) {
      const x = area.x + Math.floor(r() * area.w);
      const y = area.y + Math.floor(r() * area.h);
      let clear = true;
      for (let j = -gap; j <= gap && clear; j++) for (let i = -gap; i <= gap && clear; i++) {
        const near = this.get(x + i, y + j);
        if (near !== on && near !== t && near !== 'flowers') clear = false;
      }
      if (!clear || this.get(x, y) !== on || this.occupied(x, y)) continue;
      this.set(x, y, t);
      k++;
    }
    return this;
  }
  /** Whether a prop, person or thing stands on a tile, so scattering leaves it alone. */
  occupied(x: number, y: number) {
    const d = this.def;
    const at = (p: { x: number; y: number }) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1;
    return (
      d.props.some((p) => x >= p.x - 1 && x <= p.x + p.w && y >= p.y - 1 && y <= p.y + p.h) ||
      [...d.npcs, ...d.chests, ...d.signs, ...d.posts, ...d.stones, ...d.enemies].some(at)
    );
  }
  prop(kind: PropKind, x: number, y: number, w = 1, h = 1, facing?: Facing) {
    this.def.props.push({ kind, x, y, w, h, facing });
    return this;
  }
}

function village(): MapDef {
  const b = new Builder('village', 'Mossford', 'village', 40, 26, 0.74, 'grass');
  const d = b.def;
  b.border('tree', 2);
  // The main street runs north to the gate, the cross street east to west.
  b.rect(19, 0, 2, 24, 'path').rect(6, 11, 28, 2, 'path').rect(25, 18, 2, 3, 'path');
  // Thorns block the north gate until they are cut.
  b.rect(19, 3, 2, 1, 'thorns');
  b.ellipse(7, 20, 3.6, 2.4, 'water');
  b.prop('house', 6, 6, 5, 4).prop('house', 23, 14, 5, 4).prop('shed', 30, 6, 3, 3).prop('well', 15, 15, 2, 2);
  b.prop('lamp', 18, 7).prop('lamp', 21, 13).prop('lamp', 17, 19).prop('lamp', 28, 10).prop('lamp', 11, 13);
  b.prop('bench', 33, 19, 2, 1).prop('rock', 36, 10);
  d.npcs.push(
    { id: 'elder', name: 'Elder Wren', x: 17, y: 13 },
    { id: 'pip', name: 'Pip', x: 13, y: 16 },
    { id: 'baker', name: 'Marla', x: 29, y: 13 },
    { id: 'cat', name: 'Biscuit', x: 34, y: 20 },
  );
  d.chests.push({ id: 'blade', x: 31, y: 10, item: 'sword' });
  d.signs.push({ x: 21, y: 5, text: 'North: Bramble Woods. The thorns came back again this spring.' });
  d.exits.push({ x: 19, y: 0, w: 2, h: 1, to: 'woods', tx: 24, ty: 28, facing: 'up' });
  // A ring of bushes by the pond hides a moonstone.
  b.rect(12, 20, 3, 3, 'bush').set(13, 21, 'grass');
  d.stones.push({ id: 'v-pond', x: 13, y: 21 }, { id: 'v-cat', x: -1, y: -1 });
  b.scatter('tree', 7, { x: 2, y: 2, w: 36, h: 22 }, 11, 'grass', 2);
  b.scatter('bush', 8, { x: 2, y: 2, w: 36, h: 22 }, 12);
  b.scatter('flowers', 30, { x: 2, y: 2, w: 36, h: 22 }, 13, 'grass', 0);
  return d;
}

function woods(): MapDef {
  const b = new Builder('woods', 'Bramble Woods', 'woods', 50, 32, 0.8, 'grass');
  const d = b.def;
  b.border('tree', 2);
  // The path from the village gate up to the shrine, with a branch west to the river.
  b.rect(24, 16, 2, 16, 'path').rect(24, 16, 20, 2, 'path').rect(42, 4, 2, 13, 'path').rect(13, 15, 11, 2, 'path');
  b.rect(42, 10, 2, 1, 'thorns');
  // The river, crossed only on the hookvine, and the way to the fen beyond it.
  b.rect(8, 2, 4, 28, 'water').rect(0, 15, 8, 2, 'path');
  d.posts.push({ x: 7, y: 15 }, { x: 12, y: 15 });
  b.prop('arch', 41, 1, 4, 3);
  d.exits.push(
    { x: 24, y: 31, w: 2, h: 1, to: 'village', tx: 19, ty: 2, facing: 'down' },
    { x: 42, y: 4, w: 2, h: 1, to: 'shrine', tx: 21, ty: 48, facing: 'up' },
    { x: 0, y: 15, w: 1, h: 2, to: 'fen', tx: 33, ty: 12, facing: 'left' },
  );
  d.signs.push({ x: 26, y: 27, text: 'The Sunken Shrine lies northeast. Mind the slugs after dark.' });
  // A hidden grove: a ring of trees, entered through two that are not really there.
  b.rect(30, 21, 9, 7, 'tree').rect(32, 23, 5, 3, 'grass').set(30, 24, 'faketree').set(31, 24, 'faketree');
  d.stones.push({ id: 'w-grove', x: 35, y: 24 });
  b.rect(16, 21, 3, 3, 'bush').set(17, 22, 'grass');
  d.stones.push({ id: 'w-bush', x: 17, y: 22 });
  d.enemies.push(
    { kind: 'slug', x: 26, y: 23 }, { kind: 'slug', x: 30, y: 18 }, { kind: 'slug', x: 37, y: 15 }, { kind: 'slug', x: 19, y: 14 },
    { kind: 'moth', x: 33, y: 9 }, { kind: 'moth', x: 28, y: 11 }, { kind: 'moth', x: 40, y: 24 },
  );
  b.prop('lamp', 26, 29).prop('lamp', 41, 6).prop('shroom', 15, 18).prop('shroom', 4, 10).prop('shroom', 34, 6).prop('rock', 22, 9);
  b.scatter('tree', 70, { x: 2, y: 2, w: 46, h: 28 }, 21, 'grass', 1);
  b.scatter('bush', 16, { x: 12, y: 2, w: 36, h: 28 }, 22);
  b.scatter('flowers', 24, { x: 2, y: 2, w: 46, h: 28 }, 23, 'grass', 0);
  return d;
}

function fen(): MapDef {
  const b = new Builder('fen', 'Glimmer Fen', 'fen', 36, 24, 0.82, 'grass');
  const d = b.def;
  b.border('tree', 2);
  b.rect(34, 12, 2, 2, 'path').rect(20, 12, 14, 2, 'path').rect(10, 8, 2, 6, 'path').rect(10, 12, 10, 2, 'path');
  b.ellipse(25, 6, 4, 2.2, 'water').ellipse(6, 18, 3.5, 2.5, 'water').ellipse(26, 19, 3, 2, 'water').ellipse(15, 19, 2, 1.4, 'water');
  b.scatter('reeds', 40, { x: 2, y: 2, w: 32, h: 20 }, 31, 'grass', 0);
  b.prop('hut', 6, 4, 4, 3);
  // Three statues point at one spot; a swing there digs up what they guard.
  b.prop('statue', 4, 12, 1, 1, 'right').prop('statue', 17, 3, 1, 1, 'down').prop('statue', 17, 20, 1, 1, 'up');
  d.stones.push({ id: 'f-statues', x: 17, y: 12, hidden: 'buried' }, { id: 'f-wisp', x: -1, y: -1 });
  d.npcs.push({ id: 'hermit', name: 'Old Sedge', x: 11, y: 7 });
  d.exits.push({ x: 35, y: 12, w: 1, h: 2, to: 'woods', tx: 1, ty: 15, facing: 'right' });
  d.wisp = [{ x: 28, y: 9 }, { x: 31, y: 17 }, { x: 22, y: 16 }, { x: 13, y: 16 }];
  d.enemies.push({ kind: 'moth', x: 22, y: 9 }, { kind: 'moth', x: 8, y: 15 }, { kind: 'slug', x: 28, y: 15 });
  b.prop('shroom', 14, 5).prop('shroom', 30, 4).prop('shroom', 21, 21).prop('shroom', 3, 7);
  b.scatter('tree', 18, { x: 2, y: 2, w: 32, h: 20 }, 32, 'grass', 1);
  b.scatter('flowers', 14, { x: 2, y: 2, w: 32, h: 20 }, 33, 'grass', 0);
  return d;
}

function shrine(): MapDef {
  const b = new Builder('shrine', 'Sunken Shrine', 'shrine', 44, 52, 0.92, 'wall');
  const d = b.def;
  const room = (id: string, x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, 'floor');
    d.rooms.push({ id, x, y, w, h });
  };
  room('boss', 8, 2, 28, 11);
  room('pits', 15, 16, 14, 10);
  room('vine', 31, 16, 10, 10);
  room('alcove', 3, 18, 6, 6);
  room('block', 31, 29, 10, 10);
  room('hall', 15, 29, 14, 10);
  room('entry', 17, 42, 10, 8);
  room('key', 3, 41, 10, 9);
  // Corridors between the rooms.
  b.rect(21, 50, 2, 2, 'floor').rect(13, 45, 4, 2, 'floor').rect(21, 39, 2, 3, 'floor').rect(29, 33, 2, 2, 'floor');
  b.rect(35, 26, 2, 3, 'floor').rect(29, 20, 2, 2, 'floor').rect(16, 13, 2, 3, 'floor').rect(9, 20, 6, 2, 'floor');
  // The pit room: a chasm between two ledges, and a narrower one to the hidden alcove.
  b.rect(20, 16, 5, 10, 'pit').rect(9, 20, 5, 2, 'pit');
  d.posts.push({ x: 19, y: 20 }, { x: 25, y: 20 }, { x: 8, y: 20 }, { x: 14, y: 20 });
  d.doors.push(
    { id: 'key-room', x: 13, y: 45, w: 1, h: 2, kind: 'shut', room: 'key' },
    { id: 'hall-east', x: 30, y: 33, w: 1, h: 2, kind: 'key' },
    { id: 'bars', x: 35, y: 27, w: 2, h: 1, kind: 'bars', flag: 'plate' },
    { id: 'boss-door', x: 16, y: 14, w: 2, h: 1, kind: 'shut', room: 'boss' },
  );
  d.blocks.push({ x: 36, y: 35 });
  d.plates.push({ x: 36, y: 31, flag: 'plate' });
  d.chests.push({ id: 'shrine-key', x: 7, y: 43, item: 'key' }, { id: 'hookvine', x: 36, y: 18, item: 'hookvine' }, { id: 'oil', x: 4, y: 20, item: 'oil' });
  d.stones.push({ id: 's-alcove', x: 6, y: 22 }, { id: 's-boss', x: 21, y: 6 });
  d.signs.push({ x: 24, y: 46, text: 'Carved into the stone: "What the bramble takes, the vine gives back."' });
  d.enemies.push(
    { kind: 'thornling', x: 5, y: 47, room: 'key' }, { kind: 'slug', x: 9, y: 45, room: 'key' }, { kind: 'slug', x: 6, y: 44, room: 'key' },
    { kind: 'thornling', x: 26, y: 31, room: 'hall' }, { kind: 'moth', x: 18, y: 35, room: 'hall' },
    { kind: 'thornling', x: 39, y: 37, room: 'block' }, { kind: 'moth', x: 38, y: 21, room: 'vine' },
  );
  b.prop('brazier', 18, 43).prop('brazier', 25, 43).prop('brazier', 16, 30).prop('brazier', 27, 30).prop('brazier', 32, 30);
  b.prop('brazier', 39, 17).prop('brazier', 27, 17).prop('brazier', 10, 3).prop('brazier', 33, 3).prop('brazier', 4, 42);
  b.prop('brazier', 13, 10).prop('brazier', 31, 10);
  // The Thornmother's arena: a ring of thorns no blade can cut, with the queen in the middle.
  d.boss = { x: 22, y: 6.5 };
  for (let j = 2; j <= 11; j++) for (let i = 16; i <= 27; i++) {
    const r = Math.hypot(i + 0.5 - 22, (j + 0.5 - 6.5) * 1.15);
    if (r >= 2.6 && r < 3.6) b.set(i, j, 'ring');
  }
  d.exits.push(
    { x: 21, y: 51, w: 2, h: 1, to: 'woods', tx: 42, ty: 5, facing: 'down' },
    { x: 21, y: 2, w: 2, h: 1, to: 'woods', tx: 42, ty: 5, facing: 'down', flag: 'boss' },
  );
  return d;
}

const BUILT: Record<MapId, () => MapDef> = { village, woods, fen, shrine };

/** A fresh copy of a map's layout. */
export function buildMap(id: MapId): MapDef {
  return BUILT[id]();
}

export function tileAt(map: MapDef, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return 'wall';
  return map.tiles[y * map.w + x];
}

export function setTile(map: MapDef, x: number, y: number, t: Tile) {
  if (x >= 0 && y >= 0 && x < map.w && y < map.h) map.tiles[y * map.w + x] = t;
}

/** The middle of a tile, in pixels. */
export function centre(t: { x: number; y: number }) {
  return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
}
