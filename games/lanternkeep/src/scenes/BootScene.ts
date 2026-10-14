import Phaser from 'phaser';
import { bakeGlow } from '../art/sprites';

// Bakes the one texture the scene needs, the lantern glow, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeGlow(this);
    this.scene.start('Game');
  }
}
