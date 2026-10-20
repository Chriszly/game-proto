import { sounds, type Song } from '../../../shared/audio';

/**
 * Ninefold's sound: a gentle music-box tune in G major at 84 BPM for Classic, a darker A minor
 * variant for Delve and a sparse menu loop, plus soft paper-and-pencil effects. The scene plays
 * them; the rules in `game/` stay free of sound.
 */

/** A bar of one note held throughout. */
const held = (note: string) => `${note} ${'. '.repeat(15)}`.trim();

const calmLead = [
  'g5 . b5 . d6 . b5 . a5 . . . g5 . . .',
  'e5 . g5 . c6 . b5 . a5 . . . - . . .',
  'd5 . f#5 . a5 . c6 . b5 . a5 . g5 . . .',
  'a5 . . . f#5 . . . g5 . . . - . . .',
].join(' | ');

const delveLead = [
  'a4 . c5 . e5 . . . d5 . c5 . b4 . . .',
  'f4 . a4 . c5 . . . b4 . a4 . g#4 . . .',
  'a4 . c5 . e5 . a5 . g5 . e5 . d5 . . .',
  'c5 . b4 . a4 . g#4 . a4 . . . - . . .',
].join(' | ');

export const SONG: Song = {
  bpm: 84,
  mix: { lead: 0.12, harmony: 0.05, bass: 0.2, drums: 0.12 },
  waves: { lead: 'triangle', harmony: 'pulse12' },
  parts: {
    /** The menu and the style picker. */
    menu: {
      lead: ['g5 . . . d6 . . . b5 . . . . . . .', 'c6 . . . a5 . . . d6 . . . . . . .'].join(' | '),
      bass: [held('g2'), held('d2')].join(' | '),
    },
    /** A Classic or daily board. */
    calm: {
      lead: calmLead,
      harmony: [held('d5'), held('c5'), held('a4'), held('d5')].join(' | '),
      bass: [
        'g2 . . . d3 . . . g2 . . . d3 . . .',
        'c3 . . . g2 . . . c3 . . . g2 . . .',
        'd3 . . . a2 . . . d3 . . . a2 . . .',
        'd3 . . . . . . . g2 . . . . . . .',
      ].join(' | '),
      drums: 'k - - - h - - - - - h - h - - -',
    },
    /** A Delve floor. */
    delve: {
      lead: delveLead,
      harmony: [held('e5'), held('c5'), held('e5'), held('e5')].join(' | '),
      bass: [
        'a2 . . . e2 . . . a2 . . . e2 . . .',
        'f2 . . . c3 . . . e2 . . . b2 . . .',
        'a2 . . . e2 . . . a2 . . . c3 . . .',
        'e2 . . . . . . . a2 . . . . . . .',
      ].join(' | '),
      drums: 'k - - h s - - h k - k h s - - h',
    },
    /** Sting: a board solved. */
    solved: {
      lead: 'g5 b5 d6 g6 . . d6 g6 . . . . . . . .',
      harmony: 'd5 g5 b5 d6 . . b5 d6 . . . . . . . .',
      bass: 'g2 . . . . . d2 g2 . . . . . . . .',
      drums: 'k - - - s - k - s - - - - - - -',
    },
    /** Sting: the delve ends. */
    over: {
      lead: 'e5 . c5 . a4 . g#4 . a4 . . . . . . .',
      harmony: '- - e4 . . . d4 . c4 . . . . . . .',
      bass: 'a2 . . . f2 . . . e2 . . . a1 . . .',
      drums: 'k - - - - - - - k - - - - - - -',
    },
  },
};

export const SFX = sounds({
  /** A cell picked. */
  tap: { wave: 'triangle', freq: 1400, to: 1200, length: 0.04, volume: 0.15, gap: 30 },
  /** A right digit written in: a pencil tick and a soft note. */
  place: { wave: 'triangle', freq: 784, arp: [0, 7], arpStep: 0.04, length: 0.14, volume: 0.3, vary: 0.03 },
  /** A wrong digit in Classic. */
  wrong: { wave: 'square', freq: 260, to: 200, length: 0.14, volume: 0.18, gap: 80 },
  /** A wrong digit in Delve that costs a heart. */
  heart: { wave: 'square', freq: 330, to: 110, arp: [0, -5], arpStep: 0.1, length: 0.3, volume: 0.24, gap: 120 },
  /** A wrong digit the Ward catches. */
  ward: { wave: 'pulse25', freq: 660, arp: [0, -12], arpStep: 0.08, length: 0.2, volume: 0.2 },
  /** A pencil mark. */
  note: { wave: 'noise', freq: 4000, to: 2500, length: 0.05, volume: 0.1, gap: 30 },
  /** A cell cleared. */
  erase: { wave: 'noise', freq: 1800, to: 900, length: 0.12, volume: 0.12, gap: 60 },
  /** A hint fills a cell. */
  hint: { wave: 'sine', freq: 880, arp: [0, 4, 7, 12], arpStep: 0.05, length: 0.3, volume: 0.25 },
  /** A row, column or box finished. */
  unit: { wave: 'triangle', freq: 1047, arp: [0, 4, 7], arpStep: 0.06, length: 0.3, volume: 0.28, gap: 90 },
  /** A style unlocked or picked. */
  unlock: { wave: 'pulse12', freq: 784, arp: [0, 4, 7, 12, 16], arpStep: 0.05, length: 0.35, volume: 0.22 },
  /** A relic taken. */
  relic: { wave: 'triangle', freq: 523, arp: [0, 7, 12, 19], arpStep: 0.07, length: 0.4, volume: 0.3 },
});
