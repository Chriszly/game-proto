import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal:
    'Lay track and fly the wyrm to carry goods between villages before orders run out. ' +
    'A late order costs a heart, and losing all three ends the game.',
  controls: [
    { input: 'Click, tap or drag over tiles next to the line', action: 'Lay track there' },
    { input: 'Click or tap an order', action: 'Send the wyrm to fetch and deliver it' },
    { input: 'Click or tap a junction', action: 'Throw its switch to steer the wyrm' },
    { input: 'Click or tap a village', action: 'Send a free wyrm with gifts (5 coins) to cheer it (from round 2)' },
    { input: 'Remove', action: 'Toggle: tap track to take it up for half what it cost' },
    { input: 'Plain', action: 'Toggle: lay track that joins only the piece it continues' },
    { input: 'Upgrade buttons', action: 'Buy Swift wings, Golden hoard or a Second wyrm' },
    { input: 'Depot, then a village', action: 'Build a depot there: its goods wait at half speed and load at once' },
    { input: 'A charter card', action: 'Pick the rules for the round (from round 3)' },
  ],
  loop: [
    'Lay track from the Roost to Millbrook and Ashford.',
    'Tap the grain order to send the wyrm to Millbrook.',
    'The wyrm loads the grain and carries it to Ashford.',
    'The delivery pays coins and finishes the round.',
    'A new village joins each round, so stretch the line to reach it.',
  ],
  tips: [
    'Track costs 2 coins on grass, 4 in forest, 6 for a bridge and 20 for a tunnel through a mountain.',
    'The wyrm pulls two wagons, so it can carry two orders at once.',
    'A switch bars one arm of a junction, and the wyrm never goes through a barred arm.',
    'The wyrm gets hungry as it flies and goes home to the Roost to eat.',
    'Villages sulk if you ignore them, and a bitter village costs you a heart.',
    'From round 3, washouts and rockfalls can take a bridge or mountainside track; tunnels are safe.',
    'Round 9 is the festival at Kettlecross: ten deliveries win the game.',
    'The festival earns a medal for its time and hearts left; your best medal gives the next game a boon.',
  ],
};
