import { MAPS } from './maps';
import { ALWAYS, DEFAULT_POUCH, MODES, POUCH_PICKS, TOWERS, type Mode, type TowerKind } from './rules';

// Mazewright keeps four keys: each garden's records (best wave, win, stars, best time, Endless
// best), the towers picked for the pouch, whether waves wait to be started (calm), and the way of
// play picked (mode). A game in play is not saved; a reload starts at the garden picker.
const KEY = 'mazewright-best';
const POUCH_KEY = 'mazewright-pouch';
const CALM_KEY = 'mazewright-calm';
const MODE_KEY = 'mazewright-mode';

/** Calm: waves come only when started, with no wave timer. */
export function loadCalm() {
  try {
    return localStorage.getItem(CALM_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveCalm(calm: boolean) {
  try {
    localStorage.setItem(CALM_KEY, calm ? '1' : '0');
  } catch {
    // Storage can be full or blocked; the choice holds until the page is closed.
  }
}

/**
 * Per garden: the best wave reached and whether it was won (Classic or Swarm), the most stars, the
 * fastest win in seconds of game time (0 for none) and the most waves held in Endless.
 */
export interface GardenRecord {
  wave: number;
  won: boolean;
  stars: number;
  time: number;
  endless: number;
}
export type Records = Record<string, GardenRecord>;

const count = (v: unknown) => (Number.isFinite(v) && (v as number) > 0 ? Math.floor(v as number) : 0);

export function loadRecords(): Records {
  const records: Records = {};
  for (const m of MAPS) records[m.id] = { wave: 0, won: false, stars: 0, time: 0, endless: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    for (const m of MAPS) {
      const r = saved?.[m.id];
      if (!r) continue;
      const into = records[m.id];
      into.wave = count(r.wave);
      into.won = r.won === true;
      into.stars = Math.min(4, count(r.stars) || (into.won ? 1 : 0));
      into.time = count(r.time);
      into.endless = count(r.endless);
    }
  } catch {
    // A broken or blocked save starts fresh.
  }
  return records;
}

/** Merges a game's result into a garden's record, keeping the best of each; saves only when something changed. */
export function noteRecord(records: Records, mapId: string, result: Partial<GardenRecord>) {
  const r = records[mapId];
  if (!r) return;
  const before = JSON.stringify(r);
  r.wave = Math.max(r.wave, result.wave ?? 0);
  r.won ||= !!result.won;
  r.stars = Math.max(r.stars, result.stars ?? 0);
  if (result.time) r.time = r.time ? Math.min(r.time, result.time) : result.time;
  r.endless = Math.max(r.endless, result.endless ?? 0);
  if (JSON.stringify(r) === before) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

/** The way of play picked on the garden picker. */
export function loadMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return MODES.includes(saved as Mode) ? (saved as Mode) : 'classic';
  } catch {
    return 'classic';
  }
}

export function saveMode(mode: Mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage can be full or blocked; the choice holds until the page is closed.
  }
}

/** The towers picked for the pouch: hedge and bow, then up to `POUCH_PICKS` more, in tower order. */
export function loadPouch(): TowerKind[] {
  try {
    const saved = JSON.parse(localStorage.getItem(POUCH_KEY) ?? 'null');
    if (Array.isArray(saved)) return pouchOf(saved.filter((k): k is TowerKind => TOWERS.includes(k)));
  } catch {
    // A broken or blocked save keeps today's four.
  }
  return [...DEFAULT_POUCH];
}

export function savePouch(pouch: TowerKind[]) {
  try {
    localStorage.setItem(POUCH_KEY, JSON.stringify(pouch));
  } catch {
    // Storage can be full or blocked; the pick still holds until the page is closed.
  }
}

/** A pouch made from a list of kinds: hedge and bow first, the rest in tower order, at most four. */
export function pouchOf(kinds: TowerKind[]): TowerKind[] {
  const picks = TOWERS.filter((k) => !ALWAYS.includes(k) && kinds.includes(k)).slice(0, POUCH_PICKS);
  return [...ALWAYS, ...picks];
}
