import Phaser from 'phaser';
import { FACTION_IDS, FACTIONS, type FactionId } from '../game/data';

/** Starts a match: pick a faction, the AI plays the next one along. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.rectangle(480, 270, 960, 540, 0x1b1410);
    this.add.text(480, 56, 'COLONIZER', { fontFamily: 'ui-monospace, Courier New, monospace', fontSize: '40px', color: '#f3c64e' }).setOrigin(0.5);
    this.add
      .text(480, 100, 'Pick your faction. Gather, build, research and destroy the enemy Town Center.', {
        fontFamily: 'ui-monospace, Courier New, monospace',
        fontSize: '15px',
        color: '#c9b48f',
      })
      .setOrigin(0.5);

    FACTION_IDS.forEach((id, i) => this.card(id, 170 + i * 310, 300, FACTION_IDS[(i + 1) % FACTION_IDS.length]));

    this.add
      .text(480, 470, 'Left click selects, right click commands, drag to box select, 1-9 recall groups (Ctrl+1-9 sets them), A attack-move, S stop, B build.', {
        fontFamily: 'ui-monospace, Courier New, monospace',
        fontSize: '13px',
        color: '#a8957a',
        wordWrap: { width: 860 },
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private card(id: FactionId, x: number, y: number, ai: FactionId) {
    const f = FACTIONS[id];
    const box = this.add.rectangle(x, y, 280, 230, 0x2c2018).setStrokeStyle(3, f.cloth);
    box.setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y - 90, 280, 10, f.cloth);
    this.add
      .text(x, y - 65, f.name, { fontFamily: 'ui-monospace, Courier New, monospace', fontSize: '22px', color: '#f3c64e' })
      .setOrigin(0.5);
    this.add
      .text(x, y - 5, f.blurb, {
        fontFamily: 'ui-monospace, Courier New, monospace',
        fontSize: '14px',
        color: '#d8c7a6',
        wordWrap: { width: 250 },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    this.add
      .text(x, y + 80, `Plays against ${FACTIONS[ai].name}`, { fontFamily: 'ui-monospace, Courier New, monospace', fontSize: '12px', color: '#a8957a' })
      .setOrigin(0.5);
    box.on('pointerover', () => box.setStrokeStyle(3, 0xf3c64e));
    box.on('pointerout', () => box.setStrokeStyle(3, f.cloth));
    box.on('pointerdown', () => this.scene.start('Game', { faction: id, aiFaction: ai }));
  }
}
