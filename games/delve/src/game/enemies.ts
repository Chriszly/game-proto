// The foes of the dungeon. Each one repeats a fixed pattern of intents, shown above its head the
// turn before it acts, so the player can plan around it.

export type EnemyKind = 'slime' | 'rat' | 'skeleton' | 'cultist' | 'boneKing';

export type Intent =
  | { kind: 'attack'; damage: number; hits?: number }
  | { kind: 'block'; block: number }
  /** Grows stronger: every attack after deals this much more per hit. */
  | { kind: 'buff'; strength: number };

export interface EnemyType {
  name: string;
  hp: number;
  /** The intents it cycles through, starting with the first. */
  pattern: Intent[];
  boss?: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyType> = {
  slime: {
    name: 'Slime',
    hp: 24,
    pattern: [{ kind: 'attack', damage: 6 }, { kind: 'block', block: 5 }, { kind: 'attack', damage: 8 }],
  },
  rat: {
    name: 'Giant Rat',
    hp: 13,
    pattern: [{ kind: 'attack', damage: 3, hits: 2 }, { kind: 'attack', damage: 5 }],
  },
  skeleton: {
    name: 'Skeleton',
    hp: 30,
    pattern: [{ kind: 'block', block: 6 }, { kind: 'attack', damage: 9 }, { kind: 'attack', damage: 4, hits: 2 }],
  },
  cultist: {
    name: 'Cultist',
    hp: 26,
    pattern: [{ kind: 'buff', strength: 2 }, { kind: 'attack', damage: 6 }, { kind: 'attack', damage: 6 }],
  },
  boneKing: {
    name: 'Bone King',
    hp: 90,
    boss: true,
    pattern: [
      { kind: 'attack', damage: 10 },
      { kind: 'block', block: 12 },
      { kind: 'attack', damage: 4, hits: 3 },
      { kind: 'buff', strength: 3 },
    ],
  },
};
