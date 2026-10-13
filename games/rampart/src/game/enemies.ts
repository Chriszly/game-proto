// The foes that march on the wall. Numbers are for wave 1; later waves scale health up (see waves.ts).

export type EnemyKind = 'goblin' | 'orc' | 'knight' | 'troll';

export interface EnemyType {
  name: string;
  /** Health at wave 1. A boss splits it over `bars` health bars, each this big. */
  hp: number;
  /** Walking speed in pixels per second. */
  speed: number;
  /** Damage a second dealt to the wall while it stands in front of it. */
  dps: number;
  /** Flat damage taken off every arrow and fireball hit; burning and lightning ignore it. */
  armor: number;
  /** Experience for the kill. */
  xp: number;
  /** Hit radius in pixels, also how far its front stands from the wall. */
  radius: number;
  /** Bosses have several health bars, from the boss's wave count; others have one. */
  boss?: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyType> = {
  goblin: { name: 'Goblin', hp: 14, speed: 78, dps: 5, armor: 0, xp: 2, radius: 14 },
  orc: { name: 'Orc', hp: 34, speed: 42, dps: 10, armor: 0, xp: 4, radius: 18 },
  knight: { name: 'Dark Knight', hp: 90, speed: 28, dps: 18, armor: 5, xp: 10, radius: 20 },
  troll: { name: 'Troll King', hp: 300, speed: 16, dps: 45, armor: 2, xp: 60, radius: 40, boss: true },
};
