import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { HONEY, WAX } from '../art/palette';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { build, buy, buyBee, harvest, send, sell, tick } from '../game/sim';
import { CELL_CAP, HONEY_PRICE, RIPEN_MS, SLOTS, FLOWERS, beePrice, cellPrice, freshProgress, newHive, progressOf, room, type Bee, type GameState } from '../game/state';
import { UPGRADES, UPGRADE_IDS, nextPrice, type UpgradeId } from '../game/upgrades';
import { Button } from '../ui/Button';
import {
  COMB,
  ENTRANCE,
  FONT,
  HIVE,
  HUD_HEIGHT,
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

const textStyle = (size: number, color = '#fff6dc') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1c1610',
  strokeThickness: 3,
});

/** The shop buttons in order: a bee, then each upgrade. */
type ShopItem = 'bee' | UpgradeId;
const SHOP: ShopItem[] = ['bee', ...UPGRADE_IDS];

export class GameScene extends Phaser.Scene {
  /** The hive being played; read by the playthrough test. */
  state!: GameState;
  private bees = new Map<number, Phaser.GameObjects.Image>();
  private jars: Phaser.GameObjects.Image[] = [];
  private comb!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private prices: Phaser.GameObjects.Text[] = [];
  private sendButton!: Button;
  private sellButton!: Button;
  private shopButtons = new Map<ShopItem, Button>();
  private coinsText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private moreJars!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private clock = 0;
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
    this.prices = [];
    this.state = newHive(loadProgress());

    this.add.image(0, 0, 'background').setOrigin(0);
    for (let i = 0; i < FLOWERS; i++) {
      const f = flowerSpot(i);
      this.add.image(f.x, f.y, `flower-${i}`).setOrigin(7.5 / 15, 5 / 30).setDepth(f.y / 1000);
    }
    this.add.image(HIVE.x, HIVE.y, 'hive').setOrigin(0).setDepth(1);
    this.comb = this.add.graphics().setDepth(2);
    for (let slot = 0; slot < SLOTS; slot++) {
      const c = cellCentre(slot);
      this.prices.push(this.add.text(c.x, c.y, '', { fontFamily: FONT, fontSize: '12px', color: '#f8e6a0' }).setOrigin(0.5).setAlpha(0.75).setDepth(3));
    }
    for (let i = 0; i < SHELF.jars; i++) {
      this.jars.push(this.add.image(SHELF.x + i * SHELF.jarGap, SHELF.y, 'jar').setOrigin(0.5, 1).setVisible(false).setDepth(3));
    }
    this.moreJars = this.add.text(SHELF.x + SHELF.jars * SHELF.jarGap - 16, SHELF.y - 50, '', textStyle(14, '#f5b52e')).setOrigin(1, 0.5).setDepth(4);

