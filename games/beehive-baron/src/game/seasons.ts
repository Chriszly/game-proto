// The seasons: the year turns through spring, summer, autumn and winter, each `SEASON_MS` long.
// Summer gives more nectar, autumn shuts the Lavender Field, and in winter the bees stay home and
// eat honey, so a hive that sold everything loses bees. A new hive starts in early spring.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

/** How long each season lasts, in game time; a year is four of them. */
export const SEASON_MS = 120_000;
export const YEAR_MS = SEASON_MS * SEASONS.length;
/** Each forager brings this much more nectar a trip in summer. */
export const SUMMER_NECTAR = 1;
/** In winter the bees eat this often, a jar of honey per `BEES_PER_MEAL` bees (at least one); with no jar they eat a capped cell, and with none of those a bee starves. */
export const WINTER_EAT_MS = 20_000;
export const BEES_PER_MEAL = 4;
/** The kind the bees eat first: the cheapest jars go first. */
export const EAT_ORDER = ['clover', 'lavender', 'heather'] as const;
