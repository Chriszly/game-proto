// The things that bite back: slugs, moths and thornlings in the woods and the shrine, their thorn
// seeds, and the Thornmother at the bottom of the shrine with her three bulbs.

import Phaser from 'phaser';
import { texScale } from '../art/paint';
import { LOW, SOLID, TILE, tileAt, type EnemyKind, type MapDef } from '../game/maps';
import { byDifficulty } from '../../../../shared/settings';

export interface FoeInfo {
  hp: number;
  speed: number;
  /** How far away it notices the knight. */
  sees: number;
  /** Half hearts a touch costs. */
  damage: number;
  /** Flies over water and pits. */
  flies?: boolean;
}

export const FOES: Record<EnemyKind, FoeInfo> = {
  slug: { hp: 2, speed: 32, sees: 140, damage: 1 },
  moth: { hp: 1, speed: 74, sees: 200, damage: 1, flies: true },
  thornling: { hp: 3, speed: 0, sees: 270, damage: 1 },
};

/** Seeds a thornling spits, and the Thornmother's volleys. */
export const SEED_SPEED = 150;
export const THORNLING_SHOT_MS = 2300;
/** The Thornmother: how often a bulb rises, how long it stays up, and how long a yanked bulb lies stunned. */
export const BULB_EVERY_MS = 4200;
export const BULB_UP_MS = 3400;
export const BULB_DOWN_MS = 4800;
export const BULB_HP = 2;
/** Seconds between her thorn volleys, by bulbs left (3, 2, 1). */
export const VOLLEY_MS = [3400, 2800, 2200];
export const SUMMON_MS = byDifficulty(12000, 9000, 7000);

export interface Foe {
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  sprite: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  dir: { x: number; y: number };
  /** Counts down to its next turn or shot. */
  t: number;
  stun: number;
  hurt: number;
  room?: string;
  /** Its place in the map's list, for remembering shrine foes that are beaten. */
  index: number;
  alive: boolean;
}

export interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sprite: Phaser.GameObjects.Image;
  life: number;
}

export type BulbState = 'hidden' | 'raised' | 'down' | 'gone';
export interface Bulb {
  home: { x: number; y: number };
  x: number;
  y: number;
  state: BulbState;
  t: number;
  hp: number;
  sprite: Phaser.GameObjects.Image;
}

export interface Boss {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  bulbs: Bulb[];
  raiseT: number;
  volleyT: number;
  summonT: number;
  awake: boolean;
}

/** Whether a foe can stand at a point (a small circle round its feet). */
export function foeFree(map: MapDef, extra: (tx: number, ty: number) => boolean, x: number, y: number, flies = false) {
  for (const [dx, dy] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
    const tx = Math.floor((x + dx) / TILE);
    const ty = Math.floor((y + dy) / TILE);
    const t = tileAt(map, tx, ty);
    if (SOLID.has(t) && !(flies && LOW.has(t))) return false;
    if (extra(tx, ty)) return false;
  }
  return true;
}

export function makeFoe(scene: Phaser.Scene, kind: EnemyKind, x: number, y: number, index: number, room?: string): Foe {
  const key = kind === 'moth' ? 'moth-a' : kind;
  const sprite = scene.add.image(x, y, key).setOrigin(0.5, 0.85).setScale(texScale(key));
  return { kind, x, y, hp: FOES[kind].hp, sprite, home: { x, y }, dir: { x: 0, y: 0 }, t: Math.random() * 1500, stun: 0, hurt: 0, room, index, alive: true };
}
