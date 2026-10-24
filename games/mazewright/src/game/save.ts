import { MAPS } from './maps';
import { ALWAYS, DEFAULT_POUCH, FREE, MODES, POUCH_PICKS, SEEDS, SLOT_SEEDS, TOWERS, type Mode, type TowerKind } from './rules';

// Mazewright keeps five keys: each garden's records (best wave, win, stars, best time, Endless
// best), the towers picked for the pouch, whether waves wait to be started (calm), the way of play
// picked (mode), and the potting shed (seeds, the towers and master levels bought, extra slots). A game in play is not saved; a reload starts at the garden picker.
const KEY = 'mazewright-best';
const POUCH_KEY = 'mazewright-pouch';
const CALM_KEY = 'mazewright-calm';
const MODE_KEY = 'mazewright-mode';
const SHED_KEY = 'mazewright-shed';

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

/** The potting shed: seeds to spend, the towers and master levels bought, and pouch slots bought (0 to 2). */
export interface Shed {
  seeds: number;
  owned: TowerKind[];
  masters: TowerKind[];
  slots: number;
}

const kindsIn = (v: unknown) => (Array.isArray(v) ? TOWERS.filter((k) => v.includes(k)) : []);

/**
 * The shed as saved. A first load (no key yet) credits the gardens already played: what each would
 * have paid, so a player from before the shed starts with seeds for what they have done.
 */
export function loadShed(records: Records): Shed {
  try {
    const saved = JSON.parse(localStorage.getItem(SHED_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      return { seeds: count(saved.seeds), owned: kindsIn(saved.owned), masters: kindsIn(saved.masters), slots: Math.min(SLOT_SEEDS.length, count(saved.slots)) };
    }
  } catch {
    // A broken or blocked save starts with an empty shed.
  }
  let seeds = 0;
  for (const r of Object.values(records)) {
    if (r.won) seeds += SEEDS.win + SEEDS.star * r.stars;
    else if (r.wave > 0) seeds += SEEDS.loss + Math.floor(r.wave / SEEDS.waves);
  }
  return { seeds, owned: [], masters: [], slots: 0 };
}

export function saveShed(shed: Shed) {
  try {
    localStorage.setItem(SHED_KEY, JSON.stringify(shed));
  } catch {
    // Storage can be full or blocked; the shed holds until the page is closed.
  }
}

/** Whether a tower may go in the pouch: free, or bought. */
export const usable = (shed: Shed, kind: TowerKind) => FREE.includes(kind) || shed.owned.includes(kind);
/** How many towers may be picked besides hedge and bow. */
export const picksOf = (shed: Shed) => POUCH_PICKS + shed.slots;

/** The towers picked for the pouch: hedge and bow, then up to `picksOf(shed)` more, in tower order. */
export function loadPouch(shed: Shed): TowerKind[] {
  try {
    const saved = JSON.parse(localStorage.getItem(POUCH_KEY) ?? 'null');
    if (Array.isArray(saved)) return pouchOf(saved.filter((k): k is TowerKind => TOWERS.includes(k)), shed);
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

/** A pouch made from a list of kinds: hedge and bow first, then the usable rest in tower order, as many as the shed allows. */
export function pouchOf(kinds: TowerKind[], shed: Shed): TowerKind[] {
  const picks = TOWERS.filter((k) => !ALWAYS.includes(k) && kinds.includes(k) && usable(shed, k)).slice(0, picksOf(shed));
  return [...ALWAYS, ...picks];
}
