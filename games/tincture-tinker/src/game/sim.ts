import { adjacent, collapse, findMatches, shuffle, swapped, validMoves, type Board, type Cell, type Tile } from './board';
import { MOVE_BONUS } from './orders';
import { filled, startOrder, tileMaker, type GameState } from './state';

/** One round of a swap's outcome: the tiles matched, then the board once the rest have fallen. */
export interface Step {
  cleared: (Cell & Tile)[];
  board: Board;
  /** The board had no moves left, so its tiles were shuffled. */
  shuffled?: boolean;
}

/**
 * Swaps two neighbouring tiles. A swap that makes no match doesn't count and returns null; one that
 * does spends a move, gathers every match and the cascades after it, and returns them step by step.
 */
export function trySwap(s: GameState, a: Cell, b: Cell): Step[] | null {
  if (s.phase !== 'play' || !adjacent(a, b)) return null;
  let board = swapped(s.board, a, b);
  if (findMatches(board).length === 0) return null;

  s.moves--;
  const newTile = tileMaker(s);
  const steps: Step[] = [];
  for (let matches = findMatches(board); matches.length > 0; matches = findMatches(board)) {
    const cleared = matches.map((c) => ({ ...c, ...board[c.row][c.col] }));
    for (const { kind } of cleared) s.got[kind]++;
    board = collapse(board, cleared, newTile);
    steps.push({ cleared, board });
  }
  if (validMoves(board).length === 0) {
    board = shuffle(board, newTile);
    steps.push({ cleared: [], board, shuffled: true });
  }
  s.board = board;

  if (filled(s)) {
    s.phase = 'sold';
    s.earned = s.current.price + s.moves * MOVE_BONUS;
    s.coins += s.earned;
    s.sold++;
    s.order++;
  } else if (s.moves === 0) {
    s.phase = 'failed';
  }
  return steps;
}

/** After a sale, the next order; after running out of moves, the same order again. */
export const nextOrder = (s: GameState) => startOrder({ order: s.order, coins: s.coins, sold: s.sold });
