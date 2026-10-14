import Phaser from 'phaser';
import { iconTexture } from '../art/icons';
import { FONT, UI_DEPTH, UPGRADE_LIST, VIEW } from '../scenes/layout';
import { UPGRADE_IDS, UPGRADES, type UpgradeId } from '../game/upgrades';
import { makeButton } from './Button';

/**
 * The upgrades the hero has taken: a small "Upgrades" button in the top bar opens a panel with each
 * one's icon, name, rank and what a rank does. The battle (and any auto-pick countdown) waits while
 * it is open.
 */
export class UpgradeList {
  /** Whether the panel is up; the scene holds the battle still while it is. */
  open = false;
  private button: Phaser.GameObjects.Container;
  private buttonText: Phaser.GameObjects.Text;
  private buttonBg: Phaser.GameObjects.Rectangle;
  private root: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Container;
  private shown = '';

  constructor(private scene: Phaser.Scene) {
    const { x, y, w, h } = UPGRADE_LIST.button;
    this.buttonBg = scene.add.rectangle(0, 0, w, h, 0x5c3a21).setStrokeStyle(2, 0xc9a040);
    this.buttonText = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#f3e9d2' }).setOrigin(0.5);
    this.buttonBg
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.buttonBg.setFillStyle(0x8a5a32))
      .on('pointerout', () => this.buttonBg.setFillStyle(0x5c3a21))
      .on('pointerdown', () => this.setOpen(true));
    // Above the level-up overlay, so the hero's upgrades can be checked while choosing the next one.
    this.button = scene.add.container(x, y, [this.buttonBg, this.buttonText]).setDepth(UI_DEPTH + 15);

    const p = UPGRADE_LIST.panel;
    const dim = scene.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7)
      .setInteractive()
      .on('pointerdown', () => this.setOpen(false));
    // The panel swallows taps so only taps beside it close it.
    const panel = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, p.w, p.h, 0x2c2018).setStrokeStyle(4, 0x8a5a32).setInteractive();
    const top = VIEW.h / 2 - p.h / 2;
    const title = scene.add
      .text(VIEW.w / 2, top + 30, 'Upgrades taken', { fontFamily: FONT, fontSize: '24px', color: '#f3c64e', stroke: '#1a1216', strokeThickness: 4 })
      .setOrigin(0.5);
    const note = scene.add
      .text(VIEW.w / 2, top + 56, 'The battle waits while this is open', { fontFamily: FONT, fontSize: '12px', color: '#c9b48f' })
      .setOrigin(0.5);
    this.rows = scene.add.container(0, 0);
    const close = makeButton(scene, VIEW.w / 2, VIEW.h / 2 + p.h / 2 - 32, 'Back', () => this.setOpen(false));
    this.root = scene.add.container(0, 0, [dim, panel, title, note, this.rows, close]).setDepth(UI_DEPTH + 30).setVisible(false);
  }

  /** Updates the button's count, hides it for `hidden`, and rebuilds the panel when the ranks change. */
  show(ranks: Partial<Record<UpgradeId, number>>, hidden: boolean) {
    const taken = UPGRADE_IDS.filter((id) => (ranks[id] ?? 0) > 0);
    this.buttonText.setText(`Upgrades (${taken.length})`);
    this.button.setVisible(!hidden);
    if (hidden) this.setOpen(false);
    const key = taken.map((id) => `${id}:${ranks[id]}`).join();
    if (key === this.shown) return;
    this.shown = key;
    this.rows.removeAll(true);
    if (taken.length === 0) {
      this.rows.add(
        this.scene.add
          .text(VIEW.w / 2, VIEW.h / 2, 'No upgrades yet.\nEach level-up offers three to choose from.', {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#f1e3c6',
            align: 'center',
          })
          .setOrigin(0.5),
      );
      return;
    }
    const { cols, colW, rowH, top } = UPGRADE_LIST;
    const left = VIEW.w / 2 - (cols * colW) / 2;
    taken.forEach((id, i) => {
      const u = UPGRADES[id];
      const x = left + (i % cols) * colW;
      const y = top + Math.floor(i / cols) * rowH;
      const rank = ranks[id] ?? 0;
      this.rows.add([
        this.scene.add.image(x + 16, y + 18, iconTexture(u.icon)).setScale(0.6),
        this.scene.add.text(x + 40, y, u.name, { fontFamily: FONT, fontSize: '15px', color: '#f3c64e' }),
        this.scene.add.text(x + colW - 14, y + 1, `${rank}/${u.maxRank}`, {
          fontFamily: FONT,
          fontSize: '13px',
          color: rank === u.maxRank ? '#8cc35a' : '#c9b48f',
        }).setOrigin(1, 0),
        this.scene.add.text(x + 40, y + 19, u.text, { fontFamily: FONT, fontSize: '11px', color: '#f1e3c6', wordWrap: { width: colW - 54 } }),
      ]);
    });
  }

  private setOpen(open: boolean) {
    this.open = open;
    this.root.setVisible(open);
  }
}
