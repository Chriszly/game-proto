import Phaser from 'phaser';
import { bakeFoes } from '../art/foes';
import { bakeIcons } from '../art/icons';
import { bakeKnight } from '../art/knight';
import { bakeScenery } from '../art/scenery';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeFoes(this);
    bakeKnight(this);
    bakeIcons(this);
    this.scene.start('Game');
  }
}
