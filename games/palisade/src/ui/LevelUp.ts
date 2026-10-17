import Phaser from 'phaser';
import { iconTexture } from '../art/icons';
import { fit } from '../art/lowpoly';
import { GOLD, SLATE } from '../art/palette';
import { AUTO_TOGGLE, CARDS, COUNTDOWN, UI_DEPTH, VIEW } from '../scenes/layout';
import { UPGRADES, type UpgradeId } from '../game/upgrades';
import { AUTO_PICK_MS } from '../game/sim';
import { drawPanel, textStyle } from './panel';
import { t, type TextKey } from '../i18n';

/** What a filler card says under its name instead of a rank. */
const FILLER_NOTE: Partial<Record<UpgradeId, TextKey>> = { mend: 'noteMend', purse: 'notePurse', wind: 'noteWind' };

/** Where a card is on screen and which upgrade it offers; read by the playthrough test. */
export interface CardSpot {
  id: UpgradeId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The level-up choice: the battle dims and three upgrade cards come up. Tapping one takes it; a
 * small countdown under the cards shows when one is taken at random instead.
 */
export class LevelUp {
  private root: Phaser.GameObjects.Container;
  private shown: string | null = null;
  private title: Phaser.GameObjects.Text;
  private countdown: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Graphics;
  private toggleBox: Phaser.GameObjects.Graphics;
  cards: CardSpot[] = [];

  /**
   * `autoPick` is whether the countdown runs; the checkbox right of it flips it and tells the scene
   * through `onAutoPick`.
   */
  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: UpgradeId) => void,
    public autoPick: boolean,
    private onAutoPick: (on: boolean) => void,
  ) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e1218, 0.62).setInteractive();
    this.title = scene.add.text(VIEW.w / 2, CARDS.y - CARDS.h / 2 - 40, '', textStyle(28, '#ffcf4a', 5)).setOrigin(0.5);
    this.countdown = scene.add.text(VIEW.w / 2, COUNTDOWN.y, '', textStyle(15, '#c9c3b6', 4)).setOrigin(0.5);
    this.timer = scene.add.graphics();
    const { x, y, size } = AUTO_TOGGLE;
    this.toggleBox = scene.add.graphics();
    const label = scene.add.text(x + size / 2 + 6, y, t('autoPick'), textStyle(14, '#c9c3b6', 3)).setOrigin(0, 0.5);
    const toggle = scene.add
      .zone(x - size / 2 - 4, y - size / 2 - 4, size + 14 + label.width, size + 8)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.autoPick = !this.autoPick;
        this.onAutoPick(this.autoPick);
      });
    this.root = scene.add
      .container(0, 0, [dim, this.title, this.countdown, this.timer, this.toggleBox, label, toggle])
      .setDepth(UI_DEPTH + 10)
      .setVisible(false);
  }

  /**
   * Shows these choices with `pickMs` left to pick, or hides the panel for null. Rebuilds the cards
   * only when the choices, their ranks, the level or the picks left change.
   */
  show(choices: UpgradeId[] | null, ranks: Partial<Record<UpgradeId, number>>, level: number, more: number, pickMs: number) {
    if (choices) this.drawCountdown(pickMs);
    const key = choices ? `${choices.join()}|${choices.map((id) => ranks[id] ?? 0).join()}|${level}|${more}` : null;
    if (key === this.shown) return;
    this.shown = key;
    this.root.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.cards = [];
    this.root.setVisible(!!choices);
    if (!choices) return;
    this.title.setText(more > 1 ? t('levelUpMore', { level, more }) : t('levelUp', { level }));
    choices.forEach((id, i) => this.addCard(id, CARDS.xs[i], ranks[id] ?? 0));
  }

  /**
   * The seconds left, rounded up, over a bar that empties as the time to pick runs out, and the
   * auto-pick checkbox. With auto-pick off the bar stays grey and the text says so.
   */
  private drawCountdown(pickMs: number) {
    const { x: bx, y: by, size } = AUTO_TOGGLE;
    this.toggleBox.clear();
    this.toggleBox.fillStyle(SLATE.dark).fillRect(bx - size / 2, by - size / 2, size, size);
    this.toggleBox.lineStyle(2, GOLD.mid).strokeRect(bx - size / 2, by - size / 2, size, size);
    if (this.autoPick) {
      this.toggleBox.lineStyle(3, GOLD.light).beginPath();
      this.toggleBox.moveTo(bx - 5, by).lineTo(bx - 1, by + 4).lineTo(bx + 6, by - 5).strokePath();
    }
    this.countdown.setText(this.autoPick ? t('autoPickIn', { n: Math.ceil(pickMs / 1000) }) : t('waitingPick'));
    const { x, y, w, h } = COUNTDOWN;
    const left = Phaser.Math.Clamp(pickMs / AUTO_PICK_MS, 0, 1);
    this.timer.clear();
    this.timer.fillStyle(SLATE.dark).fillRect(x - w / 2 - 2, y + 14, w + 4, h + 4);
    this.timer.fillStyle(SLATE.light).fillRect(x - w / 2, y + 16, w, h);
    if (!this.autoPick) return;
    this.timer.fillStyle(GOLD.mid).fillRect(x - w / 2, y + 16, Math.round(w * left), h);
    this.timer.fillStyle(0xffffff, 0.35).fillRect(x - w / 2, y + 16, Math.round(w * left), 2);
  }

  private addCard(id: UpgradeId, x: number, rank: number) {
    const u = UPGRADES[id];
    const { y, w, h } = CARDS;
    const scene = this.scene;
    const bg = scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      drawPanel(bg, -w / 2, -h / 2, w, h, { c: 16, fill: SLATE.mid, alpha: 1, edge: hover ? GOLD.light : GOLD.dark, lw: hover ? 4 : 3 });
      // The icon sits on a faceted slate medallion.
      bg.fillStyle(SLATE.light).fillCircle(0, -h / 2 + 62, 40);
      bg.fillStyle(0xffffff, 0.06).slice(0, -h / 2 + 62, 40, Math.PI, Math.PI * 2).fillPath();
      bg.lineStyle(2, hover ? GOLD.light : GOLD.mid).strokeCircle(0, -h / 2 + 62, 40);
    };
    draw(false);
    const icon = fit(scene.add.image(0, -h / 2 + 62, iconTexture(u.icon)), 1.1);
    const name = scene.add.text(0, -h / 2 + 122, t(u.name), { ...textStyle(19, '#ffcf4a'), align: 'center' }).setOrigin(0.5);
    const rankText = u.filler
      ? t(FILLER_NOTE[id] ?? 'noteMend')
      : rank === 0
        ? u.maxRank === 1 ? t('rankNew') : t('rankNewRanks', { n: u.maxRank })
        : rank >= u.maxRank ? t('rankNoCap', { n: rank + 1 }) : t('rankOf', { n: rank + 1, max: u.maxRank });
    const ranked = scene.add.text(0, -h / 2 + 146, rankText, textStyle(13, rank === 0 ? '#8fdc6a' : '#c9c3b6')).setOrigin(0.5);
    const text = scene.add
      .text(0, -h / 2 + 170, t(u.text), { ...textStyle(15, '#e9e4d8'), fontStyle: 'normal', align: 'center', wordWrap: { width: w - 36 } })
      .setOrigin(0.5, 0);
    const hit = scene.add.zone(0, 0, w, h);
    const card = scene.add.container(x, y, [bg, icon, name, ranked, text, hit]).setData('card', true);
    hit
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
      .on('pointerdown', () => this.onPick(id));
    this.root.add(card);
    this.cards.push({ id, x, y, w, h });
  }
}
