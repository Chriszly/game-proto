import Phaser from 'phaser';
import { GROUND_Y, VIEW } from '../scenes/layout';
import { DIRT, FIRE, GOLD, GRASS, HILLS, INK, IRON, RED, SKY, STONE, TABARD, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The world the knight runs through: a dusk sky, far hills and a ruined castle and near trees that
// scroll slower than the ground, the ground strip itself, and the traps, coins and checkpoint flag.
// The scrolling layers wrap around, so they tile seamlessly.

/** Art pixels are drawn this many screen pixels wide. */
const S = 2;

/** The dusk sky, which stays put. */
function sky(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const bands = [SKY.top, SKY.mid, SKY.low, SKY.glow];
  const h = GROUND_Y;
  for (let y = 0; y < h; y += 4) {
    const t = (y / h) * (bands.length - 1);
    const i = Math.min(bands.length - 2, Math.floor(t));
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(bands[i]),
      Phaser.Display.Color.ValueToColor(bands[i + 1]),
      100,
      Math.round((t - i) * 100),
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(0, y, VIEW.w, 4);
  }
  // A low moon and a few stars.
  g.fillStyle(0xf4e8d0).fillCircle(760, 120, 34);
  g.fillStyle(SKY.mid, 0.5).fillCircle(776, 112, 30);
  const rand = seeded(7);
  for (let i = 0; i < 60; i++) g.fillStyle(0xffffff, 0.3 + rand() * 0.6).fillRect(Math.floor(rand() * VIEW.w), Math.floor(rand() * 200), 2, 2);
  g.generateTexture('sky', VIEW.w, h);
  g.destroy();
}

/** Far hills with a ruined castle on them; wraps around every VIEW.w pixels. */
function far(scene: Phaser.Scene) {
  const w = VIEW.w / S;
  const h = 140;
  const c = new PixelCanvas(w, h);
  for (let x = 0; x < w; x++) {
    const top = 70 + Math.round(18 * Math.sin((x / w) * Math.PI * 4) + 8 * Math.sin((x / w) * Math.PI * 10));
    c.rect(x, top, 1, h - top, HILLS.far);
  }
  // A ruined keep with broken towers.
  const keep = (x: number, base: number, tw: number, th: number) => {
    c.rect(x, base - th, tw, th, HILLS.mid);
    for (let i = 0; i < tw; i += 3) c.rect(x + i, base - th - 2, 2, 2, HILLS.mid);
    c.rect(x + Math.floor(tw / 2), base - th + 6, 1, 3, SKY.glow);
  };
  keep(120, 80, 12, 40);
  keep(136, 80, 26, 22);
  keep(166, 80, 10, 50);
  keep(360, 74, 9, 30);
  c.bake(scene, 'far', S);
}

/** Dark trees and broken walls nearer the road; wraps around every VIEW.w pixels. */
function near(scene: Phaser.Scene) {
  const w = VIEW.w / S;
  const h = 110;
  const c = new PixelCanvas(w, h);
  const rand = seeded(21);
  for (let x = 0; x < w; x++) {
    const top = 78 + Math.round(6 * Math.sin((x / w) * Math.PI * 6));
    c.rect(x, top, 1, h - top, HILLS.near);
  }
  // Pines, drawn as stacked triangles, wrapping at the edges.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor((i / 9) * w + rand() * 30);
    const th = 40 + Math.floor(rand() * 30);
    for (let y = 0; y < th; y++) {
      const half = Math.floor((y % 14) * 0.6 + y * 0.18) + 1;
      for (let dx = -half; dx <= half; dx++) c.px((x + dx + w) % w, h - 20 - th + y, HILLS.near);
    }
    c.rect(x % w, h - 22, 2, 22, HILLS.near);
  }
  c.bake(scene, 'near', S);
}

/** One 64-pixel strip of road: grass on top, packed earth and stones below. */
function ground(scene: Phaser.Scene) {
  const w = 32;
  const h = (VIEW.h - GROUND_Y) / S;
  const c = new PixelCanvas(w, h);
  c.rect(0, 0, w, h, DIRT.mid);
  c.rect(0, 0, w, 3, GRASS.mid).rect(0, 0, w, 1, GRASS.shine).rect(0, 3, w, 1, GRASS.dark);
  for (const x of [3, 9, 17, 24, 29]) c.px(x, 4, GRASS.dark);
  const rand = seeded(5);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rand() * w);
    const y = 7 + Math.floor(rand() * (h - 9));
    c.rect(x, y, 3, 2, rand() < 0.5 ? STONE.mid : DIRT.light).px(x, y, STONE.light);
  }
  for (let x = 0; x < w; x++) if (rand() < 0.4) c.px(x, 6 + Math.floor(rand() * (h - 6)), DIRT.dark);
  c.bake(scene, 'ground', S);
}

