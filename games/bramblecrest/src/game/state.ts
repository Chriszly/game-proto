// What a playthrough of Bramblecrest knows: where the knight is, their hearts and things, the
// moonstones found, the quest they are on and every flag the world has set. Saved to the browser
// whenever the knight changes place or the quest moves on.

import { byDifficulty } from '../../../../shared/settings';
import type { Facing, ItemId, MapId } from './maps';

export const SAVE_KEY = 'bramblecrest-save';

/** Health is counted in half hearts. */
export const START_HEARTS = byDifficulty(5, 3, 2);
/** Moonstones hidden in the first chapter, and in the first two together. */
export const CHAPTER_ONE_STONES = 8;
export const MOONSTONES = 13;
/** The most bellseeds the knight can carry. */
export const MAX_SEEDS = 10;

/** The quest line of the first two chapters, in order. */
export const QUESTS = ['start', 'blade', 'thorns', 'shrine', 'return', 'done', 'bell', 'belfry', 'home', 'end'] as const;
export type Quest = (typeof QUESTS)[number];

/** What the journal line says for each step of the quest. */
export const OBJECTIVES: Record<Quest, string> = {
  start: 'Talk to Elder Wren in the square',
  blade: 'Fetch the old blade from the shed',
  thorns: 'Cut the thorns at the north gate',
  shrine: 'Find the Sunken Shrine in Bramble Woods',
  return: 'Bring the news back to Elder Wren',
  done: 'A bell tolls in the night. Ask Elder Wren about it',
  bell: 'Ask Old Sedge in Glimmer Fen about the bell',
  belfry: 'Find the Drowned Belfry in Glimmer Fen',
  home: 'Tell Elder Wren the bell is quiet',
  end: 'Chapter two is done. Keep exploring by lamplight',
};

/** Whether the quest has reached `q`. */
export function reached(s: GameState, q: Quest) {
  return QUESTS.indexOf(s.quest) >= QUESTS.indexOf(q);
}

/** How many moonstones there are to find so far: the second chapter's show up once it starts. */
export function stonesToFind(s: GameState) {
  return reached(s, 'bell') ? MOONSTONES : CHAPTER_ONE_STONES;
}

export interface GameState {
  map: MapId;
  /** Where the knight is, in pixels, and which way they face. */
  x: number;
  y: number;
  facing: Facing;
  /** Where the knight wakes after a fall: the tile they last entered this map on. */
  spawn: { map: MapId; x: number; y: number; facing: Facing };
  hp: number;
  maxHp: number;
  items: { sword: boolean; hookvine: boolean; oil: boolean; seeds: boolean };
  keys: number;
  /** Bellseeds carried. */
  seeds: number;
  moonstones: string[];
  flags: string[];
  quest: Quest;
  /** Times the knight has fallen. */
  falls: number;
  /** Foes beaten, for the chapter's end card. */
  beaten: number;
}

export function newState(): GameState {
  const spawn = { map: 'village' as MapId, x: 25.5 * 32, y: 19.5 * 32, facing: 'down' as Facing };
  return {
    map: spawn.map,
    x: spawn.x,
    y: spawn.y,
    facing: spawn.facing,
    spawn,
    hp: START_HEARTS * 2,
    maxHp: START_HEARTS * 2,
    items: { sword: false, hookvine: false, oil: false, seeds: false },
    keys: 0,
    seeds: 0,
    moonstones: [],
    flags: [],
    quest: 'start',
    falls: 0,
    beaten: 0,
  };
}

export function hasFlag(s: GameState, flag: string) {
  return s.flags.includes(flag);
}

export function setFlag(s: GameState, flag: string) {
  if (!s.flags.includes(flag)) s.flags.push(flag);
}

/** Moves the quest on to `q`, never back. */
export function advance(s: GameState, q: Quest) {
  if (QUESTS.indexOf(q) > QUESTS.indexOf(s.quest)) s.quest = q;
}

/** Gives the knight a thing found in a chest. */
export function give(s: GameState, item: ItemId) {
  if (item === 'sword') s.items.sword = true;
  else if (item === 'hookvine') s.items.hookvine = true;
  else if (item === 'oil') s.items.oil = true;
  else if (item === 'key') s.keys++;
  else if (item === 'seeds') {
    s.items.seeds = true;
    s.seeds = MAX_SEEDS;
  }
  else if (item === 'heart') {
    s.maxHp += 2;
    s.hp = s.maxHp;
  }
}

export function save(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // Storage can be blocked (private mode); the run lasts until the page closes.
  }
}

/** The saved playthrough, or a new one when there is none (or it can't be read). */
export function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<GameState>;
      const fresh = newState();
      if (saved && QUESTS.includes(saved.quest as Quest)) return { ...fresh, ...saved, items: { ...fresh.items, ...saved.items } };
    }
  } catch {
    // A broken save starts over.
  }
  return newState();
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
