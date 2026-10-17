import Phaser from 'phaser';
import { FACTION_IDS, FACTIONS, MAP_KIND_IDS, MAP_KINDS, UNIQUE_TEXT, unitFor, type FactionId, type MapKind } from '../game/data';
import { FEET, FRAME, WOOL } from '../art/figures';
import { hexNum, SERIF, T } from '../art/stitch';
import { figKey } from './BootScene';
import { MENU_OPTS } from './layout';

/** The menu's options, kept for the session so a new match starts with the last ones. */
const options = { kind: 'lowlands' as MapKind, rivals: 1 as 1 | 2 };

/**
 * Starts a match: pick the map kind, one rival or two (a three-way match) and a faction; the AI plays
 * the next faction along, and the second AI the one after.
 */
export class MenuScene extends Phaser.Scene {
  private against: { text: Phaser.GameObjects.Text; id: FactionId }[] = [];
  private opts: { img: Phaser.GameObjects.Image; on: () => boolean }[] = [];
  private optText!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create() {
    this.add.image(0, 0, 'backdrop').setOrigin(0, 0);
    this.add.text(480, 78, 'COLONIZER', { fontFamily: SERIF, fontSize: '46px', fontStyle: 'bold', color: T.red, stroke: T.linen, strokeThickness: 2 }).setOrigin(0.5);
    this.add
      .text(480, 120, 'Pick your faction. Gather, build, earn the ages and destroy the enemy Town Center.', { fontFamily: SERIF, fontSize: '15px', color: T.ink })
      .setOrigin(0.5);

    this.against = [];
    this.opts = [];
    FACTION_IDS.forEach((id, i) => this.card(id, 170 + i * 310, 300));

    // The map kind and the number of rivals, as two rows of toggles under the cards.
    const label = (x: number, words: string) => this.add.text(x - 10, MENU_OPTS.y, words, { fontFamily: SERIF, fontSize: '12px', fontStyle: 'bold', color: T.red }).setOrigin(1, 0.5);
    label(MENU_OPTS.kindX, 'MAP');
    MAP_KIND_IDS.forEach((kind, i) => this.option(MENU_OPTS.kindX + i * (MENU_OPTS.w + MENU_OPTS.gap), MAP_KINDS[kind].name, () => options.kind === kind, () => (options.kind = kind)));
    label(MENU_OPTS.rivalsX, 'RIVALS');
    ([1, 2] as const).forEach((n, i) => this.option(MENU_OPTS.rivalsX + i * (MENU_OPTS.w + MENU_OPTS.gap), n === 1 ? 'One AI' : 'Two AIs', () => options.rivals === n, () => (options.rivals = n)));
    this.optText = this.add.text(480, 464, '', { fontFamily: SERIF, fontSize: '12.5px', fontStyle: 'italic', color: T.ink }).setOrigin(0.5);
    this.refresh();

    this.add
      .text(480, 488, 'Left click selects, right click commands, drag to box select, 1-9 recall groups (Ctrl+1-9 sets them), A attack-move, S stop, B build.', {
        fontFamily: SERIF,
        fontSize: '13px',
        color: T.faded,
        wordWrap: { width: 820 },
        align: 'center',
      })
      .setOrigin(0.5);
  }

  /** A toggle button: `on` says whether it is the chosen one, `pick` chooses it. */
  private option(x: number, words: string, on: () => boolean, pick: () => void) {
    const img = this.add.image(x - 2, MENU_OPTS.y - MENU_OPTS.h / 2 - 2, 'opt-off').setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.add.text(x + MENU_OPTS.w / 2, MENU_OPTS.y + 0.5, words.toUpperCase(), { fontFamily: SERIF, fontSize: '11px', fontStyle: 'bold', color: T.ink }).setOrigin(0.5);
    img.on('pointerover', () => !on() && img.setTexture('opt-hot'));
    img.on('pointerout', () => img.setTexture(on() ? 'opt-on' : 'opt-off'));
    img.on('pointerdown', () => {
      pick();
      this.refresh();
    });
    this.opts.push({ img, on });
  }

  /** Shows the chosen options, what the map kind is like, and whom each faction would play against. */
  private refresh() {
    for (const o of this.opts) o.img.setTexture(o.on() ? 'opt-on' : 'opt-off');
    const rivals = options.rivals === 2 ? 'Two AIs: everyone raids everyone, the last Town Center standing wins' : 'One AI, one Town Center to bring down';
    this.optText.setText(`${MAP_KINDS[options.kind].name}: ${MAP_KINDS[options.kind].text.toLowerCase()}. ${rivals}.`);
    for (const { text, id } of this.against) {
      const [ai, ai2] = rivalsFor(id);
      text.setText(options.rivals === 2 ? `Plays against ${FACTIONS[ai].name} and ${FACTIONS[ai2].name}` : `Plays against ${FACTIONS[ai].name}`);
    }
  }

  private card(id: FactionId, x: number, y: number) {
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
      .text(x, top + 156, f.blurb, { fontFamily: SERIF, fontSize: '14px', color: T.ink, wordWrap: { width: 240 }, align: 'center' })
      .setOrigin(0.5, 0.5);
    this.add.text(x, top + 186, UNIQUE_TEXT[id], { fontFamily: SERIF, fontSize: '12.5px', fontStyle: 'bold', color: WOOL[id].cloth }).setOrigin(0.5);
    this.against.push({ id, text: this.add.text(x, top + 208, '', { fontFamily: SERIF, fontSize: '12px', fontStyle: 'italic', color: T.faded }).setOrigin(0.5) });
    box.on('pointerover', () => box.setTexture('card-faction-hot'));
    box.on('pointerout', () => box.setTexture('card-faction'));
    box.on('pointerdown', () => {
      const [ai, ai2] = rivalsFor(id);
      this.scene.start('Game', { faction: id, aiFaction: ai, rival2: options.rivals === 2 ? ai2 : null, kind: options.kind });
    });
  }
}

/** The AI's faction and the second AI's for a player's faction: the next two along. */
function rivalsFor(id: FactionId): [FactionId, FactionId] {
  const i = FACTION_IDS.indexOf(id);
  return [FACTION_IDS[(i + 1) % FACTION_IDS.length], FACTION_IDS[(i + 2) % FACTION_IDS.length]];
}
