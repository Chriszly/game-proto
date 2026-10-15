import Phaser from 'phaser';
import { HUD_HEIGHT, VIEW, type Stats } from '../game/rules';
import type { ArtStyle } from '../game/save';
import { HI, num, tex } from '../art/paint';
import { ACID_COLOR, CRATE_COLORS, THEMES, UPGRADE_COLORS, type Theme } from '../art/theme';

// The HUD: the top bar (wave, best wave, kills, stats and the art style switch), the wave progress
// strip under it, the frenzy meter beside the squad, and the kit panel on the squad's other side
// (sandbag walls to place, flame bursts, medkits and shotgun pairs). Drawn as comic caption boxes or as an
// amber overwatch overlay. Its Graphics are only redrawn when something on it changes.

export const HUD_DEPTH = 100;
/** The art style switch in the top bar's stats row, in game pixels; taps inside it switch style. */
export const STYLE_SWITCH = { x: 432, y: 33, w: 98, h: 19 };
/** The wave progress strip under the top bar. */
export const PROGRESS = { x: 10, y: HUD_HEIGHT + 4, w: VIEW.w - 20, h: 20 };
/** The frenzy meter, to the right of the squad. */
export const FRENZY_PANEL = { x: 384, y: 884, w: 140, h: 50 };
/** The kit panel, to the left of the squad; tapping it while holding sandbags readies a wall. */
export const KIT_PANEL = { x: 16, y: 884, w: 140, h: 50 };

export interface HudData {
  wave: number;
  kills: number;
  best: number;
  /** This run has gone past the best saved before it started. */
  newBest: boolean;
  stats: Stats;
  /** Zombies of this wave down, out of `total`. */
  fallen: number;
  total: number;
  bossWave: boolean;
  bossNext: boolean;
  /** The next wave with a boss. */
  nextBoss: number;
  streak: number;
  /** 0..1: the streak towards a frenzy, or the frenzy time left while it runs. */
  frenzyFill: number;
  frenzyOn: boolean;
  /** Sandbag walls in hand, and whether the next tap places one. */
  sandbags: number;
  placing: boolean;
  /** Supplies from the boss drops still in hand. */
  flames: number;
  medkits: number;
  pellets: number;
  /** The hero stands in acid: the squad fires slower. */
  inAcid: boolean;
}

type Text = Phaser.GameObjects.Text;

