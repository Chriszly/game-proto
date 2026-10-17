import Phaser from 'phaser';
import { ui } from '../../../../shared/audio';
import { addTexture, cut, rr, sketch } from '../art/paper';
import { FONT } from '../scenes/layout';

/**
 * How a button looks: `off` is pressed flat into the board (disabled), `on` a raised cream card,
 * `hot` a raised golden card for the main actions (Send and Sell), and each raised one has a
 * lighter `-over` card while the pointer is on it.
 */
type Look = 'off' | 'on' | 'on-over' | 'hot' | 'hot-over';
const PAD = 8;
const INNER: Record<Exclude<Look, 'off'>, [string, string]> = {
  on: ['#d9b46a', '#fff0c8'],
  'on-over': ['#d9b46a', '#fffaf0'],
  hot: ['#d98a12', '#ffbe2e'],
  'hot-over': ['#d98a12', '#ffd060'],
};

/** Bakes the card for a button of this size and look, once. */
function cardTexture(scene: Phaser.Scene, w: number, h: number, look: Look) {
  const key = `button-${w}x${h}-${look}`;
  if (scene.textures.exists(key)) return key;
  const { canvas, ctx } = sketch(w + PAD * 2, h + PAD * 2);
  ctx.translate(PAD, PAD);
  if (look === 'off') {
    cut(ctx, rr(1, 1, w - 2, h - 2, 8), '#a87444', { depth: 1, shadow: 0.2 });
  } else {
    const [edge, face] = INNER[look];
    cut(ctx, rr(0, 0, w, h, 8), edge, { depth: 4 });
    cut(ctx, rr(2, 1, w - 4, h - 5, 7), face, { depth: 1 });
  }
  addTexture(scene, key, canvas);
  return key;
}

/** A paper card button with a bold first line and a lighter second line, flat when disabled. */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private card: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text;
  private detail: Phaser.GameObjects.Text;
  private enabled = true;
  private hot = false;
  private over = false;
  private caption = '';

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    private w: number,
    private h: number,
    onClick: () => void,
  ) {
    this.card = scene.add.image(0, 0, cardTexture(scene, w, h, 'on'));
    this.title = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', fontStyle: '800', align: 'center' }).setOrigin(0.5);
    this.detail = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', fontStyle: '600', align: 'center' }).setOrigin(0.5);
    this.root = scene.add.container(x, y, [this.card, this.title, this.detail]).setDepth(30);
    const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.root.add(zone);
    zone
      .on('pointerover', () => ((this.over = true), this.paint()))
      .on('pointerout', () => ((this.over = false), this.paint()))
      .on('pointerdown', () => (this.enabled ? onClick() : ui('refuse')));
    this.paint();
  }

  /** Sets the caption (a second line after a newline), whether it can be pressed, and whether it is a main action. */
  set(caption: string, enabled: boolean, hot = false) {
    if (caption === this.caption && enabled === this.enabled && hot === this.hot) return this;
    this.caption = caption;
    this.enabled = enabled;
    this.hot = hot;
    this.paint();
    return this;
  }

  private paint() {
    const look: Look = !this.enabled ? 'off' : `${this.hot ? 'hot' : 'on'}${this.over ? '-over' : ''}`;
    this.card.setTexture(cardTexture(this.scene, this.w, this.h, look));
    const [first, second = ''] = this.caption.split('\n');
    const colour = !this.enabled ? '#ecd0a8' : this.hot ? '#4a2400' : '#4a2c10';
    // Raised cards carry their caption a little higher than the flat ones.
    const lift = this.enabled ? -2 : 0;
    this.title.setText(first).setColor(colour).setFontSize(second ? 14 : 15).setY(lift + (second ? -8 : 0));
    this.detail.setText(second).setColor(colour).setY(lift + 9);
  }
}
