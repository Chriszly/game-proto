import { sounds, type Song } from '../../../shared/audio';

/**
 * Mazewright's sound: a light pastoral tune in G for building and the garden picker, a busier
 * part in E minor while a wave walks the maze, a heavier one for the queen, and stings for a won
 * or lost garden. The scene plays them; the rules in `game/` stay free of sound.
 */

/** A bar of one note held throughout. */
const held = (note: string) => `${note} ${'. '.repeat(15)}`.trim();

export const SONG: Song = {
  bpm: 104,
  mix: { lead: 0.1, harmony: 0.05, bass: 0.16, drums: 0.09 },
  waves: { lead: 'triangle', harmony: 'pulse25' },
  parts: {
    /** Between waves and on the garden picker. */
    calm: {
      lead: [
        'g4 . b4 . d5 . . . e5 . d5 . b4 . . .',
        'c5 . e5 . g5 . . . f#5 . e5 . d5 . . .',
        'b4 . d5 . g5 . . . a5 . g5 . e5 . . .',
        'd5 . c5 . b4 . a4 . g4 . . . - . . .',
      ].join(' | '),
      harmony: [held('d4'), held('e4'), held('d4'), held('b3')].join(' | '),
      bass: [
        'g2 . . . d3 . . . g2 . . . d3 . . .',
        'c3 . . . g2 . . . c3 . . . g2 . . .',
        'g2 . . . d3 . . . e2 . . . b2 . . .',
        'd2 . . . a2 . . . g2 . . . . . . .',
      ].join(' | '),
      drums: 'k - - - h - - - k - - - h - - -',
    },
    /** A wave in play. */
    battle: {
      lead: [
        'e5 . g5 e5 b4 . e5 . d5 . b4 . a4 . b4 .',
        'c5 . e5 c5 a4 . c5 . b4 . g4 . f#4 . b4 .',
      ].join(' | '),
      harmony: [held('g4'), held('e4')].join(' | '),
      bass: ['e2 . e2 . b2 . e2 . e2 . e2 . b2 . d3 .', 'c2 . c2 . g2 . c2 . b1 . b1 . f#2 . b1 .'].join(' | '),
      drums: 'k - h - s - h - k k h - s - h h',
    },
    /** A wave with the queen in it. */
    boss: {
      lead: [
        'e4 . . e4 g4 . . . f#4 . . e4 d#4 . . .',
        'e4 . . e4 b4 . . . a4 . g4 . f#4 . . .',
      ].join(' | '),
      bass: ['e2 e2 . e2 e2 . e2 . e2 e2 . e2 b1 . b1 .', 'c2 c2 . c2 c2 . c2 . b1 b1 . b1 d#2 . b1 .'].join(' | '),
      drums: 'k - s k k - s - k - s k k s s s',
    },
    /** Sting: every wave held. */
    win: {
      lead: 'g4 . b4 . d5 . g5 . . . b5 . . . . .',
      harmony: 'd4 . g4 . b4 . d5 . . . g5 . . . . .',
      bass: 'g2 . . . . . . . g2 . . . . . . .',
      drums: 'k - - - s - - - k - - - - - - -',
    },
    /** Sting: the lives ran out. */
    lose: {
      lead: 'b4 . . . a4 . . . g4 . . . e4 . . .',
      bass: 'e2 . . . . . . . e1 . . . . . . .',
      drums: 'k - - - - - - - k - - - - - - -',
    },
  },
};

export const SFX = sounds({
  /** A hedge planted. */
  plant: { wave: 'noise', freq: 1800, to: 700, length: 0.1, volume: 0.16, gap: 40 },
  /** A tower built. */
  build: { wave: 'triangle', freq: 392, arp: [0, 7], arpStep: 0.05, length: 0.14, volume: 0.24 },
  /** A tower upgraded. */
  upgrade: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12], arpStep: 0.05, length: 0.26, volume: 0.26 },
  /** A tower sold. */
  sell: { wave: 'square', freq: 660, to: 440, length: 0.1, volume: 0.16 },
  /** A bow looses an arrow. */
  bow: { wave: 'noise', freq: 4200, to: 2600, length: 0.05, volume: 0.08, gap: 70, vary: 0.08 },
  /** A cannon fires. */
  cannon: { wave: 'noise', freq: 500, to: 120, length: 0.18, volume: 0.22, gap: 120 },
  /** A frost pulse. */
  frost: { wave: 'sine', freq: 1400, to: 2100, length: 0.16, volume: 0.1, gap: 150 },
  /** A foe beaten. */
  pop: { wave: 'square', freq: 700, to: 1100, length: 0.06, volume: 0.12, gap: 50, vary: 0.06 },
  /** A foe reaches the cottage. */
  leak: { wave: 'square', freq: 260, to: 110, length: 0.28, volume: 0.24, gap: 150 },
  /** A wave starts. */
  horn: { wave: 'pulse25', freq: 330, arp: [0, 5, 7], arpStep: 0.09, length: 0.36, volume: 0.22 },
  /** A wave held. */
  cleared: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12, 16], arpStep: 0.06, length: 0.44, volume: 0.28 },
  /** A mole starts chewing, and a hedge gone. */
  chew: { wave: 'noise', freq: 900, to: 300, length: 0.22, volume: 0.18, gap: 200 },
});
