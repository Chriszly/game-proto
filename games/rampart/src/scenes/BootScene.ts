import Phaser from 'phaser';
import { bakeCharacters, bakeMissiles } from '../art/characters';
import { bakeIcons } from '../art/icons';
import { bakeScenery } from '../art/scenery';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeCharacters(this);
    bakeMissiles(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
