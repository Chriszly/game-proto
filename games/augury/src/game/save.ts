import { KINDS, LEVELS } from './kinds';
import { newProgress, type Progress } from './progress';

// Augury keeps one key: the records (per kind and per mode) and the last daily five. A run in
// play is not saved; a reload starts at the menu.
const KEY = 'augury-progress';

const count = (v: unknown) => (Number.isFinite(v) && (v as number) >= 0 ? Math.floor(v as number) : 0);

export function loadProgress(): Progress {
  const p = newProgress();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return p;
    for (const k of KINDS) {
      const rec = saved.kinds?.[k];
      if (!rec) continue;
      p.kinds[k].solved = count(rec.solved);
      p.kinds[k].lost = count(rec.lost);
      if (Array.isArray(rec.best)) p.kinds[k].best = LEVELS.map((l) => count(rec.best[l]));
    }
    for (const key of ['endless', 'blitz', 'daily', 'draft'] as const) p.best[key] = count(saved.best?.[key]);
    if (saved.daily && Number.isFinite(saved.daily.day)) p.daily = { day: saved.daily.day, score: count(saved.daily.score) };
    p.runs = count(saved.runs);
  } catch {
    // A broken or blocked save starts fresh.
  }
  return p;
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
