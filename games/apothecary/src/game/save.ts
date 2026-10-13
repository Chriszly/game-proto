import { createInitialState, type GameState } from './state';

const KEY = 'apothecary-save';

/** Loads the saved game, or a fresh one if there is none or it is from an incompatible version. */
export function loadState(): GameState {
  const fresh = createInitialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<GameState>;
    if (saved.version !== fresh.version || !saved.plots) return fresh;
    // Fields added after the save was written fall back to their defaults, including new plots,
    // stations' upgrades, craftsmen and belts.
    const state: GameState = {
      ...fresh,
      ...saved,
      plots: [...saved.plots, ...fresh.plots.slice(saved.plots.length)],
      upgrades: { ...fresh.upgrades, ...saved.upgrades },
      craftsmen: { ...fresh.craftsmen, ...saved.craftsmen },
      belts: { ...fresh.belts, ...saved.belts },
      // Customers from before they paid per potion go home; new ones come along soon. The rest walk in
      // again from the street.
      orders: (saved.orders ?? []).filter((o) => o.pay).map((o) => ({ ...o, arrived: false })),
    };
    // The stations have moved since this save; start the doctor somewhere clear of them.
    if (saved.layout !== fresh.layout) return { ...state, layout: fresh.layout, player: fresh.player };
    return state;
  } catch {
    return fresh;
  }
}

export function saveState(state: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
