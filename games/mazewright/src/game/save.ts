import { MAPS } from './maps';

// Mazewright keeps one key: the best wave reached and whether it was won, per garden. A game in
// play is not saved; a reload starts at the garden picker.
const KEY = 'mazewright-best';

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
