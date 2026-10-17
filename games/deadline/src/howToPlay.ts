import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Hold the road against the zombie horde for as many waves as you can, or win a 10-wave operation. The run ends when a zombie reaches your sandbags.',
  controls: [
    {
      input: 'Tap or drag anywhere, or A / D / arrow keys',
      action: 'Move the soldier left or right; shooting is automatic',
    },
    {
      input: 'Tap the kit panel, then a lane, or S',
      action: 'Put up a sandbag wall that holds a lane back for 6 seconds',
    },
    { input: 'Tap a card, or 1 / 2 / 3', action: 'Pick a supply after a boss, or the role of a survivor who joins' },
    { input: 'Tap the wide card, or 4', action: 'Extract and end the run as a win, from wave 20' },
    { input: 'COMIC / NV switch, or V', action: 'Switch between the comic and night-vision art styles' },
    {
      input: 'Tap a starting crate after game over',
      action: 'Buy it with scrap for the next run; tap again to refund',
    },
    { input: 'Tap an outpost upgrade after game over', action: 'Buy its next level with scrap, for every run to come' },
    { input: 'Tap an operation after game over', action: 'Pick the next run: the Open Road or a 10-wave operation' },
    { input: 'Tap anywhere else after game over', action: 'Start again from wave 1' },
  ],
  loop: [
    'Zombies walk down the road towards you while your squad fires straight up.',
    'Stand below a crate and shoot it open to collect its upgrade.',
    'Clear every zombie in the wave, and the next, bigger wave comes after a short pause.',
    'Every fifth wave ends with a boss; beat it and pick one of three supplies.',
  ],
  tips: [
    'Shoot a fuel drum when zombies bunch up around it to blow them all up.',
    'Kill quickly: a streak of 12 starts a frenzy that doubles your fire rate for 5 seconds.',
    'A third crate of one kind turns into a perk: fire rounds, headshots or ricochets.',
    'Spitters lob acid; step out of the ring, since standing in acid halves your fire rate.',
    'Your bullets hurt survivors too; let one reach the sandbags and they join your squad.',
    'Riot zombies only chip under plain bullets; use pierce, a fuel drum or a flame.',
    'A survivor who joins picks a role: Gunner, Grenadier (a grenade every fourth volley) or Marksman (a heavy shot at the toughest zombie).',
    'From wave 8 the horde answers your strongest stat: armoured brutes stop pierce, riot shields blunt fire rate, flank spitters test a wide squad.',
    'Every kill banks scrap, which buys starting crates for your next run and lasting outpost upgrades.',
  ],
};
