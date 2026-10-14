// Hits and drop-offs you can feel: sparks of ochre stitches, arrows in flight, damage numbers and
// "+10" badges over a drop-off. Everything lives in world space, under the fog. With reduce motion
// on, sparks and arrows are skipped and numbers and badges stay still while they fade.
import Phaser from 'phaser';
import { TILE } from '../game/data';
import { hexNum, SERIF, T } from '../art/stitch';
import { settings } from '../../../../shared/settings';

const FX_DEPTH = 4985;
const MAX_FLOATERS = 36;

interface Flash {
  kind: 'spark' | 'arrow';
  x: number;
  y: number;
  x0: number;
  y0: number;
  t: number;
  dur: number;
}

export class Effects {
  private g: Phaser.GameObjects.Graphics;
  private flashes: Flash[] = [];
  private floaters = 0;

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(FX_DEPTH);
  }

  /** A blow or shot landing at tile point (x, y), from (fromX, fromY). */
  hit(x: number, y: number, fromX: number, fromY: number, dmg: number, ranged: boolean) {
    const px = x * TILE;
    const py = y * TILE - 12;
    if (!settings.reduceMotion) {
      if (ranged) this.flashes.push({ kind: 'arrow', x: px, y: py, x0: fromX * TILE, y0: fromY * TILE - 18, t: 0, dur: 200 });
      this.flashes.push({ kind: 'spark', x: px, y: py, x0: px, y0: py, t: 0, dur: 260 });
    }
    if (this.floaters >= MAX_FLOATERS) return;
    const text = `-${Number.isInteger(dmg) ? dmg : dmg.toFixed(1)}`;
    const t = this.scene.add
      .text(px + 6, py - 6, text, { fontFamily: SERIF, fontSize: '12px', fontStyle: 'bold', color: T.red, stroke: T.linen, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(FX_DEPTH + 1);
    this.float(t, 16, 800);
  }

  /** A drop-off badge: "+10" with the resource's icon, over the villager. */
  drop(x: number, y: number, res: string, n: number) {
    if (this.floaters >= MAX_FLOATERS) return;
    const px = x * TILE;
    const py = y * TILE - 44;
    const c = this.scene.add.container(px, py).setDepth(FX_DEPTH + 2);
    c.add(this.scene.add.image(0, 0, 'card-pop'));
    c.add(this.scene.add.image(-14, 0, `icon-${res}`).setScale(0.8));
    c.add(this.scene.add.text(4, 0.5, `+${n}`, { fontFamily: SERIF, fontSize: '12px', fontStyle: 'bold', color: T.green }).setOrigin(0.5, 0.5));
    this.float(c, 18, 1200);
  }

  private float(o: Phaser.GameObjects.Text | Phaser.GameObjects.Container, rise: number, ms: number) {
    this.floaters++;
    const still = settings.reduceMotion;
    this.scene.tweens.add({
      targets: o,
      y: o.y - (still ? 0 : rise),
      alpha: { from: 1, to: 0 },
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.floaters--;
        o.destroy();
      },
    });
  }

  update(dt: number) {
    const g = this.g.clear();
    this.flashes = this.flashes.filter((f) => (f.t += dt) < f.dur);
    for (const f of this.flashes) {
      const p = f.t / f.dur;
      if (f.kind === 'spark') {
        // Eight ochre stitches bursting out, long and short by turns.
        g.lineStyle(1.2, hexNum(T.ochre), 1 - p * 0.6);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.2;
          const r = (i % 2 ? 4 : 7) * (0.5 + p);
          g.lineBetween(f.x + Math.cos(a) * 1.5, f.y + Math.sin(a) * 1.5, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
        }
      } else {
        const x = f.x0 + (f.x - f.x0) * p;
        const y = f.y0 + (f.y - f.y0) * p - Math.sin(p * Math.PI) * 10;
        const a = Math.atan2(f.y - f.y0 - Math.cos(p * Math.PI) * 10, f.x - f.x0);
        g.lineStyle(1, hexNum(T.brown), 1).lineBetween(x - Math.cos(a) * 8, y - Math.sin(a) * 8, x, y);
        g.fillStyle(hexNum(T.grey), 1).fillTriangle(
          x + Math.cos(a) * 3,
          y + Math.sin(a) * 3,
          x + Math.cos(a + 2.5) * 2.5,
          y + Math.sin(a + 2.5) * 2.5,
          x + Math.cos(a - 2.5) * 2.5,
          y + Math.sin(a - 2.5) * 2.5,
        );
      }
    }
  }
}
