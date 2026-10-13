import Phaser from 'phaser';
import { FIRE, FLOOR, INK, STONE, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The two backdrops, painted at a quarter size and baked at four times that: a dungeon room for
// the fights, a brick wall with torches over a flagstone floor, and the dark stone the map is
// laid out on.

const BG_SCALE = 4;
const W = 240;
const H = 135;
/** Where the floor meets the wall, in backdrop pixels. */
const FLOOR_Y = 68;

export function bakeScenery(scene: Phaser.Scene) {
  bakeFightRoom(scene);
  bakeMapBackground(scene);
}

function bakeFightRoom(scene: Phaser.Scene) {
  const c = new PixelCanvas(W, H);
  const rnd = seeded(11);
  // Brick wall, in staggered rows, each brick a slightly different shade.
  c.rect(0, 0, W, FLOOR_Y, STONE.dark);
  for (let row = 0; row * 7 < FLOOR_Y; row++) {
    const y = row * 7;
    for (let x = row % 2 ? -7 : 0; x < W; x += 14) {
      const shade = rnd() < 0.2 ? STONE.light : rnd() < 0.5 ? STONE.mid : 0x48414f;
      c.rect(x + 1, y + 1, 13, 6, shade);
      c.rect(x + 1, y + 1, 13, 1, STONE.shine, 0.35);
    }
  }
  // An arched doorway at the back, dark inside.
  const dx = 104;
  c.rect(dx, 22, 32, FLOOR_Y - 22, STONE.shine);
  c.ellipse(dx, 10, 32, 26, STONE.shine);
  c.rect(dx + 3, 24, 26, FLOOR_Y - 24, INK);
  c.ellipse(dx + 3, 13, 26, 22, INK);
  // Torches in iron brackets, the bricks round them lit warm.
  for (const tx of [44, 196]) {
    for (let y = 8; y < 44; y++) for (let x = tx - 18; x < tx + 19; x++) {
      const near = Math.hypot(x - tx, (y - 22) * 1.2);
      const here = c.get(x, y);
      if (near < 13 && here !== null && here !== STONE.dark) c.px(x, y, near < 8 ? 0x8a6a5a : 0x6a5560);
    }
    c.rect(tx - 1, 28, 3, 10, WOOD.mid).rect(tx - 3, 37, 7, 2, 0x2c2a34);
    c.ellipse(tx - 3, 20, 7, 9, FIRE.mid).ellipse(tx - 2, 23, 5, 6, FIRE.light).rect(tx, 25, 1, 3, FIRE.white);
  }
  // A shadow along the foot of the wall, then the flagstone floor, darker towards the front.
  c.rect(0, FLOOR_Y, W, 2, INK);
  for (let y = FLOOR_Y + 2; y < H; y++) {
    const t = (y - FLOOR_Y) / (H - FLOOR_Y);
    c.rect(0, y, W, 1, t < 0.35 ? FLOOR.light : t < 0.7 ? FLOOR.mid : FLOOR.dark);
  }
  for (let y = FLOOR_Y + 8; y < H; y += 10) {
    c.rect(0, y, W, 1, FLOOR.dark);
    for (let x = (y / 10) % 2 ? 6 : 16; x < W; x += 22) c.rect(x, y - 9, 1, 9, FLOOR.dark);
  }
  // Scattered pebbles.
  for (let i = 0; i < 40; i++) c.px(rnd() * W, FLOOR_Y + 3 + rnd() * (H - FLOOR_Y - 3), STONE.light);
  c.bake(scene, 'room-bg', BG_SCALE);
}

function bakeMapBackground(scene: Phaser.Scene) {
  const c = new PixelCanvas(W, H);
  const rnd = seeded(5);
  c.rect(0, 0, W, H, FLOOR.dark);
  // Big rough flagstones.
  for (let y = 0; y < H; y += 12) {
    for (let x = (y / 12) % 2 ? -10 : 0; x < W; x += 20) {
      c.rect(x + 1, y + 1, 19, 11, rnd() < 0.5 ? FLOOR.mid : 0x2b252d);
    }
  }
  for (let i = 0; i < 70; i++) c.px(rnd() * W, rnd() * H, STONE.mid);
  // A dark border all round, like the edge of a lantern's light.
  for (let ring = 0; ring < 14; ring++) c.frame(ring, ring, W - 2 * ring, H - 2 * ring, INK, 0.75 - ring * 0.05);
  c.bake(scene, 'map-bg', BG_SCALE);
}
