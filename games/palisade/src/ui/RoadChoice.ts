import Phaser from 'phaser';
import { roadTexture } from '../art/icons';
import { fit } from '../art/lowpoly';
import { GOLD, SLATE } from '../art/palette';
import { ROAD_CARDS, UI_DEPTH, VIEW } from '../scenes/layout';
import { ROADS, type RoadId } from '../game/roads';
import { drawPanel, textStyle } from './panel';
import { t } from '../i18n';

/** Where a road card is on screen and which road it offers. */
export interface RoadSpot {
  id: RoadId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The road choice after a boss: two cards under the relic chest, each a road with its catch and
 * its reward. Tapping one takes it; after 10 seconds one is taken at random. The break waits.
 */
export class RoadChoice {
  private root: Phaser.GameObjects.Container;
  private countdown: Phaser.GameObjects.Text;
  private shown: string | null = null;
  cards: RoadSpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: RoadId) => void,
  ) {
    const title = scene.add
      .text(VIEW.w / 2, ROAD_CARDS.y - ROAD_CARDS.h / 2 - 18, t('chooseRoad'), textStyle(20, '#ffcf4a', 5))
      .setOrigin(0.5);
    this.countdown = scene.add.text(VIEW.w / 2, ROAD_CARDS.y + ROAD_CARDS.h / 2 + 16, '', textStyle(13, '#c9c3b6', 4)).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [title, this.countdown]).setDepth(UI_DEPTH + 5).setVisible(false);
  }

  /** Shows these roads with `ms` left to pick, or hides the cards for null. */
  show(choices: RoadId[] | null, ms: number) {
    if (choices) this.countdown.setText(t('roadRandom', { n: Math.ceil(ms / 1000) }));
    const key = choices ? choices.join() : null;
    if (key === this.shown) return;
    this.shown = key;
    this.root.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.cards = [];
    this.root.setVisible(!!choices);
    choices?.forEach((id, i) => this.addCard(id, ROAD_CARDS.xs[i]));
  }

  private addCard(id: RoadId, x: number) {
    const { y, w, h } = ROAD_CARDS;
    const road = ROADS[id];
    const scene = this.scene;
    const bg = scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      drawPanel(bg, -w / 2, -h / 2, w, h, { c: 14, fill: SLATE.mid, alpha: 0.97, edge: hover ? GOLD.light : GOLD.dark, lw: hover ? 4 : 3 });
      bg.fillStyle(SLATE.light).fillCircle(-w / 2 + 46, -h / 2 + 48, 32);
      bg.lineStyle(2, hover ? GOLD.light : GOLD.mid).strokeCircle(-w / 2 + 46, -h / 2 + 48, 32);
    };
    draw(false);
    const icon = fit(scene.add.image(-w / 2 + 46, -h / 2 + 48, roadTexture(id)), 0.9);
    const name = scene.add.text(-w / 2 + 90, -h / 2 + 34, t(road.name), textStyle(18, '#ffcf4a')).setOrigin(0, 0.5);
    const sub = scene.add.text(-w / 2 + 90, -h / 2 + 58, t('roadSub'), { ...textStyle(11, '#c9c3b6'), fontStyle: 'normal' }).setOrigin(0, 0.5);
    const style = (color: string) => ({ ...textStyle(13, color), fontStyle: 'normal', wordWrap: { width: w - 40 } });
    const harder = scene.add.text(-w / 2 + 20, -h / 2 + 90, t('roadCatch', { text: t(road.harder) }), style('#ffb08a'));
    const better = scene.add.text(-w / 2 + 20, -h / 2 + 114, t('roadReward', { text: t(road.better) }), style('#8fdc6a'));
    const hit = scene.add.zone(0, 0, w, h);
    const card = scene.add.container(x, y, [bg, icon, name, sub, harder, better, hit]).setData('card', true);
    hit
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
      .on('pointerdown', () => this.onPick(id));
    this.root.add(card);
    this.cards.push({ id, x, y, w, h });
  }
}
