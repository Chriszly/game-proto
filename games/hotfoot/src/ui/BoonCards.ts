import Phaser from 'phaser';
import { bakePanel } from '../art/hud';
import { iconTexture } from '../art/icons';
import { C, N } from '../art/ink';
import { BOONS, type BoonId } from '../game/boons';
import { CARDS, FONT, UI_DEPTH, VIEW } from '../scenes/layout';

/** Where a card is on screen and which boon it offers; read by the playthrough test. */
export interface CardSpot {
  id: BoonId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The checkpoint choice: the run dims and two boon cards come up, vellum leaves ruled in gold with a
 * painted icon. Tapping one takes it.
 */
export class BoonCards {
  private root: Phaser.GameObjects.Container;
  private shown: BoonId[] | null = null;
  private title: Phaser.GameObjects.Text;
  cards: CardSpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: BoonId) => void,
  ) {
    if (!scene.textures.exists('card')) bakePanel(scene, 'card', CARDS.w, CARDS.h);
    if (!scene.textures.exists('title-strip')) bakePanel(scene, 'title-strip', 440, 50);
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, N.ink, 0.55).setInteractive();
    const y = CARDS.y - CARDS.h / 2 - 40;
    const strip = scene.add.image(VIEW.w / 2, y, 'title-strip');
    this.title = scene.add.text(VIEW.w / 2, y, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: C.madder }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [dim, strip, this.title]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** Shows these choices, or hides the panel for null. Rebuilds the cards only when they change. */
  show(choices: BoonId[] | null, ranks: Partial<Record<BoonId, number>>, stage: number) {
    if (choices?.join() === this.shown?.join()) return;
    this.shown = choices ? [...choices] : null;
    this.root.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.cards = [];
    this.root.setVisible(!!choices);
    if (!choices) return;
    this.title.setText(`Checkpoint ${stage}! Choose a boon`);
    choices.forEach((id, i) => this.addCard(id, CARDS.xs[i], ranks[id] ?? 0));
  }

  private addCard(id: BoonId, x: number, rank: number) {
    const b = BOONS[id];
    const { y, w, h } = CARDS;
    const scene = this.scene;
    const bg = scene.add.image(0, 0, 'card');
    const glow = scene.add.rectangle(0, 0, w + 4, h + 4).setStrokeStyle(4, N.madder).setVisible(false);
    const icon = scene.add.image(0, -h / 2 + 62, iconTexture(id));
    const name = scene.add
      .text(0, -h / 2 + 122, b.name, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: C.madder, align: 'center' })
      .setOrigin(0.5);
    const rankText = b.filler ? 'Heal' : rank === 0 ? (b.maxRank === 1 ? 'New' : `New, ${b.maxRank} ranks`) : `Rank ${rank + 1} of ${b.maxRank}`;
    const ranked = scene.add
      .text(0, -h / 2 + 148, rankText, { fontFamily: FONT, fontSize: '14px', fontStyle: 'italic', color: rank === 0 ? '#2f7a4a' : C.lapis })
      .setOrigin(0.5);
    const text = scene.add
      .text(0, -h / 2 + 172, b.text, { fontFamily: FONT, fontSize: '17px', color: C.ink, align: 'center', wordWrap: { width: w - 44 } })
      .setOrigin(0.5, 0);
    const card = scene.add.container(x, y, [bg, glow, icon, name, ranked, text]).setData('card', true);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => glow.setVisible(true))
      .on('pointerout', () => glow.setVisible(false))
      .on('pointerdown', () => this.onPick(id));
    this.root.add(card);
    this.cards.push({ id, x, y, w, h });
  }
}
