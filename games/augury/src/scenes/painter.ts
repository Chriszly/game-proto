import Phaser from 'phaser';
import { C, FONT } from './theme';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A spot on screen, top-left and size; with `onTap`, a tap on it calls that and goes no further. */
export interface Hit extends Rect {
  id: string;
  onTap?: () => void;
  /** A disabled button refuses its tap. */
  enabled?: boolean;
}

export interface TextOpts {
  size: number;
  color?: string;
  /** Origin: 0.5 centres (the default), 0 left or top, 1 right or bottom. */
  ox?: number;
  oy?: number;
  bold?: boolean;
  italic?: boolean;
  wrap?: number;
  alpha?: number;
  align?: 'left' | 'center' | 'right';
  spacing?: number;
}

export interface ButtonOpts {
  enabled?: boolean;
  size?: number;
  /** A brighter frame, for the button that matters most on its screen. */
  accent?: boolean;
}

/**
 * Draws a screen from scratch every time it changes: per layer one Graphics and a pool of texts
 * reused in the order they are asked for, plus the tappable spots of what was drawn (`hits`, later
 * ones on top). Cards over the board go in a higher layer, so they cover the board's texts too.
 * The scene calls `begin`, draws everything, then `end`.
 */
export class Painter {
  hits: Hit[] = [];
  private layers: { g: Phaser.GameObjects.Graphics; texts: Phaser.GameObjects.Text[]; styles: string[]; used: number }[] = [];
  private at = 0;

  constructor(
    private scene: Phaser.Scene,
    private depth: number,
  ) {
    this.layer(0);
  }

  /** The Graphics of the layer being drawn. */
  get g() {
    return this.layers[this.at].g;
  }

  /** Draws from here on in layer `n`, over every lower layer's shapes and texts. */
  layer(n: number) {
    while (this.layers.length <= n) {
      const depth = this.depth + this.layers.length * 10;
      this.layers.push({ g: this.scene.add.graphics().setDepth(depth), texts: [], styles: [], used: 0 });
    }
    this.at = n;
  }

  begin() {
    for (const l of this.layers) {
      l.g.clear();
      l.used = 0;
    }
    this.at = 0;
    this.hits = [];
  }

  end() {
    for (const l of this.layers) for (let i = l.used; i < l.texts.length; i++) l.texts[i].setVisible(false);
  }

  text(x: number, y: number, content: string, o: TextOpts) {
    const l = this.layers[this.at];
    const i = l.used++;
    if (!l.texts[i]) {
      l.texts[i] = this.scene.add.text(0, 0, '', {}).setDepth(l.g.depth + 1);
      l.styles[i] = '';
    }
    const t = l.texts[i];
    const color = o.color ?? C.ink;
    const key = `${o.size}|${color}|${o.bold}|${o.italic}|${o.wrap}|${o.align}|${o.spacing}`;
    if (l.styles[i] !== key) {
      l.styles[i] = key;
      t.setStyle({
        fontFamily: FONT,
        fontSize: `${o.size}px`,
        color,
        fontStyle: [o.bold ? 'bold' : '', o.italic ? 'italic' : ''].join(' ').trim(),
        align: o.align ?? 'center',
      });
      t.setWordWrapWidth(o.wrap ?? null);
      t.setLetterSpacing(o.spacing ?? 0);
    }
    t.setText(content)
      .setOrigin(o.ox ?? 0.5, o.oy ?? 0.5)
      .setPosition(x, y)
      .setAlpha(o.alpha ?? 1)
      .setVisible(true);
    return t;
  }

  hit(id: string, x: number, y: number, w: number, h: number, onTap?: () => void, enabled = true) {
    this.hits.push({ id, x, y, w, h, onTap, enabled });
  }

  /** A tarot-card frame: a filled panel with a gold rule and a thin inner rule; top-left. */
  frame(x: number, y: number, w: number, h: number, o: { fill?: number; alpha?: number; line?: number; inner?: boolean; width?: number } = {}) {
    const g = this.g;
    g.fillStyle(o.fill ?? C.panel, o.alpha ?? C.panelAlpha).fillRect(x, y, w, h);
    g.lineStyle(o.width ?? 1.5, o.line ?? C.gold, 1).strokeRect(x, y, w, h);
    if (o.inner !== false) g.lineStyle(1, o.line ?? C.gold, 0.3).strokeRect(x + 4, y + 4, w - 8, h - 8);
  }

  /** A button centred on (cx, cy); a disabled one still takes its tap, and refuses it. */
  button(id: string, cx: number, cy: number, w: number, h: number, label: string, onTap: () => void, o: ButtonOpts = {}) {
    const enabled = o.enabled ?? true;
    const g = this.g;
    const x = cx - w / 2;
    const y = cy - h / 2;
    g.fillStyle(C.key, enabled ? 1 : 0.5).fillRect(x, y, w, h);
    g.lineStyle(o.accent ? 2 : 1.5, o.accent ? C.cyan : C.gold, enabled ? 1 : 0.4).strokeRect(x, y, w, h);
    this.text(cx, cy, label, { size: o.size ?? 15, color: o.accent ? C.cyanText : C.goldText, alpha: enabled ? 1 : 0.45, spacing: 1 });
    this.hit(id, x, y, w, h, onTap, enabled);
  }
}
