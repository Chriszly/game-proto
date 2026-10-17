import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Survive five minutes of Scrap droids on the Dune world, then destroy the Grinder Crawler to win. The run ends when your health runs out.',
  controls: [
    { input: 'WASD / arrow keys, or hold the mouse on the field', action: 'Walk (toward where you hold)' },
    { input: 'Touch: put a finger down anywhere and drag', action: 'A steering stick appears under it; walk the way you drag' },
    { input: 'Nothing', action: 'Your weapon fires on its own' },
    { input: 'Space, or the round button bottom right', action: 'Signature move, when charged' },
    { input: 'Tap a card, or 1 / 2 / 3', action: 'Choose a hero, or an upgrade at a level-up' },
  ],
  loop: [
    'Pick one of three soldiers: Captain Rook, Legionary TR-9 or Corporal Bram-17.',
    'Keep moving: droids walk at you from every side, and your weapon shoots them down.',
    'Walk over the green lumen shards they drop to fill the XP bar.',
    'Each level-up pauses the run on three cards: a path of your own, a Blaster pool skill or a piece of gear.',
    'At 5:00 the Grinder Crawler rolls in. Destroy it to win the run.',
  ],
  tips: [
    'Rollerbombs stop and glow before they rush you in a straight line: step aside.',
    'Elite droids, ringed in gold, drop a chest with a free upgrade.',
    'You hold at most 5 abilities and 4 pieces of gear, so choose what to build.',
    'A path at tier 5 plus its matching gear unlocks a capstone; some pool skills combine with a path for a crossover bonus.',
    'Bram fires the way he walks: circle the swarm to cut through it, or stand still to aim at the nearest droid.',
  ],
};
