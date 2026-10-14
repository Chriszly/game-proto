import type { CardId } from './cards';
import type { EnemyKind, Intent } from './enemies';
import type { Room } from './map';

// Everything about a run, as plain data: the hero, the deck, where on the map they are, and the
// fight in progress. The playthrough test reads it through `window.game`.

export const MAX_HP = 50;
export const ENERGY = 3;
export const HAND_SIZE = 5;
/** Resting at a campfire heals this share of the hero's health. */
export const REST_HEAL = 0.3;
/** A campfire can only take a card out of a deck bigger than this. */
export const MIN_DECK = 5;
/** How many cards a reward offers. */
export const REWARD_CHOICES = 3;

/** Game time, in milliseconds, between one foe's action and the next on their turn. */
export const ENEMY_ACT_MS = 600;
/** The pause after the last foe falls, before the reward. */
export const CLEARED_MS = 900;
/** How long the hero takes to walk from one room to the next on the map. */
export const WALK_MS = 700;
/** How long a hit flash and a floating number last. */
export const HIT_MS = 300;
export const POP_MS = 900;

export type Phase =
  /** Choosing the next room on the map. */
  | 'map'
  /** Walking to the room picked. */
  | 'walk'
  /** The hero's turn in a fight: play cards, then end the turn. */
  | 'player'
  /** The foes act, one after another. */
  | 'enemy'
  /** The last foe fell; the reward comes up shortly. */
  | 'cleared'
  /** Picking a card to add to the deck, after a fight or in a treasure room. */
  | 'reward'
  /** At a campfire: rest to heal, or take a card out of the deck. */
  | 'rest'
  | 'over'
  | 'won';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  block: number;
  /** Added to the damage of each of its hits. */
  strength: number;
  /** How many times it has acted. */
  step: number;
  /** What it will do when it next acts, shown over its head. */
  intent: Intent;
  hitMs: number;
  /** Counts down while it lunges at the hero. */
  actMs: number;
}

export interface Fight {
  draw: CardId[];
  hand: CardId[];
  discard: CardId[];
  energy: number;
  block: number;
  turn: number;
  /** Left to right; the first is in front and takes single-target attacks. */
  enemies: Enemy[];
  /** How many foes have acted so far on their turn. */
  acted: number;
}

/** A number that floats up from the hero or a foe: damage, block or healing. */
export interface Pop {
  id: number;
  /** A foe's id, or 'hero'. */
  on: number | 'hero';
  text: string;
  kind: 'damage' | 'block' | 'heal';
  ms: number;
}

export interface GameState {
  phase: Phase;
  /** This run's map, drawn by makeMap. */
  rooms: Room[];
  hp: number;
  maxHp: number;
  /** Every card the hero owns; each fight shuffles a copy into the draw pile. */
  deck: CardId[];
  /** The room the hero is in, or null at the entrance. */
  at: number | null;
  /** Rooms done, in the order visited. */
  cleared: number[];
  walk: { from: number | null; to: number; ms: number } | null;
  fight: Fight | null;
  /** The cards offered, while picking a reward. */
  reward: CardId[] | null;
  /** Counts down the foes' turn and the pause after a fight. */
  timerMs: number;
  heroHitMs: number;
  /** How much the last rest healed. */
  healed: number;
  pops: Pop[];
  nextId: number;
}
