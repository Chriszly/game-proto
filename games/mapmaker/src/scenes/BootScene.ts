import Phaser from 'phaser';
import { bakeIcons } from '../art/icons';
import { applyTheme, sharpenArt } from '../art/paint';
import { bakeSurveyor } from '../art/surveyor';
import { loadTheme } from '../game/save';

// Paints the surveyor and the icons at runtime, so the game needs no asset files. The island
// itself is painted by GameScene, since it changes with every new isle. Switching the theme comes
// back here, so the icons are baked again in the new colours.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    sharpenArt();
    applyTheme(loadTheme());
    bakeSurveyor(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
