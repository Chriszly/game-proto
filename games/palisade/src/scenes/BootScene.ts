import Phaser from 'phaser';
import { bakeCharacters, bakeMissiles } from '../art/characters';
import { bakeIcons } from '../art/icons';
import { bakeScenery } from '../art/scenery';
import { viewFrame, viewSize } from '../../../../shared/scaling';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // The background and bars are painted over the whole view, which may be bigger than 960x540.
    const { width, height } = viewSize(this);
    bakeScenery(this, width, height, viewFrame(this));
    bakeCharacters(this);
    bakeMissiles(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
