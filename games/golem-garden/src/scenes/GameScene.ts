import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { MAP, cellAt, pathPoint } from '../game/board';
import { GOLEMS, GOLEM_INFO, MAX_LEVEL, golemStats, waveBonus, type GolemKind } from '../game/data';
import { loadBest, saveBest } from '../game/save';
import {
  SHOT_MS,
  canPlant,
  golemAt,
  newGame,
  plant,
  select,
  startWave,
  tick,
  upgrade,
  upgradeCost,
  type GameState,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { FONT, GRID, HUD, PANEL, SEED_BUTTONS, UI_DEPTH, VIEW, WAVE_BUTTON, cellCentre } from './layout';

/** The longest frame the rules play in one go, in ms; a longer pause (a hidden tab) plays as this. */
const MAX_STEP_MS = 100;
/** How long the "Wave cleared" banner shows, in ms. */
const BANNER_MS = 1600;

type Rect = { x: number; y: number; w: number; h: number };

export class GameScene extends Phaser.Scene {
  state!: GameState;
  /** Where the seed buttons are, in view pixels; read by the playthrough test. */
  seedButtons: (Rect & { kind: GolemKind })[] = [];
  /** Where the wave button is, in view pixels; read by the playthrough test. */
  waveButton: Rect = { x: WAVE_BUTTON.x, y: WAVE_BUTTON.y, w: WAVE_BUTTON.w, h: WAVE_BUTTON.h };

  private lastFrame: number | null = null;
  private hover: { col: number; row: number } | null = null;
  private golems = new Map<number, Phaser.GameObjects.Image>();
  private pests = new Map<number, Phaser.GameObjects.Image>();
  private shots = new Map<number, Phaser.GameObjects.Image>();
  private heartTile!: Phaser.GameObjects.Image;
  private bars!: Phaser.GameObjects.Graphics;
  private hoverGfx!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private hudText!: { wave: Phaser.GameObjects.Text; heart: Phaser.GameObjects.Text; sap: Phaser.GameObjects.Text; best: Phaser.GameObjects.Text };
  private seedBgs: Phaser.GameObjects.Rectangle[] = [];
  private waveBg!: Phaser.GameObjects.Rectangle;
  private waveText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.lastFrame = null;
    this.golems.clear();
    this.pests.clear();
    this.shots.clear();

    this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x1d2614).setOrigin(0);
    this.createBoard();
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 20);
    this.hoverGfx = this.add.graphics().setDepth(UI_DEPTH - 30);
    this.ghost = this.add.image(0, 0, 'golem-pebble').setAlpha(0.5).setOrigin(0.5, 1).setVisible(false).setDepth(UI_DEPTH - 31);
    this.createHud();
    this.createPanel();
    this.banner = this.add
      .text(GRID.x + (GRID.cols * GRID.cell) / 2, GRID.y + 40, '', { fontFamily: FONT, fontSize: '28px', color: '#f3e9d2', stroke: '#1a1216', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
      .setAlpha(0);
    this.createGameOver();
    this.refresh();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const { wave, heart, phase, best } = s;
    tick(s, dt);
    if (s.heart < heart) this.heartHit();
    if (s.wave > wave) this.showBanner(`Wave ${wave} cleared!  +${waveBonus(wave)} sap`);
    if (s.best > best) saveBest(s.best);
    if (s.phase === 'over' && phase !== 'over') this.gameOver.setVisible(true);
    this.bars.clear();
    this.drawGolems();
    this.drawPests();
    this.drawShots();
    this.drawHover();
    this.refresh();
  }

  private createBoard() {
    for (let row = 0; row < GRID.rows; row++) {
      for (let col = 0; col < GRID.cols; col++) {
        const cell = MAP[row][col];
        const key = cell === 'soil' ? `cell-soil-${(col * 7 + row * 3) % 3}` : `cell-${cell}`;
        const { x, y } = cellCentre(col, row);
        const image = this.add.image(x, y, key);
        if (cell === 'heart') this.heartTile = image.setDepth(y + GRID.cell / 2);
      }
    }
    // The path runs on past the board's left edge, where the pests come in.
    const { y } = cellCentre(0, 1);
    this.add.image(GRID.x - GRID.cell / 2, y, 'cell-path');
    this.add.rectangle(0, 0, GRID.x, VIEW.h, 0x1d2614).setOrigin(0).setDepth(UI_DEPTH - 40);

    const zone = this.add.zone(GRID.x, GRID.y, GRID.cols * GRID.cell, GRID.rows * GRID.cell).setOrigin(0).setInteractive();
    zone.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = cellAt(p.x, p.y)));
    zone.on('pointerout', () => (this.hover = null));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.hover = cellAt(p.x, p.y);
      if (this.hover) this.tapCell(this.hover.col, this.hover.row);
    });
  }

  private tapCell(col: number, row: number) {
    const s = this.state;
    const golem = golemAt(s, col, row);
    if (golem) upgrade(s, golem);
    else plant(s, col, row);
    this.refresh();
  }

  private createHud() {
    const style = { fontFamily: FONT, fontSize: '20px', color: '#f3e9d2' };
    this.add.text(GRID.x, HUD.y, 'Golem Garden', { ...style, color: '#f3c64e' }).setOrigin(0, 0.5);
    this.hudText = {
      wave: this.add.text(250, HUD.y, '', style).setOrigin(0, 0.5),
      heart: this.add.text(408, HUD.y, '', style).setOrigin(0, 0.5),
      sap: this.add.text(528, HUD.y, '', style).setOrigin(0, 0.5),
      best: this.add.text(944, HUD.y, '', { ...style, fontSize: '16px', color: '#c9b48f' }).setOrigin(1, 0.5),
    };
    this.add.image(392, HUD.y, 'leaf');
    this.add.image(512, HUD.y, 'sap');
  }

  private createPanel() {
    this.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x2a3a1c).setOrigin(0).setStrokeStyle(3, 0x4a6a32);
    this.add.text(SEED_BUTTONS.x, PANEL.y + 16, 'Seeds', { fontFamily: FONT, fontSize: '18px', color: '#f3c64e' }).setOrigin(0.5);
    this.seedButtons = GOLEMS.map((kind, i) => {
      const x = SEED_BUTTONS.x;
      const y = SEED_BUTTONS.ys[i];
      const info = GOLEM_INFO[kind];
      const bg = this.add.rectangle(x, y, SEED_BUTTONS.w, SEED_BUTTONS.h, 0x3d5a2a).setStrokeStyle(3, 0x4a6a32);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        select(this.state, kind);
        this.refresh();
      });
      this.seedBgs.push(bg);
      this.add.image(x - 40, y + 4, `golem-${kind}`).setScale(0.75);
      const text = { fontFamily: FONT, color: '#f3e9d2' };
      this.add.text(x - 16, y - 34, info.name.replace(' ', '\n'), { ...text, fontSize: '14px' });
      this.add.image(x - 8, y + 9, 'sap').setScale(0.75);
      this.add.text(x + 2, y + 9, String(info.cost), { ...text, fontSize: '15px' }).setOrigin(0, 0.5);
      this.add.text(x - 16, y + 28, info.blurb, { ...text, fontSize: '11px', color: '#c9b48f' }).setOrigin(0, 0.5);
      return { kind, x, y, w: SEED_BUTTONS.w, h: SEED_BUTTONS.h };
    });
    this.hint = this.add
      .text(PANEL.x + 10, 284, '', { fontFamily: FONT, fontSize: '12px', color: '#d8c7a6', wordWrap: { width: PANEL.w - 20 } })
      .setLineSpacing(3);

    this.waveBg = this.add.rectangle(WAVE_BUTTON.x, WAVE_BUTTON.y, WAVE_BUTTON.w, WAVE_BUTTON.h, 0x8f6a24).setStrokeStyle(3, 0xf3c64e);
    this.waveBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      startWave(this.state);
      this.refresh();
    });
    this.waveText = this.add.text(WAVE_BUTTON.x, WAVE_BUTTON.y, '', { fontFamily: FONT, fontSize: '16px', color: '#fff6dc', align: 'center' }).setOrigin(0.5);
  }

  private createGameOver() {
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x0a0806, 0.75).setOrigin(0).setInteractive();
    const title = this.add
      .text(VIEW.w / 2, 200, 'The Heartwood has fallen', { fontFamily: FONT, fontSize: '32px', color: '#f3c64e' })
      .setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, 260, '', { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, 340, 'Replant', () => this.scene.restart());
    this.gameOver = this.add.container(0, 0, [dim, title, this.gameOverText, again]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** Rewrites the HUD and panel from the state. */
  private refresh() {
    const s = this.state;
    this.hudText.wave.setText(`Wave ${s.wave}`);
    this.hudText.heart.setText(String(s.heart));
    this.hudText.sap.setText(String(s.sap));
    this.hudText.best.setText(`Best: ${s.best} waves`);
    this.seedBgs.forEach((bg, i) => {
      const kind = GOLEMS[i];
      bg.setStrokeStyle(3, s.selected === kind ? 0xf3c64e : 0x4a6a32);
      bg.setFillStyle(s.sap >= GOLEM_INFO[kind].cost ? 0x3d5a2a : 0x2f3a26);
    });
    const building = s.phase === 'build';
    this.waveBg.setFillStyle(building ? 0x8f6a24 : 0x4a3a1c);
    this.waveText.setText(building ? `Start wave ${s.wave}` : `Wave ${s.wave}...`);

    const hovered = this.hover && golemAt(s, this.hover.col, this.hover.row);
    if (hovered) {
      const cost = upgradeCost(hovered);
      const name = GOLEM_INFO[hovered.kind].name;
      this.hint.setText(
        hovered.growMs > 0
          ? `${name}\nstill growing.`
          : cost === null
            ? `${name}, level ${hovered.level}.\nAt its strongest.`
            : `${name}, level ${hovered.level}.\nTap to raise it to level ${hovered.level + 1} for ${cost} sap.`,
      );
    } else {
      this.hint.setText('Tap soil to plant the picked seed. It grows into a golem.\n\nTap a golem to raise its level.');
    }
    if (s.phase === 'over') {
      this.gameOverText.setText(`Pests ate the Heartwood on wave ${s.wave}.\n${s.kills} pests squashed. Best: ${s.best} waves cleared.`);
    }
  }

  private drawGolems() {
    const s = this.state;
    const seen = new Set<number>();
    for (const g of s.golems) {
      seen.add(g.id);
      const { x, y } = cellCentre(g.col, g.row);
      let image = this.golems.get(g.id);
      if (!image) {
        image = this.add.image(x, y + 24, 'sprout').setOrigin(0.5, 1).setDepth(y + 24);
        this.golems.set(g.id, image);
      }
      image.setTexture(g.growMs > 0 ? 'sprout' : `golem-${g.kind}`);
      if (g.growMs > 0) {
        const done = 1 - g.growMs / GOLEM_INFO[g.kind].growMs;
        this.bars.fillStyle(0x1a1216).fillRect(x - 20, y + 24, 40, 5);
        this.bars.fillStyle(0x8cc85a).fillRect(x - 19, y + 25, 38 * done, 3);
      } else {
        for (let i = 0; i < MAX_LEVEL; i++) {
          this.bars.fillStyle(i < g.level ? 0xf3c64e : 0x1a1216, i < g.level ? 1 : 0.5).fillRect(x - 13 + i * 10, y + 26, 6, 4);
        }
      }
    }
    for (const [id, image] of this.golems) if (!seen.has(id)) (image.destroy(), this.golems.delete(id));
  }

  private drawPests() {
    const seen = new Set<number>();
    for (const p of this.state.pests) {
      seen.add(p.id);
      const pos = pathPoint(p.dist);
      let image = this.pests.get(p.id);
      if (!image) {
        image = this.add.image(pos.x, pos.y, `pest-${p.kind}`).setOrigin(0.5, 0.8);
        this.pests.set(p.id, image);
      }
      // Crows hop up and down as they fly; held still with reduced motion.
      const bob = p.kind === 'crow' && !settings.reduceMotion ? Math.sin(p.dist / 8) * 3 - 8 : p.kind === 'crow' ? -8 : 0;
      image.setPosition(pos.x, pos.y + bob).setDepth(pos.y).setFlipX(pos.facing < 0);
      if (p.hitMs > 0 && !settings.reduceMotion) image.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (p.slowMs > 0) image.setTint(0x9ae07a).setTintMode(Phaser.TintModes.MULTIPLY);
      else image.clearTint();
      if (p.hp < p.maxHp) {
        this.bars.fillStyle(0x1a1216).fillRect(pos.x - 13, pos.y - 26, 26, 5);
        this.bars.fillStyle(0xf3c64e).fillRect(pos.x - 12, pos.y - 25, 24 * Math.max(0, p.hp / p.maxHp), 3);
      }
    }
    for (const [id, image] of this.pests) if (!seen.has(id)) (image.destroy(), this.pests.delete(id));
  }

  private drawShots() {
    const seen = new Set<number>();
    for (const shot of this.state.shots) {
      seen.add(shot.id);
      let image = this.shots.get(shot.id);
      if (!image) {
        image = this.add.image(shot.from.x, shot.from.y, `shot-${shot.kind}`).setDepth(UI_DEPTH - 25);
        this.shots.set(shot.id, image);
      }
      const t = 1 - shot.ms / SHOT_MS;
      const arc = Math.sin(t * Math.PI) * 18;
      image.setPosition(shot.from.x + (shot.to.x - shot.from.x) * t, shot.from.y + (shot.to.y - shot.from.y) * t - arc);
    }
    for (const [id, image] of this.shots) if (!seen.has(id)) (image.destroy(), this.shots.delete(id));
  }

  /** Outlines the hovered cell and shows the reach of the seed it would plant or the golem on it. */
  private drawHover() {
    const g = this.hoverGfx.clear();
    this.ghost.setVisible(false);
    const s = this.state;
    if (!this.hover || s.phase === 'over') return;
    const { col, row } = this.hover;
    const { x, y } = cellCentre(col, row);
    const golem = golemAt(s, col, row);
    if (golem) {
      g.lineStyle(2, 0xf3c64e).strokeRect(x - GRID.cell / 2, y - GRID.cell / 2, GRID.cell, GRID.cell);
      g.fillStyle(0xf3e9d2, 0.12).fillCircle(x, y, golemStats(golem.kind, golem.level).range);
      return;
    }
    if (MAP[row][col] !== 'soil') return;
    const ok = canPlant(s, col, row);
    g.lineStyle(2, ok ? 0xf3e9d2 : 0x8a7a6a).strokeRect(x - GRID.cell / 2, y - GRID.cell / 2, GRID.cell, GRID.cell);
    if (ok) {
      g.fillStyle(0xf3e9d2, 0.12).fillCircle(x, y, golemStats(s.selected, 1).range);
      this.ghost.setTexture(`golem-${s.selected}`).setPosition(x, y + 24).setVisible(true);
    }
  }

  private heartHit() {
    this.cameras.main.shake(160, 0.006);
    if (settings.reduceMotion) return;
    this.heartTile.setTint(0xff9a8a);
    this.time.delayedCall(160, () => this.heartTile.clearTint());
  }

  private showBanner(text: string) {
    this.banner.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: BANNER_MS * 0.6, duration: BANNER_MS * 0.4 });
  }
}
