import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { ADVENTURER, adventurerTexture } from '../art/characters';
import { SWORD_SIZE, swordScale, swordTexture } from '../art/swords';
import { EMBLEMS, emblemTexture } from '../art/ui';
import { commissionAt } from '../game/commissions';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { buy, deliver, drop, forge, sell, tick, toggleAutoForge, wanted } from '../game/sim';
import {
  BARREL,
  DESKS,
  GEM_PAY,
  GRID,
  OPEN_COLS,
  SLOTS,
  STREAK_MS,
  fitOf,
  forgeMs,
  freeAnvil,
  freshProgress,
  newShop,
  offerFor,
  progressOf,
  renownBand,
  slotOpen,
  type Adventurer,
  type GameState,
} from '../game/state';
import { GEM, MAX_TIER, swordOf } from '../game/swords';
import { BUTTON_UPGRADES, UPGRADES, locked, nextPrice, type UpgradeId } from '../game/upgrades';
import { Button } from '../ui/Button';
import {
  BANNER,
  BOARD,
  FONT,
  FORGE_BUTTON,
  FURNACE_WINDOW,
  HEAT_BAR,
  ORDER,
  PATIENCE,
  TAG,
  UI_DEPTH,
  WIN_PANEL,
  HINT_SPOT,
  RENOWN_BAR,
  UPGRADE_BUTTONS,
  VIEW,
  deskAt,
  deskBox,
  deskCentre,
  discoveredCentre,
  onBanner,
  slotAt,
  slotCentre,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the shop forward. */
const MAX_STEP_MS = 250;
/** How far up from an anvil's centre a sword lies on it. */
const SWORD_LIFT = 10;
/** Sword textures are painted for 100px anvils; on the board they are scaled to its cells. */
const SWORD_FIT = BOARD.cell / SWORD_SIZE;
/** Where a gem set in a sword shows: its hilt's corner, from the sword's centre. */
const BADGE = { x: -24, y: 22 };
const LEAD = 0x17131c;

const textStyle = (size: number, color = '#fff1d0', stroke = 3): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontStyle: 'bold',
  fontSize: `${size}px`,
  color,
  stroke: '#17131c',
  strokeThickness: stroke,
});

/** Where the player picked a sword up, and the sword following the pointer. */
interface Held {
  slot: number;
  sprite: Phaser.GameObjects.Image;
}

/** What is drawn for one adventurer at the counter, and the tag that shows what they would pay. */
interface Visitor {
  root: Phaser.GameObjects.Container;
  tag: Phaser.GameObjects.Container;
  tagImage: Phaser.GameObjects.Image;
  tagTop: Phaser.GameObjects.Text;
  tagBottom: Phaser.GameObjects.Text;
}

/** The royal commission's banner in the top bar. */
interface Banner {
  root: Phaser.GameObjects.Container;
  title: Phaser.GameObjects.Text;
  sword: Phaser.GameObjects.Image;
  progress: Phaser.GameObjects.Text;
  pips: Phaser.GameObjects.Image[];
  reward: Phaser.GameObjects.Text;
  /** The guild star the commission pays, just left of its coins. */
  star: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  /** The shop being played; read by the playthrough test. */
  state!: GameState;
  private swords: (Phaser.GameObjects.Image | null)[] = [];
  /** The gem drawn in the corner of each gemmed sword, by slot. */
  private badges: Phaser.GameObjects.Image[] = [];
  /** The padlocks over the fifth column's anvils and the barrel until they are bought, with their prices. */
  private locks: { slot: number; image: Phaser.GameObjects.Image; price: Phaser.GameObjects.Text }[] = [];
  /** The glow round the banner while a sword the crown wants is held. */
  private bannerFrame!: Phaser.GameObjects.Image;
  private renownText!: Phaser.GameObjects.Text;
  /** The Royal Smith panel, shown once when the Crown Blade is delivered. */
  private winPanel!: Phaser.GameObjects.Container;
  private winStats!: Phaser.GameObjects.Text;
  private visitors = new Map<number, Visitor>();
  private held: Held | null = null;
  private furnace!: Phaser.GameObjects.Image;
  private forgeButton!: Button;
  private upgradeButtons = new Map<UpgradeId, Button>();
  private emblems = new Map<UpgradeId, Phaser.GameObjects.Image>();
  private marks!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  /** The glowing frames round matching anvils and buying desks while a sword is held. */
  private mergeFrames: Phaser.GameObjects.Image[] = [];
  private buyerFrames: Phaser.GameObjects.Image[] = [];
  private coinsText!: Phaser.GameObjects.Text;
  private soldText!: Phaser.GameObjects.Text;
  private star!: Phaser.GameObjects.Image;
  private starsText!: Phaser.GameObjects.Text;
  private banner!: Banner;
  private hint!: Phaser.GameObjects.Text;
  /** The frame and picture of each sword tier in the discovered row, shown once that tier has been made. */
  private discovered: { frame: Phaser.GameObjects.Image; sword: Phaser.GameObjects.Image }[] = [];
  private clock = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  /** Where the controls are on screen, so the playthrough test can tap and drag like a player. */
  spots() {
    return {
      forge: { x: FORGE_BUTTON.x, y: FORGE_BUTTON.y },
      slots: [...Array(SLOTS).keys()].map((slot) => ({ x: slotCentre(slot).x, y: slotCentre(slot).y - SWORD_LIFT })),
      desks: [...Array(DESKS).keys()].map(deskCentre),
      banner: { x: BANNER.x + BANNER.w / 2, y: BANNER.y + BANNER.h / 2 },
    };
  }

