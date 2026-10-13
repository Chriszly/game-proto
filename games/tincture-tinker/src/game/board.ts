import { randomKind, type Kind } from './kinds';

// The 8x8 board of ingredient tiles, as rows from the top. Every tile has an id so the scene can
// follow it as it falls.

export const ROWS = 8;
export const COLS = 8;

export interface Tile {
  id: number;
  kind: Kind;
}
export type Board = Tile[][];
export interface Cell {
  row: number;
  col: number;
}
export type NewTile = () => Tile;

export const adjacent = (a: Cell, b: Cell) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
export const inBoard = (c: Cell) => c.row >= 0 && c.row < ROWS && c.col >= 0 && c.col < COLS;

/** A copy of the board with the tiles at `a` and `b` swapped. */
export function swapped(board: Board, a: Cell, b: Cell): Board {
  const next = board.map((row) => [...row]);
  next[a.row][a.col] = board[b.row][b.col];
  next[b.row][b.col] = board[a.row][a.col];
  return next;
}

/** Every cell in a row or column of three or more of the same kind. */
export function findMatches(board: Board): Cell[] {
  const hit = new Set<number>();
  const mark = (row: number, col: number) => hit.add(row * COLS + col);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; ) {
      let end = col + 1;
      while (end < COLS && board[row][end].kind === board[row][col].kind) end++;
      if (end - col >= 3) for (let c = col; c < end; c++) mark(row, c);
      col = end;
    }
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; ) {
      let end = row + 1;
      while (end < ROWS && board[end][col].kind === board[row][col].kind) end++;
      if (end - row >= 3) for (let r = row; r < end; r++) mark(r, col);
      row = end;
    }
  }
  return [...hit].sort((a, b) => a - b).map((i) => ({ row: Math.floor(i / COLS), col: i % COLS }));
}

/** Every swap of neighbours that makes a match. */
export function validMoves(board: Board): [Cell, Cell][] {
  const moves: [Cell, Cell][] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const a = { row, col };
      for (const b of [{ row, col: col + 1 }, { row: row + 1, col }]) {
        if (inBoard(b) && findMatches(swapped(board, a, b)).length > 0) moves.push([a, b]);
      }
    }
  }
  return moves;
}

/** Takes the cleared cells out, lets the tiles above fall and drops new ones in at the top. */
export function collapse(board: Board, cleared: Cell[], newTile: NewTile): Board {
  const gone = new Set(cleared.map((c) => c.row * COLS + c.col));
  const next: Board = Array.from({ length: ROWS }, () => new Array<Tile>(COLS));
  for (let col = 0; col < COLS; col++) {
    let row = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) if (!gone.has(r * COLS + col)) next[row--][col] = board[r][col];
    for (; row >= 0; row--) next[row][col] = newTile();
  }
  return next;
}

/** A new board with no matches on it and at least one move to make. */
export function freshBoard(newTile: NewTile): Board {
  for (;;) {
    const board: Board = [];
    for (let row = 0; row < ROWS; row++) {
      board.push([]);
      for (let col = 0; col < COLS; col++) {
        let tile = newTile();
        const left = col >= 2 && board[row][col - 1].kind === board[row][col - 2].kind ? board[row][col - 1].kind : null;
        const up = row >= 2 && board[row - 1][col].kind === board[row - 2][col].kind ? board[row - 1][col].kind : null;
        while (tile.kind === left || tile.kind === up) tile = { ...tile, kind: randomKind() };
        board[row].push(tile);
      }
    }
    if (validMoves(board).length > 0) return board;
  }
}

/** The same tiles in new places, with no matches and at least one move; a fresh board if that fails. */
export function shuffle(board: Board, newTile: NewTile): Board {
  const tiles = board.flat();
  for (let attempt = 0; attempt < 100; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const next = Array.from({ length: ROWS }, (_, row) => tiles.slice(row * COLS, (row + 1) * COLS));
    if (findMatches(next).length === 0 && validMoves(next).length > 0) return next;
  }
  return freshBoard(newTile);
}
