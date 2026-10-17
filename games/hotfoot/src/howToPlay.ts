import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Your knight never stops running: jump and slide past traps and foes to get as far as you can. The run ends with the last heart.',
  controls: [
    {
      input: 'Tap the top half, or Space / Up / W',
      action: 'Jump (again in the air with Second Leap)',
    },
    {
      input: 'Tap the bottom half, or Down / S',
      action: 'Slide; in the air, drop fast and slide on landing',
    },
    { input: 'Tap a boon card', action: 'Take that boon at a checkpoint' },
    {
      input: 'Tap a road card',
      action: 'Choose the High Road or the Low Road for the next stage',
    },
    {
      input: 'Run again or Daily course',
      action: "After a fall, start a new run or the day's own course",
    },
    {
      input: 'Armoury',
      action: 'After a fall, spend banked coins on lasting upgrades',
    },
  ],
  loop: [
    'Jump the spikes, pits and goblins, and slide under the hanging spiked logs.',
    'Pick up coins along the way, and take them in a row to build a streak.',
    'Reach the checkpoint banner every 100 m and choose one of the boons on offer.',
    'Each stage after runs a little faster, on new ground with its own rule.',
    'When you fall, your coins are banked for the armoury and the next run.',
  ],
  tips: [
    'Every hit costs a heart and resets your coin streak; you blink and stay safe for a moment after.',
    'Landing on a goblin or bat from above knocks it out for a coin and bounces you back up.',
    'Fire vents only burn part of the time: jump them, or run over while they are out.',
    'From stage 2, slide into a wayside shrine to trade 15 coins for a heart.',
    "Meet the herald's dare on a stage for 20 coins and a third boon card.",
    'Every fifth stage a Gatekeeper bars the road: dodge its barrels and axes, then stomp its helm three times.',
    'Some boons cost you something, and two boons held together can unlock a hidden bonus.',
  ],
};
