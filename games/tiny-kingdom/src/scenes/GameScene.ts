import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { propKey, PROP_ORIGIN, tileKey } from '../art/textures';
import { DECREE_BONUS, decreeMarks, type At } from '../game/decree';
import { GIFT_INFO, type Gift } from '../game/gifts';
import { loadBest, loadCrowns, saveBest, saveCrowns } from '../game/save';
import { canPlace, canUndo, chooseGift, goalFor, newGame, place, previewPlacement, ROUND_POUCH, select, undo, type GameState, type Share } from '../game/state';
import { BUILDINGS, INFO, type Building } from '../game/tiles';
import { makeButton } from '../ui/Button';
import { cellCentre, DECREE, FONT, GIFT_CARD, GIFT_ROW, GOAL_BAR, GRID, PANEL, TILE_BUTTONS, TITLE, TRAY, UI_DEPTH, UNDO_BUTTON, VIEW } from './layout';

/** How long a score popup floats up before it fades out, in milliseconds. */
const POPUP_MS = 900;
const BANNER_MS = 2400;

/** The paints used by text and Graphics, matching src/art/wood.ts. */
const INK = '#3a2414';
const CREAM = '#fff6e2';
const LABEL = '#f1d9b0';
const RULE = '#5a3a20';
const RUST = '#b06a2a';
const YELLOW = 0xf2c33a;
const NAVY = 0x27406e;
const BLUE = 0x3b86d6;
const CORAL = 0xe0785f;

/** Board depths: tiles, decree marks and the hover outline, props (by row), ghost, then links and labels. */
const D = { tile: 1, outline: 2, spots: 2.5, prop: 3, ghost: 3.9, ticks: 4, links: 5, label: 6 };

