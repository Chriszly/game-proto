import Phaser from 'phaser';
import { plantTexture } from '../art/placeholders';
import { GROW_MS, ITEMS, REFINE } from '../game/items';
import {
  collectTill,
  dropAtRefiner,
  dropInCauldron,
  harvest,
  payUpgrade,
  pickUpFromCauldron,
  pickUpFromRefiner,
  stockShelf,
  tick,
  type Feedback,
} from '../game/sim';
import { clearSave, loadState, saveState } from '../game/save';
import { CARRY_CAPACITY, MAX_LEVEL, MAX_ORDERS, upgradeCost, type GameState, type StationId } from '../game/state';
import { BackStack } from '../ui/BackStack';
import { IconRow } from '../ui/IconRow';
import { ProgressBar } from '../ui/ProgressBar';
import {
  CAULDRON,
  CAULDRON_MARKERS,
  COUNTER,
  COUNTER_MARKERS,
  GARDEN_AREAS,
  HUD_HEIGHT,
  REFINER,
  REFINER_MARKERS,
  SHOP,
  customerPosition,
  plotPosition,
} from './layout';

const SPEED = 160;
const PLAYER_SCALE = 3;
/** Longest simulated step, so a backgrounded tab doesn't jump the world forward. */
const MAX_STEP_MS = 250;
const UI_DEPTH = 10_000;
const AUTOSAVE_MS = 3_000;
/** How often a floor marker moves the next item while the doctor stands on it. */
const MARKER_INTERVAL_MS = 200;
const CUSTOMER_TINTS = [0x8f5a9e, 0x4d7aa8, 0xa8584d, 0x5e8f62, 0xb8934a];

/** A floor marker that acts by itself, one step at a time, while the doctor stands on it. */
interface Marker {
  zone: Phaser.Geom.Rectangle;
  act: () => Feedback | null;
}

/** Something the doctor can use when their feet are inside `zone`. */
interface Interactable {
  zone: Phaser.Geom.Rectangle;
  label: () => string;
  use: () => Feedback;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: Interactable[] = [];
  private markers: Marker[] = [];
  private nextMarkerAt = 0;
  /** Set when the player taps a station: walk there, then use it on arrival. */
  private pendingUse: Interactable | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private nextFeedbackAt = 0;
  /** Per-frame view updates, each reading from `state`. */
  private views: (() => void)[] = [];

  constructor() {
    super('Game');
  }

  create() {
    this.state = loadState();
    this.interactables = [];
    this.markers = [];
    this.views = [];
    this.pendingUse = null;
    this.pointerTarget = null;
    this.physics.world.setBounds(0, HUD_HEIGHT, this.scale.width, this.scale.height - HUD_HEIGHT);
    this.obstacles = this.physics.add.staticGroup();

    this.drawGrounds();
    this.createPlots();
    this.createStations();
    this.createPlayer();
    this.createShopfront();
    this.createHud();
    this.createControls();
    this.setUpSaving();
  }

