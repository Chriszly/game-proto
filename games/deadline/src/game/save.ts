// What Deadline keeps between visits: the best wave reached and the chosen art style. Every game
// shares the hub's origin, so both keys start with the game's name.

export const BEST_KEY = 'deadline-best';
export const STYLE_KEY = 'deadline-style';

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
