// A small software renderer for the low-poly meshes: turn the model to a heading, tilt it toward
// the viewer, light it from the top left and paint the faces back to front (painter's order) onto
// a 2D canvas. Each face is filled with a soft airbrushed gradient; chrome reflects a painted sky
// and horizon, like the hulls on a 1970s paperback cover. Glowing faces bloom with a canvas shadow.

import { faceNormal, norm, type Mesh, type V3 } from './mesh';

export type MatKind = 'paint' | 'chrome' | 'glow' | 'glass';
export interface Material {
  kind: MatKind;
  color: number;
  /** How shiny a painted face is (0 to 1). */
  spec?: number;
}
export type Materials = Record<string, Material>;

/** How the camera looks at every model: tilted this far from straight down, toward the south. */
export const TILT = 0.62;
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);
/** Toward the viewer, in map space (y is south, z is up). */
const VIEW: V3 = [0, SIN_T, COS_T];
/** The key light: from the upper left of the screen and above. */
const LIGHT: V3 = norm([-0.55, -0.45, 0.72]);

export interface View {
  /** The heading: 0 faces east (+x on screen), turning clockwise like Math.atan2 on screen. */
  yaw: number;
  /** Pixels per model unit. */
  scale: number;
  cx: number;
  cy: number;
}

type RGB = [number, number, number];
const rgb = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const css = (c: RGB, a = 1) =>
  `rgba(${Math.max(0, Math.min(255, Math.round(c[0])))},${Math.max(0, Math.min(255, Math.round(c[1])))},${Math.max(0, Math.min(255, Math.round(c[2])))},${a})`;

// The painted world a chrome hull reflects: a creamy sky, a dark horizon line and a warm desert.
const SKY_HIGH = rgb(0xbcd6f2);
const SKY_LOW = rgb(0xfff6e2);
const HORIZON = rgb(0x3a2232);
const GROUND_NEAR = rgb(0xb0623a);
const GROUND_FAR = rgb(0xf0b46a);

function chrome(r: V3): RGB {
  // How far the reflected ray points up into the sky (north and above) or down to the ground.
  const h = r[2] * 0.55 - r[1] * 0.85;
  if (h > 0.08) return mix(SKY_LOW, SKY_HIGH, Math.min(1, (h - 0.08) / 0.9));
  if (h > -0.04) return mix(HORIZON, SKY_LOW, (h + 0.04) / 0.12);
  return mix(GROUND_FAR, GROUND_NEAR, Math.min(1, -h / 0.8));
}

interface Painted {
  pts: [number, number][];
  depth: number;
  fill: RGB;
  glow: boolean;
  bright: number;
}

/**
 * Paints `mesh` on `ctx` seen from `view`. Returns where the brightest highlight landed, for a
 * sparkle glint, or null when nothing shone.
 */
export function renderMesh(ctx: CanvasRenderingContext2D, mesh: Mesh, mats: Materials, view: View): { x: number; y: number } | null {
  const c = Math.cos(view.yaw);
  const s = Math.sin(view.yaw);
  const pv = mesh.v.map(([x, y, z]): V3 => [x * c - y * s, x * s + y * c, z]);
  const screen = pv.map(([gx, gy, z]): [number, number] => [view.cx + gx * view.scale, view.cy + (gy * COS_T - z * SIN_T) * view.scale]);
  const faces: Painted[] = [];
  let glint: { x: number; y: number; k: number } | null = null;
  for (const f of mesh.f) {
    const n = faceNormal(pv, f.i);
    const facing = n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2];
    if (facing <= 0.001) continue;
    const mat = mats[f.m] ?? { kind: 'paint', color: 0xff00ff };
    const base = rgb(mat.color);
    const lambert = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    // Reflect the view about the normal, for chrome and the specular highlight.
    const r: V3 = [2 * facing * n[0] - VIEW[0], 2 * facing * n[1] - VIEW[1], 2 * facing * n[2] - VIEW[2]];
    const specDot = Math.max(0, r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2]);
    let fill: RGB;
    let bright = 0;
    if (mat.kind === 'glow') {
      fill = mix(base, [255, 255, 255], 0.25);
    } else if (mat.kind === 'chrome') {
      // A tinted mirror: the painted world times the metal's colour, plus a little of its own shade.
      const env = chrome(r);
      const tint = mix([255, 255, 255], base, 0.75);
      fill = add(mul([(env[0] * tint[0]) / 255, (env[1] * tint[1]) / 255, (env[2] * tint[2]) / 255], 0.82), mul(base, 0.18 * (0.4 + lambert)));
      bright = Math.pow(specDot, 18);
      fill = mix(fill, [255, 255, 255], bright * 0.8);
    } else {
      const spec = mat.spec ?? (mat.kind === 'glass' ? 0.9 : 0.35);
      const shade = 0.42 + 0.7 * lambert;
      bright = Math.pow(specDot, mat.kind === 'glass' ? 30 : 14) * spec;
      fill = mix(mul(base, shade), [255, 250, 235], Math.min(1, bright));
    }
    const pts = f.i.map((k) => screen[k]);
    let depth = 0;
    for (const k of f.i) depth += pv[k][1] * SIN_T + pv[k][2] * COS_T;
    faces.push({ pts, depth: depth / f.i.length, fill, glow: mat.kind === 'glow', bright });
    if (bright > 0.5 && (!glint || bright > glint.k)) {
      const cxp = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const cyp = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      glint = { x: cxp, y: cyp, k: bright };
    }
  }
  faces.sort((a, b) => a.depth - b.depth);
  ctx.save();
  ctx.lineJoin = 'round';
  for (const face of faces) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of face.pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    // The airbrush: each face fades from lit (top left) to shaded (bottom right).
    const grad = ctx.createLinearGradient(x0, y0, x1 + 0.01, y1 + 0.01);
    const lift = face.glow ? 0.2 : 0.16;
    grad.addColorStop(0, css(mix(face.fill, [255, 248, 230], lift)));
    grad.addColorStop(1, css(mul(face.fill, face.glow ? 0.95 : 0.8)));
    ctx.beginPath();
    face.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (face.glow) {
      ctx.shadowColor = css(face.fill, 0.9);
      ctx.shadowBlur = 6 * view.scale;
    }
    ctx.fillStyle = grad;
    ctx.fill();
    // A hairline of the same colour closes the seams between faces.
    ctx.strokeStyle = css(mul(face.fill, 0.86));
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  return glint;
}

/** A four-pointed sparkle, the glint on chrome and the twinkle of a bright star. */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  const t = r * 0.13;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + t, y - t, x + r, y);
  ctx.quadraticCurveTo(x + t, y + t, x, y + r);
  ctx.quadraticCurveTo(x - t, y + t, x - r, y);
  ctx.quadraticCurveTo(x - t, y - t, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** How far a model reaches from its origin, in model units, so its frame can be sized to fit. */
export function reach(mesh: Mesh) {
  let r = 0;
  let zt = 0;
  for (const [x, y, z] of mesh.v) {
    r = Math.max(r, Math.hypot(x, y));
    zt = Math.max(zt, Math.abs(z));
  }
  return { r, z: zt };
}

export { css, rgb };
