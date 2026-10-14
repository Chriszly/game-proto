import { tick } from './sim';
import { BELTS, STATIONS, type GameState } from './state';

// The autopilot: while the player is away, the craftsmen and belts keep the apothecary going. On
// load, the time since the last save is played through the same rules, without the doctor, so the
// automation earns what it would have earned.

/** The most time away that is caught up on. */
export const AWAY_CAP_MS = 2 * 60 * 60 * 1000;
/** Time away shorter than this, such as a reload, isn't worth a summary. */
export const AWAY_MIN_MS = 60 * 1000;
/** The step the time away is played in: long enough to be quick, short enough for the belts and craftsmen. */
const AWAY_STEP_MS = 500;

/** What the automation did while the player was away. */
export interface AwaySummary {
  /** Game time played, after the cap. */
  ms: number;
  /** Coins earned: in the purse, the till and from contracts. */
  coins: number;
  potions: number;
}

/** Whether anything works without the doctor: a craftsman hired anywhere, or a belt built. */
export const hasAutomation = (state: GameState) =>
  STATIONS.some((id) => state.craftsmen[id].level > 0) || BELTS.some((id) => state.belts[id].built);

/**
 * Plays the time since `state.lastSeen` up to `now` (wall-clock ms, capped at `AWAY_CAP_MS`) through
 * the rules with nobody on a work spot, and returns what it earned. Returns null, and plays nothing,
 * for a new game, a short absence, or an apothecary with no automation to run.
 */
export function catchUp(state: GameState, now: number, rand: () => number = Math.random): AwaySummary | null {
  const since = state.lastSeen;
  state.lastSeen = now;
  if (!since || now - since < AWAY_MIN_MS || !hasAutomation(state)) return null;
  const ms = Math.min(now - since, AWAY_CAP_MS);
  const coins = state.coins + state.counter.till;
  const sold = state.sold;
  for (let t = 0; t < ms; t += AWAY_STEP_MS) tick(state, Math.min(AWAY_STEP_MS, ms - t), null, () => true, rand);
  return { ms, coins: state.coins + state.counter.till - coins, potions: state.sold - sold };
}
