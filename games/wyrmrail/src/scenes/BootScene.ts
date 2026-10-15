import Phaser from 'phaser';
import { bakeProps } from '../art/valley';
import { bakeSprites } from '../art/sprites';

// Generates the textures at runtime so the prototype needs no asset files yet. The valley itself
// is baked by GameScene for each new game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeProps(this);
    bakeSprites(this);
    this.scene.start('Game');
  }
}
