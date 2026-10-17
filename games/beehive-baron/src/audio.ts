import { sounds, type Song } from '../../../shared/audio';

/**
 * Beehive Baron's sound: its effects table and its song. Everything is played from `GameScene`
 * (the sim stays free of audio); see "Sound" in `AGENTS.md` for where each one plays.
 */

/** The game's sound effects: short and soft, since an idle game plays them for a long time. */
export const sfx = sounds({
  /** A paper "pap" as a cell is built; `pitch` rises a step per touching edge. */
  build: { wave: 'triangle', freq: 700, to: 420, length: 0.08, volume: 0.45 },
  /** The foragers set off: a rising swarm whoosh. */
  send: { wave: 'pulse12', freq: 170, to: 360, length: 0.35, volume: 0.2, vary: 0.04, gap: 200 },
  /** A drop of nectar into a cell; nectar comes in bunches, so at most one per 100ms. */
  nectar: { wave: 'sine', freq: 1200, to: 1800, length: 0.05, volume: 0.2, gap: 100, vary: 0.08 },
  /** A cell capped: a waxy shimmer. */
  capped: { wave: 'triangle', freq: 523, arp: [0, 7, 12], arpStep: 0.045, length: 0.18, volume: 0.35, gap: 120 },
  /** A jar filled from a capped cell: a glass clink. */
  harvest: { wave: 'sine', freq: 1760, arp: [0, 7], arpStep: 0.03, length: 0.14, volume: 0.3, vary: 0.03 },
  /** Jars sold: a coin cascade. */
  sell: { wave: 'square', freq: 988, arp: [0, 4, 7, 12, 16], arpStep: 0.045, length: 0.3, volume: 0.22 },
  /** A village order complete: a bigger ka-ching. */
  orderDone: { wave: 'square', freq: 784, arp: [0, 4, 7, 12, 7, 12, 16, 19], arpStep: 0.05, length: 0.45, volume: 0.24 },
  /** An upgrade bought. */
  buy: { wave: 'square', freq: 1318, arp: [0, 7, 12], arpStep: 0.05, length: 0.25, volume: 0.22 },
  /** Something lost: nectar spilled, honey stolen or eaten, an order or offer lapsed. */
  sad: { wave: 'triangle', freq: 600, to: 300, length: 0.2, volume: 0.3, gap: 150 },
  /** A bee starved in winter: a longer minor drop. */
  starve: { wave: 'triangle', freq: 440, arp: [0, -3, -7, -12], arpStep: 0.12, length: 0.55, volume: 0.32 },
  /** A wasp flies in, and buzzes now and then while it is on the comb. */
  wasp: { wave: 'sawtooth', freq: 210, to: 240, length: 0.4, volume: 0.16, vary: 0.05, gap: 300 },
  /** A wasp swatted. */
  swat: { wave: 'noise', freq: 1800, to: 400, length: 0.09, volume: 0.45 },
  /** A wasp chased off by the Guard Bees. */
  zap: { wave: 'square', freq: 1400, to: 200, length: 0.15, volume: 0.22 },
  /** A bee hatched from a brood cell. */
  hatched: { wave: 'sine', freq: 1500, to: 2200, length: 0.09, volume: 0.28, vary: 0.06, gap: 120 },
  /** The market's demand moved. */
  demand: { wave: 'pulse25', freq: 880, arp: [0, 5], arpStep: 0.08, length: 0.18, volume: 0.2 },
  /** A meadow wilted. */
  wilted: { wave: 'triangle', freq: 500, to: 260, arp: [0, 1, 0, -1, -2], arpStep: 0.07, length: 0.4, volume: 0.3 },
  /** A village order or an orchard offer came. */
  ding: { wave: 'sine', freq: 1568, length: 0.35, volume: 0.28 },
  /** The season turned. */
  season: { wave: 'sine', freq: 784, arp: [0, 4, 7, 12], arpStep: 0.09, length: 0.6, volume: 0.25 },
  /** A year came through. */
  year: { wave: 'sine', freq: 1046, arp: [0, 7, 12], arpStep: 0.12, length: 0.7, volume: 0.28 },
  /** Jars into a cask: a barrel thunk. */
  casked: { wave: 'triangle', freq: 160, to: 80, length: 0.15, volume: 0.5 },
  /** Mead ready: a cork pop. */
  mead: { wave: 'sine', freq: 400, to: 1200, length: 0.06, volume: 0.4 },
  /** The hive is crowded and a swarm gathers: a rising buzz. */
  swarmReady: { wave: 'sawtooth', freq: 160, to: 320, length: 0.7, volume: 0.16 },
  /** The swarm left: a fading buzz. */
  swarmed: { wave: 'sawtooth', freq: 300, to: 120, length: 0.8, volume: 0.16 },
  /** The swarm caught under a queen: a regal chord. */
  caught: { wave: 'square', freq: 523, arp: [0, 4, 7, 12], arpStep: 0.07, length: 0.5, volume: 0.22 },
  /** Lent bees buzzing home from the orchard. */
  returned: { wave: 'pulse12', freq: 300, to: 200, length: 0.35, volume: 0.18 },
  /** The county fair opens. */
  fairOpen: { wave: 'pulse25', freq: 1046, arp: [0, 4, 7, 4, 7, 12], arpStep: 0.07, length: 0.45, volume: 0.22 },
  /** Honey or mead entered at the fair: a judge's stamp. */
  stamp: { wave: 'noise', freq: 600, to: 200, length: 0.1, volume: 0.45 },
});
export type SoundName = Parameters<typeof sfx>[0];

