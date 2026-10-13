import Phaser from 'phaser';
import { MAX_TIER } from '../game/swords';
import { FIRE, FROST, GOLD, INK, IRON, MAGIC, RED, STONE, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

// Every sword is drawn on a 16 x 16 grid, lying corner to corner with the hilt at the bottom left.
// Better swords have longer, broader blades, finer hilts, a gem in the pommel and, at the top, a glow.

interface Look {
  blade: number;
  edge: number;
  guard: number;
  grip: number;
  gem?: number;
  glow?: number;
}

const LOOKS: Look[] = [
  { blade: 0x8a5a3a, edge: WOOD.shine, guard: WOOD.mid, grip: WOOD.dark },
  { blade: IRON.light, edge: IRON.shine, guard: IRON.mid, grip: WOOD.mid },
  { blade: 0xa8b4c4, edge: 0xe0e8f0, guard: IRON.shine, grip: RED.dark },
  { blade: 0xbac6d8, edge: 0xffffff, guard: GOLD.mid, grip: FROST.dark, gem: RED.light },
  { blade: 0xd0dce8, edge: 0xffffff, guard: FROST.light, grip: 0x2b3b6b, gem: FROST.mid },
  { blade: GOLD.light, edge: GOLD.shine, guard: RED.mid, grip: RED.dark, gem: FROST.light },
  { blade: FROST.mid, edge: FROST.white, guard: MAGIC.mid, grip: IRON.dark, gem: MAGIC.light, glow: MAGIC.mid },
  { blade: RED.light, edge: FIRE.light, guard: STONE.dark, grip: INK, gem: FIRE.light, glow: FIRE.mid },
];

export const swordTexture = (tier: number) => `sword-${tier}`;

export function bakeSwords(scene: Phaser.Scene) {
  for (let tier = 1; tier <= MAX_TIER; tier++) bakeSword(scene, tier, LOOKS[tier - 1]);
}

function bakeSword(scene: Phaser.Scene, tier: number, look: Look) {
  const c = new PixelCanvas(18, 18);
  const o = 1; // room for the outline
  // The blade runs up and to the right from just above the guard; longer for better swords.
  const length = 5 + tier;
  const broad = tier >= 4;
  for (let i = 0; i < length; i++) {
    const x = o + 5 + i;
    const y = o + 10 - i;
    c.px(x, y, look.blade);
    c.px(x + 1, y, i === length - 1 ? look.blade : look.edge);
    if (broad) c.px(x, y + 1, look.blade);
  }
  c.px(o + 5 + length, o + 10 - length + 1, look.edge);
  // The guard, across the blade; wider for better swords.
  const half = tier >= 3 ? 2 : 1;
  for (let j = -half; j <= half; j++) c.px(o + 4 + j, o + 10 + j, look.guard);
  if (tier >= 5) c.px(o + 4 - half - 1, o + 10 - half, look.guard).px(o + 4 + half + 1, o + 10 + half + 1, look.guard);
  // Grip and pommel.
  c.px(o + 3, o + 12, look.grip).px(o + 2, o + 13, look.grip);
  c.px(o + 1, o + 14, look.gem ?? look.guard);
  c.outline(INK);
  if (look.glow !== undefined) glow(c, look.glow);
  c.bake(scene, swordTexture(tier), 4);
}

/** A soft halo around the sword: every empty pixel next to the outline, half see-through. */
function glow(c: PixelCanvas, color: number) {
  const halo: [number, number][] = [];
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (c.get(x, y) !== null) continue;
      if ([c.get(x - 1, y), c.get(x + 1, y), c.get(x, y - 1), c.get(x, y + 1)].some((n) => n === INK)) halo.push([x, y]);
    }
  }
  for (const [x, y] of halo) c.px(x, y, color, 0.45);
}
