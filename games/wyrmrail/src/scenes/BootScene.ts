import Phaser from 'phaser';
import { bakeScenery } from '../art/scenery';
import { bakeSprites } from '../art/sprites';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeSprites(this);
    this.scene.start('Game');
  }
}
