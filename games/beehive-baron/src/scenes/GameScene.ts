import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { BEE_TEX, WASP_TEX } from '../art/bees';
import { LIVE } from '../art/palette';
import { CARD_PAD, FLOWER_TEX, JAR_TEX, meadowOrigin } from '../art/scenery';
import { HONEY, KINDS, type Kind } from '../game/honey';
import { MEADOWS } from '../game/meadows';
import { ORDERS_FROM } from '../game/orders';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { build, buildBrood, buy, canPay, forage, gatherAway, harvest, send, sell, swat, tick } from '../game/sim';
import {
  AWAY_CAP,
  BROOD_MS,
  FLOWERS,
  MAX_BEES,
  SLOTS,
  broodPrice,
  cellPrice,
  combBonus,
  demand,
  freshProgress,
  isOpen,
  jarCount,
  jarPrice,
  marketLeft,
  neighbours,
  newHive,
  openKinds,
  progressOf,
  ripenTime,
  room,
  sharedEdges,
  shelfValue,
  withWax,
  type Bee,
  type GameState,
} from '../game/state';
import { UPGRADES, nextPrice, type UpgradeId } from '../game/upgrades';
import { WASP_IN_MS, WASP_OUT_MS, WASP_STEAL_MS, type Wasp } from '../game/wasps';
import { Button } from '../ui/Button';
import {
  AWAY,
  COMB,
  ENTRANCE,
  FONT,
  GOAL,
  HINT,
  HIVE,
  MARKET,
  MEADOW_SPOTS,
  MEADOW_TAG,
  ORDER,
  PLAQUE,
  SELL_BUTTON,
  SEND_BUTTON,
  SHELF,
  SHOP_BUTTONS,
  UI_DEPTH,
  VIEW,
  WASP_FROM,
  WASP_TO,
  cellAt,
  cellCentre,
  forageSpot,
  flowerSpot,
  hexPoints,
  homeSpot,
  marketEntry,
  shopSpot,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the hive forward. */
const MAX_STEP_MS = 250;
/** The share of a trip spent flying out, and the share spent at the flower after it. */
const OUT = 0.4;
const AT_FLOWER = 0.2;
/** How often the hive is saved anyway, so its last-seen time stays fresh for the nectar gathered while away. */
const SAVE_EVERY_MS = 5000;
/** How long the "While you were away" chip stays up, in game time, before it fades. */
const AWAY_SHOW_MS = 12_000;

/** Bold system-font text; `stroke` gives it a dark cut-out edge for floating over the scenery. */
const textStyle = (size: number, color: string, weight = '800', stroke = false): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: weight,
  color,
  ...(stroke ? { stroke: '#3a2410', strokeThickness: 3 } : {}),
});

/** How close a tap must be to a wasp to swat it. */
const SWAT_RADIUS = 30;

/** The shop buttons in order: a brood cell, then each upgrade; the village order card takes the last spot. */
type ShopItem = 'brood' | UpgradeId;
const SHOP: ShopItem[] = ['brood', 'guards', 'baskets', 'clover', 'dance'];

