import Phaser from 'phaser';
import { bakeDoctor } from '../art/doctor';
import { bakeItems } from '../art/items';
import { bakePlaceholders } from '../art/placeholders';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeDoctor(this);
    bakePlaceholders(this);
    bakeItems(this);

    this.scene.start('Game');
  }
}
