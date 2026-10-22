// What sits on the screen over the world: health, stamina and rage, the form, the objective line,
// tutorial hints, toasts, the chapter banner, the talk box, the touch buttons, the outburst's red
// haze and the fall and end cards. Everything here has a scroll factor of 0, so `splitHudCamera`
// draws it with the fixed camera.

import Phaser from 'phaser';
import { t, type TextKey } from '../i18n';
import { viewFrame, viewSize } from '../../../../shared/scaling';
import { settings } from '../../../../shared/settings';
import { ui } from '../../../../shared/audio';
import type { Form } from '../game/forms';

const FONT = 'Georgia, "Times New Roman", serif';
const DEPTH = 10000;

export type Button = 'left' | 'right' | 'strike' | 'block' | 'dodge' | 'shift' | 'use';

/** The touch buttons: their label, and where they sit from the view's bottom corners. */
const BUTTONS: Record<Button, { label: TextKey | '◀' | '▶'; corner: 'left' | 'right'; x: number; y: number; r: number }> = {
  left: { label: '◀', corner: 'left', x: 52, y: 110, r: 34 },
  right: { label: '▶', corner: 'left', x: 136, y: 110, r: 34 },
  strike: { label: 'btnStrike', corner: 'right', x: 70, y: 80, r: 38 },
  block: { label: 'btnBlock', corner: 'right', x: 160, y: 60, r: 32 },
  dodge: { label: 'btnDodge', corner: 'right', x: 88, y: 170, r: 30 },
  shift: { label: 'btnShift', corner: 'right', x: 176, y: 146, r: 28 },
  use: { label: 'btnUse', corner: 'right', x: 250, y: 60, r: 28 },
};

export interface HudState {
  hp: number;
  stamina: number;
  rage: number;
  form: Form;
  burst: boolean;
  exhausted: boolean;
  shift: boolean;
  /** A look prompt is shown over the track in reach (in the world, so the HUD only lights Use). */
  canUse: boolean;
  /** The raid's outburst: the screen goes black now and then, a memory in pieces. */
  fragment: boolean;
}

export class Hud {
  private bars: Phaser.GameObjects.Graphics;
  private haze: Phaser.GameObjects.Graphics;
  private formText: Phaser.GameObjects.Text;
  private objective: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Text;
  private box: Phaser.GameObjects.Graphics;
  private speaker: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private buttonGfx: Phaser.GameObjects.Graphics;
  private buttonText: Partial<Record<Button, Phaser.GameObjects.Text>> = {};
  private card: Phaser.GameObjects.Container | null = null;
  private cardThen: (() => void) | null = null;
  private toastMs = 0;
  private bannerMs = 0;
  private vw: number;
  private vh: number;
  /** Touch buttons show once the screen has been touched. */
  touch = false;

