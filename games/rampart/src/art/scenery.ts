import Phaser from 'phaser';
import { CLOTH, DIRT, GOLD, GRASS, INK, RED, SKY, STONE, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The battlefield behind everything: an evening sky over far mountains and a castle on the hills,
// a grassy meadow and the trampled road the foes march along. Plus the barricade in front of the
// hero, which breaks up in stages as it loses health. Painted at half size and baked at twice that.

const BG_SCALE = 2;

export function bakeScenery(scene: Phaser.Scene) {
  bakeBackground(scene);
  for (const stage of [0, 1, 2, 3]) bakeBarricade(scene, stage);
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

/**
 * The cheval de frise seen from above and the side, running the length of the field: a heavy log
 * with pairs of sharpened stakes driven crosswise through it, their points towards the foes.
 * Stage 0 is whole; 1 and 2 have stakes snapped off and then knocked out; 3 is the splintered
 * wreck left when it falls. 32 x 124, baked at 2x.
 */
function bakeBarricade(scene: Phaser.Scene, stage: number) {
  const W = 32;
  const H = 124;
  const c = new PixelCanvas(W, H);
  const rnd = seeded(23);
  if (stage === 3) {
    for (let i = 0; i < 46; i++) {
      const x = 2 + Math.floor(rnd() * (W - 12));
      const y = 2 + Math.floor(rnd() * (H - 6));
      const len = 4 + Math.floor(rnd() * 6);
      const dy = rnd() < 0.5 ? 2 : -2;
      c.line(x, y, x + len, y + dy, WOOD.light).line(x, y + 1, x + len, y + dy + 1, WOOD.dark).px(x + len, y + dy, CLOTH.dark);
    }
    c.outline(INK);
    c.bake(scene, 'barricade-3', 2);
    return;
  }
  // The log along the field, with its bark.
  const log = (y: number, h: number) => {
    c.rect(12, y, 8, h, WOOD.mid).rect(12, y, 1, h, WOOD.dark).rect(19, y, 1, h, WOOD.dark).rect(15, y, 1, h, WOOD.light).rect(16, y, 1, h, WOOD.shine, 0.5);
  };
  log(1, H - 2);
  for (let y = 3; y < H; y += 5) c.px(13 + (y % 4), y, WOOD.dark);
  // Pairs of crossed stakes driven through the log, sharpened at both ends.
  for (let y = 9; y < H - 8; y += 15) {
    // Damaged stages snap the points off some stakes and knock others out altogether.
    const roll = rnd();
    const gone = stage === 2 && roll < 0.4;
    const snapped = (stage === 1 && roll < 0.4) || (stage === 2 && roll < 0.85);
    if (gone) {
      c.rect(13, y - 1, 6, 3, WOOD.dark).px(15, y, INK);
      continue;
    }
    const reach = snapped ? 22 : 30;
    for (const dir of [1, -1]) {
      const y0 = y + dir * 7;
      const slope = (-dir * 14) / 29;
      const yAt = (x: number) => Math.round(y0 + slope * (x - 1));
      for (let x = 1; x <= reach; x++) c.px(x, yAt(x), WOOD.light).px(x, yAt(x) + 1, WOOD.mid);
      if (!snapped) c.px(reach, yAt(reach), CLOTH.light).px(reach - 1, yAt(reach - 1), CLOTH.mid).px(reach - 1, yAt(reach - 1) + 1, CLOTH.dark);
      else c.px(reach, yAt(reach), CLOTH.dark).px(reach, yAt(reach) + 1, CLOTH.dark);
      c.px(1, yAt(1), CLOTH.dark).px(2, yAt(2) + 1, WOOD.dark);
    }
    // The log over the stakes where they cross it, with an iron band.
    log(y - 3, 7);
    c.rect(12, y - 1, 8, 2, 0x3c3946).rect(12, y - 1, 8, 1, 0x5d5a6a);
  }
  if (stage > 0) for (let i = 0; i < stage * 6; i++) {
    const y = 4 + Math.floor(rnd() * (H - 12));
    c.line(13, y, 17, y + 4, INK);
  }
  c.outline(INK);
  c.bake(scene, `barricade-${stage}`, 2);
}