type Weight = '700' | '800' | '900';
const style = (size: number, color: string, weight: Weight = '800', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => ({
  fontFamily: FONT,
  fontStyle: weight,
  fontSize: `${size}px`,
  color,
  ...extra,
});

/** Where a tile button is on screen and which building it holds; read by the playthrough test. */
export interface TileButton {
  kind: Building;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a gift's choice button is on screen; read by the playthrough test. */
export interface GiftButton {
  gift: Gift;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ButtonParts {
  glow: Phaser.GameObjects.Image;
  plaque: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Container;
  name: Phaser.GameObjects.Text;
  count: Phaser.GameObjects.Text;
  key: string;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The cell under the pointer with the selected building: what placing it there would add, and each neighbour's share. */
  preview: { col: number; row: number; gained: number; base: number; links: Share[] } | null = null;
  tileButtons: TileButton[] = [];
  /** Where the undo button is on screen; read by the playthrough test. */
  undoButton = { x: UNDO_BUTTON.x, y: UNDO_BUTTON.y, w: UNDO_BUTTON.w, h: UNDO_BUTTON.h };
  /** The gift card's two buttons while a gift is due; read by the playthrough test. */
  giftButtons: GiftButton[] = [];

  private tiles: Phaser.GameObjects.Image[][] = [];
  private props: Phaser.GameObjects.Image[][] = [];
  private buttons = new Map<Building, ButtonParts>();
  private buttonObjects: Phaser.GameObjects.GameObject[] = [];
  private shownKinds = '';
  private undoBg!: Phaser.GameObjects.Image;
  private undoText!: Phaser.GameObjects.Text;
  private hover!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private links!: Phaser.GameObjects.Graphics;
  private linkTexts: Phaser.GameObjects.Text[] = [];
  private bubbleText!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private roundText!: Phaser.GameObjects.Text;
  private islandText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private giftLabel!: Phaser.GameObjects.Text;
  private giftOr!: Phaser.GameObjects.Text;
  private chips!: Phaser.GameObjects.Graphics;
  private chipParts: { icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone }[] = [];
  private decreeText!: Phaser.GameObjects.Text;
  private beads: Phaser.GameObjects.Image[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private rewardTitle!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private crownsText!: Phaser.GameObjects.Text;
  private marks!: Phaser.GameObjects.Graphics;
  private markImages: Phaser.GameObjects.Image[] = [];
  private placeLabel!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private giftCard!: Phaser.GameObjects.Container;
  private giftTitle!: Phaser.GameObjects.Text;
  private giftSub!: Phaser.GameObjects.Text;
  private giftParts: { plaque: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; desc: Phaser.GameObjects.Text }[] = [];
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest(), loadCrowns());
    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(-1);
    this.createBoard();
    this.createDecree();
    this.createPanel();
    this.createGiftCard();
    this.createGameOver();
    const backdrop = this.add.image(0, 0, 'walnut-440x96');
    this.bannerText = this.add.text(0, -2, '', style(15, CREAM, '900', { align: 'center', lineSpacing: 4 })).setOrigin(0.5);
    this.banner = this.add
      .container(GRID.x + (GRID.cols * GRID.cell) / 2, GRID.y + (GRID.rows * GRID.cell) / 2, [backdrop, this.bannerText])
      .setDepth(UI_DEPTH + 5)
      .setAlpha(0);
    this.refresh();
  }

  private createBoard() {
    this.tiles = this.state.grid.map((cells, row) =>
      cells.map((cell, col) => {
        const { x, y } = cellCentre(col, row);
        return this.add.image(x, y, tileKey(cell, col, row)).setDepth(D.tile);
      }),
    );
    this.props = this.state.grid.map((cells, row) =>
      cells.map((_, col) => {
        const { x, y } = cellCentre(col, row);
        return this.add.image(x, y, 'prop-house').setOrigin(PROP_ORIGIN.x, PROP_ORIGIN.y).setDepth(D.prop + row * 0.01).setVisible(false);
      }),
    );
    this.redrawCells();

    this.marks = this.add.graphics().setDepth(D.outline);
    this.placeLabel = this.add.text(0, 0, '', style(10, CREAM, '800')).setOrigin(0.5).setDepth(D.label);
    this.hover = this.add.graphics().setDepth(D.outline + 0.1);
    this.ghost = this.add.image(0, 0, 'tile-farm').setDepth(D.ghost).setVisible(false);
    this.links = this.add.graphics().setDepth(D.links);
    for (let i = 0; i < 8; i++) this.linkTexts.push(this.add.text(0, 0, '', style(12, INK, '900')).setOrigin(0.5).setDepth(D.label).setVisible(false));
    this.bubbleText = this.add.text(0, 0, '', style(19, INK, '900')).setOrigin(0.5).setDepth(D.label + 0.1).setVisible(false);

    // One zone over the whole board: hovering previews, a tap places.
    const zone = this.add.zone(GRID.x, GRID.y, GRID.cols * GRID.cell, GRID.rows * GRID.cell).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => this.hoverAt(p.x, p.y));
    zone.on('pointerout', () => this.hoverAt(-1, -1));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapAt(p.x, p.y));
  }

  private createDecree() {
    const R = DECREE;
    this.add.text(R.x + 44, R.y + 10, 'ROYAL DECREE', style(8, RUST, '900', { letterSpacing: 1 } as never)).setOrigin(0, 0.5);
    this.decreeText = this.add.text(R.x + 44, R.y + 21, '', style(12, INK, '800')).setOrigin(0, 0.5);
    for (let i = 0; i < 8; i++) this.beads.push(this.add.image(0, R.y + R.h / 2 - 0.5, 'bead-off').setVisible(false));
    this.progressText = this.add.text(0, R.y + R.h / 2, '', style(13, '#3d7a2c', '900')).setOrigin(0, 0.5);
    this.rewardTitle = this.add.text(R.x + 435, R.y + 10, 'REWARD', style(8, RUST, '900', { letterSpacing: 1 } as never)).setOrigin(0, 0.5);
    this.rewardText = this.add.text(R.x + 435, R.y + 21, `+${DECREE_BONUS} and a crown`, style(12, INK, '800')).setOrigin(0, 0.5);
    this.crownsText = this.add.text(R.x + R.w - 49, R.y + R.h / 2 + 0.5, '', style(13, CREAM, '900')).setOrigin(0, 0.5);
  }

  private createPanel() {
    this.add
      .text(TITLE.x + TITLE.w / 2, TITLE.y + TITLE.h / 2 - 1, 'Tiny Kingdom', style(21, CREAM, '900', { shadow: { offsetX: 1, offsetY: 1.5, color: 'rgba(80,20,10,0.6)', fill: true } }))
      .setOrigin(0.5);
    this.roundText = this.add.text(PANEL.x + 16, 85, '', style(14, LABEL)).setOrigin(0, 0.5);
    this.islandText = this.add.text(PANEL.x + PANEL.w - 16, 85, '', style(14, LABEL)).setOrigin(1, 0.5);
    this.scoreText = this.add.text(PANEL.x + 16, 111, '', style(20, CREAM, '900', { shadow: { offsetX: 1, offsetY: 1.5, color: 'rgba(0,0,0,0.45)', fill: true } })).setOrigin(0, 0.5);
    this.bar = this.add.graphics();
    this.goalText = this.add
      .text(GOAL_BAR.x + GOAL_BAR.w / 2, GOAL_BAR.y + GOAL_BAR.h / 2, '', style(10, CREAM, '900', { stroke: 'rgba(30,20,10,0.6)', strokeThickness: 2 }))
      .setOrigin(0.5);

    // The two gifts on offer for reaching the goal, as chips; taking one when the goal is reached.
    const midY = GIFT_ROW.y + GIFT_ROW.h / 2;
    this.giftLabel = this.add.text(GIFT_ROW.x, midY, '', style(10.5, LABEL)).setOrigin(0, 0.5);
    this.giftOr = this.add.text(0, midY, 'or', style(10, LABEL)).setOrigin(0.5);
    this.chips = this.add.graphics();
    for (let i = 0; i < 2; i++) {
      const zone = this.add.zone(0, midY, 10, GIFT_ROW.h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.takeGift(this.state.gifts[i]));
      this.chipParts.push({
        icon: this.add.image(0, midY, 'icon-tower').setScale(0.85),
        text: this.add.text(0, midY + 0.5, '', style(9.5, '#ffffff')).setOrigin(0, 0.5),
        zone,
      });
    }

    const { x, y, w, h } = UNDO_BUTTON;
    this.undoBg = this.add.image(x, y, `plaque-${w}x${h}`);
    this.undoText = this.add.text(x, y - 1, '', style(13, INK)).setOrigin(0.5);
    this.undoBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!undo(this.state)) return;
      this.redrawCells();
      this.refresh();
      this.hoverAt(this.input.activePointer.x, this.input.activePointer.y);
    });
    this.bestText = this.add.text(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 12, '', style(12, LABEL)).setOrigin(0.5);
  }

  /** Builds the tile buttons for the kinds on show: three big plaques, or four slimmer ones once the windmill is won. */
  private buildButtons(kinds: Building[]) {
    for (const o of this.buttonObjects) o.destroy();
    this.buttonObjects = [];
    this.buttons.clear();
    this.tileButtons = [];
    const four = kinds.length > 3;
    const { ys, h } = four ? TILE_BUTTONS.four : TILE_BUTTONS.three;
    const w = TILE_BUTTONS.w;
    const x = TILE_BUTTONS.x;
    const key = `plaque-${w}x${h}`;
    kinds.forEach((kind, i) => {
      const y = ys[i];
      const left = x - w / 2;
      const top = y - h / 2;
      const glow = this.add.image(x, y + 1, `glow-${w}x${h}`).setVisible(false);
      const plaque = this.add.image(x, y, key);
      const scale = four ? 0.66 : 0.875;
      const iconX = left + (four ? 31 : 37);
      const iconY = four ? y - 1 : top + 39;
      const parts: Phaser.GameObjects.Image[] = [this.add.image(0, 0, tileKey(kind === 'farm' ? 'farm' : 'plain', 0, 0))];
      const prop = propKey(kind);
      if (prop) parts.push(this.add.image(0, 0, prop).setOrigin(PROP_ORIGIN.x, PROP_ORIGIN.y));
      const icon = this.add.container(iconX, iconY, parts).setScale(scale);
      const textX = left + (four ? 60 : 74);
      const name = this.add.text(textX, top + (four ? 13 : 15), INFO[kind].name, style(four ? 15 : 17, INK, '900')).setOrigin(0, 0.5);
      const pill = this.add.image(x + w / 2 - 22, top + (four ? 13 : 16), 'count');
      const count = this.add.text(pill.x, pill.y, '', style(12, CREAM, '900')).setOrigin(0.5);
      const rule = this.add.text(textX, top + (four ? 23 : 28), INFO[kind].rule, style(four ? 9.5 : 10.5, RULE, '700', { wordWrap: { width: four ? 152 : 148 }, lineSpacing: four ? 0 : 2 }));
      plaque.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (!select(this.state, kind)) return;
        this.refresh();
        // The hover follows the new pick right away, without waiting for the pointer to move.
        this.hoverAt(this.input.activePointer.x, this.input.activePointer.y);
      });
      this.buttonObjects.push(glow, plaque, icon, name, pill, count, rule);
      this.buttons.set(kind, { glow, plaque, icon, name, count, key });
      this.tileButtons.push({ kind, x, y, w, h });
    });
  }

  private createGiftCard() {
    const { x, y, w, h, button } = GIFT_CARD;
    // Dims the board and swallows its taps while the gift waits.
    const dim = this.add.rectangle(TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2, TRAY.w, TRAY.h, 0x2a170a, 0.45).setInteractive();
    const card = this.add.image(x, y, `walnut-${w}x${h}`);
    this.giftTitle = this.add.text(x, y - h / 2 + 30, '', style(20, CREAM, '900', { shadow: { offsetX: 1, offsetY: 1.5, color: 'rgba(0,0,0,0.45)', fill: true } })).setOrigin(0.5);
    this.giftSub = this.add.text(x, y - h / 2 + 56, '', style(12, LABEL, '700')).setOrigin(0.5);
    const objects: Phaser.GameObjects.GameObject[] = [dim, card, this.giftTitle, this.giftSub];
    const key = `plaque-${button.w}x${button.h}`;
    [-1, 1].forEach((side, i) => {
      const bx = x + side * button.dx;
      const by = y + button.dy;
      const plaque = this.add.image(bx, by, key).setInteractive({ useHandCursor: true });
      plaque.on('pointerover', () => plaque.setTexture(`${key}-sel`));
      plaque.on('pointerout', () => plaque.setTexture(key));
      plaque.on('pointerdown', () => this.takeGift(this.state.gifts[i]));
      const icon = this.add.image(bx, by - 22, 'icon-tower-big');
      const label = this.add.text(bx, by + 6, '', style(16, INK, '900')).setOrigin(0.5);
      const desc = this.add.text(bx, by + 26, '', style(10.5, RULE, '700')).setOrigin(0.5);
      objects.push(plaque, icon, label, desc);
      this.giftParts.push({ plaque, icon, label, desc });
    });
    this.giftCard = this.add.container(0, 0, objects).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x2a170a, 0.55).setInteractive();
    const panel = this.add.image(VIEW.w / 2, VIEW.h / 2, 'walnut-520x260');
    const title = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 90, 'The kingdom is built', style(28, CREAM, '900', { shadow: { offsetX: 1, offsetY: 2, color: 'rgba(0,0,0,0.45)', fill: true } }))
      .setOrigin(0.5);
    this.gameOverText = this.add.text(VIEW.w / 2, VIEW.h / 2 - 8, '', style(15, LABEL, '700', { align: 'center', lineSpacing: 4 })).setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 82, 'New kingdom', () => this.restart());
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
    const p = at && kind ? previewPlacement(this.state, kind, at.col, at.row) : null;
    this.preview = at && p ? { ...at, ...p } : null;
    this.drawHover(at);
  }

  private tapAt(x: number, y: number) {
    const at = this.cellAt(x, y);
    if (!at) return;
    const placed = place(this.state, at.col, at.row);
    if (!placed) return;
    if (placed.decree) saveCrowns(this.state.crowns);
    if (this.state.phase === 'over') saveBest(this.state.best);
    this.redrawCells();
    for (const change of placed.changes) this.popup(change.col, change.row, change.gained, change.col === at.col && change.row === at.row);
    if (placed.decree) this.decreePaid();
    this.refresh();
    this.hoverAt(x, y);
  }

  private takeGift(gift: Gift) {
    if (!chooseGift(this.state, gift)) return;
    if (this.state.phase === 'over') saveBest(this.state.best);
    if (this.state.phase === 'playing') this.announceRound(gift);
    this.refresh();
    this.hoverAt(this.input.activePointer.x, this.input.activePointer.y);
  }

  /** A "+N" that floats up from a cell and fades; it only fades with reduced motion. */
  private popup(col: number, row: number, gained: number, main: boolean) {
    const { x, y } = cellCentre(col, row);
    const color = gained > 0 ? '#f2c33a' : gained < 0 ? '#e0785f' : '#f1d9b0';
    const text = this.add
      .text(x, y - 8, `${gained >= 0 ? '+' : ''}${gained}`, style(main ? 24 : 16, color, '900', { stroke: '#3a2414', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    const rise = settings.reduceMotion ? 0 : 32;
    this.tweens.add({ targets: text, y: y - 8 - rise, alpha: 0, duration: POPUP_MS, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
  }

  /** The decree's "+8" drops from the banner, and the crown count bumps. */
  private decreePaid() {
    const x = this.progressText.x + 12;
    const text = this.add
      .text(x, DECREE.y + DECREE.h + 4, `+${DECREE_BONUS}`, style(22, '#f2c33a', '900', { stroke: '#3a2414', strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    const fall = settings.reduceMotion ? 0 : 30;
    this.tweens.add({ targets: text, y: text.y + fall, alpha: 0, delay: 300, duration: POPUP_MS * 1.4, onComplete: () => text.destroy() });
    if (!settings.reduceMotion) this.tweens.add({ targets: this.crownsText, scale: 1.4, duration: 160, yoyo: true });
  }

  private announceRound(gift: Gift) {
    const s = this.state;
    const tiles = BUILDINGS.filter((b) => ROUND_POUCH[b] > 0)
      .map((b) => `+${ROUND_POUCH[b]} ${INFO[b].name.toLowerCase()}s`)
      .join('  ');
    this.bannerText.setText([`Round ${s.round}`, tiles, `Royal gift: ${GIFT_INFO[gift].label}`]);
    this.banner.setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: BANNER_MS / 2, duration: BANNER_MS / 2 });
  }

  private drawHover(at: { col: number; row: number } | null) {
    const g = this.hover.clear();
    const l = this.links.clear();
    const kind = this.state.selected;
    this.ghost.setVisible(false);
    this.bubbleText.setVisible(false);
    for (const t of this.linkTexts) t.setVisible(false);
    if (!at || this.state.phase !== 'playing') return;
    const ok = canPlace(this.state, at.col, at.row);
    const x = GRID.x + at.col * GRID.cell;
    const y = GRID.y + at.row * GRID.cell;
    g.lineStyle(3.5, ok && kind ? YELLOW : CORAL, 1).strokeRoundedRect(x + 1, y + 1, GRID.cell - 2, GRID.cell - 4, 8);
    if (!this.preview || !kind) return;
    const { x: cx, y: cy } = cellCentre(at.col, at.row);
    if (kind === 'farm') this.ghost.setTexture('tile-farm').setOrigin(0.5).setPosition(cx, cy).setAlpha(0.65);
    else this.ghost.setTexture(`prop-${kind}`).setOrigin(PROP_ORIGIN.x, PROP_ORIGIN.y).setPosition(cx, cy).setAlpha(0.6);
    this.ghost.setVisible(true);

    // A dotted link from each neighbour that pays into the ghost, with its share at the neighbour's end.
    this.preview.links.slice(0, this.linkTexts.length).forEach((link, i) => {
      const dc = at.col - link.col;
      const dr = at.row - link.row;
      const len = Math.hypot(dc, dr);
      const [ux, uy] = [dc / len, dr / len];
      // The share sits off the neighbour's middle, below it or to its left, so its building still shows.
      let [px, py] = [-uy, ux];
      if (py < 0 || (py === 0 && px > 0)) [px, py] = [-px, -py];
      const n = cellCentre(link.col, link.row);
      const start = { x: n.x + px * 12, y: n.y + py * 12 };
      const end = { x: cx - ux * 14 + px * 8, y: cy - uy * 14 + py * 8 };
      const ctrl = { x: (start.x + end.x) / 2 + px * 8, y: (start.y + end.y) / 2 + py * 8 };
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(start.x, start.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(end.x, end.y));
      const dots = Math.max(3, Math.round(curve.getLength() / 6));
      for (const p of curve.getSpacedPoints(dots)) {
        l.fillStyle(0x000000, 0.3).fillCircle(p.x, p.y + 1, 1.7);
        l.fillStyle(0xfff6e2, 1).fillCircle(p.x, p.y, 1.6);
      }
      const label = `${link.pts > 0 ? '+' : ''}${link.pts}`;
      const pw = label.length > 2 ? 34 : 30;
      l.fillStyle(0x000000, 0.3).fillRoundedRect(start.x - pw / 2, start.y - 8, pw, 19, 9.5);
      l.fillStyle(link.pts > 0 ? YELLOW : CORAL, 1).fillRoundedRect(start.x - pw / 2, start.y - 9.5, pw, 19, 9.5);
      this.linkTexts[i].setText(label).setColor(link.pts > 0 ? INK : CREAM).setPosition(start.x, start.y).setVisible(true);
    });
    // The total in a bubble over the ghost.
    const gained = this.preview.gained;
    const by = y - 4;
    l.fillStyle(0x000000, 0.35).fillRoundedRect(cx - 21, by - 10.5, 42, 25, 12.5);
    l.fillStyle(gained < 0 ? CORAL : YELLOW, 1).fillRoundedRect(cx - 21, by - 12.5, 42, 25, 12.5);
    l.lineStyle(1.5, 0xfff6c8, 1).strokeRoundedRect(cx - 21, by - 12.5, 42, 25, 12.5);
    this.bubbleText
      .setText(`${gained >= 0 ? '+' : ''}${gained}`)
      .setColor(gained < 0 ? CREAM : INK)
      .setPosition(cx, by)
      .setVisible(true);
  }

  /** The decree's banner text and progress, and its marks on the board. */
  private refreshDecree() {
    const s = this.state;
    const d = s.decree;
    this.crownsText.setText(`x${s.crowns}`);
    const g = this.marks.clear();
    for (const m of this.markImages) m.destroy();
    this.markImages = [];
    this.placeLabel.setVisible(false);
    for (const b of this.beads) b.setVisible(false);
    if (!d) {
      this.decreeText.setText('No decree this round');
      this.progressText.setText('');
      this.rewardTitle.setVisible(false);
      this.rewardText.setVisible(false);
      return;
    }
    this.rewardTitle.setVisible(true);
    this.rewardText.setVisible(true).setText(d.done ? 'Paid: +8 and a crown' : `+${DECREE_BONUS} and a crown`);
    const marks = decreeMarks(s.grid, d);
    const have = d.done ? d.need : Math.min(marks.have, d.need);
    this.decreeText.setText(d.text);
    let px = this.decreeText.x + this.decreeText.width + 16;
    if (d.need <= this.beads.length) {
      for (let i = 0; i < d.need; i++) this.beads[i].setTexture(i < have ? 'bead-on' : 'bead-off').setPosition(px + i * 18, this.beads[i].y).setVisible(true);
      px += d.need * 18 - 6;
    }
    this.progressText.setText(d.done ? 'Done!' : `${have}/${d.need}`).setX(px);
    if (d.done || s.phase === 'over') return;

    // Outline the lake or wood (or the tower's watch), name it, tick what counts and mark the open spots.
    const outline: At[] = d.kind === 'watch' ? (marks.tower ? this.around(marks.tower) : []) : d.cells;
    this.dashedOutline(g, outline);
    if (d.kind !== 'watch') {
      const cx = d.cells.reduce((t, [c]) => t + c, 0) / d.cells.length;
      const bottom = Math.max(...d.cells.filter(([c]) => Math.abs(c - cx) < 1).map(([, r]) => r), ...d.cells.map(([, r]) => r).slice(0, 1));
      const x = GRID.x + (cx + 0.5) * GRID.cell;
      const y = GRID.y + (bottom + 1) * GRID.cell - 9;
      this.placeLabel.setText(d.place).setPosition(x, y).setVisible(true);
      const w = this.placeLabel.width + 16;
      g.fillStyle(NAVY, 1).fillRoundedRect(x - w / 2, y - 8, w, 16, 8);
    }
    for (const [c, r] of marks.counted) {
      this.markImages.push(this.add.image(GRID.x + c * GRID.cell + 52, GRID.y + r * GRID.cell + 11, 'tick').setDepth(D.ticks));
    }
    if (s.phase === 'playing') {
      const spot = d.kind === 'shore' ? 'spot-farm' : 'spot-house';
      for (const [c, r] of marks.spots) {
        const { x, y } = cellCentre(c, r);
        this.markImages.push(this.add.image(x, y - 2, spot).setDepth(D.spots));
      }
    }
  }

  /** The cells of the 3x3 block around a tower, on the board. */
  private around([col, row]: At): At[] {
    const out: At[] = [];
    for (let r = row - 1; r <= row + 1; r++)
      for (let c = col - 1; c <= col + 1; c++) if (c >= 0 && r >= 0 && c < GRID.cols && r < GRID.rows) out.push([c, r]);
    return out;
  }

  /** A yellow dashed line round the outer edges of a group of cells. */
  private dashedOutline(g: Phaser.GameObjects.Graphics, cells: At[]) {
    const inside = new Set(cells.map(([c, r]) => `${c},${r}`));
    const has = (c: number, r: number) => inside.has(`${c},${r}`);
    g.lineStyle(3, YELLOW, 1);
    const dash = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      for (let t = 0; t < len; t += 13) {
        const t2 = Math.min(len, t + 8);
        g.lineBetween(x1 + ((x2 - x1) * t) / len, y1 + ((y2 - y1) * t) / len, x1 + ((x2 - x1) * t2) / len, y1 + ((y2 - y1) * t2) / len);
      }
    };
    const inset = 2;
    for (const [c, r] of cells) {
      const x0 = GRID.x + c * GRID.cell + inset;
      const y0 = GRID.y + r * GRID.cell + inset;
      const x1 = GRID.x + (c + 1) * GRID.cell - inset;
      const y1 = GRID.y + (r + 1) * GRID.cell - inset;
      if (!has(c, r - 1)) dash(x0, y0, x1, y0);
      if (!has(c, r + 1)) dash(x0, y1, x1, y1);
      if (!has(c - 1, r)) dash(x0, y0, x0, y1);
      if (!has(c + 1, r)) dash(x1, y0, x1, y1);
    }
  }

  /** The gift row: "Gift at N:" and the two gifts as chips; they glow while the gift waits. */
  private refreshGifts() {
    const s = this.state;
    const choosing = s.phase === 'gift';
    const g = this.chips.clear();
    const show = s.phase !== 'over';
    s.gifts.forEach((gift, i) => this.chipParts[i].text.setText(GIFT_INFO[gift].label));
    const chipsW = this.chipParts.reduce((t, p) => t + 26 + p.text.width, 16);
    // The label shortens when two long gifts would run past the panel's edge.
    const room = PANEL.x + PANEL.w - 6 - GIFT_ROW.x - chipsW - 6;
    this.giftLabel.setVisible(show).setText(choosing ? 'Pick one:' : `Gift at ${s.goal}:`);
    if (this.giftLabel.width > room) this.giftLabel.setText(choosing ? 'Pick:' : `At ${s.goal}:`);
    this.giftOr.setVisible(show);
    let x = this.giftLabel.x + this.giftLabel.width + 6;
    const y = GIFT_ROW.y;
    const h = GIFT_ROW.h;
    s.gifts.forEach((gift, i) => {
      const part = this.chipParts[i];
      const info = GIFT_INFO[gift];
      const w = 26 + part.text.width;
      if (show) {
        if (choosing) g.fillStyle(YELLOW, 0.9).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, (h + 4) / 2);
        g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y + 1.5, w, h, h / 2);
        g.fillStyle(BLUE, 1).fillRoundedRect(x, y, w, h, h / 2);
        g.fillStyle(0xffffff, 0.18).fillRoundedRect(x + 1, y + 1, w - 2, h / 2, h / 4);
      }
      part.icon.setTexture(`icon-${info.icon}`).setPosition(x + 11, y + h / 2).setVisible(show);
      part.text.setPosition(x + 20, y + h / 2 + 0.5).setVisible(show);
      part.zone.setPosition(x + w / 2, y + h / 2).setSize(w, h);
      if (part.zone.input) part.zone.input.enabled = choosing;
      if (i === 0) {
        this.giftOr.setX(x + w + 8);
        x += w + 16;
      }
    });

    this.giftCard.setVisible(choosing);
    this.giftButtons = [];
    if (choosing) {
      const reached = s.round - s.giftsDue;
      this.giftTitle.setText(`Round ${reached} goal reached!`);
      this.giftSub.setText(`Choose a royal gift for round ${reached + 1}`);
      const { x: gx, y: gy, button } = GIFT_CARD;
      s.gifts.forEach((gift, i) => {
        const p = this.giftParts[i];
        const info = GIFT_INFO[gift];
        p.icon.setTexture(`icon-${info.icon}-big`);
        p.label.setText(info.label);
        p.desc.setText(info.desc);
        this.giftButtons.push({ gift, x: gx + (i ? 1 : -1) * button.dx, y: gy + button.dy, w: button.w, h: button.h });
      });
    }
  }

  private refresh() {
    const s = this.state;
    const kinds = BUILDINGS.filter((b) => b !== 'windmill' || s.hasWindmill);
    if (kinds.join() !== this.shownKinds) {
      this.shownKinds = kinds.join();
      this.buildButtons(kinds);
    }
    this.roundText.setText(`Round ${s.round}`);
    this.islandText.setText(`Island ${s.island}`);
    this.scoreText.setText(`Score ${s.score}`);
    this.goalText.setText(`${s.score} / ${s.goal} for round ${s.round + 1}`);
    this.bestText.setText(`Best score ${s.best}`);

    // The goal bar is a groove filled with green from the last round's goal to this one's.
    const from = s.round === 1 ? 0 : goalFor(s.round - 1);
    const fill = Phaser.Math.Clamp((s.score - from) / (s.goal - from), 0, 1);
    const B = GOAL_BAR;
    const fw = Math.round((B.w - 4) * fill);
    this.bar.clear();
    this.bar.fillStyle(0x2e1a0c).fillRoundedRect(B.x, B.y, B.w, B.h, 8);
    if (fw >= 12) {
      this.bar.fillStyle(0x4f9a3d).fillRoundedRect(B.x + 2, B.y + 2, fw, B.h - 4, 6);
      this.bar.fillStyle(0x86c871).fillRoundedRect(B.x + 4, B.y + 3, fw - 4, (B.h - 4) / 2 - 1, 3);
    }

    for (const [kind, parts] of this.buttons) {
      const left = s.pouch[kind];
      const chosen = s.selected === kind;
      parts.glow.setVisible(chosen);
      parts.plaque.setTexture(chosen ? `${parts.key}-sel` : parts.key);
      parts.name.setColor(chosen ? '#b0401f' : INK);
      parts.icon.setAlpha(left > 0 ? 1 : 0.35);
      parts.count.setText(`x${left}`).setColor(left > 0 ? CREAM : '#9aa3b8');
    }

    const undoable = canUndo(s);
    const usedHere = s.undoneIn === s.round;
    this.undoText.setText(usedHere && !undoable ? 'Undo used this round' : 'Undo last tile');
    this.undoBg.setAlpha(undoable ? 1 : 0.5);
    this.undoText.setAlpha(undoable ? 1 : 0.5);

    this.refreshDecree();
    this.refreshGifts();

    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `Final score ${s.score} on island ${s.island}, reaching round ${s.round}.\n${s.placed} buildings placed.\n\nBest score ${s.best}.  Crowns ${s.crowns}.`,
      );
    }
  }

  /** A new kingdom on a fresh random island. */
  private restart() {
    // The best score and crowns carry over even when storage is blocked and comes back empty.
    this.state = newGame(Math.max(loadBest(), this.state.best), Math.max(loadCrowns(), this.state.crowns));
    this.redrawCells();
    this.preview = null;
    this.drawHover(null);
    this.refresh();
  }

  /** Shows each cell's current tile and what stands on it. */
  private redrawCells() {
    this.state.grid.forEach((cells, row) =>
      cells.forEach((cell, col) => {
        this.tiles[row][col].setTexture(tileKey(cell, col, row));
        const prop = propKey(cell);
        this.props[row][col].setVisible(!!prop);
        if (prop) this.props[row][col].setTexture(prop);
      }),
    );
  }
}
