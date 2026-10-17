import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Place buildings on your island to score as many points as you can. The kingdom ends when the pouch is empty or nothing fits.',
  controls: [
    {
      input: 'Click or tap a tile button',
      action: 'Pick one of the three tiles drawn this turn',
    },
    {
      input: 'Hover a grass cell',
      action: 'Preview what the building would score there, and from which neighbours',
    },
    {
      input: 'Click or tap a grass cell',
      action: 'Place the building; the other two tiles go back to the pouch',
    },
    {
      input: 'Tap a house, then a house beside it',
      action: 'Merge the two into a manor',
    },
    {
      input: 'Tap a market',
      action: 'Trade two tiles of one kind for a gift building, once a round',
    },
    {
      input: 'Undo last tile',
      action: 'Take back the last placement or merge, once per round',
    },
    {
      input: 'Island button',
      action: 'Pick a campaign level, the island of the day, or type an island number',
    },
  ],
  loop: [
    'Each turn draws three tiles from the pouch, and you pick one.',
    'Place it on grass where its neighbours make it score the most.',
    'Work towards the royal decree, a side goal that pays +8 points and a crown.',
    'Reach the round goal (20 points in round 1) to refill the pouch.',
    'Choose one of the two royal gifts, such as more towers or a new building.',
  ],
  tips: [
    'Buildings only go on grass, but lakes and forests next to them add points.',
    'A placement also changes what the buildings beside it score, so the whole board counts.',
    'Farms like lakes, houses like farms, and a tower scores houses around it but hates another tower beside it.',
    'Buildings joined to the castle by a chain of buildings and roads pay +1 each when the kingdom is finished.',
    'Each season doubles the score of some buildings when you place them, like farms at the Harvest festival.',
    'From round 3 an omen warns of a flood or a storm next round, so you have a round to prepare.',
    'Out of room? Merging two houses into a manor frees a cell.',
  ],
};
