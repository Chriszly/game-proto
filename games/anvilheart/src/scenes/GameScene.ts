import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { adventurerTexture } from '../art/characters';
import { swordTexture } from '../art/swords';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { buy, drop, forge, sell, tick, toggleAutoForge } from '../game/sim';
import { DESKS, GRID, SLOTS, forgeMs, freshProgress, newShop, progressOf, type Adventurer, type GameState } from '../game/state';
import { MAX_TIER, swordOf } from '../game/swords';
import { UPGRADES, UPGRADE_IDS, locked, nextPrice, type UpgradeId } from '../game/upgrades';
import { Button } from '../ui/Button';
import {
  BOARD,
  DISCOVERED,
  FONT,
  FORGE_BUTTON,
  FURNACE,
  HEAT_BAR,
  HUD_HEIGHT,
  UI_DEPTH,
  UPGRADE_BUTTONS,
  VIEW,
  deskAt,
  deskBox,
  deskCentre,
  discoveredCentre,
  slotAt,
  slotCentre,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the shop forward. */
const MAX_STEP_MS = 250;
/** How far up from an anvil's centre a sword lies on it. */
const SWORD_LIFT = 14;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});

/** Where the player picked a sword up, and the sword following the pointer. */
interface Held {
  slot: number;
  sprite: Phaser.GameObjects.Image;
}

