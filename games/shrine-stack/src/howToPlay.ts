import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Stack swinging stones into a temple and finish tier 12 to crown the shrine. The run ends when a stone misses the temple.',
  controls: [
    {
      input: 'Click or tap a patron card',
      action: 'Start the temple under that patron',
    },
    { input: 'Click or tap anywhere', action: 'Drop the swinging stone' },
    {
      input: 'Swap button or R',
      action: 'From tier 2: hold the stone in reserve, or trade it with the held one',
    },
    {
      input: 'Click or tap a blessing card',
      action: 'Keep that blessing after a balanced tier',
    },
    { input: 'Reroll', action: 'Spend 5 favor for a new set of blessings' },
    {
      input: 'Shop buttons',
      action: "Between tiers: buy a Slow drop, a Wider stone or Mason's Grace with favor",
    },
    {
      input: 'Build on / Keep building',
      action: 'Go back to stacking after a break, or past the crown',
    },
  ],
  loop: [
    'Pick one of two patrons; their boon and bane last the whole run.',
    'Drop the stone while it hangs over the one below; any overhang breaks off.',
    'Three stones make a tier, and each tier swings a little faster.',
    'A balanced tier earns 5 favor and lets you pick a blessing.',
    'Spend favor in the shop if you like, then build the next tier.',
  ],
  tips: [
    'A drop within 5 pixels of the stone below is perfect: it keeps its full width and earns 2 extra favor.',
    'A tier is balanced when every stone in it kept at least three quarters of its width.',
    'Heavy stones swing slower but crack more off; light stones swing faster and earn 1 more favor.',
    'From tier 3 off-centre drops make the temple lean, and past 60 pixels the tier topples and starts over.',
    'From tier 3, three perfect drops in a row start growing the stone back.',
    'Ticking a curse before you choose a blessing doubles everything the next tier earns.',
    'Tier 10 is gilded for double favor, and after the crown you can keep building into a windy sky.',
  ],
};
