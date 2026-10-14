import Phaser from 'phaser';

// Nothing to load: every texture is painted on canvases by the art modules, which `GameScene`
// calls when it starts (the comic at once, night vision the first time it is switched to).
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Game');
  }
}
