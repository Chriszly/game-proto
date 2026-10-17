import type { Song } from '../../../../shared/audio';

/** A note held for `steps` sixteenths: the note, then a `.` for each step after the first. */
const hold = (note: string, steps: number) => [note, ...Array<string>(steps - 1).fill('.')].join(' ');

/**
 * Palisade's march, in A minor at 120 BPM: a fife (thin pulse) lead over a marching triangle bass
 * and snare rolls. `calm` plays in the breaks, `battle` during a wave, `pad` (a held pad) while a
 * level-up's cards wait and under the game-over and victory panels; `win` (turning to A major) and
 * `lose` are stings. The 2x speed switch does not change the tempo.
 */
export const MARCH: Song = {
  bpm: 120,
  waves: { lead: 'pulse12' },
  mix: { lead: 0.15, harmony: 0.07 },
  parts: {
    calm: {
      lead: [
        'a4 . . . c5 . e5 . d5 . c5 . b4 . a4 .',
        'c5 . . . a4 . . . f4 . a4 . c5 . . .',
        'b4 . . . d5 . b4 . g4 . . . b4 . d5 .',
        'e5 . . . . . . . g#4 . . . b4 . . .',
        'a4 . c5 . e5 . . . a5 . g5 . e5 . . .',
        'f5 . e5 . d5 . . . a4 . . . d5 . . .',
        'e5 . d5 . c5 . b4 . g#4 . . . b4 . . .',
        'a4 . . . . . . . - - - - - - - -',
      ].join(' | '),
      harmony: [
        `${hold('c4', 8)} ${hold('e4', 8)}`,
        `${hold('a3', 8)} ${hold('c4', 8)}`,
        `${hold('b3', 8)} ${hold('d4', 8)}`,
        `${hold('g#3', 8)} ${hold('b3', 8)}`,
        `${hold('c4', 8)} ${hold('e4', 8)}`,
        `${hold('f3', 8)} ${hold('a3', 8)}`,
        `${hold('g#3', 8)} ${hold('b3', 8)}`,
        `${hold('c4', 8)} - - - - - - - -`,
      ].join(' | '),
      bass: [
        'a2 . . . - - - - e2 . . . - - - -',
        'f2 . . . - - - - c3 . . . - - - -',
        'g2 . . . - - - - d3 . . . - - - -',
        'e2 . . . - - - - b2 . . . - - - -',
        'a2 . . . - - - - e2 . . . - - - -',
        'd2 . . . - - - - a2 . . . - - - -',
        'e2 . . . - - - - g#2 . . . - - - -',
        'a2 . . . - - - - a2 . . . - - - -',
      ].join(' | '),
      drums: 'k - - - h - - - s - - - h - h - | k - - - h - - - s - - - h - - -',
    },
    battle: {
      lead: [
        'a4 . a4 c5 e5 . e5 . a5 . g5 . e5 . c5 .',
        'f5 . f5 e5 d5 . c5 . a4 . c5 . f5 . . .',
        'g5 . g5 f5 e5 . d5 . b4 . d5 . g5 . . .',
        'e5 . . . b4 . e5 . g#5 . . . e5 . . .',
        'c6 . b5 a5 g5 . e5 . a5 . e5 . c5 . e5 .',
        'd5 . f5 . a5 . f5 . d5 . a4 . d5 . f5 .',
        'e5 . g#5 . b5 . g#5 . e5 . d5 . c5 . b4 .',
        'a4 . . . e4 . a4 . c5 . . . a4 . . .',
      ].join(' | '),
      // Off-beat stabs, the "pah" of the march.
      harmony: [
        ['c4', 'e4'],
        ['a3', 'c4'],
        ['b3', 'd4'],
        ['g#3', 'b3'],
        ['c4', 'e4'],
        ['d4', 'f4'],
        ['g#3', 'b3'],
        ['c4', 'e4'],
      ]
        .map(([a, b]) => `- - ${a} - - - ${b} - - - ${a} - - - ${b} -`)
        .join(' | '),
      bass: [
        'a2 . - - e2 . - - a2 . - - e2 . - -',
        'f2 . - - c3 . - - f2 . - - c3 . - -',
        'g2 . - - d3 . - - g2 . - - d3 . - -',
        'e2 . - - b2 . - - e2 . - - g#2 . - -',
        'a2 . - - e2 . - - a2 . - - e2 . - -',
        'd2 . - - a2 . - - d2 . - - a2 . - -',
        'e2 . - - b2 . - - e2 . - - g#2 . - -',
        'a2 . - - e2 . - - a2 . . . - - - -',
      ].join(' | '),
      // A snare roll closes every other bar.
      drums: 'k - h - s - h - k - h - s - h h | k - h - s - h - k - k - s s s s',
    },
    pad: {
      lead: [hold('c5', 16), hold('c5', 16), hold('e5', 16), hold('b4', 16)].join(' | '),
      harmony: [hold('e4', 16), hold('f4', 16), hold('g4', 16), hold('g#4', 16)].join(' | '),
      bass: [hold('a2', 16), hold('f2', 16), hold('c3', 16), hold('e2', 16)].join(' | '),
    },
    win: {
      lead: 'e5 . e5 . e5 . a5 . . . . . c#6 . . . | e6 . . . . . . . . . . . - - - -',
      harmony: 'c#5 . c#5 . c#5 . e5 . . . . . a5 . . . | c#6 . . . . . . . . . . . - - - -',
      bass: 'a2 . a2 . a2 . a2 . . . . . e3 . . . | a2 . . . . . . . . . . . - - - -',
      drums: 'k - k - k - s - - - - - s s s s | k - - - - - - - - - - - - - - -',
    },
    lose: {
      lead: 'e5 . . . d5 . . . c5 . . . b4 . . . | a4 . . . . . . . . . . . - - - -',
      harmony: 'c5 . . . b4 . . . a4 . . . g#4 . . . | e4 . . . . . . . . . . . - - - -',
      bass: 'a2 . . . g2 . . . f2 . . . e2 . . . | a1 . . . . . . . . . . . - - - -',
      drums: 'k - - - - - - - k - - - - - - - | k - - - - - - - - - - - - - - -',
    },
  },
};