/** What is drawn for one adventurer at the counter. */
interface Visitor {
  root: Phaser.GameObjects.Container;
  adventurer: Adventurer;
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
  private marks!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private coinsText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  /** The picture of each sword tier in the discovered row, shown once that tier has been made. */
  private discovered: Phaser.GameObjects.Image[] = [];
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
    };
  }

  create() {
    this.swords = new Array(SLOTS).fill(null);
    this.visitors.clear();
    this.held = null;
    this.state = newShop(loadProgress());

    this.add.image(0, 0, 'background').setOrigin(0);
    this.furnace = this.add.image(FURNACE.x, FURNACE.y, 'furnace-0');
    for (let slot = 0; slot < SLOTS; slot++) {
      const c = slotCentre(slot);
      this.add.image(c.x, c.y + 26, 'anvil').setOrigin(0.5, 1);
    }
    this.marks = this.add.graphics().setDepth(5);
    for (let desk = 0; desk < DESKS; desk++) {
      const b = deskBox(desk);
      this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0x2c2018, 0.55).setStrokeStyle(2, 0x8a5a32);
    }

    this.forgeButton = new Button(this, FORGE_BUTTON.x, FORGE_BUTTON.y, FORGE_BUTTON.w, FORGE_BUTTON.h, 'Forge', () => this.forge());
    UPGRADE_IDS.forEach((id, i) => {
      const b = UPGRADE_BUTTONS;
      this.upgradeButtons.set(id, new Button(this, b.x, b.ys[i], b.w, b.h, '', () => this.buy(id)));
    });
    this.add
      .text(BOARD.x + 2 * BOARD.cell, BOARD.y + 4 * BOARD.cell + 14, 'Merge matching swords, then sell them to adventurers.', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#c9b48f',
        align: 'center',
      })
      .setOrigin(0.5);
    this.createDiscovered();
    this.createHud();
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
    if (this.held || slot === null) return;
    const tier = this.state.slots[slot];
    if (tier === null) return;
    this.swords[slot]?.setVisible(false);
    const sprite = this.add.image(p.x, p.y, swordTexture(tier)).setDepth(UI_DEPTH - 1).setScale(1.15);
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
    if (done) this.save();
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
      if (!sprite) {
        sprite = this.add.image(c.x, c.y - SWORD_LIFT, swordTexture(tier)).setDepth(10);
        this.swords[slot] = sprite;
      }
      if (sprite.texture.key !== swordTexture(tier)) sprite.setTexture(swordTexture(tier));
      sprite.setVisible(this.held?.slot !== slot);
    });
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
    const body = this.add.image(46, b.h - 8, adventurerTexture(a.look)).setOrigin(0.5, 1);
    const bubble = this.add.rectangle(170, 58, 162, 100, 0xf1e8d0).setStrokeStyle(3, 0x1a1216);
    const tail = this.add.triangle(0, 0, 92, 82, 92, 98, 76, 98, 0xf1e8d0).setOrigin(0);
    const wants = this.add.image(170, 53, swordTexture(a.wants)).setScale(0.75);
    const name = this.add.text(170, 92, sword.name, { fontFamily: FONT, fontSize: '12px', color: '#3b2416' }).setOrigin(0.5);
    const price = this.add.text(170, 19, `${sword.price} coins`, { fontFamily: FONT, fontSize: '13px', color: '#8f6a24' }).setOrigin(0.5);
    const root = this.add.container(b.x, b.y, [body, tail, bubble, wants, name, price]).setDepth(20);
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
    return { root, adventurer: a };
  }

  /** Little flourishes for what just happened: a pop for a new sword, a flash for a merge, coins for a sale. */
  private drawEvents() {
    for (const e of this.state.events.splice(0)) {
      if (e.kind === 'forged' || e.kind === 'merged') {
        const sprite = this.swords[e.slot];
        const c = slotCentre(e.slot);
        if (!sprite) continue;
        sprite.setScale(e.kind === 'merged' ? 1.5 : 0.4);
        this.tweens.add({ targets: sprite, scale: 1, duration: 250, ease: 'Back.Out' });
        if (e.kind === 'merged' && !settings.reduceMotion) {
          const flash = this.add.circle(c.x, c.y - SWORD_LIFT, 40, 0xfff4d0, 0.8).setDepth(9);
          this.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
        }
      } else if (e.kind === 'sold') {
        const c = deskCentre(e.desk);
        this.float(c.x, c.y, `+${e.coins} coins`, '#f3c64e');
      } else if (e.kind === 'left') {
        const c = deskCentre(e.desk);
        this.float(c.x, c.y, 'Left without a sword', '#e0584f');
      }
    }
  }

  private float(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, textStyle(18, color)).setOrigin(0.5).setDepth(UI_DEPTH + 2);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 1200, onComplete: () => text.destroy() });
  }

  /** Patience bars, and where the held sword can go: matching swords to merge and buyers who will take it. */
  private drawMarks() {
    const g = this.marks;
    g.clear();
    for (const a of this.state.adventurers) {
      const b = deskBox(a.desk);
      const left = Math.max(0, a.patienceMs / a.patience);
      g.fillStyle(0x1d1418).fillRect(b.x + 89, b.y + b.h - 22, 162, 10);
      g.fillStyle(left > 0.5 ? 0x7ccf5a : left > 0.2 ? 0xe6c766 : 0xe0584f).fillRect(b.x + 91, b.y + b.h - 20, Math.round(158 * left), 6);
    }
    const held = this.held;
    if (!held) return;
    const tier = this.state.slots[held.slot];
    if (tier === null) return;
    const pulse = 0.75 + 0.25 * Math.sin(this.clock / 120);
    g.lineStyle(4, 0xf8d460, pulse);
    this.state.slots.forEach((t, slot) => {
      if (slot === held.slot || t !== tier) return;
      const x = BOARD.x + (slot % GRID.cols) * BOARD.cell;
      const y = BOARD.y + Math.floor(slot / GRID.cols) * BOARD.cell;
      g.strokeRect(x + 4, y + 4, BOARD.cell - 8, BOARD.cell - 8);
    });
    g.lineStyle(4, 0x7ccf5a, pulse);
    for (const a of this.state.adventurers) {
      if (tier < a.wants) continue;
      const b = deskBox(a.desk);
      g.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    }
  }

  private drawForge() {
    const s = this.state;
    const hot = s.heatMs <= 0;
    this.furnace.setTexture(`furnace-${Math.floor(this.clock / 180) % 2}`);
    this.furnace.setTint(hot ? 0xffffff : 0xb8a8a0);
    const full = !s.slots.includes(null);
    this.forgeButton.set(full ? 'Board full' : hot ? 'Forge' : 'Heating...', hot && !full, 20);
    const g = this.hud;
    const fill = 1 - s.heatMs / forgeMs(s);
    g.fillStyle(0x1d1418).fillRect(HEAT_BAR.x, HEAT_BAR.y, HEAT_BAR.w, HEAT_BAR.h);
    g.fillStyle(hot ? 0xf8d460 : 0xf09a3a).fillRect(HEAT_BAR.x + 2, HEAT_BAR.y + 2, Math.round((HEAT_BAR.w - 4) * fill), HEAT_BAR.h - 4);
    for (const id of UPGRADE_IDS) {
      const rank = s.ranks[id];
      const price = nextPrice(id, rank);
      const u = UPGRADES[id];
      const button = this.upgradeButtons.get(id)!;
      if (id === 'auto' && rank > 0) {
        button.set(s.autoForge ? `${u.name}: on\ntap to pause` : `${u.name}: off\ntap to start`, true, 14);
        continue;
      }
      const name = u.prices.length > 1 ? `${u.name} ${rank + 1}` : u.name;
      const blurb = locked(id, s.ranks) ? 'max Bellows first' : u.blurb;
      const caption = price === null ? `${u.name} (max)\n${u.blurb}` : `${name}: ${price}c\n${blurb}`;
      button.set(caption, price !== null && s.coins >= price && !locked(id, s.ranks), 14);
    }
  }

  /** The row of discovered swords under the board: an empty frame per tier, filled once it is made. */
  private createDiscovered() {
    this.discovered = [];
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const c = discoveredCentre(tier, MAX_TIER);
      this.add.rectangle(c.x, c.y, DISCOVERED.size, DISCOVERED.size, 0x1d1418, 0.7).setStrokeStyle(2, 0x5a3f2a);
      this.discovered.push(this.add.image(c.x, c.y, swordTexture(tier)).setScale(0.5).setVisible(false));
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    this.add.text(16, 10, 'Anvilheart', textStyle(18, '#f3c64e')).setDepth(UI_DEPTH + 1);
    this.coinsText = this.add.text(200, 11, '', textStyle(16, '#f3c64e')).setDepth(UI_DEPTH + 1);
    this.statsText = this.add.text(VIEW.w - 16, 12, '', textStyle(14)).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
    // In the first desk, which is empty while the hint shows.
    const desk = deskCentre(0);
    this.hint = this.add.text(desk.x, desk.y, '', textStyle(12, '#c9b48f')).setOrigin(0.5).setDepth(UI_DEPTH + 1);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x2c2018, 0.95).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a3f2a).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.coinsText.setText(`Coins ${s.coins}`);
    const best = s.bestTier > 0 ? swordOf(s.bestTier).name : 'none yet';
    this.statsText.setText(`Sold ${s.sold}   Best sword: ${best}`);
    this.hint.setText(s.adventurers.length === 0 && s.sold === 0 ? 'An adventurer is on the way...' : '');
    this.discovered.forEach((image, i) => image.setVisible(i + 1 <= s.bestTier));
  }

  /** A small button in the corner that throws the board and coins away for a fresh smithy. */
  private createReset() {
    const text = this.add
      .text(VIEW.w - 16, VIEW.h - 6, 'New smithy', { fontFamily: FONT, fontSize: '12px', color: '#8a7a60' })
      .setOrigin(1, 1)
      .setDepth(UI_DEPTH + 1)
      .setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      clearProgress();
      for (const v of this.visitors.values()) v.root.destroy();
      for (const sprite of this.swords) sprite?.destroy();
      this.visitors.clear();
      this.swords.fill(null);
      this.state = newShop(freshProgress());
    });
  }
}
