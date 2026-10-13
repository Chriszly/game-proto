import Phaser from 'phaser';
import { kindTexture, potionTexture, TILE_SCALE } from '../art/items';
import { GOLD, LEAF, PARCHMENT, TABLE } from '../art/palette';
import { adjacent, COLS, inBoard, ROWS, validMoves, type Board, type Cell } from '../game/board';
import { KIND_NAMES, type Kind } from '../game/kinds';
import { MOVE_BONUS, POTION_NAMES } from '../game/orders';
import { loadProgress, saveProgress } from '../game/save';
import { nextOrder, trySwap, type Step } from '../game/sim';
import { progressOf, startOrder, type GameState } from '../game/state';
import { makeButton } from '../ui/Button';
import { BOARD, cellX, cellY, FONT, NEEDS, PANEL, UI_DEPTH, VIEW } from './layout';

/** Longest frame step, so a backgrounded tab doesn't skip the animations. */
const MAX_STEP_MS = 250;
const SWAP_MS = 140;
const CLEAR_MS = 200;
const FALL_MS = 240;
const SHUFFLE_MS = 400;
/** How long the board sits idle before two tiles that would match wiggle as a hint. */
const HINT_MS = 6000;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});
const inkStyle = (size: number) => ({ fontFamily: FONT, fontSize: `${size}px`, color: PARCHMENT.ink });

/** One piece of an animation, played in order: `step` gets 0 to 1 over `ms` of game time. */
interface Anim {
  ms: number;
  start?: () => void;
  step?: (k: number) => void;
  end?: () => void;
}

const ease = (k: number) => 1 - (1 - k) * (1 - k);

export class GameScene extends Phaser.Scene {
  /** The order being played; read by the playthrough test. */
  state!: GameState;
  /** True while a swap and its matches are being shown; taps wait until it is over. */
  busy = false;
  /** The tile picked by the first tap of a swap; read by the playthrough test. */
  selected: Cell | null = null;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private queue: Anim[] = [];
  private animAt = 0;
  private started = false;
  private clock = 0;
  private lastFrame: number | null = null;
  private idleMs = 0;
  private hint: number[] = [];
  private dragFrom: { cell: Cell; x: number; y: number } | null = null;
  /** The ingredient counts the panel shows, which catch up with the state as matches are shown. */
  private shown: Record<string, number> = {};
  private cursor!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Container;
  private needTexts = new Map<Kind, Phaser.GameObjects.Text>();
  private movesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private result!: Phaser.GameObjects.Container;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private resultButton!: Phaser.GameObjects.Container;

  constructor() {
    super('Game');
  }

