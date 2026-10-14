import Phaser from 'phaser';
import { bakeIcons } from '../art/icons';
import { bakeSurveyor } from '../art/surveyor';

// Paints the surveyor and the icons at runtime, so the game needs no asset files. The island
// itself is painted by GameScene, since it changes with every new isle.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeSurveyor(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
