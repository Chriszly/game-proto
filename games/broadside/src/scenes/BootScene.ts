import Phaser from 'phaser';
import { bakeAll } from '../art/art';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeAll(this);
    this.scene.start('Game');
  }
}
