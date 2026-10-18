import Phaser from 'phaser';
import { bakeAll } from '../art/art';
import { fitLayout } from './layout';
import { viewSize } from '../../../../shared/scaling';

// Lays the screen out for the view's shape and paints every texture at startup, so the prototype
// needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const { width, height } = viewSize(this);
    fitLayout(width, height);
    bakeAll(this);
    this.scene.start('Game');
  }
}
