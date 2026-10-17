import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Fight across four worlds, the Dune, Swamp, Ice and Lava worlds. Survive five minutes on each, then beat its boss. Beat the Hollow Champion on the Lava world to win. The run ends when your health runs out.',
  controls: [
    { input: 'WASD / arrow keys, or hold the mouse on the field', action: 'Walk (toward where you hold)' },
    { input: 'Touch: put a finger down anywhere and drag', action: 'A steering stick appears under it; walk the way you drag' },
    { input: 'Nothing', action: 'Your weapon fires on its own' },
    { input: 'Space, or the round button bottom right', action: 'Signature move, when charged' },
    { input: 'Tap a card, or 1 / 2 / 3', action: 'Choose a hero, an upgrade, a star map node, an offer or an answer' },
    { input: '4 / Enter at the trader', action: 'Reroll the offers / leave' },
  ],
  loop: [
    'Pick one of three soldiers: Captain Rook, Legionary TR-9 or Corporal Bram-17.',
    'Keep moving: foes come at you from every side, and your weapon shoots them down.',
    'Walk over the green lumen shards they drop to fill the XP bar. Each level-up pauses the run on three cards.',
    'At 5:00 the planet\'s boss comes. Beat it, and your hero, level and kit carry on to the next world.',
    'Between worlds, choose a node on the star map: a trader, an elite fight, a rest or an event.',
  ],
  tips: [
    'Elites, ringed in gold, drop a chest with a free upgrade and credits to spend at a trader.',
    'An elite fight is a 60 s arena: beat every elite for a free tier of your choice and credits.',
    'Swamp toads spit slowing globs, Ice troopers fire in volleys, fallen knights block shots from the front: hit them while they dash.',
    'Glowing rings on the ground are warnings: step out before they blow. Lava vents erupt on the Lava world.',
    'You hold at most 5 abilities and 4 pieces of gear. A path at tier 5 plus its matching gear unlocks a capstone.',
  ],
};
