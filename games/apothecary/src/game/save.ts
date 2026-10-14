import type { ItemId } from './items';
import { BELT_GAP_MS, BELT_MS, BELTS, COLUMNS_LAYOUT, FEEDERS_LAYOUT, GUILD_UPGRADES, U_BELT_MS, createInitialState, type GameState } from './state';
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
      priority: { ...fresh.priority, ...saved.priority },
      // Customers from before they paid per potion go home; new ones come along soon.
      orders: (saved.orders ?? []).filter((o) => o.pay),
    };
    // A save from before the guild took members has already joined if it bought any guild upgrade.
    if (!saved.guild && GUILD_UPGRADES.some((id) => state.upgrades[id].level > 0 || state.upgrades[id].paid > 0)) {
      state.guild = { built: true, paid: 0 };
    }
    if ((saved.layout ?? 0) < FEEDERS_LAYOUT) ontoOwnRuns(state);
    if ((saved.layout ?? 0) < COLUMNS_LAYOUT) ontoColumns(state);
    // The stations have moved since this save; start the doctor somewhere clear of them.
    if (saved.layout !== fresh.layout) return { ...state, layout: fresh.layout, player: fresh.player };
    return state;
  } catch {
    return fresh;
  }
}

/**
 * Goods saved on a belt before they got on at the start of their own run (mandrakes now come in on
 * their patch's feeder) were drawn on the main run, so any short of where their run joins it move up
 * to the join, or a gap behind the one ahead of them in their lane. They never move back.
 */
function ontoOwnRuns(state: GameState) {
  for (const id of BELTS) {
    // The items in each lane come front first.
    const ahead = new Map<ItemId, number>();
    for (const item of state.belts[id].items) {
      const { join } = beltSpan(id, item.id);
      if (item.at < join) item.at = Math.max(item.at, Math.min(join, (ahead.get(item.id) ?? Infinity) - BELT_GAP_MS));
      ahead.set(item.id, item.at);
    }
  }
}

/**
 * Belts got shorter when the map went to two columns, so goods saved on one keep the same share of
 * the way along it.
 */
function ontoColumns(state: GameState) {
  for (const id of BELTS) for (const item of state.belts[id].items) item.at *= BELT_MS[id] / U_BELT_MS[id];
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
