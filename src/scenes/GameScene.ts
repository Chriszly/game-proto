import Phaser from 'phaser';

const SPEED = 160;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Phaser.Math.Vector2 | null = null;

  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 24, 'Apothecary prototype: move with WASD, arrows, or tap', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f3e9d2',
      })
      .setOrigin(0.5, 0);

    this.player = this.physics.add.sprite(width / 2, height / 2, 'player');
    this.player.setCollideWorldBounds(true);

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
      dir.set(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.player.y);
      if (dir.length() < 4) {
        this.pointerTarget = null;
        dir.set(0, 0);
      }
    }

    dir.normalize().scale(SPEED);
    this.player.setVelocity(dir.x, dir.y);
  }
}
