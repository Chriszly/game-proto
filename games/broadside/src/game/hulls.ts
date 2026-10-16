// The ships the player can captain. The first run sails the Frigate; the others are unlocked by
// the best wave beaten and chosen on the "Sunk!" panel for the next run.

import type { Side } from './state';

export type HullId = 'frigate' | 'cutter' | 'bomb';

export interface Hull {
  name: string;
  desc: string;
  /** The best wave that must have been beaten to sail her. */
  unlockWave: number;
  hp: number;
  /** Collision radius. */
  radius: number;
  speed: number;
  turn: number;
  /** Cannons on each side. */
  guns: number;
  damage: number;
  reloadMs: number;
  range: number;
  /** Sailors aboard with a full crew: fewer slow the reload. */
  crew: number;
  /**
   * The side whose guns are a mortar instead: holding that fire control aims a shell, which lands
   * where the arc reaches `SHELL_MS` later and bursts for `shell` damage (more when charged).
   */
  mortarSide?: Side;
  shell?: number;
}

export const HULLS: Record<HullId, Hull> = {
  frigate: { name: 'Frigate', desc: 'Two guns a side, a sound all-rounder', unlockWave: 0, hp: 120, radius: 25, speed: 90, turn: 1.7, guns: 2, damage: 10, reloadMs: 2000, range: 260, crew: 40 },
  cutter: { name: 'Cutter', desc: 'Fast and nimble, one heavy gun a side', unlockWave: 3, hp: 90, radius: 20, speed: 114, turn: 2.4, guns: 1, damage: 14, reloadMs: 1500, range: 240, crew: 24 },
  bomb: { name: 'Bomb Ketch', desc: 'Slow and stout, a mortar to starboard', unlockWave: 6, hp: 150, radius: 28, speed: 70, turn: 1.2, guns: 2, damage: 10, reloadMs: 2200, range: 250, crew: 36, mortarSide: 'starboard', shell: 26 },
};

export const HULL_IDS = Object.keys(HULLS) as HullId[];

/** The ship every first run sails. */
export const FIRST_HULL: HullId = 'frigate';

/** Whether a hull can be sailed with `bestWave` beaten. */
export const unlocked = (id: HullId, bestWave: number) => bestWave >= HULLS[id].unlockWave;
