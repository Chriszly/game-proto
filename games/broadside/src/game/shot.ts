// The kinds of shot the guns can be loaded with. Each side is loaded at the harbor; a captain's
// order for chain shot or grapeshot loads both sides with it for the wave.

export type ShotKind = 'round' | 'chain' | 'grape';

export interface Shot {
  name: string;
  desc: string;
  /** Chain shot: a hit slows the ship struck to this share of its speed for `SLOW_MS`. */
  slow?: number;
  /** Grapeshot: each gun fires this many smaller shots in a fan, each hitting for `pellet` of a ball. */
  pellets?: number;
  pellet?: number;
  /** A multiplier on how far the shot reaches. */
  range?: number;
  /** Grapeshot: a hit cuts up the gun crews, so the ship struck reloads at this share of its pace for `JAM_MS`. */
  jam?: number;
}

export const SHOTS: Record<ShotKind, Shot> = {
  round: { name: 'Round shot', desc: 'Full range and weight' },
  chain: { name: 'Chain shot', desc: 'Hits slow ships by 40%', slow: 0.6 },
  grape: { name: 'Grapeshot', desc: 'Short-range fan; hits slow their reload', pellets: 3, pellet: 0.5, range: 0.7, jam: 0.5 },
};

export const SHOT_IDS = Object.keys(SHOTS) as ShotKind[];

/** How long a chain shot hit slows a ship. */
export const SLOW_MS = 4000;
/** How long a grapeshot hit slows a ship's reload. */
export const JAM_MS = 4000;
/** The angle between two pellets of a grapeshot fan, in radians. */
export const PELLET_FAN = 0.09;

/** The next kind of shot after `kind`, for the harbor's loading buttons, which cycle through them. */
export const nextShot = (kind: ShotKind) => SHOT_IDS[(SHOT_IDS.indexOf(kind) + 1) % SHOT_IDS.length];