/**
 * The boss waves' music: slower, at 100 BPM, with the march's fife over a low triangle ostinato
 * and heavy drums. Its own song, since a song keeps one tempo.
 */
export const BOSS_MARCH: Song = {
  bpm: 100,
  waves: { lead: 'pulse12' },
  mix: { lead: 0.15, harmony: 0.07, bass: 0.3 },
  parts: {
    boss: {
      lead: [
        'e5 . . . . . . . f5 . . . e5 . . .',
        'd5 . . . c5 . . . b4 . . . c5 . d5 .',
        'c5 . . . . . . . a4 . . . c5 . . .',
        'b4 . . . . . . . g#4 . . . . . . .',
        'e5 . . . . . . . a5 . . . g5 . f5 .',
        'e5 . . . f5 . e5 . d5 . . . c5 . . .',
        'c5 . . . d5 . . . e5 . . . f5 . . .',
        'g#5 . . . . . . . e5 . . . . . . .',
      ].join(' | '),
      harmony: [
        'a3 . . . c4 . . . a3 . . . c4 . . .',
        'a3 . . . c4 . . . a3 . . . c4 . . .',
        'a3 . . . c4 . . . f3 . . . a3 . . .',
        'g#3 . . . b3 . . . g#3 . . . b3 . . .',
      ].join(' | '),
      bass: [
        'a2 . a2 a3 a2 . a2 a3 a2 . a2 a3 bb2 . g#2 .',
        'a2 . a2 a3 a2 . a2 a3 a2 . a2 a3 bb2 . g#2 .',
        'f2 . f2 f3 f2 . f2 f3 f2 . f2 f3 g2 . g#2 .',
        'e2 . e2 e3 e2 . e2 e3 e2 . e2 e3 f2 . g#2 .',
      ].join(' | '),
      drums: 'k - - - s - - k k - - - s - s s',
    },
  },
};
