// The enemy ships. Speeds are pixels per second, turning radians per second, times milliseconds.

export type EnemyKind = 'sloop' | 'brig' | 'galleon' | 'fireship' | 'ketch' | 'flagship';

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
  /**
   * How it fights, when not with broadsides: a fireship sails straight at you and blows up on
   * touching (or when sunk); a mortar ketch keeps its distance and lobs shells (`damage` each,
   * every `reloadMs`, up to `range` away) that land where it marked.
   */
  role?: 'fireship' | 'mortar';
}

export const ENEMIES: Record<EnemyKind, ShipType> = {
  sloop: { name: 'Sloop', hp: 30, radius: 20, speed: 70, turn: 1.1, guns: 1, damage: 5, reloadMs: 2800, range: 220, loot: 10 },
  brig: { name: 'Brig', hp: 70, radius: 25, speed: 58, turn: 0.9, guns: 2, damage: 6, reloadMs: 3000, range: 240, loot: 25 },
  galleon: { name: 'Galleon', hp: 160, radius: 32, speed: 44, turn: 0.6, guns: 3, damage: 8, reloadMs: 3400, range: 260, loot: 60 },
  fireship: { name: 'Fireship', hp: 24, radius: 20, speed: 104, turn: 1.25, guns: 0, damage: 26, reloadMs: 0, range: 0, loot: 12, role: 'fireship' },
  ketch: { name: 'Mortar ketch', hp: 45, radius: 22, speed: 52, turn: 0.9, guns: 0, damage: 20, reloadMs: 4200, range: 380, loot: 30, role: 'mortar' },
  flagship: { name: 'Flagship', hp: 300, radius: 38, speed: 42, turn: 0.55, guns: 4, damage: 9, reloadMs: 3000, range: 280, loot: 150 },
};
