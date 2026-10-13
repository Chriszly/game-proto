import Phaser from 'phaser';
import { iconTexture } from '../art/icons';
import { CARDS, FONT, UI_DEPTH, VIEW } from '../scenes/layout';
import { UPGRADES, type UpgradeId } from '../game/upgrades';

/** Where a card is on screen and which upgrade it offers; read by the playthrough test. */
export interface CardSpot {
  id: UpgradeId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The level-up choice: the battle dims and three upgrade cards come up. Tapping one takes it.
 */
export class LevelUp {
  private root: Phaser.GameObjects.Container;
  private shown: UpgradeId[] | null = null;
  private title: Phaser.GameObjects.Text;
  cards: CardSpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: UpgradeId) => void,
  ) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.6).setInteractive();
    this.title = scene.add
      .text(VIEW.w / 2, CARDS.y - CARDS.h / 2 - 40, '', { fontFamily: FONT, fontSize: '28px', color: '#f3c64e', stroke: '#1a1216', strokeThickness: 5 })
      .setOrigin(0.5);
    this.root = scene.add.container(0, 0, [dim, this.title]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** Shows these choices, or hides the panel for null. Rebuilds the cards only when they change. */
  show(choices: UpgradeId[] | null, ranks: Partial<Record<UpgradeId, number>>, level: number, more: number) {
    if (choices?.join() === this.shown?.join()) return;
    this.shown = choices ? [...choices] : null;
    this.root.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.cards = [];
    this.root.setVisible(!!choices);
    if (!choices) return;
    this.title.setText(more > 1 ? `Level ${level}! Choose an upgrade (${more} to pick)` : `Level ${level}! Choose an upgrade`);
    choices.forEach((id, i) => this.addCard(id, CARDS.xs[i], ranks[id] ?? 0));
  }

  private addCard(id: UpgradeId, x: number, rank: number) {
    const u = UPGRADES[id];
    const { y, w, h } = CARDS;
    const scene = this.scene;
    const bg = scene.add.rectangle(0, 0, w, h, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const inner = scene.add.rectangle(0, 0, w - 16, h - 16, 0x3b2a1e);
    const icon = scene.add.image(0, -h / 2 + 62, iconTexture(u.icon));
    const name = scene.add
      .text(0, -h / 2 + 122, u.name, { fontFamily: FONT, fontSize: '19px', color: '#f3c64e', align: 'center' })
      .setOrigin(0.5);
    const rankText = u.filler ? 'Repair' : rank === 0 ? (u.maxRank === 1 ? 'New' : `New, ${u.maxRank} ranks`) : `Rank ${rank + 1} of ${u.maxRank}`;
    const ranked = scene.add
      .text(0, -h / 2 + 146, rankText, { fontFamily: FONT, fontSize: '13px', color: rank === 0 ? '#8cc35a' : '#c9b48f' })
      .setOrigin(0.5);
    const text = scene.add
      .text(0, -h / 2 + 170, u.text, { fontFamily: FONT, fontSize: '15px', color: '#f1e3c6', align: 'center', wordWrap: { width: w - 36 } })
      .setOrigin(0.5, 0);
    const card = scene.add.container(x, y, [bg, inner, icon, name, ranked, text]).setData('card', true);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setStrokeStyle(4, 0xf3c64e))
      .on('pointerout', () => bg.setStrokeStyle(4, 0x8a5a32))
      .on('pointerdown', () => this.onPick(id));
    this.root.add(card);
    this.cards.push({ id, x, y, w, h });
  }
}
