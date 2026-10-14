import Phaser from 'phaser';
import { bakeIcons } from '../art/icons';
import { bakeSurveyor } from '../art/surveyor';
import { bakeTiles } from '../art/tiles';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeTiles(this);
    bakeSurveyor(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
