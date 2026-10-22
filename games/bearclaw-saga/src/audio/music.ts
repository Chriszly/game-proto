// Bearclaw Saga's music: one chiptune song in D minor with a calm, a dark, a battle and a boss
// part, and the stings, as note text for shared/audio.ts. Switching parts waits for the next bar.

import type { Song } from '../../../../shared/audio';

/** Holds a note for a whole number of steps. */
const hold = (note: string, steps: number) => [note, ...Array(steps - 1).fill('.')].join(' ');

export const SAGA: Song = {
  bpm: 92,
  waves: { lead: 'triangle' },
  parts: {
    // The hunt, waking, the trail: a slow open melody over drones, no drums.
    calm: {
      lead: [hold('d4', 8), hold('f4', 4), hold('e4', 4), hold('a4', 8), hold('g4', 4), hold('f4', 4), hold('e4', 8), hold('d4', 4), hold('c4', 4), hold('d4', 16)].join(' '),
      bass: [hold('d2', 16), hold('bb1', 16), hold('c2', 16), hold('d2', 16)].join(' '),
    },
    // The raid and the forest while no foe is about: a low pulse.
    dark: {
      lead: [hold('-', 8), 'a3 . . . c4 . a3 .', hold('g3', 8), 'f3 . e3 . d3 . . .'].join(' '),
      bass: 'd2 . d2 . - - d2 . d2 . - - c2 . c2 .',
      drums: 'k - - - - - - - k - - - - - h -',
    },
    // Foes about.
    battle: {
      lead: 'd4 . f4 . a4 . d5 . c5 . a4 . g4 . f4 . e4 . f4 . g4 . a4 . . . d4 . . . f4 . e4 . d4 . c4 .',
      harmony: 'a3 - a3 - a3 - a3 - g3 - g3 - g3 - g3 -',
      bass: 'd2 d2 d3 d2 d2 d2 d3 d2 c2 c2 c3 c2 bb1 bb1 bb2 bb1',
      drums: 'k - h - s - h - k k h - s - h h',
    },
    // Ulfgar.
    boss: {
      lead: 'd5 . . c5 a4 . f4 . g4 . a4 . bb4 . a4 . d5 . . e5 f5 . e5 . d5 . c5 . a4 . . .',
      harmony: 'f4 - f4 - e4 - e4 - g4 - g4 - f4 - f4 -',
      bass: 'd2 d3 d2 d3 d2 d3 d2 d3 bb1 bb2 bb1 bb2 c2 c3 c2 c3',
      drums: 'k h s h k k s h k h s h k k s s',
    },
    // Stings: the beast breaking out, a fall, a boss beaten, the end of the version.
    burst: { lead: 'd3 . f3 . a3 . d4 . . . . .', bass: 'd1 . . . . . . . . . . .', drums: 'k - - - s - - - k k s -' },
    fall: { lead: 'a4 . . . f4 . . . d4 . . . . . . .', bass: 'd2 . . . bb1 . . . a1 . . . . . . .' },
    victory: { lead: 'd4 . f4 . a4 . d5 . . . . . a4 . d5 . . . . . . .', bass: 'd2 . . . . . . . a2 . . . d3 . . . . . . . . .', drums: 'k - - - s - - - k - - - s - s - - - - - - -' },
  },
};