/** "1:05" for a time in milliseconds. */
const clockText = (ms: number) => {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/** The ends of the edge two neighbouring spots share. */
function sharedEdge(a: number, b: number) {
  const [A, B] = [cellCentre(a), cellCentre(b)];
  const [mx, my] = [(A.x + B.x) / 2, (A.y + B.y) / 2];
  const l = Math.hypot(B.x - A.x, B.y - A.y);
  const [px, py] = [-(B.y - A.y) / l, (B.x - A.x) / l];
  const h = COMB.r / 2;
  return [mx + px * h, my + py * h, mx - px * h, my - py * h] as const;
}

export class GameScene extends Phaser.Scene {
  /** The hive being played; read by the playthrough test. */
  state!: GameState;
  private bees = new Map<number, Phaser.GameObjects.Image>();
  private wasps = new Map<number, Phaser.GameObjects.Image>();
  /** Where each wasp was drawn this frame, for taps to swat it. */
  private waspAt = new Map<number, { x: number; y: number }>();
  /** Whether the next tap on an empty spot places a brood cell (the Brood cell button arms it). */
  private placing = false;
  private market!: {
    root: Phaser.GameObjects.Container;
    marks: Phaser.GameObjects.Graphics;
    next: Phaser.GameObjects.Text;
    entries: { icon: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; price: Phaser.GameObjects.Text; lock: Phaser.GameObjects.Image; bee: Phaser.GameObjects.Image }[];
  };
  private order!: {
    icon: Phaser.GameObjects.Image;
    title: Phaser.GameObjects.Text;
    detail: Phaser.GameObjects.Text;
    card: Phaser.GameObjects.Image;
  };
  private jars: Phaser.GameObjects.Image[] = [];
  private cells: Phaser.GameObjects.Image[] = [];
  private prices: Phaser.GameObjects.Text[] = [];
  private comb!: Phaser.GameObjects.Graphics;
  private trails!: Phaser.GameObjects.Graphics;
  private plaque!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Container;
  private previewText!: Phaser.GameObjects.Text;
  private previewLabel!: Phaser.GameObjects.Text;
  /** The empty spot the pointer is over, which shows the build preview. */
  private hover: number | null = null;
  private meadowStrips: Phaser.GameObjects.Image[] = [];
  private meadowBlooms: Phaser.GameObjects.Image[] = [];
  private meadowTag!: Phaser.GameObjects.Container;
  private meadowTagText!: Phaser.GameObjects.Text;
  private goal!: {
    icon: Phaser.GameObjects.Image;
    title: Phaser.GameObjects.Text;
    unlocks: Phaser.GameObjects.Text;
    count: Phaser.GameObjects.Text;
    blurb: Phaser.GameObjects.Text;
    lock: Phaser.GameObjects.Image;
    bar: Phaser.GameObjects.Graphics;
  };
  private away!: Phaser.GameObjects.Container;
  /** Game time left before the away chip fades; 0 once it is gone. */
  private awayLeft = 0;
  private sendButton!: Button;
  private sellButton!: Button;
  private shopButtons = new Map<ShopItem, Button>();
  private hud!: {
    coins: Phaser.GameObjects.Text;
    coinsLabel: Phaser.GameObjects.Text;
    honeyIcon: Phaser.GameObjects.Image;
    honey: Phaser.GameObjects.Text;
    honeyLabel: Phaser.GameObjects.Text;
    waxIcon: Phaser.GameObjects.Image;
    wax: Phaser.GameObjects.Text;
    waxLabel: Phaser.GameObjects.Text;
    stats: Phaser.GameObjects.Text;
  };
  private moreJars!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private clock = 0;
  private lastSave = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  /**
   * Where the controls are on screen, so the playthrough test can tap like a player: the Send and
   * Sell buttons, each comb cell, each shop button (in `SHOP` order), each market entry (by kind)
   * and each wasp now in the air (by id).
   */
  spots() {
    return {
      send: { x: SEND_BUTTON.x, y: SEND_BUTTON.y },
      sell: { x: SELL_BUTTON.x, y: SELL_BUTTON.y },
      cells: [...Array(SLOTS).keys()].map(cellCentre),
      shop: Object.fromEntries(SHOP.map((item, i) => [item, shopSpot(i)])),
      market: Object.fromEntries(KINDS.map((k, i) => {
        const e = marketEntry(i);
        return [k, { x: e.x + e.w / 2, y: e.y + e.h / 2 }];
      })),
      wasps: Object.fromEntries(this.waspAt),
    };
  }

  create() {
    this.bees.clear();
    this.wasps.clear();
    this.waspAt.clear();
    this.placing = false;
    this.jars = [];
    this.cells = [];
    this.prices = [];
    this.meadowStrips = [];
    this.meadowBlooms = [];
    this.shopButtons.clear();
    const progress = loadProgress();
    this.state = newHive(progress);

    this.add.image(0, 0, 'bg-back').setOrigin(0);
    MEADOWS.forEach((_, i) => {
      const o = meadowOrigin(i);
      this.meadowStrips.push(this.add.image(o.x, o.y, `meadow-${i}`).setOrigin(0).setDepth(0.01));
      this.meadowBlooms.push(this.add.image(o.x, o.y, `meadow-${i}-blooms`).setOrigin(0).setDepth(0.02));
    });
    this.add.image(0, 0, 'bg-front').setOrigin(0).setDepth(0.05);
    for (let i = 0; i < FLOWERS; i++) {
      const f = flowerSpot(i);
      const tex = this.textures.getFrame(`flower-${i}`);
      this.add.image(f.x, f.y, `flower-${i}`).setOrigin(0.5, FLOWER_TEX.head / tex.realHeight).setDepth(0.1 + f.y / 10_000);
    }
    this.add.image(HIVE.x, HIVE.y, 'hive').setOrigin(0).setDepth(1);
    this.plaque = this.add.text(PLAQUE.x, PLAQUE.y, '', textStyle(11, '#7a4410')).setOrigin(0.5).setDepth(1.5);
    for (let slot = 0; slot < SLOTS; slot++) {
      const c = cellCentre(slot);
      this.cells.push(this.add.image(c.x, c.y, 'cell-empty').setDepth(2));
      this.prices.push(this.add.text(c.x, c.y, '', textStyle(10.5, '#f6d6a0', '700')).setOrigin(0.5).setDepth(3));
    }
    this.comb = this.add.graphics().setDepth(2.5);
    this.previewText = this.add.text(0, 6, '', textStyle(12.5, '#ffffff', '900')).setOrigin(0.5);
    this.preview = this.add
      .container(0, 0, [
        this.add.image(0, 0, 'tag-build'),
        (this.previewLabel = this.add.text(0, -7, 'Build here', textStyle(9.5, '#cdeeb0', '600')).setOrigin(0.5)),
        this.previewText,
      ])
      .setDepth(4)
      .setVisible(false);

    for (let i = 0; i < SHELF.jars; i++) {
      this.jars.push(this.add.image(SHELF.x + i * SHELF.jarGap, SHELF.y, 'jar-clover').setOrigin(16 / JAR_TEX.w, JAR_TEX.footY / JAR_TEX.h).setVisible(false).setDepth(3));
    }
    this.moreJars = this.add.text(SHELF.x + SHELF.jars * SHELF.jarGap - 16, SHELF.y - 30, '', textStyle(14, '#ffd25a', '900', true)).setOrigin(1, 0.5).setDepth(4);
    this.trails = this.add.graphics().setDepth(49);

    this.sendButton = new Button(this, SEND_BUTTON.x, SEND_BUTTON.y, SEND_BUTTON.w, SEND_BUTTON.h, () => this.act(send(this.state)));
    this.sellButton = new Button(this, SELL_BUTTON.x, SELL_BUTTON.y, SELL_BUTTON.w, SELL_BUTTON.h, () => this.act(sell(this.state)));
    SHOP.forEach((item, i) => {
      const at = shopSpot(i);
      const onClick = () => (item === 'brood' ? (this.placing = !this.placing) : this.act(buy(this.state, item)));
      this.shopButtons.set(item, new Button(this, at.x, at.y, SHOP_BUTTONS.w, SHOP_BUTTONS.h, onClick));
    });
    this.createOrder();
    this.createMarket();
    this.createGoal();
    this.createAway();
    this.createHud();
    this.createReset();

    // Nectar the bees gathered while the page was closed, capped; save at once so a reload does not count it twice.
    const gained = progress.seen > 0 ? gatherAway(this.state, Date.now() - progress.seen) : 0;
    this.showAway(gained);
    this.save();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapComb(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = cellAt(p.worldX, p.worldY)));
    this.input.on('gameout', () => (this.hover = null));
    const keep = () => this.save();
    const onHide = () => document.visibilityState === 'hidden' && keep();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', keep);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', keep);
    });
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    tick(this.state, dt);
    // Nectar coming home and cells capping change the comb; keep it. Save now and then anyway,
    // so the last-seen time stays fresh.
    const changed = (e: GameState['events'][number]) => ['nectar', 'capped', 'hatched', 'stolen'].includes(e.kind);
    if (this.state.events.some(changed) || this.clock - this.lastSave >= SAVE_EVERY_MS) this.save();
    if (this.awayLeft > 0) {
      this.awayLeft = Math.max(0, this.awayLeft - dt);
      this.away.setAlpha(Math.min(1, this.awayLeft / 600));
      if (this.awayLeft === 0) this.away.setVisible(false);
    }

    this.drawComb();
    this.drawBees();
    this.drawWasps();
    this.drawJars();
    this.drawMarket();
    this.drawOrder();
    this.drawEvents();
    this.drawGoal();
    this.drawHud();
    this.drawButtons();
  }

  private act(done: boolean) {
    if (done) this.save();
  }

  private save() {
    this.lastSave = this.clock;
    saveProgress(progressOf(this.state));
  }

  /**
   * A tap on a wasp swats it; a tap on the comb builds a cell on an empty spot (a brood cell while
   * the Brood cell button is armed) or harvests a capped one.
   */
  private tapComb(p: Phaser.Input.Pointer) {
    for (const [id, at] of this.waspAt) {
      if (Math.hypot(p.worldX - at.x, p.worldY - at.y) <= SWAT_RADIUS && swat(this.state, id)) return;
    }
    const slot = cellAt(p.worldX, p.worldY);
    if (slot === null) return;
    const cell = this.state.cells[slot];
    if (cell !== null) return this.act(harvest(this.state, slot));
    if (!this.placing) return this.act(build(this.state, slot));
    this.placing = false;
    this.act(buildBrood(this.state, slot));
  }

  private drawComb() {
    const s = this.state;
    const g = this.comb;
    g.clear();
    const price = this.placing ? broodPrice(s) : cellPrice(s);
    const pay = withWax(s, price);
    const pulse = settings.reduceMotion ? 0.8 : 0.55 + 0.4 * Math.sin(this.clock / 150);
    const preview = this.hover !== null && s.cells[this.hover] === null ? this.hover : null;
    s.cells.forEach((cell, slot) => {
      const image = this.cells[slot];
      const label = this.prices[slot];
      if (!cell) {
        const lit = slot === preview;
        image.setTexture(lit ? 'cell-preview' : 'cell-empty');
        label.setText(pay.coins === 0 && pay.wax === 0 ? 'free' : `${pay.coins}c`);
        // setColor and setFontSize always redraw the text, so only set them when they change.
        const colour = lit ? '#1f4a18' : s.coins >= pay.coins ? (this.placing ? '#cdeeb0' : '#f6d6a0') : '#b08a62';
        if (label.style.color !== colour) label.setColor(colour);
        const size = lit ? '13px' : '10.5px';
        if (label.style.fontSize !== size) label.setFontSize(size).setFontStyle(lit ? '900' : '700');
        label.setAlpha(lit ? 1 : 0.8);
        return;
      }
      label.setText('');
      const c = cellCentre(slot);
      if (cell.type === 'brood') {
        image.setTexture('cell-brood');
        // A green arc goes round as the next bee grows; it waits while the hive is full.
        if (s.bees.length < MAX_BEES) {
          const done = 1 - cell.hatchMs / BROOD_MS;
          g.lineStyle(3.5, LIVE.broodArc, 0.95).beginPath().arc(c.x, c.y, 15, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2).strokePath();
        }
        return;
      }
      const kind = cell.kind ?? 'clover';
      if (cell.phase === 'filling') image.setTexture(`cell-fill-${cell.nectar}-${kind}`);
      else if (cell.phase === 'ripening') {
        image.setTexture(`cell-ripe-${kind}`);
        // A cream arc goes round as the nectar ripens into honey.
        const done = 1 - cell.ripenMs / ripenTime(s);
        g.lineStyle(3.5, LIVE.ripenArc, 0.95).beginPath().arc(c.x, c.y, 12, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2).strokePath();
      } else {
        image.setTexture(`cell-capped-${kind}`);
        g.lineStyle(2, LIVE.cappedRim, pulse).strokePoints(hexPoints(slot, 3), true);
      }
    });

    // Every edge two built cells share glows gold: each one adds a coin to every jar sold.
    for (const [a, b] of sharedEdges(s)) this.glowLine(sharedEdge(a, b), LIVE.edgeGlow, LIVE.edge, LIVE.edgeCore);
    this.plaque.setText(`Comb bonus +${combBonus(s)}c a jar`);

    // The build preview: the edges the new cell would share light up green.
    this.preview.setVisible(preview !== null);
    if (preview !== null) {
      const built = neighbours(preview).filter((n) => s.cells[n] !== null);
      for (const n of built) this.glowLine(sharedEdge(preview, n), LIVE.previewGlow, LIVE.preview, 0xf0ffe0);
      const c = cellCentre(preview);
      this.preview.setPosition(c.x, c.y + COMB.r + 12);
      this.previewText.setText(`+${built.length} touching`);
      const what = this.placing ? 'Brood here' : 'Build here';
      this.previewLabel.setText(pay.wax > 0 ? `${what} · ${pay.wax} wax` : what);
    }

    // A wasp on a cell: an orange bar over it runs out as it steals the honey.
    for (const w of s.wasps) {
      if (w.phase !== 'steal') continue;
      const c = cellCentre(w.slot);
      const [bx, by, bw, bh] = [c.x - 22, c.y - COMB.r - 2, 44, 6];
      g.fillStyle(LIVE.stealTrack, 0.85).fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 3);
      g.fillStyle(LIVE.stealBar, 1).fillRoundedRect(bx, by, Math.max(bh, bw * (1 - w.ms / WASP_STEAL_MS)), bh, 3);
    }
  }

  /** A strip of foil with a soft glow, along one shared edge. */
  private glowLine([x1, y1, x2, y2]: readonly number[], glow: number, foil: number, core: number) {
    const g = this.comb;
    for (const [w, colour, alpha] of [[10, glow, 0.16], [6.5, glow, 0.32], [3.5, foil, 0.95], [1.4, core, 1]] as const) {
      g.lineStyle(w, colour, alpha).lineBetween(x1, y1, x2, y2);
    }
  }

  /** Where a bee is `t` of the way through its trip (0 at the hive, 1 home again). */
  private tripSpot(bee: Bee, t: number, bob: number) {
    const flower = forageSpot(bee.kind, bee.flower);
    const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
    if (t < OUT) {
      const u = ease(t / OUT);
      return { x: ENTRANCE.x + (flower.x - ENTRANCE.x) * u, y: ENTRANCE.y + (flower.y - ENTRANCE.y) * u - 60 * Math.sin(Math.PI * u) + bob, left: false };
    }
    if (t < OUT + AT_FLOWER) {
      const a = settings.reduceMotion ? 0 : this.clock / 140 + bee.id;
      return { x: flower.x + 6 * Math.cos(a), y: flower.y + 3 * Math.sin(a), left: false };
    }
    const u = ease((t - OUT - AT_FLOWER) / (1 - OUT - AT_FLOWER));
    return { x: flower.x + (ENTRANCE.x - flower.x) * u, y: flower.y + (ENTRANCE.y - flower.y) * u - 60 * Math.sin(Math.PI * u) + bob, left: true };
  }

  private drawBees() {
    const here = new Set(this.state.bees.map((b) => b.id));
    for (const [id, sprite] of this.bees) {
      if (here.has(id)) continue;
      sprite.destroy();
      this.bees.delete(id);
    }
    this.trails.clear();
    const flap = settings.reduceMotion ? 0 : Math.floor(this.clock / 60) % 2;
    this.state.bees.forEach((bee, i) => {
      let sprite = this.bees.get(bee.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'bee-0').setOrigin(BEE_TEX.cx / BEE_TEX.w, BEE_TEX.cy / BEE_TEX.h).setDepth(50);
        this.bees.set(bee.id, sprite);
      }
      if (bee.tripMs === 0) {
        const h = homeSpot(i);
        sprite.setPosition(h.x, h.y).setFlipX(false).setTexture('bee-0');
        return;
      }
      const t = 1 - bee.tripMs / bee.trip;
      const bob = settings.reduceMotion ? 0 : Math.sin(this.clock / 90 + bee.id) * 3;
      const p = this.tripSpot(bee, t, bob);
      sprite.setPosition(p.x, p.y).setFlipX(p.left).setTexture(`bee-${flap}`);
      // A dotted trail of paper confetti behind a flying bee.
      const flying = t < OUT || t > OUT + AT_FLOWER;
      for (let k = 1; flying && k <= 6; k++) {
        const tk = t - k * 0.022;
        if (tk <= 0 || (tk > OUT && tk < OUT + AT_FLOWER) || (t > OUT && tk <= OUT + AT_FLOWER)) break;
        const q = this.tripSpot(bee, tk, 0);
        this.trails.fillStyle(LIVE.trail, 0.85 - k * 0.11).fillCircle(q.x + (p.left ? 14 : -14), q.y + 5, 1.6);
      }
    });
  }

  /** The jars on the shelf, kind by kind, coloured by their honey. */
  private drawJars() {
    const kinds = KINDS.flatMap((k) => Array<Kind>(Math.min(SHELF.jars, this.state.jars[k])).fill(k));
    this.jars.forEach((jar, i) => {
      jar.setVisible(i < kinds.length);
      if (i < kinds.length && jar.texture.key !== `jar-${kinds[i]}`) jar.setTexture(`jar-${kinds[i]}`);
    });
    const jars = jarCount(this.state);
    this.moreJars.setText(jars > SHELF.jars ? `+${jars - SHELF.jars}` : '');
  }

  /** Where a wasp is: flying in from the right edge, sitting on its cell, or flying off again. */
  private waspSpot(w: Wasp) {
    const c = cellCentre(w.slot);
    const cell = { x: c.x, y: c.y - 6 };
    const along = (t: number) => {
      const u = 0.5 - 0.5 * Math.cos(Math.PI * t);
      const from = { x: WASP_FROM.x, y: WASP_FROM.y + (w.id % 3) * 30 };
      return { x: from.x + (cell.x - from.x) * u, y: from.y + (cell.y - from.y) * u - 50 * Math.sin(Math.PI * u) };
    };
    const still = settings.reduceMotion;
    if (w.phase === 'in') return { ...along(Math.min(1, w.ms / WASP_IN_MS)), left: true };
    if (w.phase === 'steal') {
      const a = this.clock / 70 + w.id;
      return { x: cell.x + (still ? 0 : 3 * Math.cos(a)), y: cell.y + (still ? 0 : 2 * Math.sin(a * 1.3)), left: true };
    }
    const from = along(w.turned);
    const u = Math.min(1, w.ms / WASP_OUT_MS);
    return { x: from.x + (WASP_TO.x - from.x) * u, y: from.y + (WASP_TO.y - from.y) * u - 40 * Math.sin(Math.PI * u), left: false };
  }

  private drawWasps() {
    const here = new Set(this.state.wasps.map((w) => w.id));
    for (const [id, sprite] of this.wasps) {
      if (here.has(id)) continue;
      sprite.destroy();
      this.wasps.delete(id);
    }
    this.waspAt.clear();
    const flap = settings.reduceMotion ? 0 : Math.floor(this.clock / 45) % 2;
    for (const w of this.state.wasps) {
      let sprite = this.wasps.get(w.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'wasp-0').setOrigin(WASP_TEX.cx / WASP_TEX.w, WASP_TEX.cy / WASP_TEX.h).setScale(1.15).setDepth(51);
        this.wasps.set(w.id, sprite);
      }
      const p = this.waspSpot(w);
      sprite.setPosition(p.x, p.y).setFlipX(p.left).setTexture(`wasp-${flap}`);
      if (w.phase !== 'out') this.waspAt.set(w.id, { x: Math.round(p.x), y: Math.round(p.y) });
    }
  }

  /** Little flourishes for what just happened. */
  private drawEvents() {
    for (const e of this.state.events.splice(0)) {
      if (e.kind === 'built' || e.kind === 'capped') {
        const c = cellCentre(e.slot);
        if (!settings.reduceMotion) {
          const flash = this.add.circle(c.x, c.y, COMB.r, 0xfff6dc, 0.6).setDepth(4);
          this.tweens.add({ targets: flash, scale: 1.3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
        if (e.kind === 'capped') this.float(c.x, c.y - 10, 'Honey!', '#ffe08a', 14);
        if (e.kind === 'built' && e.touching > 0) this.touchingPop(c.x, c.y - COMB.r + 2, e.touching);
        if (e.kind === 'built' && e.wax > 0) this.float(c.x, c.y + 14, `-${e.wax} wax`, '#fff0c0', 13);
      } else if (e.kind === 'harvested') {
        const c = cellCentre(e.slot);
        this.float(c.x, c.y, '+1 jar\n+1 wax', '#ffd25a', 15);
      } else if (e.kind === 'hatched') {
        const c = cellCentre(e.slot);
        this.float(c.x, c.y - 10, 'A new bee!', '#e4ffd0', 14);
      } else if (e.kind === 'demand') {
        if (this.state.sold > 0) this.float(MARKET.x + MARKET.w / 2, MARKET.y - 8, `${HONEY[e.honey].name} honey in demand!`, '#ffffff', 14, 2000);
      } else if (e.kind === 'wasp') {
        this.float(HIVE.x + HIVE.w / 2, HIVE.y + 70, this.state.ranks.guards > 0 ? 'A wasp! The guards are ready' : 'A wasp! Tap it away', '#ffe08a', 15, 2000);
      } else if (e.kind === 'stolen') {
        const c = cellCentre(e.slot);
        this.float(c.x, c.y - 10, 'Honey stolen!', '#ffc890', 14, 1600);
      } else if (e.kind === 'swatted' || e.kind === 'guarded') {
        const w = this.state.wasps.find((w) => w.id === e.id);
        const at = w ? this.waspSpot(w) : { x: HIVE.x + HIVE.w / 2, y: HIVE.y + 70 };
        this.float(at.x, at.y - 18, e.kind === 'swatted' ? 'Swat!' : 'Guards chased it off!', '#ffffff', 14);
      } else if (e.kind === 'order') {
        this.float(ORDER.x, ORDER.y - 24, 'A village order!', '#ffffff', 14, 1600);
      } else if (e.kind === 'order-done') {
        this.float(ORDER.x, ORDER.y - 24, `Order filled: +${e.premium} coins`, '#ffd25a', 15, 2000);
      } else if (e.kind === 'order-failed') {
        this.float(ORDER.x, ORDER.y - 24, 'The order lapsed', '#ffd0b0', 14, 1600);
      } else if (e.kind === 'spilled') {
        this.float(ENTRANCE.x, ENTRANCE.y - 30, 'Comb full: nectar lost', '#ffd0b0', 14);
      } else if (e.kind === 'sold') {
        this.float(SELL_BUTTON.x, SELL_BUTTON.y - 34, `+${e.coins} coins`, '#ffd25a');
      } else if (e.kind === 'unlocked') {
        const m = MEADOWS[e.meadow];
        const tag = MEADOW_SPOTS[e.meadow].tag;
        const kind = KINDS.find((k) => HONEY[k].meadows === e.meadow + 1);
        const more = kind ? `\n${HONEY[kind].name} honey: pick it on the market` : '';
        this.float(Math.min(tag.x, VIEW.w - 150), tag.y + 40, `${m.name} unlocked!\n${m.blurb}${more}`, '#ffffff', 16, 3200);
        if (!settings.reduceMotion) {
          const blooms = this.meadowBlooms[e.meadow];
          blooms.setAlpha(0);
          this.tweens.add({ targets: blooms, alpha: 1, duration: 900 });
        }
      }
    }
  }

  /** The green "+N touching" tag over a cell just built next to others. */
  private touchingPop(x: number, y: number, n: number) {
    const pop = this.add
      .container(x, y, [this.add.image(0, 0, 'tag-touching'), this.add.text(0, 0, `+${n} touching`, textStyle(11, '#ffffff', '800')).setOrigin(0.5)])
      .setDepth(UI_DEPTH + 2);
    this.tweens.add({
      targets: pop,
      y: settings.reduceMotion ? y : y - 18,
      alpha: { from: 1, to: 0 },
      delay: 700,
      duration: 900,
      onComplete: () => pop.destroy(),
    });
  }

  private float(x: number, y: number, message: string, color: string, size = 18, duration = 1200) {
    const text = this.add.text(x, y, message, { ...textStyle(size, color, '900', true), align: 'center' }).setOrigin(0.5).setDepth(UI_DEPTH + 2);
    this.tweens.add({ targets: text, y: settings.reduceMotion ? y : y - 40, alpha: 0, duration, onComplete: () => text.destroy() });
  }

  private drawButtons() {
    const s = this.state;
    const home = s.bees.filter((b) => b.tripMs === 0).length;
    const built = s.cells.some((c) => c !== null);
    // Once a second kind is open, the Send button says which nectar the bees go for.
    const where = openKinds(s).length > 1 ? `\nfor ${HONEY[s.forage].name.toLowerCase()} nectar` : '';
    const sendCaption = s.ranks.dance > 0
      ? where ? `Bees forage alone${where}` : 'Bees forage\non their own'
      : !built
        ? 'Build a cell first'
        : room(s) === 0
          ? where ? `No room for${where.replace('for ', '')}` : 'Comb is full'
          : home === 0
            ? 'Foragers out...'
            : `Send ${home} forager${home === 1 ? '' : 's'}${where}`;
    const canSend = s.ranks.dance === 0 && home > 0 && room(s) > 0;
    this.sendButton.set(sendCaption, canSend, true);
    const jars = jarCount(s);
    this.sellButton.set(jars === 0 ? 'No honey yet' : `Sell ${jars} jar${jars === 1 ? '' : 's'}\n+${shelfValue(s)} coins`, jars > 0, true);
    const free = s.cells.some((c) => c === null);
    if (this.placing && (!free || !canPay(s, broodPrice(s)))) this.placing = false;
    for (const item of SHOP) {
      const button = this.shopButtons.get(item)!;
      if (item === 'brood') {
        const pay = withWax(s, broodPrice(s));
        const caption = this.placing
          ? 'Tap an empty spot\nor here to cancel'
          : !free
            ? 'Brood cell\nno empty spot left'
            : `Brood cell: ${pay.coins}c\n${s.bees.length >= MAX_BEES ? 'hive full of bees' : 'hatches new bees'}`;
        button.set(caption, free && canPay(s, broodPrice(s)), this.placing);
        continue;
      }
      const u = UPGRADES[item];
      const rank = s.ranks[item];
      const price = nextPrice(item, rank);
      const name = u.prices.length > 1 ? `${u.name} ${rank + 1}` : u.name;
      const caption = price === null ? `${u.name} (max)\n${u.blurb}` : `${name}: ${price}c\n${u.blurb}`;
      button.set(caption, price !== null && s.coins >= price);
    }
  }

  /** The market board under the hive: each kind's price now, the one in demand, and where the bees forage (tap to choose). */
  private createMarket() {
    const parts: Phaser.GameObjects.GameObject[] = [this.add.image(-CARD_PAD, -CARD_PAD, 'market-card').setOrigin(0)];
    const marks = this.add.graphics();
    parts.push(marks);
    parts.push(this.add.text(10, 12, 'Market', textStyle(13, '#4a2c10', '900')).setOrigin(0, 0.5));
    const next = this.add.text(10, 27, '', textStyle(10, '#8a6a40', '700')).setOrigin(0, 0.5);
    parts.push(next);
    const entries = KINDS.map((kind, i) => {
      const e = marketEntry(i);
      const x = e.x - MARKET.x;
      const entry = {
        icon: this.add.image(x + 13, 19, `honey-icon-${kind}`),
        name: this.add.text(x + 25, 12, HONEY[kind].name, textStyle(11.5, '#4a2c10', '800')).setOrigin(0, 0.5),
        price: this.add.text(x + 25, 27, '', textStyle(11, '#6a4a28', '800')).setOrigin(0, 0.5),
        lock: this.add.image(x + e.w - 12, 26, 'lock').setScale(0.7),
        bee: this.add.image(x + e.w - 14, 26, 'bee-0').setScale(0.5),
      };
      const zone = this.add.zone(x, 0, e.w, e.h).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.act(forage(this.state, kind)));
      parts.push(entry.icon, entry.name, entry.price, entry.lock, entry.bee, zone);
      return entry;
    });
    const root = this.add.container(MARKET.x, MARKET.y, parts).setDepth(UI_DEPTH - 2).setVisible(false);
    this.market = { root, marks, next, entries };
  }

  private drawMarket() {
    const s = this.state;
    const m = this.market;
    // It takes the hint's place once the first jar is sold.
    m.root.setVisible(s.sold > 0);
    if (s.sold === 0) return;
    const wanted = demand(s);
    m.next.setText(wanted ? `next ${clockText(marketLeft(s))}` : '1 kind open');
    m.marks.clear();
    KINDS.forEach((kind, i) => {
      const e = marketEntry(i);
      const x = e.x - MARKET.x;
      const entry = m.entries[i];
      const open = isOpen(s, kind);
      const picked = s.forage === kind;
      m.marks.lineStyle(1, LIVE.marketLine, 0.8).lineBetween(x - 1, 6, x - 1, MARKET.h - 6);
      if (picked) m.marks.fillStyle(LIVE.marketPick, 0.9).fillRoundedRect(x + 2, 4, e.w - 4, MARKET.h - 8, 7);
      entry.icon.setAlpha(open ? 1 : 0.4);
      entry.name.setAlpha(open ? 1 : 0.5);
      entry.lock.setVisible(!open);
      entry.bee.setVisible(picked);
      const price = open
        ? `${jarPrice(s, kind)}c${wanted === kind ? ' ★' : ''}`
        : `${MEADOWS[HONEY[kind].meadows - 1].need} sold`;
      entry.price.setText(price).setAlpha(open ? 1 : 0.6);
      const colour = wanted === kind ? '#2f7a24' : '#6a4a28';
      if (entry.price.style.color !== colour) entry.price.setColor(colour);
    });
  }

  /** The village order card in the shop's last spot: what the village wants, how many are sold and the time left. */
  private createOrder() {
    this.order = {
      card: this.add.image(ORDER.x, ORDER.y, 'order-card').setDepth(30),
      icon: this.add.image(ORDER.x - ORDER.w / 2 + 18, ORDER.y + 1, 'honey-icon-clover').setDepth(31),
      title: this.add.text(ORDER.x - ORDER.w / 2 + 32, ORDER.y - 7, '', textStyle(13, '#4a2c10', '900')).setOrigin(0, 0.5).setDepth(31),
      detail: this.add.text(ORDER.x - ORDER.w / 2 + 32, ORDER.y + 9, '', textStyle(10.5, '#6a4a28', '700')).setOrigin(0, 0.5).setDepth(31),
    };
  }

  private drawOrder() {
    const s = this.state;
    const o = this.order;
    const order = s.order;
    o.icon.setVisible(order !== null);
    o.card.setAlpha(s.sold < ORDERS_FROM ? 0.75 : 1);
    if (order) {
      o.icon.setTexture(`honey-icon-${order.kind}`);
      o.title.setText(`Order: ${order.count} ${HONEY[order.kind].name}`);
      o.detail.setText(`${order.done}/${order.count} sold · ${clockText(order.leftMs)} left · +${order.premium}c`);
    } else if (s.sold < ORDERS_FROM) {
      o.title.setText('Village orders');
      o.detail.setText(`from ${ORDERS_FROM} jars sold`);
    } else {
      o.title.setText('Village orders');
      o.detail.setText('the next one is coming...');
    }
    o.title.setX(ORDER.x - ORDER.w / 2 + (order ? 32 : 14));
    o.detail.setX(o.title.x);
  }

  /** The goal card (next meadow, its goal and a progress bar) and the tag on the meadow it unlocks. */
  private createGoal() {
    const x = GOAL.x;
    const y = GOAL.y;
    this.add.image(x - CARD_PAD, y - CARD_PAD, 'goal-card').setOrigin(0).setDepth(20);
    this.goal = {
      icon: this.add.image(x + 6, y + 8 - CARD_PAD, 'meadow-icon-0').setOrigin(0).setDepth(21),
      title: this.add.text(x + 38, y + 16, '', textStyle(15, '#4a2c10', '900')).setOrigin(0, 0.5).setDepth(21),
      unlocks: this.add.text(0, y + 17, '', textStyle(12, '#6a4aa8', '700')).setOrigin(0, 0.5).setDepth(21),
      bar: this.add.graphics().setDepth(21),
      count: this.add.text(x + 216, y + 36, '', textStyle(11.5, '#4a2c10', '800')).setOrigin(0, 0.5).setDepth(21),
      blurb: this.add.text(x + 270, y + 36, '', textStyle(10.5, '#6a4aa8', '700')).setOrigin(0, 0.5).setDepth(21),
      lock: this.add.image(x + GOAL.w - 22, y + GOAL.h / 2, 'lock').setDepth(21),
    };
    this.meadowTagText = this.add.text(-MEADOW_TAG.w / 2 + 26, 0, '', textStyle(11.5, '#f1e8ff', '800')).setOrigin(0, 0.5);
    this.meadowTag = this.add
      .container(0, 0, [this.add.image(0, 0, 'meadow-tag'), this.add.image(-MEADOW_TAG.w / 2 + 13, -1, 'lock').setScale(0.8), this.meadowTagText])
      .setDepth(20);
  }

  private drawGoal() {
    const s = this.state;
    const next = MEADOWS[s.meadows];
    const done = !next;
    const g = this.goal;
    g.icon.setTexture(`meadow-icon-${Math.min(s.meadows, MEADOWS.length - 1)}`);
    g.title.setText(done ? 'Every meadow is open' : `Goal: ${next.need} jars sold`);
    g.unlocks.setText(done ? '' : `unlocks ${next.name}`).setX(g.title.x + g.title.width + 10);
    g.count.setText(done ? `${s.sold} sold` : `${Math.min(s.sold, next.need)} / ${next.need}`);
    g.blurb.setText(done ? 'all benefits on' : next.blurb);
    g.lock.setVisible(!done);
    const from = s.meadows === 0 || done ? 0 : MEADOWS[s.meadows - 1].need;
    const share = done ? 1 : Phaser.Math.Clamp((s.sold - from) / (next.need - from), 0, 1);
    const [bx, by, bw, bh] = [GOAL.x + 38, GOAL.y + 31, 170, 10];
    g.bar.clear().fillStyle(LIVE.barTrack).fillRoundedRect(bx, by, bw, bh, 5);
    if (share > 0) g.bar.fillStyle(LIVE.bar).fillRoundedRect(bx, by, Math.max(bh, bw * share), bh, 5);

    MEADOWS.forEach((_, i) => {
      // Open meadows in full colour, the next one faded behind its lock, later ones not shown yet.
      this.meadowStrips[i].setVisible(i <= s.meadows).setAlpha(i < s.meadows ? 1 : 0.7);
      this.meadowBlooms[i].setVisible(i < s.meadows);
    });
    this.meadowTag.setVisible(!done);
    if (!done) {
      const tag = MEADOW_SPOTS[s.meadows].tag;
      this.meadowTag.setPosition(tag.x, tag.y);
      this.meadowTagText.setText(next.name);
    }
  }

  /** The "While you were away" chip under the hive, hidden until there is nectar to report. */
  private createAway() {
    const x = AWAY.x;
    const y = AWAY.y;
    const parts = [
      this.add.image(-CARD_PAD, -CARD_PAD, 'away-chip').setOrigin(0),
      this.add.text(40, 19, 'While you were away:', textStyle(12.5, '#d8e6f4', '600')).setOrigin(0, 0.5),
      this.add.text(0, 19, '', textStyle(15, '#ffd25a', '900')).setOrigin(0, 0.5).setName('gained'),
      this.add.text(305, 11, `cap ${AWAY_CAP}`, textStyle(9.5, '#d8e6f4', '700')).setOrigin(0.5),
      this.add.graphics().setName('bar'),
    ];
    this.away = this.add.container(x, y, parts).setDepth(UI_DEPTH - 1).setVisible(false);
    parts[0].setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.awayLeft = Math.min(this.awayLeft, 600)));
  }

  private showAway(gained: number) {
    this.awayLeft = gained > 0 ? AWAY_SHOW_MS : 0;
    this.away.setVisible(gained > 0).setAlpha(1);
    if (gained <= 0) return;
    const label = this.away.getByName('gained') as Phaser.GameObjects.Text;
    label.setText(`+${gained} nectar`).setX(40 + (this.away.getAt(1) as Phaser.GameObjects.Text).width + 8);
    const bar = this.away.getByName('bar') as Phaser.GameObjects.Graphics;
    const [bx, by, bw, bh] = [270, 20, 70, 8];
    bar.clear().fillStyle(LIVE.awayTrack).fillRoundedRect(bx, by, bw, bh, 4);
    bar.fillStyle(LIVE.bar).fillRoundedRect(bx, by, Math.max(bh, (bw * gained) / AWAY_CAP), bh, 4);
  }

  private createHud() {
    this.add.image(-CARD_PAD, -CARD_PAD, 'hud').setOrigin(0).setDepth(UI_DEPTH);
    const d = UI_DEPTH + 1;
    this.add.text(16, 18, 'Beehive Baron', textStyle(19, '#ffd25a', '900')).setOrigin(0, 0.5).setDepth(d);
    this.add.image(237, 19, 'coin').setDepth(d);
    this.hud = {
      coins: this.add.text(249, 18, '', textStyle(16, '#fff1cc', '800')).setOrigin(0, 0.5).setDepth(d),
      coinsLabel: this.add.text(0, 19, 'Coins', textStyle(11, '#d9b880', '600')).setOrigin(0, 0.5).setDepth(d),
      honeyIcon: this.add.image(0, 19, 'honey-icon-clover').setDepth(d),
      honey: this.add.text(0, 18, '', textStyle(16, '#fff1cc', '800')).setOrigin(0, 0.5).setDepth(d),
      honeyLabel: this.add.text(0, 19, 'Honey', textStyle(11, '#d9b880', '600')).setOrigin(0, 0.5).setDepth(d),
      waxIcon: this.add.image(0, 19, 'wax-icon').setDepth(d),
      wax: this.add.text(0, 18, '', textStyle(16, '#fff1cc', '800')).setOrigin(0, 0.5).setDepth(d),
      waxLabel: this.add.text(0, 19, 'Wax', textStyle(11, '#d9b880', '600')).setOrigin(0, 0.5).setDepth(d),
      stats: this.add.text(VIEW.w - 16, 18, '', textStyle(13.5, '#fff1cc', '700')).setOrigin(1, 0.5).setDepth(d),
    };
    this.hint = this.add.text(HINT.x, HINT.y, '', textStyle(13, '#ffffff', '800', true)).setOrigin(0.5).setDepth(d);
  }

  private drawHud() {
    const s = this.state;
    const h = this.hud;
    h.coins.setText(`${s.coins}`);
    h.coinsLabel.setX(h.coins.x + h.coins.width + 3);
    const honeyX = Math.max(335, h.coinsLabel.x + h.coinsLabel.width + 26);
    h.honeyIcon.setX(honeyX);
    h.honey.setText(`${jarCount(s)}`).setX(honeyX + 12);
    h.honeyLabel.setX(h.honey.x + h.honey.width + 3);
    const waxX = h.honeyLabel.x + h.honeyLabel.width + 26;
    h.waxIcon.setX(waxX);
    h.wax.setText(`${s.wax}`).setX(waxX + 13);
    h.waxLabel.setX(h.wax.x + h.wax.width + 3);
    const out = s.bees.filter((b) => b.tripMs > 0).length;
    h.stats.setText(`Bees ${s.bees.length} (${out} out)      Jars sold ${s.sold}`);
    this.hint.setText(this.awayLeft > 0 ? '' : this.hintText());
  }

  /** What to do next, while the player is still learning the loop. */
  private hintText() {
    const s = this.state;
    if (s.sold > 0) return '';
    if (jarCount(s) > 0) return 'Sell the honey for coins.';
    if (s.cells.some((c) => c?.type === 'honey' && c.phase === 'capped')) return 'Tap a capped cell to harvest its honey.';
    if (s.cells.some((c) => c?.type === 'honey' && c.phase === 'ripening')) return 'A full cell ripens into honey...';
    if (!s.cells.some((c) => c !== null)) return 'Tap a spot in the comb to build a cell.';
    if (s.bees.some((b) => b.tripMs === 0)) return 'Send the foragers out for nectar.';
    return 'The foragers bring nectar home...';
  }

  /** A small button in the corner that throws the comb and coins away for a fresh hive. */
  private createReset() {
    const text = this.add
      .text(VIEW.w - 16, VIEW.h - 6, 'New hive', textStyle(12, '#1f4a18', '700'))
      .setOrigin(1, 1)
      .setDepth(UI_DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      clearProgress();
      for (const sprite of [...this.bees.values(), ...this.wasps.values()]) sprite.destroy();
      this.bees.clear();
      this.wasps.clear();
      this.waspAt.clear();
      this.placing = false;
      this.state = newHive(freshProgress());
      this.showAway(0);
    });
  }
}
