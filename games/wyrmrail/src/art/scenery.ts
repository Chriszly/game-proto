import Phaser from 'phaser';
import { COLS, ROWS, terrainAt } from '../game/map';
import { GRASS, ROCK, TREE, WATER } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The valley the line is laid on, painted at a quarter size (16 pixels a tile) and baked at four
// times that into the `map-bg` texture: grass, pine forest, the river and the mountains.

const T = 16;
export const BG_SCALE = 4;

export function bakeScenery(scene: Phaser.Scene) {
  const c = new PixelCanvas(COLS * T, ROWS * T);
  const rnd = seeded(7);
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * T;
      const y = r * T;
      // A faint checker so the tiles read as places to build.
      c.rect(x, y, T, T, (col + r) % 2 ? GRASS.alt : GRASS.base);
      for (let i = 0; i < 10; i++) c.px(x + rnd() * T, y + rnd() * T, rnd() < 0.5 ? GRASS.dark : GRASS.light);
      if (rnd() < 0.3) c.px(x + 2 + rnd() * 12, y + 2 + rnd() * 12, GRASS.flower);
      const terrain = terrainAt(col, r);
      if (terrain === 'forest') forest(c, x, y, rnd);
      if (terrain === 'river') river(c, x, y, rnd);
      if (terrain === 'mountain') mountain(c, x, y, rnd);
    }
  }
  c.bake(scene, 'map-bg', BG_SCALE);
}

function forest(c: PixelCanvas, x: number, y: number, rnd: () => number) {
  for (const [tx, ty] of [
    [4, 3],
    [11, 5],
    [6, 10],
  ]) {
    pine(c, x + tx + Math.round(rnd() * 2 - 1), y + ty);
  }
}

/** A small pine with its top at (x, y). */
function pine(c: PixelCanvas, x: number, y: number) {
  for (let j = 0; j < 6; j++) {
    const half = Math.floor(j / 1.6) + 1;
    c.rect(x - half, y + j, half * 2 + 1, 1, j % 2 ? TREE.dark : TREE.mid);
    c.px(x - half, y + j, TREE.light);
  }
  c.rect(x, y + 6, 1, 2, TREE.trunk);
}

function river(c: PixelCanvas, x: number, y: number, rnd: () => number) {
  c.rect(x, y, T, T, WATER.base);
  c.rect(x, y, 2, T, WATER.sand);
  c.rect(x + T - 2, y, 2, T, WATER.sand);
  c.rect(x + 6, y, 4, T, WATER.deep);
  for (let i = 0; i < 3; i++) c.rect(x + 3 + rnd() * 8, y + rnd() * 14, 3, 1, WATER.light);
}

function mountain(c: PixelCanvas, x: number, y: number, rnd: () => number) {
  const apex = 7 + Math.round(rnd() * 2);
  for (let j = 2; j < T; j++) {
    const half = Math.round(((j - 1) / (T - 1)) * 8);
    for (let i = -half; i <= half; i++) {
      const color = j < 6 ? ROCK.snow : i < 0 ? ROCK.light : i === 0 ? ROCK.base : ROCK.dark;
      c.px(x + apex + i, y + j, color);
    }
  }
}
