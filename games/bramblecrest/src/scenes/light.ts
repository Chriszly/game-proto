// The night over the world: a blue dark laid over the view with holes where lamps, windows,
// braziers, glowing mushrooms and the knight's lantern shine, and a warm glow added on top. Both are
// small canvases redrawn every frame and stretched over the view, which keeps the light soft. A
// haze at the top and bottom edges of the view gives the tabletop-miniature look.

import Phaser from 'phaser';
import { paint } from '../art/paint';
import { viewSize } from '../../../../shared/scaling';

export interface Light {
  x: number;
  y: number;
  /** Reach in pixels. */
  r: number;
  /** The glow's colour, as r, g, b. */
  col: [number, number, number];
  /** 0 to 1: how much of the dark it lifts and how bright its glow is. */
  power: number;
}

/** The night's canvases are this wide; their height follows the view's shape, so lights stay round. */
const W = 320;

export class NightLight {
  private dark: Phaser.Textures.CanvasTexture;
  private glow: Phaser.Textures.CanvasTexture;
  private H: number;

  constructor(scene: Phaser.Scene) {
    const view = viewSize(scene);
    const H = (this.H = Math.round((W * view.height) / view.width));
    for (const key of ['night-dark', 'night-glow']) if (scene.textures.exists(key)) scene.textures.remove(key);
    this.dark = scene.textures.createCanvas('night-dark', W, H)!;
    this.glow = scene.textures.createCanvas('night-glow', W, H)!;
    scene.add.image(0, 0, 'night-dark').setOrigin(0).setScrollFactor(0).setDisplaySize(view.width, view.height).setDepth(9000);
    scene.add.image(0, 0, 'night-glow').setOrigin(0).setScrollFactor(0).setDisplaySize(view.width, view.height).setDepth(9001).setBlendMode(Phaser.BlendModes.ADD);
    // The miniature's haze: the near and far edges of the view fade into the night.
    paint(scene, 'haze', 8, 270, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 270);
      g.addColorStop(0, 'rgba(8,12,34,0.7)');
      g.addColorStop(0.22, 'rgba(8,12,34,0)');
      g.addColorStop(0.8, 'rgba(8,12,34,0)');
      g.addColorStop(1, 'rgba(8,12,34,0.55)');
      c.fillStyle = g;
      c.fillRect(0, 0, 8, 270);
    }, 1);
    scene.add.image(0, 0, 'haze').setOrigin(0).setScrollFactor(0).setDisplaySize(view.width, view.height).setDepth(9002);
  }

  /** Redraws the night for the part of the world in `view`. */
  draw(view: Phaser.Geom.Rectangle, lights: Light[], darkness: number) {
    // The camera has no size until its first frame.
    if (!(view.width > 0 && view.height > 0)) return;
    const H = this.H;
    const sx = W / view.width;
    const sy = H / view.height;
    const d = this.dark.context;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(6,10,32,${darkness})`;
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const g = this.glow.context;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const x = (l.x - view.x) * sx;
      const y = (l.y - view.y) * sy;
      const r = l.r * sx;
      if (x < -r || y < -r || x > W + r || y > H + r) continue;
      const hole = d.createRadialGradient(x, y, 0, x, y, r);
      hole.addColorStop(0, `rgba(0,0,0,${0.95 * l.power})`);
      hole.addColorStop(0.5, `rgba(0,0,0,${0.55 * l.power})`);
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = hole;
      d.fillRect(x - r, y - r, r * 2, r * 2);
      const [cr, cg, cb] = l.col;
      const warm = g.createRadialGradient(x, y, 0, x, y, r * 0.8);
      warm.addColorStop(0, `rgba(${cr},${cg},${cb},${0.32 * l.power})`);
      warm.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.fillStyle = warm;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    this.dark.refresh();
    this.glow.refresh();
  }
}