    this.sendButton = new Button(this, SEND_BUTTON.x, SEND_BUTTON.y, SEND_BUTTON.w, SEND_BUTTON.h, '', () => this.act(send(this.state)));
    this.sellButton = new Button(this, SELL_BUTTON.x, SELL_BUTTON.y, SELL_BUTTON.w, SELL_BUTTON.h, '', () => this.act(sell(this.state)));
    SHOP.forEach((item, i) => {
      const b = SHOP_BUTTONS;
      const onClick = () => this.act(item === 'bee' ? buyBee(this.state) : buy(this.state, item));
      this.shopButtons.set(item, new Button(this, b.xs[i % 2], b.ys[Math.floor(i / 2)], b.w, b.h, '', onClick));
    });
    this.createHud();
    this.createReset();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapComb(p));
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    tick(this.state, dt);
    // Nectar coming home and cells capping change the comb; keep it.
    if (this.state.events.some((e) => e.kind === 'nectar' || e.kind === 'capped')) this.save();

    this.drawComb();
    this.drawBees();
    this.drawJars();
    this.drawEvents();
    this.drawHud();
    this.drawButtons();
  }

  private act(done: boolean) {
    if (done) this.save();
  }

  private save() {
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
    const pulse = settings.reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(this.clock / 150);
    s.cells.forEach((cell, slot) => {
      const label = this.prices[slot];
      if (!cell) {
        // An empty spot: a faint outline, and the price of building there.
        g.lineStyle(2, WAX.light, 0.35).strokePoints(hexPoints(slot, 3), true);
        label.setText(price === 0 ? 'free' : `${price}c`);
        // setColor always redraws the text, so only set it when it changes.
        const colour = s.coins >= price ? '#f8e6a0' : '#a08860';
        if (label.style.color !== colour) label.setColor(colour);
        return;
      }
      label.setText('');
      g.fillStyle(WAX.mid).fillPoints(hexPoints(slot, 1), true);
      g.fillStyle(0x3a2608).fillPoints(hexPoints(slot, 6), true);
      if (cell.phase === 'filling') {
        if (cell.nectar > 0) g.fillStyle(HONEY.light, 0.85).fillPoints(hexPoints(slot, 6 + (COMB.r - 6) * (1 - cell.nectar / CELL_CAP)), true);
      } else if (cell.phase === 'ripening') {
        // Full of nectar, turning amber as it ripens.
        g.fillStyle(HONEY.mid).fillPoints(hexPoints(slot, 6), true);
        const done = 1 - cell.ripenMs / RIPEN_MS;
        const c = cellCentre(slot);
        g.lineStyle(4, HONEY.shine, 0.9).beginPath().arc(c.x, c.y, 14, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2).strokePath();
      } else {
        // Capped with fresh wax: ready to harvest.
        g.fillStyle(WAX.shine).fillPoints(hexPoints(slot, 6), true);
        g.fillStyle(0xffffff, 0.5).fillPoints(hexPoints(slot, 20), true);
        g.lineStyle(3, 0xfff6dc, pulse).strokePoints(hexPoints(slot, 2), true);
      }
      g.lineStyle(2, WAX.dark).strokePoints(hexPoints(slot, 1), true);
    });
  }

  /** Where a bee is: resting on the landing board, or along its trip to its flower and back. */
  private beeSpot(bee: Bee, index: number) {
    if (bee.tripMs === 0) return { ...homeSpot(index), left: false };
    const t = 1 - bee.tripMs / bee.trip;
    const f = flowerSpot(bee.flower);
    const flower = { x: f.x, y: f.y - 18 };
    const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
    const bob = settings.reduceMotion ? 0 : Math.sin(this.clock / 90 + bee.id) * 3;
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
    const flap = settings.reduceMotion ? 0 : Math.floor(this.clock / 60) % 2;
    this.state.bees.forEach((bee, i) => {
      let sprite = this.bees.get(bee.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'bee-0').setDepth(50);
        this.bees.set(bee.id, sprite);
      }
      const p = this.beeSpot(bee, i);
      sprite.setPosition(p.x, p.y).setFlipX(p.left).setTexture(bee.tripMs === 0 ? 'bee-0' : `bee-${flap}`);
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
          const flash = this.add.circle(c.x, c.y, COMB.r, 0xfff6dc, 0.7).setDepth(4);
          this.tweens.add({ targets: flash, scale: 1.4, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
        if (e.kind === 'capped') this.float(c.x, c.y - 10, 'Honey!', '#ffe08a', 14);
      } else if (e.kind === 'harvested') {
        const c = cellCentre(e.slot);
        this.float(c.x, c.y, '+1 jar', '#f5b52e');
      } else if (e.kind === 'spilled') {
        this.float(ENTRANCE.x, ENTRANCE.y - 30, 'Comb full: nectar lost', '#f0b48a', 14);
      } else if (e.kind === 'sold') {
        this.float(SELL_BUTTON.x, SELL_BUTTON.y - 30, `+${e.coins} coins`, '#f3c64e');
      } else if (e.kind === 'bee') {
        this.float(ENTRANCE.x, ENTRANCE.y - 30, 'A new bee!', '#fff6dc', 14);
      }
    }
  }

  private float(x: number, y: number, message: string, color: string, size = 18) {
    const text = this.add.text(x, y, message, textStyle(size, color)).setOrigin(0.5).setDepth(UI_DEPTH + 2);
    this.tweens.add({ targets: text, y: y - 40, alpha: 0, duration: 1200, onComplete: () => text.destroy() });
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
    this.sendButton.set(sendCaption, s.ranks.dance === 0 && home > 0 && room(s) > 0, 16);
    this.sellButton.set(s.jars === 0 ? 'No honey yet' : `Sell ${s.jars} jar${s.jars === 1 ? '' : 's'}\n+${s.jars * HONEY_PRICE} coins`, s.jars > 0, 16);
    for (const item of SHOP) {
      const button = this.shopButtons.get(item)!;
      if (item === 'bee') {
        const price = beePrice(s);
        button.set(price === null ? 'Hive is full\nof bees' : `Bee: ${price}c\none more forager`, price !== null && s.coins >= price, 14);
        continue;
      }
      const u = UPGRADES[item];
      const rank = s.ranks[item];
      const price = nextPrice(item, rank);
      const name = u.prices.length > 1 ? `${u.name} ${rank + 1}` : u.name;
      const caption = price === null ? `${u.name} (max)\n${u.blurb}` : `${name}: ${price}c\n${u.blurb}`;
      button.set(caption, price !== null && s.coins >= price, 14);
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    this.add.text(16, 10, 'Beehive Baron', textStyle(18, '#f3c64e')).setDepth(UI_DEPTH + 1);
    this.coinsText = this.add.text(230, 11, '', textStyle(16, '#f3c64e')).setDepth(UI_DEPTH + 1);
    this.statsText = this.add.text(VIEW.w - 16, 12, '', textStyle(14)).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
    this.hint = this.add.text(ENTRANCE.x, 400, '', textStyle(13, '#fff6dc')).setOrigin(0.5).setDepth(UI_DEPTH + 1);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x2c2010, 0.95).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x7a4f2c).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.coinsText.setText(`Coins ${s.coins}   Honey ${s.jars}`);
    const out = s.bees.filter((b) => b.tripMs > 0).length;
    this.statsText.setText(`Bees ${s.bees.length} (${out} out)   Jars sold ${s.sold}`);
    this.hint.setText(this.hintText());
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
      .text(VIEW.w - 16, VIEW.h - 6, 'New hive', { fontFamily: FONT, fontSize: '12px', color: '#2c2010' })
      .setOrigin(1, 1)
      .setDepth(UI_DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      clearProgress();
      for (const sprite of this.bees.values()) sprite.destroy();
      this.bees.clear();
      this.state = newHive(freshProgress());
    });
  }
}
