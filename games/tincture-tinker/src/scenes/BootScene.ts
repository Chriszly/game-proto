import Phaser from 'phaser';
import { bakeTextures } from '../art/textures';

// Paints every texture at runtime on 2D canvases, so the game needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeTextures(this);
    this.scene.start('Game');
  }
}
