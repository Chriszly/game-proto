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

const ROW = 0xf6ecd2;
const ROW_LIT = 0xebd29a;
const INK = 0x2b2118;
const style = (size: number, color: string, fontStyle = 'normal') => ({ fontFamily: FONT, fontSize: `${size}px`, color, fontStyle, resolution: 2 });

/**
 * The harbor between waves, as a ledger on a sheet of parchment: spend the plunder on the ship,
 * patch the hull, and set sail.
 */
export class Harbor {
  /** Where each button is on screen; the playthrough test reads it to tap one. */
  readonly buttons: HarborButton[] = [];
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private gold: Phaser.GameObjects.Text;
  private rows: Row[] = [];

  constructor(scene: Phaser.Scene, onAction: (id: HarborAction) => void) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x3a2a18, 0.45).setInteractive();
    const panel = scene.add.image(HARBOR.x, HARBOR.y, 'panel-harbor');
    const top = HARBOR.y - HARBOR.h / 2;
    this.title = scene.add.text(HARBOR.x, top + 32, '', style(26, '#2b2118', 'bold')).setOrigin(0.5);
    this.gold = scene.add.text(HARBOR.x, top + 64, '', style(16, '#6a4410', 'italic')).setOrigin(0.5);
    const rule = scene.add.rectangle(HARBOR.x, top + 82, HARBOR.rowW, 1, INK, 0.6);
    const parts: Phaser.GameObjects.GameObject[] = [dim, panel, this.title, this.gold, rule];

    const ids: (UpgradeId | 'repair')[] = [...UPGRADE_IDS, 'repair'];
    ids.forEach((id, i) => {
      const y = HARBOR.firstRowY + i * HARBOR.rowGap;
      const left = HARBOR.x - HARBOR.rowW / 2;
      const bg = scene.add.rectangle(HARBOR.x, y, HARBOR.rowW, HARBOR.rowH, ROW, 0.9).setStrokeStyle(1.5, INK);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(ROW_LIT, 0.95))
        .on('pointerout', () => bg.setFillStyle(ROW, 0.9))
        .on('pointerdown', () => onAction(id));
      const name = scene.add.text(left + 14, y - 9, '', style(16, '#2b2118', 'bold')).setOrigin(0, 0.5);
      const desc = scene.add.text(left + 14, y + 10, '', style(12, '#5a4a38', 'italic')).setOrigin(0, 0.5);
      const cost = scene.add.text(left + HARBOR.rowW - 14, y, '', style(17, '#6a4410', 'bold italic')).setOrigin(1, 0.5);
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
    this.gold.setText(`Gold ${s.gold}   ❦   Hull ${Math.ceil(s.player.hp)} / ${s.player.maxHp}`);
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
      row.name.setText(`${u.name}   ${r}/${u.maxRank}`);
      row.desc.setText(u.desc);
      row.cost.setText(cost === null ? 'Maxed' : `${cost} gold`);
      row.bg.setAlpha(cost !== null && s.gold >= cost ? 1 : 0.5);
    }
  }
}
