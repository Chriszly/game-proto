// Swarming: a hive full of bees whose comb has no spot left gets ready to swarm. Let it go and
// half the bees leave; pay to catch the swarm and it settles in a second hive with its own comb,
// so the hive is no longer capped at 20 cells or 12 bees.

/** How long a crowded hive takes to swarm, and what catching the swarm into a second hive costs. */
export const SWARM_MS = 45_000;
export const CATCH_PRICE = 180;
/** How many hives a baron can keep. */
export const MAX_HIVES = 2;
