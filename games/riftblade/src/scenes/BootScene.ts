import Phaser from 'phaser';
import { bakeSprites } from '../art/sprites';
import { bakeFactions } from '../art/factions';
import { bakeKnights } from '../art/knights';
import { bakeSquad } from '../art/squad';

/** Paints every texture on canvases at runtime, so the game needs no asset files. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeSprites(this);
    bakeFactions(this);
    bakeKnights(this);
    bakeSquad(this);
    this.scene.start('Game');
  }
}
