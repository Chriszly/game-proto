import Phaser from 'phaser';

// Generates placeholder textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makePlaceholder('player', 0x2b2b2b, 24, 32);
    this.scene.start('Game');
  }

  private makePlaceholder(key: string, color: number, width: number, height: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}
