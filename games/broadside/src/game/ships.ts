// The enemy ships. Speeds are pixels per second, turning radians per second, times milliseconds.

export type EnemyKind = 'sloop' | 'brig' | 'galleon';

export interface ShipType {
  name: string;
  hp: number;
  /** Collision radius. */
  radius: number;
  speed: number;
  turn: number;
  /** Cannons on each side; a broadside fires them all. */
  guns: number;
  damage: number;
  reloadMs: number;
  range: number;
  /** Gold in the loot it drops when sunk. */
  loot: number;
}

export const ENEMIES: Record<EnemyKind, ShipType> = {
  sloop: { name: 'Sloop', hp: 30, radius: 20, speed: 70, turn: 1.1, guns: 1, damage: 5, reloadMs: 2800, range: 220, loot: 10 },
  brig: { name: 'Brig', hp: 70, radius: 25, speed: 58, turn: 0.9, guns: 2, damage: 6, reloadMs: 3000, range: 240, loot: 25 },
  galleon: { name: 'Galleon', hp: 160, radius: 32, speed: 44, turn: 0.6, guns: 3, damage: 8, reloadMs: 3400, range: 260, loot: 60 },
};
