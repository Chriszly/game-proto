import Phaser from 'phaser';
import { rank, type GameState } from '../game/state';
import { costOf, REPAIR_COST, UPGRADE_IDS, UPGRADES, type UpgradeId } from '../game/upgrades';
import { FONT, HARBOR, UI_DEPTH, VIEW } from '../scenes/layout';
import { makeButton } from './Button';
import { pinToScreen } from './screen';

export type HarborAction = UpgradeId | 'repair' | 'sail';
export interface HarborButton {
  id: HarborAction;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Row {
  id: UpgradeId | 'repair';
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

/** The harbor between waves: spend the plunder on the ship, patch the hull, and set sail. */
export class Harbor {
  /** Where each button is on screen; the playthrough test reads it to tap one. */
  readonly buttons: HarborButton[] = [];
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private gold: Phaser.GameObjects.Text;
  private rows: Row[] = [];

  constructor(scene: Phaser.Scene, onAction: (id: HarborAction) => void) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x081420, 0.6).setInteractive();
    const panel = scene.add.rectangle(HARBOR.x, HARBOR.y, HARBOR.w, HARBOR.h, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const top = HARBOR.y - HARBOR.h / 2;
    this.title = scene.add.text(HARBOR.x, top + 26, '', { fontFamily: FONT, fontSize: '26px', color: '#f3c64e' }).setOrigin(0.5);
    this.gold = scene.add.text(HARBOR.x, top + 60, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6' }).setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [dim, panel, this.title, this.gold];

    const ids: (UpgradeId | 'repair')[] = [...UPGRADE_IDS, 'repair'];
    ids.forEach((id, i) => {
      const y = HARBOR.firstRowY + i * HARBOR.rowGap;
      const left = HARBOR.x - HARBOR.rowW / 2;
      const bg = scene.add.rectangle(HARBOR.x, y, HARBOR.rowW, HARBOR.rowH, 0x4a3020).setStrokeStyle(2, 0x8a5a32);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x6a4428))
        .on('pointerout', () => bg.setFillStyle(0x4a3020))
        .on('pointerdown', () => onAction(id));
      const name = scene.add.text(left + 12, y - 9, '', { fontFamily: FONT, fontSize: '16px', color: '#f3e9d2' }).setOrigin(0, 0.5);
      const desc = scene.add.text(left + 12, y + 10, '', { fontFamily: FONT, fontSize: '12px', color: '#c9b48f' }).setOrigin(0, 0.5);
      const cost = scene.add.text(left + HARBOR.rowW - 12, y, '', { fontFamily: FONT, fontSize: '16px', color: '#f3c64e' }).setOrigin(1, 0.5);
      this.rows.push({ id, bg, name, desc, cost });
      this.buttons.push({ id, x: HARBOR.x, y, w: HARBOR.rowW, h: HARBOR.rowH });
      parts.push(bg, name, desc, cost);
    });

    const sailY = HARBOR.y + HARBOR.h / 2 - 34;
    const sail = makeButton(scene, HARBOR.x, sailY, 'Set sail', () => onAction('sail'));
    this.buttons.push({ id: 'sail', x: HARBOR.x, y: sailY, w: sail.bg.width, h: sail.bg.height });
    parts.push(sail.button);
    this.container = pinToScreen(scene.add.container(0, 0, parts)).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  show(s: GameState | null) {
    this.container.setVisible(!!s);
    if (!s) return;
    this.title.setText(`Harbor: wave ${s.wave} beaten`);
    this.gold.setText(`Gold ${s.gold}    Hull ${Math.ceil(s.player.hp)} / ${s.player.maxHp}`);
    for (const row of this.rows) {
      if (row.id === 'repair') {
        const needed = s.player.hp < s.player.maxHp;
        row.name.setText('Patch the hull');
        row.desc.setText(needed ? 'Repair the ship to full' : 'The hull is sound');
        row.cost.setText(needed ? `${REPAIR_COST} gold` : '-');
        row.bg.setAlpha(needed && s.gold >= REPAIR_COST ? 1 : 0.5);
        continue;
      }
      const u = UPGRADES[row.id];
      const r = rank(s, row.id);
      const cost = costOf(row.id, r);
      row.name.setText(`${u.name}  ${r}/${u.maxRank}`);
      row.desc.setText(u.desc);
      row.cost.setText(cost === null ? 'Maxed' : `${cost} gold`);
      row.bg.setAlpha(cost !== null && s.gold >= cost ? 1 : 0.5);
    }
  }
}
