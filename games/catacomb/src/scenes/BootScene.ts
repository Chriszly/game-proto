import Phaser from 'phaser';
import { bakeCardFrames } from '../art/cardFrames';
import { bakeCharacters } from '../art/characters';
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
    bakeIcons(this);
    bakeCardFrames(this);
    this.scene.start('Game');
  }
}
