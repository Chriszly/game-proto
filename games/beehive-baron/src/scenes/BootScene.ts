import Phaser from 'phaser';
import { bakeBees } from '../art/bees';
import { bakeScenery } from '../art/scenery';

// Paints all the cut-paper textures on canvases at startup, so the game needs no asset files.
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
