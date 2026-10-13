import Phaser from 'phaser';
import { bakeAdventurers } from '../art/characters';
import { bakeScenery } from '../art/scenery';
import { bakeSwords } from '../art/swords';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeSwords(this);
    bakeAdventurers(this);
    this.scene.start('Game');
  }
}
