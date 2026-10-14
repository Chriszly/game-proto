import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { BROWN, MOSS, num, OCHRE, RUST, SEPIA } from '../art/nouveau';
import { kindTexture, needTexture, POTION_ORIGIN, potionTexture, TOOL_PAD, toolTexture } from '../art/textures';
import { adjacent, COLS, inBoard, ROWS, validMoves, type Board, type Cell, type Tile } from '../game/board';
import { KIND_NAMES, type Kind } from '../game/kinds';
import { MOVE_BONUS, POTION_NAMES } from '../game/orders';
import { RANKS, rankOf, starsFor, STARS_2, STARS_3 } from '../game/ranks';
import { loadProgress, saveProgress } from '../game/save';
import { canUse, nextOrder, sift, stir, TOOLS, trySwap, type Step, type Tool } from '../game/sim';
import { progressOf, startOrder, type GameState } from '../game/state';
import { makeButton } from '../ui/Button';
import { BOARD, CAPTION, cellX, cellY, NEEDS, PANEL, RIBBON, SERIF, TOOL, UI_DEPTH } from './layout';

/** Longest frame step, so a backgrounded tab doesn't skip the animations. */
const MAX_STEP_MS = 250;
const SWAP_MS = 140;
const CLEAR_MS = 200;
const FALL_MS = 240;
const SHUFFLE_MS = 400;
/** How long a sifted row takes to fade out and grow back. */
const SIFT_MS = 220;
/** How long the board sits idle before two tiles that would match swell as a hint. */
const HINT_MS = 6000;

/** Draw order: the table, catalyst row bands, the cursor, catalysts (whose rays sit under their neighbours), tiles, the panel. */
const DEPTH = { band: 1.5, cursor: 1.8, catalyst: 1.9, tile: 2, panel: 3 };

const CAPTION_TIP = 'Catalyst: a match of four brews one; match it to clear its whole row';
const CAPTION_SIFT = `Sift: tap a row to reroll it for ${TOOLS.sift.cost} coins, or tap Sift again to put it away`;

