import type { PuzzleDef } from '../kinds';
import { between, type Rand } from '../rng';

// Code Breaker: find a hidden row of four glyphs. Each guess scores how many glyphs stand in the
// right place and how many more are in the code but elsewhere. Running out of guesses fails it.

export const CODE_LENGTH = 4;
const GLYPHS = [4, 5, 6, 6] as const;
const GUESSES = [8, 8, 7, 6] as const;

export interface Guess {
  glyphs: number[];
  /** Glyphs in the right place. */
  exact: number;
  /** Glyphs in the code but in another place. */
  near: number;
}

export interface CodeState {
  /** How many glyphs (0 to `glyphs` - 1) the code is made of. */
  glyphs: number;
  code: number[];
  maxGuesses: number;
  guesses: Guess[];
  /** The guess being put together. */
  draft: number[];
  /** Places a hint has shown, with their glyph. */
  shown: boolean[];
}

export function score(code: number[], glyphs: number[]) {
  let exact = 0;
  const left: number[] = [];
  const rest: number[] = [];
  glyphs.forEach((g, i) => (g === code[i] ? exact++ : (left.push(code[i]), rest.push(g))));
  let near = 0;
  for (const g of rest) {
    const k = left.indexOf(g);
    if (k >= 0) near++, left.splice(k, 1);
  }
  return { exact, near };
}

export const code: PuzzleDef<CodeState> = {
  id: 'code',
  undo: false,
  limit: [90, 105, 120, 150],
  make(rand: Rand, level) {
    const glyphs = GLYPHS[level];
    const codeRow: number[] = [];
    // Easy codes never repeat a glyph; harder ones may.
    while (codeRow.length < CODE_LENGTH) {
      const g = between(rand, 0, glyphs - 1);
      if (level >= 2 || !codeRow.includes(g)) codeRow.push(g);
    }
    return { glyphs, code: codeRow, maxGuesses: GUESSES[level], guesses: [], draft: [], shown: Array(CODE_LENGTH).fill(false) };
  },
  solved: (s) => s.guesses.some((g) => g.exact === CODE_LENGTH),
  failed: (s) => s.guesses.length >= s.maxGuesses && !code.solved(s),
  canHint: (s) => s.shown.includes(false),
  hint(s) {
    const i = s.shown.indexOf(false);
    if (i < 0) return false;
    s.shown[i] = true;
    return true;
  },
};

/** Adds a glyph to the guess being put together. */
export function codeAdd(s: CodeState, glyph: number) {
  if (s.draft.length >= CODE_LENGTH || glyph >= s.glyphs) return false;
  s.draft.push(glyph);
  return true;
}

/** Takes the last glyph off the guess being put together. */
export function codeBack(s: CodeState) {
  return s.draft.pop() !== undefined;
}

/** Scores a full guess. */
export function codeGuess(s: CodeState) {
  if (s.draft.length !== CODE_LENGTH) return false;
  s.guesses.push({ glyphs: s.draft, ...score(s.code, s.draft) });
  s.draft = [];
  return true;
}
