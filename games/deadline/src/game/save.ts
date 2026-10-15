import { UPGRADE_KINDS, type UpgradeKind } from './rules';

// What Deadline keeps between visits: the best wave reached, the chosen art style, the scrap banked
// from kills and the starting crates bought with it for the next run. Every game shares the hub's
// origin, so every key starts with the game's name.

export const BEST_KEY = 'deadline-best';
export const STYLE_KEY = 'deadline-style';
export const SCRAP_KEY = 'deadline-scrap';
export const KIT_KEY = 'deadline-kit';

/** The two looks the game can be drawn in: a pulp horror comic, or a night-vision camera feed. */
export type ArtStyle = 'comic' | 'nv';
export const ART_STYLES: readonly ArtStyle[] = ['comic', 'nv'];

/** The highest wave any run has reached, or 0 when none is saved (or it was broken). */
export function loadBest() {
  try {
    const wave = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(wave) && wave > 0 ? Math.floor(wave) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(wave: number) {
  try {
    localStorage.setItem(BEST_KEY, String(wave));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

/** The saved art style; the comic when none is saved. */
export function loadStyle(): ArtStyle {
  try {
    const style = localStorage.getItem(STYLE_KEY);
    return style === 'nv' ? 'nv' : 'comic';
  } catch {
    return 'comic';
  }
}

export function saveStyle(style: ArtStyle) {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    // As above: unsaved is fine.
  }
}

/** The scrap banked from every run's kills, or 0 when none is saved (or it was broken). */
export function loadScrap() {
  try {
    const n = Number(localStorage.getItem(SCRAP_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveScrap(n: number) {
  try {
    localStorage.setItem(SCRAP_KEY, String(n));
  } catch {
    // As above.
  }
}

/** The starting crates bought for the next run, each kind at most once; anything unknown is dropped. */
export function loadKit(): UpgradeKind[] {
  try {
    const kit: unknown = JSON.parse(localStorage.getItem(KIT_KEY) ?? '[]');
    return Array.isArray(kit) ? UPGRADE_KINDS.filter((k) => kit.includes(k)) : [];
  } catch {
    return [];
  }
}

export function saveKit(kit: UpgradeKind[]) {
  try {
    if (kit.length) localStorage.setItem(KIT_KEY, JSON.stringify(kit));
    else localStorage.removeItem(KIT_KEY);
  } catch {
    // As above.
  }
}
