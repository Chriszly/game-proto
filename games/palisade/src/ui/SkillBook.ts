import Phaser from 'phaser';
import { iconTexture } from '../art/icons';
import { FONT, SKILL_BOOK, UI_DEPTH, VIEW } from '../scenes/layout';
import { UPGRADE_IDS, UPGRADES, type UpgradeId } from '../game/upgrades';
import { makeButton } from './Button';

/**
 * The skill book: a "Skill book" button in the top bar opens a page with a slot for every upgrade.
 * A slot is an empty placeholder until that upgrade is first offered on a level-up; then it shows
 * the upgrade's icon, name, what a rank does and the hero's rank. The battle (and any auto-pick
 * countdown) waits while it is open.
 */
export class SkillBook {
  /** Whether the book is open; the scene holds the battle still while it is. */
  open = false;
  private button: Phaser.GameObjects.Container;
  private buttonText: Phaser.GameObjects.Text;
  private buttonBg: Phaser.GameObjects.Rectangle;
  private root: Phaser.GameObjects.Container;
  private slots: Phaser.GameObjects.Container;
  private shown = '';

  constructor(private scene: Phaser.Scene) {
    const { x, y, w, h } = SKILL_BOOK.button;
    this.buttonBg = scene.add.rectangle(0, 0, w, h, 0x5c3a21).setStrokeStyle(2, 0xc9a040);
    this.buttonText = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#f3e9d2' }).setOrigin(0.5);
    this.buttonBg
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.buttonBg.setFillStyle(0x8a5a32))
      .on('pointerout', () => this.buttonBg.setFillStyle(0x5c3a21))
      .on('pointerdown', () => this.setOpen(true));
    // Above the level-up overlay, so the book can be checked while choosing the next upgrade.
    this.button = scene.add.container(x, y, [this.buttonBg, this.buttonText]).setDepth(UI_DEPTH + 15);

    const p = SKILL_BOOK.panel;
    const dim = scene.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7)
      .setInteractive()
      .on('pointerdown', () => this.setOpen(false));
    // The page swallows taps so only taps beside it close it.
    const panel = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, p.w, p.h, 0x2c2018).setStrokeStyle(4, 0x8a5a32).setInteractive();
    const top = VIEW.h / 2 - p.h / 2;
    const title = scene.add
      .text(VIEW.w / 2, top + 26, 'Skill book', { fontFamily: FONT, fontSize: '24px', color: '#f3c64e', stroke: '#1a1216', strokeThickness: 4 })
      .setOrigin(0.5);
    const note = scene.add
      .text(VIEW.w / 2, top + 50, 'Each page fills in the first time a level-up offers that skill. The battle waits while the book is open.', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#c9b48f',
      })
      .setOrigin(0.5);
    this.slots = scene.add.container(0, 0);
    const close = makeButton(scene, VIEW.w / 2, VIEW.h / 2 + p.h / 2 - 28, 'Back', () => this.setOpen(false));
    this.root = scene.add.container(0, 0, [dim, panel, title, note, this.slots, close]).setDepth(UI_DEPTH + 30).setVisible(false);
  }

  /**
   * Updates the button's count, hides it for `hidden`, and redraws the slots when what has been
   * found or taken changes.
   */
  show(found: ReadonlySet<UpgradeId>, ranks: Partial<Record<UpgradeId, number>>, hidden: boolean) {
    this.buttonText.setText(`Skill book ${found.size}/${UPGRADE_IDS.length}`);
    this.button.setVisible(!hidden);
    if (hidden) this.setOpen(false);
    const key = UPGRADE_IDS.map((id) => (found.has(id) ? ranks[id] ?? 0 : '-')).join();
    if (key === this.shown) return;
    this.shown = key;
    this.slots.removeAll(true);
    const { cols, colW, rowH, top } = SKILL_BOOK;
    const left = VIEW.w / 2 - (cols * colW) / 2;
    UPGRADE_IDS.forEach((id, i) => {
      const x = left + (i % cols) * colW;
      const y = top + Math.floor(i / cols) * rowH;
      this.addSlot(id, x, y, found.has(id), ranks[id] ?? 0);
    });
  }

  private addSlot(id: UpgradeId, x: number, y: number, found: boolean, rank: number) {
    const { colW, rowH } = SKILL_BOOK;
    const scene = this.scene;
    const u = UPGRADES[id];
    const back = scene.add
      .rectangle(x + 2, y - 4, colW - 8, rowH - 4, found ? 0x3b2a1e : 0x241a14)
      .setOrigin(0)
      .setStrokeStyle(1, found ? 0x8a5a32 : 0x4a3626);
    const iconBack = scene.add.rectangle(x + 22, y + 18, 34, 34, 0x1a1216).setStrokeStyle(1, 0x4a3626);
    if (!found) {
      // An empty placeholder: a blank icon frame and a line where the name will go.
      this.slots.add([
        back,
        iconBack,
        scene.add.text(x + 22, y + 18, '?', { fontFamily: FONT, fontSize: '18px', color: '#5a4636' }).setOrigin(0.5),
        scene.add.rectangle(x + 46, y + 8, 110, 6, 0x3b2a1e).setOrigin(0, 0.5),
        scene.add.rectangle(x + 46, y + 24, 170, 4, 0x2f231b).setOrigin(0, 0.5),
        scene.add.rectangle(x + 46, y + 32, 130, 4, 0x2f231b).setOrigin(0, 0.5),
      ]);
      return;
    }
    const taken = rank > 0;
    const rankText = u.filler ? `${rank}x` : `${rank}/${u.maxRank}`;
    this.slots.add([
      back,
      iconBack,
      scene.add.image(x + 22, y + 18, iconTexture(u.icon)).setScale(0.6).setAlpha(taken ? 1 : 0.55),
      scene.add.text(x + 46, y, u.name, { fontFamily: FONT, fontSize: '14px', color: taken ? '#f3c64e' : '#c9b48f' }),
      scene.add
        .text(x + colW - 14, y + 1, rankText, {
          fontFamily: FONT,
          fontSize: '13px',
          color: !u.filler && rank === u.maxRank ? '#8cc35a' : taken ? '#f1e3c6' : '#7a6650',
        })
        .setOrigin(1, 0),
      scene.add.text(x + 46, y + 18, u.text, { fontFamily: FONT, fontSize: '11px', color: '#f1e3c6', wordWrap: { width: colW - 60 } }).setAlpha(taken ? 1 : 0.7),
    ]);
  }

  private setOpen(open: boolean) {
    this.open = open;
    this.root.setVisible(open);
  }
}
