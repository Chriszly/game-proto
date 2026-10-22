// Bjarn's three forms and the foes, as plain numbers: no Phaser here. Speeds are in pixels a
// second, times in ms, damage in health points (Bjarn has MAX_HP).

import { byDifficulty } from '../../../../shared/settings';

export type Form = 'human' | 'hybrid' | 'bear';

export interface FormStats {
  /** Walking speed. */
  speed: number;
  /** Damage of one strike, and how far in front of Bjarn it reaches. */
  damage: number;
  reach: number;
  /** Share of every hit's damage the form shrugs off. */
  resist: number;
  /** How long a strike takes, and when in it (a share of that time) it lands. */
  attackMs: number;
  hitAt: number;
  /** Share of a blocked hit's damage that still gets through, or null: this form cannot block. */
  block: number | null;
  /** The dodge: how long it lasts and how fast it moves. Nothing hits Bjarn during it. */
  dodgeMs: number;
  dodgeSpeed: number;
  /** Share of a strike's damage that heals Bjarn (the bear's life steal). */
  lifesteal: number;
}

/** The forms, following the design: the human is nimble but weak, the hybrid balanced and fast, the bear slow and mighty. */
export const FORMS: Record<Form, FormStats> = {
  human: { speed: 220, damage: 10, reach: 72, resist: 0, attackMs: 280, hitAt: 0.45, block: 0.15, dodgeMs: 320, dodgeSpeed: 430, lifesteal: 0 },
  hybrid: { speed: 255, damage: 25, reach: 92, resist: 0.3, attackMs: 340, hitAt: 0.5, block: 0.35, dodgeMs: 300, dodgeSpeed: 470, lifesteal: 0 },
  bear: { speed: 165, damage: 40, reach: 118, resist: 0.5, attackMs: 540, hitAt: 0.6, block: null, dodgeMs: 200, dodgeSpeed: 300, lifesteal: 0.3 },
};

export const MAX_HP = 100;
export const MAX_STAMINA = 100;
/** Stamina regained a second, except while blocking. */
export const STAMINA_REGEN = 32;
export const ATTACK_COST = 12;
export const DODGE_COST = 22;
export const BLOCK_COST = 14;
/** At 0 stamina Bjarn is exhausted until it is back up to this: weaker, slower strikes and no dodge. */
export const EXHAUSTED_UNTIL = 40;
/** A block raised at most this long before a hit lands is a parry: no damage, no stamina, the foe is stunned. */
export const PARRY_MS = 200;
/** A changing of form takes this long; nothing hits Bjarn meanwhile, and a hit in its first part is countered. */
export const SHIFT_MS = 600;
export const SHIFT_COUNTER_MS = 250;

/** Rage gained per point of damage taken. Only hits fill it: not blocks, parries, dodges or Bjarn's own strikes. */
export const RAGE_PER_HP = 2.4;
/** On an outburst the meter starts here and drains, faster with no foe around; it rises again on hits. */
export const BURST_RAGE = 70;
export const BURST_DRAIN = 5;
export const BURST_DRAIN_CALM = 16;
/** In the raid, after the father's death, rage climbs on its own this much a second. */
export const GRIEF_RAGE = 12;

/** Herbs heal this much, or this much once Torvald has taught his recipes. */
export const HERB_HEAL = 22;
export const HERB_HEAL_RECIPES = 35;

export type FoeKind = 'boar' | 'cultist' | 'wolf' | 'ulfgar' | 'giantWolf' | 'torvald';

export interface FoeStats {
  hp: number;
  speed: number;
  damage: number;
  reach: number;
  /** The telegraph before a strike, the strike itself, and the pause after it. */
  windupMs: number;
  strikeMs: number;
  recoverMs: number;
  /** Chance that a strike can't be blocked (shown red): it has to be dodged. */
  unblockable: number;
  /** How far the foe leaps forward while striking. */
  lunge: number;
  /** A boss keeps striking through hits; others flinch out of their windup. */
  poise: boolean;
  /** Damage taken, by Bjarn's form (the giant wolf: the hybrid is the key). */
  vs?: Partial<Record<Form, number>>;
}

export const FOES: Record<FoeKind, FoeStats> = {
  boar: { hp: 30, speed: 150, damage: 8, reach: 54, windupMs: 520, strikeMs: 180, recoverMs: 700, unblockable: 0, lunge: 70, poise: false },
  cultist: { hp: 40, speed: 115, damage: 10, reach: 64, windupMs: 560, strikeMs: 160, recoverMs: 650, unblockable: 0, lunge: 0, poise: false },
  wolf: { hp: 28, speed: 210, damage: 7, reach: 54, windupMs: 400, strikeMs: 160, recoverMs: 550, unblockable: 0.15, lunge: 60, poise: false },
  ulfgar: { hp: 180, speed: 135, damage: 13, reach: 74, windupMs: 460, strikeMs: 160, recoverMs: 600, unblockable: 0.2, lunge: 20, poise: true },
  giantWolf: { hp: 320, speed: 270, damage: 15, reach: 88, windupMs: 420, strikeMs: 200, recoverMs: 650, unblockable: 0.4, lunge: 130, poise: true, vs: { human: 0.5, hybrid: 1.4, bear: 0.6 } },
  torvald: { hp: 999, speed: 90, damage: 0, reach: 70, windupMs: 700, strikeMs: 160, recoverMs: 900, unblockable: 0, lunge: 0, poise: true },
};

/** Damage foes deal, by the hub's difficulty: Normal is as designed. */
export const foeDamage = () => byDifficulty(0.75, 1, 1.3);
/** At most this many foes wind up or strike at once; the rest circle at a distance. */
export const MAX_ATTACKERS = 2;
