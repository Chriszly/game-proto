// Research at the hub: three tracks (hull, weapons, engines) bought with crystal, one at a time,
// each improving every ship of the faction by a step per level. No Phaser.

export type Track = 'hull' | 'weapons' | 'engines';

export const TRACKS: readonly Track[] = ['hull', 'weapons', 'engines'];

export interface TrackDef {
  name: string;
  /** What one level adds, for the tooltip. */
  effect: string;
}

export const TRACK_DEFS: Record<Track, TrackDef> = {
  hull: { name: 'Hull', effect: 'hit points' },
  weapons: { name: 'Weapons', effect: 'damage' },
  engines: { name: 'Engines', effect: 'speed' },
};

/** How many levels each track has, and what each level adds as a share (0.1 is +10%). */
export const RESEARCH_LEVELS = 3;
export const RESEARCH_STEP = 0.1;
/** Crystal for each level, before the faction's cost multiplier. */
export const RESEARCH_COSTS = [100, 160, 240] as const;
/** Game time one level takes at the hub, in ms. */
export const RESEARCH_MS = 20000;

/** A faction's research: the level of each track, and the one under way. */
export interface Research {
  levels: Record<Track, number>;
  /** The track being researched and the time it has left, or null. */
  current: { track: Track; left: number } | null;
}

export function noResearch(): Research {
  return { levels: { hull: 0, weapons: 0, engines: 0 }, current: null };
}

/** The multiplier a track's level gives (1 at level 0). */
export function researchBonus(r: Research, track: Track) {
  return 1 + RESEARCH_STEP * r.levels[track];
}
