import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { DUSK, INK, INK_HEX, PAD, RES, SCREENS } from '../art/puppet';
import { JAR, LANTERN_SPOTS } from '../game/places';
import { loadBest, saveBest } from '../game/save';
import {
  CLOSE_CALL,
  CLOSE_CALL_PAY,
  buy,
  DUSK_MS,
  LIVES,
  mothLightMs,
  newGame,
  nextCost,
  nextDusk,
  orderProgress,
  PAY_PER_LANTERN,
  requiredFor,
  send,
  tick,
  UPGRADE_IDS,
  UPGRADES,
  type GameEvent,
  type GameState,
  type UpgradeId,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { FONT, GUST_TAG, LANTERN_HIT, NEXT_BUTTON, NIGHT_PANEL, ORDER, SHOP, UI_DEPTH, VIEW } from './layout';

/** The longest step of game time one frame may take, so a stalled tab doesn't skip the dusk. */
const MAX_STEP_MS = 100;
/** How long a popup floats up, in milliseconds. */
const POPUP_MS = 1200;
/** How long night shows the lit castle and its coins before the night panel opens, in milliseconds. */
const PANEL_DELAY_MS = 1500;

type TextOpts = { size: number; color?: string; bold?: boolean; glow?: boolean; stroke?: boolean };

/** Where a button is on screen; read by the playthrough test. */
export interface ButtonSpot {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ShopParts {
  bg: Phaser.GameObjects.Image;
  level: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

interface LampParts {
  glow: Phaser.GameObjects.Image;
  lamp: Phaser.GameObjects.Image;
  flame: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The upgrade buttons in the night panel, by id; read by the playthrough test. */
  shopButtons: (ButtonSpot & { id: UpgradeId })[] = [];
  /** The night panel's "Next dusk" button; read by the playthrough test. */
  nextButton: ButtonSpot = { x: NEXT_BUTTON.x, y: NEXT_BUTTON.y, w: 200, h: 40 };
  private clock = 0;
  /** When night fell, on the scene's clock. */
  private nightAt = 0;
  private lastFrame: number | null = null;
  private screens: Phaser.GameObjects.Image[] = [];
  private stars!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private lamps: LampParts[] = [];
  /** The gust's wind curls, drawn each frame under the lanterns. */
  private wind!: Phaser.GameObjects.Graphics;
  /** Oil bars and the punched rings round lanterns, drawn each frame over them. */
  private marks!: Phaser.GameObjects.Graphics;
  /** Dotted trails of moths flying home. */
  private trails!: Phaser.GameObjects.Graphics;
  private moths: { halo: Phaser.GameObjects.Image; body: Phaser.GameObjects.Image }[] = [];
  private gustTag!: Phaser.GameObjects.Container;
  private gustTitle!: Phaser.GameObjects.Text;
  private gustNote!: Phaser.GameObjects.Text;
  private gustPointer!: Phaser.GameObjects.Graphics;
  private orderText!: Phaser.GameObjects.Text;
  private orderReward!: Phaser.GameObjects.Text;
  private orderProgressText!: Phaser.GameObjects.Text;
  private orderPips: Phaser.GameObjects.Image[] = [];
  private hearths: Phaser.GameObjects.Image[] = [];
  private nightText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private litText!: Phaser.GameObjects.Text;
  private needText!: Phaser.GameObjects.Text;
  private duskText!: Phaser.GameObjects.Text;
  private duskFill!: Phaser.GameObjects.Image;
  private duskSun!: Phaser.GameObjects.Image;
  private nightPanel!: Phaser.GameObjects.Container;
  private nightTitle!: Phaser.GameObjects.Text;
  private tallyText!: Phaser.GameObjects.Text;
  private shop = new Map<UpgradeId, ShopParts>();
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.createWorld();
    this.createOrderCard();
    this.createGustTag();
    this.createHud();
    this.createNightPanel();
    this.createGameOver();
  }

  /** A line of serif lettering: `glow` lights it from behind like light through cut card. */
  private label(x: number, y: number, text: string, o: TextOpts) {
    const t = this.add.text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${o.size}px`,
      fontStyle: o.bold ? 'bold' : 'normal',
      color: o.color ?? '#f4e2c8',
      resolution: 2,
      ...(o.stroke ? { stroke: INK, strokeThickness: 4 } : {}),
    });
    if (o.glow) t.setShadow(0, 0, 'rgba(255,150,70,0.85)', 6, !!o.stroke, true);
    return t;
  }

  /** A sprite painted at RES canvas pixels per view pixel, drawn at view size. */
  private sprite(x: number, y: number, key: string) {
    return this.add.image(x, y, key).setScale(1 / RES);
  }

  private createWorld() {
    this.screens = SCREENS.map((key) => this.add.image(0, 0, key).setOrigin(0).setDepth(0));
    this.stars = this.add.image(0, 0, 'stars').setOrigin(0).setDepth(1);
    this.moon = this.sprite(650, 86, 'moon').setDepth(1);
    this.add.image(0, 0, 'castle').setOrigin(0).setDepth(2);
    this.wind = this.add.graphics().setDepth(4);

    LANTERN_SPOTS.forEach(({ x, y }, i) => {
      const glow = this.add.image(x, y, 'glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      const lamp = this.sprite(x, y, 'lantern-dark').setDepth(5);
      lamp.setOrigin(0.5, 36 / 56);
      const flame = this.sprite(x, y, 'flame').setDepth(5);
      const bg = this.add.image(-42 - PAD, -11 - PAD, 'save-tag').setOrigin(0).setScale(1 / RES);
      const text = this.label(0, 0, `Save it +${CLOSE_CALL_PAY}c`, { size: 11, bold: true, color: '#ffc890', glow: true }).setOrigin(0.5);
      const tag = this.add.container(x, y - 53, [bg, text]).setDepth(8);
      this.lamps.push({ glow, lamp, flame, tag });
      this.add
        .zone(x, y, LANTERN_HIT.w, LANTERN_HIT.h)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => send(this.state, i));
    });
    this.marks = this.add.graphics().setDepth(6);
    this.trails = this.add.graphics().setDepth(6);
  }

  private createOrderCard() {
    const { x, y, w } = ORDER;
    this.add.image(x - PAD, y - PAD, 'order-card').setOrigin(0).setScale(1 / RES).setDepth(UI_DEPTH);
    this.label(x + 42, y + 15, "HERALD'S ORDER", { size: 10, bold: true, color: '#ffd08a', glow: true }).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.orderText = this.label(x + 42, y + 29, '', { size: 10.5, glow: true }).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.orderReward = this.label(x + w - 24, y + 18.5, '', { size: 8.5, bold: true, color: INK }).setOrigin(0.5).setDepth(UI_DEPTH);
    this.orderProgressText = this.label(x + 118, y + 45, '', { size: 9.5, color: '#c9a882' }).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    for (let k = 0; k < 3; k++) this.orderPips.push(this.sprite(x + 50 + k * 22, y + 45, 'pip-dark').setDepth(UI_DEPTH));
  }

  private createGustTag() {
    const bg = this.add.image(-PAD, -PAD, 'gust-tag').setOrigin(0).setScale(1 / RES);
    this.gustTitle = this.label(34, 15, '', { size: 12.5, bold: true, color: '#dbe8ff', glow: true }).setOrigin(0, 0.5);
    this.gustTitle.setShadow(0, 0, 'rgba(140,180,255,0.8)', 6, false, true);
    this.gustNote = this.label(32, 29, '', { size: 7.5, color: '#b8c8e4' }).setOrigin(0, 0.5);
    this.gustTag = this.add.container(0, 0, [bg, this.gustTitle, this.gustNote]).setDepth(8.5).setVisible(false);
    this.gustPointer = this.add.graphics().setDepth(8.4);
  }

  private createHud() {
    this.add.image(0, 0, 'hud').setOrigin(0).setScale(1 / RES).setDepth(UI_DEPTH);
    this.nightText = this.label(14, 20, '', { size: 18, bold: true, color: '#ffc870', glow: true }).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    for (let i = 0; i < LIVES; i++) this.hearths.push(this.sprite(130 + i * 22, 20, 'hearth-lit').setDepth(UI_DEPTH));
    this.sprite(221, 20, 'coin').setDepth(UI_DEPTH);
    this.coinsText = this.label(236, 20, '', { size: 18, bold: true, color: '#ffe4b8', glow: true }).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.duskFill = this.add.image(DUSK.x, DUSK.y, 'dusk-fill').setOrigin(0).setScale(1 / RES).setDepth(UI_DEPTH);
    this.add.image(DUSK.x - 1, DUSK.y - 1, 'dusk-rim').setOrigin(0).setScale(1 / RES).setDepth(UI_DEPTH);
    this.duskSun = this.sprite(DUSK.x, DUSK.y + 8, 'sun').setDepth(UI_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
    this.duskText = this.label(DUSK.x + DUSK.w / 2 + 14, DUSK.y + 8.5, '', { size: 12, bold: true, color: '#fff3dc', stroke: true })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);
    this.needText = this.label(VIEW.w - 14, 20, '', { size: 15, color: '#c9a882' }).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.litText = this.label(VIEW.w - 76, 20, '', { size: 18, bold: true, color: '#ffc870', glow: true }).setOrigin(1, 0.5).setDepth(UI_DEPTH);
  }

  private createNightPanel() {
    const { x, y, w, h } = NIGHT_PANEL;
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x000000, 0.35).setInteractive();
    const panel = this.add.image(x - w / 2 - PAD, y - h / 2 - PAD, 'panel').setOrigin(0).setScale(1 / RES);
    this.nightTitle = this.label(x, y - h / 2 + 34, '', { size: 26, bold: true, color: '#ffc870', glow: true }).setOrigin(0.5);
    this.tallyText = this.label(x, y - h / 2 + 104, '', { size: 14 }).setOrigin(0.5).setAlign('center').setLineSpacing(2);
    const parts: Phaser.GameObjects.GameObject[] = [dim, panel, this.nightTitle, this.tallyText];
    UPGRADE_IDS.forEach((id, i) => {
      const bx = SHOP.xs[i % 2];
      const by = SHOP.ys[Math.floor(i / 2)];
      const left = bx - SHOP.w / 2;
      const top = by - SHOP.h / 2;
      const bg = this.add.image(left - PAD, top - PAD, 'card-off').setOrigin(0).setScale(1 / RES);
      const name = this.label(left + 14, top + 9, UPGRADES[id].name, { size: 17, bold: true, color: '#ffc870', glow: true });
      const level = this.label(left + SHOP.w - 14, top + 11, '', { size: 12, color: '#b8a8c8' }).setOrigin(1, 0);
      const blurb = this.label(left + 14, top + 34, UPGRADES[id].blurb, { size: 12, color: '#e0cfb4' });
      const cost = this.label(left + SHOP.w - 14, top + SHOP.h - 22, '', { size: 13, bold: true, color: '#ffc870' }).setOrigin(1, 0);
      const hit = this.add.zone(bx, by, SHOP.w, SHOP.h).setInteractive({ useHandCursor: true }).on('pointerdown', () => buy(this.state, id));
      this.shop.set(id, { bg, level, cost });
      this.shopButtons.push({ id, x: bx, y: by, w: SHOP.w, h: SHOP.h });
      parts.push(bg, name, level, blurb, cost, hit);
    });
    parts.push(makeButton(this, NEXT_BUTTON.x, NEXT_BUTTON.y, 'Next dusk', () => nextDusk(this.state)));
    this.nightPanel = this.add.container(0, 0, parts).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  private createGameOver() {
    const cx = VIEW.w / 2;
    const cy = VIEW.h / 2;
    const dim = this.add.rectangle(cx, cy, VIEW.w, VIEW.h, 0x000000, 0.6).setInteractive();
    const panel = this.add.image(cx - 260 - PAD, cy - 120 - PAD, 'panel-small').setOrigin(0).setScale(1 / RES);
    const title = this.label(cx, cy - 76, 'The keep went dark', { size: 28, bold: true, color: '#ffc870', glow: true }).setOrigin(0.5);
    this.gameOverText = this.label(cx, cy - 10, '', { size: 16 }).setOrigin(0.5).setAlign('center');
    const again = makeButton(this, cx, cy + 72, 'New keep', () => this.restart());
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    const s = this.state;
    const phase = s.phase;
    tick(s, dt);
    for (const e of s.events.splice(0)) this.showEvent(e);
    if (s.phase !== phase) {
      saveBest(s.best);
      this.nightAt = this.clock;
      this.payout();
    }
    this.drawScreen();
    this.drawLanterns();
    this.drawGust();
    this.drawMoths();
    this.drawOrder();
    this.drawHud();
    this.drawPanels();
  }

  /** How far dusk has gone, from 0 at its start to 1 once night has fallen. */
  private dusk() {
    return this.state.phase === 'dusk' ? 1 - this.state.duskMs / DUSK_MS : 1;
  }

  /** The paper screen crossfades from saffron through deep dusk to indigo; stars and moon come out. */
  private drawScreen() {
    const p = this.dusk();
    const [a, b, c] = this.screens;
    a.setVisible(p < 0.6);
    b.setVisible(true).setAlpha(p < 0.6 ? p / 0.6 : 1);
    c.setVisible(p > 0.6).setAlpha(Phaser.Math.Clamp((p - 0.6) / 0.4, 0, 1));
    this.stars.setAlpha(Phaser.Math.Clamp(p * 1.6 - 0.3, 0, 1));
    this.moon.setY(170 - 84 * p).setAlpha(Phaser.Math.Clamp(p * 1.5, 0, 1));
  }

  private drawLanterns() {
    const s = this.state;
    const g = this.marks.clear();
    const still = settings.reduceMotion;
    this.lamps.forEach((parts, i) => {
      const lantern = s.lanterns[i];
      parts.lamp.setVisible(!!lantern);
      parts.glow.setVisible(!!lantern?.lit);
      parts.flame.setVisible(!!lantern?.lit);
      parts.tag.setVisible(false);
      if (!lantern) return;
      const { x, y } = lantern;
      parts.lamp.setTexture(lantern.lit ? 'lantern-lit' : 'lantern-dark');
      // The flicker wavers the flame and the glow; reduce motion holds them still.
      const flicker = still ? 0 : Math.sin(this.clock / 90 + i * 1.7);
      const f = lantern.lit ? Phaser.Math.Clamp(lantern.oilMs / lantern.oilMaxMs, 0, 1) : 0;
      if (lantern.lit) {
        const strength = Math.min(1, f / 0.3);
        parts.glow.setScale(((60 + 24 * strength) / 64) * (1 + flicker * 0.03)).setAlpha(0.5 + 0.5 * strength);
        parts.flame.setScale(1 / RES, (1 / RES) * (1 + flicker * 0.12));
        // The oil left, a strip of gel under the lantern; it turns orange when low.
        const bx = x - 18;
        const by = y + 24;
        g.fillStyle(INK_HEX).fillRect(bx - 1.5, by - 1.5, 39, 8);
        g.fillStyle(f < 0.25 ? 0xff7a3a : 0xffd070).fillRect(bx, by, 36 * f, 5);
      }
      const moth = s.moths.find((m) => m.target === i && (m.task === 'lighting' || m.task === 'guard'));
      const queued = s.queue.indexOf(i);
      if (moth?.task === 'lighting') this.holes(g, x, y, 23, Math.min(1, moth.lightingMs / mothLightMs(s, moth)), 0xfff6d0, 1.6);
      else if (moth?.task === 'guard') this.holes(g, x, y, 23, 1, 0xbcd4ff, 1.8);
      else if (queued >= 0) {
        this.holes(g, x, y, 23, 1, 0xffb040, 1.8);
        g.fillStyle(INK_HEX).fillCircle(x + 20, y - 22, 7);
      } else if (!lantern.lit && !lantern.claimed && s.phase === 'dusk') this.holes(g, x, y, 23, 0, 0xffffff, 1.3);
      this.queueBadge(i, queued);
      // A nearly dry lantern with no moth on its way: a refill now is a close call.
      if (s.phase === 'dusk' && lantern.lit && !lantern.claimed && f < CLOSE_CALL) {
        const pulse = still ? 1 : 0.65 + 0.35 * Math.sin(this.clock / 120);
        g.lineStyle(1.8, 0xff8c3c, 0.95 * pulse).strokeCircle(x, y, 25);
        g.lineStyle(1.8, 0xff8c3c, 0.4 * pulse).strokeCircle(x, y, 31);
        parts.tag.setVisible(true).setY(y - 53);
      }
    });
  }

  /** The queue position badge numbers, made on demand. */
  private badges = new Map<number, Phaser.GameObjects.Text>();
  private queueBadge(i: number, queued: number) {
    let t = this.badges.get(i);
    if (queued < 0) {
      t?.setVisible(false);
      return;
    }
    if (!t) {
      const l = LANTERN_SPOTS[i];
      t = this.label(l.x + 20, l.y - 22, '', { size: 10, bold: true, color: '#ffb040' }).setOrigin(0.5).setDepth(6.1);
      this.badges.set(i, t);
    }
    t.setVisible(true).setText(String(queued + 1));
  }

  /** A ring of punched holes round (x, y), the first `f` of them lit in `color`. */
  private holes(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, f: number, color: number, size: number) {
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
      const on = k / n < f;
      g.fillStyle(on ? color : 0xfff0c8, on ? 1 : 0.22).fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, size);
    }
  }

  /** The gust warning: wind curls sweeping in from the nearer edge, a dashed ring and the countdown plaque. */
  private drawGust() {
    const s = this.state;
    const g = this.wind.clear();
    const p = this.gustPointer.clear();
    const gust = s.phase === 'dusk' ? s.gust : null;
    this.gustTag.setVisible(!!gust);
    if (!gust) return;
    const T = s.lanterns[gust.target];
    const still = settings.reduceMotion;
    const fromRight = T.x >= VIEW.w / 2;
    const edge = fromRight ? VIEW.w - 4 : 4;
    const dir = fromRight ? 1 : -1;
    const curl = (y0: number, bend: number, width: number, alpha: number, phase: number) => {
      const end = new Phaser.Math.Vector2(T.x + 30 * dir, T.y - 4);
      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(edge, y0),
        new Phaser.Math.Vector2(edge - 56 * dir, y0 + bend),
        new Phaser.Math.Vector2(T.x + 70 * dir, T.y - 20 + bend / 2),
        end,
      );
      const pts = curve.getPoints(40);
      g.lineStyle(width, 0xffecd2, alpha * (still ? 0.85 : 0.45)).strokePoints(pts);
      if (!still) {
        // A brighter gust of air travels along the curl.
        const t = (this.clock / 900 + phase) % 1;
        const a = Math.floor(t * 34);
        g.lineStyle(width + 0.6, 0xfff6e8, alpha).strokePoints(pts.slice(a, a + 8));
      }
      g.lineStyle(width, 0xffecd2, alpha * 0.85).beginPath().arc(end.x + 4 * dir, end.y - 4, 4, Math.PI * 0.7, Math.PI * 2.1).strokePath();
    };
    curl(T.y - 24, -14, 2.2, 0.85, 0);
    curl(T.y + 12, 10, 1.6, 0.6, 0.33);
    curl(T.y + 48, -4, 1.3, 0.45, 0.66);
    // A dashed pale-blue ring round the lantern the gust is coming for.
    const spin = still ? 0 : this.clock / 2000;
    for (let k = 0; k < 24; k++) {
      const a = spin + (k / 24) * Math.PI * 2;
      g.lineStyle(1.6, 0xd2e6ff, 0.95).beginPath().arc(T.x, T.y, 28, a, a + 0.14).strokePath();
    }
    // The plaque beside it, clear of the order card and the HUD.
    // Beside the lantern on the windward side, or the other side when the screen edge is too near.
    const right = Math.min(T.x + 38, VIEW.w - 4 - GUST_TAG.w);
    const left = Math.max(T.x - 38 - GUST_TAG.w, 4);
    let tx = fromRight ? right : left;
    if (fromRight && tx < T.x + 30) tx = left;
    if (!fromRight && tx + GUST_TAG.w > T.x - 30) tx = right;
    let ty = Math.max(46, T.y - 80);
    if (tx < ORDER.x + ORDER.w + 6 && ty < ORDER.y + ORDER.h + 6) ty = ORDER.y + ORDER.h + 8;
    this.gustTag.setPosition(tx, ty);
    const secs = Math.max(1, Math.ceil((s.duskMs - gust.atMs) / 1000));
    this.gustTitle.setText(`Gust in ${secs}s`);
    const shielded = s.moths.some((m) => m.target === gust.target && (m.task === 'lighting' || m.task === 'guard'));
    this.gustNote.setText(shielded ? 'a moth is shielding it' : 'a moth on it shields it');
    // The plaque's pointer, a sliver of card reaching to the lantern.
    const px = tx + (fromRight ? 30 : GUST_TAG.w - 30);
    p.fillStyle(INK_HEX).fillTriangle(px - 6, ty + GUST_TAG.h - 1, px + 6, ty + GUST_TAG.h - 1, T.x + 14 * dir, T.y - 26);
  }

  private drawMoths() {
    const s = this.state;
    while (this.moths.length < s.moths.length) {
      const halo = this.add.image(0, 0, 'glow-pale').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32).setScale(0.42).setDepth(6.5);
      const body = this.add.image(0, 0, 'moth-fast-up').setScale(1 / RES).setDepth(7);
      this.moths.push({ halo, body });
    }
    while (this.moths.length > s.moths.length) {
      const m = this.moths.pop()!;
      m.halo.destroy();
      m.body.destroy();
    }
    const t = this.trails.clear();
    const still = settings.reduceMotion;
    s.moths.forEach((m, i) => {
      // Wings flap while flying and slowly while sitting; reduce motion holds them up and stops the bobbing.
      const sitting = m.task === 'lighting' || m.task === 'guard' || m.task === 'idle';
      const rate = sitting ? 320 : 90;
      const wingsUp = still || Math.floor(this.clock / rate + i) % 2 === 0;
      const bob = still || sitting ? 0 : Math.sin(this.clock / 260 + i * 2) * 3;
      const parts = this.moths[i];
      parts.body.setTexture(`moth-${m.kind}-${wingsUp ? 'up' : 'down'}`).setPosition(m.x, m.y + bob);
      parts.halo.setPosition(m.x, m.y + bob);
      if (m.task === 'home') {
        // A dotted chalk trail back to the jar.
        const jx = JAR.x;
        const jy = JAR.y - 46;
        const d = Math.hypot(jx - m.x, jy - m.y);
        for (let k = 10; k < d; k += 5.5) t.fillStyle(0xffe4b4, 0.45).fillCircle(m.x + ((jx - m.x) * k) / d, m.y + 6 + ((jy - m.y - 6) * k) / d, 0.8);
      }
    });
  }

  private drawOrder() {
    const s = this.state;
    const { goal, text, reward } = s.order;
    this.orderText.setText(text);
    this.orderReward.setText(`+${reward}c`);
    const { done, of } = orderProgress(s);
    this.orderPips.forEach((pip, k) => {
      pip.setVisible(k < of);
      const on = goal.kind === 'lit' ? !!s.lanterns[goal.lanterns[k]]?.lit : k < done;
      pip.setTexture(on ? 'pip-lit' : 'pip-dark');
    });
    this.orderProgressText.setX(ORDER.x + 50 + of * 22 + 2);
    const met = done >= of;
    const line =
      goal.kind === 'lit'
        ? `${done}/${of} burning${met ? ' · hold till dark' : ''}`
        : goal.kind === 'closeCalls'
          ? `${done}/${of} saved in time`
          : `${done}/${of} shielded`;
    this.orderProgressText.setText(s.phase === 'dusk' ? line : s.report?.orderMet ? 'Order kept!' : 'Order missed');
  }

  private drawHud() {
    const s = this.state;
    this.nightText.setText(`Night ${s.night}`);
    this.hearths.forEach((h, i) => h.setTexture(i < s.lives ? 'hearth-lit' : 'hearth-out'));
    this.coinsText.setText(String(s.coins));
    const lit = s.lanterns.filter((l) => l.lit).length;
    const need = requiredFor(s.lanterns.length);
    this.litText.setText(`Lit ${lit}/${s.lanterns.length}`);
    this.needText.setText(`need ${need}`);
    // setColor always redraws the text, so only set it when it changes.
    const litColour = lit >= need ? '#ffc870' : '#f4e2c8';
    if (this.litText.style.color !== litColour) this.litText.setColor(litColour);

    const f = s.phase === 'dusk' ? s.duskMs / DUSK_MS : 0;
    this.duskFill.setCrop(0, 0, DUSK.w * RES * f, DUSK.h * RES).setVisible(f > 0);
    this.duskSun.setX(DUSK.x + DUSK.w * f);
    const queued = s.queue.length ? ` · ${s.queue.length} queued` : '';
    this.duskText.setText(s.phase === 'dusk' ? `Nightfall in ${Math.ceil(s.duskMs / 1000)}s${queued}` : 'Night');
  }

  /** True once the night panel or the game-over panel is open; read by the playthrough test. */
  get panelOpen() {
    return this.state.phase !== 'dusk' && this.clock - this.nightAt >= PANEL_DELAY_MS;
  }

  private drawPanels() {
    const s = this.state;
    this.nightPanel.setVisible(s.phase === 'night' && this.panelOpen);
    this.gameOver.setVisible(s.phase === 'over' && this.panelOpen);
    const r = s.report;
    if (s.phase === 'night' && r) {
      this.nightTitle.setText(`Night ${s.night} falls`);
      const verdict = r.lostHearth ? 'Too dark: one of the hearths went out.' : r.lit === r.count ? 'Every lantern lit: the keep blazes!' : 'The keep holds the dark at bay.';
      const order = r.orderMet ? `Herald's order kept: +${s.order.reward}` : "Herald's order missed";
      const calls = s.closeCalls ? `  (+${s.closeCalls * CLOSE_CALL_PAY} in close calls)` : '';
      this.tallyText.setText([`${r.lit} of ${r.count} lanterns lit (${r.required} needed)`, order, `+${r.earned} coins${calls}`, verdict]);
      for (const [id, parts] of this.shop) {
        const cost = nextCost(s, id);
        const affordable = cost !== null && s.coins >= cost;
        parts.bg.setTexture(affordable ? 'card-on' : 'card-off');
        parts.level.setText(`Lv ${s.levels[id]}/${UPGRADES[id].costs.length}`);
        parts.cost.setText(cost === null ? 'Maxed' : `${cost} coins`);
        const costColour = affordable ? '#ffc870' : '#8a7e8a';
        if (parts.cost.style.color !== costColour) parts.cost.setColor(costColour);
      }
    }
    if (s.phase === 'over') {
      this.gameOverText.setText(`The last hearth went out on night ${s.night}.\nNights kept: ${s.kept}.\n\nBest: ${s.best} nights.`);
    }
  }

  /** Lettering that floats up and fades; reduce motion keeps it still and only fades it. */
  private popup(x: number, y: number, text: string, color: string, size = 13) {
    const t = this.label(x, y, text, { size, bold: true, color, stroke: true, glow: true }).setOrigin(0.5).setDepth(UI_DEPTH - 1);
    const rise = settings.reduceMotion ? 0 : 34;
    this.tweens.add({ targets: t, y: y - rise, alpha: 0, duration: POPUP_MS, delay: 300, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  private showEvent(e: GameEvent) {
    const l = this.state.lanterns[e.lantern];
    if (!l) return;
    if (e.type === 'closeCall') {
      // A flare of light and sparks round the saved lantern.
      const flare = this.add.image(l.x, l.y, 'glow-pale').setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setDepth(4);
      this.tweens.add({ targets: flare, alpha: 0, duration: 900, onComplete: () => flare.destroy() });
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + 0.3;
        const r0 = 14 + (k % 3) * 6;
        const spark = this.add.image(l.x + Math.cos(a) * r0, l.y - 4 + Math.sin(a) * r0, 'spark').setScale(1 / RES).setDepth(9);
        const r1 = settings.reduceMotion ? r0 : r0 + 18;
        this.tweens.add({
          targets: spark,
          x: l.x + Math.cos(a) * r1,
          y: l.y - 4 + Math.sin(a) * r1,
          alpha: 0,
          duration: 800,
          onComplete: () => spark.destroy(),
        });
      }
      this.popup(l.x, l.y - 40, `+${e.coins}c close call!`, '#ffe2a0');
    } else {
      this.popup(l.x, l.y - 40, e.shielded ? 'Shielded!' : 'Blown out!', e.shielded ? '#dbe8ff' : '#ffb08a');
    }
  }

  /** Coins float up from every lantern still lit at nightfall, and from the order card if it was kept. */
  private payout() {
    const r = this.state.report;
    if (!r) return;
    for (const lantern of this.state.lanterns) if (lantern.lit) this.popup(lantern.x, lantern.y - 34, `+${PAY_PER_LANTERN}`, '#ffc870', 18);
    if (r.orderMet) this.popup(ORDER.x + ORDER.w - 24, ORDER.y + ORDER.h + 14, `+${this.state.order.reward} order kept`, '#ffc870', 15);
  }

  private restart() {
    this.state = newGame(loadBest());
  }
}
