import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { BEE_TEX } from '../art/bees';
import { LIVE } from '../art/palette';
import { CARD_PAD, FLOWER_TEX, JAR_TEX, meadowOrigin } from '../art/scenery';
import { MEADOWS } from '../game/meadows';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { build, buy, buyBee, gatherAway, harvest, send, sell, tick } from '../game/sim';
import {
  AWAY_CAP,
  FLOWERS,
  SLOTS,
  beePrice,
  cellPrice,
  combBonus,
  freshProgress,
  jarPrice,
  neighbours,
  newHive,
  progressOf,
  ripenTime,
  room,
  sharedEdges,
  type Bee,
  type GameState,
} from '../game/state';
import { UPGRADES, UPGRADE_IDS, nextPrice, type UpgradeId } from '../game/upgrades';
import { Button } from '../ui/Button';
import {
  AWAY,
  COMB,
  ENTRANCE,
  FONT,
  GOAL,
  HINT,
  HIVE,
  MEADOW_SPOTS,
  MEADOW_TAG,
  PLAQUE,
  SELL_BUTTON,
  SEND_BUTTON,
  SHELF,
  SHOP_BUTTONS,
  UI_DEPTH,
  VIEW,
  cellAt,
  cellCentre,
  flowerSpot,
  hexPoints,
  homeSpot,
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

/** The shop buttons in order: a bee, then each upgrade. */
type ShopItem = 'bee' | UpgradeId;
const SHOP: ShopItem[] = ['bee', ...UPGRADE_IDS];

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
  private jars: Phaser.GameObjects.Image[] = [];
  private cells: Phaser.GameObjects.Image[] = [];
  private prices: Phaser.GameObjects.Text[] = [];
  private comb!: Phaser.GameObjects.Graphics;
  private trails!: Phaser.GameObjects.Graphics;
  private plaque!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Container;
  private previewText!: Phaser.GameObjects.Text;
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

  /** Where the controls are on screen, so the playthrough test can tap like a player. */
  spots() {
    return {
      send: { x: SEND_BUTTON.x, y: SEND_BUTTON.y },
      sell: { x: SELL_BUTTON.x, y: SELL_BUTTON.y },
      cells: [...Array(SLOTS).keys()].map(cellCentre),
      shop: SHOP.map((_, i) => ({ x: SHOP_BUTTONS.xs[i % 2], y: SHOP_BUTTONS.ys[Math.floor(i / 2)] })),
    };
  }

  create() {
    this.bees.clear();
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
      const tex = this.textures.get(`flower-${i}`).getSourceImage();
      this.add.image(f.x, f.y, `flower-${i}`).setOrigin(0.5, FLOWER_TEX.head / tex.height).setDepth(0.1 + f.y / 10_000);
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
        this.add.text(0, -7, 'Build here', textStyle(9.5, '#cdeeb0', '600')).setOrigin(0.5),
        this.previewText,
      ])
      .setDepth(4)
      .setVisible(false);

    for (let i = 0; i < SHELF.jars; i++) {
      this.jars.push(this.add.image(SHELF.x + i * SHELF.jarGap, SHELF.y, 'jar').setOrigin(16 / JAR_TEX.w, JAR_TEX.footY / JAR_TEX.h).setVisible(false).setDepth(3));
    }
    this.moreJars = this.add.text(SHELF.x + SHELF.jars * SHELF.jarGap - 16, SHELF.y - 30, '', textStyle(14, '#ffd25a', '900', true)).setOrigin(1, 0.5).setDepth(4);
    this.trails = this.add.graphics().setDepth(49);

    this.sendButton = new Button(this, SEND_BUTTON.x, SEND_BUTTON.y, SEND_BUTTON.w, SEND_BUTTON.h, () => this.act(send(this.state)));
    this.sellButton = new Button(this, SELL_BUTTON.x, SELL_BUTTON.y, SELL_BUTTON.w, SELL_BUTTON.h, () => this.act(sell(this.state)));
    SHOP.forEach((item, i) => {
      const b = SHOP_BUTTONS;
      const onClick = () => this.act(item === 'bee' ? buyBee(this.state) : buy(this.state, item));
      this.shopButtons.set(item, new Button(this, b.xs[i % 2], b.ys[Math.floor(i / 2)], b.w, b.h, onClick));
    });
    this.createGoal();
    this.createAway();
    this.createHud();
    this.createReset();

    // Nectar the bees gathered while the page was closed, capped; save at once so a reload does not count it twice.
    const gained = progress.seen > 0 ? gatherAway(this.state, Date.now() - progress.seen) : 0;
    this.showAway(gained);
    this.save();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapComb(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = cellAt(p.x, p.y)));
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
    if (this.state.events.some((e) => e.kind === 'nectar' || e.kind === 'capped') || this.clock - this.lastSave >= SAVE_EVERY_MS) this.save();
    if (this.awayLeft > 0) {
      this.awayLeft = Math.max(0, this.awayLeft - dt);
      this.away.setAlpha(Math.min(1, this.awayLeft / 600));
      if (this.awayLeft === 0) this.away.setVisible(false);
    }

    this.drawComb();
    this.drawBees();
    this.drawJars();
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

  /** A tap on the comb builds a cell on an empty spot or harvests a capped one. */
  private tapComb(p: Phaser.Input.Pointer) {
    const slot = cellAt(p.x, p.y);
    if (slot === null) return;
    const cell = this.state.cells[slot];
    this.act(cell === null ? build(this.state, slot) : harvest(this.state, slot));
  }

  private drawComb() {
    const s = this.state;
    const g = this.comb;
    g.clear();
    const price = cellPrice(s);
    const pulse = settings.reduceMotion ? 0.8 : 0.55 + 0.4 * Math.sin(this.clock / 150);
    const preview = this.hover !== null && s.cells[this.hover] === null ? this.hover : null;
    s.cells.forEach((cell, slot) => {
      const image = this.cells[slot];
      const label = this.prices[slot];
      if (!cell) {
        const lit = slot === preview;
        image.setTexture(lit ? 'cell-preview' : 'cell-empty');
        label.setText(price === 0 ? 'free' : `${price}c`);
        // setColor and setFontSize always redraw the text, so only set them when they change.
        const colour = lit ? '#1f4a18' : s.coins >= price ? '#f6d6a0' : '#b08a62';
        if (label.style.color !== colour) label.setColor(colour);
        const size = lit ? '13px' : '10.5px';
        if (label.style.fontSize !== size) label.setFontSize(size).setFontStyle(lit ? '900' : '700');
        label.setAlpha(lit ? 1 : 0.8);
        return;
      }
      label.setText('');
      if (cell.phase === 'filling') image.setTexture(`cell-fill-${cell.nectar}`);
      else if (cell.phase === 'ripening') {
        image.setTexture('cell-ripe');
        // A cream arc goes round as the nectar ripens into honey.
        const done = 1 - cell.ripenMs / ripenTime(s);
        const c = cellCentre(slot);
        g.lineStyle(3.5, LIVE.ripenArc, 0.95).beginPath().arc(c.x, c.y, 12, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2).strokePath();
      } else {
        image.setTexture('cell-capped');
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
    const f = flowerSpot(bee.flower);
    const flower = { x: f.x, y: f.y - 16 };
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

  private drawJars() {
    const jars = this.state.jars;
    this.jars.forEach((jar, i) => jar.setVisible(i < jars));
    this.moreJars.setText(jars > SHELF.jars ? `+${jars - SHELF.jars}` : '');
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
      } else if (e.kind === 'harvested') {
        const c = cellCentre(e.slot);
        this.float(c.x, c.y, '+1 jar', '#ffd25a');
      } else if (e.kind === 'spilled') {
        this.float(ENTRANCE.x, ENTRANCE.y - 30, 'Comb full: nectar lost', '#ffd0b0', 14);
      } else if (e.kind === 'sold') {
        this.float(SELL_BUTTON.x, SELL_BUTTON.y - 34, `+${e.coins} coins`, '#ffd25a');
      } else if (e.kind === 'bee') {
        this.float(ENTRANCE.x, ENTRANCE.y - 30, 'A new bee!', '#fff6dc', 14);
      } else if (e.kind === 'unlocked') {
        const m = MEADOWS[e.meadow];
        const tag = MEADOW_SPOTS[e.meadow].tag;
        this.float(Math.min(tag.x, VIEW.w - 130), tag.y + 40, `${m.name} unlocked!\n${m.blurb}`, '#ffffff', 16, 2600);
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
    const sendCaption = s.ranks.dance > 0
      ? 'Bees forage\non their own'
      : !built
        ? 'Build a cell first'
        : room(s) === 0
          ? 'Comb is full'
          : home === 0
            ? 'Foragers out...'
            : `Send ${home} forager${home === 1 ? '' : 's'}`;
    const canSend = s.ranks.dance === 0 && home > 0 && room(s) > 0;
    this.sendButton.set(sendCaption, canSend, true);
    this.sellButton.set(s.jars === 0 ? 'No honey yet' : `Sell ${s.jars} jar${s.jars === 1 ? '' : 's'}\n+${s.jars * jarPrice(s)} coins`, s.jars > 0, true);
    for (const item of SHOP) {
      const button = this.shopButtons.get(item)!;
      if (item === 'bee') {
        const price = beePrice(s);
        button.set(price === null ? 'Hive is full\nof bees' : `Bee: ${price}c\none more forager`, price !== null && s.coins >= price);
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
      honeyIcon: this.add.image(0, 19, 'honey-icon').setDepth(d),
      honey: this.add.text(0, 18, '', textStyle(16, '#fff1cc', '800')).setOrigin(0, 0.5).setDepth(d),
      honeyLabel: this.add.text(0, 19, 'Honey', textStyle(11, '#d9b880', '600')).setOrigin(0, 0.5).setDepth(d),
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
    h.honey.setText(`${s.jars}`).setX(honeyX + 12);
    h.honeyLabel.setX(h.honey.x + h.honey.width + 3);
    const out = s.bees.filter((b) => b.tripMs > 0).length;
    h.stats.setText(`Bees ${s.bees.length} (${out} out)      Jars sold ${s.sold}`);
    this.hint.setText(this.awayLeft > 0 ? '' : this.hintText());
  }

  /** What to do next, while the player is still learning the loop. */
  private hintText() {
    const s = this.state;
    if (s.sold > 0) return '';
    if (s.jars > 0) return 'Sell the honey for coins.';
    if (s.cells.some((c) => c?.phase === 'capped')) return 'Tap a capped cell to harvest its honey.';
    if (s.cells.some((c) => c?.phase === 'ripening')) return 'A full cell ripens into honey...';
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
      for (const sprite of this.bees.values()) sprite.destroy();
      this.bees.clear();
      this.state = newHive(freshProgress());
      this.showAway(0);
    });
  }
}