  create() {
    this.swords = new Array(SLOTS).fill(null);
    this.visitors.clear();
    this.held = null;
    this.state = newShop(loadProgress());

    this.add.image(0, 0, 'background').setOrigin(0);
    this.furnace = this.add.image(FURNACE_WINDOW.x, FURNACE_WINDOW.y, 'furnace-0').setOrigin(0);
    const barrel = slotCentre(BARREL);
    this.add.image(barrel.x, barrel.y, 'barrel');
    this.badges = [...Array(SLOTS).keys()].map(() => this.add.image(0, 0, 'gem-badge').setDepth(11).setVisible(false));
    this.createLocks();
    this.marks = this.add.graphics().setDepth(5);
    this.mergeFrames = [...Array(SLOTS).keys()].map((slot) => {
      const c = slotCentre(slot);
      return this.add.image(c.x, c.y, 'frame-gold').setDepth(6).setVisible(false);
    });
    this.buyerFrames = [...Array(DESKS).keys()].map((desk) => {
      const c = deskCentre(desk);
      return this.add.image(c.x, c.y, 'frame-green').setDepth(25).setVisible(false);
    });

    this.forgeButton = new Button(this, FORGE_BUTTON.x, FORGE_BUTTON.y, 'forge', 'Forge', () => this.forge());
    BUTTON_UPGRADES.forEach((id, i) => {
      const b = UPGRADE_BUTTONS;
      const button = new Button(this, b.x, b.ys[i], 'upgrade', '', () => this.buy(id), 13);
      const emblem = this.add.image(-b.w / 2 + 22, 0, emblemTexture(i));
      button.root.add(emblem);
      this.emblems.set(id, emblem);
      this.upgradeButtons.set(id, button);
    });
    this.add
      .text(HINT_SPOT.x, HINT_SPOT.y, 'Merge matching swords, then sell them\nto adventurers. Drag a sword the crown\nwants onto the royal banner.', {
        ...textStyle(13, '#fff4d8', 3.5),
        fontStyle: 'normal',
        align: 'center',
      })
      .setOrigin(0.5);
    this.createDiscovered();
    this.createHud();
    this.createWinPanel();
    this.createReset();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pickUp(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.held?.sprite.setPosition(p.x, p.y));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.putDown(p));
    this.input.on('gameout', () => this.putDown(null));
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    tick(this.state, dt);
    // The Auto Forge forges inside tick; keep its swords like a tapped Forge's.
    if (this.state.events.some((e) => e.kind === 'forged')) this.save();

