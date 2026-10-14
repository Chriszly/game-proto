import Phaser from 'phaser';
import { bakeTextures } from '../art/puppet';

// Paints every texture once (src/art/puppet.ts), then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeTextures(this);
    this.scene.start('Game');
  }
}
