import type { PuzzleDef } from '../kinds';
import { between, type Rand } from '../rng';

// Memory Echo: glyphs turn up one at a time; for each one, say whether it is the same as the one
// `back` steps before. A step left unanswered counts as "different". Enough right answers solve
// it; too few fail it. Hints can't help here.

const BACK = [1, 2, 2, 3] as const;
const STEP_MS = [2200, 2200, 1900, 1900] as const;
/** Steps that are asked about, after the first `back`. */
const ASKED = 10;
/** The share of asked steps that must be answered right. */
export const ECHO_PASS = 0.75;
const GLYPHS = 6;

export interface EchoState {
  back: number;
  stepMs: number;
  seq: number[];
  /** The step shown (index into `seq`), and how long it has been up. */
  step: number;
  ms: number;
  /** The answer given for each step: true same, false different, null none (yet). */
  answers: (boolean | null)[];
  done: boolean;
}

/** Whether a step's glyph is the same as the one `back` steps before. */
export const isSame = (s: EchoState, step: number) => step >= s.back && s.seq[step] === s.seq[step - s.back];

/** Right answers so far, and how many steps have been asked. */
export function echoScore(s: EchoState) {
  let right = 0;
  let asked = 0;
  const last = s.done ? s.seq.length : s.step;
  for (let i = s.back; i < last; i++) {
    asked++;
    if ((s.answers[i] ?? false) === isSame(s, i)) right++;
  }
  return { right, asked };
}

export const echo: PuzzleDef<EchoState> = {
  id: 'echo',
  undo: false,
  limit: [60, 60, 60, 60],
  make(rand: Rand, level) {
    const back = BACK[level];
    const seq: number[] = [];
    const n = back + ASKED;
    for (let i = 0; i < n; i++) {
      // About a third of the asked steps repeat the glyph from `back` steps before.
      if (i >= back && rand() < 0.36) seq.push(seq[i - back]);
      else {
        let g = between(rand, 0, GLYPHS - 1);
        if (i >= back && g === seq[i - back]) g = (g + 1) % GLYPHS;
        seq.push(g);
      }
    }
    return { back, stepMs: STEP_MS[level], seq, step: 0, ms: 0, answers: seq.map(() => null), done: false };
  },
  solved: (s) => s.done && echoScore(s).right >= Math.ceil(ECHO_PASS * (s.seq.length - s.back)),
  failed: (s) => s.done && !echo.solved(s),
  hint: () => false,
  tick(s, dt) {
    if (s.done) return;
    s.ms += dt;
    while (s.ms >= s.stepMs && !s.done) {
      s.ms -= s.stepMs;
      s.step++;
      if (s.step >= s.seq.length) s.done = true;
    }
  },
};

/** Answers the step on show; once per step. */
export function echoAnswer(s: EchoState, same: boolean) {
  if (s.done || s.step < s.back || s.answers[s.step] !== null) return false;
  s.answers[s.step] = same;
  return true;
}
