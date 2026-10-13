import type { EnemyKind } from './enemies';

// The dungeon: rooms in columns from the entrance on the left to the Bone King on the right. From
// each room the paths lead on to one or two rooms in the next column. (x, y) is where the room is
// drawn on the 960x540 map.

export type RoomKind = 'fight' | 'rest' | 'treasure' | 'boss';

export interface Room {
  kind: RoomKind;
  col: number;
  x: number;
  y: number;
  /** The rooms in the next column its paths lead to. */
  next: number[];
  /** Who waits inside, for a fight or the boss, left to right. */
  foes?: EnemyKind[];
}

const colX = (col: number) => 110 + col * 148;

export const ROOMS: Room[] = [
  { kind: 'fight', col: 0, x: colX(0), y: 290, next: [1, 2], foes: ['slime'] },
  { kind: 'fight', col: 1, x: colX(1), y: 200, next: [3, 4], foes: ['rat', 'rat'] },
  { kind: 'fight', col: 1, x: colX(1), y: 380, next: [4], foes: ['skeleton'] },
  { kind: 'rest', col: 2, x: colX(2), y: 200, next: [5, 6] },
  { kind: 'fight', col: 2, x: colX(2), y: 380, next: [6], foes: ['cultist'] },
  { kind: 'treasure', col: 3, x: colX(3), y: 200, next: [7] },
  { kind: 'fight', col: 3, x: colX(3), y: 380, next: [7], foes: ['slime', 'rat'] },
  { kind: 'fight', col: 4, x: colX(4), y: 290, next: [8], foes: ['cultist', 'rat'] },
  { kind: 'boss', col: 5, x: colX(5), y: 290, next: [], foes: ['boneKing'] },
];

/** Where the hero waits before the first room. */
export const ENTRANCE = { x: 30, y: 290 };

/** The rooms the hero can walk into from `at` (null = the entrance). */
export const reachable = (at: number | null) => (at === null ? ROOMS.map((r, i) => (r.col === 0 ? i : -1)).filter((i) => i >= 0) : ROOMS[at].next);
