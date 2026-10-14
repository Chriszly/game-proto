import Phaser from 'phaser';

// The low-poly look: every object is a few flat polygons drawn with Phaser Graphics, each in one of
// a material's tones. The light comes from the upper left, so the faces that turn towards it are
// lit and the faces that turn away are shaded. Art is drawn in units of `k` screen pixels, so a
// sprite's points can be written as small numbers.

export type Pt = [number, number];
export type Canvas = Phaser.GameObjects.Graphics;

export const INK = 0x1a1216;

/** A material's tones: `lit` faces the light, `mid` and `shade` turn away, `dark` is for gaps and deep shadow. */
export interface Tones {
  lit: number;
  mid: number;
  shade: number;
  dark: number;
}

export const MAT: Record<'steel' | 'iron' | 'wood' | 'stone' | 'grass' | 'earth' | 'gold' | 'tabard' | 'goblin' | 'bat' | 'fire' | 'red' | 'cloth', Tones> = {
  steel: { lit: 0xe4e8f2, mid: 0xaab2c4, shade: 0x6e7790, dark: 0x3e4458 },
  iron: { lit: 0xbcb9cc, mid: 0x85839a, shade: 0x5a5766, dark: 0x302e3a },
  wood: { lit: 0xb07a46, mid: 0x7e5130, shade: 0x553419, dark: 0x3a2212 },
  stone: { lit: 0x7f788c, mid: 0x625b6e, shade: 0x46404f, dark: 0x2c2734 },
  grass: { lit: 0x7cb04e, mid: 0x55873a, shade: 0x35582a, dark: 0x1f3217 },
  earth: { lit: 0x7f5d3c, mid: 0x5e442b, shade: 0x42301f, dark: 0x27190f },
  gold: { lit: 0xffe48f, mid: 0xe6b64e, shade: 0xa8762a, dark: 0x6b4716 },
  tabard: { lit: 0x6f9ff2, mid: 0x3f70cc, shade: 0x2c4f96, dark: 0x1a3263 },
  goblin: { lit: 0xaad466, mid: 0x78a63e, shade: 0x4e7128, dark: 0x2c4418 },
  bat: { lit: 0xb79ce8, mid: 0x8459ba, shade: 0x5c3c88, dark: 0x352254 },
  fire: { lit: 0xfff3c0, mid: 0xffc54a, shade: 0xf07a2e, dark: 0xb2362e },
  red: { lit: 0xf06a5e, mid: 0xc8413f, shade: 0x8f2a30, dark: 0x5a1a20 },
  cloth: { lit: 0xf4ecd6, mid: 0xd8cfb0, shade: 0xa39a7e, dark: 0x6e6650 },
};

/** The tone a face gets from how far it turns towards the light: `t` is 1 facing straight at it, -1 away. */
export function toneOf(m: Tones, t: number) {
  if (t > 0.45) return m.lit;
  if (t > -0.1) return m.mid;
  if (t > -0.55) return m.shade;
  return m.dark;
}

/** Scales art points by `k` into the points Phaser draws. */
export const pts = (list: Pt[], k = 1) => list.map(([x, y]) => new Phaser.Math.Vector2(x * k, y * k));

/** A flat polygon in one colour. */
export function poly(g: Canvas, list: Pt[], color: number, k = 1, alpha = 1) {
  g.fillStyle(color, alpha).fillPoints(pts(list, k), true, true);
}

/** A thin dark edge round a polygon, so a silhouette reads against the dusk. */
export function edge(g: Canvas, list: Pt[], k = 1, width = 1, color = INK, alpha = 0.85) {
  g.lineStyle(width, color, alpha).strokePoints(pts(list, k), true, true);
}

/** An ellipse as a ring of `n` points, so it can be split into flat facets. */
export function ring(cx: number, cy: number, rx: number, ry: number, n = 8): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt;
  });
}

/**
 * A faceted round shape: a ring of `n` triangles fanned from its centre, each coloured by the
 * direction it faces, so a helmet, coin or bat's body reads as a rounded solid under the light.
 */
export function disk(g: Canvas, m: Tones, cx: number, cy: number, rx: number, ry: number, k = 1, n = 8) {
  const r = ring(cx, cy, rx, ry, n);
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    // Facing towards the upper left light is the direction (-1, -1); a face turned that way is lit.
    const t = -(Math.cos(a) + Math.sin(a)) * Math.SQRT1_2;
    poly(g, [[cx, cy], r[i], r[(i + 1) % n]], toneOf(m, t), k);
  }
}

/** A box split into a lit front and a shaded side, with a lit top strip. */
export function slab(g: Canvas, m: Tones, x: number, y: number, w: number, h: number, k = 1) {
  poly(g, [[x, y], [x + w * 0.6, y], [x + w * 0.6, y + h], [x, y + h]], m.mid, k);
  poly(g, [[x + w * 0.6, y], [x + w, y], [x + w, y + h], [x + w * 0.6, y + h]], m.shade, k);
  poly(g, [[x, y], [x + w * 0.6, y], [x + w * 0.6, y + Math.min(2, h / 3)], [x, y + Math.min(2, h / 3)]], m.lit, k);
}

/** A limb as a quad of width `w` from one joint to another, lit on the side the light reaches. */
export function limb(g: Canvas, color: number, a: Pt, b: Pt, w: number, k = 1) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * (w / 2);
  const oy = (dx / len) * (w / 2);
  poly(g, [[a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy], [a[0] - ox, a[1] - oy]], color, k);
}

/**
 * A soft drop shadow: a few flat ellipses stacked from wide and faint to narrow and darker, so the
 * edge fades out. `rx` is the half-width on the ground, `alpha` the darkest of it.
 */
export function softShadow(g: Canvas, x: number, y: number, rx: number, alpha: number) {
  const ry = Math.max(2, rx * 0.22);
  for (const [scale, a] of [
    [1, 0.35],
    [0.72, 0.4],
    [0.42, 0.5],
  ] as const) {
    g.fillStyle(INK, alpha * a).fillEllipse(x, y, rx * 2 * scale, ry * 2 * scale);
  }
}

/** Draws a sprite's art into a texture of `w` x `h` screen pixels. */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Canvas) => void) {
  const g = scene.add.graphics();
  draw(g);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  g.generateTexture(key, w, h);
  g.destroy();
}
