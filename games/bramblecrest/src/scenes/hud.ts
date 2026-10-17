// What sits on the screen over the world: hearts, moonstones and keys, the journal line, the
// name of the place, the touch buttons, the talk box, short toasts and the chapter's end card.
// Everything here has a scroll factor of 0, so `splitHudCamera` draws it with the fixed camera.

import Phaser from 'phaser';
import { texScale } from '../art/paint';
import { MOONSTONES, OBJECTIVES, type GameState } from '../game/state';
import { BUTTONS, VIEW } from './layout';

const FONT = 'Georgia, "Times New Roman", serif';
const DEPTH = 10000;

export interface DialogView {
  speaker: string;
  text: string;
}

export class Hud {
  private hearts: Phaser.GameObjects.Image[] = [];
  private stones: Phaser.GameObjects.Text;
  private stoneIcon: Phaser.GameObjects.Image;
  private keys: Phaser.GameObjects.Text;
  private objective: Phaser.GameObjects.Text;
  private place: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;
  private buttons: Record<keyof typeof BUTTONS, Phaser.GameObjects.Image>;
  private box: Phaser.GameObjects.Graphics;
  private speaker: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private placeMs = 0;
  private toastMs = 0;
  private endCard: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene) {
    const add = scene.add;
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => o.setScrollFactor(0).setDepth(DEPTH);
    const plate = fixed(add.graphics());
    plate.fillStyle(0x0a0e24, 0.55).fillRoundedRect(8, 8, 230, 52, 10);
    this.stoneIcon = fixed(add.image(24, 46, 'moonstone').setScale(texScale('moonstone')));
    this.stones = fixed(add.text(36, 37, '', { fontFamily: FONT, fontSize: '16px', color: '#dff2ff' }));
    this.keys = fixed(add.text(120, 37, '', { fontFamily: FONT, fontSize: '16px', color: '#f0d890' }));
    this.objective = fixed(
      add.text(VIEW.w - 12, 12, '', { fontFamily: FONT, fontSize: '15px', color: '#f3ead2', align: 'right', backgroundColor: 'rgba(10,14,36,0.55)', padding: { x: 10, y: 6 } }).setOrigin(1, 0),
    );
    this.place = fixed(add.text(VIEW.w / 2, 84, '', { fontFamily: FONT, fontSize: '30px', color: '#f3ead2', stroke: '#0a0e24', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0));
    this.toastText = fixed(add.text(VIEW.w / 2, 130, '', { fontFamily: FONT, fontSize: '18px', color: '#dff2ff', stroke: '#0a0e24', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0));
    this.buttons = {
      sword: fixed(add.image(BUTTONS.sword.x, BUTTONS.sword.y, 'btn-sword').setScale(texScale('btn-sword') * (BUTTONS.sword.r / 30))),
      roll: fixed(add.image(BUTTONS.roll.x, BUTTONS.roll.y, 'btn-roll').setScale(texScale('btn-roll') * (BUTTONS.roll.r / 30))),
      vine: fixed(add.image(BUTTONS.vine.x, BUTTONS.vine.y, 'btn-vine').setScale(texScale('btn-vine') * (BUTTONS.vine.r / 30))),
    };
    this.box = fixed(add.graphics()).setDepth(DEPTH + 1);
    this.speaker = fixed(add.text(150, 398, '', { fontFamily: FONT, fontSize: '17px', color: '#f0d890', fontStyle: 'bold' })).setDepth(DEPTH + 2);
    this.line = fixed(add.text(150, 424, '', { fontFamily: FONT, fontSize: '19px', color: '#f3ead2', wordWrap: { width: 650 }, lineSpacing: 4 })).setDepth(DEPTH + 2);
    this.hint = fixed(add.text(810, 500, '', { fontFamily: FONT, fontSize: '13px', color: '#a8b0d0' }).setOrigin(1, 0.5)).setDepth(DEPTH + 2);
  }

  /** Which touch button, if any, is at a point on the screen. */
  buttonAt(p: { x: number; y: number }, s: GameState): keyof typeof BUTTONS | null {
    for (const [id, b] of Object.entries(BUTTONS) as [keyof typeof BUTTONS, (typeof BUTTONS)['sword']][]) {
      if (!this.buttons[id].visible) continue;
      if (id === 'vine' && !s.items.hookvine) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r) return id;
    }
    return null;
  }

  showPlace(name: string) {
    this.place.setText(name).setAlpha(1);
    this.placeMs = 2200;
  }

  toast(text: string) {
    this.toastText.setText(text).setAlpha(1);
    this.toastMs = 1800;
  }

  update(dt: number, s: GameState, dialog: DialogView | null, inShrine: boolean) {
    // Hearts: one image per two half hearts of the most the knight can have.
    const want = Math.ceil(s.maxHp / 2);
    while (this.hearts.length < want) this.hearts.push(this.scene.add.image(24 + this.hearts.length * 22, 22, 'ui-heart').setScrollFactor(0).setDepth(DEPTH));
    this.hearts.forEach((h, i) => {
      const left = s.hp - i * 2;
      const key = left >= 2 ? 'ui-heart' : left === 1 ? 'ui-heart-half' : 'ui-heart-empty';
      h.setTexture(key).setScale(texScale(key)).setVisible(i < want);
    });
    this.stones.setText(`${s.moonstones.length} / ${MOONSTONES}`);
    this.keys.setText(inShrine || s.keys > 0 ? `Keys ${s.keys}` : '');
    this.objective.setText(OBJECTIVES[s.quest]);
    this.buttons.sword.setVisible(s.items.sword && !dialog);
    this.buttons.vine.setVisible(s.items.hookvine && !dialog);
    this.buttons.roll.setVisible(!dialog);
    this.stoneIcon.setVisible(true);
    if (this.placeMs > 0) {
      this.placeMs -= dt;
      this.place.setAlpha(Math.min(1, this.placeMs / 600));
    }
    if (this.toastMs > 0) {
      this.toastMs -= dt;
      this.toastText.setAlpha(Math.min(1, this.toastMs / 500));
    }
    this.box.clear();
    this.speaker.setText(dialog?.speaker ?? '');
    this.line.setText(dialog?.text ?? '');
    this.hint.setText(dialog ? 'Tap or Space' : '');
    if (dialog) {
      this.box.fillStyle(0x0a0e24, 0.86).fillRoundedRect(130, 388, 700, 132, 14);
      this.box.lineStyle(2, 0xc8b070, 0.8).strokeRoundedRect(130, 388, 700, 132, 14);
    }
  }

  get ended() {
    return this.endCard !== null;
  }

  /** The chapter's end card, with how the night went and two ways on. */
  showEnd(title: string, lines: string[], onKeep: () => void, onNew: () => void) {
    const add = this.scene.add;
    const c = add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 10);
    const g = add.graphics();
    g.fillStyle(0x05081a, 0.82).fillRect(0, 0, VIEW.w, VIEW.h);
    g.fillStyle(0x10163a, 0.95).fillRoundedRect(180, 90, 600, 360, 18);
    g.lineStyle(2, 0xc8b070, 0.9).strokeRoundedRect(180, 90, 600, 360, 18);
    c.add(g);
    c.add(add.text(VIEW.w / 2, 130, title, { fontFamily: FONT, fontSize: '28px', color: '#f0d890' }).setOrigin(0.5));
    c.add(add.text(VIEW.w / 2, 250, lines.join('\n\n'), { fontFamily: FONT, fontSize: '18px', color: '#f3ead2', align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5));
    const button = (x: number, label: string, fn: () => void) => {
      const b = add.text(x, 400, label, { fontFamily: FONT, fontSize: '20px', color: '#10163a', backgroundColor: '#f0d890', padding: { x: 16, y: 8 } }).setOrigin(0.5);
      b.setInteractive({ useHandCursor: true }).on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        c.destroy();
        this.endCard = null;
        fn();
      });
      c.add(b);
    };
    button(370, 'Keep exploring', onKeep);
    button(590, 'New game', onNew);
    this.endCard = c;
  }
}
