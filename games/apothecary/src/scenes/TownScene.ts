import Phaser from 'phaser';
import { formatNumber } from '../../../../shared/i18n';
import { playMusic, ui } from '../../../../shared/audio';
import { viewSize } from '../../../../shared/scaling';
import { SONG, sfx } from '../audio';
import { INK, PAPER_NUM, SERIF, WASH, fit } from '../art/paint';
import { goodTexture, lotTexture } from '../art/town';
import { catchUp } from '../game/away';
import { loadState } from '../game/save';
import { tick } from '../game/sim';
import type { GameState } from '../game/state';
import { SHOPS, SHOP_IDS, shopCost, type GoodId, type ShopId } from '../game/town';
import { buyShop, tickTown } from '../game/townSim';
import { t } from '../i18n';
import { coined } from '../ui/coins';
import { TOWN_HUD_H, TOWN_TEXT, TOWN_UI_DEPTH, keepSaving, leaveFor, townCard, townTopBar } from './townKit';

// The town map: a page of the town with the apothecary and a lot for every shop, opened from the
// apothecary's top bar once the town grants its charter. A shop bought is walked into from its lot;
// one for sale is bought by tapping its lot with the coins in the purse. The apothecary and every
// shop keep working while the map is open, as they do while the player is away.

const LOT = { w: 270, h: 150, gap: 24 };
const COLUMNS = 3;
const NOTE = { ...TOWN_TEXT, fontSize: '13px', fontStyle: 'normal' };

type Lot = 'apothecary' | ShopId;

export class TownScene extends Phaser.Scene {
  private state!: GameState;
  private views: (() => void)[] = [];

  constructor() {
    super('Town');
  }

  create() {
    this.state = loadState();
    catchUp(this.state, Date.now());
    this.views = [];
    const { width, height } = viewSize(this);
    this.add.rectangle(0, 0, width, height, PAPER_NUM).setOrigin(0);
    const lots: Lot[] = ['apothecary', ...SHOP_IDS];
    const rows = Math.ceil(lots.length / COLUMNS);
    const top = TOWN_HUD_H + (height - TOWN_HUD_H - rows * LOT.h - (rows - 1) * LOT.gap) / 2;
    this.drawRoads(width, height, top, rows, Math.min(COLUMNS, lots.length));
    lots.forEach((lot, i) => {
      const row = Math.floor(i / COLUMNS);
      const inRow = Math.min(COLUMNS, lots.length - row * COLUMNS);
      const col = i % COLUMNS;
      const x = width / 2 + (col - (inRow - 1) / 2) * (LOT.w + LOT.gap);
      const y = top + row * (LOT.h + LOT.gap) + LOT.h / 2;
      this.addLot(lot, x, y);
    });
    const purse = townTopBar(this, () => this.state, t('townMap'), { label: t('apothecary'), onTap: () => this.enter('apothecary') });
    this.views.push(purse);
    playMusic(SONG, 'calm');
    keepSaving(this, () => this.state);
  }

  /** Roads between the lots, over the grass: one between and around the rows, and one between each two columns. */
  private drawRoads(width: number, height: number, top: number, rows: number, columns: number) {
    const roads = this.add.graphics();
    const road = Phaser.Display.Color.HexStringToColor(WASH.dirt).color;
    roads.fillStyle(Phaser.Display.Color.HexStringToColor(WASH.grass).color, 0.9).fillRect(0, TOWN_HUD_H, width, height - TOWN_HUD_H);
    roads.fillStyle(road, 0.85);
    for (let r = 0; r <= rows; r++) roads.fillRect(0, top + r * (LOT.h + LOT.gap) - LOT.gap / 2 - 9, width, 18);
    for (let c = 0; c < columns - 1; c++) roads.fillRect(width / 2 + (c - (columns - 2) / 2) * (LOT.w + LOT.gap) - 9, TOWN_HUD_H, 18, height - TOWN_HUD_H);
  }

  private addLot(lot: Lot, x: number, y: number) {
    const card = townCard(this, x, y, 'contract', LOT.w, LOT.h).setInteractive({ useHandCursor: true });
    fit(this.add.image(x - LOT.w / 2 + 58, y + 4, lotTexture(lot)));
    const left = x - LOT.w / 2 + 112;
    const name = lot === 'apothecary' ? t('apothecary') : t(SHOPS[lot].name);
    this.add.text(left, y - LOT.h / 2 + 16, name, { ...TOWN_TEXT, fontSize: '18px' });
    const makes = lot === 'apothecary' ? t('apothecaryMakes') : t(SHOPS[lot].makes);
    this.add.text(left, y - LOT.h / 2 + 42, makes, { ...NOTE, wordWrap: { width: LOT.w - 124 } });
    if (lot !== 'apothecary') {
      (Object.keys(SHOPS[lot].sells) as GoodId[]).forEach((good, i) => fit(this.add.image(left + 8 + i * 22, y + 18, goodTexture(good)), 1.2));
    }
    const status = coined(this.add.text(left, y + LOT.h / 2 - 34, '', { ...NOTE, fontStyle: 'bold', color: '#5a2c80' }));
    card.on('pointerdown', () => this.tapLot(lot, card));
    this.views.push(() => {
      if (lot === 'apothecary') return status.setText(t('walkIn'));
      const shop = this.state.town.shops[lot];
      if (shop) return status.setText(shop.till > 0 ? t('walkInTill', { n: formatNumber(shop.till) }) : t('walkIn'));
      status.setText(t('buyShop', { coins: formatNumber(shopCost(lot)) }));
      card.setAlpha(this.state.coins >= shopCost(lot) ? 1 : 0.8);
    });
  }

  private tapLot(lot: Lot, card: Phaser.GameObjects.Image) {
    if (lot === 'apothecary' || this.state.town.shops[lot]) {
      ui('click');
      this.enter(lot);
      return;
    }
    const bought = buyShop(this.state, lot);
    if (!bought) {
      ui('refuse');
      this.tweens.add({ targets: card, x: card.x + 4, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    sfx('upgrade');
    const note = this.add
      .text(card.x, card.y - LOT.h / 2 - 12, bought[0], { fontFamily: SERIF, fontSize: '16px', fontStyle: 'bold', color: INK })
      .setOrigin(0.5)
      .setDepth(TOWN_UI_DEPTH);
    this.tweens.add({ targets: note, y: note.y - 24, alpha: 0, delay: 900, duration: 900, onComplete: () => note.destroy() });
  }

  private enter(lot: Lot) {
    if (lot === 'apothecary') leaveFor(this, this.state, 'Game');
    else leaveFor(this, this.state, 'Shop', { shop: lot });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 250);
    // The apothecary and the shops run on their own while the map is open, as while away.
    tick(this.state, dt, null);
    tickTown(this.state, dt, null);
    for (const view of this.views) view();
  }
}
