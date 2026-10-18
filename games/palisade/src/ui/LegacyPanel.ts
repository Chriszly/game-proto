import Phaser from 'phaser';
import { ui } from '../../../../shared/audio';
import { FIGURES, guardTexture } from '../art/characters';
import { relicTexture } from '../art/icons';
import { fit } from '../art/lowpoly';
import { GOLD, SLATE } from '../art/palette';
import { LEGACY, SEEN, UI_DEPTH, VIEW } from '../scenes/layout';
import { LEGACIES, LEGACY_IDS, canKeep, type Legacy, type LegacyId } from '../game/legacy';
import { RELICS, type RelicId } from '../game/relics';
import { drawPanel, makeButton, textStyle } from './panel';
import { t } from '../i18n';

/** Where a legacy card is on screen and which perk it keeps. */
export interface LegacySpot {
  id: LegacyId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Retiring the hero: three legacy cards (a first relic, a third guard slot, quicker Arrow Rain),
 * one of which the next hero keeps, and Cancel. A perk kept already is greyed out.
 */
export class LegacyPanel {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private keptText: Phaser.GameObjects.Text;
  cards: LegacySpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: LegacyId) => void,
  ) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, SEEN.w, SEEN.h, 0x0e1218, 0.75).setInteractive();
    const g = scene.add.graphics();
    drawPanel(g, VIEW.w / 2 - 440, 90, 880, 380, { c: 18, fill: SLATE.mid, alpha: 1, lw: 3 });
    const title = scene.add.text(VIEW.w / 2, 124, t('retireTitle'), textStyle(26, '#ffcf4a', 5)).setOrigin(0.5);
    const sub = scene.add
      .text(VIEW.w / 2, 158, t('retireSub'), { ...textStyle(13, '#e9e4d8'), fontStyle: 'normal' })
      .setOrigin(0.5);
    this.keptText = scene.add.text(VIEW.w / 2, 384, '', { ...textStyle(12, '#c9c3b6'), fontStyle: 'normal' }).setOrigin(0.5);
    const cancel = makeButton(scene, VIEW.w / 2, 430, 160, 34, t('cancel'), () => this.close());
    this.body = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [dim, g, title, sub, this.keptText, cancel, this.body]).setDepth(UI_DEPTH + 30).setVisible(false);
  }

  get open() {
    return this.root.visible;
  }

  close() {
    this.root.setVisible(false);
  }

  /** Opens the panel with what earlier heroes left and the relic the first card would keep. */
  show(legacy: Legacy, relic: RelicId) {
    this.root.setVisible(true);
    this.body.removeAll(true);
    this.cards = [];
    LEGACY_IDS.forEach((id, i) => this.addCard(id, LEGACY.xs[i], canKeep(legacy, id), relic));
    const kept = [
      ...legacy.relics.map((r) => t(RELICS[r].name)),
      ...(legacy.slot ? [t(LEGACIES.slot.name)] : []),
      ...(legacy.rain ? [t(LEGACIES.rain.name)] : []),
    ];
    this.keptText.setText(kept.length > 0 ? t('keptFrom', { list: kept.join(', ') }) : t('keptNone'));
  }

  private addCard(id: LegacyId, x: number, open: boolean, relic: RelicId) {
    const { y, w, h } = LEGACY;
    const scene = this.scene;
    const bg = scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      drawPanel(bg, -w / 2, -h / 2, w, h, { c: 14, fill: open ? SLATE.light : SLATE.panel, alpha: 0.97, edge: !open ? 0x4a5060 : hover ? GOLD.light : GOLD.dark, lw: hover && open ? 4 : 3 });
      bg.fillStyle(SLATE.dark).fillCircle(0, -h / 2 + 46, 32);
      bg.lineStyle(2, open ? GOLD.mid : 0x4a5060).strokeCircle(0, -h / 2 + 46, 32);
    };
    draw(false);
    const icon =
      id === 'relic'
        ? fit(scene.add.image(0, -h / 2 + 46, relicTexture(relic)), 0.7)
        : id === 'slot'
          ? this.guardIcon(-h / 2 + 46)
          : fit(scene.add.image(0, -h / 2 + 46, 'rain-ready'), 0.9);
    const name = scene.add.text(0, -h / 2 + 94, t(LEGACIES[id].name), textStyle(16, open ? '#ffcf4a' : '#9aa0ac')).setOrigin(0.5);
    const text = id === 'relic' ? t('relicCard', { name: t(RELICS[relic].name), text: t(RELICS[relic].text) }) : t(LEGACIES[id].text);
    const body = scene.add
      .text(0, -h / 2 + 124, open ? text : t('keptAlready'), { ...textStyle(12, open ? '#e9e4d8' : '#9aa0ac'), fontStyle: 'normal', align: 'center', wordWrap: { width: w - 28 } })
      .setOrigin(0.5, 0);
    if (!open) icon.setAlpha(0.4);
    const hit = scene.add.zone(0, 0, w, h);
    const card = scene.add.container(x, y, [bg, icon, name, body, hit]);
    if (open) {
      hit
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => draw(true))
        .on('pointerout', () => draw(false))
        .on('pointerdown', () => this.onPick(id));
    } else hit.setInteractive().on('pointerdown', () => ui('refuse'));
    this.body.add(card);
    this.cards.push({ id, x, y, w, h });
  }

  /** A spearman standing in the card's circle, for the third guard slot. */
  private guardIcon(y: number) {
    const key = guardTexture('spear');
    const fig = FIGURES[key]!;
    return fit(this.scene.add.image(0, y + 26, key), 0.75).setOrigin(fig.originX, fig.originY);
  }
}
