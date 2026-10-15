import Phaser from 'phaser';
import { bakeAdventurers } from '../art/characters';
import { bakeScenery } from '../art/scenery';
import { bakeSwords } from '../art/swords';
import { bakeUi } from '../art/ui';
import { FORGE_BUTTON, ROW_BUTTON, UPGRADE_BUTTONS } from './layout';

// Paints all textures on canvases at startup, so the game needs no asset files.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeScenery(this);
    bakeSwords(this);
    bakeAdventurers(this);
    bakeUi(this, { forge: FORGE_BUTTON, upgrade: UPGRADE_BUTTONS, row: ROW_BUTTON });
    this.scene.start('Game');
  }
}
