import Phaser from 'phaser';
import { BUILDINGS, FACTION_IDS, TILE, UNITS, type BuildingId, type FactionId } from '../game/data';
import { bakeBuilding, bakeBush, bakeMine, bakeTree, bakeUnit } from '../art/sprites';

/** Texture keys: `unit-<type>`, `bld-<faction>-<building>`, `tree-0`, `tree-1`, `bush`, `mine`. The terrain is baked by the game, since each match has its own map. */
export const unitKey = (type: string) => `unit-${type}`;
export const buildingKey = (faction: FactionId, type: BuildingId) => `bld-${faction}-${type}`;

/** Bakes every texture once, so the game itself only places sprites. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    for (const v of [0, 1]) this.bakeCanvas(`tree-${v}`, TILE, TILE, (ctx) => bakeTree(ctx, v));
    this.bakeCanvas('bush', TILE, TILE, bakeBush);
    this.bakeCanvas('mine', TILE * 2, TILE * 2, bakeMine);
    this.bakeCanvas(unitKey('villager'), 48, 48, (ctx) => bakeUnit(ctx, 'villager', 'neutral'));
    for (const faction of FACTION_IDS) {
      for (const role of ['melee', 'ranged', 'cavalry'] as const) {
        const type = Object.values(UNITS).find((u) => u.faction === faction && u.role === role)!.id;
        this.bakeCanvas(unitKey(type), 48, 48, (ctx) => bakeUnit(ctx, role, faction));
      }
      for (const type of Object.keys(BUILDINGS) as BuildingId[]) {
        const def = BUILDINGS[type];
        this.bakeCanvas(buildingKey(faction, type), def.w * TILE, def.h * TILE, (ctx) => bakeBuilding(ctx, type, faction));
      }
    }
    this.scene.start('Menu');
  }

  private bakeCanvas(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return;
    paint(tex.getContext());
    tex.refresh();
  }
}
