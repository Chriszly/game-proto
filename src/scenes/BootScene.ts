import Phaser from 'phaser';
import { bakeDoctor } from '../art/doctor';
import { bakeGarden } from '../art/garden';
import { bakeItems } from '../art/items';
import { bakeMarkers } from '../art/markers';
import { bakeStations } from '../art/stations';
import { bakeTownsfolk } from '../art/townsfolk';

// Generates all textures at runtime so the prototype needs no asset files yet.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    bakeDoctor(this);
    bakeItems(this);
    bakeGarden(this);
    bakeStations(this);
    bakeMarkers(this);
    bakeTownsfolk(this);

    this.scene.start('Game');
  }
}
