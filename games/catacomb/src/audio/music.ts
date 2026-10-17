import type { Song } from '../../../../shared/audio';

// Catacomb's music: a dirge in A minor (harmonic minor, so the E chord has its G#), in two songs,
// since the map and the fights run at different tempos. Each bar is 16 steps (sixteenth notes).

/** The map and the quiet rooms, at 80 BPM over a triangle drone. */
export const MAP_SONG: Song = {
  bpm: 80,
  mix: { lead: 0.13, harmony: 0.06, bass: 0.3, drums: 0.22 },
  parts: {
    /** The Crypt's map (and the hero panel). */
    calm: {
      lead:
        'a4 . . . c5 . e5 . d5 . c5 . b4 . . . | c5 . . . a4 . f4 . e4 . f4 . a4 . . . | ' +
        'd5 . . . f5 . e5 . d5 . c5 . b4 . a4 . | g#4 . . . b4 . e5 . . . . . - - - - | ' +
        'e5 . . . a5 . g#5 . a5 . e5 . c5 . . . | d5 . . . f5 . e5 . d5 . . . a4 . . . | ' +
        'b4 . . . d5 . c5 . b4 . a4 . g#4 . . . | a4 . . . . . . . - - - - - - - -',
      harmony:
        'c4 . . . . . . . e4 . . . . . . . | a3 . . . . . . . c4 . . . . . . . | ' +
        'f3 . . . . . . . a3 . . . . . . . | g#3 . . . . . . . b3 . . . . . . . | ' +
        'c4 . . . . . . . e4 . . . . . . . | f3 . . . . . . . a3 . . . . . . . | ' +
        'g#3 . . . . . . . b3 . . . . . . . | c4 . . . . . . . e4 . . . . . . .',
      bass:
        'a2 . . . . . . . . . . . . . . . | f2 . . . . . . . . . . . . . . . | ' +
        'd2 . . . . . . . . . . . . . . . | e2 . . . . . . . . . . . . . . . | ' +
        'a2 . . . . . . . . . . . . . . . | d2 . . . . . . . . . . . . . . . | ' +
        'e2 . . . . . . . . . . . . . . . | a2 . . . . . . . e2 . . . . . . .',
      drums: 'k - - - - - - - h - - - - - - - | k - - - - - - - h - - - k - - -',
    },
    /** The Sunken Tombs' map: lower and darker, with a heartbeat. */
    tombs: {
      lead:
        'e4 . . . f4 . e4 . c4 . . . b3 . . . | d4 . . . f4 . a4 . g#4 . . . a4 . . . | ' +
        'c5 . . . b4 . a4 . f4 . . . e4 . . . | g#3 . . . b3 . d4 . . . . . e4 . . . | ' +
        'a4 . . . . . c5 . b4 . a4 . g#4 . . . | f4 . . . a4 . d5 . c5 . b4 . a4 . . . | ' +
        'g#4 . . . f4 . e4 . d4 . b3 . g#3 . . . | a3 . . . . . . . - - - - - - - -',
      harmony:
        'a3 . . . . . . . . . . . . . . . | f3 . . . . . . . . . . . . . . . | ' +
        'a3 . . . . . . . . . . . . . . . | d3 . . . . . . . . . . . . . . . | ' +
        'c4 . . . . . . . . . . . . . . . | a3 . . . . . . . . . . . . . . . | ' +
        'd3 . . . . . . . . . . . . . . . | e3 . . . . . . . . . . . . . . .',
      bass:
        'a1 . . . . . . . . . . . . . . . | d2 . . . . . . . . . . . . . . . | ' +
        'f1 . . . . . . . . . . . . . . . | e1 . . . . . . . . . . . . . . . | ' +
        'a1 . . . . . . . . . . . . . . . | d2 . . . . . . . . . . . . . . . | ' +
        'e1 . . . . . . . . . . . . . . . | a1 . . . . . . . e1 . . . . . . .',
      drums: 'k - - k - - - - - - - - - - - - | k - - k - - - - - - - - - - - -',
    },
    /** The campfire, the merchant and the mystery rooms: a warmer loop, leaning to C major. */
    camp: {
      lead:
        'e5 . . . g5 . . . e5 . d5 . c5 . . . | d5 . . . b4 . . . g4 . . . - - - - | ' +
        'c5 . . . e5 . a5 . g5 . e5 . d5 . . . | b4 . . . g#4 . . . e4 . . . - - - -',
      harmony:
        'c4 - e4 - g4 - e4 - c4 - e4 - g4 - e4 - | b3 - d4 - g4 - d4 - b3 - d4 - g4 - d4 - | ' +
        'a3 - c4 - e4 - c4 - a3 - c4 - e4 - c4 - | g#3 - b3 - e4 - b3 - g#3 - b3 - e4 - b3 -',
      bass:
        'c3 . . . . . . . g2 . . . . . . . | g2 . . . . . . . d2 . . . . . . . | ' +
        'a2 . . . . . . . e2 . . . . . . . | e2 . . . . . . . b1 . . . . . . .',
      drums: 'k - - - h - - - - - - - h - - -',
    },
  },
};