  private setUpSaving() {
    const save = () => saveState(this.state);
    const onHide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: save });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
    });
  }

  private startOver() {
    if (!window.confirm('Start a new game? Your saved progress will be lost.')) return;
    clearSave();
    this.scene.restart();
  }

  private addInteractable(x: number, y: number, w: number, h: number, label: () => string, use: () => Feedback) {
    this.interactables.push({ zone: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), label, use });
  }

  private drawGrounds() {
    const g = this.add.graphics().setDepth(-1000);
    // Gardens: tilled earth inside a picket fence.
    for (const area of GARDEN_AREAS) {
      g.fillStyle(0x4f6e35).fillRect(area.x, area.y, area.w, area.h);
      g.lineStyle(4, 0xa88a5c).strokeRect(area.x, area.y, area.w, area.h);
    }
    // Shop: plank floor with a door gap facing the street.
    g.fillStyle(0x7a5a3a).fillRect(SHOP.x, SHOP.y, SHOP.w, SHOP.h);
    g.lineStyle(1, 0x5f4429);
    for (let y = SHOP.y + 20; y < SHOP.y + SHOP.h; y += 20) g.lineBetween(SHOP.x, y, SHOP.x + SHOP.w, y);
    g.lineStyle(6, 0x4a3a2c).strokeRect(SHOP.x, SHOP.y, SHOP.w, SHOP.h);
    g.fillStyle(0x7a5a3a).fillRect(SHOP.x - 4, SHOP.y + 290, 8, 90);

    const label = (x: number, y: number, text: string) =>
      this.add
        .text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', color: '#f3e9d2' })
        .setOrigin(0.5)
        .setDepth(-900);
    for (const area of GARDEN_AREAS) label(area.x + area.w / 2, area.y + 14, area.name);
    label(REFINER.x, REFINER.y + 46, 'Refining table');
    label(CAULDRON.x, CAULDRON.y - 64, 'Cauldron');
    label(SHOP.x + SHOP.w / 2, SHOP.y + 14, 'Storefront');
  }

  private createPlots() {
    this.state.plots.forEach((plot, i) => {
      const { x, y } = plotPosition(i);
      this.add.image(x, y, 'plot').setDepth(-500);
      const plant = this.add.image(x, y + 10, plantTexture(plot.plant, 2)).setOrigin(0.5, 1).setDepth(y);
      const growth = new ProgressBar(this, x, y + 26, 44, 0x9ccf6a, UI_DEPTH);
      this.views.push(() => {
        const grown = plot.grown / GROW_MS[plot.plant];
        plant.setTexture(plantTexture(plot.plant, grown >= 1 ? 2 : grown >= 0.5 ? 1 : 0));
        growth.set(grown >= 1 ? null : grown);
      });
      this.addInteractable(
        x,
        y,
        90,
        150,
        () => `Harvest ${ITEMS[plot.plant].name}`,
        () => harvest(this.state, i),
      );
    });
  }

  private createStations() {
    const { refiner, cauldron } = this.state;

    this.addObstacle(REFINER.x, REFINER.y, 'table', 84, 30);
    const refinerQueue = new IconRow(this, REFINER.x, REFINER.y - 4, REFINER.y + 1);
    const refining = new ProgressBar(this, REFINER.x, REFINER.y + 30, 60, 0xd8cfa8, UI_DEPTH);
    const refined = this.addMarker(REFINER_MARKERS.pickUp, 'pad-out', 'Pick up', () => pickUpFromRefiner(this.state));
    this.addMarker(REFINER_MARKERS.drop, 'pad-in', 'Drop', () => dropAtRefiner(this.state));
    this.addUpgradeMarker(REFINER_MARKERS.upgrade, 'refiner');
    this.views.push(() => {
      refinerQueue.set(refiner.queue);
      refined.set(refiner.output);
      refining.set(refiner.queue.length > 0 ? refiner.progress / REFINE[refiner.queue[0]].ms : null);
    });

    this.addObstacle(CAULDRON.x, CAULDRON.y, 'cauldron', 60, 28);
    const pot = new IconRow(this, CAULDRON.x, CAULDRON.y - 40, UI_DEPTH);
    const brewing = new ProgressBar(this, CAULDRON.x, CAULDRON.y + 34, 60, 0x58a35a, UI_DEPTH);
    const brewed = this.addMarker(CAULDRON_MARKERS.pickUp, 'pad-out', 'Pick up', () => pickUpFromCauldron(this.state));
    this.addMarker(CAULDRON_MARKERS.drop, 'pad-in', 'Drop', () => dropInCauldron(this.state));
    this.addUpgradeMarker(CAULDRON_MARKERS.upgrade, 'cauldron');
    this.views.push(() => {
      pot.set(cauldron.contents);
      brewed.set(cauldron.output);
      brewing.set(cauldron.brewing ? cauldron.brewing.progress / cauldron.brewing.ms : null);
    });
  }

  /** Lays a floor marker with a caption; returns an icon row on the marker for showing what waits there. */
  private addMarker(at: { x: number; y: number }, texture: string, caption: string, act: () => Feedback | null) {
    this.add.image(at.x, at.y, texture).setDepth(-400);
    this.add
      .text(at.x, at.y + 26, caption, { fontFamily: 'monospace', fontSize: '10px', color: '#f3e9d2' })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    this.markers.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), act });
    return new IconRow(this, at.x, at.y, -300, 8);
  }

  private addUpgradeMarker(at: { x: number; y: number }, station: StationId) {
    this.addMarker(at, 'pad-up', '', () => payUpgrade(this.state, station));
    const caption = this.add
      .text(at.x, at.y + 26, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e6d3f5' })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    const paid = new ProgressBar(this, at.x, at.y + 38, 40, 0xe0b84a, -400);
    this.views.push(() => {
      const { level, paid: sofar } = this.state.upgrades[station];
      const maxed = level >= MAX_LEVEL;
      caption.setText(maxed ? `Lv ${level + 1} max` : `Lv ${level + 2}: ${upgradeCost(level)}c`);
      paid.set(maxed ? null : sofar / upgradeCost(level));
    });
  }

  private createShopfront() {
    this.addObstacle(COUNTER.x, COUNTER.y, 'counter', 200, 30);
    const shelf = new IconRow(this, COUNTER.x, COUNTER.y - 6, COUNTER.y + 1);
    this.addMarker(COUNTER_MARKERS.drop, 'pad-in', 'Drop', () => stockShelf(this.state));
    this.addMarker(COUNTER_MARKERS.pickUp, 'pad-out', 'Coins', () => collectTill(this.state));
    this.addUpgradeMarker(COUNTER_MARKERS.upgrade, 'counter');
    const tillCoin = this.add.image(COUNTER_MARKERS.pickUp.x - 8, COUNTER_MARKERS.pickUp.y, 'coin').setDepth(-300);
    const till = this.add
      .text(COUNTER_MARKERS.pickUp.x - 1, COUNTER_MARKERS.pickUp.y, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff4c2',
        stroke: '#1b1410',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(-300);
    this.views.push(() => {
      const { counter } = this.state;
      shelf.set(counter.shelf);
      tillCoin.setVisible(counter.till > 0);
      till.setText(counter.till > 0 ? `${counter.till}` : '');
    });

    // One customer slot per possible order; slot i shows the i-th open order.
    for (let i = 0; i < MAX_ORDERS; i++) {
      const { x, y } = customerPosition(i);
      const customer = this.add.image(x, y, 'customer').setScale(2).setDepth(y);
      const head = this.add.image(x, y, 'customer-head').setScale(2).setDepth(y);
      const wants = new IconRow(this, x, y - 52, UI_DEPTH);
      const patience = new ProgressBar(this, x, y - 40, 40, 0xe0b84a, UI_DEPTH);
      this.views.push(() => {
        const order = this.state.orders[i];
        customer.setVisible(!!order);
        head.setVisible(!!order);
        wants.set(order ? order.wants : []);
        patience.set(order ? order.patience / order.maxPatience : null);
        if (order) customer.setTint(CUSTOMER_TINTS[order.id % CUSTOMER_TINTS.length]);
      });
    }
  }

  private createHud() {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, HUD_HEIGHT, 0x1b1410).setOrigin(0).setDepth(UI_DEPTH);
    const style = { fontFamily: 'monospace', fontSize: '16px', color: '#f3e9d2' };
    const coins = this.add.text(16, HUD_HEIGHT / 2, '', style).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.add.text(width / 2 - 92, HUD_HEIGHT / 2, 'Hands', style).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add
      .text(width - 110, HUD_HEIGHT / 2, 'Walk: WASD / tap\nHarvest: E / Space / tap', { ...style, fontSize: '11px' })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH);
    this.add
      .text(width - 16, HUD_HEIGHT / 2, 'New game', { ...style, fontSize: '12px', backgroundColor: '#5a3d22', padding: { x: 6, y: 4 } })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.startOver();
      });

    const slots = Array.from({ length: CARRY_CAPACITY }, (_, i) => {
      const x = width / 2 - 60 + i * 40;
      this.add.rectangle(x, HUD_HEIGHT / 2, 32, 32, 0x3a2c22).setStrokeStyle(2, 0x8a6239).setDepth(UI_DEPTH);
      return this.add.image(x, HUD_HEIGHT / 2, 'item-wheat').setScale(1.5).setDepth(UI_DEPTH);
    });
    const pack = new BackStack(this);

    this.prompt = this.add
      .text(0, 0, '', { ...style, fontSize: '12px', backgroundColor: '#1b1410cc', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 0)
      .setDepth(UI_DEPTH);

    this.views.push(() => {
      coins.setText(`Coins: ${this.state.coins}`);
      slots.forEach((slot, i) => {
        const item = this.state.carrying[i];
        slot.setVisible(!!item);
        if (item) slot.setTexture(`item-${item}`);
      });
      pack.update(this.player, this.state.carrying);
    });
  }

  /** A station image whose lower part blocks walking, so the doctor can pass behind its top edge. */
  private addObstacle(x: number, y: number, texture: string, bodyW: number, bodyH: number) {
    const img = this.add.image(x, y, texture).setDepth(y);
    const block = this.add.zone(x, y + img.height / 2 - bodyH / 2, bodyW, bodyH);
    this.obstacles.add(block);
    return img;
  }

  private createPlayer() {
    const { x, y } = this.state.player;
    this.player = this.physics.add.sprite(x, y, 'doctor-idle');
    this.player.setScale(PLAYER_SCALE);
    // Collide with the feet only, so the hat and beak can overlap things behind the doctor.
    this.player.body!.setSize(10, 5).setOffset(3, 19);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);
  }

  private createControls() {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey('W'),
      down: keyboard.addKey('S'),
      left: keyboard.addKey('A'),
      right: keyboard.addKey('D'),
    };

    keyboard.on('keydown-E', () => this.useNearest());
    keyboard.on('keydown-SPACE', () => this.useNearest());

    // Touch / click to walk, so the same controls work on phones. Tapping a station also uses it.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY < HUD_HEIGHT) return;
      this.pointerTarget = new Phaser.Math.Vector2(p.worldX, p.worldY);
      this.pendingUse = this.interactables.find((it) => it.zone.contains(p.worldX, p.worldY)) ?? null;
    });
  }

  /** The interactable whose zone holds the doctor's feet, nearest centre first. */
  private nearest(): Interactable | null {
    const x = this.player.x;
    const y = this.feetY();
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.interactables) {
      if (!it.zone.contains(x, y)) continue;
      const d = Phaser.Math.Distance.Between(x, y, it.zone.centerX, it.zone.centerY);
      if (d < bestDist) {
        best = it;
        bestDist = d;
      }
    }
    return best;
  }

  private useNearest() {
    const target = this.nearest();
    if (target) this.showFeedback(target.use());
  }

  private showFeedback(lines: Feedback) {
    // Stagger lines so several pickups read one after another.
    const start = Math.max(this.time.now, this.nextFeedbackAt);
    lines.forEach((line, i) => {
      this.time.delayedCall(start - this.time.now + i * 180, () => {
        const text = this.add
          .text(this.player.x, this.player.y - 60, line, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#fff4c2',
            stroke: '#1b1410',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(UI_DEPTH + 1);
        this.tweens.add({ targets: text, y: text.y - 36, alpha: 0, duration: 1100, onComplete: () => text.destroy() });
      });
    });
    this.nextFeedbackAt = start + lines.length * 180;
  }

  update(_time: number, delta: number) {
    tick(this.state, Math.min(delta, MAX_STEP_MS));
    this.movePlayer();

    this.standOnMarkers();

    const near = this.nearest();
    if (this.pendingUse && near === this.pendingUse) {
      this.pendingUse = null;
      this.pointerTarget = null;
      this.player.setVelocity(0, 0);
      this.showFeedback(near.use());
    }
    this.prompt.setVisible(!!near);
    if (near) this.prompt.setText(near.label()).setPosition(this.player.x, this.feetY() + 8);

    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    for (const view of this.views) view();
  }

  private standOnMarkers() {
    const marker = this.markers.find((m) => m.zone.contains(this.player.x, this.feetY()));
    if (!marker || this.time.now < this.nextMarkerAt) return;
    this.nextMarkerAt = this.time.now + MARKER_INTERVAL_MS;
    const feedback = marker.act();
    if (feedback) this.showFeedback(feedback);
  }

  private movePlayer() {
    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.wasd.left.isDown) dir.x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dir.x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dir.y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dir.y += 1;

    if (dir.lengthSq() > 0) {
      this.pointerTarget = null;
      this.pendingUse = null;
    } else if (this.pointerTarget) {
      // Steer the feet, not the sprite centre, to the tapped spot.
      dir.set(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.feetY());
      if (dir.length() < 4) {
        this.pointerTarget = null;
        this.pendingUse = null;
        dir.set(0, 0);
      }
    }

    dir.normalize().scale(SPEED);
    this.player.setVelocity(dir.x, dir.y);
    this.animatePlayer(dir);
  }

  private feetY() {
    return this.player.body!.center.y;
  }

  private animatePlayer(velocity: Phaser.Math.Vector2) {
    if (velocity.x !== 0) this.player.setFlipX(velocity.x < 0);
    if (velocity.lengthSq() > 0) {
      this.player.anims.play('doctor-walk', true);
    } else {
      this.player.anims.stop();
      this.player.setTexture('doctor-idle');
    }
    // Draw lower sprites in front of higher ones.
    this.player.setDepth(this.feetY());
  }
}
