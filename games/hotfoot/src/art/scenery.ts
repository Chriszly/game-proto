import Phaser from 'phaser';
import { GROUND_Y, VIEW } from '../scenes/layout';
import { MAT, bake, disk, edge, poly, ring, slab, type Canvas, type Tones } from './facets';
import { seeded } from './pixelArt';

// The world the knight runs through, in low-poly: a dusk sky in flat bands, far hills with a ruined
// keep and near pines (both scroll slower than the road), the road strip, the stone of raised ledges,
// and the traps, coins and checkpoint flag. Every object is flat polygons, lit on the upper left.
// The scrolling layers wrap around, so they tile seamlessly.

const W = VIEW.w;

/** Mixes two colours by `t` from 0 to 1. */
function mix(a: number, b: number, t: number) {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const lerp = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (lerp(16) << 16) | (lerp(8) << 8) | lerp(0);
}

const SKY_STOPS = [0x1c1838, 0x3d2c5c, 0x8a4a6a, 0xe08a5a];
/** The sky colour at `t` from the top (0) to the horizon (1). */
function skyAt(t: number) {
  const at = t * (SKY_STOPS.length - 1);
  const i = Math.min(SKY_STOPS.length - 2, Math.floor(at));
  return mix(SKY_STOPS[i], SKY_STOPS[i + 1], at - i);
}

/** The dusk sky in flat bands, with a lit moon and a few stars. */
function sky(scene: Phaser.Scene) {
  const h = GROUND_Y;
  bake(scene, 'sky', W, h, (g) => {
    const bands = 16;
    for (let b = 0; b < bands; b++) {
      const y0 = (b * h) / bands;
      g.fillStyle(skyAt((b + 0.5) / bands)).fillRect(0, y0, W, h / bands + 1);
    }
    disk(g, MAT.cloth, 760, 120, 34, 34, 1, 12);
    const rand = seeded(7);
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * 200);
      poly(g, [[x, y - 1.5], [x + 1.5, y], [x, y + 1.5], [x - 1.5, y]], 0xf4efff, 1, 0.3 + rand() * 0.6);
    }
  });
}

/** A ridge of flat facets from `base` up to the height `top(x)`, one lit and one shaded facet per slope. */
function ridge(g: Canvas, base: number, top: (x: number) => number, n: number, t: Tones) {
  for (let i = 0; i < n; i++) {
    const x0 = (i * W) / n;
    const x1 = ((i + 1) * W) / n;
    const y0 = top(x0);
    const y1 = top(x1);
    // A slope that climbs to the right faces the light; one that falls away does not.
    poly(g, [[x0, y0], [x1, y1], [x0, base]], y1 < y0 ? t.lit : t.shade);
    poly(g, [[x1, y1], [x1, base], [x0, base]], t.mid);
  }
}

const FAR_TONES: Tones = { lit: 0x4e4580, mid: 0x3c3366, shade: 0x2c2552, dark: 0x221c40 };
/** Far hills, which wrap every W pixels: sin waves with whole periods across the width. */
const farTop = (x: number) => 62 + 20 * Math.sin((x / W) * Math.PI * 4) + 9 * Math.sin((x / W) * Math.PI * 10 + 1);

/** Far hills with a ruined castle on them. */
function far(scene: Phaser.Scene) {
  const h = 150;
  bake(scene, 'far', W, h, (g) => {
    ridge(g, h, farTop, 48, FAR_TONES);
    // A ruined keep: towers of flat stone, each standing a little above the hill beneath it.
    const tower = (x: number, w: number, above: number) => {
      const top = farTop(x) - above;
      slab(g, MAT.stone, x, top, w, h - top);
      for (let cx = x; cx < x + w; cx += 4) poly(g, [[cx, top - 4], [cx + 2, top - 4], [cx + 2, top], [cx, top]], MAT.stone.mid);
    };
    tower(120, 12, 38);
    tower(136, 26, 22);
    tower(166, 10, 52);
    tower(360, 9, 40);
  });
}

const NEAR_TONES: Tones = { lit: 0x2a2a4e, mid: 0x23233f, shade: 0x1b1b31, dark: 0x121224 };
const PINE_TONES: Tones = { lit: 0x36427a, mid: 0x2a3462, shade: 0x1e2648, dark: 0x141a34 };

