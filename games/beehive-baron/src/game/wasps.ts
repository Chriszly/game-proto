// Wasp raids: now and then a wasp flies in to a capped cell and steals its honey unless it is
// tapped away first, or the Guard Bees drive it off as it lands.

/** Wasps only raid a hive that has sold this many jars, so the first jars are safe. */
export const WASPS_FROM = 8;
/** Game time between raids: at least `WASP_GAP`, plus up to `WASP_GAP_SPREAD` more at random. */
export const WASP_GAP = 40_000;
export const WASP_GAP_SPREAD = 40_000;
/** How long a wasp takes to fly in, how long it sits on the cell before the honey is gone, and to fly off. */
export const WASP_IN_MS = 2500;
export const WASP_STEAL_MS = 5000;
export const WASP_OUT_MS = 1800;

export interface Wasp {
  id: number;
  /** The capped cell it is after. */
  slot: number;
  /** Flying in, sitting on the cell stealing, or flying away. */
  phase: 'in' | 'steal' | 'out';
  /** Time spent in this phase so far. */
  ms: number;
  /** For a wasp flying away: how far along its way in it was when it turned (1 once it had landed). */
  turned: number;
}
