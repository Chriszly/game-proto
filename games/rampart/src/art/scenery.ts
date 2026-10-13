import Phaser from 'phaser';
import { DIRT, GRASS, INK, SKY, STONE, WOOD, GOLD, RED } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The battlefield behind everything: an evening sky over far mountains and a castle on the hills,
// a grassy meadow and the trampled road the foes march along. Plus the hero's tower and the wall,
// which crumbles in stages as it loses health. Painted at half size and baked at twice that.

const BG_SCALE = 2;

export function bakeScenery(scene: Phaser.Scene) {
  bakeBackground(scene);
  bakeTower(scene);
  for (const stage of [0, 1, 2, 3]) bakeWall(scene, stage);
}

function bakeBackground(scene: Phaser.Scene) {
  const W = 480;
  const H = 270;
  const c = new PixelCanvas(W, H);
  const rnd = seeded(7);
  // Sky in bands, darkest at the top.
  const bands = [SKY.top, 0x34467a, 0x3e5590, SKY.mid, 0x6680b2, SKY.low, 0xb0b8c8, SKY.haze];
  const horizon = 126;
  for (let y = 0; y < horizon; y++) c.rect(0, y, W, 1, bands[Math.min(bands.length - 1, Math.floor((y / horizon) * bands.length))]);
  // Clouds.
  for (const [x, y, w] of [[60, 30, 50], [210, 18, 70], [360, 40, 44], [430, 22, 36]]) {
    c.ellipse(x, y, w, 9, 0xe8e4f0, 0.55).ellipse(x + w / 4, y - 4, w / 2, 9, 0xf4f0f8, 0.55);
  }
  // Far mountains, then nearer hills.
  for (let x = 0; x < W; x++) {
    const peak = 78 + 14 * Math.sin(x / 31) + 9 * Math.sin(x / 11 + 2) + 5 * Math.sin(x / 5.3);
    c.rect(x, peak, 1, horizon - peak, 0x5a6890);
    if (peak < 74) c.rect(x, peak, 1, 3, 0xd8dcea);
    const hill = 104 + 8 * Math.sin(x / 47 + 1) + 4 * Math.sin(x / 17);
    c.rect(x, hill, 1, horizon - hill, 0x3c5a48);
  }
  // A castle on the far hills, its banner flying.
  const cx = 300;
  c.rect(cx, 86, 44, 22, 0x4a5466).rect(cx - 6, 74, 10, 34, 0x4a5466).rect(cx + 40, 74, 10, 34, 0x4a5466).rect(cx + 16, 66, 12, 42, 0x4a5466);
  for (const tx of [cx - 6, cx + 40, cx + 16]) for (let i = 0; i < 5; i += 2) c.rect(tx + i * 2, tx === cx + 16 ? 63 : 71, 2, 3, 0x4a5466);
  c.rect(cx + 21, 56, 1, 10, INK).rect(cx + 22, 56, 6, 4, RED.mid);
  for (const [wx, wy] of [[cx + 20, 76], [cx - 3, 82], [cx + 43, 82]]) c.rect(wx, wy, 2, 3, GOLD.light);
  // Meadow.
  for (let y = horizon; y < H; y++) c.rect(0, y, W, 1, y < horizon + 6 ? GRASS.light : GRASS.mid);
  // The road the foes march along, with ruts and stones.
  const top = 141;
  const bottom = 246;
  c.rect(0, top, W, bottom - top, DIRT.mid);
  for (let x = 0; x < W; x++) {
    const edge = Math.round(2 * Math.sin(x / 9));
    c.rect(x, top + edge - 1, 1, 2, DIRT.dark).rect(x, bottom + edge - 1, 1, 2, DIRT.dark);
  }
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rnd() * W);
    const y = top + 2 + Math.floor(rnd() * (bottom - top - 4));
    c.px(x, y, rnd() < 0.5 ? DIRT.light : DIRT.dark);
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * W);
    const y = top + 4 + Math.floor(rnd() * (bottom - top - 8));
    c.rect(x, y, 2, 1, STONE.light).px(x, y + 1, STONE.dark);
  }
  // Grass tufts off the road.
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(rnd() * W);
    const y = horizon + Math.floor(rnd() * (H - horizon));
    if (y > top - 3 && y < bottom + 3) continue;
    c.px(x, y, rnd() < 0.5 ? GRASS.shine : GRASS.dark).px(x, y - 1, GRASS.light);
  }
  c.bake(scene, 'background', BG_SCALE);
}

