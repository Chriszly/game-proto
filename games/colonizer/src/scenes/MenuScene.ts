import Phaser from 'phaser';
import { FACTION_IDS, FACTIONS, unitFor, type FactionId } from '../game/data';
import { FEET, FRAME, WOOL } from '../art/figures';
import { hexNum, SERIF, T } from '../art/stitch';
import { figKey } from './BootScene';

/** Starts a match: pick a faction, the AI plays the next one along. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.image(0, 0, 'backdrop').setOrigin(0, 0);
    this.add.text(480, 78, 'COLONIZER', { fontFamily: SERIF, fontSize: '46px', fontStyle: 'bold', color: T.red, stroke: T.linen, strokeThickness: 2 }).setOrigin(0.5);
    this.add
      .text(480, 120, 'Pick your faction. Gather, build, earn the ages and destroy the enemy Town Center.', { fontFamily: SERIF, fontSize: '15px', color: T.ink })
      .setOrigin(0.5);

    FACTION_IDS.forEach((id, i) => this.card(id, 170 + i * 310, 300, FACTION_IDS[(i + 1) % FACTION_IDS.length]));

    this.add
      .text(480, 470, 'Left click selects, right click commands, drag to box select, 1-9 recall groups (Ctrl+1-9 sets them), A attack-move, S stop, B build.', {
        fontFamily: SERIF,
        fontSize: '13px',
        color: T.faded,
        wordWrap: { width: 820 },
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private card(id: FactionId, x: number, y: number, ai: FactionId) {
    const f = FACTIONS[id];
    const box = this.add.image(x, y, 'card-faction').setInteractive({ useHandCursor: true });
    const top = y - 115;
    this.add.rectangle(x, top + 12, 250, 6, hexNum(WOOL[id].cloth)).setOrigin(0.5);
    // The faction's three soldiers, in profile.
    (['melee', 'ranged', 'cavalry'] as const).forEach((role, k) => {
      const type = unitFor(id, role).id;
      this.add
        .image(x - 70 + k * 70, top + 96, figKey(type, id), 'idle-0')
        .setOrigin(FEET.x / FRAME, FEET.y / FRAME)
        .setScale(1.35);
    });
    this.add.text(x, top + 122, f.name.toUpperCase(), { fontFamily: SERIF, fontSize: '21px', fontStyle: 'bold', color: WOOL[id].cloth }).setOrigin(0.5);
    this.add
      .text(x, top + 162, f.blurb, { fontFamily: SERIF, fontSize: '14px', color: T.ink, wordWrap: { width: 240 }, align: 'center' })
      .setOrigin(0.5, 0.5);
    this.add.text(x, top + 205, `Plays against ${FACTIONS[ai].name}`, { fontFamily: SERIF, fontSize: '12px', fontStyle: 'italic', color: T.faded }).setOrigin(0.5);
    box.on('pointerover', () => box.setTexture('card-faction-hot'));
    box.on('pointerout', () => box.setTexture('card-faction'));
    box.on('pointerdown', () => this.scene.start('Game', { faction: id, aiFaction: ai }));
  }
}
