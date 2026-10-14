import Phaser from 'phaser';
import { bakeValley } from '../art/valley';
import { bakeSprites } from '../art/sprites';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeValley(this);
    bakeSprites(this);
    this.scene.start('Game');
  }
}