/** A round stone watchtower with battlements, which the hero stands on. 34 x 120, baked at 2x. */
function bakeTower(scene: Phaser.Scene) {
  const c = new PixelCanvas(36, 122);
  const rnd = seeded(11);
  // Battlements along the top, then the wall of the tower in staggered courses of stone.
  for (let x = 0; x < 36; x += 6) c.rect(x, 0, 4, 6, STONE.mid).rect(x, 0, 4, 1, STONE.shine);
  c.rect(0, 6, 36, 6, STONE.mid).rect(0, 6, 36, 1, STONE.light).rect(0, 11, 36, 1, STONE.dark);
  c.rect(2, 12, 32, 110, STONE.mid);
  for (let row = 0; row < 22; row++) {
    const y = 12 + row * 5;
    c.rect(2, y + 4, 32, 1, STONE.dark);
    for (let x = 2 + (row % 2) * 4; x < 34; x += 8) {
      c.rect(x, y, 1, 4, STONE.dark);
      c.rect(x + 1, y, 6, 1, rnd() < 0.5 ? STONE.light : STONE.mid);
    }
  }
  // Shading on the round side, a slit window and a door at the foot.
  c.rect(2, 12, 3, 110, STONE.dark, 0.5).rect(31, 12, 3, 110, STONE.light, 0.25);
  c.rect(16, 36, 4, 12, INK).rect(16, 60, 4, 12, INK);
  c.ellipse(12, 98, 12, 10, WOOD.dark).rect(12, 103, 12, 19, WOOD.dark).rect(14, 104, 8, 18, WOOD.mid);
  c.rect(17, 104, 1, 18, WOOD.dark).px(20, 112, GOLD.mid);
  c.bake(scene, 'tower', 2);
}

/**
 * The wall seen from above and the side, running the length of the field: a thick course of
 * stone with merlons facing the foes. Stage 0 is whole; 1 and 2 add cracks and missing stones;
 * 3 is the rubble left when it falls. 18 x 124, baked at 2x.
 */
function bakeWall(scene: Phaser.Scene, stage: number) {
  const W = 20;
  const H = 124;
  const c = new PixelCanvas(W, H);
  const rnd = seeded(23);
  if (stage === 3) {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rnd() * (W - 4));
      const y = Math.floor(rnd() * (H - 3));
      c.rect(x, y, 3 + Math.floor(rnd() * 3), 2, rnd() < 0.5 ? STONE.mid : STONE.dark).px(x, y, STONE.light);
    }
    c.bake(scene, 'wall-3', 2);
    return;
  }
  // The walkway on top, then the face with its merlons.
  c.rect(0, 0, 13, H, STONE.mid).rect(0, 0, 2, H, STONE.dark);
  for (let y = 0; y < H; y += 6) {
    c.rect(2, y, 11, 1, STONE.dark);
    c.rect(3 + ((y / 6) % 2) * 4, y + 1, 1, 5, STONE.dark);
    c.rect(4, y + 1, 4, 1, STONE.light);
  }
  c.rect(13, 0, 2, H, STONE.light);
  for (let y = 0; y < H; y += 10) c.rect(15, y, 4, 6, STONE.mid).rect(15, y, 4, 1, STONE.shine).rect(18, y, 1, 6, STONE.dark);
  // Damage: cracks, then knocked-out stones and missing merlons.
  const cracks = stage === 0 ? 0 : stage === 1 ? 6 : 14;
  for (let i = 0; i < cracks; i++) {
    let x = 2 + Math.floor(rnd() * 12);
    let y = Math.floor(rnd() * (H - 10));
    for (let j = 0; j < 6; j++) {
      c.px(x, y, INK);
      x += rnd() < 0.5 ? 1 : -1;
      y += 1;
    }
  }
  if (stage === 2) {
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(rnd() * (H - 8));
      c.rect(6 + Math.floor(rnd() * 6), y, 5, 4, STONE.dark).rect(7, y + 1, 3, 2, INK, 0.6);
    }
    for (let y = 0; y < H; y += 30) c.clear(15, y + 1).clear(16, y + 1).rect(15, y + 2, 4, 4, STONE.dark);
  }
  c.bake(scene, `wall-${stage}`, 2);
}