    this.drawSwords();
    this.drawVisitors();
    this.drawEvents();
    this.drawMarks();
    this.drawHud();
    this.drawForge();
  }

  private forge() {
    if (forge(this.state)) this.save();
  }

  /** Buys an upgrade; a bought Auto Forge's button switches it on and off instead. */
  private buy(id: UpgradeId) {
    const done = id === 'auto' && this.state.ranks.auto > 0 ? toggleAutoForge(this.state) : buy(this.state, id);
    if (done) this.save();
  }

  private save() {
    saveProgress(progressOf(this.state));
  }

  private pickUp(p: Phaser.Input.Pointer) {
    const slot = slotAt(p.x, p.y);
    if (this.held || slot === null || this.winPanel.visible) return;
    if (!slotOpen(this.state, slot)) {
      this.unlock(slot);
      return;
    }
    const tier = this.state.slots[slot];
    if (tier === null) return;
    this.swords[slot]?.setVisible(false);
    this.badges[slot].setVisible(false);
    const sprite = this.add.image(p.x, p.y, tier === GEM ? 'gem' : swordTexture(tier)).setDepth(UI_DEPTH - 1).setScale(tier === GEM ? 1.3 : swordScale(1.35));
    this.held = { slot, sprite };
  }

  /** Lets go of the held sword: onto an anvil, onto an adventurer, or back where it came from. */
  private putDown(p: Phaser.Input.Pointer | null) {
    const held = this.held;
    if (!held) return;
    this.held = null;
    held.sprite.destroy();
    this.swords[held.slot]?.setVisible(true);
    if (!p) return;
    const slot = slotAt(p.x, p.y);
    const desk = deskAt(p.x, p.y);
    const buyer = desk === null ? undefined : this.state.adventurers.find((a) => a.desk === desk);
    let done = false;
    if (slot !== null) done = drop(this.state, held.slot, slot);
    else if (buyer) done = sell(this.state, held.slot, buyer.id);
    else if (onBanner(p.x, p.y)) done = deliver(this.state, held.slot);
    if (done) this.save();
  }

  /** A tap on a locked anvil or the locked barrel buys it, if there are coins enough. */
  private unlock(slot: number) {
    const id: UpgradeId = slot === BARREL ? 'barrel' : 'anvils';
    const price = nextPrice(id, this.state.ranks[id]);
    if (price === null) return;
    const c = slotCentre(slot);
    if (buy(this.state, id)) this.save();
    else this.float(c.x, c.y, `${UPGRADES[id].name}: ${price} coins`, '#d8d0e0');
  }

  private drawSwords() {
    this.state.slots.forEach((tier, slot) => {
      let sprite = this.swords[slot];
      if (tier === null) {
        sprite?.destroy();
        this.swords[slot] = null;
        return;
      }
      const c = slotCentre(slot);
      const key = tier === GEM ? 'gem' : swordTexture(tier);
      if (!sprite) {
        sprite = this.add.image(c.x, c.y - SWORD_LIFT, key).setDepth(10).setScale(SWORD_FIT);
        this.swords[slot] = sprite;
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      sprite.setVisible(this.held?.slot !== slot);
    });
    this.badges.forEach((badge, slot) => {
      const c = slotCentre(slot);
      badge.setPosition(c.x + BADGE.x, c.y - SWORD_LIFT + BADGE.y).setVisible(this.state.gemmed[slot] && this.swords[slot] !== null && this.held?.slot !== slot);
    });
    for (const lock of this.locks) {
      const open = slotOpen(this.state, lock.slot);
      lock.image.setVisible(!open);
      lock.price.setVisible(!open);
    }
  }

  private drawVisitors() {
    const here = new Set(this.state.adventurers.map((a) => a.id));
    for (const [id, v] of this.visitors) {
      if (here.has(id)) continue;
      v.root.destroy();
      this.visitors.delete(id);
    }
    for (const a of this.state.adventurers) {
      if (!this.visitors.has(a.id)) this.visitors.set(a.id, this.makeVisitor(a));
    }
  }

  private makeVisitor(a: Adventurer): Visitor {
    const b = deskBox(a.desk);
    const sword = swordOf(a.wants);
    const mid = ORDER.x + ORDER.w / 2;
    const body = this.add.image(ADVENTURER.x, ADVENTURER.y, adventurerTexture(a.look)).setOrigin(0);
    const card = this.add.image(ORDER.x - 13, ORDER.y - 2, 'order-card').setOrigin(0);
    // A gem order pays double, and shows the gem by the sword.
    const ask = a.gem ? `${sword.price * GEM_PAY} coins, gemmed` : `${sword.price} coins`;
    const price = this.add.text(mid, ORDER.y + 17, ask, { fontFamily: FONT, fontStyle: 'bold', fontSize: '14px', color: a.gem ? '#1e7a52' : '#9a5a10' }).setOrigin(0.5);
    const wants = this.add.image(mid, ORDER.y + 49, swordTexture(a.wants)).setScale(swordScale(0.82));
    const gem = this.add.image(mid - 22, ORDER.y + 62, 'gem-badge').setVisible(a.gem);
    const name = this.add.text(mid, ORDER.y + 86, sword.name, { fontFamily: FONT, fontStyle: 'bold', fontSize: '13px', color: '#2a1a14' }).setOrigin(0.5);
    const tagImage = this.add.image(0, 0, 'tag-exact').setOrigin(0);
    const tagTop = this.add.text(TAG.w / 2 + 1, 11.5, '', textStyle(10, '#eaffd8', 2)).setOrigin(0.5);
    const tagBottom = this.add.text(TAG.w / 2 + 1, 23.5, '', textStyle(11, '#ffe27a', 2)).setOrigin(0.5);
    const tag = this.add.container(TAG.x, TAG.y, [tagImage, tagTop, tagBottom]).setVisible(false);
    const root = this.add.container(b.x, b.y, [body, card, price, wants, gem, name, tag]).setDepth(20);
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
    return { root, tag, tagImage, tagTop, tagBottom };
  }

  /**
   * Little flourishes for what just happened: a pop for a new sword, a flash for a merge, a burst
   * of sparks for a hammer streak, coins for a sale and a halo for a finished commission.
   */
  private drawEvents() {
    for (const e of this.state.events.splice(0)) {
      if (e.kind === 'forged' || e.kind === 'merged') {
        const sprite = this.swords[e.slot];
        const c = slotCentre(e.slot);
        if (!sprite) continue;
        sprite.setScale((e.kind === 'merged' ? 1.5 : 0.4) * SWORD_FIT);
        this.tweens.add({ targets: sprite, scale: SWORD_FIT, duration: 250, ease: 'Back.Out' });
        if (e.kind === 'merged' && !settings.reduceMotion) {
          const flash = this.add.image(c.x, c.y - SWORD_LIFT, 'halo').setDepth(9).setScale(0.6);
          this.tweens.add({ targets: flash, scale: 1.2, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
      } else if (e.kind === 'set') {
        const c = slotCentre(e.slot);
        this.float(c.x, c.y - 20, 'Gem set!', '#8af0c8');
        if (!settings.reduceMotion) {
          const flash = this.add.image(c.x, c.y - SWORD_LIFT, 'halo').setDepth(9).setScale(0.5);
          this.tweens.add({ targets: flash, scale: 1, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
      } else if (e.kind === 'delivered') {
        this.delivered(e.slot, e.tier, e.made, e.count);
      } else if (e.kind === 'crowned') {
        this.crowned();
      } else if (e.kind === 'bought') {
        if (e.id === 'barrel' || e.id === 'anvils') {
          const c = e.id === 'barrel' ? slotCentre(BARREL) : slotCentre(2 * GRID.cols + OPEN_COLS);
          this.float(c.x, c.y, `${UPGRADES[e.id].name}!`, '#ffd36a');
        }
      } else if (e.kind === 'streak') {
        this.hammerStreak(e.slot, e.streak, e.coins);
      } else if (e.kind === 'commission') {
        this.commissionDone(e.slot, e.reward);
      } else if (e.kind === 'sold') {
        const c = deskCentre(e.desk);
        const fit = e.fit === 'exact' ? `Exact fit! +${e.coins} coins` : `+${e.coins} coins (overkill)`;
        const message = e.gem ? `Gemmed! +${e.coins} coins` : fit;
        this.float(c.x + 40, c.y, message, e.gem ? '#8af0c8' : e.fit === 'exact' ? '#ffd36a' : '#d8d0e0');
      } else if (e.kind === 'left') {
        const c = deskCentre(e.desk);
        this.float(c.x, c.y, `Left without a sword\nRenown ${e.renown}`, '#ff8a6a', 1800);
      }
    }
  }

  /** A rose of amber shards and flying sparks round the anvil, and the streak's tag above it. */
  private hammerStreak(slot: number, streak: number, coins: number) {
    const c = slotCentre(slot);
    const y = c.y - SWORD_LIFT;
    const burst = this.add.image(c.x, y, 'burst').setDepth(8);
    if (settings.reduceMotion) {
      this.tweens.add({ targets: burst, alpha: 0, delay: 500, duration: 500, onComplete: () => burst.destroy() });
    } else {
      burst.setScale(0.5);
      this.tweens.add({ targets: burst, scale: 1.15, duration: 500, ease: 'Back.Out' });
      this.tweens.add({ targets: burst, alpha: 0, delay: 450, duration: 450, onComplete: () => burst.destroy() });
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2 + 0.2;
        const spark = this.add.image(c.x, y, 'spark').setDepth(UI_DEPTH - 2).setRotation(t);
        const r = 50 + (k % 3) * 12;
        this.tweens.add({
          targets: spark,
          x: c.x + Math.cos(t) * r,
          y: y + Math.sin(t) * r,
          alpha: 0,
          duration: 450 + (k % 4) * 60,
          ease: 'Cubic.Out',
          onComplete: () => spark.destroy(),
        });
      }
    }
    const tagY = c.y - 59;
    const tag = this.add.container(c.x, tagY, [
      this.add.image(0, 0, 'streak-tag'),
      this.add.text(0, 0, `Hammer streak ×${streak}  +${coins}c`, textStyle(13, '#fff1d0', 2.5)).setOrigin(0.5),
    ]);
    tag.setDepth(UI_DEPTH + 2);
    this.tweens.add({ targets: tag, y: tagY - 16, alpha: 0, delay: 900, duration: 500, onComplete: () => tag.destroy() });
  }

  /** The sword flies up into the banner, which says how many the crown still wants. */
  private delivered(slot: number, tier: number, made: number, count: number) {
    const c = slotCentre(slot);
    const bx = BANNER.x + BANNER.w / 2;
    const by = BANNER.y + BANNER.h / 2;
    const sword = this.add.image(bx, by + 20, swordTexture(tier)).setDepth(UI_DEPTH + 2).setScale(swordScale(0.9));
    this.tweens.add({ targets: sword, y: by, scale: swordScale(0.4), alpha: 0, duration: 500, ease: 'Cubic.In', onComplete: () => sword.destroy() });
    if (made < count) this.float(c.x, c.y - 30, `Delivered to the crown: ${made} of ${count}`, '#ffe7a8', 1800);
  }

  /** The banner lights up and the purse and star float off it. */
  private commissionDone(slot: number, reward: number) {
    const bx = BANNER.x + BANNER.w / 2;
    const by = BANNER.y + BANNER.h / 2;
    const halo = this.add.image(bx, by, 'halo').setDepth(UI_DEPTH + 1).setScale(2.4, 0.8);
    this.tweens.add({ targets: halo, alpha: 0, delay: 400, duration: 900, onComplete: () => halo.destroy() });
    if (!settings.reduceMotion) this.tweens.add({ targets: this.banner.root, scale: 1.06, duration: 160, yoyo: true });
    const c = slotCentre(slot);
    this.float(c.x, c.y - 30, `Royal commission done! +${reward}c and a guild star`, '#ffd36a', 2400);
  }

  /** The Crown Blade is delivered: the Royal Smith panel shows over the board. */
  private crowned() {
    const s = this.state;
    this.winStats.setText(`${s.sold} swords sold, ${s.stars} guild stars,\nrenown ${s.renown}: ${renownBand(s.renown).name}`);
    this.winPanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.winPanel, alpha: 1, duration: 500 });
  }

  private float(x: number, y: number, message: string, color: string, duration = 1200) {
    const text = this.add.text(x, y, message, textStyle(17, color, 4)).setOrigin(0.5).setDepth(UI_DEPTH + 3);
    // Keep it on screen.
    text.x = Phaser.Math.Clamp(x, text.width / 2 + 6, VIEW.w - text.width / 2 - 6);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration, ease: 'Sine.In', onComplete: () => text.destroy() });
  }

  /**
   * Patience bars and the hammer streak's ring, and where the held sword can go: matching swords
   * to merge, and buyers who will take it, with the tag saying what each would pay.
   */
  private drawMarks() {
    const g = this.marks;
    const s = this.state;
    g.clear();
    for (const a of s.adventurers) {
      const b = deskBox(a.desk);
      const left = Math.max(0, a.patienceMs / a.patience);
      const n = PATIENCE.segments;
      const on = Math.ceil(n * left);
      const col = left > 0.5 ? 0x4ac060 : left > 0.2 ? 0xf0c040 : 0xe05040;
      const w = PATIENCE.w / n;
      for (let k = 0; k < n; k++) {
        const x = b.x + PATIENCE.x + k * w;
        const y = b.y + PATIENCE.y;
        g.fillStyle(k < on ? col : 0x2a2436).fillRect(x, y, w, PATIENCE.h);
        if (k < on) g.fillStyle(0xffffff, 0.25).fillRect(x + 1, y + 1, w - 2, 3);
        g.lineStyle(1.5, LEAD).strokeRect(x, y, w, PATIENCE.h);
      }
    }
    if (s.streakMs > 0) {
      // The streak's timer ring round the anvil of the last merge, draining until the chain breaks.
      const c = slotCentre(s.streakSlot);
      const start = -Math.PI / 2;
      g.lineStyle(8, LEAD).strokeCircle(c.x, c.y - 6, 46);
      g.lineStyle(4.5, 0xff8a2a);
      g.beginPath();
      g.arc(c.x, c.y - 6, 46, start, start + Math.PI * 2 * (s.streakMs / STREAK_MS));
      g.strokePath();
    }

    const held = this.held;
    const tier = held ? s.slots[held.slot] : null;
    const gemmed = held ? s.gemmed[held.slot] : false;
    // The outlines pulse, or hold steady with reduce motion.
    const pulse = settings.reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(this.clock / 120);
    // A held sword lights the swords it merges with; a held gem lights the swords it can be set in.
    const lights = (slot: number) => {
      const there = s.slots[slot];
      if (tier === null || slot === held?.slot || there === null) return false;
      if (tier === GEM) return there !== GEM && !s.gemmed[slot];
      return there === tier && tier < MAX_TIER;
    };
    this.mergeFrames.forEach((frame, slot) => frame.setVisible(lights(slot)).setAlpha(pulse));
    this.bannerFrame.setVisible(held !== null && wanted(s, held.slot)).setAlpha(pulse);
    const buyers = new Set<number>();
    for (const a of s.adventurers) {
      const v = this.visitors.get(a.id);
      const pay = offerFor(tier, gemmed, a);
      const buys = pay > 0;
      if (buys) buyers.add(a.desk);
      if (!v) continue;
      v.tag.setVisible(buys);
      if (!buys || tier === null) continue;
      const exact = fitOf(tier, a.wants) === 'exact';
      v.tagImage.setTexture(exact || a.gem ? 'tag-exact' : 'tag-overkill');
      const top = a.gem ? `Gemmed ×${GEM_PAY}` : exact ? 'Exact fit +50%' : 'Overkill';
      v.tagTop.setText(top).setColor(exact || a.gem ? '#eaffd8' : '#d8d0e0');
      v.tagBottom.setText(exact || a.gem ? `${pay}c` : `pays ${pay}c`).setColor(exact || a.gem ? '#ffe27a' : '#b8acc4');
    }
    this.buyerFrames.forEach((frame, desk) => frame.setVisible(buyers.has(desk)).setAlpha(pulse));
  }

  private drawForge() {
    const s = this.state;
    const hot = s.heatMs <= 0;
    // The fire flickers between two frames, held on the first with reduce motion, and dims while it heats.
    this.furnace.setTexture(`furnace-${settings.reduceMotion ? 0 : Math.floor(this.clock / 180) % 2}`);
    this.furnace.setAlpha(hot ? 1 : 0.6);
    const full = freeAnvil(s) < 0;
    this.forgeButton.set(full ? 'Board full' : hot ? 'Forge' : 'Heating...', hot && !full, full || !hot ? 20 : 25);
    // The heat bar: six jewel panes that light up as the forge gets hot again.
    const g = this.hud;
    const fill = Phaser.Math.Clamp(1 - s.heatMs / forgeMs(s), 0, 1);
    const n = 6;
    const w = HEAT_BAR.w / n;
    g.fillStyle(0x2a2030).fillRect(HEAT_BAR.x - 2, HEAT_BAR.y - 2, HEAT_BAR.w + 4, HEAT_BAR.h + 4);
    for (let k = 0; k < n; k++) {
      const x = HEAT_BAR.x + k * w;
      const lit = Phaser.Math.Clamp(fill * HEAT_BAR.w - k * w, 0, w);
      const col = hot ? (k % 2 ? 0xffc040 : 0xffd86a) : k % 2 ? 0xe8862a : 0xf09a3a;
      if (lit > 0) g.fillStyle(col).fillRect(x, HEAT_BAR.y, lit, HEAT_BAR.h);
      g.lineStyle(1.5, LEAD).strokeRect(x, HEAT_BAR.y, w, HEAT_BAR.h);
    }
    g.lineStyle(2, LEAD).strokeRect(HEAT_BAR.x - 2, HEAT_BAR.y - 2, HEAT_BAR.w + 4, HEAT_BAR.h + 4);
    BUTTON_UPGRADES.forEach((id, i) => {
      const rank = s.ranks[id];
      const price = nextPrice(id, rank);
      const u = UPGRADES[id];
      const button = this.upgradeButtons.get(id)!;
      const isLocked = locked(id, s.ranks);
      const emblem = emblemTexture(i % EMBLEMS.length, isLocked);
      const image = this.emblems.get(id)!;
      if (image.texture.key !== emblem) image.setTexture(emblem);
      if (id === 'auto' && rank > 0) {
        button.set(s.autoForge ? `${u.name}: on\ntap to pause` : `${u.name}: off\ntap to start`, true, 14);
        return;
      }
      const name = u.prices.length > 1 ? `${u.name} ${rank + 1}` : u.name;
      const blurb = isLocked ? 'max Bellows first' : u.blurb;
      const caption = price === null ? `${u.name} (max)\n${u.blurb}` : `${name}: ${price}c\n${blurb}`;
      button.set(caption, price !== null && s.coins >= price && !isLocked, 14);
    });
  }

  /** The row of discovered swords under the board: a dark frame per tier, lit with its sword once it is made. */
  private createDiscovered() {
    this.discovered = [];
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const c = discoveredCentre(tier, MAX_TIER);
      const frame = this.add.image(c.x, c.y, 'disc-off');
      const sword = this.add.image(c.x, c.y, swordTexture(tier)).setScale(swordScale(0.45)).setVisible(false);
      this.discovered.push({ frame, sword });
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    const top = (n: number) => this.add.text(0, 21, '', textStyle(n, '#efe2c4')).setOrigin(0, 0.5).setDepth(UI_DEPTH + 1);
    top(21).setText('Anvilheart').setColor('#ffd36a').setX(17);
    this.coinsText = top(16).setColor('#ffd36a').setX(220);
    // Right to left from the corner: the renown meter with its name, the swords sold and the guild stars.
    this.renownText = top(14.5).setOrigin(1, 0.5).setX(VIEW.w - 17 - RENOWN_BAR.w - 10);
    this.soldText = top(14.5).setOrigin(1, 0.5);
    this.starsText = top(15).setOrigin(1, 0.5);
    this.star = this.add.image(0, 20, 'star').setDepth(UI_DEPTH + 1);
    this.createBanner();
    this.bannerFrame = this.add.image(BANNER.x + BANNER.w / 2, BANNER.y + BANNER.h / 2, 'frame-banner').setDepth(UI_DEPTH + 2).setVisible(false);
    // In the first desk, which is empty while the hint shows.
    const desk = deskCentre(0);
    this.hint = this.add.text(desk.x, desk.y, '', textStyle(13, '#e8d8b8')).setOrigin(0.5).setDepth(UI_DEPTH + 1);
  }

  private createBanner() {
    const { x, y, w, h } = BANNER;
    const small = (s: string, tx: number, ty: number, col: string) =>
      this.add.text(tx, ty, s, { ...textStyle(9.5, col, 2), fontStyle: 'normal' }).setOrigin(0, 0.5);
    const kicker = this.add.text(36, 10.5, 'ROYAL COMMISSION', textStyle(8, '#ffe7a8', 3)).setOrigin(0, 0.5);
    kicker.setLetterSpacing(1);
    const title = this.add.text(36, 22.5, '', textStyle(13, '#fff2dc', 2.5)).setOrigin(0, 0.5);
    const sword = this.add.image(165, h / 2, swordTexture(6)).setScale(swordScale(0.42));
    const progress = small('', 192, 10, '#ffffff');
    const pips = [...Array(4).keys()].map((k) => this.add.image(198 + k * 17, 23, 'pip-off'));
    const reward = this.add.text(w - 9, 22.5, '', textStyle(13.5, '#ffe27a', 2.5)).setOrigin(1, 0.5);
    const star = this.add.image(w - 9, 22, 'star').setScale(0.65);
    // The container's origin is the banner's centre, so it can pulse in place.
    const items = [this.add.image(0, 0, 'banner').setOrigin(0), kicker, title, sword, progress, ...pips, reward, star];
    for (const item of items) item.setPosition(item.x - w / 2, item.y - h / 2);
    const root = this.add.container(x + w / 2, y + h / 2, items).setDepth(UI_DEPTH + 1);
    this.banner = { root, title, sword, progress, pips, reward, star };
  }

  private drawHud() {
    const s = this.state;
    this.hud.clear();
    this.coinsText.setText(`Coins ${s.coins}`);
    // Renown: its name and a bar of ten jewel panes in the band's colour.
    const band = renownBand(s.renown);
    this.renownText.setText(band.name).setColor(`#${band.color.toString(16).padStart(6, '0')}`);
    const rx = VIEW.w - 17 - RENOWN_BAR.w;
    const pane = RENOWN_BAR.w / 10;
    this.hud.fillStyle(0x2a2436).fillRect(rx, RENOWN_BAR.y, RENOWN_BAR.w, RENOWN_BAR.h);
    for (let k = 0; k < 10; k++) {
      const lit = Phaser.Math.Clamp(s.renown / 10 - k, 0, 1);
      if (lit > 0) this.hud.fillStyle(band.color).fillRect(rx + k * pane, RENOWN_BAR.y, pane * lit, RENOWN_BAR.h);
      this.hud.lineStyle(1.5, LEAD).strokeRect(rx + k * pane, RENOWN_BAR.y, pane, RENOWN_BAR.h);
    }
    this.soldText.setText(`Sold ${s.sold}`).setX(this.renownText.x - this.renownText.width - 16);
    this.starsText.setText(s.stars > 0 ? `${s.stars}` : '').setX(this.soldText.x - this.soldText.width - 12);
    this.star.setVisible(s.stars > 0).setX(this.starsText.x - this.starsText.width - 12);
    this.hint.setText(s.adventurers.length === 0 && s.sold === 0 ? 'An adventurer is on the way...' : '');
    this.discovered.forEach(({ frame, sword }, i) => {
      const made = i + 1 <= s.bestTier;
      sword.setVisible(made);
      if (frame.texture.key !== (made ? 'disc-on' : 'disc-off')) frame.setTexture(made ? 'disc-on' : 'disc-off');
    });

    // The commission: one great sword needs two of the tier below; two Dragonslayers count deliveries.
    // Once a sword it wants lies on the board, the banner asks for it to be dragged up.
    const c = commissionAt(s.commission.level);
    const b = this.banner;
    if (!c) {
      b.title.setText('Royal Smith');
      b.progress.setText('Every commission done');
      b.pips.forEach((pip) => pip.setVisible(false));
      b.reward.setText('');
      b.star.setX(BANNER.w / 2 - 20);
      if (b.sword.texture.key !== swordTexture(MAX_TIER)) b.sword.setTexture(swordTexture(MAX_TIER));
      return;
    }
    const target = c.final ? 'The Crown Blade' : swordOf(c.tier).name;
    const ready = s.slots.some((t) => t === c.tier);
    let have: number;
    let need: number;
    if (c.count === 1) {
      need = 2;
      have = ready ? need : Math.min(need, s.slots.filter((t) => t === c.tier - 1).length);
      b.title.setText(target);
      b.progress.setText(ready ? 'Ready! Drag it here' : `${swordOf(c.tier - 1).name}s ${have}/${need}`);
    } else {
      need = c.count;
      have = s.commission.made;
      b.title.setText(`${c.count} ${target}s`);
      b.progress.setText(ready ? `Sent ${have}/${need}: drag one here` : `Sent ${have}/${need}`);
    }
    if (b.sword.texture.key !== swordTexture(c.tier)) b.sword.setTexture(swordTexture(c.tier));
    b.pips.forEach((pip, k) => {
      pip.setVisible(k < need && need <= b.pips.length);
      const key = k < have ? 'pip-on' : 'pip-off';
      if (pip.texture.key !== key) pip.setTexture(key);
    });
    b.reward.setText(`+${c.reward}c`);
    b.star.setX(b.reward.x - b.reward.width - 11);
  }

  /** Padlocks over the fifth column's anvils and the barrel, each with the price that opens it. */
  private createLocks() {
    const spots = [...Array(GRID.rows).keys()].map((row) => row * GRID.cols + OPEN_COLS).concat(BARREL);
    this.locks = spots.map((slot) => {
      const c = slotCentre(slot);
      const id: UpgradeId = slot === BARREL ? 'barrel' : 'anvils';
      const image = this.add.image(c.x, c.y, 'lock-cell').setDepth(7);
      const caption = slot === BARREL ? `Barrel ${UPGRADES[id].prices[0]}c` : `4 for ${UPGRADES[id].prices[0]}c`;
      const price = this.add.text(c.x, c.y + 28, caption, textStyle(12, '#ffd36a', 3)).setOrigin(0.5).setDepth(7);
      return { slot, image, price };
    });
  }

  /** The Royal Smith panel over the board, hidden until the Crown Blade is delivered. */
  private createWinPanel() {
    const { x, y, w } = WIN_PANEL;
    const title = this.add.text(w / 2, 92, 'Royal Smith', textStyle(30, '#ffd36a', 4)).setOrigin(0.5);
    const line = this.add
      .text(w / 2, 136, 'The crown has its Crown Blade, and names\nyour smithy the finest in the realm.', { ...textStyle(14, '#fff1d0', 3), fontStyle: 'normal', align: 'center' })
      .setOrigin(0.5);
    this.winStats = this.add.text(w / 2, 184, '', { ...textStyle(13, '#e8d8b8', 3), fontStyle: 'normal', align: 'center' }).setOrigin(0.5);
    const button = new Button(this, w / 2, 240, 'forge', 'Keep smithing', () => this.winPanel.setVisible(false));
    this.winPanel = this.add.container(x, y, [this.add.image(0, 0, 'win-panel').setOrigin(0), title, line, this.winStats, button.root]);
    this.winPanel.setDepth(UI_DEPTH + 5).setVisible(false);
  }

  /** A small button in the corner that throws the board and coins away for a fresh smithy. */
  private createReset() {
    const text = this.add
      .text(VIEW.w - 17, VIEW.h - 13, 'New smithy', { ...textStyle(12, '#fff6e0', 3.5), fontStyle: 'normal' })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      clearProgress();
      for (const v of this.visitors.values()) v.root.destroy();
      for (const sprite of this.swords) sprite?.destroy();
      this.visitors.clear();
      this.swords.fill(null);
      this.winPanel.setVisible(false);
      this.state = newShop(freshProgress());
    });
  }
}
