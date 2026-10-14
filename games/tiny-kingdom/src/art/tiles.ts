import Phaser from 'phaser';
import { GRID } from '../scenes/layout';

// The land and building tiles, drawn as low-poly solids: each cell is a slab with a lit top, a
// shaded front edge and a soft drop shadow, and each building is a few flat faces, lit on the
// side that faces the light and shaded on the other. Everything is flat polygons drawn with
// Phaser Graphics and baked once into a 64px `tile-<cell>` texture.

type Pt = readonly [number, number];

const C = {
  grass: 0x6aa84a,
  dirt: 0x6b4a2b,
  tuft: 0x86c05a,
  water: 0x3a7bc8,
  waterDeep: 0x2c5f9e,
  waterGlint: 0x8cc4f2,
  shore: 0xe3d193,
  shoreSide: 0xa8945a,
  pine: 0x2f7a3a,
  trunk: 0x6b4423,
  soil: 0x9a6638,
  soilSide: 0x6b4423,
  wheat: 0xf0cd62,
  wall: 0xf1e4c0,
  roof: 0xc2492f,
  door: 0x5c3a21,
  window: 0xffd65a,
  stone: 0xb4b4b8,
  stoneDark: 0x7a7a82,
  flag: 0x3a7bc8,
  shadow: 0x0e0a08,
  dark: 0x1a1216,
};

/** Multiplies a colour's channels by `k`: above 1 lightens, below 1 shades. */
function shade(color: number, k: number) {
  const ch = (shift: number) => Math.min(255, Math.round(((color >> shift) & 255) * k));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** The side faces are shaded; a lit top faces the light, its second facet is a touch darker. */
const SIDE = 0.68;
const FACET = 0.93;

/** The slab's top face, inset so neighbouring cells read as separate blocks. */
const TOP = { x: 2, y: 2, w: 60, h: 52 };
/** How tall the slab's front edge is, below its top face. */
const EDGE = 6;
/** A building's depth: its roof and far walls run this far up and to the right. */
const DEPTH = { dx: 7, dy: -5 };

class Art {
  private g: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  poly(pts: readonly Pt[], color: number, alpha = 1) {
    this.g.fillStyle(color, alpha).fillPoints(
      pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)),
      true,
    );
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    return this.poly(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      color,
      alpha,
    );
  }

  ellipse(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    this.g.fillStyle(color, alpha).fillEllipse(x, y, w, h);
    return this;
  }

  /** Turns the faces drawn so far into the texture `key`, dropping any earlier one. */
  bake(key: string) {
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.g.generateTexture(key, GRID.cell, GRID.cell);
    this.g.destroy();
  }
}

/**
 * The slab every cell stands on: a soft shadow, the shaded front edge, then the top face split
 * along its diagonal into two facets.
 */
