import { sounds, type Song } from '../../../shared/audio';

/**
 * Apothecary's sound: a cosy herbalist's almanac. The music is modal folk in D Dorian, a recorder-like
 * pulse lead over a plucked square arpeggio, a triangle bass and light shakers; the effects are soft
 * and wooden. Everything is played from `GameScene`, never from the sim, so `catchUp` (the time
 * away, played through `tick` on load) stays silent.
 */

/** The shop's song, at 84 BPM: `calm` for a normal day, `plague` while the sickness spreads, and its stings. */
export const SONG: Song = {
  bpm: 84,
  mix: { lead: 0.14, harmony: 0.05, bass: 0.24, drums: 0.16 },
  parts: {
    // Eight bars: Dm | G | Dm | C | F | C | G | Dm.
    calm: {
      lead: [
        'a4 . . . d5 . e5 . f5 . . . e5 . d5 .',
        'b4 . . . d5 . . . g4 . a4 . b4 . . .',
        'a4 . f4 . a4 . d5 . c5 . a4 . . . - -',
        'g4 . . . e4 . g4 . c5 . . . - - - -',
        'f4 . a4 . c5 . . . d5 . c5 . a4 . . .',
        'g4 . e4 . g4 . c5 . e5 . . . d5 . c5 .',
        'b4 . . . a4 . g4 . a4 . b4 . d5 . . .',
        'd5 . . . . . . . - - - - c5 . b4 .',
      ].join(' | '),
      harmony: [
        'd4 - a4 - f4 - a4 - d4 - a4 - f4 - a4 -',
        'g3 - d4 - b3 - d4 - g3 - d4 - b3 - d4 -',
        'd4 - a4 - f4 - a4 - d4 - a4 - f4 - a4 -',
        'c4 - g4 - e4 - g4 - c4 - g4 - e4 - g4 -',
        'f3 - c4 - a3 - c4 - f3 - c4 - a3 - c4 -',
        'c4 - g4 - e4 - g4 - c4 - g4 - e4 - g4 -',
        'g3 - d4 - b3 - d4 - g3 - d4 - b3 - d4 -',
        'd4 - a4 - f4 - a4 - d4 - f4 - a4 - d5 -',
      ].join(' | '),
      bass: [
        'd2 . . . . . . . a2 . . . d3 . . .',
        'g2 . . . . . . . d3 . . . g2 . . .',
        'd2 . . . . . . . a2 . . . d3 . . .',
        'c3 . . . . . . . g2 . . . c3 . . .',
        'f2 . . . . . . . c3 . . . f2 . . .',
        'c3 . . . . . . . g2 . . . c3 . . .',
        'g2 . . . . . . . d3 . . . g2 . . .',
        'd2 . . . . . . . a2 . . . d2 . . .',
      ].join(' | '),
      drums: 'k - - h - - h - k - h - - - h h | k - - h - - h - s - h - - - h -',
    },
    // The plague: D minor with its Bb and the A major that pulls home, sparse, over a heartbeat.
    // Dm | Bb | Gm | A | Dm | Bb | Gm | A.
    plague: {
      lead: [
        'd4 . . . f4 . . . e4 . d4 . a3 . . .',
        'bb3 . . . d4 . . . f4 . . . d4 . . .',
        'g4 . . . f4 . . . d4 . bb3 . g3 . . .',
        'a3 . . . c#4 . . . e4 . . . . . . .',
        'f4 . . . a4 . . . g4 . f4 . e4 . . .',
        'd4 . . . f4 . . . bb4 . a4 . f4 . . .',
        'g4 . . . bb4 . a4 . g4 . f4 . e4 . . .',
        'c#4 . . . e4 . . . a3 . . . . . . .',
      ].join(' | '),
      harmony: [
        'd3 - f3 - a3 - - - d3 - f3 - a3 - - -',
        'bb2 - d3 - f3 - - - bb2 - d3 - f3 - - -',
        'g2 - bb2 - d3 - - - g2 - bb2 - d3 - - -',
        'a2 - c#3 - e3 - - - a2 - c#3 - e3 - - -',
      ].join(' | '),
      bass: [
        'd2 . . . . . . . d3 . . . . . . .',
        'bb1 . . . . . . . bb2 . . . . . . .',
        'g1 . . . . . . . g2 . . . . . . .',
        'a1 . . . . . . . a2 . . . e2 . . .',
      ].join(' | '),
      drums: 'k - - k - - - - - - - - s - - - | k - - k - - - - - - - - - - h -',
    },
    // A new day: a soft bell rising to D.
    day: {
      lead: 'd5 . a5 . d6 . . . . . . .',
      harmony: '- - f5 . a5 . . . . . . .',
      bass: 'd3 . . . . . . . . . . .',
    },
    // A contract kept: a short fanfare.
    kept: {
      lead: 'd5 f5 a5 . d6 . . . c6 . d6 . . . . .',
      harmony: 'a4 . . . f5 . . . e5 . f5 . . . . .',
      bass: 'd3 . . . d3 . . . c3 . d3 . . . . .',
      drums: 'k - - - s - - - k - s - - - - -',
    },
    // The plague comes or comes back worse: a low tolling bell.
    relapse: {
      lead: 'a3 . . . . . . . a3 . . . . . . . d3 . . . . . . . . . . .',
      harmony: 'd3 . . . . . . . c#3 . . . . . . . d3 . . . . . . . . . . .',
      bass: 'd2 . . . . . . . bb1 . . . . . . . d2 . . . . . . . . . . .',
      drums: 'k - - - - - - - k - - - - - - - k - - - - - - - - - - -',
    },
    // The town cured: the minor turns to D major.
    win: {
      lead: 'd5 . f#5 . a5 . d6 . . . a5 . b5 . c#6 . d6 . . . . . . . . . . . . . . .',
      harmony: 'a4 . d5 . f#5 . a5 . . . f#5 . g5 . a5 . f#5 . . . . . . . . . . . . . . .',
      bass: 'd3 . . . . . . . g2 . . . a2 . . . d3 . . . . . . . d2 . . . . . . .',
      drums: 'k - - - s - - - k - - - s - s s k - - - - - - - - - - - - - - -',
    },
  },
};

