import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Survey uncharted islands with a sack of supplies, sell your charts at the port, and bind every isle into your atlas.',
  controls: [
    {
      input: 'Click or tap a magenta survey station',
      action: 'Survey that tile for its cost; the surveyor walks there',
    },
    {
      input: 'Camp',
      action: 'Pitch a base camp where the surveyor stands, for 3 supplies',
    },
    {
      input: 'Click or tap charted ground',
      action: 'Once you hold the riddle chart, dig there for 1 supply',
    },
    {
      input: 'Return to port',
      action: 'End the voyage early and draw the chart',
    },
    {
      input: 'Sell chart',
      action: "Sell the voyage's chart for coins at the port",
    },
    {
      input: 'Commission, hand or Buy',
      action: 'At the harbor: pick a commission, take a hand aboard or buy an upgrade',
    },
    { input: 'Set sail', action: 'Start the next voyage with full supplies' },
  ],
  loop: [
    'Tap survey stations next to charted land to push inland from the port.',
    'Climb hills and peaks to see the tiles around them for free.',
    'When the supplies run out, or you turn back, the surveyor draws a chart.',
    'Sell the chart at the port for the value of every tile on it.',
    'Spend the coins at the harbor, then set sail to chart more of the isle.',
  ],
  tips: [
    'Most tiles cost 1 supply, forests and peaks cost 2, and rivers and roads are free to follow.',
    "Sea tiles can be charted, but you can't survey on from them.",
    'Villages and ruins are worth the most, and the ruins hold a treasure riddle worth 60 coins.',
    'Each supply left when you return to port sells back for 3 coins.',
    'Charting a whole river, road or wood pays 2 extra coins for each of its tiles.',
    'Charting all of an isle binds it into your atlas, and the next voyage sails to a new isle.',
    'From the third isle a rival surveyor charts too, and tiles they reach first sell for half.',
  ],
};
