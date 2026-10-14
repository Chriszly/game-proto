import Phaser from 'phaser';
import { bakeAll } from '../art/art';

// Paints every texture at startup, so the prototype needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeAll(this);
    this.scene.start('Game');
  }
}