export class Hud {
  private bar: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Graphics;
  private t: Record<
    'wave' | 'kills' | 'best' | 'comic' | 'nv' | 'count' | 'note' | 'frenzy' | 'streak' | 'hint' | 'kit' | 'kitHint' | 'kitList' | 'acid',
    Text
  >;
  private statLabels: Text[];
  private statValues: Text[];
  private style: ArtStyle = 'comic';
  private drawn = '';

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(HUD_DEPTH);
    this.g = scene.add.graphics().setDepth(HUD_DEPTH + 1);
    const text = () => scene.add.text(0, 0, '', { resolution: 2 }).setDepth(HUD_DEPTH + 2);
    this.t = {
      wave: text(), kills: text(), best: text(), comic: text(), nv: text(),
      count: text(), note: text(), frenzy: text(), streak: text(), hint: text(),
      kit: text(), kitHint: text(), kitList: text(), acid: text(),
    };
    this.statLabels = [text(), text(), text(), text()];
    this.statValues = [text(), text(), text(), text()];
  }

  /** Whether a tap at x, y (game pixels) lands on the art style switch. */
  onSwitch(x: number, y: number) {
    const s = STYLE_SWITCH;
    return x >= s.x - 6 && x <= s.x + s.w + 6 && y >= s.y - 6 && y <= s.y + s.h + 6;
  }

  /** Whether a tap at x, y lands on the kit panel. */
  onKit(x: number, y: number) {
    const k = KIT_PANEL;
    return x >= k.x - 4 && x <= k.x + k.w + 4 && y >= k.y - 4 && y <= k.y + k.h + 4;
  }

  setStyle(style: ArtStyle) {
    this.style = style;
    this.bar.setTexture(tex(style, 'hudbar')).setScale(1 / HI);
    this.drawn = '';
  }

  /** Redraws the HUD if anything on it changed. */
  update(d: HudData) {
    const key = JSON.stringify({ ...d, frenzyFill: Math.round(d.frenzyFill * 56), style: this.style });
    if (key === this.drawn) return;
    this.drawn = key;
    const th = THEMES[this.style];
    this.g.clear();
    if (this.style === 'comic') this.drawComic(d, th);
    else this.drawNv(d, th);
    this.drawKit(d, th);
  }

  /**
   * The kit panel: sandbag walls to place (tap the panel, then a lane) and the supplies in hand.
   * Hidden while the kit is empty. Also the warning that the hero stands in acid.
   */
  private drawKit(d: HudData, th: Theme) {
    const g = this.g, t = this.t, k = KIT_PANEL, comic = this.style === 'comic';
    const list = [d.flames && `FLAME ${d.flames}`, d.medkits && `MEDKIT ${d.medkits}`, d.pellets && `SPREAD ${d.pellets}`].filter(Boolean).join(' · ');
    const show = d.sandbags > 0 || d.placing || list !== '';
    [t.kit, t.kitHint, t.kitList].forEach((o) => o.setVisible(show));
    if (show) {
      const bag = CRATE_COLORS.sandbag, ready = d.sandbags > 0;
      if (comic) {
        this.caption(k.x, k.y, k.w, k.h, d.placing ? '#ffd23f' : '#fff8e8', th.ink, 2.2);
        if (ready) {
          g.fillStyle(num(bag)).fillRoundedRect(k.x + k.w - 30, k.y + 7, 22, 11, 5);
          g.lineStyle(1.3, num(th.ink)).strokeRoundedRect(k.x + k.w - 30, k.y + 7, 22, 11, 5);
        }
        this.font(t.kit, 12, th.ink, th).setText(ready ? `SANDBAGS x${d.sandbags}` : 'KIT').setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 13);
        this.font(t.kitHint, 8.5, d.placing ? th.warn : th.ink, th).setText(d.placing ? 'NOW TAP A LANE!' : ready ? 'TAP HERE, THEN A LANE' : '').setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 28);
        this.font(t.kitList, 8, '#5a4a6a', th).setText(list).setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 42);
      } else {
        g.fillStyle(num('#040c06'), 0.72).fillRoundedRect(k.x, k.y, k.w, k.h, 3);
        g.lineStyle(1, num(d.placing ? th.text : th.accent), 0.8).strokeRoundedRect(k.x, k.y, k.w, k.h, 3);
        if (ready) g.fillStyle(num(bag)).fillRect(k.x + k.w - 20, k.y + 8, 12, 6);
        this.font(t.kit, 11, th.accent, th, { glow: th.accent, weight: 'bold' }).setText(ready ? `SANDBAGS ${d.sandbags}` : 'KIT').setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 12);
        this.font(t.kitHint, 8.5, d.placing ? th.text : '#9fd8a4', th, { weight: 'normal' }).setText(d.placing ? 'SELECT LANE' : ready ? 'TAP, THEN A LANE' : '').setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 27);
        this.font(t.kitList, 8.5, th.muted, th, { weight: 'normal' }).setText(list).setOrigin(0, 0.5).setPosition(k.x + 8, k.y + 41);
      }
    }
    t.acid.setVisible(d.inAcid);
    if (d.inAcid) {
      const col = comic ? ACID_COLOR : th.warn;
      this.font(t.acid, comic ? 13 : 12, col, th, comic ? { stroke: th.ink, sw: 4 } : { glow: col, weight: 'bold' })
        .setText(comic ? 'IN THE ACID! HALF FIRE' : 'ACID: FIRE RATE HALVED').setOrigin(0.5).setPosition(VIEW.w / 2, 820);
    }
  }

  private font(t: Text, size: number, color: string, th: Theme, o: { stroke?: string; sw?: number; glow?: string; weight?: string; ls?: number } = {}) {
    t.setFontFamily(th.font).setFontSize(`${size}px`).setFontStyle(o.weight ?? th.fontStyle).setColor(color);
    t.setStroke(o.stroke ?? '#000000', o.stroke ? (o.sw ?? 3) : 0);
    if (o.glow) t.setShadow(0, 0, o.glow, 6, false, true);
    else t.setShadow(0, 0, '#000000', 0, false, false);
    t.setLetterSpacing(o.ls ?? 0);
    return t;
  }

  /** A caption box: an ink drop shadow, a flat fill and an ink outline. */
  private caption(x: number, y: number, w: number, h: number, fill: string, ink: string, lw = 2) {
    this.g.fillStyle(num(ink)).fillRect(x + 3, y + 3, w, h);
    this.g.fillStyle(num(fill)).fillRect(x, y, w, h);
    this.g.lineStyle(lw, num(ink)).strokeRect(x, y, w, h);
  }

  private stats(d: HudData) {
    const s = d.stats;
    return [
      { label: this.style === 'comic' ? 'DAMAGE' : 'DMG', value: String(s.damage), color: UPGRADE_COLORS.damage },
      { label: 'RATE', value: `${(1000 / s.fireInterval).toFixed(1)}/s`, color: UPGRADE_COLORS.rate },
      { label: 'SQUAD', value: String(s.companions + 1), color: UPGRADE_COLORS.companion },
      { label: 'PIERCE', value: String(s.pierce), color: UPGRADE_COLORS.pierce },
    ];
  }

  private drawComic(d: HudData, th: Theme) {
    const g = this.g, ink = th.ink, t = this.t;
    // Top bar: wave and kills in caption boxes, the best wave on a green chip between them.
    this.font(t.wave, 19, ink, th).setText(`WAVE ${d.wave}`).setOrigin(0.5).setPosition(0, 0);
    const ww = Math.max(102, t.wave.width + 18);
    this.caption(8, 5, ww, 26, '#ffe04a', ink);
    t.wave.setPosition(8 + ww / 2, 18);
    this.font(t.kills, 17, ink, th).setText(`KILLS ${d.kills}`).setOrigin(0.5);
    const kw = Math.max(104, t.kills.width + 18);
    this.caption(VIEW.w - 8 - kw, 5, kw, 26, '#fff8e8', ink);
    t.kills.setPosition(VIEW.w - 8 - kw / 2, 18.5);
    this.font(t.best, 10.5, ink, th).setText(d.newBest ? `NEW BEST: WAVE ${d.best}` : `BEST: WAVE ${d.best}`).setOrigin(0.5);
    const bw = t.best.width + 16;
    this.caption(VIEW.w / 2 - bw / 2 - 4, 8, bw, 20, d.newBest ? '#ffd23f' : '#8cd05a', ink);
    t.best.setPosition(VIEW.w / 2 - 4, 18.5);
    // Stats: a colour chip, the name and the number.
    let x = 12;
    this.stats(d).forEach((s, i) => {
      g.fillStyle(num(s.color)).fillRect(x, 38, 9, 9);
      g.lineStyle(1.1, num(ink)).strokeRect(x, 38, 9, 9);
      x += 13;
      this.font(this.statLabels[i], 10.5, th.muted, th).setText(s.label).setOrigin(0, 0.5).setPosition(x, 43);
      x += this.statLabels[i].width + 4;
      this.font(this.statValues[i], 12, th.value, th).setText(s.value).setOrigin(0, 0.5).setPosition(x, 43);
      x += this.statValues[i].width + 13;
    });
    this.drawSwitch(th, '#fff8e8', '#ffe04a', ink);

    // Wave progress strip: blocks fill as the wave's zombies fall; the boss warning at its end.
    const p = PROGRESS;
    this.caption(p.x, p.y, p.w, p.h, '#fff8e8', ink);
    this.font(t.count, 11, ink, th).setText(`${d.fallen}/${d.total}`).setOrigin(0, 0.5).setPosition(p.x + 8, p.y + p.h / 2);
    const n = 10, bx = 60, bwid = 320, on = Math.floor((d.fallen / d.total) * n);
    for (let i = 0; i < n; i++) {
      const cx = bx + (i * bwid) / n;
      g.fillStyle(num(i < on ? '#ffd23f' : '#d8d0c0')).fillRect(cx + 1, p.y + 5, bwid / n - 3, p.h - 10);
      g.lineStyle(1.1, num(ink)).strokeRect(cx + 1, p.y + 5, bwid / n - 3, p.h - 10);
    }
    this.skull(404, p.y + p.h / 2, '#f4ecd8', ink, true);
    const note = d.bossWave ? 'BOSS WAVE!' : d.bossNext ? 'BOSS NEXT WAVE!' : `BOSS AT WAVE ${d.nextBoss}`;
    this.font(t.note, 10, d.bossWave || d.bossNext ? th.warn : '#5a4a6a', th).setText(note).setOrigin(0, 0.5).setPosition(416, p.y + p.h / 2);

    // Frenzy meter.
    const f = FRENZY_PANEL;
    this.caption(f.x, f.y, f.w, f.h, '#fff8e8', ink, 2.2);
    this.font(t.frenzy, 13, '#ff8a2a', th, { stroke: ink, sw: 3.5 }).setText(d.frenzyOn ? 'FRENZY ON!' : 'FRENZY!').setOrigin(0, 0.5).setPosition(f.x + 8, f.y + 13);
    this.star(f.x + f.w - 18, f.y + 14, 9, 14, '#ffe24a', ink);
    this.font(t.streak, 9, ink, th).setText(`x${d.streak}`).setOrigin(0.5).setPosition(f.x + f.w - 18, f.y + 14.5);
    const mx = f.x + 8, my = f.y + 26, mw = f.w - 16, mh = 10;
    g.fillStyle(num('#d8d0c0')).fillRect(mx, my, mw, mh);
    g.fillStyle(num(d.frenzyOn ? '#ffd23f' : '#ff8a2a')).fillRect(mx, my, mw * d.frenzyFill, mh);
    g.lineStyle(1.4, num(ink)).strokeRect(mx, my, mw, mh);
    this.font(t.hint, 8, ink, th).setText(d.frenzyOn ? 'DOUBLE FIRE!' : 'FULL = DOUBLE FIRE!').setOrigin(0, 0.5).setPosition(f.x + 8, f.y + 43);
  }

  private drawNv(d: HudData, th: Theme) {
    const g = this.g, t = this.t, PH = th.text, AMB = th.accent;
    const glow = (c: string) => ({ glow: c, weight: 'bold' });
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    this.font(t.wave, 19, PH, th, { ...glow(PH), ls: 1 }).setText(`WAVE ${pad(d.wave, 2)}`).setOrigin(0, 0.5).setPosition(14, 18);
    this.font(t.kills, 17, PH, th, glow(PH)).setText(`KILLS ${pad(d.kills, 3)}`).setOrigin(1, 0.5).setPosition(VIEW.w - 14, 18);
    this.font(t.best, 11, AMB, th, glow(AMB)).setText(d.newBest ? `NEW BEST ${pad(d.best, 2)}` : `BEST ${pad(d.best, 2)}`).setOrigin(0.5).setPosition(VIEW.w / 2 - 4, 18.5);
    const bw = t.best.width + 16;
    g.lineStyle(1, num(AMB)).strokeRoundedRect(VIEW.w / 2 - 4 - bw / 2, 9, bw, 18, 2);
    let x = 14;
    this.stats(d).forEach((s, i) => {
      g.fillStyle(num(s.color)).fillRect(x, 39, 6, 6);
      x += 11;
      this.font(this.statLabels[i], 11, th.muted, th, { weight: 'normal' }).setText(s.label).setOrigin(0, 0.5).setPosition(x, 42.5);
      x += this.statLabels[i].width + 5;
      this.font(this.statValues[i], 11.5, PH, th, glow(PH)).setText(s.value).setOrigin(0, 0.5).setPosition(x, 42.5);
      x += this.statValues[i].width + 13;
    });
    this.drawSwitch(th, '#020a05', AMB, AMB);

    const p = PROGRESS;
    g.fillStyle(num('#020a05'), 0.75).fillRoundedRect(p.x, p.y, p.w, p.h, 3);
    g.lineStyle(1, num(PH), 0.35).strokeRoundedRect(p.x, p.y, p.w, p.h, 3);
    this.font(t.count, 10.5, PH, th, glow(PH)).setText(`${d.fallen}/${d.total}`).setOrigin(0, 0.5).setPosition(p.x + 8, p.y + p.h / 2);
    const n = Math.min(d.total, 40), bx = 64, bwid = 318, on = Math.floor((d.fallen / d.total) * n);
    for (let i = 0; i < n; i++) {
      g.fillStyle(num(i < on ? AMB : PH), i < on ? 1 : 0.16).fillRect(bx + (i * bwid) / n, p.y + 6, bwid / n - 2.5, p.h - 12);
    }
    const warn = d.bossWave || d.bossNext;
    this.skull(404, p.y + p.h / 2, warn ? th.warn : th.muted, warn ? th.warn : th.muted, false);
    const note = d.bossWave ? 'BOSS WAVE' : d.bossNext ? 'BOSS NEXT WAVE' : `BOSS AT WAVE ${pad(d.nextBoss, 2)}`;
    this.font(t.note, 9.5, warn ? th.warn : th.muted, th, glow(warn ? th.warn : th.muted)).setText(note).setOrigin(0, 0.5).setPosition(415, p.y + p.h / 2);

    const f = FRENZY_PANEL;
    g.fillStyle(num('#040c06'), 0.72).fillRoundedRect(f.x, f.y, f.w, f.h, 3);
    g.lineStyle(1, num(AMB), 0.8).strokeRoundedRect(f.x, f.y, f.w, f.h, 3);
    this.font(t.frenzy, 11, AMB, th, { ...glow(AMB), ls: 2 }).setText(d.frenzyOn ? 'FRENZY ON' : 'FRENZY').setOrigin(0, 0.5).setPosition(f.x + 8, f.y + 12);
    this.font(t.streak, 12, '#ffffff', th, glow('#ffffff')).setText(`x${d.streak}`).setOrigin(1, 0.5).setPosition(f.x + f.w - 8, f.y + 12);
    const segs = 14, mw = f.w - 16;
    for (let i = 0; i < segs; i++) {
      const lit = (i + 1) / segs <= d.frenzyFill + 0.001;
      g.fillStyle(num(AMB), lit ? 1 : 0.18).fillRect(f.x + 8 + (i * mw) / segs, f.y + 24, mw / segs - 2, 9);
    }
    this.font(t.hint, 8.5, '#9fd8a4', th, { weight: 'normal' }).setText(d.frenzyOn ? '2X FIRE ACTIVE' : 'FULL: 2X FIRE 5S').setOrigin(0, 0.5).setPosition(f.x + 8, f.y + 42);
  }

  /** The style switch: a pill with the two style names, the active one lit. */
  private drawSwitch(th: Theme, bg: string, on: string, line: string) {
    const s = STYLE_SWITCH, g = this.g, half = s.w / 2;
    const comic = this.style === 'comic';
    g.fillStyle(num(bg), comic ? 1 : 0.8).fillRoundedRect(s.x, s.y, s.w, s.h, comic ? 3 : 2);
    g.fillStyle(num(on), comic ? 1 : 0.9).fillRoundedRect(comic ? s.x : s.x + half, s.y, half, s.h, comic ? 3 : 2);
    g.lineStyle(comic ? 1.6 : 1, num(line)).strokeRoundedRect(s.x, s.y, s.w, s.h, comic ? 3 : 2);
    const label = (t: Text, text: string, cx: number, active: boolean) =>
      this.font(t, 9, comic ? th.ink : active ? '#020a05' : th.accent, th).setText(text).setOrigin(0.5).setPosition(cx, s.y + s.h / 2 + 0.5);
    label(this.t.comic, 'COMIC', s.x + half / 2, comic);
    label(this.t.nv, 'NV', s.x + half * 1.5, !comic);
  }

  private skull(x: number, y: number, fill: string, line: string, filled: boolean) {
    const g = this.g;
    if (filled) {
      g.fillStyle(num(fill)).fillEllipse(x, y - 1, 15, 14).fillRect(x - 4, y + 3, 8, 4);
    }
    g.lineStyle(1.3, num(line)).strokeEllipse(x, y - 1, 15, 14).strokeRect(x - 4, y + 3, 8, 4);
    g.fillStyle(num(filled ? THEMES.comic.ink : line)).fillCircle(x - 2.8, y - 1, 1.8).fillCircle(x + 2.8, y - 1, 1.8);
  }

  private star(x: number, y: number, r0: number, r1: number, fill: string, line: string) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? r0 : r1;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    this.g.fillStyle(num(fill)).fillPoints(pts, true);
    this.g.lineStyle(1.4, num(line)).strokePoints(pts, true);
  }
}
