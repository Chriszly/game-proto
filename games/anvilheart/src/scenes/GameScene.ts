import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { ADVENTURER, adventurerTexture } from '../art/characters';
import { itemTexture, swordScale, swordTexture } from '../art/swords';
import { fit, shown } from '../art/glass';
import { EMBLEMS, emblemTexture } from '../art/ui';
import { commissionTitle } from '../game/commissions';
import { combine, isGem, tierOf } from '../game/items';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { buy, chooseCommission, deliver, deliverable, drop, forge, foundCharter, itemAt, offers, sell, standing, tick, toggleAutoForge } from '../game/sim';
import {
  BARREL as BARREL_PLACE,
  DESKS,
  MAX_SLOTS,
  REP_MAX,
  STAR_PRICE,
  STREAK_MS,
  dull,
  fitOf,
  forgeMs,
  freshProgress,
  newShop,
  orderPrice,
  payFor,
  progressOf,
  rustLeft,
  type Adventurer,
  type Fit,
  type GameState,
  type Trait,
} from '../game/state';
import { MAX_TIER, swordOf } from '../game/swords';
import { FORGE_UPGRADES, UPGRADES, locked, nextPrice, type UpgradeId } from '../game/upgrades';
import { Button } from '../ui/Button';
import {
  BANNER,
  BARREL,
  CELL_SCALE,
  FONT,
  FORGE_BUTTON,
  FURNACE_WINDOW,
  HEAT_BAR,
  ORDER,
  PATIENCE,
  REPUTATION,
  ROW_BOX,
  ROW_BUTTON,
  TAG,
  UI_DEPTH,
  UPGRADE_BUTTONS,
  VIEW,
  WIN,
  deskAt,
  deskBox,
  deskCentre,
  discoveredCentre,
  onBanner,
  placeAt,
  slotCentre,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the shop forward. */
const MAX_STEP_MS = 250;
/** How far up from an anvil's centre a sword lies on it. */
const SWORD_LIFT = Math.round(11 * CELL_SCALE);
/** How a sword lies on the barrel's mouth. */
const BARREL_LIFT = 24;
const BARREL_SCALE = 0.72;
/** What guild reputation reads as, from the bottom up, a word per fifth of the meter. */
const STANDING = ['Shunned', 'Doubted', 'Known', 'Respected', 'Renowned'];
const LEAD = 0x17131c;
/** The line under an adventurer's order that says what their trait does. */
const TRAIT_LINES: Record<Trait, string> = {
  none: '',
  haggler: 'Haggler: waits long, pays 70%',
  noble: 'Noble: pays triple, exact sword only',
  veteran: 'Veteran: takes one tier below too',
};
const TRAIT_COLOURS: Record<Trait, string> = { none: '#d8c8a8', haggler: '#9ad0ff', noble: '#ffd36a', veteran: '#b8e8a0' };

const textStyle = (size: number, color = '#fff1d0', stroke = 3): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontStyle: 'bold',
  fontSize: `${size}px`,
  color,
  stroke: '#17131c',
  strokeThickness: stroke,
});

/** A charter's number as the smithy's name carries it: II, III, IV and so on. */
function roman(n: number) {
  const parts: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of parts) while (n >= v) (out += s), (n -= v);
  return out;
}

/** The fit tag's first line: how the held sword fits the order, and what the buyer's trait makes of it. */
function tagLine(fit: Fit, trait: Trait) {
  if (fit === 'lesser') return 'One below: taken';
  if (fit !== 'exact') return 'Overkill';
  return trait === 'noble' ? 'Exact fit ×3' : trait === 'haggler' ? 'Exact fit, haggled' : 'Exact fit +50%';
}