/** A row of iron spikes on a board, for each width a spike trap can be. */
function spikes(scene: Phaser.Scene) {
  for (const width of [36, 48, 60]) {
    const w = width / S;
    const c = new PixelCanvas(w, 13);
    c.rect(0, 10, w, 3, WOOD.mid).rect(0, 10, w, 1, WOOD.light);
    for (let x = 0; x + 5 <= w; x += 6) {
      for (let y = 0; y < 10; y++) {
        const half = Math.floor(y / 4);
        c.rect(x + 3 - half - 1, y, 2 * half + 2, 1, IRON.mid);
      }
      c.px(x + 2, 1, IRON.shine).line(x + 2, 2, x + 1, 9, IRON.light);
    }
    c.outline(INK);
    c.bake(scene, `spikes-${width}`, S);
  }
}

/** A pit in the road with stakes at the bottom, for each width a pit can be. */
function pits(scene: Phaser.Scene) {
  const h = (VIEW.h - GROUND_Y) / S;
  for (const width of [80, 96, 112]) {
    const w = width / S;
    const c = new PixelCanvas(w, h);
    c.rect(0, 0, w, h, 0x0b0810);
    c.rect(0, 0, 2, h, DIRT.dark).rect(w - 2, 0, 2, h, DIRT.dark);
    c.rect(2, 0, w - 4, 4, 0x1a1420);
    for (let x = 4; x + 3 < w; x += 6) c.line(x + 1, h - 1, x + 1, h - 12, WOOD.mid).px(x + 1, h - 13, IRON.light);
    c.bake(scene, `pit-${width}`, S);
  }
}

/**
 * A spiked log hanging on a chain from above the screen, down to 34 pixels over the road: too
 * low to run under, so the knight slides.
 */
function blade(scene: Phaser.Scene) {
  const w = 13;
  const bottom = (GROUND_Y - 34) / S;
  const c = new PixelCanvas(w + 2, bottom + 1);
  const logTop = bottom - 42;
  for (let y = 0; y < logTop; y += 4) c.rect(6, y, 3, 3, IRON.mid).px(7, y + 1, IRON.dark).px(6, y, IRON.light);
  c.rect(1, logTop, w, 34, WOOD.mid).rect(1, logTop, 2, 34, WOOD.light).rect(w - 1, logTop, 2, 34, WOOD.dark);
  for (const y of [logTop + 4, logTop + 26]) c.rect(1, y, w, 3, IRON.mid).rect(1, y, w, 1, IRON.light);
  // Spikes out of the sides and the bottom.
  for (const y of [logTop + 12, logTop + 18]) c.px(0, y, IRON.light).px(w + 1, y, IRON.light);
  for (let x = 2; x < w; x += 4) c.rect(x, logTop + 34, 2, 4, IRON.light).px(x, bottom - 4, IRON.shine).rect(x, bottom - 3, 1, 3, IRON.mid);
  c.outline(INK);
  c.bake(scene, 'blade', S);
}

function coin(scene: Phaser.Scene) {
  const full = new PixelCanvas(8, 8);
  full.ellipse(0, 0, 8, 8, GOLD.mid).ellipse(1, 1, 6, 6, GOLD.light).rect(3, 2, 1, 4, GOLD.dark).px(2, 2, GOLD.shine);
  full.outline(INK);
  full.bake(scene, 'coin-0', S);
  const edge = new PixelCanvas(8, 8);
  edge.rect(3, 0, 2, 8, GOLD.mid).px(3, 1, GOLD.shine);
  edge.outline(INK);
  edge.bake(scene, 'coin-1', S);
}

/** The checkpoint: a banner on a pole by a campfire. */
function checkpoint(scene: Phaser.Scene) {
  const c = new PixelCanvas(36, 64);
  c.rect(6, 2, 2, 62, WOOD.mid).px(6, 2, WOOD.light).rect(5, 0, 4, 2, GOLD.mid);
  c.rect(8, 4, 14, 18, TABARD.mid).rect(8, 4, 14, 2, TABARD.light);
  c.rect(14, 7, 2, 12, GOLD.mid).rect(11, 10, 8, 2, GOLD.light);
  for (let x = 8; x < 22; x += 3) c.px(x + 1, 22, TABARD.dark);
  // The campfire: logs and flames.
  c.rect(18, 61, 14, 3, WOOD.dark).line(18, 63, 31, 59, WOOD.mid);
  c.ellipse(20, 50, 10, 12, FIRE.dark).ellipse(21, 53, 8, 9, FIRE.mid).ellipse(23, 56, 4, 5, FIRE.light);
  c.px(25, 47, FIRE.mid).px(22, 46, RED.mid);
  c.outline(INK);
  c.bake(scene, 'checkpoint', S);
}

export function bakeScenery(scene: Phaser.Scene) {
  sky(scene);
  far(scene);
  near(scene);
  ground(scene);
  spikes(scene);
  pits(scene);
  blade(scene);
  coin(scene);
  checkpoint(scene);
}