  create() {
    this.drawTable();
    this.cursor = this.add.graphics().setDepth(UI_DEPTH - 10);
    this.bars = this.add.graphics().setDepth(1);
    this.createResult();
    this.begin(startOrder(loadProgress()));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.pointerMove(p));
    this.input.on('pointerup', () => (this.dragFrom = null));
  }

  update(time: number) {
    // Game time from the frame's own timestamp, so animations follow the browser's clock.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    this.runQueue(dt);
    this.updateHint(dt);
  }

  // ---- Playing an order ----

  /** Shows a new order on a new board. */
  private begin(state: GameState) {
    this.state = state;
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    this.queue = [];
    this.busy = false;
    this.selected = null;
    this.hint = [];
    this.idleMs = 0;
    this.shown = { ...state.got };
    state.board.forEach((row, r) =>
      row.forEach((tile, c) => this.sprites.set(tile.id, this.tileSprite(tile.kind, cellX(c), cellY(r)))),
    );
    this.result.setVisible(false);
    this.buildPanel();
    this.refresh();
  }

  private tileSprite(kind: Kind, x: number, y: number) {
    return this.add.image(x, y, kindTexture(kind)).setScale(TILE_SCALE).setDepth(2);
  }

  private cellAt(x: number, y: number): Cell | null {
    const cell = { col: Math.floor((x - BOARD.x) / BOARD.cell), row: Math.floor((y - BOARD.y) / BOARD.cell) };
    return inBoard(cell) ? cell : null;
  }

  /** A tap picks a tile, and a tap on its neighbour swaps the two. Tapping it again lets it go. */
  private pointerDown(p: Phaser.Input.Pointer) {
    const cell = this.cellAt(p.x, p.y);
    if (!cell || this.busy || this.state.phase !== 'play') return;
    this.dragFrom = { cell, x: p.x, y: p.y };
    const picked = this.selected;
    if (picked && adjacent(picked, cell)) this.swap(picked, cell);
    else this.selected = picked && picked.row === cell.row && picked.col === cell.col ? null : cell;
    this.drawCursor();
  }

  /** Dragging a tile half a cell towards a neighbour swaps them too. */
  private pointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragFrom || !p.isDown || this.busy) return;
    const dx = p.x - this.dragFrom.x;
    const dy = p.y - this.dragFrom.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < BOARD.cell / 2) return;
    const from = this.dragFrom.cell;
    const to = Math.abs(dx) > Math.abs(dy)
      ? { row: from.row, col: from.col + Math.sign(dx) }
      : { row: from.row + Math.sign(dy), col: from.col };
    this.dragFrom = null;
    if (inBoard(to)) this.swap(from, to);
  }

  private swap(a: Cell, b: Cell) {
    this.selected = null;
    this.clearHint();
    const idA = this.state.board[a.row][a.col].id;
    const idB = this.state.board[b.row][b.col].id;
    const steps = trySwap(this.state, a, b);
    this.busy = true;
    this.queue.push(this.slide([{ id: idA, from: a, to: b }, { id: idB, from: b, to: a }]));
    if (!steps) {
      // No match: the tiles slide back and no move is spent.
      this.queue.push(this.slide([{ id: idA, from: b, to: a }, { id: idB, from: a, to: b }]));
    } else {
      this.refreshMoves();
      for (const step of steps) this.playStep(step);
    }
    this.queue.push({ ms: 0, end: () => this.settle() });
  }

  /** Slides tiles from one cell to another, all at once. */
  private slide(tiles: { id: number; from: Cell; to: Cell }[]): Anim {
    return {
      ms: SWAP_MS,
      step: (k) => {
        for (const { id, from, to } of tiles) {
          this.sprites.get(id)!.setPosition(
            Phaser.Math.Linear(cellX(from.col), cellX(to.col), ease(k)),
            Phaser.Math.Linear(cellY(from.row), cellY(to.row), ease(k)),
          );
        }
      },
    };
  }

  /** Shows one round of a swap: the matched tiles pop, then the rest fall and new ones drop in. */
  private playStep(step: Step) {
    if (step.cleared.length > 0) {
      // Looked up when it starts: a cascade can match tiles that only drop in on an earlier step.
      let popping: Phaser.GameObjects.Image[] = [];
      this.queue.push({
        ms: CLEAR_MS,
        start: () => (popping = step.cleared.map((t) => this.sprites.get(t.id)!)),
        step: (k) => popping.forEach((s) => s.setScale(TILE_SCALE * (1 + 0.3 * k - 1.3 * k * k)).setAlpha(1 - k)),
        end: () => {
          for (const t of step.cleared) {
            this.sprites.get(t.id)?.destroy();
            this.sprites.delete(t.id);
            this.shown[t.kind] = (this.shown[t.kind] ?? 0) + 1;
          }
          this.refreshNeeds();
        },
      });
    }
    this.queue.push(this.moveTo(step.board, step.shuffled ? SHUFFLE_MS : FALL_MS));
  }

  /** Moves every tile to its cell on `board`; new tiles drop in from above the board. */
  private moveTo(board: Board, ms: number): Anim {
    const moves: { sprite: Phaser.GameObjects.Image; x0: number; y0: number; x1: number; y1: number }[] = [];
    return {
      ms,
      start: () => {
        for (let col = 0; col < COLS; col++) {
          const fresh = board.filter((row) => !this.sprites.has(row[col].id)).length;
          for (let row = 0; row < ROWS; row++) {
            const tile = board[row][col];
            let sprite = this.sprites.get(tile.id);
            if (!sprite) {
              sprite = this.tileSprite(tile.kind, cellX(col), cellY(row - fresh));
              this.sprites.set(tile.id, sprite);
            }
            moves.push({ sprite, x0: sprite.x, y0: sprite.y, x1: cellX(col), y1: cellY(row) });
          }
        }
      },
      step: (k) => {
        for (const m of moves) {
          m.sprite.setPosition(Phaser.Math.Linear(m.x0, m.x1, ease(k)), Phaser.Math.Linear(m.y0, m.y1, ease(k)));
          // Tiles above the board stay hidden until they drop onto it.
          m.sprite.setVisible(m.sprite.y > BOARD.y);
        }
      },
    };
  }

  /** Once a swap has played out: the panel catches up, and a filled order is sold. */
  private settle() {
    this.busy = false;
    this.shown = { ...this.state.got };
    this.refresh();
    const s = this.state;
    if (s.phase === 'sold') {
      saveProgress(progressOf(s));
      this.showResult(
        `${POTION_NAMES[s.current.potion]} sold!`,
        `+${s.current.price} coins, +${s.earned - s.current.price} for ${s.moves} moves left`,
        'Next order',
      );
    } else if (s.phase === 'failed') {
      this.showResult('Out of moves', `The ${POTION_NAMES[s.current.potion]} wasn't finished.`, 'Try again');
    }
  }

  private runQueue(dt: number) {
    let left = dt;
    while (this.queue.length > 0) {
      const anim = this.queue[0];
      if (!this.started) {
        anim.start?.();
        this.started = true;
        this.animAt = 0;
      }
      const need = anim.ms - this.animAt;
      if (left < need) {
        this.animAt += left;
        anim.step?.(this.animAt / anim.ms);
        return;
      }
      left -= need;
      anim.step?.(1);
      this.queue.shift();
      this.started = false;
      anim.end?.();
    }
  }

  // ---- Hints ----

  private updateHint(dt: number) {
    if (this.busy || this.state.phase !== 'play') return;
    this.idleMs += dt;
    if (this.idleMs < HINT_MS) return;
    if (this.hint.length === 0) {
      const [a, b] = validMoves(this.state.board)[0] ?? [];
      if (!a) return;
      this.hint = [this.state.board[a.row][a.col].id, this.state.board[b.row][b.col].id];
    }
    const wobble = Math.sin(this.clock / 90) * 0.12;
    for (const id of this.hint) this.sprites.get(id)?.setRotation(wobble);
  }

  private clearHint() {
    for (const id of this.hint) this.sprites.get(id)?.setRotation(0);
    this.hint = [];
    this.idleMs = 0;
  }

  // ---- Drawing ----

  private drawTable() {
    const g = this.add.graphics();
    g.fillStyle(TABLE.dark).fillRect(0, 0, VIEW.w, VIEW.h);
    const size = BOARD.cell * COLS;
    g.fillStyle(TABLE.frame).fillRect(BOARD.x - 10, BOARD.y - 10, size + 20, size + 20);
    g.fillStyle(TABLE.mid).fillRect(BOARD.x - 4, BOARD.y - 4, size + 8, size + 8);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        g.fillStyle((row + col) % 2 ? TABLE.cellA : TABLE.cellB)
          .fillRect(BOARD.x + col * BOARD.cell, BOARD.y + row * BOARD.cell, BOARD.cell, BOARD.cell);
      }
    }
    g.fillStyle(PARCHMENT.mid).fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    g.lineStyle(4, TABLE.frame).strokeRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    g.lineStyle(2, PARCHMENT.dark).strokeRect(PANEL.x + 8, PANEL.y + 8, PANEL.w - 16, PANEL.h - 16);
  }

  /** The order card: the potion asked for and a row for each ingredient it needs. */
  private buildPanel() {
    this.panel?.destroy();
    this.needTexts.clear();
    const s = this.state;
    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(PANEL.x + PANEL.w / 2, PANEL.y + 30, `Order ${s.current.number}`, inkStyle(26)).setOrigin(0.5),
      this.add.image(PANEL.x + 70, PANEL.y + 110, potionTexture(s.current.potion)).setScale(5),
      this.add.text(PANEL.x + 130, PANEL.y + 82, POTION_NAMES[s.current.potion], inkStyle(22)),
      this.add.text(PANEL.x + 130, PANEL.y + 114, `Pays ${s.current.price} coins`, inkStyle(16)),
      this.add.text(PANEL.x + 130, PANEL.y + 136, `+${MOVE_BONUS} per move left`, inkStyle(16)),
    ];
    Object.keys(s.current.needs).forEach((kind, i) => {
      const y = NEEDS.y + i * NEEDS.row;
      items.push(this.add.image(NEEDS.x, y, kindTexture(kind as Kind)).setScale(2));
      items.push(this.add.text(NEEDS.barX, y - 26, KIND_NAMES[kind as Kind], inkStyle(14)));
      const text = this.add.text(PANEL.x + PANEL.w - 24, y, '', inkStyle(18)).setOrigin(1, 0.5);
      this.needTexts.set(kind as Kind, text);
      items.push(text);
    });
    this.movesText = this.add.text(PANEL.x + 24, PANEL.y + PANEL.h - 60, '', inkStyle(24));
    this.coinsText = this.add.text(PANEL.x + PANEL.w - 24, PANEL.y + PANEL.h - 56, '', inkStyle(20)).setOrigin(1, 0);
    const coin = this.add.image(PANEL.x + PANEL.w - 24, PANEL.y + PANEL.h - 44, 'coin').setScale(2);
    items.push(this.movesText, this.coinsText, coin);
    this.panel = this.add.container(0, 0, items).setDepth(1);
    this.coinIcon = coin;
  }

  private refresh() {
    this.refreshNeeds();
    this.refreshMoves();
    this.coinsText.setText(`${this.state.coins}`);
    this.coinIcon.setX(this.coinsText.x - this.coinsText.width - 18);
    this.drawCursor();
  }

  private refreshMoves() {
    this.movesText.setText(`Moves ${this.state.moves}`).setColor(this.state.moves <= 3 ? '#b8343f' : PARCHMENT.ink);
  }

  private refreshNeeds() {
    this.bars.clear();
    Object.entries(this.state.current.needs).forEach(([kind, n], i) => {
      const have = Math.min(this.shown[kind] ?? 0, n);
      const y = NEEDS.y + i * NEEDS.row;
      this.needTexts.get(kind as Kind)!.setText(`${have}/${n}`);
      this.bars.fillStyle(PARCHMENT.dark).fillRect(NEEDS.barX, y - 4, NEEDS.barW, NEEDS.barH);
      this.bars.fillStyle(have >= n ? LEAF.light : GOLD.mid).fillRect(NEEDS.barX, y - 4, (NEEDS.barW * have) / n, NEEDS.barH);
    });
  }

  private drawCursor() {
    this.cursor.clear();
    if (!this.selected) return;
    const { row, col } = this.selected;
    this.cursor.lineStyle(4, GOLD.shine).strokeRect(BOARD.x + col * BOARD.cell + 2, BOARD.y + row * BOARD.cell + 2, BOARD.cell - 4, BOARD.cell - 4);
  }

  // ---- After an order ----

  private createResult() {
    const size = BOARD.cell * COLS;
    const cx = BOARD.x + size / 2;
    const cy = BOARD.y + size / 2;
    const bg = this.add.rectangle(0, 0, size - 40, 200, 0x1b1410, 0.92).setStrokeStyle(3, GOLD.mid);
    this.resultTitle = this.add.text(0, -60, '', textStyle(28, '#f3c64e')).setOrigin(0.5);
    this.resultText = this.add.text(0, -14, '', textStyle(16)).setOrigin(0.5).setWordWrapWidth(size - 80).setAlign('center');
    this.resultButton = makeButton(this, 0, 50, '', () => this.begin(nextOrder(this.state)));
    this.result = this.add.container(cx, cy, [bg, this.resultTitle, this.resultText, this.resultButton]).setDepth(UI_DEPTH);
  }

  private showResult(title: string, text: string, button: string) {
    this.resultTitle.setText(title);
    this.resultText.setText(text);
    (this.resultButton.list[1] as Phaser.GameObjects.Text).setText(button);
    this.result.setVisible(true);
  }
}
