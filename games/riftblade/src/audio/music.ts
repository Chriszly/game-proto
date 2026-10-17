import type { Part, Song } from '../../../../shared/audio';

/**
 * Riftblade's music: space-opera chiptune, one song per planet (Dune in D minor, Swamp in E minor
 * with a swing, Ice in B minor and sparse, Lava in C minor and heavy), a slow song for the hero
 * select, the star map and the trader, and the stings. Each planet's song has a `calm` part of its
 * own, and `tense` (ring waves, the elite arena), `boss` and `pad` (the level-up cards) parts
 * written once in D minor and moved into the planet's key. The bars below are eighth notes, eight
 * to a bar.
 */

const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const INDEX: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** Moves every note of a voice by `by` semitones. */
function transpose(text: string, by: number) {
  return text.replace(/\b([a-g])(#|b)?(\d)\b/g, (_m, n: string, acc: string | undefined, oct: string) => {
    const midi = 12 * (Number(oct) + 1) + INDEX[n] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + by;
    return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
}

/** Swings a voice for a song with three steps a beat: each pair of eighths becomes long-short. */
function swing(text: string, drums = false) {
  const tokens = text.split(/\s+/).filter((token) => token && token !== '|');
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const a = tokens[i];
    out.push(a, drums || a === '-' ? '-' : '.', tokens[i + 1] ?? '-');
  }
  return out.join(' ');
}

function mapPart(part: Part, fn: (text: string, drums: boolean) => string): Part {
  const out: Part = {};
  for (const [voice, text] of Object.entries(part) as [keyof Part, string][]) out[voice] = fn(text, voice === 'drums');
  return out;
}
const moved = (part: Part, by: number) => mapPart(part, (text, drums) => (drums ? text : transpose(text, by)));
const swung = (part: Part) => mapPart(part, (text, drums) => swing(text, drums));

// ---------------------------------------------------------------------------------------------
// The parts every planet shares, in D minor.

/** Ring waves closing in and the elite arena: a driving ostinato. */
const TENSE: Part = {
  lead: 'a4 a4 d5 a4 bb4 a4 g4 a4 | a4 a4 d5 a4 c5 bb4 a4 g4 | f4 f4 bb4 f4 g4 f4 e4 f4 | e4 e4 a4 e4 c#5 . e5 .',
  harmony: 'd4 . . . d4 . . . | d4 . . . e4 . . . | bb3 . . . bb3 . . . | a3 . . . c#4 . . .',
  bass: 'd2 d2 d3 d2 d2 d2 d3 d2 | d2 d2 d3 d2 c2 c2 c3 c2 | bb1 bb1 bb2 bb1 bb1 bb1 bb2 bb1 | a1 a1 a2 a1 a1 a1 c#2 e2',
  drums: 'k h s h k k s h | k h s h k k s s',
};

/** The planet's boss. */
const BOSS: Part = {
  lead:
    'd5 . . a4 d5 . f5 . | e5 . . c5 a4 . . . | d5 . . a4 d5 . g5 . | f5 . e5 . c#5 . a4 . | ' +
    'bb5 . a5 . g5 . f5 . | e5 . f5 . g5 . e5 . | f5 . e5 . d5 . c#5 . | d5 . a4 . d4 . - -',
  harmony:
    'a4 . . . a4 . . . | g4 . . . e4 . . . | a4 . . . bb4 . . . | a4 . . . e4 . . . | ' +
    'd5 . . . d5 . . . | c5 . . . c5 . . . | a4 . . . e4 . . . | f4 . . . a4 . . .',
  bass:
    'd2 d2 d3 d2 d2 d2 d3 d2 | c2 c2 c3 c2 a1 a1 a2 a1 | d2 d2 d3 d2 bb1 bb1 bb2 bb1 | a1 a1 a2 a1 a1 a1 a2 a1 | ' +
    'g1 g1 g2 g1 g1 g1 g2 g1 | c2 c2 c3 c2 c2 c2 c3 c2 | a1 a1 a2 a1 a1 a1 a2 c#2 | d2 d2 d3 d2 d2 . . .',
  drums: 'k h s h k k s h | k h s h k s s s',
};

/** Under the level-up cards: held chords. */
const PAD: Part = {
  lead: 'a4 . . . . . . . | g4 . . . . . . . | f4 . . . . . . . | e4 . . . . . . .',
  harmony: 'f4 . . . . . . . | e4 . . . . . . . | d4 . . . . . . . | c#4 . . . . . . .',
  bass: 'd2 . . . . . . . | c2 . . . . . . . | bb1 . . . . . . . | a1 . . . . . . .',
  drums: '- - h - - - h -',
};

const shared = (by: number) => ({ tense: moved(TENSE, by), boss: moved(BOSS, by), pad: moved(PAD, by) });

// ---------------------------------------------------------------------------------------------
// The planets

/** Dune world, D minor: a desert march. */
const DUNE: Song = {
  bpm: 152,
  steps: 2,
  parts: {
    calm: {
      lead:
        'd5 . a4 . d5 e5 f5 . | e5 . d5 . c5 . a4 . | bb4 . c5 . d5 . f5 e5 | d5 . . . a4 . . . | ' +
        'd5 . a4 . d5 e5 f5 g5 | a5 . g5 f5 e5 . c5 . | d5 . f5 . e5 . c5 e5 | d5 . . . - - - -',
      harmony:
        'f4 . . . a4 . . . | e4 . . . g4 . . . | d4 . . . f4 . . . | c#4 . . . e4 . . . | ' +
        'f4 . . . a4 . . . | f4 . . . c5 . . . | e4 . . . g4 . . . | f4 . . . d4 . . .',
      bass:
        'd2 . d3 d2 a2 . d3 a2 | c2 . c3 c2 g2 . c3 g2 | bb1 . bb2 bb1 f2 . bb2 f2 | a1 . a2 a1 e2 . a2 c#3 | ' +
        'd2 . d3 d2 a2 . d3 a2 | f2 . f3 f2 c3 . f3 c3 | c2 . c3 c2 g2 . c3 g2 | d2 . d3 d2 a2 . d3 a2',
      drums: 'k - h - s - h - | k - h k s - h h',
    },
    ...shared(0),
  },
};

/** Swamp world, E minor with a swing and a blue note. */
const SWAMP_CALM: Part = {
  lead:
    'e4 g4 a4 b4 . a4 g4 e4 | d4 . e4 . - - b3 . | e4 g4 a4 b4 . d5 b4 a4 | b4 . . . - - - - | ' +
    'g4 a4 b4 d5 . b4 a4 g4 | a4 . g4 . e4 . d4 . | e4 g4 a4 bb4 . a4 g4 d4 | e4 . . . - - - -',
  harmony:
    'g3 . . . b3 . . . | d4 . . . f#3 . . . | g3 . . . b3 . . . | b3 . . . d#4 . . . | ' +
    'g3 . . . b3 . . . | c4 . . . a3 . . . | g3 . . . b3 . . . | g3 . . . b3 . . .',
  bass:
    'e2 . b2 . e2 . g2 . | d2 . a2 . d2 . f#2 . | e2 . b2 . e2 . g2 . | b1 . f#2 . b1 . d#2 . | ' +
    'g2 . d2 . g2 . b2 . | a2 . e2 . a2 . c3 . | e2 . b2 . e2 . g2 . | e2 . b1 . e2 . . .',
  drums: 'k - h k s - h h',
};
const SWAMP_SHARED = shared(2);
const SWAMP: Song = {
  bpm: 150,
  steps: 3,
  waves: { lead: 'square' },
  mix: { lead: 0.13 },
  parts: {
    calm: swung(SWAMP_CALM),
    tense: swung(SWAMP_SHARED.tense),
    boss: swung(SWAMP_SHARED.boss),
    pad: swung(SWAMP_SHARED.pad),
  },
};

/** Ice world, B minor: sparse and glassy. */
const ICE: Song = {
  bpm: 156,
  steps: 2,
  waves: { lead: 'pulse12' },
  parts: {
    calm: {
      lead:
        'f#5 . . . b4 . . . | d5 . c#5 . b4 . . . | a4 . . . f#4 . . . | g4 . a4 . b4 . . . | ' +
        'f#5 . . . e5 . d5 . | e5 . . . c#5 . . . | d5 . c#5 . a4 . f#4 . | b4 . . . - - - -',
      harmony:
        'b3 - d4 - f#4 - d4 - | g3 - b3 - d4 - b3 - | d4 - f#4 - a4 - f#4 - | e3 - g3 - b3 - g3 - | ' +
        'b3 - d4 - f#4 - d4 - | a3 - c#4 - e4 - c#4 - | g3 - b3 - d4 - b3 - | f#3 - a#3 - c#4 - f#4 -',
      bass:
        'b1 . . . . . . . | g1 . . . . . . . | d2 . . . . . . . | e2 . . . . . . . | ' +
        'b1 . . . . . . . | a1 . . . . . . . | g1 . . . . . . . | f#1 . . . . . . .',
      drums: 'k - - - s - - - | k - - k s - - h',
    },
    ...shared(-3),
  },
};

/** Lava world, C minor: heavy chugs. */
const LAVA: Song = {
  bpm: 160,
  steps: 2,
  waves: { lead: 'square' },
  mix: { lead: 0.13, bass: 0.3 },
  parts: {
    calm: {
      lead:
        'c5 . . . g4 . c5 d5 | eb5 . d5 . c5 . g4 . | ab4 . . . bb4 . c5 . | g4 . . . - - - - | ' +
        'c5 . . . g4 . c5 eb5 | f5 . eb5 . d5 . bb4 . | c5 . d5 . eb5 . d5 b4 | c5 . . . - - - -',
      harmony:
        'eb4 . g4 . eb4 . g4 . | eb4 . g4 . eb4 . g4 . | c4 . eb4 . d4 . f4 . | d4 . g4 . b3 . d4 . | ' +
        'eb4 . g4 . eb4 . g4 . | ab4 . f4 . f4 . d4 . | eb4 . f4 . g4 . f4 . | eb4 . g4 . c4 . . .',
      bass:
        'c2 c2 c3 c2 c2 c2 bb1 c2 | c2 c2 c3 c2 c2 c2 bb1 c2 | ab1 ab1 ab2 ab1 bb1 bb1 bb2 bb1 | g1 g1 g2 g1 g1 g1 b1 g1 | ' +
        'c2 c2 c3 c2 c2 c2 bb1 c2 | f1 f1 f2 f1 bb1 bb1 bb2 bb1 | ab1 ab1 ab2 ab1 g1 g1 g2 g1 | c2 c2 c3 c2 c2 . . .',
      drums: 'k k s - k k s h',
    },
    ...shared(-2),
  },
};

/** One song per planet, by planet index (Dune, Swamp, Ice, Lava). */
export const PLANET_SONGS: readonly Song[] = [DUNE, SWAMP, ICE, LAVA];

// ---------------------------------------------------------------------------------------------
// Between fights

/** The hero select (`select`), the star map and events (`map`) and the trader (`shop`), at 90 BPM. */
export const MENU_SONG: Song = {
  bpm: 90,
  steps: 2,
  parts: {
    select: {
      lead:
        'd4 . g4 . . . a4 b4 | c5 . b4 . a4 . g4 . | e4 . a4 . . . b4 c5 | d5 . . . - - - - | ' +
        'd5 . g5 . . . f#5 e5 | d5 . c5 . b4 . a4 . | b4 . c5 . a4 . f#4 . | g4 . . . - - - -',
      harmony:
        'b3 . . . d4 . . . | c4 . . . e4 . . . | c4 . . . e4 . . . | f#4 . . . a4 . . . | ' +
        'b4 . . . d5 . . . | a4 . . . e4 . . . | g4 . . . d4 . . . | b3 . . . d4 . . .',
      bass:
        'g2 . . . d2 . . . | c2 . . . g2 . . . | a2 . . . e2 . . . | d2 . . . a2 . . . | ' +
        'g2 . . . d2 . . . | a2 . . . c2 . . . | e2 . . . d2 . . . | g2 . . . . . . .',
      drums: 'k - h - s - h -',
    },
    map: {
      lead:
        'b4 . . . e5 . . . | d5 . b4 . a4 . . . | g4 . . . a4 . b4 . | f#4 . . . . . . . | ' +
        'b4 . . . e5 . . . | g5 . f#5 . e5 . . . | d5 . b4 . c5 . a4 . | b4 . . . . . . .',
      harmony:
        'e4 - g4 - b4 - g4 - | d4 - f#4 - a4 - f#4 - | c4 - e4 - g4 - e4 - | b3 - d#4 - f#4 - d#4 - | ' +
        'e4 - g4 - b4 - g4 - | c4 - e4 - g4 - e4 - | a3 - c4 - e4 - c4 - | b3 - d#4 - f#4 - d#4 -',
      bass:
        'e2 . . . . . . . | d2 . . . . . . . | c2 . . . . . . . | b1 . . . . . . . | ' +
        'e2 . . . . . . . | c2 . . . . . . . | a1 . . . . . . . | b1 . . . . . . .',
      drums: 'k - - - h - - -',
    },
    shop: {
      lead:
        'f4 a4 c5 a4 bb4 . a4 . | g4 bb4 d5 bb4 a4 . f4 . | f4 a4 c5 f5 e5 . d5 . | c5 . a4 . g4 . . . | ' +
        'f4 a4 c5 a4 bb4 . a4 . | g4 bb4 d5 bb4 a4 . c5 . | d5 c5 bb4 a4 g4 . e4 . | f4 . . . - - - -',
      harmony:
        'a3 . c4 . a3 . c4 . | bb3 . d4 . bb3 . d4 . | a3 . c4 . bb3 . d4 . | g3 . c4 . e3 . c4 . | ' +
        'a3 . c4 . a3 . c4 . | bb3 . d4 . bb3 . d4 . | bb3 . d4 . g3 . c4 . | a3 . c4 . a3 . . .',
      bass:
        'f2 - c3 - f2 - c3 - | g2 - d3 - g2 - d3 - | f2 - c3 - bb1 - f2 - | c2 - g2 - c2 - e2 - | ' +
        'f2 - c3 - f2 - c3 - | g2 - d3 - g2 - d3 - | bb1 - f2 - c2 - g2 - | f2 - c3 - f2 - - -',
      drums: 'k - h - s - h h',
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Stings, played once over the music

export const STINGS: Song = {
  bpm: 150,
  parts: {
    /** The Lava boss falls: the crusade is won. */
    win: {
      lead: 'g4 - c5 - e5 - g5 . . . e5 - g5 . . . | c6 . . . . . . . . . . . - - - -',
      harmony: 'e4 - g4 - c5 - e5 . . . c5 - e5 . . . | g5 . . . . . . . . . . . - - - -',
      bass: 'c3 . . . . . . . g2 . . . . . . . | c2 . . . . . . . . . . . - - - -',
      drums: 'k - - - s - - - k - s - s s s s | k - - - - - - - - - - - - - - -',
    },
    /** The hero falls. */
    lose: {
      lead: 'e5 . . . d5 . . . c5 . . . b4 . . . | a4 . . . . . . . . . . . - - - -',
      harmony: 'c5 . . . b4 . . . a4 . . . g#4 . . . | e4 . . . . . . . . . . . - - - -',
      bass: 'a2 . . . . . . . g2 . . . . . . . | f2 . . . e2 . . . a1 . . . . . . .',
      drums: 'k - - - - - - - k - - - - - - - | k - - - - - - - - - - - - - - -',
    },
    /** A planet's boss falls, or the elite arena is won. */
    cleared: {
      lead: 'd5 - f#5 - a5 - d6 . . . a5 - d6 . . . | . . . . . . . . - - - - - - - -',
      harmony: 'a4 - d5 - f#5 - a5 . . . f#5 - a5 . . . | . . . . . . . . - - - - - - - -',
      bass: 'd3 . . . . . . . a2 . . . . . . . | d2 . . . . . . . - - - - - - - -',
      drums: 'k - - - k - - - s - s - s s s s | k - - - - - - - - - - - - - - -',
    },
    /** A new hero is unlocked. */
    unlock: {
      lead: 'c5 e5 g5 c6 e5 g5 c6 e6 | e6 . . . . . . . - - - - - - - -',
      harmony: '- - - - - - - - | g5 . . . . . . . - - - - - - - -',
      bass: 'c3 . . . . . . . | c2 . . . . . . . - - - - - - - -',
    },
  },
};
