import Phaser from 'phaser';
import { bakeTiles } from '../art/tiles';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeTiles(this);
    this.scene.start('Game');
  }
}
