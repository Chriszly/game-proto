// Bearclaw Saga's sound effects, synthesized by shared/audio.ts. GameScene plays them for Bjarn's
// own actions and what happens on screen.

import { sounds } from '../../../../shared/audio';

export const sfx = sounds({
  /** Bjarn's strike as a human: an axe swish. */
  swing: { wave: 'noise', freq: 2600, to: 6500, length: 0.09, volume: 0.16, gap: 90, vary: 0.08 },
  /** The hybrid's and the bear's swipe: lower and heavier. */
  swipe: { wave: 'noise', freq: 900, to: 2400, length: 0.16, volume: 0.24, gap: 120, vary: 0.08 },
  /** A strike lands on a foe. */
  hit: { wave: 'square', freq: 320, to: 110, length: 0.08, volume: 0.28, gap: 50, vary: 0.1 },
  /** A foe beaten. */
  down: { wave: 'noise', freq: 900, to: 140, length: 0.3, volume: 0.32, gap: 80, vary: 0.1 },
  /** A blocked hit. */
  block: { wave: 'square', freq: 700, to: 500, length: 0.06, volume: 0.24, gap: 60 },
  /** A parry: a bright ring. */
  parry: { wave: 'triangle', freq: 1320, arp: [0, 7, 12], arpStep: 0.04, length: 0.3, volume: 0.32, gap: 120 },
  /** The dodge roll. */
  dodge: { wave: 'noise', freq: 500, to: 1500, length: 0.18, attack: 0.04, volume: 0.18, gap: 150 },
  /** Bjarn hurt. */
  hurt: { wave: 'square', freq: 820, to: 240, length: 0.16, volume: 0.3, gap: 150 },
  /** A foe winds up for a strike that can't be blocked. */
  warn: { wave: 'pulse12', freq: 1600, arp: [0, 0], arpStep: 0.07, length: 0.16, volume: 0.16, gap: 200 },
  /** The beast breaks out, or Bjarn changes form at will. */
  roar: { wave: 'sawtooth', freq: 140, to: 70, length: 0.7, attack: 0.05, volume: 0.36, gap: 400 },
  /** Back to human. */
  calm: { wave: 'sine', freq: 330, to: 220, length: 0.5, attack: 0.1, volume: 0.24, gap: 400 },
  /** Herbs picked up. */
  herb: { wave: 'triangle', freq: 990, arp: [0, 5, 9], arpStep: 0.05, length: 0.22, volume: 0.26, gap: 80 },
  /** A track looked at. */
  clue: { wave: 'pulse25', freq: 660, arp: [0, 3], arpStep: 0.08, length: 0.2, volume: 0.18, gap: 200 },
  /** A line of talk; its pitch is the speaker's. */
  blip: { wave: 'pulse25', freq: 560, arp: [0, 4, 2], arpStep: 0.035, length: 0.11, volume: 0.14, gap: 60 },
  /** Ulfgar turns into the giant wolf: a howl. */
  howl: { wave: 'sine', freq: 420, to: 760, length: 1.1, attack: 0.25, volume: 0.3, gap: 600 },
  /** Skarn's killing blow. */
  slash: { wave: 'noise', freq: 4000, to: 600, length: 0.35, volume: 0.36, gap: 200 },
});

export type SoundName = Parameters<typeof sfx>[0];
