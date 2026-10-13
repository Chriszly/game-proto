import Phaser from 'phaser';
import { plantTexture } from '../art/garden';
import { customerTexture } from '../art/townsfolk';
import { signTexture } from '../art/ui';
import { GROW_MS, REFINE } from '../game/items';
import {
  collectTill,
  dropAtRefiner,
  dropInCauldron,
  harvest,
  isRipe,
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
  YARD,
  customerPosition,
  plotPosition,
} from './layout';

const SPEED = 160;
const PLAYER_SCALE = 2;
/** Longest simulated step, so a backgrounded tab doesn't jump the world forward. */
const MAX_STEP_MS = 250;
const UI_DEPTH = 10_000;
const AUTOSAVE_MS = 3_000;
/** How often a floor marker moves the next item while the doctor stands on it. */
const MARKER_INTERVAL_MS = 200;
/** Pause between plants when several in reach are ripe, so each pickup can be seen. */
const HARVEST_INTERVAL_MS = 150;
/** Sickle spin speed in radians per millisecond, its distance from the doctor's centre, and how
 * long it keeps spinning after the last ripe plant in reach. */
const SICKLE_SPIN = 0.014;
const SICKLE_ORBIT = 26;
const SICKLE_LINGER_MS = 400;

/** A floor marker that acts by itself, one step at a time, while the doctor stands on it. */
interface Marker {
  zone: Phaser.Geom.Rectangle;
  act: () => Feedback | null;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  /** A corner to walk to first when a station stands between the doctor and the tapped spot. */
  private waypoint: Phaser.Math.Vector2 | null = null;
  /** Station footprints grown by the doctor's feet, used to walk around stations after a tap. */
  private blockedAreas: Phaser.Geom.Rectangle[] = [];
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private markers: Marker[] = [];
  /** Work spots: the station whose spot holds the doctor's feet is the one that works. */
  private workSpots: { zone: Phaser.Geom.Rectangle; station: StationId }[] = [];
  private nextMarkerAt = 0;
  /** Plot centres, in plot order, for finding ripe plants within the doctor's reach. */
  private plotCentres: Phaser.Math.Vector2[] = [];
  private nextHarvestAt = 0;
  /** Spins around the doctor while harvesting. */
  private sickle!: Phaser.GameObjects.Image;
  private sickleAngle = 0;
  private lastHarvestingAt = -Infinity;
  private nextFeedbackAt = 0;
  /** Per-frame view updates, each reading from `state`. */
  private views: (() => void)[] = [];

  constructor() {
    super('Game');
  }

