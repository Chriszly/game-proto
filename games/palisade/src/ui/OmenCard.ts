import Phaser from 'phaser';
import { OMEN, UI_DEPTH } from '../scenes/layout';
import { OMEN_XP, OMENS, type OmenId } from '../game/omens';
import { drawPanel, makeButton, textStyle } from './panel';
import { t } from '../i18n';

/**
 * The omen named during a break from wave 4: its name and what it does, with Accept and Refuse.
 * Left alone, it is refused when the break ends.
 */
export class OmenCard {
  private root: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;
  private shown: string | null = null;
  /** Where the Accept and Refuse buttons are, by their centres, for tests to read. */
  buttons = {
    accept: { x: OMEN.x - 80, y: OMEN.y + 38, w: 140, h: 32 },
    refuse: { x: OMEN.x + 80, y: OMEN.y + 38, w: 140, h: 32 },
  };

  constructor(scene: Phaser.Scene, onDecide: (accept: boolean) => void) {
    const { x, y, w, h } = OMEN;
    const g = scene.add.graphics();
    drawPanel(g, x - w / 2, y - h / 2, w, h, { c: 14, fill: 0x2a2036, alpha: 0.96, edge: 0xc59af0, lw: 2.5 });
    this.title = scene.add.text(x, y - h / 2 + 20, '', textStyle(17, '#e6ccff', 3)).setOrigin(0.5);
    this.text = scene.add
      .text(x, y - 16, '', { ...textStyle(13, '#e9e4d8'), fontStyle: 'normal', align: 'center', wordWrap: { width: w - 40 } })
      .setOrigin(0.5);
    const reward = scene.add
      .text(x, y + 6, t('omenReward', { n: Math.round((OMEN_XP - 1) * 100) }), { ...textStyle(11, '#8fdc6a'), fontStyle: 'normal' })
      .setOrigin(0.5);
    const { accept, refuse } = this.buttons;
    const yes = makeButton(scene, accept.x, accept.y, accept.w, accept.h, t('accept'), () => onDecide(true));
    const no = makeButton(scene, refuse.x, refuse.y, refuse.w, refuse.h, t('refuse'), () => onDecide(false));
    this.root = scene.add.container(0, 0, [g, this.title, this.text, reward, yes, no]).setDepth(UI_DEPTH + 4).setVisible(false);
  }

  get open() {
    return this.root.visible;
  }

  /** Shows the omen for this wave, or hides the card for null. */
  show(omen: OmenId | null, wave: number) {
    this.root.setVisible(!!omen);
    const key = omen ? `${omen}-${wave}` : null;
    if (!omen || key === this.shown) return;
    this.shown = key;
    this.title.setText(t('omenTitle', { wave, omen: t(OMENS[omen].name) }));
    this.text.setText(t(OMENS[omen].text));
  }
}
