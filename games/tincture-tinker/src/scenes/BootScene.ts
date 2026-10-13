import Phaser from 'phaser';
import { bakeItems } from '../art/items';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeItems(this);
    this.scene.start('Game');
  }
}
