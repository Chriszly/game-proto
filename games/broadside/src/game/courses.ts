// Charted courses: from wave 6 the harbor offers two ways to sail into the next wave, and the
// one chosen changes what comes over the horizon.

import { HAVEN_WAVE } from './waves';

export type CourseId = 'merchant' | 'hunter';

export interface Course {
  name: string;
  /** What the course brings, short enough for the harbor's sail button. */
  desc: string;
}

export const COURSES: Record<CourseId, Course> = {
  merchant: { name: 'Merchant lane', desc: 'Merchantmen that flee, double loot' },
  hunter: { name: 'Hunter patrol', desc: 'Extra brigs, an extra prize card' },
};

export const COURSE_IDS = Object.keys(COURSES) as CourseId[];

/** The first wave a course is chosen for, at the harbor after the wave before. */
export const FIRST_COURSE_WAVE = 6;

/** Whether the harbor offers a choice of course for `wave`: from `FIRST_COURSE_WAVE`, except the haven's. */
export const coursesFor = (wave: number) => wave >= FIRST_COURSE_WAVE && wave !== HAVEN_WAVE;

/** Merchantmen on the Merchant lane, and the loot every ship sunk or sold pays there. */
export const MERCHANTS = 3;
export const MERCHANT_LOOT = 2;
/** How long a merchantman runs before she gets clean away, with no loot. */
export const ESCAPE_MS = 30_000;
/** The brigs a Hunter patrol adds, and the cards its prize draft has on top of `DRAFT_SIZE`. */
export const HUNTER_BRIGS = 2;
export const HUNTER_CARDS = 1;
