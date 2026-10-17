import type { Song } from '../../../../shared/audio';

/**
 * The colony's song: a medieval dance in D Dorian at 96 lilting beats a minute (three steps a beat,
 * so a bar is 12/8), a square lead like a shawm over a triangle drone. Each age is fuller: Age I
 * the lead alone, Age II with a second voice, Age III turns to D Mixolydian (F sharp) with busier
 * drums. A standing Monument has its own slow, solemn variation. The stings share the tempo.
 */
export const COLONY: Song = {
  bpm: 96,
  steps: 3,
  mix: { lead: 0.13, harmony: 0.06, bass: 0.24, drums: 0.18 },
  waves: { lead: 'square', harmony: 'pulse25', bass: 'triangle' },
  parts: {
    calm: {
      lead:
        'd4 . e4 f4 . g4 a4 . . a4 . g4 | f4 . e4 d4 . e4 f4 . . e4 . . | d4 . e4 f4 . g4 a4 . c5 b4 . a4 | g4 . f4 e4 . c4 d4 . . - - - | ' +
        'a4 . . c5 . a4 g4 . a4 f4 . . | g4 . f4 e4 . f4 g4 . . a4 . . | a4 . c5 d5 . c5 b4 . a4 g4 . e4 | f4 . e4 d4 . c4 d4 . . - - -',
      bass:
        'd2 . . . . . a2 . . . . . | d2 . . . . . c3 . . . . . | d2 . . . . . a2 . . . . . | c3 . . . . . d2 . . . . . | ' +
        'f2 . . . . . c3 . . . . . | c3 . . . . . g2 . . . . . | a2 . . . . . g2 . . . . . | d2 . . . . . d2 . . a2 . .',
      drums: 'k - - h - - s - - h - h',
    },
    calm2: {
      lead:
        'd4 . e4 f4 . g4 a4 . . a4 . g4 | f4 . e4 d4 . e4 f4 . . e4 . . | d4 . e4 f4 . g4 a4 . c5 b4 . a4 | g4 . f4 e4 . c4 d4 . . - - - | ' +
        'a4 . . c5 . a4 g4 . a4 f4 . . | g4 . f4 e4 . f4 g4 . . a4 . . | a4 . c5 d5 . c5 b4 . a4 g4 . e4 | f4 . e4 d4 . c4 d4 . . - - -',
      harmony:
        'f3 . . . . . a3 . . . . . | a3 . . . . . g3 . . . . . | f3 . . . . . e3 . . g3 . . | e3 . . . . . f3 . . . . . | ' +
        'c4 . . . . . g3 . . a3 . . | c4 . . . . . b3 . . . . . | e4 . . . . . d4 . . b3 . . | a3 . . . . . f3 . . . . .',
      bass:
        'd2 . . a2 . . d2 . . a2 . . | d2 . . a2 . . c3 . . g2 . . | d2 . . a2 . . a2 . . e2 . . | c3 . . g2 . . d2 . . a2 . . | ' +
        'f2 . . c3 . . c3 . . g2 . . | c3 . . g2 . . g2 . . d3 . . | a2 . . e3 . . g2 . . d3 . . | d2 . . a2 . . d2 . . a2 . .',
      drums: 'k - h h - h s - h h - h',
    },
    calm3: {
      lead:
        'd4 . e4 f#4 . g4 a4 . . b4 . a4 | g4 . f#4 e4 . f#4 d4 . . - - - | a4 . b4 c5 . b4 a4 . g4 f#4 . e4 | d4 . e4 f#4 . a4 g4 . . . - - | ' +
        'd5 . . c5 . b4 a4 . b4 c5 . . | b4 . a4 g4 . a4 b4 . . a4 . . | a4 . f#4 g4 . e4 f#4 . d4 e4 . c4 | d4 . . a3 . . d4 . . . - -',
      harmony:
        'f#3 . . . . . a3 . . . . . | b3 . . . . . g3 . . . . . | c4 . . . . . e4 . . c4 . . | f#3 . . . . . a3 . . . . . | ' +
        'b3 . . . . . g3 . . e4 . . | d4 . . . . . b3 . . . . . | d4 . . . . . e4 . . . . . | f#3 . . . . . a3 . . . . .',
      bass:
        'd2 . . a2 . . d2 . . a2 . . | g2 . . d3 . . g2 . . d3 . . | a2 . . e3 . . c3 . . g2 . . | d2 . . a2 . . d2 . . a2 . . | ' +
        'g2 . . d3 . . c3 . . g2 . . | g2 . . d3 . . g2 . . d3 . . | d2 . . a2 . . c3 . . g2 . . | d2 . . a2 . . d2 . . d2 . .',
      drums: 'k - h s - h k - k s h h | k - h s - h k - h s s s',
    },
    monument: {
      lead:
        'd5 . . . . . a4 . . . . . | c5 . . b4 . . a4 . . . . . | g4 . . a4 . . f4 . . e4 . . | d4 . . . . . . . . - - - | ' +
        'f4 . . g4 . . a4 . . c5 . . | d5 . . . . . c5 . . a4 . . | b4 . . a4 . . g4 . . e4 . . | d4 . . . . . . . . - - -',
      harmony:
        'a3 . . . . . . . . . . . | g3 . . . . . . . . . . . | e3 . . . . . . . . . . . | f3 . . . . . . . . . . . | ' +
        'a3 . . . . . . . . . . . | a3 . . . . . . . . . . . | g3 . . . . . . . . . . . | f3 . . . . . . . . . . .',
      bass: 'd2 . . . . . . . . . . . | d2 . . . . . a1 . . . . .',
      drums: 'k - - - - - k - - s - -',
    },
    /** Age II or III reached: a five-note fanfare. */
    age: {
      lead: 'd4 . a4 . d5 . e5 . f#5 . . . | . . . . . . - - - - - -',
      harmony: 'a3 . . . . . a3 . . . . . | d4 . . . . . - - - - - -',
      bass: 'd2 . . . . . a2 . . . . . | d2 . . . . . - - - - - -',
      drums: 'k - - - - - k - - s - s | k - - - - - - - - - - -',
    },
    win: {
      lead: 'd4 . a4 d5 . f#5 e5 . d5 e5 . f#5 | a5 . . . . . . . . . - - | f#5 . e5 d5 . . a4 . . d5 . . | . . . . . . . . . - - -',
      harmony: 'a3 . . . . . a3 . . . . . | c#4 . . . . . e4 . . . . . | a3 . . . . . g3 . . . . . | f#3 . . . . . . . . - - -',
      bass: 'd2 . . . . . d2 . . . . . | a2 . . . . . a2 . . . . . | g2 . . . . . a2 . . . . . | d2 . . . . . . . . - - -',
      drums: 'k - - s - - k - - s - s | k - - s - - k - s s s s | k - - s - - k - - s - - | k - - - - - - - - - - -',
    },
    lose: {
      lead: 'a4 . . g4 . . f4 . . e4 . . | d4 . . c4 . . a3 . . . . . | bb3 . . a3 . . g3 . . e3 . . | d3 . . . . . . . . - - -',
      harmony: 'f3 . . . . . d3 . . . . . | f3 . . . . . e3 . . . . . | d3 . . . . . c#3 . . . . . | a2 . . . . . . . . - - -',
      bass: 'd2 . . . . . bb1 . . . . . | f2 . . . . . a1 . . . . . | g1 . . . . . a1 . . . . . | d2 . . . . . . . . - - -',
      drums: 'k - - - - - k - - - - - | k - - - - - k - - - - - | k - - - - - k - - - - - | k - - - - - - - - - - -',
    },
    /** The end of a watched match: neither won nor lost, open fifths. */
    end: {
      lead: 'd4 . . a4 . . g4 . . a4 . . | c5 . . a4 . . g4 . e4 d4 . . | . . . . . . - - - - - -',
      harmony: 'a3 . . . . . . . . . . . | e3 . . . . . . . . a3 . . | . . . . . . - - - - - -',
      bass: 'd2 . . . . . a2 . . . . . | c3 . . . . . g2 . . d2 . . | . . . . . . - - - - - -',
      drums: 'k - - h - - s - - h - - | k - - h - - s - - k - - | k - - - - - - - - - - -',
    },
  },
};