  create() {
    this.state = loadState();
    this.plotCentres = [];
    this.markers = [];
    this.workSpots = [];
    this.views = [];
    this.pointerTarget = null;
    this.waypoint = null;
    this.blockedAreas = [];
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

  private drawGrounds() {
    const { width, height } = this.scale;
    const ground = (x: number, y: number, w: number, h: number, texture: string, depth = -1000) =>
      this.add.tileSprite(x, y, w, h, texture).setOrigin(0).setDepth(depth);
    ground(0, HUD_HEIGHT, width, height - HUD_HEIGHT, 'tile-grass');

    // Workshop yard of packed earth, with a path to the shop door.
    ground(YARD.x, YARD.y, YARD.w, YARD.h, 'tile-dirt');
    ground(YARD.x + YARD.w, SHOP.y + 290, SHOP.x - YARD.x - YARD.w, 90, 'tile-dirt');

    // Gardens: meadow inside a picket fence.
    for (const area of GARDEN_AREAS) {
      ground(area.x, area.y, area.w, area.h, 'tile-meadow');
      ground(area.x - 12, area.y, 32, area.h, 'fence-v', -990);
      ground(area.x + area.w - 20, area.y, 32, area.h, 'fence-v', -990);
      ground(area.x, area.y - 4, area.w, 32, 'fence-h', -980);
      ground(area.x, area.y + area.h - 28, area.w, 32, 'fence-h', -980);
    }

    // Shop: plank floor inside stone walls, with a doorway facing the yard.
    ground(SHOP.x, SHOP.y, SHOP.w, SHOP.h, 'tile-planks');
    const wall = 16;
    ground(SHOP.x - wall / 2, SHOP.y - wall / 2, SHOP.w + wall, wall, 'tile-wall', -990);
    ground(SHOP.x - wall / 2, SHOP.y + SHOP.h - wall / 2, SHOP.w + wall, wall, 'tile-wall', -990);
    ground(SHOP.x + SHOP.w - wall / 2, SHOP.y, wall, SHOP.h, 'tile-wall', -990);
    ground(SHOP.x - wall / 2, SHOP.y, wall, 290, 'tile-wall', -990);
    ground(SHOP.x - wall / 2, SHOP.y + 380, wall, SHOP.h - 380, 'tile-wall', -990);

    // Place names on wooden signs.
    const label = (x: number, y: number, text: string) => {
      const name = this.add
        .text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', color: '#f3e9d2', stroke: '#3b2416', strokeThickness: 2 })
        .setOrigin(0.5)
        .setDepth(-900);
      this.add.image(x, y, signTexture(this, name.width + 16)).setDepth(-910);
    };
    for (const area of GARDEN_AREAS) label(area.x + area.w / 2, area.y + 10, area.name);
    label(REFINER.x, REFINER.y + 46, 'Refining table');
    label(CAULDRON.x, CAULDRON.y - 64, 'Cauldron');
    label(SHOP.x + SHOP.w / 2, SHOP.y, 'Storefront');
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
      this.plotCentres[i] = new Phaser.Math.Vector2(x, y);
    });
  }

  private createStations() {
    const { refiner, cauldron } = this.state;

    this.addObstacle(REFINER.x, REFINER.y, 'table', 84, 30);
    const refinerQueue = new IconRow(this, REFINER.x, REFINER.y - 4, REFINER.y + 1);
    const refining = new ProgressBar(this, REFINER.x, REFINER.y + 30, 60, 0xd8cfa8, UI_DEPTH);
    const refined = this.addMarker(REFINER_MARKERS.pickUp, 'pad-out', 'Pick up', () => pickUpFromRefiner(this.state));
    this.addMarker(REFINER_MARKERS.drop, 'pad-in', 'Drop', () => dropAtRefiner(this.state));
    this.addWorkSpot(REFINER_MARKERS.work, 'refiner');
    this.addUpgradeMarker(REFINER_MARKERS.upgrade, 'refiner');
    this.views.push(() => {
      refinerQueue.set(refiner.queue);
      refined.set(refiner.output);
      refining.set(refiner.queue.length > 0 ? refiner.progress / REFINE[refiner.queue[0]].ms : null);
    });

    this.addObstacle(CAULDRON.x, CAULDRON.y, 'cauldron', 60, 28).play('cauldron-boil');
    const pot = new IconRow(this, CAULDRON.x, CAULDRON.y - 40, UI_DEPTH);
    const brewing = new ProgressBar(this, CAULDRON.x, CAULDRON.y + 34, 60, 0x58a35a, UI_DEPTH);
    const brewed = this.addMarker(CAULDRON_MARKERS.pickUp, 'pad-out', 'Pick up', () => pickUpFromCauldron(this.state));
    this.addMarker(CAULDRON_MARKERS.drop, 'pad-in', 'Drop', () => dropInCauldron(this.state));
    this.addWorkSpot(CAULDRON_MARKERS.work, 'cauldron');
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

  /** The spot the doctor stands on to make the station work. */
  private addWorkSpot(at: { x: number; y: number }, station: StationId) {
    this.addMarker(at, 'pad-work', 'Work', () => null);
    this.workSpots.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), station });
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
    this.addWorkSpot(COUNTER_MARKERS.work, 'counter');
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
      const customer = this.add.image(x, y, customerTexture(0)).setScale(2).setDepth(y);
      const wants = new IconRow(this, x, y - 52, UI_DEPTH);
      const patience = new ProgressBar(this, x, y - 40, 40, 0xe0b84a, UI_DEPTH);
      this.views.push(() => {
        const order = this.state.orders[i];
        customer.setVisible(!!order);
        wants.set(order ? order.wants : []);
        patience.set(order ? order.patience / order.maxPatience : null);
        if (order) customer.setTexture(customerTexture(order.id));
      });
    }
  }

  private createHud() {
    const { width } = this.scale;
    this.add.tileSprite(0, 0, width, HUD_HEIGHT, 'hud-bar').setOrigin(0).setDepth(UI_DEPTH);
    const style = { fontFamily: 'monospace', fontSize: '16px', color: '#f3e9d2' };
    this.add.image(26, HUD_HEIGHT / 2 - 1, 'coin').setScale(2).setDepth(UI_DEPTH);
    const coins = this.add.text(44, HUD_HEIGHT / 2 - 1, '', style).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.add.text(width / 2 - 92, HUD_HEIGHT / 2, 'Hands', style).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add
      .text(width - 110, HUD_HEIGHT / 2, 'Walk: WASD / tap\nHarvest: walk past ripe plants', { ...style, fontSize: '11px' })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH);
    this.add
      .text(width - 16, HUD_HEIGHT / 2, 'New game', { ...style, fontSize: '12px', backgroundColor: '#5c3a21', padding: { x: 6, y: 4 } })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.startOver();
      });

    const slots = Array.from({ length: CARRY_CAPACITY }, (_, i) => {
      const x = width / 2 - 60 + i * 40;
      this.add.image(x, HUD_HEIGHT / 2 - 1, 'slot').setDepth(UI_DEPTH);
      return this.add.image(x, HUD_HEIGHT / 2 - 1, 'item-wheat').setScale(1.5).setDepth(UI_DEPTH);
    });
    const pack = new BackStack(this);

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
    const img = this.add.sprite(x, y, texture).setDepth(y);
    const block = this.add.zone(x, y + img.height / 2 - bodyH / 2, bodyW, bodyH);
    this.obstacles.add(block);
    this.blockedAreas.push(new Phaser.Geom.Rectangle(x - bodyW / 2 - 18, block.y - bodyH / 2 - 10, bodyW + 36, bodyH + 20));
    return img;
  }

  private createPlayer() {
    const { x, y } = this.state.player;
    this.player = this.physics.add.sprite(x, y, 'doctor-idle');
    this.player.setScale(PLAYER_SCALE);
    // Collide with the feet only, so the hat and beak can overlap things behind the doctor.
    // In texture pixels: a 30x15 box at (9, 57) once scaled, as before the art was redrawn.
    this.player.body!.setSize(15, 7.5).setOffset(4.5, 28.5);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);
    this.sickle = this.add.image(x, y, 'sickle').setScale(PLAYER_SCALE).setVisible(false);
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

    // Touch / click to walk, so the same controls work on phones.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY < HUD_HEIGHT) return;
      this.pointerTarget = new Phaser.Math.Vector2(p.worldX, p.worldY);
      this.waypoint = this.routeAround(this.pointerTarget);
    });
  }

  /**
   * Harvests ripe plants within one character height of the doctor's centre, one plant at a time
   * so each pickup can be seen. Returns whether a ripe plant is in reach with room to carry it.
   */
  private autoHarvest() {
    const reach = this.player.displayHeight;
    const centre = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const inReach = this.plotCentres
      .map((at, i) => ({ i, d: at.distance(centre) }))
      .filter(({ i, d }) => d <= reach && isRipe(this.state, i))
      .sort((a, b) => a.d - b.d);
    if (inReach.length === 0 || this.state.carrying.length >= CARRY_CAPACITY) return false;
    if (this.time.now >= this.nextHarvestAt) {
      this.nextHarvestAt = this.time.now + HARVEST_INTERVAL_MS;
      this.showFeedback(harvest(this.state, inReach[0].i));
    }
    return true;
  }

  /** Swings the sickle in circles around the doctor while harvesting, and a moment after. */
  private spinSickle(harvesting: boolean, delta: number) {
    if (harvesting) this.lastHarvestingAt = this.time.now;
    const show = this.time.now - this.lastHarvestingAt < SICKLE_LINGER_MS;
    this.sickle.setVisible(show);
    if (!show) return;
    this.sickleAngle = (this.sickleAngle + delta * SICKLE_SPIN) % (Math.PI * 2);
    this.sickle
      .setPosition(
        this.player.x + Math.cos(this.sickleAngle) * SICKLE_ORBIT,
        this.player.y + Math.sin(this.sickleAngle) * SICKLE_ORBIT,
      )
      .setRotation(this.sickleAngle + Math.PI / 2)
      // In front of the doctor on the lower half of the circle, behind on the upper half.
      .setDepth(this.player.depth + Math.sin(this.sickleAngle));
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
    const feetY = this.feetY();
    const workingAt = this.workSpots.find((w) => w.zone.contains(this.player.x, feetY))?.station ?? null;
    tick(this.state, Math.min(delta, MAX_STEP_MS), workingAt);
    this.movePlayer();

    this.standOnMarkers();

    this.spinSickle(this.autoHarvest(), delta);

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
    } else if (this.pointerTarget) {
      // Steer the feet, not the sprite centre, to the tapped spot, via a corner if a station is in the way.
      const target = this.waypoint ?? this.pointerTarget;
      dir.set(target.x - this.player.x, target.y - this.feetY());
      if (this.waypoint && dir.length() < 6) {
        this.waypoint = this.routeAround(this.pointerTarget);
      } else if (!this.waypoint && dir.length() < 4) {
        this.pointerTarget = null;
          dir.set(0, 0);
      }
    }

    dir.normalize().scale(SPEED);
    this.player.setVelocity(dir.x, dir.y);
    this.animatePlayer(dir);
  }

  /**
   * When a station blocks the straight line from the doctor's feet to `to`, returns the corner of
   * that station to walk to first (the one making the shorter trip); otherwise null.
   */
  private routeAround(to: Phaser.Math.Vector2): Phaser.Math.Vector2 | null {
    const from = new Phaser.Math.Vector2(this.player.x, this.feetY());
    const blocks = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2, area: Phaser.Geom.Rectangle) =>
      Phaser.Geom.Intersects.LineToRectangle(new Phaser.Geom.Line(a.x, a.y, b.x, b.y), area);
    for (const area of this.blockedAreas) {
      if (area.contains(from.x, from.y) || area.contains(to.x, to.y) || !blocks(from, to, area)) continue;
      // Test against a slightly smaller area so lines along an edge or through a corner count as clear.
      const inner = new Phaser.Geom.Rectangle(area.x + 2, area.y + 2, area.width - 4, area.height - 4);
      const corners = [
        new Phaser.Math.Vector2(area.left, area.top),
        new Phaser.Math.Vector2(area.right, area.top),
        new Phaser.Math.Vector2(area.left, area.bottom),
        new Phaser.Math.Vector2(area.right, area.bottom),
      ].filter((c) => !blocks(from, c, inner));
      corners.sort((a, b) => from.distance(a) + a.distance(to) - (from.distance(b) + b.distance(to)));
      return corners[0] ?? null;
    }
    return null;
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
