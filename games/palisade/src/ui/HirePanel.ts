import Phaser from 'phaser';
import { guardTexture } from '../art/characters';
import { fit } from '../art/lowpoly';
import { GOLD, SLATE } from '../art/palette';
import { HIRE, UI_DEPTH, VIEW } from '../scenes/layout';
import { GUARD_KINDS, GUARDS, MAX_GUARD_LEVEL, guardDamage, trainCost, type GuardKind } from '../game/guards';
import { GUARD_SLOTS, type Guard } from '../game/state';
import { drawPanel, textStyle } from './panel';

/**
 * The panel a guard slot opens: on an empty slot, a spearman or a mage to hire for coins; on a
 * hired guard, training to the next level. The battle waits while it is open; a tap beside it
 * closes it.
 */
export class HirePanel {
  /** The slot it is open for, or null while closed; the scene holds the battle still while open. */
  slot: number | null = null;
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;

  constructor(
    private scene: Phaser.Scene,
    private onHire: (slot: number, kind: GuardKind) => void,
    private onTrain: (slot: number) => void,
  ) {
    const dim = scene.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e1218, 0.35)
      .setInteractive()
      .on('pointerdown', () => this.close());
    this.body = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [dim, this.body]).setDepth(UI_DEPTH + 25).setVisible(false);
  }

  get open() {
    return this.slot !== null;
  }

  close() {
    this.slot = null;
    this.root.setVisible(false);
  }

  /** Opens (or redraws) the panel for a slot, with its guard and the coins to spend. */
  show(slot: number, guard: Guard | null, coins: number) {
    this.slot = slot;
    this.root.setVisible(true);
    this.body.removeAll(true);
    const scene = this.scene;
    const at = GUARD_SLOTS[slot];
    const cx = at.x + HIRE.dx;
    const cy = Phaser.Math.Clamp(at.y - 60, 60 + HIRE.h / 2, 500 - HIRE.h / 2);
    const left = cx - HIRE.w / 2;
    const top = cy - HIRE.h / 2;
    const g = scene.add.graphics();
    drawPanel(g, left, top, HIRE.w, HIRE.h, { c: 14, fill: SLATE.mid, alpha: 0.98, lw: 2.5 });
    // A little pointer towards the slot.
    g.fillStyle(GOLD.mid).fillTriangle(left, cy - 8, left - 10, cy, left, cy + 8);
    const coinIcon = fit(scene.add.image(left + HIRE.w - 70, top + 22, 'hud-coin'));
    const coinText = scene.add.text(left + HIRE.w - 58, top + 22, String(coins), textStyle(14, '#ffe07a')).setOrigin(0, 0.5);
    const title = scene.add
      .text(left + 18, top + 22, guard ? `${GUARDS[guard.kind].name}, level ${guard.level}` : 'Hire a guard', textStyle(17, '#ffcf4a', 3))
      .setOrigin(0, 0.5);
    this.body.add([g, coinIcon, coinText, title]);
    if (guard) {
      const kind = guard.kind;
      const full = guard.level >= MAX_GUARD_LEVEL;
      this.addRow(kind, top + 52, `Damage ${Math.round(guardDamage(kind, guard.level))}${full ? '' : ` (next level ${Math.round(guardDamage(kind, guard.level + 1))})`}`,
        full ? null : { caption: 'Train', cost: trainCost(kind, guard.level), afford: coins >= trainCost(kind, guard.level), act: () => this.onTrain(slot) });
      this.body.add(
        scene.add.text(left + 18, top + 140, full ? 'Fully trained.' : 'Training adds 60% damage, up to level 3.', { ...textStyle(12, '#c9c3b6'), fontStyle: 'normal' }),
      );
    } else {
      GUARD_KINDS.forEach((kind, i) =>
        this.addRow(kind, top + 46 + i * 70, GUARDS[kind].text, { caption: 'Hire', cost: GUARDS[kind].cost, afford: coins >= GUARDS[kind].cost, act: () => this.onHire(slot, kind) }),
      );
    }
    this.body.add(scene.add.text(cx, top + HIRE.h - 14, 'Guards serve until the run ends', { ...textStyle(10, '#9aa0ac'), fontStyle: 'normal' }).setOrigin(0.5));
  }

  /** A guard's portrait, name and text, with a button that hires or trains it for its cost. */
  private addRow(kind: GuardKind, y: number, text: string, button: { caption: string; cost: number; afford: boolean; act: () => void } | null) {
    const scene = this.scene;
    const at = GUARD_SLOTS[this.slot!];
    const x0 = at.x + HIRE.dx - HIRE.w / 2;
    const back = scene.add.graphics();
    drawPanel(back, x0 + 10, y, HIRE.w - 20, 62, { c: 6, fill: SLATE.light, alpha: 1, edge: GOLD.dark, lw: 1 });
    const portrait = fit(scene.add.image(x0 + 38, y + 58, guardTexture(kind)), 0.82).setOrigin(0.5, 1);
    const name = scene.add.text(x0 + 66, y + 14, GUARDS[kind].name, textStyle(14, '#ffe7a0')).setOrigin(0, 0.5);
    const desc = scene.add.text(x0 + 66, y + 28, text, { ...textStyle(11, '#e9e4d8'), fontStyle: 'normal', wordWrap: { width: 150 } });
    this.body.add([back, portrait, name, desc]);
    if (!button) return;
    const bx = x0 + HIRE.w - 56;
    const by = y + 31;
    const bg = scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      drawPanel(bg, bx - 40, by - 20, 80, 40, {
        c: 6,
        fill: !button.afford ? SLATE.panel : hover ? 0x4a4260 : SLATE.mid,
        alpha: 1,
        edge: button.afford ? (hover ? GOLD.light : GOLD.mid) : 0x4a5060,
        lw: 2,
      });
    };
    draw(false);
    const color = button.afford ? '#ffe7a0' : '#7a8294';
    const caption = scene.add.text(bx, by - 8, button.caption, textStyle(13, color)).setOrigin(0.5);
    const coinIcon = fit(scene.add.image(bx - 12, by + 9, 'hud-coin'), 0.75).setAlpha(button.afford ? 1 : 0.5);
    const cost = scene.add.text(bx - 3, by + 9, String(button.cost), textStyle(12, color)).setOrigin(0, 0.5);
    const hit = scene.add.zone(bx, by, 80, 40);
    if (button.afford) {
      hit
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => draw(true))
        .on('pointerout', () => draw(false))
        .on('pointerdown', button.act);
    }
    this.body.add([bg, caption, coinIcon, cost, hit]);
  }
}