/** Doubles each step of a line written in eighth notes, so it reads in the song's sixteenths. */
const eighths = (line: string) =>
  line
    .split(/\s+/)
    .filter((step) => step && step !== '|')
    .map((step) => (step === '-' ? '- -' : `${step} .`))
    .join(' ');

/**
 * Lilting folk-pop in C major at 104 BPM, one part per season (spring bright, summer full, autumn
 * mellow in D Dorian, winter sparse in A minor at half time) and a fair jig, with stings for a meadow
 * unlocked, a gold at the fair and the Beehive Baron end card.
 */
export const SONG: Song = {
  bpm: 104,
  waves: { lead: 'square' },
  mix: { lead: 0.11, harmony: 0.06, bass: 0.24, drums: 0.22 },
  parts: {
    spring: {
      lead: eighths(`
        e5 . g5 e5 c5 . d5 e5 | c5 . a4 . e5 . d5 c5 | a4 . c5 f5 a5 . g5 f5 | g5 . . . d5 . g4 .
        e5 . g5 c6 b5 a5 g5 e5 | a5 . e5 . c5 d5 e5 . | f5 e5 d5 c5 b4 c5 d5 b4 | c5 . . . - - - -`),
      harmony: eighths(`
        g4 . e4 . g4 . e4 . | e4 . c4 . e4 . c4 . | f4 . c4 . f4 . a4 . | d4 . b3 . d4 . g4 .
        g4 . e4 . g4 . e4 . | e4 . c4 . e4 . c4 . | f4 . a4 . d4 . g4 . | e4 . . . c4 . . .`),
      bass: eighths(`
        c3 . g2 . c3 . g2 . | a2 . e2 . a2 . e3 . | f2 . c3 . f2 . c3 . | g2 . d3 . g2 . b2 .
        c3 . g2 . c3 . g2 . | a2 . e2 . a2 . e3 . | f2 . c3 . g2 . d3 . | c3 . g2 . c3 . . .`),
      drums: 'k - h - s - h - k - h k s - h -',
    },
    summer: {
      lead: eighths(`
        a5 . c6 . a5 g5 f5 . | g5 . b5 . d6 . b5 . | e5 . g5 b5 g5 . e5 . | a5 . . g5 a5 . c6 .
        c6 . a5 . f5 a5 c6 . | d6 . b5 . g5 . d6 c6 | b5 . c6 . g5 . e5 . | c6 . . . g5 . e5 g5`),
      harmony: eighths(`
        f4 a4 c5 a4 f4 a4 c5 a4 | g4 b4 d5 b4 g4 b4 d5 b4 | e4 g4 b4 g4 e4 g4 b4 g4 | a4 c5 e5 c5 a4 c5 e5 c5
        f4 a4 c5 a4 f4 a4 c5 a4 | g4 b4 d5 b4 g4 b4 d5 b4 | e4 g4 c5 g4 e4 g4 c5 g4 | e4 g4 c5 g4 e4 g4 c5 g4`),
      bass: eighths(`
        f2 f3 f2 f3 f2 f3 f2 f3 | g2 g3 g2 g3 g2 g3 g2 g3 | e2 e3 e2 e3 e2 e3 e2 e3 | a2 a3 a2 a3 a2 a3 a2 a3
        f2 f3 f2 f3 f2 f3 f2 f3 | g2 g3 g2 g3 g2 g3 g2 g3 | c3 c4 c3 c4 c3 c4 c3 c4 | c3 c4 c3 c4 g2 g3 g2 g3`),
      drums: 'k - h h s - h - k k h - s - h h',
    },
    autumn: {
      lead: eighths(`
        d5 . . f5 a5 . . g5 | b4 . . d5 g5 . f5 . | a5 . . g5 f5 . e5 . | e5 . . . c5 . . .
        f5 . . a5 c6 . a5 . | b5 . . a5 g5 . d5 . | e5 . . d5 c5 . b4 . | d5 . . . . . - -`),
      harmony: eighths(`
        f4 . . . a4 . . . | d4 . . . b3 . . . | f4 . . . a4 . . . | e4 . . . g4 . . .
        a4 . . . c5 . . . | g4 . . . b4 . . . | c5 . . . e4 . . . | d4 . . . f4 . . .`),
      bass: eighths(`
        d3 . . . a2 . d3 . | g2 . . . d3 . g2 . | d3 . . . a2 . d3 . | c3 . . . g2 . c3 .
        f2 . . . c3 . f2 . | g2 . . . d3 . g2 . | a2 . . . e2 . a2 . | d3 . . . a2 . d3 .`),
      drums: 'k - - - h - - - s - - - h - h -',
    },
    winter: {
      lead: eighths(`
        a4 . . . c5 . e5 . | f5 . . . e5 . . . | e5 . . . d5 . c5 . | d5 . . . . . . .
        a4 . . . c5 . e5 . | a5 . . . g5 . f5 . | e5 . d5 . b4 . . . | a4 . . . . . . .`),
      harmony: eighths(`
        e4 . . . . . . . | c4 . . . . . . . | e4 . . . . . . . | d4 . . . . . . .
        e4 . . . . . . . | c4 . . . . . . . | b3 . . . . . . . | c4 . . . . . . .`),
      bass: eighths(`
        a2 . . . . . . . | f2 . . . . . . . | c3 . . . . . . . | g2 . . . . . . .
        a2 . . . . . . . | f2 . . . . . . . | g2 . . . e2 . . . | a2 . . . . . . .`),
      drums: 'k - - - - - - - - - - - h - - -',
    },
    fair: {
      lead: `
        g5 . . e5 c5 . . e5 g5 . . c6 b5 . a5 . | a5 . . f5 c5 . . f5 a5 . c6 . a5 . g5 .
        g5 . . d5 b4 . . d5 g5 . . b5 a5 . g5 . | e5 . . g5 c6 . . . g5 . e5 . c5 . . .
        e5 . . g5 e5 . . c5 d5 . e5 . f5 . g5 . | a5 . . c6 a5 . . f5 g5 . a5 . g5 . f5 .
        d5 . . g5 b5 . . a5 g5 . f5 . e5 . d5 . | c5 . e5 . g5 . c6 . . . . . - - - -`,
      harmony: `
        - - e4 . - - g4 . - - e4 . - - g4 . | - - a3 . - - c4 . - - a3 . - - c4 .
        - - b3 . - - d4 . - - b3 . - - d4 . | - - e4 . - - g4 . - - e4 . - - g4 .
        - - e4 . - - g4 . - - e4 . - - g4 . | - - a3 . - - c4 . - - a3 . - - c4 .
        - - b3 . - - d4 . - - b3 . - - d4 . | - - e4 . - - g4 . e4 . . . - - - -`,
      bass: `
        c3 . . . g2 . . . c3 . . . g2 . . . | f2 . . . c3 . . . f2 . . . c3 . . .
        g2 . . . d3 . . . g2 . . . d3 . . . | c3 . . . g2 . . . c3 . . . g2 . . .
        c3 . . . g2 . . . c3 . . . g2 . . . | f2 . . . c3 . . . f2 . . . c3 . . .
        g2 . . . d3 . . . g2 . . . d3 . . . | c3 . . . g2 . . . c3 . . . - - - -`,
      drums: 'k - h - s - h h k - h - s - h -',
    },
    /** A meadow unlocked. */
    unlock: {
      lead: 'c5 e5 g5 c6 . . . . e6 . . . . . - -',
      harmony: 'e4 g4 c5 e5 . . . . g5 . . . . . - -',
      bass: 'c3 . . . . . . . c3 . . . . . - -',
      drums: 'k - - - - - - - s - - - - - - -',
    },
    /** Gold at a fair after the first. */
    gold: {
      lead: 'g4 . c5 . e5 . g5 . . . e5 . g5 . . . | c6 . . . . . . . . . . . - - - -',
      harmony: 'e4 . e4 . g4 . c5 . . . c5 . e5 . . . | e5 . . . . . . . . . . . - - - -',
      bass: 'c3 . . . c3 . . . g2 . . . g2 . . . | c3 . . . . . . . - - - - - - - -',
      drums: 'k - - - k - - - k - s - k - s s | k - - - - - - - - - - - - - - -',
    },
    /** The first gold: the Beehive Baron. */
    baron: {
      lead: `
        c5 . c5 c5 g5 . . . e5 . g5 . c6 . . . | a5 . a5 a5 f5 . . . a5 . c6 . f6 . . .
        e6 . d6 . c6 . b5 . a5 . g5 . f5 . d5 . | c6 . . . . . . . . . . . - - - -`,
      harmony: `
        e4 . e4 e4 e4 . . . g4 . . . g4 . . . | f4 . f4 f4 a4 . . . a4 . . . c5 . . .
        b4 . . . g4 . . . d5 . . . b4 . . . | e5 . . . . . . . . . . . - - - -`,
      bass: `
        c3 . . . c3 . . . c3 . . . g2 . . . | f2 . . . f2 . . . f2 . . . c3 . . .
        g2 . . . g2 . . . g2 . . . g2 . . . | c3 . . . . . . . . . . . - - - -`,
      drums: `
        k - k k s - - - k - s - k - s - | k - k k s - - - k - s - k - s -
        k - s - k - s - k k s - s s s s | k - - - - - - - - - - - - - - -`,
    },
  },
};