/** Market day's midday crowd: the same tune's brighter, quicker cousin at 96 BPM, a jig over a driving bass. */
export const RUSH_SONG: Song = {
  bpm: 96,
  mix: { lead: 0.13, harmony: 0.06, bass: 0.24, drums: 0.2 },
  parts: {
    // Dm | C | Dm | G | Dm | C | G | Dm.
    rush: {
      lead: [
        'd5 . f5 a5 . f5 d5 . e5 f5 . e5 d5 . c5 .',
        'e5 . g5 e5 . c5 e5 . g5 . . . e5 . c5 .',
        'd5 . f5 a5 . f5 d5 . a5 . b5 . a5 . f5 .',
        'g5 . . . b5 . a5 . g5 . d5 . b4 . . .',
        'a5 . . . f5 . d5 . f5 a5 . f5 e5 . d5 .',
        'e5 . c5 . g4 . c5 . e5 . g5 . e5 . . .',
        'd5 . b4 . d5 . g5 . b5 . a5 . g5 . . .',
        'f5 . e5 . d5 . . . a4 . . . d5 . . .',
      ].join(' | '),
      harmony: [
        '- - f4 - - - a4 - - - f4 - - - a4 -',
        '- - e4 - - - g4 - - - e4 - - - g4 -',
        '- - f4 - - - a4 - - - f4 - - - a4 -',
        '- - d4 - - - b4 - - - d4 - - - b4 -',
        '- - f4 - - - a4 - - - f4 - - - a4 -',
        '- - e4 - - - g4 - - - e4 - - - g4 -',
        '- - d4 - - - b4 - - - d4 - - - b4 -',
        '- - f4 - - - a4 - - - d4 - - - - -',
      ].join(' | '),
      bass: [
        'd2 - d3 - d2 - d3 - a2 - d3 - a2 - d3 -',
        'c2 - c3 - c2 - c3 - g2 - c3 - g2 - c3 -',
        'd2 - d3 - d2 - d3 - a2 - d3 - a2 - d3 -',
        'g2 - g3 - g2 - g3 - d2 - g2 - b2 - g2 -',
        'd2 - d3 - d2 - d3 - a2 - d3 - a2 - d3 -',
        'c2 - c3 - c2 - c3 - g2 - c3 - e2 - c3 -',
        'g2 - g3 - g2 - g3 - d2 - g2 - b2 - g2 -',
        'd2 - d3 - a2 - d3 - d2 - - - d2 - - -',
      ].join(' | '),
      drums: 'k - h - s - h - k - h k s - h h | k - h - s - h - k h - h s - s h',
    },
  },
};

