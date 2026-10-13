import Phaser from 'phaser';
import type { EnemyKind } from '../game/ships';

interface ShipLook {
  length: number;
  beam: number;
  hull: number;
  deck: number;
  sail: number;
  masts: number;
  flag: number;
  guns: number;
}

export const SHIP_LOOKS: Record<'player' | EnemyKind, ShipLook> = {
  player: { length: 72, beam: 26, hull: 0x3b2416, deck: 0x7a5230, sail: 0x2a2a32, masts: 2, flag: 0x111111, guns: 2 },
  sloop: { length: 54, beam: 20, hull: 0x6b4a2a, deck: 0xb08a58, sail: 0xf1e8d0, masts: 1, flag: 0x2c5aa0, guns: 1 },
  brig: { length: 68, beam: 26, hull: 0x5e3a20, deck: 0xa47a48, sail: 0xf1e8d0, masts: 2, flag: 0xc8402e, guns: 2 },
  galleon: { length: 88, beam: 34, hull: 0x5a3020, deck: 0xa07040, sail: 0xf4e4b8, masts: 3, flag: 0xd8a840, guns: 3 },
};

const OUTLINE = 0x1a1216;

/** A ship seen from above, bow to the east, baked into the texture `ship-<kind>`. */
function bakeShip(scene: Phaser.Scene, kind: keyof typeof SHIP_LOOKS) {
  const look = SHIP_LOOKS[kind];
  const L = look.length;
  const B = look.beam;
  const w = L + 6;
  const h = Math.round(B * 1.5) + 6;
  const cy = h / 2;
  const g = scene.add.graphics();
  const hull = [
    { x: 3, y: cy - B / 2 + 2 },
    { x: L * 0.62, y: cy - B / 2 },
    { x: L * 0.86, y: cy - B / 4 },
    { x: L + 2, y: cy },
    { x: L * 0.86, y: cy + B / 4 },
    { x: L * 0.62, y: cy + B / 2 },
    { x: 3, y: cy + B / 2 - 2 },
  ].map((p) => new Phaser.Math.Vector2(p.x, p.y));
  // Cannons poking out of each side.
  g.fillStyle(0x222228);
  for (let i = 0; i < look.guns; i++) {
    const gx = L * (0.3 + (0.35 * (i + 0.5)) / look.guns) - 2;
    g.fillRect(gx, cy - B / 2 - 3, 4, 4).fillRect(gx, cy + B / 2 - 1, 4, 4);
  }
  g.fillStyle(look.hull).fillPoints(hull, true);
  g.lineStyle(2, OUTLINE).strokePoints(hull, true);
  const deck = hull.map((p) => new Phaser.Math.Vector2(3 + (p.x - 3) * 0.9 + 2, cy + (p.y - cy) * 0.7));
  g.fillStyle(look.deck).fillPoints(deck, true);
  g.lineStyle(1, look.hull, 0.6);
  for (let j = -1; j <= 1; j++) g.lineBetween(6, cy + j * B * 0.18, L * 0.8, cy + j * B * 0.18);
  // The stern cabin and its flag.
  g.fillStyle(look.hull).fillRect(4, cy - B * 0.3, 7, B * 0.6);
  g.fillStyle(look.flag).fillRect(1, cy - 3, 6, 6);
  if (kind === 'player') g.fillStyle(0xf1e3c6).fillRect(3, cy - 1, 2, 2);
  // Masts with their sails, curved forward by the wind.
  for (let m = 0; m < look.masts; m++) {
    const mx = L * (look.masts === 1 ? 0.5 : 0.3 + (0.42 * m) / (look.masts - 1));
    g.fillStyle(look.sail).fillEllipse(mx + 2, cy, 8, B * 1.35);
    g.lineStyle(1, OUTLINE, 0.7).strokeEllipse(mx + 2, cy, 8, B * 1.35);
    g.fillStyle(0x4a2c18).fillRect(mx - 1, cy - B * 0.68, 2, B * 1.36);
    g.fillStyle(0x2a1a10).fillCircle(mx, cy, 2.2);
    if (kind === 'player') g.fillStyle(0xf1e3c6).fillCircle(mx + 3, cy, 1.6);
  }
  g.generateTexture(`ship-${kind}`, w, h);
  g.destroy();
}

function bakeWater(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x1d5878).fillRect(0, 0, 64, 64);
  g.fillStyle(0x22668a);
  for (const [x, y] of [[8, 10], [40, 22], [18, 44], [50, 54]]) g.fillRect(x, y, 10, 2).fillRect(x + 2, y - 2, 6, 2);
  g.fillStyle(0x195070).fillRect(28, 6, 6, 2).fillRect(4, 30, 6, 2).fillRect(36, 40, 8, 2);
  g.generateTexture('water', 64, 64);
  g.destroy();
}

/**
 * A small sandy island with palm trees. Ships sail over the shallows but run aground on the sand,
 * whose size `ISLANDS` in src/game/state.ts copies.
 */
function bakeIsland(scene: Phaser.Scene, key: string, w: number, h: number, palms: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x3d8fa8, 0.7).fillEllipse(w / 2, h / 2, w, h);
  g.fillStyle(0xe8d08a).fillEllipse(w / 2, h / 2, w * 0.78, h * 0.72);
  g.fillStyle(0x7aa040).fillEllipse(w / 2, h / 2, w * 0.5, h * 0.42);
  for (let i = 0; i < palms; i++) {
    const px = w * (0.35 + (0.3 * i) / Math.max(1, palms - 1));
    const py = h * (0.42 + 0.12 * (i % 2));
    g.fillStyle(0x2f6a28);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      g.fillEllipse(px + Math.cos(ang) * 6, py + Math.sin(ang) * 6, 12, 6);
    }
    g.fillStyle(0x5a3a1a).fillCircle(px, py, 2.5);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

function bakeSmall(scene: Phaser.Scene) {
  let g = scene.add.graphics();
  g.fillStyle(0x16161a).fillCircle(4, 4, 4);
  g.fillStyle(0x6a6a74).fillRect(2, 2, 2, 2);
  g.generateTexture('ball', 8, 8);
  g.destroy();

  // A floating barrel of plunder, seen from above, with gold spilling over the rim.
  g = scene.add.graphics();
  g.fillStyle(OUTLINE).fillCircle(10, 10, 10);
  g.fillStyle(0x8a5a2c).fillCircle(10, 10, 8.5);
  g.lineStyle(2, 0x3a2414).strokeCircle(10, 10, 6);
  g.fillStyle(0xf3c64e).fillCircle(10, 10, 4);
  g.fillStyle(0xfff0a0).fillRect(8, 8, 2, 2);
  g.generateTexture('loot', 20, 20);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xf3c64e).fillCircle(4, 4, 4);
  g.fillStyle(0xfff0a0).fillRect(2, 2, 2, 2);
  g.generateTexture('coin', 8, 8);
  g.destroy();
}

/** Generates every texture at runtime, so the prototype needs no asset files. */
export function bakeAll(scene: Phaser.Scene) {
  bakeWater(scene);
  bakeIsland(scene, 'island-0', 150, 100, 3);
  bakeIsland(scene, 'island-1', 100, 80, 2);
  bakeIsland(scene, 'island-2', 70, 54, 1);
  for (const kind of Object.keys(SHIP_LOOKS) as (keyof typeof SHIP_LOOKS)[]) bakeShip(scene, kind);
  bakeSmall(scene);
}
