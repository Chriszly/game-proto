import { MAPS } from './maps';
import { ALWAYS, DEFAULT_POUCH, POUCH_PICKS, TOWERS, type TowerKind } from './rules';

// Mazewright keeps two keys: the best wave reached and whether it was won, per garden, and the
// towers picked for the pouch. A game in play is not saved; a reload starts at the garden picker.
const KEY = 'mazewright-best';
const POUCH_KEY = 'mazewright-pouch';

export type Records = Record<string, { wave: number; won: boolean }>;

export function loadRecords(): Records {
  const records: Records = {};
  for (const m of MAPS) records[m.id] = { wave: 0, won: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    for (const m of MAPS) {
      const r = saved?.[m.id];
      if (!r) continue;
      if (Number.isFinite(r.wave) && r.wave > 0) records[m.id].wave = Math.floor(r.wave);
      records[m.id].won = r.won === true;
    }
  } catch {
    // A broken or blocked save starts fresh.
  }
  return records;
}

/** Raises a garden's record to `wave` (and marks it won); saves only when something changed. */
export function noteRecord(records: Records, mapId: string, wave: number, won: boolean) {
  const r = records[mapId];
  if (!r || (wave <= r.wave && (!won || r.won))) return;
  r.wave = Math.max(r.wave, wave);
  r.won ||= won;
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
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