/** Dark pines and a broken wall nearer the road; wraps every W pixels. */
function near(scene: Phaser.Scene) {
  const h = 110;
  bake(scene, 'near', W, h, (g) => {
    ridge(g, h, (x) => 80 + 6 * Math.sin((x / W) * Math.PI * 6), 48, NEAR_TONES);
    const rand = seeded(21);
    for (let i = 0; i < 9; i++) {
      const cx = Math.floor((i / 9) * W + rand() * 30);
      const th = 40 + Math.floor(rand() * 30);
      const base = h - 18;
      // Three stacked tiers, each lit on the left and shaded on the right.
      for (const dx of [-W, 0, W]) {
        const x = cx + dx;
        for (const [k, hw] of [[0, 7], [0.25, 10], [0.5, 13]] as const) {
          const apex = base - th + k * th;
          const bottom = apex + th * 0.5;
          poly(g, [[x, apex], [x - hw, bottom], [x, bottom]], PINE_TONES.lit);
          poly(g, [[x, apex], [x, bottom], [x + hw, bottom]], PINE_TONES.shade);
        }
        poly(g, [[x - 2, base - 6], [x + 2, base - 6], [x + 2, h], [x - 2, h]], PINE_TONES.dark);
      }
    }
  });
}

/** One 64-pixel strip of road: grass on top, packed earth and stones below. */
function ground(scene: Phaser.Scene) {
  const w = 64;
  const h = VIEW.h - GROUND_Y;
  bake(scene, 'ground', w, h, (g) => {
    poly(g, [[0, 0], [w, 0], [w, h], [0, h]], MAT.earth.mid);
    // Grass: a lit lip, a zigzag top and a shaded underside.
    poly(g, [[0, 0], [w, 0], [w, 6], [56, 9], [48, 5], [40, 9], [32, 5], [24, 9], [16, 5], [8, 9], [0, 5]], MAT.grass.mid);
    poly(g, [[0, 0], [w, 0], [w, 2], [0, 2]], MAT.grass.lit);
    poly(g, [[0, 9], [w, 9], [w, 12], [0, 12]], MAT.grass.shade);
    const rand = seeded(5);
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(rand() * (w - 8));
      const y = 16 + Math.floor(rand() * (h - 24));
      poly(g, [[x, y + 4], [x + 3, y], [x + 6, y + 4]], MAT.stone.lit);
      poly(g, [[x + 3, y], [x + 6, y + 4], [x + 3, y + 4]], MAT.stone.shade);
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rand() * w);
      const y = 14 + Math.floor(rand() * (h - 18));
      poly(g, [[x, y], [x + 8, y], [x + 4, y + 3]], MAT.earth.shade);
    }
  });
}

/** Iron spikes on a plank, for each width a spike trap can be: tips reach 24 px above the road. */
function spikes(scene: Phaser.Scene) {
  for (const width of [36, 48, 60]) {
    bake(scene, `spikes-${width}`, width, 26, (g) => {
      slab(g, MAT.wood, 0, 21, width, 5);
      for (let cx = 6; cx + 4 <= width; cx += 12) {
        poly(g, [[cx - 5, 21], [cx, 2], [cx, 21]], MAT.steel.lit);
        poly(g, [[cx, 2], [cx + 5, 21], [cx, 21]], MAT.steel.shade);
      }
    });
  }
}

/** A pit in the road with stakes at the bottom, for each width a pit can be. */
function pits(scene: Phaser.Scene) {
  const h = VIEW.h - GROUND_Y;
  for (const width of [80, 96, 112]) {
    bake(scene, `pit-${width}`, width, h, (g) => {
      poly(g, [[0, 0], [width, 0], [width, h], [0, h]], 0x0d0a12);
      // The pit's walls: the near one lit, the far one in shade, and the back wall in dark stone.
      poly(g, [[0, 0], [4, 0], [4, h], [0, h]], MAT.earth.mid);
      poly(g, [[width - 4, 0], [width, 0], [width, h], [width - 4, h]], MAT.earth.shade);
      poly(g, [[4, 0], [width - 4, 0], [width - 4, 4], [4, 4]], MAT.stone.dark);
      poly(g, [[width - 4, 4], [width - 4, 60], [width - 24, 4]], 0x1f1a2a);
      for (let x = 10; x + 8 <= width - 6; x += 16) {
        poly(g, [[x - 4, h], [x, h - 18], [x, h]], MAT.iron.lit);
        poly(g, [[x, h - 18], [x + 4, h], [x, h]], MAT.iron.shade);
      }
    });
  }
}