/** The sound effects, kept short and soft. */
export const sfx = sounds({
  /** The sickle cuts a ripe bed: an airy swish (with `pluck`). */
  swish: { wave: 'noise', freq: 9000, to: 3000, length: 0.12, volume: 0.14, gap: 100, vary: 0.1 },
  pluck: { wave: 'triangle', freq: 784, to: 700, length: 0.09, volume: 0.32, gap: 100, vary: 0.08 },
  /** The sickle clears a blighted bed: a duller rasp. */
  rasp: { wave: 'noise', freq: 1400, to: 500, length: 0.18, volume: 0.22, gap: 120, vary: 0.08 },
  /** Goods handed onto a table, into a cauldron or onto the shelf: a wooden thunk. */
  drop: { wave: 'triangle', freq: 220, to: 110, length: 0.08, volume: 0.45, gap: 90, vary: 0.06 },
  /** Goods picked up off a pallet: a small rising blip. */
  pickUp: { wave: 'pulse25', freq: 520, to: 780, length: 0.07, volume: 0.2, gap: 90, vary: 0.05 },
  /** A fine potion taken out in the gold window: a sparkly two-note chime. */
  fine: { wave: 'pulse12', freq: 1319, arp: [0, 7, 12], arpStep: 0.06, length: 0.26, volume: 0.22, gap: 150 },
  /** A refined good or potion done at a station in view: a bubble pop. */
  bubble: { wave: 'sine', freq: 300, to: 900, length: 0.08, volume: 0.32, gap: 250, vary: 0.15 },
  /** A handful of coins paid towards an upgrade: a tiny tick, pitched up as it fills. */
  pay: { wave: 'square', freq: 1200, length: 0.035, volume: 0.13, gap: 60 },
  /** An upgrade, craftsman, pixie route, recipe or build done: a bright arpeggio. */
  upgrade: { wave: 'pulse25', freq: 523, arp: [0, 4, 7, 12], arpStep: 0.07, length: 0.34, volume: 0.28, gap: 200 },
  /** Something thrown away from the hands: a short falling blip. */
  toss: { wave: 'square', freq: 600, to: 250, length: 0.1, volume: 0.18, gap: 80 },
  /** A potion handed over towards an order. */
  sell: { wave: 'square', freq: 1175, arp: [0, 5], arpStep: 0.04, length: 0.12, volume: 0.18, gap: 120 },
  /** An order filled: ka-ching. */
  served: { wave: 'pulse25', freq: 1047, arp: [0, 7, 12], arpStep: 0.04, length: 0.3, volume: 0.26, gap: 150 },
  /** The till emptied, a crate sold to the wagon: a coin cascade. */
  cascade: { wave: 'square', freq: 1047, arp: [0, 4, 7, 12, 16], arpStep: 0.04, length: 0.3, volume: 0.22, gap: 150 },
  /** A customer runs out of patience and walks off: a low falling "hmph". */
  hmph: { wave: 'triangle', freq: 392, to: 196, length: 0.3, attack: 0.03, volume: 0.42, gap: 250 },
  /** A contract missed at dusk: two low notes. */
  missed: { wave: 'triangle', freq: 220, arp: [0, -5], arpStep: 0.16, length: 0.34, volume: 0.42, gap: 500 },
  /** A market day's crowd comes in: a quick jingle. */
  rush: { wave: 'pulse25', freq: 880, arp: [0, 4, 7, 4, 12], arpStep: 0.05, length: 0.3, volume: 0.24, gap: 500 },
  /** The blight strikes a bed: a low wobbly buzz. */
  blight: { wave: 'sawtooth', freq: 110, to: 92, arp: [0, 1, 0, 1, 0, 1], arpStep: 0.05, length: 0.32, volume: 0.18, gap: 400 },
  /** A plague stage beaten or the Panacea unlocked: a hopeful bell. */
  plagueUp: { wave: 'sine', freq: 880, arp: [0, 7], arpStep: 0.14, length: 0.55, volume: 0.36, gap: 500 },
});

export type SfxName = Parameters<typeof sfx>[0];
