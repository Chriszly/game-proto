import Phaser from 'phaser';
import { renderScale } from '../../../../shared/scaling';
import { settings } from '../../../../shared/settings';
import { BROWN, GOLD, MOSS, num, OCHRE, RES, RUST, SEPIA, shown } from '../art/nouveau';
import { needTexture, POTION_ORIGIN, potionTexture, tileTexture, TOOL_PAD, toolTexture } from '../art/textures';
import { adjacent, COLS, inBoard, ROWS, special, stuck, validMoves, type Board, type Cell, type Tile } from '../game/board';
import { EXAMS } from '../game/exams';
import { KIND_NAMES, KINDS, type Kind } from '../game/kinds';
import { MOVE_BONUS, orderFor, POTION_NAMES, RICH_BLOCKERS, RICH_MOVES, RICH_SHARE, riskFor, RUSH_COINS, RUSH_MOVES, TWIN_BONUS } from '../game/orders';
import { RANKS, rankOf, starsFor, STARS_2, STARS_3 } from '../game/ranks';
import { loadProgress, saveProgress } from '../game/save';
import { canUse, funnel, nextExam, nextOrder, pestle, sift, stir, TOOL_ORDER, TOOLS, trySwap, type Step, type Tool } from '../game/sim';
import { buyHerb, examOpen, heldPantry, HERB_COST, PANTRY_MAX, progressOf, standingOf, startOrder, type GameState } from '../game/state';
import { buyUpgrade, UPGRADE_ORDER, upgradeCost, UPGRADES, type UpgradeId } from '../game/upgrades';
import { makeButton } from '../ui/Button';
import { BOARD, CAPTION, cellX, cellY, NEEDS, PANEL, PANTRY, RIBBON, SERIF, TOOL, UI_DEPTH } from './layout';

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
/** How long mould takes to creep onto a tile, and a served customer's or a new stage's note to show. */
const MOULD_MS = 260;
const NOTE_MS = 700;
/** The title the crown's last order earns. */
const ROYAL_TITLE = 'Royal Apothecary';

/**
 * Draw order: the table, catalyst row bands, the cursor, specials (whose rays and petals sit under
 * their neighbours), tiles, the panel, and gathered tiles flying to the label.
 */
const DEPTH = { band: 1.5, cursor: 1.8, catalyst: 1.9, tile: 2, resin: 2.1, panel: 3, flying: 4 };

const CAPTION_TIP = 'A match of four brews a Catalyst (clears its row); an L or T brews a Bloom (clears a 3x3)';
const CAPTION_BLOCKERS = 'A match next to a corked jar opens it; resin holds a tile in place for one match';
const CAPTION_MOULD = 'Mould creeps to a neighbour after every move unless a match touches it, which scrubs it off';
const CAPTION_ROYAL = 'A royal commission: three potions in turn on one board, the moves carried over';
const CAPTION_TWIN = `Two customers share the board and the moves; the one served first pays ${TWIN_BONUS} coins more`;
const CAPTION_SIFT = `Sift: tap a row to reroll it for ${TOOLS.sift.cost} coins, or tap Sift again to put it away`;
const CAPTION_PESTLE = `Pestle: tap a tile to smash it for ${TOOLS.pestle.cost} coins, or tap Pestle again to put it away`;
const CAPTION_FUNNEL = `Funnel: tap a tile, then any other, to swap them for ${TOOLS.funnel.cost} coins`;
const CAPTION_FUNNEL_TO = 'Funnel: now tap the tile to swap it with (tap it again to let it go)';
const CAPTION_HERBS = `The herbalist: ${HERB_COST} coins an ingredient, up to ${PANTRY_MAX} of a kind in the pantry`;

/** A result card button: its caption and what a tap does. */
interface Choice {
  label: string;
  act: () => void;
}

