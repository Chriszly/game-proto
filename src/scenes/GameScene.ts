import Phaser from 'phaser';
import { plantTexture } from '../art/placeholders';
import { createInitialState, type GameState } from '../game/state';
import { CAULDRON, COUNTER, GARDEN, HUD_HEIGHT, REFINER, SHOP, plotPosition } from './layout';

const SPEED = 160;
const PLAYER_SCALE = 3;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('Game');
  }

  create() {
    this.state = createInitialState();
    this.physics.world.setBounds(0, HUD_HEIGHT, this.scale.width, this.scale.height - HUD_HEIGHT);
    this.obstacles = this.physics.add.staticGroup();

    this.drawGrounds();
    this.createPlots();
    this.createStations();
    this.createPlayer();
    this.createControls();
  }

  private drawGrounds() {
    const g = this.add.graphics().setDepth(-1000);
    // Garden: tilled earth inside a picket fence.
    g.fillStyle(0x4f6e35).fillRect(GARDEN.x, GARDEN.y, GARDEN.w, GARDEN.h);
    g.lineStyle(4, 0xa88a5c).strokeRect(GARDEN.x, GARDEN.y, GARDEN.w, GARDEN.h);
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
    label(GARDEN.x + GARDEN.w / 2, GARDEN.y + 14, 'Backyard garden');
    label(REFINER.x, REFINER.y - 50, 'Refining table');
    label(CAULDRON.x, CAULDRON.y - 54, 'Cauldron');
    label(SHOP.x + SHOP.w / 2, SHOP.y + 14, 'Storefront');
  }

  private createPlots() {
    this.state.plots.forEach((plot, i) => {
      const { x, y } = plotPosition(i);
      this.add.image(x, y, 'plot').setDepth(-500);
      this.add.image(x, y + 10, plantTexture(plot.plant, 2)).setOrigin(0.5, 1).setDepth(y);
    });
  }

  private createStations() {
    this.addObstacle(REFINER.x, REFINER.y, 'table', 84, 30);
    this.addObstacle(CAULDRON.x, CAULDRON.y, 'cauldron', 60, 28);
    this.addObstacle(COUNTER.x, COUNTER.y, 'counter', 200, 30);
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

    // Touch / click to walk, so the same controls work on phones.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerTarget = new Phaser.Math.Vector2(p.worldX, p.worldY);
    });
  }

  update() {
    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.wasd.left.isDown) dir.x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dir.x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dir.y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dir.y += 1;

    if (dir.lengthSq() > 0) {
      this.pointerTarget = null;
    } else if (this.pointerTarget) {
      // Steer the feet, not the sprite centre, to the tapped spot.
      dir.set(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.feetY());
      if (dir.length() < 4) {
        this.pointerTarget = null;
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