/** The fights, at 120 BPM with drums, and the stings. */
export const FIGHT_SONG: Song = {
  bpm: 120,
  parts: {
    /** A fight in the Crypt. */
    battle: {
      lead:
        'a4 . c5 . e5 . . . d5 . c5 . b4 . c5 . | a4 . . . f4 . a4 . c5 . . . a4 . c5 . | ' +
        'd5 . f5 . a5 . . . g#5 . f5 . e5 . d5 . | e5 . . . b4 . . . g#4 . b4 . e5 . . . | ' +
        'a5 . . . e5 . . . c5 . e5 . a5 . g#5 . | f5 . . . c5 . a4 . f5 . e5 . d5 . c5 . | ' +
        'd5 . e5 . f5 . d5 . b4 . c5 . d5 . b4 . | e5 . . . . . . . g#4 . a4 . b4 . . .',
      harmony:
        '- - c4 - - - e4 - - - c4 - - - e4 - | - - a3 - - - c4 - - - a3 - - - c4 - | ' +
        '- - f4 - - - a4 - - - f4 - - - a4 - | - - g#3 - - - b3 - - - g#3 - - - b3 -',
      bass:
        'a2 . a3 . a2 . a3 . a2 . a3 . e2 . e3 . | f2 . f3 . f2 . f3 . f2 . f3 . f2 . f3 . | ' +
        'd2 . d3 . d2 . d3 . d2 . d3 . d2 . d3 . | e2 . e3 . e2 . e3 . g#2 . b2 . e3 . e2 .',
      drums: 'k - h - s - h - k k h - s - h h',
    },
    /** A fight in the Sunken Tombs: lower, with a dark half step in the bass. */
    depths: {
      lead:
        'e4 . . . f4 . e4 . . . c4 . b3 . c4 . | e4 . . . f4 . g#4 . a4 . . . g#4 . f4 . | ' +
        'e4 . . . a4 . . . c5 . b4 . a4 . g#4 . | a4 . . . e4 . . . f4 . e4 . d4 . b3 .',
      harmony:
        'c4 . . . . . . . . . . . . . . . | c4 . . . . . . . b3 . . . . . . . | ' +
        'a3 . . . . . . . . . . . . . . . | g#3 . . . . . . . . . . . . . . .',
      bass:
        'a1 . a2 . a1 . bb2 . a1 . a2 . a1 . bb2 . | a1 . a2 . a1 . bb2 . a1 . a2 . a1 . bb2 . | ' +
        'f1 . f2 . f1 . f2 . f1 . f2 . f1 . f2 . | e1 . e2 . e1 . e2 . e1 . e2 . g#1 . b1 .',
      drums: 'k - - h s - h - k - k h s - h -',
    },
    /** Elites and the bosses (the Bone King, the Hollow Queen): heavier, with a running bass. */
    boss: {
      lead:
        'a5 . . . g#5 . a5 . e5 . . . c5 . . . | f5 . . . e5 . f5 . c5 . . . a4 . . . | ' +
        'd5 . f5 . a5 . d6 . c6 . b5 . a5 . f5 . | g#5 . . . e5 . . . b4 . . . g#4 . b4 .',
      harmony:
        'e4 - - e4 - - e4 - e4 - - e4 - - e4 - | c4 - - c4 - - c4 - c4 - - c4 - - c4 - | ' +
        'a3 - - a3 - - a3 - a3 - - a3 - - a3 - | b3 - - b3 - - b3 - b3 - - b3 - - b3 -',
      bass:
        'a1 a2 a1 a2 a1 a2 a1 a2 a1 a2 a1 a2 c2 c3 b1 b2 | f1 f2 f1 f2 f1 f2 f1 f2 f1 f2 f1 f2 f1 f2 f1 f2 | ' +
        'd2 d3 d2 d3 d2 d3 d2 d3 d2 d3 d2 d3 d2 d3 d2 d3 | e1 e2 e1 e2 e1 e2 e1 e2 g#1 g#2 g#1 g#2 b1 b2 b1 b2',
      drums: 'k h s h k k s h k h s h k k s s',
    },
    /** Sting: the Bone King falls. */
    triumph: {
      lead: 'e5 . a5 . c6 . . . b5 . . . a5 . . . | - - - - - - - - - - - - - - - -',
      harmony: 'c5 . e5 . e5 . . . d5 . . . c5 . . . | - - - - - - - - - - - - - - - -',
      bass: 'a2 . . . e2 . . . a2 . . . . . . . | - - - - - - - - - - - - - - - -',
      drums: 'k - - - s - - - k - - - - - - - | - - - - - - - - - - - - - - - -',
    },
    /** Sting: the Hollow Queen falls, ending on A major. */
    win: {
      lead: 'a4 . c#5 . e5 . a5 . . . . . g#5 . a5 . | b5 . . . . . . . a5 . . . . . . .',
      harmony: 'e4 . a4 . c#5 . e5 . . . . . e5 . . . | e5 . . . . . . . c#5 . . . . . . .',
      bass: 'a2 . . . . . . . . . . . . . . . | e2 . . . . . . . a2 . . . . . . .',
      drums: 'k - - - s - - - k - k - s - - - | k - - - - - - - k - - - - - - -',
    },
    /** Sting: the hero has fallen. */
    lose: {
      lead: 'e5 . . . d5 . . . c5 . . . b4 . . . | a4 . . . g#4 . . . a4 . . . . . . .',
      harmony: 'c5 . . . . . . . a4 . . . . . . . | e4 . . . . . . . c4 . . . . . . .',
      bass: 'a2 . . . . . . . f2 . . . . . . . | e2 . . . . . . . a1 . . . . . . .',
      drums: 'k - - - - - - - k - - - - - - - | k - - - - - - - - - - - - - - -',
    },
  },
};
