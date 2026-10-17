import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Fill each potion order by matching its ingredients before the moves run out. A filled order sells for coins and stars.',
  controls: [
    { input: 'Tap a tile, then a neighbour, or drag a tile onto it', action: 'Swap the two tiles' },
    { input: 'Tap the picked tile again', action: 'Let it go' },
    { input: 'Tap Stir', action: 'Spend 40 coins on 3 more moves for this order' },
    { input: 'Tap Sift, then a tile', action: "Spend 25 coins to reroll that tile's row" },
    { input: 'Tap Pestle, then a tile', action: 'Spend 30 coins to smash that tile, without a move' },
    { input: 'Tap Funnel, then two tiles', action: 'Spend 35 coins to swap any two tiles, without a move' },
    {
      input: 'Tap Next order, Try again or Workbench',
      action: 'After an order: go on, retry it, or buy lasting upgrades',
    },
  ],
  loop: [
    'Read the order label: the ingredients the potion needs, the moves you have and what it pays.',
    'Swap two neighbouring tiles to line up three or more of a kind.',
    'Matched ingredients the order needs fly to the label, and the tiles above fall into the gaps.',
    'Gather everything on the label before the moves run out and the potion sells.',
    'Spend your coins at the Workbench, then start the next order.',
  ],
  tips: [
    'A swap that makes no match slides back and costs no move, and cascades after a swap are free.',
    'A match of four leaves a Catalyst that clears its whole row when matched.',
    'An L or T shape leaves a Bloom that clears the 3x3 around it when matched.',
    'Each move left pays 5 more coins, and 8 or more left earns three stars.',
    'Stars raise your Tinker rank, and each rank unlocks a new recipe.',
    'Corked jars, resin and creeping mould block the board; match right next to them to free the tiles.',
    'Every fifth order is a royal commission: three potions in a row on one board.',
  ],
};
