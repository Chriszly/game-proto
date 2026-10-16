// The siege and the heats: beating the third boss (wave 30) lifts the siege and wins the run, which
// unlocks the next heat. Each heat adds a rule to every lower one's, so Heat 3 has all three.

/** Clearing this wave lifts the siege. */
export const WIN_WAVE = 30;
export const MAX_HEAT = 3;

/** The rule each heat adds, Heat 1 first. */
export const HEAT_RULES = [
  'Foes come on 30% faster',
  'Bosses have one more health bar',
  'The barricade mends half as much, after a wave and from Mend the Barricade',
];

/** What a heat changes; Heat 0 changes nothing. */
export function heatRules(heat: number) {
  return {
    /** Multiplies the time between two foes coming on. */
    spawnGap: heat >= 1 ? 0.7 : 1,
    /** Health bars added to every boss. */
    bossBars: heat >= 2 ? 1 : 0,
    /** Multiplies every mending of the barricade. */
    mending: heat >= 3 ? 0.5 : 1,
  };
}
