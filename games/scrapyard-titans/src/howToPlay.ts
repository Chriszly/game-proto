import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Build a squad of junk robots and outlast seven rival commanders. Every lost fight costs your commander health; the last one standing wins.',
  controls: [
    { input: 'Click or tap a shop card', action: 'Buy that robot onto your bench' },
    { input: 'Drag a robot, or tap it and then a tile', action: 'Place it on your half of the board, or swap two robots' },
    { input: 'Drag a part onto a robot, or tap the part and then the robot', action: 'Bolt it on; two parts on one robot build a finished item' },
    { input: 'Drag a robot onto the shop, or E', action: 'Sell the robot (the selected one with E)' },
    { input: 'R, or Reroll', action: 'New robots in the shop for 2 gold' },
    { input: 'X, or Buy XP', action: '4 XP for 4 gold; each level lets one more robot fight' },
    { input: 'Space, or FIGHT!', action: 'Start the fight; during a fight, use your commander’s skill' },
    { input: 'T, or Speed', action: 'Watch fights at 1x or 2x' },
    { input: '1, 2 or 3', action: 'Pick a power card when one is offered' },
  ],
  loop: [
    'Pick a commander, a season, and whether the board has terrain tiles.',
    'Buy robots from the shop with your gold.',
    'Place them on your half of the board: tanks in front, shooters behind.',
    'Press FIGHT! and watch them battle on their own.',
    'Earn gold and XP each round, merge three copies into a stronger robot, and repeat.',
  ],
  tips: [
    'Robots that share an origin or class unlock trait bonuses at 2, 4 and 6; tap a trait for details.',
    'Three copies of a robot merge into a 2-star; three 2-stars make a 3-star.',
    'Saving gold pays interest: 1 gold for every 10 you hold, up to 5 a round.',
    'Monster rounds drop parts; your commander walks over to pick them up.',
    'In draft rounds the weakest commanders pick first from the ring.',
    'Gilded robots in the shop count for two origins but never merge.',
    'On the Scrap Rat round, tap the rat to zap gold out of it before it escapes.',
  ],
};
