import Phaser from 'phaser';
import { bakeFoes } from '../art/foes';
import { bakeHud } from '../art/hud';
import { bakeIcons } from '../art/icons';
import { bakeKnight } from '../art/knight';
import { bakeScenery } from '../art/scenery';

// Paints every texture on canvases at runtime, so the game needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeFoes(this);
    bakeKnight(this);
    bakeIcons(this);
    bakeHud(this);
    this.scene.start('Game');
  }
}