/** A serif text style in the label's inks. */
const ink = (size: number, color = SEPIA, fontStyle = '') => ({ fontFamily: SERIF, fontSize: `${size}px`, fontStyle, color, resolution: Math.max(2, renderScale) });

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
  /** The bench tool picked up and waiting for a tap on the board (Sift, Pestle or Funnel), if any. */
  armed: Tool | null = null;
  /** True while Sift is picked up and waiting for a tap on the row to reroll. */
  get sifting() {
    return this.armed === 'sift';
  }
  /** The first tile picked for the Funnel. */
  private funnelFrom: Cell | null = null;
  /** The bench tool under the pointer, whose tip the caption shows. */
  private hoverTool: Tool | null = null;
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
  /** What the result card's single button does. */
  private resultAct: () => void = () => {};
  // Made when first needed: every Text takes a Math.random call (its texture's key), and one more
  // before or during the first order would change the seeded playthrough's board and refills.
  /** The result card's two buttons (the next order modest or rich, or an examination's retry). */
  private resultPair?: Phaser.GameObjects.Container[];
  private pairActs: (() => void)[] = [];
  /** The result card's links: the workbench, the herbalist and the next guild examination. */
  private resultBench?: Phaser.GameObjects.Text;
  private resultHerbs?: Phaser.GameObjects.Text;
  private resultExam?: Phaser.GameObjects.Text;
  /** What the caption says while the result card is up, if anything. */
  private resultCaption: string | null = null;
  private herbs?: Phaser.GameObjects.Container;
  private herbRows?: Phaser.GameObjects.Container;
  private herbCoins?: Phaser.GameObjects.Text;
  private bench?: Phaser.GameObjects.Container;
  private benchRows?: Phaser.GameObjects.Container;
  private benchCoins?: Phaser.GameObjects.Text;
  private pantry?: Phaser.GameObjects.Container;
  private pantryShown = '';
  private note?: Phaser.GameObjects.Text;
  /** The ingredients the label's rows show, from the top: the first customer's, then the second's. */
  private rows: Kind[] = [];

  constructor() {
    super('Game');
  }

  create() {
    shown(this.add.image(0, 0, 'table').setOrigin(0));
    this.cursor = shown(this.add.image(0, 0, 'cursor')).setDepth(DEPTH.cursor).setVisible(false);
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
    this.armed = null;
    this.funnelFrom = null;
    this.hint = [];
    this.idleMs = 0;
    this.shown = { ...state.got };
    state.board.forEach((row, r) => row.forEach((tile, c) => this.sprites.set(tile.id, this.tileSprite(tile, cellX(c), cellY(r)))));
    this.result.setVisible(false);
    this.bench?.setVisible(false);
    this.herbs?.setVisible(false);
    this.note?.setVisible(false);
    this.resultCaption = null;
    this.buildPanel();
    this.refresh();
  }

  private tileSprite(tile: Tile, x: number, y: number) {
    // Tiles fall past resin, behind it.
    return shown(this.add.image(x, y, tileTexture(tile))).setDepth(special(tile) ? DEPTH.catalyst : tile.resin ? DEPTH.resin : DEPTH.tile);
  }

  private cellAt(x: number, y: number): Cell | null {
    const cell = { col: Math.floor((x - BOARD.x) / BOARD.cell), row: Math.floor((y - BOARD.y) / BOARD.cell) };
    return inBoard(cell) ? cell : null;
  }

  /** A tap picks a tile, and a tap on its neighbour swaps the two. Tapping it again lets it go. */
  private pointerDown(p: Phaser.Input.Pointer) {
    const cell = this.cellAt(p.worldX, p.worldY);
    if (!cell || this.busy || this.state.phase !== 'play') return;
    if (this.armed === 'sift') return this.siftRow(cell.row);
    if (this.armed === 'pestle') return this.usePestle(cell);
    if (this.armed === 'funnel') return this.pickFunnel(cell);
    this.dragFrom = { cell, x: p.worldX, y: p.worldY };
    const picked = this.selected;
    if (picked && adjacent(picked, cell)) this.swap(picked, cell);
    else this.selected = picked && picked.row === cell.row && picked.col === cell.col ? null : cell;
    this.drawCursor();
  }

  /** Dragging a tile half a cell towards a neighbour swaps them too. */
  private pointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragFrom || !p.isDown || this.busy || this.state.phase !== 'play') return;
    const dx = p.worldX - this.dragFrom.x;
    const dy = p.worldY - this.dragFrom.y;
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
    const ta = this.state.board[a.row][a.col];
    const tb = this.state.board[b.row][b.col];
    // Jars and resin hold their tiles: they don't move at all.
    if (stuck(ta) || stuck(tb)) return this.drawCursor();
    const steps = trySwap(this.state, a, b);
    this.busy = true;
    this.showBands(false);
    this.queue.push(this.slide([{ id: ta.id, from: a, to: b }, { id: tb.id, from: b, to: a }]));
    if (!steps) {
      // No match: the tiles slide back and no move is spent.
      this.queue.push(this.slide([{ id: ta.id, from: b, to: a }, { id: tb.id, from: a, to: b }]));
    } else {
      this.refreshMoves();
      if (steps.some((st) => st.penalty)) this.pulse(this.movesText);
      for (const step of steps) this.playStep(step);
    }
    this.queue.push({ ms: 0, end: () => this.settle() });
  }

  /** Plays out what a Pestle or Funnel set off, after its own opening animation. */
  private playTool(steps: Step[], opening?: Anim) {
    this.armed = null;
    this.funnelFrom = null;
    saveProgress(progressOf(this.state));
    this.clearHint();
    this.busy = true;
    this.showBands(false);
    this.refresh();
    if (opening) this.queue.push(opening);
    if (steps.some((st) => st.penalty)) this.pulse(this.movesText);
    for (const step of steps) this.playStep(step);
    this.queue.push({ ms: 0, end: () => this.settle() });
  }

  /** Pestle: the tapped tile is smashed and the board plays out, without a move. */
  private usePestle(cell: Cell) {
    const steps = pestle(this.state, cell);
    if (!steps) return this.putAway();
    this.playTool(steps);
  }

  /** Funnel: the first tap picks a tile, the second swaps it with any other. */
  private pickFunnel(cell: Cell) {
    const from = this.funnelFrom;
    if (!from) {
      if (!stuck(this.state.board[cell.row][cell.col])) this.funnelFrom = cell;
    } else if (from.row === cell.row && from.col === cell.col) {
      this.funnelFrom = null;
    } else {
      const ta = this.state.board[from.row][from.col];
      const tb = this.state.board[cell.row][cell.col];
      const steps = funnel(this.state, from, cell);
      if (steps) return this.playTool(steps, this.slide([{ id: ta.id, from, to: cell }, { id: tb.id, from: cell, to: from }]));
    }
    this.refresh();
  }

  private putAway() {
    this.armed = null;
    this.funnelFrom = null;
    this.refresh();
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
      let flying: { sprite: Phaser.GameObjects.Image; x0: number; y0: number; x1: number; y1: number }[] = [];
      let brewing: Phaser.GameObjects.Image[] = [];
      let flash: Phaser.GameObjects.Image[] = [];
      const needs = step.needs;
      const big = step.rows.length + step.cols.length + step.areas.length + step.bursts.length > 0;
      this.queue.push({
        ms: big ? CLEAR_MS * 1.5 : CLEAR_MS,
        start: () => {
          // Ingredients the order needs fly to their row on the label; the rest just pop.
          popping = [];
          flying = [];
          for (const t of step.cleared) {
            const sprite = this.sprites.get(t.id)!;
            const row = needs.indexOf(t.kind);
            if (row < 0) popping.push(sprite);
            else flying.push({ sprite: sprite.setDepth(DEPTH.flying), x0: sprite.x, y0: sprite.y, x1: NEEDS.x, y1: this.rowY(row) });
          }
          brewing = [...step.brewed, ...step.melted, ...step.scrubbed].map((t) => this.sprites.get(t.id)!.setTexture(tileTexture(t)).setDepth(special(t) ? DEPTH.catalyst : DEPTH.tile));
          flash = [
            ...step.rows.map((row) => this.bandAt(row)),
            ...step.cols.map((col) => shown(this.add.image(BOARD.x + col * BOARD.cell - 1, BOARD.y - 1, 'band-col').setOrigin(0)).setDepth(DEPTH.band)),
            ...step.areas.map((a) => shown(this.add.image(cellX(a.col), cellY(a.row), 'area')).setDepth(DEPTH.band)),
            // Two Blooms swapped together light the 5x5 around them: the 3x3 square, grown.
            ...step.bursts.map((a) => shown(this.add.image(cellX(a.col), cellY(a.row), 'area'), 5 / 3).setDepth(DEPTH.band)),
          ];
        },
        step: (k) => {
          popping.forEach((s) => shown(s, 1 + 0.3 * k - 1.3 * k * k).setAlpha(1 - k));
          for (const f of flying) {
            f.sprite.setPosition(Phaser.Math.Linear(f.x0, f.x1, ease(k)), Phaser.Math.Linear(f.y0, f.y1, ease(k)));
            shown(f.sprite, 1 - 0.45 * k).setAlpha(1 - k * k);
          }
          brewing.forEach((s) => shown(s, settings.reduceMotion ? 1 : 1 + 0.25 * Math.sin(Math.PI * k)));
          // With reduced motion the lit row holds steady instead of blinking.
          flash.forEach((b) => b.setAlpha(settings.reduceMotion ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(k * Math.PI * 2))));
        },
        end: () => {
          flash.forEach((b) => b.destroy());
          for (const t of step.cleared) {
            this.sprites.get(t.id)?.destroy();
            this.sprites.delete(t.id);
            if (needs.includes(t.kind)) this.shown[t.kind] = (this.shown[t.kind] ?? 0) + 1;
          }
          this.refreshNeeds();
        },
      });
    }
    if (step.spread) {
      // Mould creeps onto a tile: it swells a little as its fuzz appears (held still with reduced motion).
      const grown = step.spread;
      let sprite: Phaser.GameObjects.Image | undefined;
      this.queue.push({
        ms: MOULD_MS,
        start: () => (sprite = this.sprites.get(grown.id)?.setTexture(tileTexture(grown)).setDepth(DEPTH.tile)),
        step: (k) => sprite && shown(sprite, settings.reduceMotion ? 1 : 1 + 0.2 * Math.sin(Math.PI * k)),
      });
      return;
    }
    if (step.served) {
      // A customer is served: a note over the board, and their rows finish.
      const potion = step.served;
      const bonus = this.state.served[0] === potion && this.state.speedBonus > 0;
      this.queue.push(this.showNote(`${POTION_NAMES[potion]} served!${bonus ? ` +${TWIN_BONUS} coins for speed with the sale` : ''}`));
      return;
    }
    if (step.stage) {
      // A royal commission moves on: the label is rebuilt for the next potion and the moves stay.
      const stage = step.stage;
      this.queue.push({ ms: 0, end: () => ((this.shown = { ...this.state.got }), this.buildPanel(), this.refreshNeeds()) });
      this.queue.push(this.showNote(`Stage ${stage + 1}: now the ${POTION_NAMES[this.state.current.stages![stage].potion]}`));
      return;
    }
    this.queue.push(this.moveTo(step.board, step.shuffled ? SHUFFLE_MS : FALL_MS));
  }

  /** A line over the board for a moment: a served customer or a commission's next stage. */
  private showNote(text: string): Anim {
    return {
      ms: NOTE_MS,
      start: () => {
        const size = BOARD.cell * COLS;
        this.note ??= this.add
          .text(BOARD.x + size / 2, BOARD.y + size / 2, '', { ...ink(20, '#f1e6c8', 'italic bold'), backgroundColor: '#2e1d14', padding: { x: 14, y: 8 } })
          .setOrigin(0.5)
          .setDepth(DEPTH.flying);
        this.note.setText(text).setVisible(true).setAlpha(1);
      },
      step: (k) => this.note?.setAlpha(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3),
      end: () => this.note?.setVisible(false),
    };
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
    } else if (s.current.exam && s.phase === 'failed') {
      this.showResult('Out of moves', `The ${POTION_NAMES[s.current.potion]} wasn't finished.`, 'No seal this time.', this.examRetry(), 0);
    } else if (s.phase === 'failed') {
      const what = s.current.stages ? 'royal commission' : s.current.second ? 'two orders' : POTION_NAMES[s.current.potion];
      this.showResult('Out of moves', `The ${what} ${s.current.second ? "weren't" : "wasn't"} finished.`, 'No stars this time.', [{ label: 'Try again', act: () => this.begin(nextOrder(this.state)) }], 0);
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
    if (this.armed === tool) {
      this.armed = null;
      this.funnelFrom = null;
    } else if (!canUse(this.state, tool)) {
      return;
    } else if (tool === 'stir') {
      stir(this.state);
      saveProgress(progressOf(this.state));
      this.pulse(this.movesText);
    } else {
      this.armed = tool;
      this.funnelFrom = null;
      this.selected = null;
    }
    this.clearHint();
    this.refresh();
  }

  /** Sift: the row's tiles fade out and new ones grow in their place. */
  private siftRow(row: number) {
    const before = this.state.board.map((r) => r.map((t) => t.id));
    const old = sift(this.state, row);
    this.armed = null;
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
      step: (k) => fading.forEach((s) => shown(s, 1 - 0.6 * k).setAlpha(1 - k)),
      end: () => old.forEach((t) => (this.sprites.get(t.id)?.destroy(), this.sprites.delete(t.id))),
    });
    this.queue.push({
      ms: SIFT_MS,
      start: () => {
        board[row].forEach((tile, col) => {
          if (this.sprites.has(tile.id)) return;
          const sprite = shown(this.tileSprite(tile, cellX(col), cellY(row)), 0);
          this.sprites.set(tile.id, sprite);
          growing.push(sprite);
        });
      },
      step: (k) => growing.forEach((s) => shown(s, ease(k))),
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
    if (this.busy || this.armed || this.state.phase !== 'play') return;
    this.idleMs += dt;
    if (this.idleMs < HINT_MS) return;
    if (this.hint.length === 0) {
      const [a, b] = validMoves(this.state.board)[0] ?? [];
      if (!a) return;
      this.hint = [this.state.board[a.row][a.col].id, this.state.board[b.row][b.col].id];
    }
    // The two tiles swell and settle; with reduced motion they hold still, a little larger.
    const swell = settings.reduceMotion ? 1.14 : 1.08 + Math.sin(this.clock / 110) * 0.08;
    for (const id of this.hint) {
      const sprite = this.sprites.get(id);
      if (sprite) shown(sprite, swell);
    }
  }

  private clearHint() {
    for (const id of this.hint) {
      const sprite = this.sprites.get(id);
      if (sprite) shown(sprite);
    }
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
    for (let k = 0; k < 3; k++) this.starIcons.push(shown(this.add.image(709 + k * 25, 462, 'star-off')).setDepth(DEPTH.panel));
    this.ruleText = this.add.text(560, 490, '', ink(11, RUST, 'italic')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
    this.coinIcon = shown(this.add.image(852, 465, 'coin')).setDepth(DEPTH.panel);
    this.coinsText = this.add.text(906, 466, '', ink(21, SEPIA, 'bold')).setOrigin(1, 0.5).setDepth(DEPTH.panel);
  }

  private createTools() {
    TOOL_ORDER.forEach((tool, i) => {
      const button = shown(this.add.image(TOOL.x + i * TOOL.gap - TOOL_PAD, TOOL.y - TOOL_PAD, toolTexture(tool, 'on')))
        .setOrigin(0)
        .setDepth(DEPTH.panel)
        .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(TOOL_PAD * RES, TOOL_PAD * RES, TOOL.w * RES, TOOL.h * RES), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      button.on('pointerdown', () => this.useTool(tool));
      button.on('pointerover', () => ((this.hoverTool = tool), this.refreshCaption()));
      button.on('pointerout', () => ((this.hoverTool = null), this.refreshCaption()));
      this.tools.set(tool, button);
    });
  }

  private createCaption() {
    this.caption = this.add.graphics().setDepth(DEPTH.panel);
    shown(this.add.image(CAPTION.x + 13, CAPTION.y + CAPTION.h / 2, 'sun')).setDepth(DEPTH.panel);
    this.captionText = this.add.text(CAPTION.x + 25, CAPTION.y + CAPTION.h / 2, '', ink(11, SEPIA, 'italic')).setOrigin(0, 0.5).setDepth(DEPTH.panel);
  }

  /** The order card: the potion asked for and a row for each ingredient it needs. */
  private buildPanel() {
    this.panel?.destroy();
    this.needTexts.clear();
    const s = this.state;
    const o = s.current;
    const mid = PANEL.x + PANEL.w / 2;
    const title = o.exam
      ? `Guild examination ${o.exam.index + 1}`
      : o.stages
        ? o.last
          ? "The crown's last order"
          : 'Royal commission'
        : o.second
          ? `Order ${o.number}: two customers`
          : `Order ${o.number}`;
    const items: Phaser.GameObjects.GameObject[] = [
      this.add.text(mid, 62, title, ink(o.stages || o.second || o.exam ? 24 : 28, SEPIA, 'bold')).setOrigin(0.5),
      shown(this.add.image(606, 145, potionTexture(o.potion))).setOrigin(POTION_ORIGIN.x, POTION_ORIGIN.y),
      this.add.text(606, 164.5, `No. ${o.number}`, ink(9, RUST, 'italic bold')).setOrigin(0.5),
      this.add.text(666, 124, POTION_NAMES[o.potion], ink(22, SEPIA, 'italic bold')).setOrigin(0, 0.5),
      this.add.text(666, 152, o.exam ? `Pays ${o.price} coins on a pass` : o.rich ? `Pays ${o.price} coins: rich order` : `Pays ${o.price} coins`, ink(15, BROWN)).setOrigin(0, 0.5),
      this.add.text(666, 174, `+${MOVE_BONUS} per move left`, ink(15, BROWN)).setOrigin(0, 0.5),
    ];
    // The order's twist, stage or second customer, under the price.
    const line = o.exam
      ? `Sell it with ${o.exam.stars} stars: ${o.exam.stars === 3 ? STARS_3 : STARS_2}+ moves left`
      : o.stages
      ? `Stage ${s.stage + 1} of ${o.stages.length}: the moves carry over`
      : o.second
        ? `and a ${POTION_NAMES[o.second.potion]} for a second customer`
        : o.rush
          ? `Rush order: ${RUSH_MOVES} fewer moves, +${RUSH_COINS} coins`
          : o.forbid
            ? `No ${KIND_NAMES[o.forbid]}: matching it costs a move`
            : '';
    if (line) items.push(this.add.text(666, 196, line, ink(13, RUST, 'italic bold')).setOrigin(0, 0.5));
    this.rows = Object.keys(o.needs) as Kind[];
    const second = o.second ? Object.keys(o.second.needs) : [];
    this.rows.forEach((kind, i) => {
      const y = this.rowY(i);
      items.push(shown(this.add.image(NEEDS.x, y, needTexture(kind))));
      const who = second.includes(kind) ? ` (${POTION_NAMES[o.second!.potion]})` : o.second ? ` (${POTION_NAMES[o.potion]})` : '';
      items.push(this.add.text(NEEDS.barX, y - 17, `${KIND_NAMES[kind]}${who}`, ink(o.second ? 11 : 13, BROWN, 'italic bold')).setOrigin(0, 0.5));
      const text = this.add.text(906, y + 2, '', ink(18, SEPIA, 'bold')).setOrigin(1, 0.5);
      this.needTexts.set(kind, text);
      items.push(text);
    });
    this.panel = this.add.container(0, 0, items).setDepth(DEPTH.panel);
  }

  /** Where row `i` of the label's ingredients sits: a twin order's four rows are closer together. */
  private rowY(i: number) {
    return this.state.current.second ? NEEDS.twinY + i * NEEDS.twinRow : NEEDS.y + i * NEEDS.row;
  }

  private refresh() {
    this.refreshNeeds();
    this.refreshMoves();
    this.refreshRank();
    this.refreshTools();
    this.coinsText.setText(`${this.state.coins}`);
    this.coinIcon.setX(this.coinsText.x - this.coinsText.width - 18);
    this.refreshPantry();
    this.refreshCaption();
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
    this.rows.forEach((kind, i) => {
      const n = this.state.current.needs[kind] ?? 0;
      const have = Math.min(this.shown[kind] ?? 0, n);
      const y = this.rowY(i);
      const done = have >= n;
      this.needTexts.get(kind)?.setText(`${have}/${n}`).setColor(done ? '#3d6a32' : SEPIA);
      this.bar(NEEDS.barX - 1.5, y - 5.5, NEEDS.barW + 3, NEEDS.barH + 3, have / n, done ? MOSS : OCHRE, this.bars);
    });
  }

  /** What the pantry holds, at the foot of the label: a small icon and count per kind (nothing when it is empty). */
  private refreshPantry() {
    const pantry = this.state.phase === 'play' ? this.state.pantry : heldPantry(this.state);
    const held = Object.entries(pantry).filter(([, n]) => n > 0) as [Kind, number][];
    const key = held.map(([k, n]) => `${k}${n}`).join();
    if (key === this.pantryShown) return;
    this.pantryShown = key;
    this.pantry?.destroy();
    this.pantry = undefined;
    if (held.length === 0) return;
    const items: Phaser.GameObjects.GameObject[] = [];
    let x = 0;
    for (const [kind, n] of [...held].reverse()) {
      items.push(this.add.text(x, 0, `${n}`, ink(12, SEPIA, 'bold')).setOrigin(1, 0.5));
      x -= 14;
      items.push(shown(this.add.image(x - 9, 0, needTexture(kind)), 0.45));
      x -= 24;
    }
    items.push(this.add.text(x - 2, 0, 'Pantry', ink(11, BROWN, 'italic')).setOrigin(1, 0.5));
    this.pantry = this.add.container(PANTRY.x, PANTRY.y, items).setDepth(DEPTH.panel);
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
    this.rankTitle.setText(this.state.royal ? ROYAL_TITLE : RANKS[at].title);
    const barX = Math.max(RIBBON.barX, this.rankTitle.x + this.rankTitle.width + 10);
    this.rankBar.clear();
    this.bar(barX, RIBBON.y + 7.5, RIBBON.barW, 8, next ? stars / next.stars : 1, OCHRE, this.rankBar);
    this.rankCount.setText(next ? `${stars}/${next.stars}` : `${stars}`).setX(barX + RIBBON.barW + 7);
    this.rankNext
      .setText(next ? `Next: ${next.title}: a new recipe` : this.state.royal ? 'Guild seals' : "Every recipe unlocked: the crown's last order is next")
      .setX(this.rankCount.x + this.rankCount.width + 9);
    // Once Royal Apothecary, a wax seal per guild examination, filled in as each is passed.
    if (!this.state.royal) return;
    const y = RIBBON.y + RIBBON.h / 2;
    EXAMS.forEach((_, k) => {
      const x = this.rankNext.x + this.rankNext.width + 10 + k * 11;
      if (k < this.state.seals) this.rankBar.fillStyle(num(RUST)).fillCircle(x, y, 4.5);
      this.rankBar.lineStyle(1.25, num(k < this.state.seals ? GOLD : BROWN)).strokeCircle(x, y, 4.5);
    });
  }

  private refreshTools() {
    for (const [tool, button] of this.tools) {
      const look = this.armed === tool ? 'armed' : canUse(this.state, tool) ? 'on' : 'off';
      button.setTexture(toolTexture(tool, look));
    }
  }

  /** The caption: what a picked-up tool wants, a hovered tool's tip, or a tip for this order. */
  private refreshCaption() {
    const s = this.state;
    const blockers = s.board.some((row) => row.some((t) => t.jar || t.resin));
    const mould = s.board.some((row) => row.some((t) => t.mould));
    const forbid = s.current.forbid;
    const given = Object.entries(s.fromPantry);
    let text = CAPTION_TIP;
    if (this.herbs?.visible) text = CAPTION_HERBS;
    else if (this.resultCaption && s.phase !== 'play') text = this.resultCaption;
    else if (this.armed === 'sift') text = CAPTION_SIFT;
    else if (this.armed === 'pestle') text = CAPTION_PESTLE;
    else if (this.armed === 'funnel') text = this.funnelFrom ? CAPTION_FUNNEL_TO : CAPTION_FUNNEL;
    else if (this.hoverTool) text = `${TOOLS[this.hoverTool].tip} (${TOOLS[this.hoverTool].cost} coins)`;
    else if (given.length > 0 && Object.values(s.got).every((n, i) => n === (s.fromPantry[Object.keys(s.got)[i] as Kind] ?? 0)))
      text = `The pantry put in ${given.map(([k, n]) => `${n} ${KIND_NAMES[k as Kind].toLowerCase()}`).join(' and ')} to start`;
    else if (s.current.exam) text = `A guild examination: the same board every try; sell it with ${s.current.exam.stars} stars for a seal`;
    else if (s.current.rich) text = `A rich order: ${RICH_SHARE * 100}% more coins for ${s.current.rich === 'moves' ? `${RICH_MOVES} fewer moves` : `${RICH_BLOCKERS} more jars and resin`}`;
    else if (s.current.stages) text = CAPTION_ROYAL;
    else if (s.current.second) text = CAPTION_TWIN;
    else if (forbid) text = `No ${KIND_NAMES[forbid]} in this order: a swap that matches it costs a move`;
    else if (mould) text = CAPTION_MOULD;
    else if (blockers) text = CAPTION_BLOCKERS;
    else if (s.current.rush) text = `Rush order: ${RUSH_MOVES} fewer moves than usual, and ${RUSH_COINS} more coins`;
    this.setCaption(text);
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
    const cell = this.funnelFrom ?? this.selected;
    this.cursor.setVisible(!!cell);
    if (cell) this.cursor.setPosition(cellX(cell.col), cellY(cell.row));
  }

  /** A gold band behind a row, the one a Catalyst on it will clear. */
  private bandAt(row: number) {
    return shown(this.add.image(BOARD.x - 1, BOARD.y + row * BOARD.cell - 1, 'band').setOrigin(0)).setDepth(DEPTH.band);
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
    const card = shown(this.add.image(0, 0, 'result-card'));
    this.resultTitle = this.add.text(0, -82, '', ink(24, SEPIA, 'italic bold')).setOrigin(0.5);
    for (let k = 0; k < 3; k++) this.resultStars.push(shown(this.add.image((k - 1) * 34, -48, 'star-off'), 1.15));
    this.resultText = this.add.text(0, -16, '', ink(13, BROWN)).setOrigin(0.5).setWordWrapWidth(340).setAlign('center');
    this.resultRank = this.add.text(0, 22, '', ink(13, RUST, 'italic bold')).setOrigin(0.5).setWordWrapWidth(340).setAlign('center');
    this.resultButton = makeButton(this, 0, 56, '', () => this.resultAct());
    this.result = this.add
      .container(BOARD.x + size / 2, BOARD.y + size / 2, [card, this.resultTitle, ...this.resultStars, this.resultText, this.resultRank, this.resultButton])
      .setDepth(UI_DEPTH);
  }

  // ---- The workbench ----

  /** A link on the result card, under its buttons. */
  private link(text: string, onClick: () => void) {
    const link = this.add.text(0, 92, text, ink(12, RUST, 'italic bold')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    link.on('pointerdown', onClick).on('pointerover', () => link.setAlpha(0.7)).on('pointerout', () => link.setAlpha(1));
    this.result.add(link);
    return link;
  }

  /**
   * The result card's links, made the first time the card shows: the workbench, the herbalist and,
   * once Royal Apothecary, the next guild examination. They sit in a row, centred.
   */
  private refreshLinks() {
    this.resultBench ??= this.link('Workbench', () => this.openBench());
    this.resultHerbs ??= this.link('Herbalist', () => this.openHerbs());
    const exam = examOpen(progressOf(this.state));
    if (exam) this.resultExam ??= this.link('', () => this.begin(nextExam(this.state)));
    this.resultExam?.setText(`Guild examination ${this.state.seals + 1}`).setVisible(exam);
    const links = [this.resultBench, this.resultHerbs, ...(exam && this.resultExam ? [this.resultExam] : [])];
    const gap = 26;
    let x = -(links.reduce((w, l) => w + l.width, 0) + gap * (links.length - 1)) / 2;
    for (const l of links) {
      l.setX(x + l.width / 2);
      x += l.width + gap;
    }
  }

  /** The two buttons after a sale: the next order, modest or rich (and, after a failed examination, a retry or back to the orders). */
  private createPair() {
    this.resultPair = [0, 1].map((k) => makeButton(this, (k - 0.5) * 176, 56, '', () => this.pairActs[k]()).setScale(0.82));
    this.result.add(this.resultPair);
  }

  /** The next order, picked modest or rich; the pick is saved so a reload or a retry keeps it. */
  private pick(rich: boolean) {
    this.state.rich = rich;
    saveProgress(progressOf(this.state));
    this.begin(nextOrder(this.state));
  }

  /** The result card's choice of the next order, and the caption that says what a rich one risks. */
  private orderChoice(): Choice[] {
    const risk = riskFor(this.state.order);
    this.resultCaption = `A rich order pays ${RICH_SHARE * 100}% more, for ${risk === 'moves' ? `${RICH_MOVES} fewer moves` : `${RICH_BLOCKERS} more jars and resin`}`;
    return [
      { label: 'Modest order', act: () => this.pick(false) },
      { label: 'Rich order', act: () => this.pick(true) },
    ];
  }

  /** After a failed examination: try it again on the same board, or go back to the orders. */
  private examRetry(): Choice[] {
    this.resultCaption = 'The examination starts on the same board every time';
    return [
      { label: 'Try again', act: () => this.begin(nextExam(this.state)) },
      { label: 'Back to orders', act: () => this.begin(nextOrder(this.state)) },
    ];
  }

  // ---- The herbalist ----

  /** The herbalist's card over the board: a column per ingredient with what the pantry holds and a way to buy one more. */
  private createHerbs() {
    const size = BOARD.cell * COLS;
    const card = shown(this.add.image(0, 0, 'result-card'));
    const title = this.add.text(0, -92, 'Herbalist', ink(24, SEPIA, 'italic bold')).setOrigin(0.5);
    this.herbCoins = this.add.text(0, -68, '', ink(13, BROWN, 'italic')).setOrigin(0.5);
    this.herbRows = this.add.container(0, 0);
    const back = makeButton(this, 0, 86, 'Back', () => this.closeHerbs());
    this.herbs = this.add.container(BOARD.x + size / 2, BOARD.y + size / 2, [card, title, this.herbCoins, this.herbRows, back]).setDepth(UI_DEPTH);
  }

  private openHerbs() {
    if (!this.herbs) this.createHerbs();
    this.result.setVisible(false);
    this.herbs!.setVisible(true);
    this.refreshHerbs();
    this.refreshCaption();
  }

  private closeHerbs() {
    this.herbs?.setVisible(false);
    this.result.setVisible(true);
    this.refreshCaption();
  }

  private buyHerb(kind: Kind) {
    if (!buyHerb(this.state, kind)) return;
    saveProgress(progressOf(this.state));
    this.refresh();
    this.refreshHerbs();
  }

  /** One column per ingredient: its icon and name, the pantry's count, a Buy link and whether the next order wants it. */
  private refreshHerbs() {
    if (!this.herbRows || !this.herbCoins) return;
    this.herbRows.removeAll(true);
    this.herbCoins.setText(`${this.state.coins} coins to spend`);
    const pantry = heldPantry(this.state);
    const next = orderFor(this.state.order, standingOf(progressOf(this.state)));
    const wanted = Object.keys(next.stages ? Object.assign({}, ...next.stages.map((st) => st.needs)) : next.needs);
    KINDS.forEach((kind, i) => {
      const x = (i - 2) * 76;
      const have = pantry[kind] ?? 0;
      this.herbRows!.add(shown(this.add.image(x, -34, needTexture(kind)), 0.8));
      this.herbRows!.add(this.add.text(x, -8, KIND_NAMES[kind], ink(11, BROWN, 'italic bold')).setOrigin(0.5));
      this.herbRows!.add(this.add.text(x, 10, `${have}/${PANTRY_MAX}`, ink(15, SEPIA, 'bold')).setOrigin(0.5));
      const can = have < PANTRY_MAX && this.state.coins >= HERB_COST;
      const buy = this.add.text(x, 32, have < PANTRY_MAX ? `Buy for ${HERB_COST}` : 'Full', ink(12, RUST, 'italic bold')).setOrigin(0.5);
      if (can) buy.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.buyHerb(kind));
      else buy.setAlpha(0.45);
      this.herbRows!.add(buy);
      if (wanted.includes(kind)) this.herbRows!.add(this.add.text(x, 50, 'next order', ink(10, MOSS, 'italic bold')).setOrigin(0.5));
    });
  }

  /** The workbench card over the board: one row per lasting upgrade, each with its price, and a way back. */
  private createBench() {
    const size = BOARD.cell * COLS;
    const card = shown(this.add.image(0, 0, 'result-card'));
    const title = this.add.text(0, -92, 'Workbench', ink(24, SEPIA, 'italic bold')).setOrigin(0.5);
    this.benchCoins = this.add.text(0, -68, '', ink(13, BROWN, 'italic')).setOrigin(0.5);
    this.benchRows = this.add.container(0, 0);
    const back = makeButton(this, 0, 86, 'Back', () => this.closeBench());
    this.bench = this.add.container(BOARD.x + size / 2, BOARD.y + size / 2, [card, title, this.benchCoins, this.benchRows, back]).setDepth(UI_DEPTH);
  }

  private openBench() {
    if (!this.bench) this.createBench();
    this.result.setVisible(false);
    this.bench!.setVisible(true);
    this.refreshBench();
  }

  private closeBench() {
    this.bench?.setVisible(false);
    this.result.setVisible(true);
  }

  private buy(id: UpgradeId) {
    if (!buyUpgrade(this.state, id)) return;
    saveProgress(progressOf(this.state));
    this.refresh();
    this.refreshBench();
  }

  /** One row per upgrade: its name and effect, a pip per level and a button with the next level's price. */
  private refreshBench() {
    if (!this.benchRows || !this.benchCoins) return;
    this.benchRows.removeAll(true);
    const u = this.state.upgrades;
    this.benchCoins.setText(`${this.state.coins} coins to spend`);
    UPGRADE_ORDER.forEach((id, i) => {
      const y = -42 + i * 36;
      const level = u[id];
      const top = UPGRADES[id].costs.length;
      const cost = upgradeCost(u, id);
      const pips = Array.from({ length: top }, (_, k) => (k < level ? '●' : '○')).join('');
      this.benchRows!.add(this.add.text(-172, y - 9, `${UPGRADES[id].name}  ${pips}`, ink(14, SEPIA, 'italic bold')).setOrigin(0, 0.5));
      this.benchRows!.add(this.add.text(-172, y + 8, UPGRADES[id].what, ink(11, BROWN)).setOrigin(0, 0.5));
      const button = makeButton(this, 118, y, cost === null ? 'Bought' : `Buy for ${cost}`, () => this.buy(id)).setScale(0.6);
      if (cost === null || this.state.coins < cost) button.setAlpha(0.45);
      this.benchRows!.add(button);
    });
  }

  private showSold() {
    const s = this.state;
    const o = s.current;
    if (o.exam) {
      const need = o.exam.stars === 3 ? STARS_3 : STARS_2;
      if (!s.passed) {
        this.showResult('Examination failed', `Sold with ${s.moves} moves left: the guild wanted ${o.exam.stars} stars (${need}+ moves left).`, 'No seal this time.', this.examRetry(), s.orderStars);
        return;
      }
      const rank = s.seals === EXAMS.length ? `Every guild seal earned: ${s.seals} of ${EXAMS.length}` : `Guild seal ${s.seals} of ${EXAMS.length}`;
      this.showResult('Examination passed!', `+${o.price} coins, +${s.earned - o.price} for ${s.moves} moves left`, rank, this.orderChoice(), s.orderStars);
      return;
    }
    const before = rankOf(s.stars - s.orderStars);
    const at = rankOf(s.stars);
    const next = RANKS[at + 1];
    const rank = o.last
      ? `${ROYAL_TITLE}! ${s.stars} stars in all`
      : at > before
        ? `Now a ${RANKS[at].title}! New recipe: ${POTION_NAMES[RANKS[at].recipe!]}`
        : next
          ? `${s.stars} stars: ${next.stars - s.stars} more to ${next.title}`
          : s.royal
            ? `${s.stars} stars in all as ${ROYAL_TITLE}`
            : `${s.stars} stars, and every recipe unlocked`;
    const kept = Object.entries(s.toPantry).map(([k, n]) => `${n} ${KIND_NAMES[k as Kind].toLowerCase()}`);
    const lines = [`+${o.price} coins, +${s.earned - o.price} for ${s.moves} moves left`];
    if (s.speedBonus > 0) lines.push(`+${s.speedBonus} for serving the ${POTION_NAMES[s.served[0]]} first`);
    if (kept.length > 0) lines.push(`${kept.join(', ')} kept in the pantry`);
    const title = o.last ? "The crown's last order filled!" : o.stages ? 'Royal commission filled!' : o.second ? 'Both customers served!' : `${POTION_NAMES[o.potion]} sold!`;
    this.showResult(title, lines.join('\n'), rank, this.orderChoice(), s.orderStars);
  }

  /** Shows the result card with one button, or two side by side. */
  private showResult(title: string, text: string, rank: string, choices: Choice[], stars: number) {
    this.resultTitle.setText(title);
    this.resultText.setText(text);
    this.resultRank.setText(rank);
    this.resultStars.forEach((icon, k) => icon.setTexture(k < stars ? 'star-on' : 'star-off'));
    const pair = choices.length > 1;
    this.resultButton.setVisible(!pair);
    if (pair && !this.resultPair) this.createPair();
    this.resultPair?.forEach((b) => b.setVisible(pair));
    if (pair) {
      this.pairActs = choices.map((c) => c.act);
      choices.forEach((c, k) => (this.resultPair![k].list[1] as Phaser.GameObjects.Text).setText(c.label));
    } else {
      this.resultAct = choices[0].act;
      (this.resultButton.list[1] as Phaser.GameObjects.Text).setText(choices[0].label);
    }
    this.refreshLinks();
    this.refreshCaption();
    this.result.setVisible(true);
    if (!settings.reduceMotion) this.tweens.add({ targets: this.result, scale: { from: 0.92, to: 1 }, alpha: { from: 0, to: 1 }, duration: 220 });
  }
}
