import Phaser from 'phaser';
import { loadBest, saveBest } from '../game/save';
import { canPlace, canUndo, goalFor, newGame, place, previewScore, ROUND_POUCH, select, undo, type GameState } from '../game/state';
import { BUILDINGS, INFO, type Building } from '../game/tiles';
import { makeButton } from '../ui/Button';
import { cellCentre, FONT, GOAL_BAR, GRID, PANEL, TILE_BUTTONS, UI_DEPTH, UNDO_BUTTON, VIEW } from './layout';

/** How long a score popup floats up before it fades out, in milliseconds. */
const POPUP_MS = 900;
const BANNER_MS = 2200;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});

/** Where a tile button is on screen and which building it holds; read by the playthrough test. */
export interface TileButton {
  kind: Building;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The cell under the pointer with the selected building, and what placing it there would add. */
  preview: { col: number; row: number; gained: number } | null = null;
  tileButtons: TileButton[] = [];
  /** Where the undo button is on screen; read by the playthrough test. */
  undoButton = { x: UNDO_BUTTON.x, y: UNDO_BUTTON.y, w: UNDO_BUTTON.w, h: UNDO_BUTTON.h };
  private cells: Phaser.GameObjects.Image[][] = [];
  private buttons = new Map<Building, ButtonParts>();
  private undoBg!: Phaser.GameObjects.Rectangle;
  private undoText!: Phaser.GameObjects.Text;
  private hover!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private ghostText!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private roundText!: Phaser.GameObjects.Text;
  private islandText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.createBoard();
    this.createPanel();
    this.createGameOver();
    // The new round's banner, over the middle of the board.
    const backdrop = this.add.rectangle(0, 0, 440, 96, 0x2c2018, 0.92).setStrokeStyle(3, 0xf3c64e);
    this.bannerText = this.add.text(0, 0, '', textStyle(20)).setOrigin(0.5).setAlign('center').setLineSpacing(8);
    this.banner = this.add
      .container(GRID.x + (GRID.cols * GRID.cell) / 2, GRID.y + (GRID.rows * GRID.cell) / 2, [backdrop, this.bannerText])
      .setDepth(UI_DEPTH + 5)
      .setAlpha(0);
    this.refresh();
  }

  private createBoard() {
    const w = GRID.cols * GRID.cell;
    const h = GRID.rows * GRID.cell;
    this.add.rectangle(GRID.x - 6, GRID.y - 6, w + 12, h + 12, 0x3a2a1c).setOrigin(0).setStrokeStyle(3, 0x5a3f2a);
    this.cells = this.state.grid.map((cells, row) =>
      cells.map((cell, col) => {
        const { x, y } = cellCentre(col, row);
        return this.add.image(x, y, `tile-${cell}`);
      }),
    );
    // Faint lines between the cells so the grid reads at a glance.
    const lines = this.add.graphics().lineStyle(1, 0x1a1216, 0.25);
    for (let c = 1; c < GRID.cols; c++) lines.lineBetween(GRID.x + c * GRID.cell, GRID.y, GRID.x + c * GRID.cell, GRID.y + h);
    for (let r = 1; r < GRID.rows; r++) lines.lineBetween(GRID.x, GRID.y + r * GRID.cell, GRID.x + w, GRID.y + r * GRID.cell);

    this.hover = this.add.graphics().setDepth(5);
    this.ghost = this.add.image(0, 0, 'tile-farm').setAlpha(0.6).setDepth(6).setVisible(false);
    this.ghostText = this.add.text(0, 0, '', textStyle(20, '#f3c64e')).setOrigin(0.5).setDepth(7).setVisible(false);

    // One zone over the whole board: hovering previews, a tap places.
    const zone = this.add.zone(GRID.x, GRID.y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => this.hoverAt(p.x, p.y));
    zone.on('pointerout', () => this.hoverAt(-1, -1));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapAt(p.x, p.y));
  }

  private createPanel() {
    this.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x2c2018).setOrigin(0).setStrokeStyle(3, 0x5a3f2a);
    this.add.text(PANEL.x + PANEL.w / 2, PANEL.y + 22, 'Tiny Kingdom', textStyle(24, '#f3c64e')).setOrigin(0.5);
    this.roundText = this.add.text(PANEL.x + 16, PANEL.y + 50, '', textStyle(16, '#c9b48f'));
    this.islandText = this.add.text(PANEL.x + PANEL.w - 16, PANEL.y + 50, '', textStyle(16, '#c9b48f')).setOrigin(1, 0);
    this.scoreText = this.add.text(PANEL.x + 16, PANEL.y + 74, '', textStyle(20));
    this.goalText = this.add.text(GOAL_BAR.x + GOAL_BAR.w / 2, GOAL_BAR.y + GOAL_BAR.h / 2, '', textStyle(12)).setOrigin(0.5).setDepth(1);
    this.bar = this.add.graphics();
    this.bestText = this.add.text(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 12, '', textStyle(14, '#d8c7a6')).setOrigin(0.5);

    const { x, y, w, h } = UNDO_BUTTON;
    this.undoBg = this.add.rectangle(x, y, w, h, 0x3a2a1c).setStrokeStyle(3, 0x5a3f2a);
    this.undoText = this.add.text(x, y, '', textStyle(16, '#f3e9d2')).setOrigin(0.5);
    this.undoBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!undo(this.state)) return;
      this.redrawCells();
      this.refresh();
      this.hoverAt(this.input.activePointer.x, this.input.activePointer.y);
    });

    BUILDINGS.forEach((kind, i) => {
      const x = TILE_BUTTONS.x;
      const y = TILE_BUTTONS.ys[i];
      const { w, h } = TILE_BUTTONS;
      const bg = this.add.rectangle(x, y, w, h, 0x3a2a1c).setStrokeStyle(3, 0x5a3f2a);
      const icon = this.add.image(x - w / 2 + 38, y, `tile-${kind}`).setScale(0.875);
      this.add.text(x - w / 2 + 76, y - h / 2 + 8, INFO[kind].name, textStyle(18, '#f3c64e'));
      const count = this.add.text(x + w / 2 - 12, y - h / 2 + 8, '', textStyle(18)).setOrigin(1, 0);
      this.add.text(x - w / 2 + 76, y - h / 2 + 32, INFO[kind].rule, {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#e8dcc2',
        wordWrap: { width: w - 84 },
      });
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (!select(this.state, kind)) return;
        this.refresh();
        // The hover follows the new pick right away, without waiting for the pointer to move.
        this.hoverAt(this.input.activePointer.x, this.input.activePointer.y);
      });
      this.buttons.set(kind, { bg, icon, count });
      this.tileButtons.push({ kind, x, y, w, h });
    });
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 520, 260, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 90, 'The kingdom is built', textStyle(30, '#f3c64e')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 10, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 80, 'New kingdom', () => this.restart());
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  private cellAt(x: number, y: number) {
    const col = Math.floor((x - GRID.x) / GRID.cell);
    const row = Math.floor((y - GRID.y) / GRID.cell);
    if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.rows) return null;
    return { col, row };
  }

  private hoverAt(x: number, y: number) {
    const at = this.cellAt(x, y);
    const kind = this.state.selected;
    const gained = at && kind ? previewScore(this.state, kind, at.col, at.row) : null;
    this.preview = at && gained !== null ? { ...at, gained } : null;
    this.drawHover(at);
  }

  private tapAt(x: number, y: number) {
    const at = this.cellAt(x, y);
    if (!at) return;
    const placed = place(this.state, at.col, at.row);
    if (!placed) return;
    if (this.state.phase === 'over') saveBest(this.state.best);
    this.cells[at.row][at.col].setTexture(`tile-${this.state.grid[at.row][at.col]}`);
    for (const change of placed.changes) this.popup(change.col, change.row, change.gained, change.col === at.col && change.row === at.row);
    if (placed.newRound) this.announceRound();
    this.refresh();
    this.hoverAt(x, y);
  }

  /** A "+N" that floats up from a cell and fades. */
  private popup(col: number, row: number, gained: number, main: boolean) {
    const { x, y } = cellCentre(col, row);
    const text = this.add
      .text(x, y - 8, `${gained >= 0 ? '+' : ''}${gained}`, textStyle(main ? 24 : 16, gained > 0 ? '#f3c64e' : gained < 0 ? '#e0584f' : '#d8c7a6'))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    this.tweens.add({ targets: text, y: y - 40, alpha: 0, duration: POPUP_MS, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
  }

  private announceRound() {
    const s = this.state;
    const tiles = BUILDINGS.map((b) => `+${ROUND_POUCH[b]} ${INFO[b].name.toLowerCase()}s`).join('  ');
    this.bannerText.setText([`Round ${s.round}`, tiles]);
    this.banner.setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: BANNER_MS / 2, duration: BANNER_MS / 2 });
  }

  private drawHover(at: { col: number; row: number } | null) {
    const g = this.hover.clear();
    const kind = this.state.selected;
    this.ghost.setVisible(false);
    this.ghostText.setVisible(false);
    if (!at || this.state.phase !== 'playing') return;
    const ok = canPlace(this.state, at.col, at.row);
    const x = GRID.x + at.col * GRID.cell;
    const y = GRID.y + at.row * GRID.cell;
    g.lineStyle(3, ok && kind ? 0xf3c64e : 0xe0584f, 0.9).strokeRect(x + 1.5, y + 1.5, GRID.cell - 3, GRID.cell - 3);
    if (!this.preview || !kind) return;
    const { x: cx, y: cy } = cellCentre(at.col, at.row);
    this.ghost.setTexture(`tile-${kind}`).setPosition(cx, cy).setVisible(true);
    const gained = this.preview.gained;
    this.ghostText
      .setText(`${gained >= 0 ? '+' : ''}${gained}`)
      .setColor(gained < 0 ? '#e0584f' : '#f3c64e')
      .setPosition(cx, cy - GRID.cell / 2 - 4)
      .setVisible(true);
  }

  private refresh() {
    const s = this.state;
    this.roundText.setText(`Round ${s.round}`);
    this.islandText.setText(`Island ${s.island}`);
    this.scoreText.setText(`Score ${s.score}`);
    this.goalText.setText(`${s.score} / ${s.goal} for round ${s.round + 1}`);
    this.bestText.setText(`Best score ${s.best}`);

    // The goal bar fills from the last round's goal to this one's.
    const from = s.round === 1 ? 0 : goalFor(s.round - 1);
    const fill = Phaser.Math.Clamp((s.score - from) / (s.goal - from), 0, 1);
    this.bar.clear();
    this.bar.fillStyle(0x0e0a08).fillRect(GOAL_BAR.x, GOAL_BAR.y, GOAL_BAR.w, GOAL_BAR.h);
    this.bar.fillStyle(0x4a3a2a).fillRect(GOAL_BAR.x + 2, GOAL_BAR.y + 2, GOAL_BAR.w - 4, GOAL_BAR.h - 4);
    this.bar.fillStyle(0x76b64a).fillRect(GOAL_BAR.x + 2, GOAL_BAR.y + 2, Math.round((GOAL_BAR.w - 4) * fill), GOAL_BAR.h - 4);

    for (const [kind, parts] of this.buttons) {
      const left = s.pouch[kind];
      const chosen = s.selected === kind;
      parts.bg.setStrokeStyle(3, chosen ? 0xf3c64e : 0x5a3f2a).setFillStyle(chosen ? 0x5c3a21 : 0x3a2a1c);
      parts.icon.setAlpha(left > 0 ? 1 : 0.35);
      parts.count.setText(`x${left}`).setColor(left > 0 ? '#f3e9d2' : '#7a6a5a');
    }

    const undoable = canUndo(s);
    const usedHere = s.undoneIn === s.round;
    this.undoText.setText(usedHere && !undoable ? 'Undo used this round' : 'Undo last tile');
    this.undoBg.setAlpha(undoable ? 1 : 0.4);
    this.undoText.setAlpha(undoable ? 1 : 0.4);

    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(`Final score ${s.score} on island ${s.island}, reaching round ${s.round}.\n${s.placed} buildings placed.\n\nBest score ${s.best}.`);
    }
  }

  /** A new kingdom on a fresh random island. */
  private restart() {
    // The best score carries over even when storage is blocked and loadBest() comes back empty.
    this.state = newGame(Math.max(loadBest(), this.state.best));
    this.redrawCells();
    this.preview = null;
    this.drawHover(null);
    this.refresh();
  }

  /** Shows each cell's current terrain or building, after a placement was undone or a new kingdom started. */
  private redrawCells() {
    this.state.grid.forEach((cells, row) => cells.forEach((cell, col) => this.cells[row][col].setTexture(`tile-${cell}`)));
  }
}
