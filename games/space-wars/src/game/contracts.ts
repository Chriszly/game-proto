// The contract chain: five contracts in a row give each battle its goals. Each one pays crystal
// and a rank perk for the player's faction when it is done, then the next one starts. No Phaser.

import type { Faction } from './factions';

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
}

export const NO_PERKS: Perks = { train: 1, turretRange: 1, speed: 1, hp: 1, damage: 1 };

/**
 * What a contract counts: `barracks` (a finished Barracks), `kills` (enemy ships the player
 * destroys), `hold` (seconds the player holds the relay beacon), `razes` (enemy buildings
 * destroyed), `hubs` (rival hubs destroyed).
 */
export type Goal = 'barracks' | 'kills' | 'hold' | 'razes' | 'hubs';

export interface Contract {
  goal: Goal;
  target: number;
  reward: number;
  rank: string;
  /** The short title, shown on the top bar and as the next contract. */
  title: (def: Faction) => string;
  /** The goal in a sentence, shown on the command bar. */
  brief: (def: Faction) => string;
  /** The perk, as the bar shows it. */
  perk: (def: Faction) => string;
  apply: (p: Perks) => void;
}

export const CONTRACTS: readonly Contract[] = [
  {
    goal: 'barracks', target: 1, reward: 60, rank: 'I',
    title: (d) => `Raise the ${d.buildings.barracks.name}`,
    brief: (d) => `Raise the ${d.buildings.barracks.name}: finish your Barracks`,
    perk: () => 'Rank I: ships train 20% faster',
    apply: (p) => { p.train *= 0.8; },
  },
  {
    goal: 'kills', target: 7, reward: 120, rank: 'II',
    title: () => 'Break the raid',
    brief: () => 'Break the raid: destroy 7 enemy ships',
    perk: (d) => `Rank II: ${d.buildings.turret.name} range +20%`,
    apply: (p) => { p.turretRange *= 1.2; },
  },
  {
    goal: 'hold', target: 60, reward: 150, rank: 'III',
    title: () => 'Hold the Relay 60 s',
    brief: () => 'Hold the Relay: keep a ship on the relay beacon for 60 s',
    perk: () => 'Rank III: ships 10% faster',
    apply: (p) => { p.speed *= 1.1; },
  },
  {
    goal: 'razes', target: 3, reward: 200, rank: 'IV',
    title: () => 'Raze an outpost',
    brief: () => 'Raze an outpost: destroy 3 enemy buildings',
    perk: () => 'Rank IV: ship hulls +15%',
    apply: (p) => { p.hp *= 1.15; },
  },
  {
    goal: 'hubs', target: 1, reward: 300, rank: 'V',
    title: () => 'Topple a hub',
    brief: () => 'Topple a hub: destroy a rival hub',
    perk: () => 'Rank V: ship damage +10%',
    apply: (p) => { p.damage *= 1.1; },
  },
];
