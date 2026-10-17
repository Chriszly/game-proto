import Phaser from 'phaser';
import { fit } from '../art/lowpoly';
import { GOLD, SLATE } from '../art/palette';
import { FORTIFY, UI_DEPTH, VIEW } from '../scenes/layout';
import { FORT_IDS, FORTS, type FortId } from '../game/forts';
import type { Forts } from '../game/state';
import { drawPanel, textStyle } from './panel';

/**
 * The panel the "Fortify" button opens: three fortifications, one of which can be bought per break
 * for coins (bought during a wave, it is set up when the next break starts). The battle (the
 * break's countdown included) waits while it is open; a tap beside it closes it.
 */
export class FortifyPanel {
  open = false;
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;

  constructor(
    private scene: Phaser.Scene,
    private onBuy: (id: FortId) => void,
  ) {
    const dim = scene.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e1218, 0.35)
      .setInteractive()
      .on('pointerdown', () => this.close());
    this.body = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [dim, this.body]).setDepth(UI_DEPTH + 25).setVisible(false);
  }

  close() {
    this.open = false;
    this.root.setVisible(false);
  }

  /**
   * Opens (or redraws) the panel with what is held, the coins to spend, a note on when one can be
   * bought and which fortifications can be bought now (an armed oil pot cannot be bought again).
   */
  show(forts: Forts, coins: number, note: string, buyable: (id: FortId) => boolean) {
    this.open = true;
    this.root.setVisible(true);
    this.body.removeAll(true);
    const scene = this.scene;
    const { w, h } = FORTIFY.panel;
    const left = VIEW.w / 2 - w / 2;
    const top = VIEW.h / 2 - h / 2;
    const g = scene.add.graphics();
    drawPanel(g, left, top, w, h, { c: 14, fill: SLATE.mid, alpha: 0.98, lw: 2.5 });
    const coinIcon = fit(scene.add.image(left + w - 70, top + 24, 'hud-coin'));
    const coinText = scene.add.text(left + w - 58, top + 24, String(coins), textStyle(14, '#ffe07a')).setOrigin(0, 0.5);
    const title = scene.add.text(left + 18, top + 24, 'Fortify', textStyle(17, '#ffcf4a', 3)).setOrigin(0, 0.5);
    const sub = scene.add
      .text(left + 18, top + 46, note, { ...textStyle(12, '#c9c3b6'), fontStyle: 'normal' })
      .setOrigin(0, 0.5);
    this.body.add([g, coinIcon, coinText, title, sub]);
    const held = (id: FortId) => (forts.queued === id ? 'Queued for the next break' : id === 'stakes' ? (forts.stakeHp > 0 ? `Standing, ${Math.ceil(forts.stakeHp)} left` : '') : id === 'oil' ? (forts.oil ? 'Armed' : '') : forts.lookout > 0 ? `${forts.lookout} wave${forts.lookout > 1 ? 's' : ''} left` : '');
    FORT_IDS.forEach((id, i) => this.addRow(id, left, top + 62 + i * 66, w, held(id), buyable(id) && coins >= FORTS[id].cost));
  }

  /** A fortification's name, text and what is held, with a button that buys it for its cost. */
  private addRow(id: FortId, left: number, y: number, w: number, held: string, afford: boolean) {
    const scene = this.scene;
    const fort = FORTS[id];
    const back = scene.add.graphics();
    drawPanel(back, left + 10, y, w - 20, 60, { c: 6, fill: SLATE.light, alpha: 1, edge: GOLD.dark, lw: 1 });
    const mark = scene.add.graphics();
    this.drawMark(mark, id, left + 38, y + 30);
    const name = scene.add.text(left + 66, y + 13, fort.name, textStyle(14, '#ffe7a0')).setOrigin(0, 0.5);
    const state = scene.add.text(left + 66 + name.width + 10, y + 13, held, textStyle(11, '#8fdc6a')).setOrigin(0, 0.5);
    const desc = scene.add.text(left + 66, y + 24, fort.text, { ...textStyle(11, '#e9e4d8'), fontStyle: 'normal', wordWrap: { width: w - 180 } });
    this.body.add([back, mark, name, state, desc]);
    const bx = left + w - 56;
    const by = y + 30;
    const bg = scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      drawPanel(bg, bx - 40, by - 20, 80, 40, {
        c: 6,
        fill: !afford ? SLATE.panel : hover ? 0x4a4260 : SLATE.mid,
        alpha: 1,
        edge: afford ? (hover ? GOLD.light : GOLD.mid) : 0x4a5060,
        lw: 2,
      });
    };
    draw(false);
    const color = afford ? '#ffe7a0' : '#7a8294';
    const caption = scene.add.text(bx, by - 8, 'Buy', textStyle(13, color)).setOrigin(0.5);
    const coinIcon = fit(scene.add.image(bx - 12, by + 9, 'hud-coin'), 0.75).setAlpha(afford ? 1 : 0.5);
    const cost = scene.add.text(bx - 3, by + 9, String(fort.cost), textStyle(12, color)).setOrigin(0, 0.5);
    const hit = scene.add.zone(bx, by, 80, 40);
    if (afford) {
      hit
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => draw(true))
        .on('pointerout', () => draw(false))
        .on('pointerdown', () => this.onBuy(id));
    }
    this.body.add([bg, caption, coinIcon, cost, hit]);
  }

  /** A little picture of each fortification: stakes, a pot, a lookout's post. */
  private drawMark(g: Phaser.GameObjects.Graphics, id: FortId, x: number, y: number) {
    if (id === 'stakes') {
      for (let i = -1; i <= 1; i++) {
        g.fillStyle(0x8a5a2e).fillTriangle(x + i * 12 - 4, y + 14, x + i * 12 + 4, y + 14, x + i * 12 + 6, y - 14);
        g.fillStyle(0xc9955a).fillTriangle(x + i * 12 - 4, y + 14, x + i * 12 + 1, y + 14, x + i * 12 + 6, y - 14);
      }
    } else if (id === 'oil') {
      g.fillStyle(0x4a3a2a).fillEllipse(x, y + 4, 26, 24);
      g.fillStyle(0x6a5038).fillEllipse(x - 4, y, 12, 14);
      g.fillStyle(0x2a2018).fillRect(x - 8, y - 12, 16, 5);
      g.fillStyle(0xf09a3a).fillTriangle(x - 4, y - 12, x + 4, y - 12, x, y - 24);
      g.fillStyle(0xf8d460).fillTriangle(x - 2, y - 12, x + 2, y - 12, x, y - 19);
    } else {
      g.fillStyle(0x8a5a2e).fillRect(x - 2, y - 16, 4, 32);
      g.fillStyle(0xa87a48).fillRect(x - 12, y - 10, 24, 4);
      g.fillStyle(0xe5b53a).fillTriangle(x + 2, y - 16, x + 18, y - 11, x + 2, y - 6);
    }
  }
}