/**
 * A spiked log hanging on a chain from above the screen, down to 34 pixels over the road: too
 * low to run under, so the knight slides. Its art is 30 pixels wide (two more than the trap's own
 * width, for the spikes on its sides) and reaches the road's height minus 34.
 */
function blade(scene: Phaser.Scene) {
  const w = 30;
  const bottom = GROUND_Y - 34;
  const logTop = bottom - 84;
  bake(scene, 'blade', w, bottom, (g) => {
    // The chain: diamond links, lit on the left.
    for (let y = 0; y < logTop; y += 10) {
      poly(g, [[15, y], [15, y + 8], [13, y + 4]], MAT.iron.lit);
      poly(g, [[15, y], [15, y + 8], [17, y + 4]], MAT.iron.shade);
    }
    // The log, with two iron bands and spikes poking out of its sides and foot.
    slab(g, MAT.wood, 2, logTop, 26, 68);
    for (const y of [logTop + 6, logTop + 38]) {
      poly(g, [[1, y], [29, y], [29, y + 4], [1, y + 4]], MAT.iron.mid);
      poly(g, [[1, y], [29, y], [29, y + 1], [1, y + 1]], MAT.iron.lit);
    }
    poly(g, [[2, logTop + 18], [0, logTop + 24], [2, logTop + 30]], MAT.iron.lit);
    poly(g, [[28, logTop + 18], [30, logTop + 24], [28, logTop + 30]], MAT.iron.shade);
    for (const x of [6, 15, 24]) {
      poly(g, [[x - 3, bottom - 16], [x, bottom], [x, bottom - 16]], MAT.iron.lit);
      poly(g, [[x, bottom - 16], [x, bottom], [x + 3, bottom - 16]], MAT.iron.shade);
    }
    edge(g, [[2, logTop], [28, logTop], [28, logTop + 68], [2, logTop + 68]], 1, 1);
  });
}

/**
 * The stone of a raised ledge: grass on top of an old castle wall, tall enough for the highest
 * ledge plus the road below it. It tiles sideways; GameScene crops it to each ledge's height.
 */
function ledge(scene: Phaser.Scene) {
  const w = 64;
  const h = 128;
  bake(scene, 'ledge', w, h, (g) => {
    poly(g, [[0, 0], [w, 0], [w, h], [0, h]], MAT.stone.mid);
    // Blocks in staggered courses: each lit along its top, shaded along its right and mortar below.
    for (let row = 0; 9 + row * 10 < h; row++) {
      const y = 9 + row * 10;
      for (let x = row % 2 ? -16 : 0; x < w; x += 32) {
        poly(g, [[x, y], [x + 31, y], [x + 31, y + 9], [x, y + 9]], MAT.stone.mid);
        poly(g, [[x, y], [x + 31, y], [x + 31, y + 2], [x, y + 2]], MAT.stone.lit);
        poly(g, [[x + 27, y + 2], [x + 31, y + 2], [x + 31, y + 9], [x + 27, y + 9]], MAT.stone.shade);
        poly(g, [[x, y + 9], [x + 31, y + 9], [x + 31, y + 10], [x, y + 10]], MAT.stone.dark);
      }
    }
    // The grass cap, lit along its lip.
    poly(g, [[0, 0], [w, 0], [w, 6], [56, 9], [48, 6], [40, 9], [32, 6], [24, 9], [16, 6], [8, 9], [0, 6]], MAT.grass.mid);
    poly(g, [[0, 0], [w, 0], [w, 2], [0, 2]], MAT.grass.lit);
  });
}

/**
 * A fire vent: an iron grate in the road that flares into a column of flame. Baked as `flames-off`
 * (embers on the grate), `flames-warn` (small flames sputtering just before it flares) and two
 * flickering `flames-lit<n>` frames, all the same size with the grate at the bottom. The column is
 * as tall as `TRAP_SPAN.flames.hi`.
 */
