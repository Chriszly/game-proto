// Hired guards: two slots on the barricade where coins from kills hire a spearman, who stabs foes
// at the barricade, or a mage, who throws arcane bolts that burst. Each can be trained twice.
// Guards are hired for one run only.

export type GuardKind = 'spear' | 'mage';

export interface GuardType {
  name: string;
  text: string;
  /** Coins to hire one. */
  cost: number;
  /** Milliseconds between two attacks. */
  ms: number;
  damage: number;
}

export const GUARDS: Record<GuardKind, GuardType> = {
  spear: { name: 'Spearman', text: 'Stabs foes at the barricade, through shields', cost: 20, ms: 700, damage: 12 },
  mage: { name: 'Mage', text: 'Throws an arcane bolt every 1.8s that bursts', cost: 30, ms: 1_800, damage: 16 },
};

export const GUARD_KINDS = Object.keys(GUARDS) as GuardKind[];
export const MAX_GUARD_LEVEL = 3;

/** Coins to train a guard of this kind from `level` to the next. */
export const trainCost = (kind: GuardKind, level: number) => Math.round(GUARDS[kind].cost * (1 + 0.5 * level));

/** A guard's damage at its level: 60% more for each training. */
export const guardDamage = (kind: GuardKind, level: number) => GUARDS[kind].damage * (1 + 0.6 * (level - 1));

/** How far in front of the barricade's face a spearman reaches. */
export const SPEAR_REACH = 70;
/** The mage's bolt bursts over this radius. */
export const ARCANE_RADIUS = 45;