  constructor(private scene: Phaser.Scene) {
    const add = scene.add;
    ({ width: this.vw, height: this.vh } = viewSize(scene));
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => o.setScrollFactor(0).setDepth(DEPTH);
    this.haze = fixed(add.graphics()).setDepth(DEPTH - 1);
    this.bars = fixed(add.graphics());
    const small = { fontFamily: FONT, fontSize: '13px', color: '#f3ead2' };
    (['health', 'stamina', 'rage'] as const).map((k, i) => fixed(add.text(16, 14 + i * 22, t(k), small)));
    this.formText = fixed(add.text(16, 82, '', { fontFamily: FONT, fontSize: '16px', color: '#f3ead2', fontStyle: 'bold' }));
    this.objective = fixed(
      add.text(this.vw - 12, 12, '', { fontFamily: FONT, fontSize: '15px', color: '#f3ead2', align: 'right', backgroundColor: 'rgba(10,8,6,0.55)', padding: { x: 10, y: 6 } }).setOrigin(1, 0),
    );
    this.hintText = fixed(
      add.text(this.vw / 2, 118, '', { fontFamily: FONT, fontSize: '16px', color: '#ffe9a8', align: 'center', backgroundColor: 'rgba(10,8,6,0.6)', padding: { x: 12, y: 6 }, wordWrap: { width: Math.min(720, this.vw - 40) } }).setOrigin(0.5, 0),
    );
    this.toastText = fixed(add.text(this.vw / 2, this.vh * 0.42, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5));
    this.banner = fixed(add.text(this.vw / 2, this.vh * 0.5, '', { fontFamily: FONT, fontSize: '40px', color: '#f3ead2', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5));
    this.buttonGfx = fixed(add.graphics());
    for (const id of Object.keys(BUTTONS) as Button[]) {
      const b = BUTTONS[id];
      const label = b.label === '◀' || b.label === '▶' ? b.label : t(b.label);
      const p = this.buttonAtView(id);
      this.buttonText[id] = fixed(add.text(p.x, p.y, label, { fontFamily: FONT, fontSize: b.r > 32 ? '16px' : '13px', color: '#f3ead2' }).setOrigin(0.5)).setVisible(false);
    }
    this.box = fixed(add.graphics());
    this.speaker = fixed(add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: '#ffcf70', fontStyle: 'bold' }));
    this.line = fixed(add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: '#f3ead2', wordWrap: { width: Math.min(820, this.vw - 80) }, lineSpacing: 4 }));
  }

  private buttonAtView(id: Button) {
    const b = BUTTONS[id];
    return { x: b.corner === 'left' ? b.x : this.vw - b.x, y: this.vh - b.y, r: b.r };
  }

  /** Which touch button, if any, is under a point on the screen. */
  buttonAt(p: { x: number; y: number }): Button | null {
    if (!this.touch) return null;
    for (const id of Object.keys(BUTTONS) as Button[]) {
      const b = this.buttonAtView(id);
      if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r + 6) return id;
    }
    return null;
  }

  setObjective(key: TextKey) {
    this.objective.setText(t(key));
  }

  setHint(key: TextKey | '', vars: Record<string, number> = {}) {
    this.hintText.setText(key ? t(key, vars) : '').setVisible(!!key);
  }

  toast(text: string, ms = 2200) {
    this.toastText.setText(text).setAlpha(1);
    this.toastMs = ms;
  }

  showBanner(key: TextKey) {
    this.banner.setText(t(key)).setAlpha(1);
    this.bannerMs = 2200;
  }

  /** The talk box on the bottom edge, or nothing. */
  dialog(view: { speaker: string; text: string } | null) {
    this.box.clear();
    this.speaker.setVisible(!!view);
    this.line.setVisible(!!view);
    this.hintText.setAlpha(view ? 0 : 1);
    if (!view) return;
    const w = Math.min(880, this.vw - 40);
    const x = (this.vw - w) / 2;
    this.line.setText(view.text);
    const h = Math.max(96, this.line.height + 52);
    // Under the bars, so it never covers the fighters or the corner buttons.
    const y = 118;
    this.box.fillStyle(0x0d0a08, 0.88);
    this.box.fillRoundedRect(x, y, w, h, 8);
    this.box.lineStyle(2, 0x8a6a3a, 1);
    this.box.strokeRoundedRect(x, y, w, h, 8);
    this.speaker.setText(view.speaker).setPosition(x + 18, y + 10);
    this.line.setPosition(x + 18, y + 34);
  }

  update(dt: number, s: HudState, held: Partial<Record<Button, boolean>>, now: number) {
    const g = this.bars;
    g.clear();
    const bar = (i: number, value: number, max: number, color: number) => {
      const x = 84;
      const y = 16 + i * 22;
      const w = 180;
      g.fillStyle(0x000000, 0.55);
      g.fillRect(x - 2, y - 2, w + 4, 14);
      g.fillStyle(color, 1);
      g.fillRect(x, y, (w * Phaser.Math.Clamp(value, 0, max)) / max, 10);
    };
    g.fillStyle(0x0d0a08, 0.5);
    g.fillRoundedRect(6, 6, 270, 102, 6);
    bar(0, s.hp, 100, 0x5fb04a);
    bar(1, s.stamina, 100, s.exhausted ? 0x8a8a8a : 0xe0c050);
    const ragePulse = s.rage > 80 && !settings.reduceMotion ? 0.75 + Math.sin(now / 80) * 0.25 : 1;
    bar(2, s.rage, 100, Phaser.Display.Color.GetColor(200 * ragePulse + 40, 40, 30));
    const form = t(s.form);
    this.formText.setText(s.burst ? `${form} – ${t('outburst')}!` : s.exhausted ? `${form} – ${t('exhausted')}` : form);
    this.formText.setColor(s.burst ? '#ff6a50' : '#f3ead2');

    // The outburst: a red haze over everything, flickering unless motion is reduced.
    this.haze.clear();
    if (s.burst) {
      const a = settings.reduceMotion ? 0.22 : 0.18 + Math.sin(now / 140) * 0.06;
      this.haze.fillStyle(0x8a0000, a);
      this.haze.fillRect(0, 0, this.vw, this.vh);
      this.haze.lineStyle(60, 0x3a0000, 0.5);
      this.haze.strokeRect(0, 0, this.vw, this.vh);
      if (s.fragment && !settings.reduceMotion && now % 1700 < 200) {
        this.haze.fillStyle(0x000000, 0.85);
        this.haze.fillRect(0, 0, this.vw, this.vh);
      }
    }

    if (this.toastMs > 0) {
      this.toastMs -= dt;
      this.toastText.setAlpha(Phaser.Math.Clamp(this.toastMs / 400, 0, 1));
    }
    if (this.bannerMs > 0) {
      this.bannerMs -= dt;
      this.banner.setAlpha(Phaser.Math.Clamp(this.bannerMs / 500, 0, 1));
    }

    const bg = this.buttonGfx;
    bg.clear();
    for (const id of Object.keys(BUTTONS) as Button[]) {
      const shown = this.touch && (id !== 'shift' || s.shift) && (id !== 'use' || s.canUse);
      this.buttonText[id]!.setVisible(shown);
      if (!shown) continue;
      const b = this.buttonAtView(id);
      bg.fillStyle(held[id] ? 0x8a6a3a : 0x0d0a08, held[id] ? 0.8 : 0.5);
      bg.fillCircle(b.x, b.y, b.r);
      bg.lineStyle(2, 0xf3ead2, 0.5);
      bg.strokeCircle(b.x, b.y, b.r);
    }
  }

  /** A card in the middle of the view with a title, a line and one button; the button calls `then`. */
  showCard(title: string, text: string, button: string, then: () => void) {
    this.card?.destroy();
    const f = viewFrame(this.scene);
    const add = this.scene.add;
    const shade = add.rectangle(0, 0, this.vw, this.vh, 0x000000, 0.7).setOrigin(0);
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    const head = add.text(cx, cy - 70, title, { fontFamily: FONT, fontSize: '32px', color: '#f3ead2', align: 'center', wordWrap: { width: f.width - 80 } }).setOrigin(0.5);
    const body = add.text(cx, cy - 10, text, { fontFamily: FONT, fontSize: '18px', color: '#d8ccb0', align: 'center', wordWrap: { width: f.width - 120 } }).setOrigin(0.5);
    const btn = add.text(cx, cy + 70, button, { fontFamily: FONT, fontSize: '22px', color: '#1a120a', backgroundColor: '#e0b060', padding: { x: 22, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.cardThen = then;
    btn.on('pointerdown', () => this.pressCard());
    this.card = add.container(0, 0, [shade, head, body, btn]).setScrollFactor(0).setDepth(DEPTH + 10);
  }

  /** The card's button, pressed by a tap or by Space or Enter. */
  pressCard() {
    const then = this.cardThen;
    if (!then) return;
    ui('click');
    this.card?.destroy();
    this.card = null;
    this.cardThen = null;
    then();
  }

  get cardOpen() {
    return !!this.card;
  }
}
