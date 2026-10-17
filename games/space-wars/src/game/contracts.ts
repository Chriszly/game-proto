// The contract board: five contracts in a row give each battle its goals. The first (raise the
// Barracks) is fixed; each later one is picked from two the board offers out of a larger pool. Each
// pays crystal and a rank perk for the player's faction when it is done, then the board offers the
// next two. No Phaser.

import type { Faction } from './factions';
import { t } from '../i18n';

/** What the player's faction is improved by, as multipliers; 1 everywhere at the start. */
export interface Perks {
  /** On ship training time. */
  train: number;
  /** On turret range. */
  turretRange: number;
  /** On ship speed. */
  speed: number;
  /** On ship hit points. */
  hp: number;
  /** On ship damage. */
  damage: number;
  /** On what a harvester carries a trip. */
  carry: number;
  /** On how fast ships repair beside a hub or Depot. */
  repair: number;
  /** On how far ships see. */
  sight: number;
  /** On turret damage. */
  turretDamage: number;
  /** On what ships cost. */
  cost: number;
}

export const NO_PERKS: Perks = { train: 1, turretRange: 1, speed: 1, hp: 1, damage: 1, carry: 1, repair: 1, sight: 1, turretDamage: 1, cost: 1 };

/**
 * What a contract counts, and its id: `barracks` (a finished Barracks), `kills` (enemy ships the
 * player destroys), `hold` (seconds the player holds the relay beacon), `razes` (enemy buildings
 * destroyed), `hubs` (rival hubs destroyed), `convoy` (harvesters of a convoy that reach a far
 * field), `derelicts` (derelict stations held at once), `nebula` (seconds a player warship holds a
 * nebula no enemy warship is in), `lattice` (Mine Lattices destroyed), `survive` (seconds the hub
 * stands through a raid by every rival).
 */
export type Goal = 'barracks' | 'kills' | 'hold' | 'razes' | 'hubs' | 'convoy' | 'derelicts' | 'nebula' | 'lattice' | 'survive';

export interface Contract {
  goal: Goal;
  target: number;
  reward: number;
  /** The lowest step of the chain (0 is the first contract) the board offers it at. */
  from: number;
  /** The short title, shown on the top bar and on the board's card. */
  title: (def: Faction) => string;
  /** The goal in a sentence, shown on the command bar. */
  brief: (def: Faction) => string;
  /** What to do, shown on the board's card under the title. */
  task: () => string;
  /** The perk, as the bar shows it after the rank. */
  perk: (def: Faction) => string;
  apply: (p: Perks) => void;
}

/** The ranks the five contracts give, in order. */
export const RANKS = ['I', 'II', 'III', 'IV', 'V'] as const;
/** How many contracts a battle's chain has. */
export const CONTRACT_STEPS = RANKS.length;
/** How long the board waits for a pick before it takes the first card, in ms. */
export const BOARD_MS = 15000;
/** The contract whose completion unlocks the flagship: the third. */
export const FLAGSHIP_STEP = 3;

/** The first contract, the same every battle: it is part of the first round. */
export const FIRST_CONTRACT: Contract = {
  goal: 'barracks', target: 1, reward: 60, from: 0,
  title: (d) => t('barracksTitle', { barracks: t(d.buildings.barracks.name) }),
  brief: (d) => t('barracksBrief', { barracks: t(d.buildings.barracks.name) }),
  task: () => t('barracksTask'),
  perk: () => t('barracksPerk'),
  apply: (p) => { p.train *= 0.8; },
};

/** The board's pool: it offers two of these for each contract after the first. */
export const CONTRACT_POOL: readonly Contract[] = [
  {
    goal: 'kills', target: 7, reward: 120, from: 1,
    title: () => t('killsTitle'),
    brief: () => t('killsBrief'),
    task: () => t('killsTask'),
    perk: (d) => t('killsPerk', { turret: t(d.buildings.turret.name) }),
    apply: (p) => { p.turretRange *= 1.2; },
  },
  {
    goal: 'convoy', target: 2, reward: 150, from: 1,
    title: () => t('convoyTitle'),
    brief: () => t('convoyBrief'),
    task: () => t('convoyTask'),
    perk: () => t('convoyPerk'),
    apply: (p) => { p.carry *= 1.3; },
  },
  {
    goal: 'derelicts', target: 2, reward: 160, from: 1,
    title: () => t('derelictsTitle'),
    brief: () => t('derelictsBrief'),
    task: () => t('derelictsTask'),
    perk: () => t('derelictsPerk'),
    apply: (p) => { p.repair *= 2; },
  },
  {
    goal: 'hold', target: 60, reward: 150, from: 1,
    title: () => t('holdTitle'),
    brief: () => t('holdBrief'),
    task: () => t('holdTask'),
    perk: () => t('holdPerk'),
    apply: (p) => { p.speed *= 1.1; },
  },
  {
    goal: 'nebula', target: 45, reward: 140, from: 1,
    title: () => t('nebulaTitle'),
    brief: () => t('nebulaBrief'),
    task: () => t('nebulaTask'),
    perk: () => t('nebulaPerk'),
    apply: (p) => { p.sight *= 1.2; },
  },
  {
    goal: 'lattice', target: 1, reward: 180, from: 2,
    title: () => t('latticeTitle'),
    brief: () => t('latticeBrief'),
    task: () => t('latticeTask'),
    perk: (d) => t('latticePerk', { turret: t(d.buildings.turret.name) }),
    apply: (p) => { p.turretDamage *= 1.25; },
  },
  {
    goal: 'razes', target: 3, reward: 200, from: 2,
    title: () => t('razesTitle'),
    brief: () => t('razesBrief'),
    task: () => t('razesTask'),
    perk: () => t('razesPerk'),
    apply: (p) => { p.hp *= 1.15; },
  },
  {
    goal: 'survive', target: 90, reward: 220, from: 2,
    title: () => t('surviveTitle'),
    brief: () => t('surviveBrief'),
    task: () => t('surviveTask'),
    perk: () => t('survivePerk'),
    apply: (p) => { p.cost *= 0.9; },
  },
  {
    goal: 'hubs', target: 1, reward: 300, from: 3,
    title: () => t('hubsTitle'),
    brief: () => t('hubsBrief'),
    task: () => t('hubsTask'),
    perk: () => t('hubsPerk'),
    apply: (p) => { p.damage *= 1.1; },
  },
];

/** Every contract by its goal, the first included. */
export function contractOf(goal: Goal): Contract {
  return goal === 'barracks' ? FIRST_CONTRACT : CONTRACT_POOL.find((c) => c.goal === goal)!;
}

/**
 * The two contracts the board offers for `step` (1 to 4), drawn with `rand`: from the pool, those
 * open at that step, not taken before and `open` in this battle. The second contract's board
 * always offers Break the raid first, beside one other, since the first round's fight counts for it.
 */
export function boardOffer(step: number, taken: readonly Goal[], open: (g: Goal) => boolean, rand: () => number): Goal[] {
  const pool = CONTRACT_POOL.filter((c) => c.from <= step && !taken.includes(c.goal) && open(c.goal)).map((c) => c.goal);
  const offer: Goal[] = [];
  if (step === 1 && pool.includes('kills')) offer.push('kills');
  while (offer.length < 2) {
    const left = pool.filter((g) => !offer.includes(g));
    if (!left.length) break;
    offer.push(left[Math.floor(rand() * left.length)]);
  }
  return offer;
}
