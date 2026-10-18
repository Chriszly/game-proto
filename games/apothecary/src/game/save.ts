import type { ItemId } from './items';
import { BELT_GAP_MS, BELT_MS, BELTS, COLUMNS_BELT_MS, COLUMNS_LAYOUT, FEEDERS_LAYOUT, GUILD_UPGRADES, HEART_LAYOUT, PLOTS_PER_GARDEN, U_BELT_MS, createInitialState, gardenOf, type GameState, type Plot } from './state';
import { beltSpan } from '../scenes/layout';
import { normalizeTown } from './town';

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
    // stations' upgrades, craftsmen and belts, the contract, sales and tips counts, the last-seen
    // time (0, so a save from before them catches up on nothing), the shade gardens, the
    // reputation, the regulars, the market day's rush, the plague, the price signs, the rival,
    // the town seals, the merchant wagon and the herb market's pick.
    const state: GameState = {
      ...fresh,
      ...saved,
      plots: keepsPlots(saved.plots) ? [...saved.plots, ...fresh.plots.slice(saved.plots.length)] : fresh.plots,
      upgrades: { ...fresh.upgrades, ...saved.upgrades },
      craftsmen: { ...fresh.craftsmen, ...saved.craftsmen },
      belts: { ...fresh.belts, ...saved.belts },
      priority: { ...fresh.priority, ...saved.priority },
      // Customers from before they paid per potion go home; new ones come along soon.
      orders: (saved.orders ?? []).filter((o) => o.pay),
      town: normalizeTown(saved.town),
    };
    // A save from before the guild took members has already joined if it bought any guild upgrade.
    if (!saved.guild && GUILD_UPGRADES.some((id) => state.upgrades[id].level > 0 || state.upgrades[id].paid > 0)) {
      state.guild = { built: true, paid: 0 };
    }
    // A save from before the study brewed Shadow Elixirs once a shade garden grew; it keeps them, and
    // the Vigour Tonic before it in the study's order.
    if (!saved.upgrades?.research && state.shade.some((g) => g.built)) state.upgrades.research = { level: 2, paid: 0 };
    // Rescale first: the joins `ontoOwnRuns` moves goods up to are on today's shorter belts.
    if ((saved.layout ?? 0) < COLUMNS_LAYOUT) ontoColumns(state);
    if ((saved.layout ?? 0) < HEART_LAYOUT) ontoHeart(state);
    if ((saved.layout ?? 0) < FEEDERS_LAYOUT) ontoOwnRuns(state);
    // The stations have moved since this save; start the doctor somewhere clear of them.
    if (saved.layout !== fresh.layout) return { ...state, layout: fresh.layout, player: fresh.player };
    return state;
  } catch {
    return fresh;
  }
}

/**
 * Whether saved plots still fit today's gardens: every bed of a garden grows the same plant (a
 * replanted garden switches all nine). Saves from when a garden had three plots don't, and start
 * again with every plot ripe.
 */
function keepsPlots(plots: Plot[]) {
  return plots.every((plot, i) => plots[gardenOf(i) * PLOTS_PER_GARDEN].plant === plot.plant);
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
  for (const id of BELTS) for (const item of state.belts[id].items) item.at *= COLUMNS_BELT_MS[id] / U_BELT_MS[id];
}

/**
 * Routes got shorter again when the shop moved into the middle, so goods saved on one keep the same
 * share of the way along it.
 */
function ontoHeart(state: GameState) {
  for (const id of BELTS) for (const item of state.belts[id].items) item.at *= BELT_MS[id] / COLUMNS_BELT_MS[id];
}

/** Saves the game, stamped with the wall-clock time, so the next load can catch up on the time away. */
export function saveState(state: GameState) {
  state.lastSeen = Date.now();
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
