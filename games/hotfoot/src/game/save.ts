import { ARMOURY_IDS, ARMOURY, noArmoury, type Armoury } from './armoury';
import { BOON_IDS, type BoonId } from './boons';

// Progress kept between runs, in the browser's local storage: the best distance, the coins banked,
// the boon bought for the next run, the armoury's levels and the daily course's best. Every key is
// prefixed with the game's name, since every game shares the hub's origin, and the crown from the
// Dragon's Keep. Storage can be blocked or full, so every access is wrapped.

const BEST = 'hotfoot-best';
const BANK = 'hotfoot-bank';
const PENDING = 'hotfoot-start';
const ARMOURY_KEY = 'hotfoot-armoury';
const DAILY = 'hotfoot-daily';
const CROWN = 'hotfoot-crown';

export interface Progress {
  best: number;
  bank: number;
  pending: BoonId | null;
  armoury: Armoury;
  /** The best distance on the last daily course run, and its date (`YYYY-MM-DD`). */
  daily: { date: string; best: number } | null;
  /** Whether the dragon of the Dragon's Keep has ever been beaten. */
  crown: boolean;
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse(raw: string | null): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadProgress(): Progress {
  const pending = read(PENDING);
  const rawArmoury = parse(read(ARMOURY_KEY)) as Partial<Record<string, unknown>> | null;
  const armoury = noArmoury();
  for (const id of ARMOURY_IDS) {
    const level = Number(rawArmoury?.[id]);
    if (Number.isInteger(level)) armoury[id] = Math.max(0, Math.min(ARMOURY[id].prices.length, level));
  }
  const rawDaily = parse(read(DAILY)) as { date?: unknown; best?: unknown } | null;
  const daily = typeof rawDaily?.date === 'string' && Number.isFinite(Number(rawDaily.best)) ? { date: rawDaily.date, best: Number(rawDaily.best) } : null;
  return {
    best: Number(read(BEST)) || 0,
    bank: Number(read(BANK)) || 0,
    pending: BOON_IDS.find((id) => id === pending) ?? null,
    armoury,
    daily,
    crown: read(CROWN) === '1',
  };
}

export function saveProgress({ best, bank, pending, armoury, daily, crown }: Progress) {
  try {
    localStorage.setItem(BEST, String(best));
    localStorage.setItem(BANK, String(bank));
    if (pending) localStorage.setItem(PENDING, pending);
    else localStorage.removeItem(PENDING);
    localStorage.setItem(ARMOURY_KEY, JSON.stringify(armoury));
    if (daily) localStorage.setItem(DAILY, JSON.stringify(daily));
    if (crown) localStorage.setItem(CROWN, '1');
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
