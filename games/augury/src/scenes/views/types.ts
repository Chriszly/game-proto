import type { Painter, Rect } from '../painter';

/** What a puzzle's view draws with and acts through; `r` is the board's area. */
export interface ViewCtx<S = any> {
  p: Painter;
  s: S;
  r: Rect;
  /** Makes a move: `change` changes the state and says whether it did (kept for Undo). */
  act: (change: (s: S) => boolean) => void;
  /** A picking sound, for taps that change nothing worth undoing. */
  tap: () => void;
  /** Asks for a redraw after a change outside `act`. */
  redraw: () => void;
}

/**
 * Draws one kind of puzzle and takes its input. `draw` registers tappable spots on the painter;
 * kinds you drag (Unjam, Path Link) also take the pointer's `down`, `move` and `up`.
 */
export interface PuzzleView<S = any> {
  draw(ctx: ViewCtx<S>): void;
  down?(ctx: ViewCtx<S>, x: number, y: number): void;
  move?(ctx: ViewCtx<S>, x: number, y: number): void;
  up?(ctx: ViewCtx<S>, x: number, y: number): void;
}

/** The biggest square cells, up to `max`, that fit `cols` x `rows` in a rect, and where the grid's top-left sits to centre it. */
export function fitGrid(r: Rect, cols: number, rows: number, max: number) {
  const cell = Math.floor(Math.min(r.w / cols, r.h / rows, max));
  return { cell, x: Math.round(r.x + (r.w - cell * cols) / 2), y: Math.round(r.y + (r.h - cell * rows) / 2) };
}