function slab(a: Art, top: number, edge: number) {
  const { x, y, w, h } = TOP;
  a.rect(x + 2, y + 3, w + 1, h + EDGE + 1, C.shadow, 0.14);
  a.rect(x + 1, y + 2, w + 1, h + EDGE, C.shadow, 0.16);
  a.rect(x, y + h, w, EDGE, edge);
  a.rect(x, y + h + EDGE - 2, w, 2, shade(edge, 0.8));
  a.poly(
    [
      [x, y],
      [x + w, y],
      [x, y + h],
    ],
    top,
  );
  a.poly(
    [
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    shade(top, FACET),
  );
  return a;
}

/** A soft shadow on the ground to the lower right of a building standing at (cx, baseY). */
function buildingShadow(a: Art, cx: number, baseY: number, width: number) {
  a.ellipse(cx + 5, baseY + 1, width + 6, 9, C.shadow, 0.16);
  a.ellipse(cx + 4, baseY, width, 6, C.shadow, 0.22);
}

function grass(a: Art) {
  slab(a, C.grass, C.dirt);
  // A few lit tufts, each a flat triangle, so the field is not a single colour.
  for (const [x, y] of [
    [12, 14],
    [46, 12],
    [22, 40],
    [52, 36],
    [10, 44],
    [38, 46],
  ]) {
    a.poly(
      [
        [x, y],
        [x + 4, y],
        [x + 2, y - 4],
      ],
      C.tuft,
    );
  }
  return a;
}

function lake(a: Art) {
  slab(a, C.shore, C.shoreSide);
  // The water sits inside a sand rim, split into a lit and a deeper facet.
  const { x, y, w, h } = TOP;
  const left = x + 5;
  const top = y + 5;
  const right = x + w - 5;
  const bottom = y + h - 5;
  a.poly(
    [
      [left, top],
      [right, top],
      [left, bottom],
    ],
    C.water,
  );
  a.poly(
    [
      [right, top],
      [right, bottom],
      [left, bottom],
    ],
    C.waterDeep,
  );
  for (const [gx, gy] of [
    [14, 18],
    [40, 30],
    [24, 40],
  ]) {
    a.poly(
      [
        [gx, gy],
        [gx + 7, gy - 1],
        [gx + 2, gy + 2],
      ],
      C.waterGlint,
      0.8,
    );
  }
  return a;
}

/** A pine: a shaded trunk and two stacked cones, each lit on its left and shaded on its right. */
function pine(a: Art, cx: number, baseY: number, height: number) {
  buildingShadow(a, cx, baseY, height * 0.7);
  a.rect(cx - 1.5, baseY - 4, 3, 4, C.trunk);
  const cone = (y0: number, w: number, h: number) => {
    const apex: Pt = [cx, y0 - h];
    a.poly(
      [apex, [cx - w / 2, y0], [cx, y0]],
      shade(C.pine, 1.15),
    );
    a.poly(
      [apex, [cx, y0], [cx + w / 2, y0]],
      shade(C.pine, SIDE + 0.1),
    );
  };
  cone(baseY - 3, height * 0.7, height * 0.6);
  cone(baseY - 3 - height * 0.3, height * 0.5, height * 0.5);
}

function forest(a: Art) {
  grass(a);
  // Back trees first, so the nearer ones overlap them.
  pine(a, 33, 28, 13);
  pine(a, 19, 46, 17);
  pine(a, 44, 44, 19);
  return a;
}

function farm(a: Art) {
  slab(a, C.soil, C.soilSide);
  // Furrows of wheat: each a lit strip with a shaded lip beneath it.
  for (let y = 9; y <= 45; y += 9) {
    a.rect(8, y, 48, 4, C.wheat);
    a.rect(8, y + 4, 48, 2, shade(C.wheat, SIDE));
  }
  return a;
}

function house(a: Art) {
  grass(a);
  const x0 = 18;
  const x1 = 38;
  const y0 = 32;
  const yb = 50;
  const cx = (x0 + x1) / 2;
  const apexY = 20;
  buildingShadow(a, cx, yb, x1 - x0 + DEPTH.dx);
  // The walls: the lit front, and the shaded side that turns away from the light.
  a.rect(x0, y0, x1 - x0, yb - y0, C.wall);
  a.poly(
    [
      [x1, y0],
      [x1 + DEPTH.dx, y0 + DEPTH.dy],
      [x1 + DEPTH.dx, yb + DEPTH.dy],
      [x1, yb],
    ],
    shade(C.wall, SIDE),
  );
  // The gable, then the two roof slopes meeting at the ridge.
  a.poly(
    [
      [cx, apexY],
      [x0 - 2, y0],
      [x1 + 2, y0],
    ],
    C.wall,
  );
  const ridge: Pt = [cx + DEPTH.dx, apexY + DEPTH.dy];
  a.poly(
    [
      [cx, apexY],
      [x0 - 2, y0],
      [x0 - 2 + DEPTH.dx, y0 + DEPTH.dy],
      ridge,
    ],
    C.roof,
  );
  a.poly(
    [
      [cx, apexY],
      [x1 + 2, y0],
      [x1 + 2 + DEPTH.dx, y0 + DEPTH.dy],
      ridge,
    ],
    shade(C.roof, SIDE),
  );
  // A lit window, a door and a second window on the front.
  a.rect(x0 + 3, y0 + 6, 4, 4, C.window);
  a.rect(x1 - 7, y0 + 6, 4, 4, C.window);
  a.rect(cx - 2.5, yb - 9, 5, 9, C.door);
  return a;
}

function tower(a: Art) {
  grass(a);
  const x0 = 20;
  const x1 = 44;
  const y0 = 22;
  const yb = 50;
  const cx = (x0 + x1) / 2;
  buildingShadow(a, cx, yb, x1 - x0 + DEPTH.dx);
  // The keep: a lit front in two facets, a shaded side and a lit top.
  a.rect(x0, y0, (x1 - x0) / 2, yb - y0, C.stone);
  a.rect(cx, y0, (x1 - x0) / 2, yb - y0, shade(C.stone, 0.9));
  a.poly(
    [
      [x1, y0],
      [x1 + DEPTH.dx, y0 + DEPTH.dy],
      [x1 + DEPTH.dx, yb + DEPTH.dy],
      [x1, yb],
    ],
    shade(C.stone, SIDE),
  );
  a.poly(
    [
      [x0, y0],
      [x0 + DEPTH.dx, y0 + DEPTH.dy],
      [x1 + DEPTH.dx, y0 + DEPTH.dy],
      [x1, y0],
    ],
    shade(C.stone, 1.12),
  );
  // Battlements along the top, a door arch and a slit window.
  for (const mx of [x0, cx - 2, x1 - 6]) a.rect(mx, y0 - 6, 6, 6, C.stone);
  a.rect(cx - 3, yb - 10, 6, 10, C.door);
  a.rect(cx - 1, y0 + 6, 2, 6, C.dark);
  // A flag on a thin pole.
  a.rect(cx - 0.5, 2, 1.5, 16, C.dark);
  a.poly(
    [
      [cx + 1, 2],
      [cx + 10, 5],
      [cx + 1, 8],
    ],
    C.flag,
  );
  return a;
}

export const TILE_ART: Record<string, (a: Art) => Art> = {
  grass,
  lake,
  forest,
  farm,
  house,
  tower,
};

export function bakeTiles(scene: Phaser.Scene) {
  for (const [key, draw] of Object.entries(TILE_ART)) draw(new Art(scene)).bake(`tile-${key}`);
}
