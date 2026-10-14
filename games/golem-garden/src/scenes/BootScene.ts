import Phaser from 'phaser';
import { bakeTextures } from '../art/textures';

// Paints every clay texture at startup, so the game needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeTextures(this);
    this.scene.start('Game');
  }
}