/** Where the player picked a sword up (an anvil or `BARREL_PLACE`), and the sword following the pointer. */
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
  kicker: Phaser.GameObjects.Text;
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
  private visitors = new Map<number, Visitor>();
  private held: Held | null = null;
  private furnace!: Phaser.GameObjects.Image;
  private forgeButton!: Button;
  private upgradeButtons = new Map<UpgradeId, Button>();
  /** The fifth row's smoky cover, its line of instructions and build button, until it is bought. */
  private rowCover!: Phaser.GameObjects.Container;
  private rowButton!: Button;
  /** The quench barrel, its price before it is bought, the sword in it and its merge outline. */
  private barrel!: Phaser.GameObjects.Image;
  private barrelPrice!: Phaser.GameObjects.Text;
  private barrelSword: Phaser.GameObjects.Image | null = null;
  private barrelFrame!: Phaser.GameObjects.Image;
  private bannerFrame!: Phaser.GameObjects.Image;
  private repWord!: Phaser.GameObjects.Text;
  private win!: Phaser.GameObjects.Container;
  /** The crown's two offers for the next commission, and the button for each. */
  private chooser!: Phaser.GameObjects.Container;
  private chooserButtons: Button[] = [];
  private emblems = new Map<UpgradeId, Phaser.GameObjects.Image>();
  private marks!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  /** The glowing frames round matching anvils and buying desks while a sword is held. */
  private mergeFrames: Phaser.GameObjects.Image[] = [];
  private buyerFrames: Phaser.GameObjects.Image[] = [];
  /** The game's name in the top bar, numbered from the second charter on. */
  private titleText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private soldText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
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
      slots: [...Array(MAX_SLOTS).keys()].map((slot) => ({ x: slotCentre(slot).x, y: slotCentre(slot).y - SWORD_LIFT })),
      desks: [...Array(DESKS).keys()].map(deskCentre),
      banner: { x: BANNER.x + BANNER.w / 2, y: BANNER.y + BANNER.h / 2 },
      barrel: { x: BARREL.x, y: BARREL.y },
      row: { x: ROW_BUTTON.x, y: ROW_BUTTON.y },
    };
  }

  /** An image of a baked texture at `scale` times its size in view pixels (see `fit`). */
  private image(x: number, y: number, key: string, scale = 1) {
    return fit(this.add.image(x, y, key), scale);
  }

  create() {
    this.swords = new Array(MAX_SLOTS).fill(null);
    this.barrelSword = null;
    this.visitors.clear();
    this.held = null;
    this.state = newShop(loadProgress());

    this.image(0, 0, 'background').setOrigin(0);
    this.furnace = this.image(FURNACE_WINDOW.x, FURNACE_WINDOW.y, 'furnace-0').setOrigin(0);
    this.marks = this.add.graphics().setDepth(5);
    this.mergeFrames = [...Array(MAX_SLOTS).keys()].map((slot) => {
      const c = slotCentre(slot);
      return this.image(c.x, c.y, 'frame-gold').setDepth(6).setVisible(false);
    });
    this.barrel = this.image(BARREL.x, BARREL.y, 'barrel').setDepth(4);
    this.barrelFrame = this.image(BARREL.x, BARREL.y, 'frame-barrel').setDepth(6).setVisible(false);
    this.barrelPrice = this.add
      .text(BARREL.x, BARREL.y + 8, '', { ...textStyle(12.5, '#fff1d0', 3.5), align: 'center' })
      .setOrigin(0.5)
      .setDepth(7);
    this.createRowCover();
    this.buyerFrames = [...Array(DESKS).keys()].map((desk) => {
      const c = deskCentre(desk);
      return this.image(c.x, c.y, 'frame-green').setDepth(25).setVisible(false);
    });

    this.forgeButton = new Button(this, FORGE_BUTTON.x, FORGE_BUTTON.y, 'forge', 'Forge', () => this.forge());
    FORGE_UPGRADES.forEach((id, i) => {
      const b = UPGRADE_BUTTONS;
      const button = new Button(this, b.x, b.ys[i], 'upgrade', '', () => this.buy(id), 13);
      const emblem = this.image(-b.w / 2 + 22, 0, emblemTexture(i));
      button.root.add(emblem);
      this.emblems.set(id, emblem);
      this.upgradeButtons.set(id, button);
    });
    this.createDiscovered();
    this.createHud();
    this.createReset();
    this.createWin();
    this.createChooser();
    // An offer still waiting from the last visit opens at once.
    this.chooser.setVisible(this.state.choosing);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pickUp(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.held?.sprite.setPosition(p.worldX, p.worldY));
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
    // The Auto Forge forges inside tick, rust drops tiers, heroes bring swords back and walk-offs
    // cost reputation; keep them.
    if (this.state.events.some((e) => e.kind === 'forged' || e.kind === 'rusted' || e.kind === 'returned' || e.kind === 'left')) this.save();

    this.drawSwords();
    this.drawVisitors();
    this.drawEvents();
    this.drawMarks();
    this.drawHud();
    this.drawForge();
    this.drawChooser();
  }

  private forge() {
    if (forge(this.state)) this.save();
  }

  /** Where a place's sword lies on screen: on its anvil, or on the barrel's mouth. */
  private placeSpot(place: number) {
    if (place === BARREL_PLACE) return { x: BARREL.x, y: BARREL.y - BARREL_LIFT };
    const c = slotCentre(place);
    return { x: c.x, y: c.y - SWORD_LIFT };
  }

  /** Buys an upgrade; a bought Auto Forge's button switches it on and off instead. */
  /** Whether a window (the win or the crown's offer) is open over the board. */
  private get windowOpen() {
    return this.win.visible || this.chooser.visible;
  }

  private buy(id: UpgradeId) {
    if (this.windowOpen) return;
    const done = id === 'auto' && this.state.ranks.auto > 0 ? toggleAutoForge(this.state) : buy(this.state, id);
    if (done) this.save();
  }

  private save() {
    saveProgress(progressOf(this.state));
  }

  private pickUp(p: Phaser.Input.Pointer) {
    const place = placeAt(p.worldX, p.worldY);
    if (this.held || this.windowOpen) return;
    // Tapping the banner opens the crown's offer while one waits, or the win window once won.
    if (place === null) {
      if (!onBanner(p.worldX, p.worldY)) return;
      if (this.state.choosing) this.chooser.setVisible(true);
      else if (this.state.won) this.win.setVisible(true);
      return;
    }
    // Tapping the barrel before it is bought buys it.
    if (place === BARREL_PLACE && this.state.ranks.barrel === 0) return this.buy('barrel');
    const item = itemAt(this.state, place);
    if (item === null) return;
    this.spriteAt(place)?.setVisible(false);
    const sprite = this.image(p.worldX, p.worldY, itemTexture(item), swordScale(1.35)).setDepth(UI_DEPTH - 1);
    this.held = { slot: place, sprite };
  }

  private spriteAt(place: number) {
    return place === BARREL_PLACE ? this.barrelSword : this.swords[place];
  }

  /** Lets go of the held sword: onto an anvil, onto an adventurer, or back where it came from. */
  private putDown(p: Phaser.Input.Pointer | null) {
    const held = this.held;
    if (!held) return;
    this.held = null;
    held.sprite.destroy();
    this.spriteAt(held.slot)?.setVisible(true);
    if (!p) return;
    const place = placeAt(p.worldX, p.worldY);
    const desk = deskAt(p.worldX, p.worldY);
    const buyer = desk === null ? undefined : this.state.adventurers.find((a) => a.desk === desk);
    let done = false;
    if (place !== null) done = drop(this.state, held.slot, place);
    else if (onBanner(p.worldX, p.worldY)) done = deliver(this.state, held.slot);
    else if (buyer) done = sell(this.state, held.slot, buyer.id);
    if (done) this.save();
  }

  private drawSwords() {
    const s = this.state;
    for (let slot = 0; slot < MAX_SLOTS; slot++) this.swords[slot] = this.drawItem(this.swords[slot], s.slots[slot] ?? null, slot, CELL_SCALE);
    this.barrelSword = this.drawItem(this.barrelSword, s.barrel, BARREL_PLACE, BARREL_SCALE);
  }

  /** Keeps one place's sprite in step with what lies there: made, changed, hidden while held or gone. */
  private drawItem(sprite: Phaser.GameObjects.Image | null, item: number | null, place: number, scale: number) {
    if (item === null) {
      sprite?.destroy();
      return null;
    }
    const at = this.placeSpot(place);
    if (!sprite) sprite = this.image(at.x, at.y, itemTexture(item), scale).setDepth(10);
    if (sprite.texture.key !== itemTexture(item)) sprite.setTexture(itemTexture(item));
    sprite.setVisible(this.held?.slot !== place);
    // A dulled sword, rusting on its anvil, fades.
    sprite.setAlpha(place !== BARREL_PLACE && dull(this.state, place) ? 0.55 : 1);
    return sprite;
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
    const body = this.image(ADVENTURER.x, ADVENTURER.y, adventurerTexture(a.look)).setOrigin(0);
    const card = this.image(ORDER.x - 13, ORDER.y - 2, 'order-card').setOrigin(0);
    // A gem order shows the gemmed sword, a loose gem beside it and the doubled price.
    const price = this.add
      .text(mid, ORDER.y + 17, `${orderPrice(a, this.state.stars)} coins${a.gem ? ' (×2)' : ''}`, { fontFamily: FONT, fontStyle: 'bold', fontSize: '14px', color: '#9a5a10' })
      .setOrigin(0.5);
    const wants = this.image(mid, ORDER.y + 49, swordTexture(a.wants, a.gem), swordScale(0.82));
    const gem = this.image(mid + 50, ORDER.y + 52, 'gem', 0.5).setVisible(a.gem);
    const name = this.add
      .text(mid, ORDER.y + 86, a.gem ? `${sword.name} + gem` : sword.name, { fontFamily: FONT, fontStyle: 'bold', fontSize: a.gem ? '12px' : '13px', color: '#2a1a14' })
      .setOrigin(0.5);
    // Between the order card and the patience bar: the trait, or that this hero is back from a quest.
    const line = a.trait !== 'none' ? TRAIT_LINES[a.trait] : a.returned ? 'Back from the quest' : '';
    const trait = this.add.text(mid, ORDER.y + ORDER.h + 8.5, line, textStyle(11, TRAIT_COLOURS[a.trait], 2.5)).setOrigin(0.5);
    const tagImage = this.image(0, 0, 'tag-exact').setOrigin(0);
    const tagTop = this.add.text(TAG.w / 2 + 1, 11.5, '', textStyle(10, '#eaffd8', 2)).setOrigin(0.5);
    const tagBottom = this.add.text(TAG.w / 2 + 1, 23.5, '', textStyle(11, '#ffe27a', 2)).setOrigin(0.5);
    const tag = this.add.container(TAG.x, TAG.y, [tagImage, tagTop, tagBottom]).setVisible(false);
    const root = this.add.container(b.x, b.y, [body, card, price, wants, gem, name, trait, tag]).setDepth(20);
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
    return { root, tag, tagImage, tagTop, tagBottom };
  }

  /**
   * Little flourishes for what just happened: a pop for a new sword, a flash for a merge or a set
   * gem, a burst of sparks for a hammer streak, coins for a sale and a halo for a delivery and a
   * finished commission.
   */
  private drawEvents() {
    const events = this.state.events.splice(0);
    // A delivery that completes the commission only shows the commission's message.
    const done = events.some((e) => e.kind === 'commission');
    for (const e of events) {
      if (e.kind === 'forged' || e.kind === 'merged' || e.kind === 'set' || e.kind === 'repaired') {
        const sprite = this.spriteAt(e.slot);
        const at = this.placeSpot(e.slot);
        if (!sprite) continue;
        const scale = e.slot === BARREL_PLACE ? BARREL_SCALE : CELL_SCALE;
        fit(sprite, scale * (e.kind === 'forged' ? 0.4 : 1.5));
        this.tweens.add({ targets: sprite, scale: shown(sprite.texture.key, scale), duration: 250, ease: 'Back.Out' });
        if (e.kind !== 'forged' && !settings.reduceMotion) {
          const flash = this.image(at.x, at.y, 'halo', 0.6).setDepth(9);
          this.tweens.add({ targets: flash, scale: shown('halo', 1.2), alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
        if (e.kind === 'set') this.float(at.x, at.y - 20, 'Gem set!', '#8af0c8');
        if (e.kind === 'repaired') this.float(at.x, at.y - 20, `Repaired! +${e.coins}c`, '#8af0c8');
      } else if (e.kind === 'rusted') {
        const at = this.placeSpot(e.slot);
        this.float(at.x, at.y - 20, `Rusted down to a ${swordOf(e.tier).name}`, '#e08a5a', 1800);
      } else if (e.kind === 'returned') {
        const c = deskCentre(e.desk);
        this.float(c.x, c.y + 24, `Back from the quest! +${e.trophy}c trophy`, '#9ad0ff', 2000);
        const at = this.placeSpot(e.slot);
        this.float(at.x, at.y - 20, `A battered ${swordOf(e.tier).name}`, '#9ad0ff', 2000);
      } else if (e.kind === 'charter') {
        this.float(VIEW.w / 2, VIEW.h / 2, `A new charter: ${this.state.stars} guild stars, +${Math.round(STAR_PRICE * 100 * this.state.stars)}% on every sale`, '#ffd36a', 2600);
      } else if (e.kind === 'streak') {
        this.hammerStreak(e.slot, e.streak, e.coins);
      } else if (e.kind === 'delivered') {
        if (!done) this.float(BANNER.x + BANNER.w / 2, BANNER.y + 80, `${swordOf(e.tier).name} delivered to the crown`, '#ffe7a8');
      } else if (e.kind === 'commission') {
        this.commissionDone(e.reward, e.won);
      } else if (e.kind === 'sold') {
        const c = deskCentre(e.desk);
        const message = e.fit === 'exact' ? `Exact fit! +${e.coins} coins` : e.fit === 'lesser' ? `+${e.coins} coins (one below)` : `+${e.coins} coins (overkill)`;
        this.float(c.x + 40, c.y, message, e.fit === 'exact' ? '#ffd36a' : '#d8d0e0');
      } else if (e.kind === 'left') {
        const c = deskCentre(e.desk);
        this.float(c.x, c.y, 'Left unhappy: reputation down', '#ff8a6a');
      }
    }
  }

  /** A rose of amber shards and flying sparks round the anvil, and the streak's tag above it. */
  private hammerStreak(slot: number, streak: number, coins: number) {
    const c = this.placeSpot(slot);
    const y = c.y;
    const burst = this.image(c.x, y, 'burst').setDepth(8);
    if (settings.reduceMotion) {
      this.tweens.add({ targets: burst, alpha: 0, delay: 500, duration: 500, onComplete: () => burst.destroy() });
    } else {
      fit(burst, 0.5);
      this.tweens.add({ targets: burst, scale: shown('burst', 1.15), duration: 500, ease: 'Back.Out' });
      this.tweens.add({ targets: burst, alpha: 0, delay: 450, duration: 450, onComplete: () => burst.destroy() });
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2 + 0.2;
        const spark = this.image(c.x, y, 'spark').setDepth(UI_DEPTH - 2).setRotation(t);
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
    const tagY = c.y - 48;
    const tag = this.add.container(c.x, tagY, [
      this.image(0, 0, 'streak-tag'),
      this.add.text(0, 0, `Hammer streak ×${streak}  +${coins}c`, textStyle(13, '#fff1d0', 2.5)).setOrigin(0.5),
    ]);
    tag.setDepth(UI_DEPTH + 2);
    this.tweens.add({ targets: tag, y: tagY - 16, alpha: 0, delay: 900, duration: 500, onComplete: () => tag.destroy() });
  }

  /** The banner lights up and the purse and star float off it; the Crown Blade opens the win window. */
  private commissionDone(reward: number, won: boolean) {
    const bx = BANNER.x + BANNER.w / 2;
    const by = BANNER.y + BANNER.h / 2;
    const halo = this.image(bx, by, 'halo').setDepth(UI_DEPTH + 1).setScale(shown('halo', 2.4), shown('halo', 0.8));
    this.tweens.add({ targets: halo, alpha: 0, delay: 400, duration: 900, onComplete: () => halo.destroy() });
    if (!settings.reduceMotion) this.tweens.add({ targets: this.banner.root, scale: 1.06, duration: 160, yoyo: true });
    this.float(bx, by + 70, `Royal commission done! +${reward}c and a guild star`, '#ffd36a', 2400);
    if (won) this.win.setVisible(true);
    else if (this.state.choosing) this.chooser.setVisible(true);
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
      const c = this.placeSpot(s.streakSlot);
      const r = 40;
      const start = -Math.PI / 2;
      g.lineStyle(8, LEAD).strokeCircle(c.x, c.y + 4, r);
      g.lineStyle(4.5, 0xff8a2a);
      g.beginPath();
      g.arc(c.x, c.y + 4, r, start, start + Math.PI * 2 * (s.streakMs / STREAK_MS));
      g.strokePath();
    }
    // A rust-brown ring round each dulled sword's anvil, draining until it drops a tier.
    for (let slot = 0; slot < s.slots.length; slot++) {
      if (!dull(s, slot)) continue;
      const c = this.placeSpot(slot);
      const start = -Math.PI / 2;
      g.lineStyle(7, LEAD).strokeCircle(c.x, c.y + 4, 38);
      g.lineStyle(4, 0xb8642a);
      g.beginPath();
      g.arc(c.x, c.y + 4, 38, start, start + Math.PI * 2 * rustLeft(s, slot));
      g.strokePath();
    }

    const held = this.held;
    const item = held ? itemAt(s, held.slot) : null;
    // The outlines pulse, or hold steady with reduce motion.
    const pulse = settings.reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(this.clock / 120);
    const joins = (place: number) => {
      const there = itemAt(s, place);
      return item !== null && there !== null && place !== held?.slot && combine(item, there) !== null;
    };
    this.mergeFrames.forEach((frame, slot) => frame.setVisible(joins(slot)).setAlpha(pulse));
    this.barrelFrame.setVisible(s.ranks.barrel > 0 && joins(BARREL_PLACE)).setAlpha(pulse);
    this.bannerFrame.setVisible(deliverable(s, item)).setAlpha(pulse);
    const buyers = new Set<number>();
    for (const a of s.adventurers) {
      const v = this.visitors.get(a.id);
      const buys = item !== null && fitOf(item, a) !== 'short';
      if (buys) buyers.add(a.desk);
      if (!v) continue;
      v.tag.setVisible(buys);
      if (!buys) continue;
      const fit = fitOf(item, a);
      const exact = fit === 'exact';
      const pay = payFor(item, a, s.stars);
      v.tagImage.setTexture(exact ? 'tag-exact' : 'tag-overkill');
      v.tagTop.setText(tagLine(fit, a.trait)).setColor(exact ? '#eaffd8' : '#d8d0e0');
      v.tagBottom.setText(exact ? `${pay}c` : `pays ${pay}c`).setColor(exact ? '#ffe27a' : '#b8acc4');
    }
    this.buyerFrames.forEach((frame, desk) => frame.setVisible(buyers.has(desk)).setAlpha(pulse));
  }

  private drawForge() {
    const s = this.state;
    const hot = s.heatMs <= 0;
    // The fire flickers between two frames, held on the first with reduce motion, and dims while it heats.
    this.furnace.setTexture(`furnace-${settings.reduceMotion ? 0 : Math.floor(this.clock / 180) % 2}`);
    this.furnace.setAlpha(hot ? 1 : 0.6);
    const full = !s.slots.includes(null);
    this.drawReputation();
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
    FORGE_UPGRADES.forEach((id, i) => {
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
    // The fifth row and the barrel are bought where they go.
    const rowPrice = nextPrice('row', s.ranks.row);
    this.rowCover.setVisible(rowPrice !== null);
    if (rowPrice !== null) this.rowButton.set(`Build a fifth row of anvils: ${rowPrice}c`, s.coins >= rowPrice, 14);
    const barrelPrice = nextPrice('barrel', s.ranks.barrel);
    const barrelKey = barrelPrice === null ? 'barrel' : 'barrel-off';
    if (this.barrel.texture.key !== barrelKey) this.barrel.setTexture(barrelKey);
    this.barrelPrice.setText(barrelPrice === null ? '' : `Quench\nbarrel\n${barrelPrice}c`).setColor(barrelPrice !== null && s.coins >= barrelPrice ? '#ffe27a' : '#c8bcd8');
  }

  /** The guild reputation meter: its word and ten jewels, green when high, amber, then red when low. */
  private drawReputation() {
    const g = this.hud;
    const r = REPUTATION;
    const rep = this.state.reputation;
    this.repWord.setText(STANDING[Math.min(STANDING.length - 1, Math.floor((rep / REP_MAX) * STANDING.length))]);
    const n = r.segments;
    const w = (r.w - 24) / n;
    const x0 = r.x + 12;
    const y = r.y + 27;
    const on = Math.round((rep / REP_MAX) * n);
    const col = rep >= 60 ? 0x4ac060 : rep >= 30 ? 0xf0c040 : 0xe05040;
    for (let k = 0; k < n; k++) {
      const x = x0 + k * w;
      g.fillStyle(k < on ? col : 0x2a2436).fillRect(x, y, w, 11);
      if (k < on) g.fillStyle(0xffffff, 0.25).fillRect(x + 1, y + 1, w - 2, 3);
      g.lineStyle(1.5, LEAD).strokeRect(x, y, w, 11);
    }
  }

  /** Smoky glass over the fifth row until it is bought, with the instructions and the build button. */
  private createRowCover() {
    const b = ROW_BOX;
    const cover = this.image(b.x, b.y, 'row-locked').setOrigin(0);
    const text = this.add
      .text(b.x + b.w / 2, b.y + 22, 'Merge matching swords, then sell them to adventurers.', { ...textStyle(12.5, '#fff4d8', 3.5), fontStyle: 'normal' })
      .setOrigin(0.5);
    this.rowButton = new Button(this, ROW_BUTTON.x, ROW_BUTTON.y, 'row', '', () => this.buy('row'));
    this.rowCover = this.add.container(0, 0, [cover, text, this.rowButton.root]).setDepth(12);
  }

  /** The window that opens when the Crown Blade is delivered, with a button to keep smithing. */
  private createWin() {
    const items = [
      this.image(0, 0, 'win-panel'),
      this.add.text(0, -36, 'The Crown Blade is delivered!', textStyle(24, '#ffd36a', 4)).setOrigin(0.5),
      this.add
        .text(0, 6, 'The Anvilheart hangs in the throne room, and\nyours is the crown\'s own smithy.', { ...textStyle(15, '#fff1d0', 3), align: 'center', fontStyle: 'normal' })
        .setOrigin(0.5),
    ];
    const keep = new Button(this, -100, 70, 'forge', 'Keep smithing', () => this.win.setVisible(false));
    const found = new Button(this, 100, 70, 'forge', 'Found a new smithy', () => this.found(), 0);
    found.set('Found a new smithy', true, 16);
    this.win = this.add.container(WIN.x, WIN.y, [...items, keep.root, found.root]).setDepth(UI_DEPTH + 5).setVisible(false);
  }

  /** Founds a new smithy under a new charter: the board is cleared, the guild stars stay. */
  private found() {
    if (!foundCharter(this.state)) return;
    this.clearBoard();
    this.win.setVisible(false);
    this.save();
  }

  /** The window with the crown's two offers for the next commission: as it stands, or grand (gemmed) for much more. */
  private createChooser() {
    const items = [
      this.image(0, 0, 'win-panel'),
      this.add.text(0, -40, 'The crown offers a commission', textStyle(22, '#ffd36a', 4)).setOrigin(0.5),
      this.add
        .text(0, -6, 'Take it as it stands, or the grand way: every\nsword gemmed, for a far bigger purse.', { ...textStyle(14, '#fff1d0', 3), align: 'center', fontStyle: 'normal' })
        .setOrigin(0.5),
    ];
    this.chooserButtons = [false, true].map((grand) => new Button(this, grand ? 100 : -100, 58, 'forge', '', () => this.choose(grand)));
    const later = this.add
      .text(0, 98, 'Decide later', { ...textStyle(12, '#fff6e0', 3.5), fontStyle: 'normal' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    later.on('pointerdown', () => this.chooser.setVisible(false));
    this.chooser = this.add
      .container(WIN.x, WIN.y, [...items, ...this.chooserButtons.map((b) => b.root), later])
      .setDepth(UI_DEPTH + 5)
      .setVisible(false);
  }

  private choose(grand: boolean) {
    if (!chooseCommission(this.state, grand)) return;
    this.chooser.setVisible(false);
    this.save();
  }

  /** Fills the chooser's buttons with the two offers while a choice waits. */
  private drawChooser() {
    const two = offers(this.state);
    if (!two) {
      this.chooser.setVisible(false);
      return;
    }
    two.forEach((c, k) => this.chooserButtons[k].set(`${k === 0 ? 'Quick' : 'Grand'}: ${commissionTitle(c)}\n+${c.reward}c and a star`, true, 13));
  }

  /** The row of discovered swords under the board: a dark frame per tier, lit with its sword once it is made. */
  private createDiscovered() {
    this.discovered = [];
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const c = discoveredCentre(tier, MAX_TIER);
      const frame = this.image(c.x, c.y, 'disc-off');
      const sword = this.image(c.x, c.y, swordTexture(tier), swordScale(0.5)).setVisible(false);
      this.discovered.push({ frame, sword });
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    const top = (n: number) => this.add.text(0, 21, '', textStyle(n, '#efe2c4')).setOrigin(0, 0.5).setDepth(UI_DEPTH + 1);
    this.titleText = top(21).setText('Anvilheart').setColor('#ffd36a').setX(17);
    this.coinsText = top(16).setColor('#ffd36a').setX(220);
    // Right to left from the corner: the best sword, the swords sold and the guild stars.
    this.bestText = top(14.5).setOrigin(1, 0.5).setX(VIEW.w - 17);
    this.soldText = top(14.5).setOrigin(1, 0.5);
    this.starsText = top(15).setOrigin(1, 0.5);
    this.star = this.image(0, 20, 'star').setDepth(UI_DEPTH + 1);
    this.createBanner();
    this.bannerFrame = this.image(BANNER.x + BANNER.w / 2, BANNER.y + BANNER.h / 2, 'frame-banner').setDepth(UI_DEPTH + 2).setVisible(false);
    const r = REPUTATION;
    this.add.text(r.x + 12, r.y + 14, 'Guild reputation', textStyle(13, '#efe2c4')).setOrigin(0, 0.5).setDepth(UI_DEPTH + 1);
    this.repWord = this.add.text(r.x + r.w - 12, r.y + 14, '', textStyle(12, '#ffe27a')).setOrigin(1, 0.5).setDepth(UI_DEPTH + 1);
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
    const sword = this.image(165, h / 2, swordTexture(6), swordScale(0.42));
    const progress = small('', 192, 10, '#ffffff');
    const pips = [...Array(4).keys()].map((k) => this.image(198 + k * 17, 23, 'pip-off'));
    const reward = this.add.text(w - 9, 22.5, '', textStyle(13.5, '#ffe27a', 2.5)).setOrigin(1, 0.5);
    const star = this.image(w - 9, 22, 'star', 0.65);
    // The container's origin is the banner's centre, so it can pulse in place.
    const items = [this.image(0, 0, 'banner').setOrigin(0), kicker, title, sword, progress, ...pips, reward, star];
    for (const item of items) item.setPosition(item.x - w / 2, item.y - h / 2);
    const root = this.add.container(x + w / 2, y + h / 2, items).setDepth(UI_DEPTH + 1);
    this.banner = { root, kicker, title, sword, progress, pips, reward, star };
  }

  private drawHud() {
    const s = this.state;
    this.hud.clear();
    this.titleText.setText(s.charter > 0 ? `Anvilheart ${roman(s.charter + 1)}` : 'Anvilheart');
    this.coinsText.setText(`Coins ${s.coins}`);
    this.bestText.setText(`Best sword: ${s.bestTier > 0 ? swordOf(s.bestTier).name : 'none yet'}`);
    this.soldText.setText(`Sold ${s.sold}`).setX(this.bestText.x - this.bestText.width - 16);
    this.starsText.setText(s.stars > 0 ? `${s.stars} · +${Math.round(STAR_PRICE * 100 * s.stars)}%` : '').setX(this.soldText.x - this.soldText.width - 12);
    this.star.setVisible(s.stars > 0).setX(this.starsText.x - this.starsText.width - 12);
    this.hint.setText(s.adventurers.length === 0 && s.sold === 0 ? 'An adventurer is on the way...' : '');
    this.discovered.forEach(({ frame, sword }, i) => {
      const made = i + 1 <= s.bestTier;
      sword.setVisible(made);
      if (frame.texture.key !== (made ? 'disc-on' : 'disc-off')) frame.setTexture(made ? 'disc-on' : 'disc-off');
    });

    // The commission: one great sword needs two of the tier below, or is ready once it is made;
    // past that, a count of Dragonslayers delivered.
    const c = standing(s);
    const b = this.banner;
    if (!c || s.choosing) {
      b.title.setText(c ? 'The crown offers two' : "The crown's smithy").setFontSize(13);
      b.progress.setText(c ? 'Tap here to choose' : 'Tap here to found a new smithy');
      b.pips.forEach((pip) => pip.setVisible(false));
      b.reward.setText('');
      b.star.setX(b.reward.x - 8);
      const key = swordTexture(c ? c.tier : MAX_TIER);
      if (b.sword.texture.key !== key) b.sword.setTexture(key);
      return;
    }
    const items = [...s.slots, s.barrel];
    const ready = items.some((item) => item !== null && deliverable(s, item));
    let have: number;
    let need: number;
    const title = commissionTitle(c);
    b.title.setText(title).setFontSize(title.length > 14 ? 11.5 : 13);
    if (c.count === 1 && !c.gem) {
      need = 2;
      have = ready ? need : Math.min(need, items.filter((item) => item !== null && !isGem(item) && tierOf(item) === c.tier - 1).length);
      b.progress.setText(ready ? 'Ready: drag it here' : `${swordOf(c.tier - 1).name}s ${have}/${need}`);
    } else {
      need = c.count;
      have = s.commission.made;
      b.progress.setText(ready ? `Given ${have}/${need}: drag here` : `Given ${have}/${need}${c.gem ? ', gemmed' : ''}`);
    }
    if (b.sword.texture.key !== swordTexture(c.tier, c.gem)) b.sword.setTexture(swordTexture(c.tier, c.gem));
    b.pips.forEach((pip, k) => {
      pip.setVisible(k < need && need <= b.pips.length);
      const key = k < have ? 'pip-on' : 'pip-off';
      if (pip.texture.key !== key) pip.setTexture(key);
    });
    b.reward.setText(`+${c.reward}c`);
    b.star.setX(b.reward.x - b.reward.width - 11);
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
      this.state = newShop(freshProgress());
      this.clearBoard();
    });
  }

  /** Throws away every sword sprite and visitor, after the state was replaced or the board cleared. */
  private clearBoard() {
    for (const v of this.visitors.values()) v.root.destroy();
    for (const sprite of this.swords) sprite?.destroy();
    this.barrelSword?.destroy();
    this.barrelSword = null;
    this.visitors.clear();
    this.swords.fill(null);
    this.win.setVisible(false);
    this.chooser.setVisible(false);
  }
}