/** A serif text style in the label's inks. */
const ink = (size: number, color = SEPIA, fontStyle = '') => ({ fontFamily: SERIF, fontSize: `${size}px`, fontStyle, color, resolution: 2 });

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
  /** True while Sift is picked up and waiting for a tap on the row to reroll. */
  sifting = false;
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
  private cursor!: Phaser.GameObjects.Image;
  private bands: Phaser.GameObjects.Image[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Container;
  private needTexts = new Map<Kind, Phaser.GameObjects.Text>();
  private movesText!: Phaser.GameObjects.Text;
  private starIcons: Phaser.GameObjects.Image[] = [];
  private ruleText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private tools = new Map<Tool, Phaser.GameObjects.Image>();
  private rankBar!: Phaser.GameObjects.Graphics;
  private rankTitle!: Phaser.GameObjects.Text;
  private rankCount!: Phaser.GameObjects.Text;
  private rankNext!: Phaser.GameObjects.Text;
  private caption!: Phaser.GameObjects.Graphics;
  private captionText!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Container;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private resultRank!: Phaser.GameObjects.Text;
  private resultStars: Phaser.GameObjects.Image[] = [];
  private resultButton!: Phaser.GameObjects.Container;

  constructor() {
    super('Game');
  }

  create() {
    this.add.image(0, 0, 'table').setOrigin(0);
    this.cursor = this.add.image(0, 0, 'cursor').setDepth(DEPTH.cursor).setVisible(false);
    this.bars = this.add.graphics().setDepth(DEPTH.panel);
    this.createRibbon();
    this.createFooter();
    this.createTools();
    this.createCaption();
    this.createResult();
    this.begin(startOrder(loadProgress()));

    // A tap on a button (a bench tool or the result card's) is the button's alone, not also a tap on the board.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.pointerDown(p);
    });
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
    this.sifting = false;
    this.hint = [];
    this.idleMs = 0;
    this.shown = { ...state.got };
    state.board.forEach((row, r) => row.forEach((tile, c) => this.sprites.set(tile.id, this.tileSprite(tile, cellX(c), cellY(r)))));
    this.result.setVisible(false);
    this.buildPanel();
    this.refresh();
  }

  private tileSprite(tile: Tile, x: number, y: number) {
    return this.add.image(x, y, kindTexture(tile.kind, tile.catalyst)).setDepth(tile.catalyst ? DEPTH.catalyst : DEPTH.tile);
  }

  private cellAt(x: number, y: number): Cell | null {
    const cell = { col: Math.floor((x - BOARD.x) / BOARD.cell), row: Math.floor((y - BOARD.y) / BOARD.cell) };
    return inBoard(cell) ? cell : null;
  }

  /** A tap picks a tile, and a tap on its neighbour swaps the two. Tapping it again lets it go. */
  private pointerDown(p: Phaser.Input.Pointer) {
    const cell = this.cellAt(p.x, p.y);
    if (!cell || this.busy || this.state.phase !== 'play') return;
    if (this.sifting) {
      this.siftRow(cell.row);
      return;
    }
    this.dragFrom = { cell, x: p.x, y: p.y };
    const picked = this.selected;
    if (picked && adjacent(picked, cell)) this.swap(picked, cell);
    else this.selected = picked && picked.row === cell.row && picked.col === cell.col ? null : cell;
    this.drawCursor();
  }

  /** Dragging a tile half a cell towards a neighbour swaps them too. */
  private pointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragFrom || !p.isDown || this.busy || this.state.phase !== 'play') return;
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
    // A held second tap of a tap-tap swap must not drag a second swap once the board settles.
    this.dragFrom = null;
    this.selected = null;
    this.clearHint();
    const idA = this.state.board[a.row][a.col].id;
    const idB = this.state.board[b.row][b.col].id;
    const steps = trySwap(this.state, a, b);
    this.busy = true;
    this.showBands(false);
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

  /**
   * Shows one round of a swap: a fired Catalyst's row lights up, the matched tiles pop while any
   * brewed Catalyst gets its halo, then the rest fall and new ones drop in.
   */
  private playStep(step: Step) {
    if (step.cleared.length > 0) {
      // Looked up when it starts: a cascade can match tiles that only drop in on an earlier step.
      let popping: Phaser.GameObjects.Image[] = [];
      let brewing: Phaser.GameObjects.Image[] = [];
      let flash: Phaser.GameObjects.Image[] = [];
      this.queue.push({
        ms: step.rows.length > 0 ? CLEAR_MS * 1.5 : CLEAR_MS,
        start: () => {
          popping = step.cleared.map((t) => this.sprites.get(t.id)!);
          brewing = step.brewed.map((t) => this.sprites.get(t.id)!.setTexture(kindTexture(t.kind, true)).setDepth(DEPTH.catalyst));
          flash = step.rows.map((row) => this.bandAt(row));
        },
        step: (k) => {
          popping.forEach((s) => s.setScale(1 + 0.3 * k - 1.3 * k * k).setAlpha(1 - k));
          brewing.forEach((s) => s.setScale(settings.reduceMotion ? 1 : 1 + 0.25 * Math.sin(Math.PI * k)));
          // With reduced motion the lit row holds steady instead of blinking.
          flash.forEach((b) => b.setAlpha(settings.reduceMotion ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(k * Math.PI * 2))));
        },
        end: () => {
          flash.forEach((b) => b.destroy());
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
        // A shuffle that falls back to a fresh board replaces every tile, so drop the old sprites.
        const ids = new Set(board.flat().map((t) => t.id));
        for (const [id, sprite] of this.sprites) if (!ids.has(id)) (sprite.destroy(), this.sprites.delete(id));
        for (let col = 0; col < COLS; col++) {
          const fresh = board.filter((row) => !this.sprites.has(row[col].id)).length;
          for (let row = 0; row < ROWS; row++) {
            const tile = board[row][col];
            let sprite = this.sprites.get(tile.id);
            if (!sprite) {
              sprite = this.tileSprite(tile, cellX(col), cellY(row - fresh));
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
      this.showSold();
    } else if (s.phase === 'failed') {
      this.showResult('Out of moves', `The ${POTION_NAMES[s.current.potion]} wasn't finished.`, 'No stars this time.', 'Try again', 0);
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

  // ---- Bench tools ----

  private useTool(tool: Tool) {
    if (this.busy || this.state.phase !== 'play') return;
    if (tool === 'sift' && this.sifting) {
      this.sifting = false;
    } else if (!canUse(this.state, tool)) {
      return;
    } else if (tool === 'stir') {
      stir(this.state);
      saveProgress(progressOf(this.state));
      this.pulse(this.movesText);
    } else {
      this.sifting = true;
      this.selected = null;
    }
    this.clearHint();
    this.refresh();
  }

  /** Sift: the row's tiles fade out and new ones grow in their place. */
  private siftRow(row: number) {
    const before = this.state.board.map((r) => r.map((t) => t.id));
    const old = sift(this.state, row);
    this.sifting = false;
    if (!old) return this.refresh();
    saveProgress(progressOf(this.state));
    this.clearHint();
    this.busy = true;
    this.showBands(false);
    this.refresh();
    const board = this.state.board;
    let fading: Phaser.GameObjects.Image[] = [];
    let growing: Phaser.GameObjects.Image[] = [];
    this.queue.push({
      ms: SIFT_MS,
      start: () => (fading = old.map((t) => this.sprites.get(t.id)!).filter(Boolean)),
      step: (k) => fading.forEach((s) => s.setScale(1 - 0.6 * k).setAlpha(1 - k)),
      end: () => old.forEach((t) => (this.sprites.get(t.id)?.destroy(), this.sprites.delete(t.id))),
    });
    this.queue.push({
      ms: SIFT_MS,
      start: () => {
        board[row].forEach((tile, col) => {
          if (this.sprites.has(tile.id)) return;
          const sprite = this.tileSprite(tile, cellX(col), cellY(row)).setScale(0);
          this.sprites.set(tile.id, sprite);
          growing.push(sprite);
        });
      },
      step: (k) => growing.forEach((s) => s.setScale(ease(k))),
    });
    // If the reroll had to shuffle the board to leave a move, the other tiles move too.
    if (board.some((r, i) => i !== row && r.some((t, c) => t.id !== before[i][c]))) this.queue.push(this.moveTo(board, SHUFFLE_MS));
    this.queue.push({ ms: 0, end: () => this.settle() });
  }

  /** A little swell on a piece of text that just changed (held still with reduced motion). */
  private pulse(target: Phaser.GameObjects.Text) {
    if (settings.reduceMotion) return;
    this.tweens.add({ targets: target, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Quad.easeOut' });
  }

  // ---- Hints ----

  private updateHint(dt: number) {
    if (this.busy || this.sifting || this.state.phase !== 'play') return;
    this.idleMs += dt;
    if (this.idleMs < HINT_MS) return;
    if (this.hint.length === 0) {
      const [a, b] = validMoves(this.state.board)[0] ?? [];
      if (!a) return;
      this.hint = [this.state.board[a.row][a.col].id, this.state.board[b.row][b.col].id];
    }
    // The two tiles swell and settle; with reduced motion they hold still, a little larger.
    const swell = settings.reduceMotion ? 1.14 : 1.08 + Math.sin(this.clock / 110) * 0.08;
    for (const id of this.hint) this.sprites.get(id)?.setScale(swell);
  }

  private clearHint() {
    for (const id of this.hint) this.sprites.get(id)?.setScale(1);
    this.hint = [];
    this.idleMs = 0;
  }

  // ---- Drawing ----

  /** The rank ribbon above the board: the rank, a bar of stars towards the next and what it unlocks. */
  private createRibbon() {
    const y = RIBBON.y + RIBBON.h / 2;
    this.rankTitle = this.add.text(RIBBON.x + 29, y, '', ink(13, SEPIA, 'italic bold')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
    this.rankBar = this.add.graphics().setDepth(DEPTH.panel);
    this.rankCount = this.add.text(0, y, '', ink(11, RUST, 'bold')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
    this.rankNext = this.add.text(0, y, '', ink(10, BROWN, 'italic')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
  }

  /** Moves, the stars they are worth now, and the coins, along the bottom of the order panel. */
  private createFooter() {
    this.movesText = this.add.text(560, 464, '', ink(25, SEPIA, 'bold')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
    for (let k = 0; k < 3; k++) this.starIcons.push(this.add.image(709 + k * 25, 462, 'star-off').setDepth(DEPTH.panel));
    this.ruleText = this.add.text(560, 490, '', ink(11, RUST, 'italic')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
    this.coinIcon = this.add.image(852, 465, 'coin').setDepth(DEPTH.panel);
    this.coinsText = this.add.text(906, 466, '', ink(21, SEPIA, 'bold')).setOrigin(1, 0.5).setDepth(DEPTH.panel);
  }

  private createTools() {
    (['stir', 'sift'] as Tool[]).forEach((tool, i) => {
      const button = this.add
        .image(TOOL.x + i * TOOL.gap - TOOL_PAD, TOOL.y - TOOL_PAD, toolTexture(tool, 'on'))
        .setOrigin(0)
        .setDepth(DEPTH.panel)
        .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(TOOL_PAD, TOOL_PAD, TOOL.w, TOOL.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      button.on('pointerdown', () => this.useTool(tool));
      this.tools.set(tool, button);
    });
  }

  private createCaption() {
    this.caption = this.add.graphics().setDepth(DEPTH.panel);
    this.add.image(CAPTION.x + 13, CAPTION.y + CAPTION.h / 2, 'sun').setDepth(DEPTH.panel);
    this.captionText = this.add.text(CAPTION.x + 25, CAPTION.y + CAPTION.h / 2, '', ink(11, SEPIA, 'italic')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
  }

  /** The order card: the potion asked for and a row for each ingredient it needs. */
  private buildPanel() {
    this.panel?.destroy();
    this.needTexts.clear();
    const s = this.state;
    const mid = PANEL.x + PANEL.w / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(mid, 62, `Order ${s.current.number}`, ink(28, SEPIA, 'bold')).setOrigin(0.5),
      this.add.image(606, 145, potionTexture(s.current.potion)).setOrigin(POTION_ORIGIN.x, POTION_ORIGIN.y),
      this.add.text(606, 164.5, `No. ${s.current.number}`, ink(9, RUST, 'italic bold')).setOrigin(0.5),
      this.add.text(666, 124, POTION_NAMES[s.current.potion], ink(22, SEPIA, 'italic bold')).setOrigin(0, 0.5),
      this.add.text(666, 152, `Pays ${s.current.price} coins`, ink(15, BROWN)).setOrigin(0, 0.5),
      this.add.text(666, 174, `+${MOVE_BONUS} per move left`, ink(15, BROWN)).setOrigin(0, 0.5),
    ];
    Object.keys(s.current.needs).forEach((kind, i) => {
      const y = NEEDS.y + i * NEEDS.row;
      items.push(this.add.image(NEEDS.x, y, needTexture(kind as Kind)));
      items.push(this.add.text(NEEDS.barX, y - 17, KIND_NAMES[kind as Kind], ink(13, BROWN, 'italic bold')).setOrigin(0, 0.5));
      const text = this.add.text(906, y + 2, '', ink(18, SEPIA, 'bold')).setOrigin(1, 0.5);
      this.needTexts.set(kind as Kind, text);
      items.push(text);
    });
    this.panel = this.add.container(0, 0, items).setDepth(DEPTH.panel);
  }

  private refresh() {
    this.refreshNeeds();
    this.refreshMoves();
    this.refreshRank();
    this.refreshTools();
    this.coinsText.setText(`${this.state.coins}`);
    this.coinIcon.setX(this.coinsText.x - this.coinsText.width - 18);
    this.setCaption(this.sifting ? CAPTION_SIFT : CAPTION_TIP);
    this.drawCursor();
    if (!this.busy) this.showBands(true);
  }

  /** The moves left, lit with the stars a sale would earn now, and what keeps the next star. */
  private refreshMoves() {
    const s = this.state;
    this.movesText.setText(`Moves ${s.moves}`).setColor(s.moves <= 3 && s.phase === 'play' ? '#a8352a' : SEPIA);
    const lit = s.phase === 'sold' ? s.orderStars : s.phase === 'failed' ? 0 : starsFor(s.moves);
    this.starIcons.forEach((icon, k) => icon.setTexture(k < lit ? 'star-on' : 'star-off'));
    this.ruleText.setText(
      lit === 3 ? `3 stars at ${STARS_3}+ moves left` : lit === 2 ? `2 stars at ${STARS_2}+ moves left` : '1 star for any sale',
    );
  }

  private refreshNeeds() {
    this.bars.clear();
    Object.entries(this.state.current.needs).forEach(([kind, n], i) => {
      const have = Math.min(this.shown[kind] ?? 0, n);
      const y = NEEDS.y + i * NEEDS.row;
      const done = have >= n;
      this.needTexts.get(kind as Kind)!.setText(`${have}/${n}`).setColor(done ? '#3d6a32' : SEPIA);
      this.bar(NEEDS.barX - 1.5, y - 5.5, NEEDS.barW + 3, NEEDS.barH + 3, have / n, done ? MOSS : OCHRE, this.bars);
    });
  }

  /** A rounded progress bar: a pale track with a sepia rim and a fill with a light streak. */
  private bar(x: number, y: number, w: number, h: number, f: number, fill: string, g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xe3d3ad).fillRoundedRect(x, y, w, h, h / 2);
    g.lineStyle(1.5, num(SEPIA)).strokeRoundedRect(x, y, w, h, h / 2);
    if (f <= 0) return;
    const fw = Math.max(h - 3, (w - 3) * Math.min(1, f));
    g.fillStyle(num(fill)).fillRoundedRect(x + 1.5, y + 1.5, fw, h - 3, (h - 3) / 2);
    if (fw > 10) g.fillStyle(0xfffae6, 0.55).fillRoundedRect(x + 5, y + h * 0.3, fw - 8, Math.max(1.5, h * 0.15), 1);
  }

  private refreshRank() {
    const stars = this.state.stars;
    const at = rankOf(stars);
    const next = RANKS[at + 1];
    this.rankTitle.setText(RANKS[at].title);
    const barX = Math.max(RIBBON.barX, this.rankTitle.x + this.rankTitle.width + 10);
    this.rankBar.clear();
    this.bar(barX, RIBBON.y + 7.5, RIBBON.barW, 8, next ? stars / next.stars : 1, OCHRE, this.rankBar);
    this.rankCount.setText(next ? `${stars}/${next.stars}` : `${stars}`).setX(barX + RIBBON.barW + 7);
    this.rankNext
      .setText(next ? `Next: ${next.title}: a new recipe` : 'Every recipe unlocked')
      .setX(this.rankCount.x + this.rankCount.width + 9);
  }

  private refreshTools() {
    for (const [tool, button] of this.tools) {
      const look = tool === 'sift' && this.sifting ? 'armed' : canUse(this.state, tool) ? 'on' : 'off';
      button.setTexture(toolTexture(tool, look));
    }
  }

  private setCaption(text: string) {
    if (this.captionText.text === text) return;
    this.captionText.setText(text);
    const w = this.captionText.width + 38;
    this.caption.clear();
    this.caption.fillStyle(0xf1e6c8).fillRoundedRect(CAPTION.x, CAPTION.y, w, CAPTION.h, CAPTION.h / 2);
    this.caption.lineStyle(1.25, num(SEPIA)).strokeRoundedRect(CAPTION.x, CAPTION.y, w, CAPTION.h, CAPTION.h / 2);
  }

  private drawCursor() {
    const cell = this.selected;
    this.cursor.setVisible(!!cell);
    if (cell) this.cursor.setPosition(cellX(cell.col), cellY(cell.row));
  }

  /** A gold band behind a row, the one a Catalyst on it will clear. */
  private bandAt(row: number) {
    return this.add.image(BOARD.x - 1, BOARD.y + row * BOARD.cell - 1, 'band').setOrigin(0).setDepth(DEPTH.band);
  }

  /** Marks every row that holds a Catalyst; hidden while tiles move. */
  private showBands(on: boolean) {
    for (const band of this.bands) band.destroy();
    this.bands = [];
    if (!on) return;
    const rows = this.state.board.flatMap((row, r) => (row.some((t) => t.catalyst) ? [r] : []));
    this.bands = rows.map((row) => this.bandAt(row));
  }

  // ---- After an order ----

  private createResult() {
    const size = BOARD.cell * COLS;
    const card = this.add.image(0, 0, 'result-card');
    this.resultTitle = this.add.text(0, -76, '', ink(24, SEPIA, 'italic bold')).setOrigin(0.5);
    for (let k = 0; k < 3; k++) this.resultStars.push(this.add.image((k - 1) * 34, -38, 'star-off').setScale(1.15));
    this.resultText = this.add.text(0, -4, '', ink(14, BROWN)).setOrigin(0.5).setWordWrapWidth(340).setAlign('center');
    this.resultRank = this.add.text(0, 24, '', ink(13, RUST, 'italic bold')).setOrigin(0.5).setWordWrapWidth(340).setAlign('center');
    this.resultButton = makeButton(this, 0, 68, '', () => this.begin(nextOrder(this.state)));
    this.result = this.add
      .container(BOARD.x + size / 2, BOARD.y + size / 2, [card, this.resultTitle, ...this.resultStars, this.resultText, this.resultRank, this.resultButton])
      .setDepth(UI_DEPTH);
  }

  private showSold() {
    const s = this.state;
    const before = rankOf(s.stars - s.orderStars);
    const at = rankOf(s.stars);
    const next = RANKS[at + 1];
    const rank =
      at > before
        ? `Now a ${RANKS[at].title}! New recipe: ${POTION_NAMES[RANKS[at].recipe!]}`
        : next
          ? `${s.stars} stars: ${next.stars - s.stars} more to ${next.title}`
          : `${s.stars} stars, and every recipe unlocked`;
    this.showResult(
      `${POTION_NAMES[s.current.potion]} sold!`,
      `+${s.current.price} coins, +${s.earned - s.current.price} for ${s.moves} moves left`,
      rank,
      'Next order',
      s.orderStars,
    );
  }

  private showResult(title: string, text: string, rank: string, button: string, stars: number) {
    this.resultTitle.setText(title);
    this.resultText.setText(text);
    this.resultRank.setText(rank);
    this.resultStars.forEach((icon, k) => icon.setTexture(k < stars ? 'star-on' : 'star-off'));
    (this.resultButton.list[1] as Phaser.GameObjects.Text).setText(button);
    this.result.setVisible(true);
    if (!settings.reduceMotion) this.tweens.add({ targets: this.result, scale: { from: 0.92, to: 1 }, alpha: { from: 0, to: 1 }, duration: 220 });
  }
}
