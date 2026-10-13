import type { ItemId } from './items';
import { BELT_GAP_MS, BELTS, createInitialState, type GameState } from './state';
import { beltSpan } from '../scenes/layout';

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
      // Customers from before they paid per potion go home; new ones come along soon.
      orders: (saved.orders ?? []).filter((o) => o.pay),
    };
    // The stations have moved since this save; start the doctor somewhere clear of them.
    if (saved.layout !== fresh.layout) {
      ontoOwnRuns(state);
      return { ...state, layout: fresh.layout, player: fresh.player };
    }
    return state;
  } catch {
    return fresh;
  }
}

/**
 * Goods saved on a belt before they got on at the start of their own run (mandrakes now come in on
 * their patch's feeder) move up to that start, a gap apart in each lane, the rearmost out of sight.
 */
function ontoOwnRuns(state: GameState) {
  for (const id of BELTS) {
    const queued = new Map<ItemId, number>();
    for (const item of state.belts[id].items) {
      const { start } = beltSpan(id, item.id);
      if (item.at >= start) continue;
      const ahead = queued.get(item.id) ?? 0;
      item.at = start - ahead * BELT_GAP_MS;
      queued.set(item.id, ahead + 1);
    }
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