function flames(scene: Phaser.Scene) {
  const w = 32;
  const h = 72;
  const grate = (g: Canvas) => {
    poly(g, [[0, 66], [w, 66], [w, h], [0, h]], MAT.iron.dark);
    poly(g, [[0, 66], [w, 66], [w, 68], [0, 68]], MAT.iron.lit);
    for (const x of [3, 9, 15, 21, 27]) poly(g, [[x, 68], [x + 2, 68], [x + 2, h], [x, h]], MAT.iron.shade);
  };

  bake(scene, 'flames-off', w, h, (g) => {
    grate(g);
    poly(g, [[7, 63], [9, 60], [11, 63]], MAT.stone.lit);
    poly(g, [[18, 64], [20, 61], [22, 64]], MAT.stone.mid);
    poly(g, [[12, 65], [14, 63], [16, 65]], 0xc0503a, 1, 0.6);
  });

  bake(scene, 'flames-warn', w, h, (g) => {
    const tongue = (base: [number, number], tip: [number, number], tone: Tones) => {
      poly(g, [[base[0] - 6, 66], tip, [base[0], 66]], tone.mid);
      poly(g, [[base[0], 66], tip, [base[0] + 6, 66]], tone.shade);
    };
    tongue([10, 66], [10, 56], MAT.fire);
    tongue([22, 66], [22, 52], MAT.fire);
    grate(g);
  });

  for (const frame of [0, 1]) {
    bake(scene, `flames-lit${frame}`, w, h, (g) => {
      const sway = frame ? 1 : -1;
      const tip = frame ? 6 : 10;
      // Outer tongue, a lit half and a shaded half, with side tongues.
      poly(g, [[3, 66], [16 + sway, tip], [16, 66]], MAT.fire.mid);
      poly(g, [[16, 66], [16 + sway, tip], [29, 66]], MAT.fire.shade);
      poly(g, [[3, 66], [0, 40 + sway], [10, 66]], MAT.fire.shade);
      poly(g, [[22, 66], [32, 38 - sway], [29, 66]], MAT.fire.shade);
      // Inner tongue, brighter.
      poly(g, [[8, 66], [16 - sway, 26], [16, 66]], MAT.fire.lit);
      poly(g, [[16, 66], [16 - sway, 26], [24, 66]], MAT.fire.mid);
      // Core.
      poly(g, [[12, 66], [16, 42], [20, 66]], MAT.fire.lit);
      grate(g);
    });
  }
}

/** A coin: a faceted gold disc, and an edge-on one for its spin. */
function coin(scene: Phaser.Scene) {
  bake(scene, 'coin-0', 16, 16, (g) => {
    disk(g, MAT.gold, 8, 8, 7, 7, 1, 10);
    edge(g, ring(8, 8, 7, 7, 10), 1, 1, MAT.gold.dark, 0.9);
    edge(g, ring(8, 8, 4, 4, 8), 1, 1, MAT.gold.dark, 0.5);
  });
  bake(scene, 'coin-1', 16, 16, (g) => {
    disk(g, MAT.gold, 8, 8, 2.5, 7, 1, 8);
    edge(g, ring(8, 8, 2.5, 7, 8), 1, 1, MAT.gold.dark, 0.9);
  });
}

/** The checkpoint: a banner on a pole by a campfire. */
function checkpoint(scene: Phaser.Scene) {
  bake(scene, 'checkpoint', 36, 64, (g) => {
    slab(g, MAT.wood, 6, 4, 3, 60);
    disk(g, MAT.gold, 7.5, 2.5, 2.5, 2.5, 1, 6);
    // The banner: a lit half and a shaded half, with a notched foot and a gold cross.
    poly(g, [[9, 5], [15, 5], [15, 21], [12, 18], [9, 21]], MAT.tabard.lit);
    poly(g, [[15, 5], [23, 5], [23, 21], [20, 18], [15, 21]], MAT.tabard.shade);
    edge(g, [[9, 5], [23, 5], [23, 21], [20, 18], [12, 18], [9, 21]], 1, 1);
    poly(g, [[14.5, 8], [16.5, 8], [16.5, 16], [14.5, 16]], MAT.gold.mid);
    poly(g, [[11, 10], [21, 10], [21, 12], [11, 12]], MAT.gold.lit);
    // The campfire: logs, and flames in three tones.
    poly(g, [[16, 62], [32, 62], [32, 64], [16, 64]], MAT.wood.dark);
    poly(g, [[16, 63], [31, 58], [33, 60], [18, 64]], MAT.wood.mid);
    poly(g, [[18, 60], [22, 46], [26, 60]], MAT.fire.shade);
    poly(g, [[21, 60], [24, 50], [27, 60]], MAT.fire.mid);
    poly(g, [[22, 60], [24, 55], [26, 60]], MAT.fire.lit);
  });
}

export function bakeScenery(scene: Phaser.Scene) {
  sky(scene);
  far(scene);
  near(scene);
  ground(scene);
  spikes(scene);
  pits(scene);
  blade(scene);
  flames(scene);
  ledge(scene);
  coin(scene);
  checkpoint(scene);
}
