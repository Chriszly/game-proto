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
const TOP = 200;
const MID = 290;
const BOTTOM = 380;

/** The foes a fight room can hold, by how deep it is. */
const EARLY: EnemyKind[][] = [['rat', 'rat'], ['skeleton'], ['slime', 'rat']];
const DEEPER: EnemyKind[][] = [['cultist'], ['skeleton', 'rat'], ['slime', 'slime']];
const LATE: EnemyKind[][] = [['cultist', 'rat'], ['skeleton', 'cultist'], ['rat', 'rat', 'slime']];

/**
 * A new Crypt for each run, drawn with Math.random: the first room is always a lone slime, then two
 * fights, a campfire and a fight (either way up), a treasure chest and a fight, one last fight and
 * the Bone King. Rooms lead on to the room in the same row of the next column, and some paths cross
 * between rows.
 */
export function makeMap(): Room[] {
  const pick = <T>(items: T[]) => items.splice(Math.floor(Math.random() * items.length), 1)[0];
  const coin = () => Math.random() < 0.5;
  const early = [...EARLY];
  const deeper = [...DEEPER];
  const fight = (col: number, y: number, foes: EnemyKind[]): Room => ({ kind: 'fight', col, x: colX(col), y, next: [], foes });
  // Columns 2 and 3 each hold one special room and one fight; which row each takes is random.
  const pair = (col: number, kind: RoomKind): Room[] => {
    const special: Room = { kind, col, x: colX(col), y: TOP, next: [] };
    const other = fight(col, BOTTOM, pick(deeper));
    if (coin()) [special.y, other.y] = [BOTTOM, TOP];
    return special.y === TOP ? [special, other] : [other, special];
  };
  const rooms: Room[] = [
    { kind: 'fight', col: 0, x: colX(0), y: MID, next: [1, 2], foes: ['slime'] },
    fight(1, TOP, pick(early)),
    fight(1, BOTTOM, pick(early)),
    ...pair(2, 'rest'),
    ...pair(3, 'treasure'),
    fight(4, MID, LATE[Math.floor(Math.random() * LATE.length)]),
    { kind: 'boss', col: 5, x: colX(5), y: MID, next: [], foes: ['boneKing'] },
  ];
  // Between the two-room columns each row leads straight on, and one or both paths cross over.
  for (const from of [1, 3]) {
    const [top, bottom] = [from, from + 1];
    const cross = Math.floor(Math.random() * 3);
    rooms[top].next = cross === 1 ? [top + 2] : [top + 2, top + 3];
    rooms[bottom].next = cross === 0 ? [bottom + 2] : [bottom + 1, bottom + 2];
  }
  rooms[5].next = [7];
  rooms[6].next = [7];
  rooms[7].next = [8];
  return rooms;
}

/** Where the hero waits before the first room. */
export const ENTRANCE = { x: 30, y: 290 };

/** The rooms the hero can walk into from `at` (null = the entrance). */
export const reachable = (rooms: Room[], at: number | null) =>
  at === null ? rooms.map((r, i) => (r.col === 0 ? i : -1)).filter((i) => i >= 0) : rooms[at].next;
