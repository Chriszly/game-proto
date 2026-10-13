import Phaser from 'phaser';
import { DOCTOR_FRAMES, DOCTOR_PALETTE } from '../art/doctor';
import { bakePixelArt } from '../art/pixelArt';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    for (const [key, rows] of Object.entries(DOCTOR_FRAMES)) {
      bakePixelArt(this, key, rows, DOCTOR_PALETTE);
    }
    this.anims.create({
      key: 'doctor-walk',
      frames: [{ key: 'doctor-stride' }, { key: 'doctor-idle' }, { key: 'doctor-pass' }, { key: 'doctor-idle' }],
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('Game');
  }
}
