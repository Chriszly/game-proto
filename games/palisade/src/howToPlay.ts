import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Hold the barricade against waves of foes and lift the siege on wave 30 to win. The run ends if a foe reaches your ranger.',
  controls: [
    {
      input: 'Drag Arrow Rain onto the field, or R / Space',
      action: 'Loose a volley on the gold ring once it reads READY',
    },
    { input: 'Drag Caltrops onto the road, or C', action: 'Strew spikes that slow and hurt foes, once it reads READY' },
    { input: 'Aim toggle, or T', action: 'Choose who the ranger shoots first: Nearest, Strongest, Flyers or Healers' },
    {
      input: 'Tap a Hire slot on the barricade',
      action: 'Hire a spearman or a mage with coins, or train one you have',
    },
    { input: 'Fortify button, during a break', action: 'Buy a stake line, an oil pot or a lookout, one per break' },
    { input: 'Tap a card', action: 'Take that upgrade at a level-up, or that road after a boss' },
    { input: '1x / 2x button', action: 'Switch the battle between normal and double speed' },
    { input: 'Skill book button', action: 'See every upgrade and relic you have found' },
  ],
  loop: [
    'Foes march in from the right and hack at the barricade while your ranger shoots on their own.',
    'Each kill gives experience, coins and charge for Arrow Rain and Caltrops.',
    'A full experience bar pauses the battle on three upgrades to pick from.',
    'Between waves, spend coins on guards or a fortification, and the barricade mends a little.',
    'Wave 10 brings a boss; beat it to open a relic chest and pick your next road.',
  ],
  tips: [
    'Your hero keeps their level, upgrades and relics from run to run.',
    'Kills in quick succession build a streak that gives up to 50% more experience.',
    'Harpies fly over the barricade straight at your ranger, so shoot them first.',
    'Shield bearers shrug off arrows; Arrow Rain, caltrops and guards get through.',
    'Shamans heal the foes around them, so aim at Healers when they show up.',
    'A level-up picks a card at random after 10 seconds unless you untick Auto-pick.',
    'Lifting the siege unlocks a harder heat for your next run.',
  ],
};
