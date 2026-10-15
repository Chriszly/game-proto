import Phaser from 'phaser';
import { INK, fit, paint, rr, type Ctx } from './paint';

// The pixies that carry goods between the stations in place of conveyor belts: a little winged
// figure in a glow of fairy light, painted in two wing beats, and the faint trail of fairy dust
// along each route they fly.

export type Pt = { x: number; y: number };

/** How far apart, across a route, pixies carrying different kinds of goods fly. */
const LANE = 7;
/** How far from a route's middle pixies carrying the kind in lane `lane` of `lanes` fly, across it. */
export const laneOffset = (lane: number, lanes: number) => (lane - (lanes - 1) / 2) * LANE;

/** The pixie's two wing beats, by texture key. */
export const PIXIE_FRAMES = ['pixie-0', 'pixie-1'];

/** A pixie, 18x18 as shown: a soft glow, two pairs of wings up or down, and a small figure in green. */
function drawPixie(c: Ctx, frame: number) {
  const x = 9, y = 9;
  const glow = c.createRadialGradient(x, y, 0, x, y, 9);
  glow.addColorStop(0, 'rgba(255,246,190,0.75)');
  glow.addColorStop(1, 'rgba(255,246,190,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, 18, 18);
  // Wings: up on one beat, swept down on the other.
  const lift = frame === 0 ? -1 : 1;
  c.save();
  c.fillStyle = 'rgba(214,236,255,0.75)';
  c.strokeStyle = INK;
  c.lineWidth = 0.5;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + side * 4, y - 1 + lift * 2, 4, 2.2, side * (frame === 0 ? -0.6 : 0.5), 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.restore();
  // The body: a green dress, a round head and pale hair.
  c.fillStyle = '#7fc06a';
  c.beginPath();
  c.moveTo(x - 2.4, y + 4.5);
  c.lineTo(x, y - 0.5);
  c.lineTo(x + 2.4, y + 4.5);
  c.closePath();
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 0.6;
  c.stroke();
  c.fillStyle = '#f6dcc0';
  c.beginPath();
  c.arc(x, y - 2.2, 1.9, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#f2e08a';
  c.beginPath();
  c.arc(x, y - 3, 1.6, Math.PI, 0);
  c.fill();
}

export function bakePixies(scene: Phaser.Scene) {
  PIXIE_FRAMES.forEach((key, frame) => paint(scene, key, 18, 18, (c) => drawPixie(c, frame), 4));
}

let painted = 0;

/**
 * Paints the trails of fairy dust along `runs`, each a list of points joined by straight stretches,
 * and shows them as one image: a faint dotted line with a sparkle now and then. Destroying the
 * image frees its painting.
 */
export function drawFairyPaths(scene: Phaser.Scene, runs: Pt[][], depth: number) {
  const points = runs.flat();
  const pad = 8;
  const left = Math.min(...points.map((p) => p.x)) - pad, top = Math.min(...points.map((p) => p.y)) - pad;
  const right = Math.max(...points.map((p) => p.x)) + pad, bottom = Math.max(...points.map((p) => p.y)) + pad;
  const key = `fairy-paths-${painted++}`;
  paint(
    scene,
    key,
    right - left,
    bottom - top,
    (c) => {
      c.translate(-left, -top);
      for (const run of runs) {
        for (let i = 1; i < run.length; i++) {
          const a = run[i - 1], b = run[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          for (let d = 0; d < len; d += 9) {
            const px = a.x + ((b.x - a.x) * d) / len + rr(-1, 1), py = a.y + ((b.y - a.y) * d) / len + rr(-1, 1);
            c.fillStyle = `rgba(255,236,150,${rr(0.35, 0.6)})`;
            c.beginPath();
            c.arc(px, py, rr(0.8, 1.6), 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    },
    2,
    909,
  );
  const img = fit(scene.add.image(left, top, key).setOrigin(0).setDepth(depth));
  img.once(Phaser.GameObjects.Events.DESTROY, () => scene.textures.remove(key));
  return img;
}

/** The point `t` (0 to 1) of the way along a run of points, and the direction the run goes there. */
export function pointAlong(run: Pt[], t: number): Pt & { dx: number; dy: number } {
  const parts = run.slice(1).map((p, i) => ({ a: run[i], b: p, len: Math.hypot(p.x - run[i].x, p.y - run[i].y) }));
  let d = Math.max(0, Math.min(1, t)) * parts.reduce((sum, p) => sum + p.len, 0);
  for (const { a, b, len } of parts) {
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    if (d <= len) return { x: a.x + dx * d, y: a.y + dy * d, dx, dy };
    d -= len;
  }
  const { a, b, len } = parts[parts.length - 1];
  return { ...b, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}
