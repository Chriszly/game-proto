import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal:
    'Grow your hive, sell honey and win gold at the county honey fair to become the Beehive Baron. ' +
    'There is no way to lose.',
  controls: [
    { input: 'Click or tap an empty spot in the comb', action: 'Build a comb cell there (the first is free)' },
    { input: 'Send foragers', action: 'Send every bee at home out for nectar' },
    { input: 'Click or tap a capped cell', action: 'Harvest its honey into a jar, plus a piece of wax' },
    { input: 'Sell', action: 'Sell every jar on the shelf for coins' },
    { input: 'Shop buttons', action: 'Buy brood cells, mead casks and upgrades' },
    { input: 'Click or tap a honey on the market', action: 'Send the foragers to that meadow' },
    { input: 'Click or tap a wasp', action: 'Swat it away before it steals the honey' },
    { input: 'New hive (bottom right)', action: 'Start over from scratch, at once' },
  ],
  loop: [
    'Tap an empty spot in the comb to build your first cell.',
    'Tap Send foragers so the bees bring nectar back to the cell.',
    'A full cell ripens into honey and is capped with pale wax.',
    'Tap the capped cell to fill a jar of honey.',
    'Tap Sell to turn your jars into coins, then build more cells.',
  ],
  tips: [
    'Every edge two built cells share adds 1 coin to every jar you sell, so build them touching.',
    'Goals of jars sold unlock new meadows, each with its own honey and a lasting benefit.',
    'Bees are not bought: brood cells hatch them.',
    "Wax from each harvest pays part of a new cell's price.",
    'In winter the bees stay home and eat a jar for every 4 bees, so keep some jars or capped cells back.',
    'The Waggle Dance upgrade sends the bees out on their own.',
    'A meadow foraged for a minute without a break wilts and gives half the nectar until the season turns: switch kinds on the market now and then.',
    'Catching the swarm lets you pick the second hive\'s queen: Gentle (no wasps on her comb), Hardy (eats half in winter) or Busy (+1 nectar a trip).',
    'Once every meadow is open, the county fair is held at the end of every summer: a cell scores 1 point per touching capped cell of its kind, and 14 points win the first gold. Each year after needs more and adds a class.',
  ],
};
