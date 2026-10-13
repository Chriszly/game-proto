import Phaser from 'phaser';
import { bakeBees } from '../art/bees';
import { bakeScenery } from '../art/scenery';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeBees(this);
    this.scene.start('Game');
  }
}