/**
 * A raid on the player: the same D Dorian at 132 beats a minute, a square horn calling over
 * driving octaves and war drums.
 */
export const RAID: Song = {
  bpm: 132,
  mix: { lead: 0.14, harmony: 0.07, bass: 0.26, drums: 0.3 },
  waves: { lead: 'square', harmony: 'pulse25', bass: 'triangle' },
  parts: {
    battle: {
      lead:
        'd4 . . . a4 . . . a4 . g4 . a4 . . . | c5 . . . a4 . g4 . f4 . . . e4 . . . | d4 . . . a4 . . . a4 . c5 . d5 . . . | c5 . a4 . g4 . e4 . d4 . . . - - - - | ' +
        'f4 . f4 . g4 . a4 . c5 . . . a4 . . . | g4 . g4 . a4 . c5 . d5 . . . c5 . . . | d5 . c5 . a4 . g4 . f4 . g4 . a4 . . . | e4 . . . c4 . . . d4 . . . - - - -',
      harmony:
        'a3 . . . . . . . a3 . . . . . . . | c4 . . . . . . . a3 . . . . . . . | a3 . . . . . . . f3 . . . . . . . | g3 . . . . . . . a3 . . . . . . . | ' +
        'c4 . . . . . . . c4 . . . . . . . | d4 . . . . . . . g3 . . . . . . . | a3 . . . . . . . c4 . . . . . . . | e3 . . . . . . . f3 . . . . . . .',
      bass:
        'd2 - d2 - d2 - d3 - d2 - d2 - d3 - d2 - | f2 - f2 - f2 - f3 - f2 - f2 - f3 - f2 - | d2 - d2 - d2 - d3 - d2 - d2 - d3 - d2 - | c2 - c2 - c2 - c3 - d2 - d2 - d3 - d2 - | ' +
        'f2 - f2 - f2 - f3 - f2 - f2 - f3 - f2 - | g2 - g2 - g2 - g3 - g2 - g2 - g3 - g2 - | d2 - d2 - d2 - d3 - c2 - c2 - c3 - c2 - | a1 - a1 - a1 - a2 - d2 - d2 - d3 - d2 -',
      drums: 'k - - k s - k - k - k - s - h h | k - - k s - k - k - k - s s s s',
    },
  },
};
