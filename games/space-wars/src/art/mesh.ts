// A tiny low-poly modelling kit: meshes are vertex and face lists built from a few primitives
// (boxes, tubes, ellipsoids, extruded outlines), then moved, turned and merged. Models face +x
// (the nose), +y is starboard and +z is up, in display pixels. No Phaser and no randomness here.

export type V3 = [number, number, number];
/** The look of a face: a key into the renderer's material table. */
export type Mat = string;
export interface Face {
  i: number[];
  m: Mat;
}
export interface Mesh {
  v: V3[];
  f: Face[];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** A face's normal by Newell's method, following the right-hand rule of its winding. */
export function faceNormal(v: V3[], idx: number[]): V3 {
  const n: V3 = [0, 0, 0];
  for (let k = 0; k < idx.length; k++) {
    const a = v[idx[k]];
    const b = v[idx[(k + 1) % idx.length]];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm(n);
}

function centroid(pts: V3[]): V3 {
  const c: V3 = [0, 0, 0];
  for (const p of pts) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / pts.length, c[1] / pts.length, c[2] / pts.length];
}

/** Turns every face of a convex part to face outward from its centre. */
function outward(mesh: Mesh): Mesh {
  const c = centroid(mesh.v);
  for (const f of mesh.f) {
    const fc = centroid(f.i.map((k) => mesh.v[k]));
    if (dot(faceNormal(mesh.v, f.i), sub(fc, c)) < 0) f.i.reverse();
  }
  return mesh;
}

export function merge(...parts: Mesh[]): Mesh {
  const out: Mesh = { v: [], f: [] };
  for (const p of parts) {
    const base = out.v.length;
    out.v.push(...p.v.map((q): V3 => [q[0], q[1], q[2]]));
    out.f.push(...p.f.map((f) => ({ i: f.i.map((k) => k + base), m: f.m })));
  }
  return out;
}

/** A copy with every vertex passed through `fn`. */
export function xform(mesh: Mesh, fn: (p: V3) => V3): Mesh {
  return { v: mesh.v.map((p) => fn([p[0], p[1], p[2]])), f: mesh.f.map((f) => ({ i: [...f.i], m: f.m })) };
}

export const move = (mesh: Mesh, d: V3) => xform(mesh, (p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
export const scale = (mesh: Mesh, s: V3) => xform(mesh, (p) => [p[0] * s[0], p[1] * s[1], p[2] * s[2]]);

/** Turns a mesh about the x, y or z axis through the origin. */
export function turn(mesh: Mesh, axis: 'x' | 'y' | 'z', angle: number): Mesh {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return xform(mesh, ([x, y, z]) =>
    axis === 'x' ? [x, y * c - z * s, y * s + z * c] : axis === 'y' ? [x * c + z * s, y, -x * s + z * c] : [x * c - y * s, x * s + y * c, z],
  );
}

/** The mirror image across the ship's centre line (y to -y), with the winding fixed. */
export function mirrorY(mesh: Mesh): Mesh {
  const m = xform(mesh, ([x, y, z]) => [x, -y, z]);
  for (const f of m.f) f.i.reverse();
  return m;
}

/** A part and its mirror image across the centre line. */
export const pair = (mesh: Mesh) => merge(mesh, mirrorY(mesh));

/** A box centred on `c` with full sizes `s`. */
export function box(m: Mat, c: V3, s: V3, topScale = 1): Mesh {
  const [x, y, z] = c;
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  const t = topScale;
  const v: V3[] = [
    [x - hx, y - hy, z - hz], [x + hx, y - hy, z - hz], [x + hx, y + hy, z - hz], [x - hx, y + hy, z - hz],
    [x - hx * t, y - hy * t, z + hz], [x + hx * t, y - hy * t, z + hz], [x + hx * t, y + hy * t, z + hz], [x - hx * t, y + hy * t, z + hz],
  ];
  const quads = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return outward({ v, f: quads.map((i) => ({ i, m })) });
}

/**
 * A tube (or cone, when a radius is 0) from `p0` to `p1` with `sides` faces round it. `squash`
 * scales its cross-section across (y) and up (z) for a tube along x, flattening it.
 */
export function tube(m: Mat, p0: V3, p1: V3, r0: number, r1: number, sides = 6, opts: { caps?: boolean; capMat?: Mat; spin?: number } = {}): Mesh {
  const axis = norm(sub(p1, p0));
  const helper: V3 = Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(axis, helper));
  const w = cross(axis, u);
  const spin = opts.spin ?? Math.PI / sides;
  const ring = (p: V3, r: number) =>
    Array.from({ length: sides }, (_, k): V3 => {
      const a = spin + (k / sides) * Math.PI * 2;
      const cu = Math.cos(a) * r;
      const cw = Math.sin(a) * r;
      return [p[0] + u[0] * cu + w[0] * cw, p[1] + u[1] * cu + w[1] * cw, p[2] + u[2] * cu + w[2] * cw];
    });
  const v: V3[] = [];
  const f: Face[] = [];
  const a0 = r0 > 0 ? (v.push(...ring(p0, r0)), 0) : (v.push(p0), -1);
  const b0 = v.length;
  if (r1 > 0) v.push(...ring(p1, r1));
  else v.push(p1);
  for (let k = 0; k < sides; k++) {
    const k2 = (k + 1) % sides;
    const quad: number[] = [];
    if (a0 >= 0) quad.push(k, k2);
    else quad.push(0);
    if (r1 > 0) quad.push(b0 + k2, b0 + k);
    else quad.push(b0);
    f.push({ i: quad, m });
  }
  if (opts.caps !== false) {
    if (r0 > 0) f.push({ i: Array.from({ length: sides }, (_, k) => k), m: opts.capMat ?? m });
    if (r1 > 0) f.push({ i: Array.from({ length: sides }, (_, k) => b0 + k), m: opts.capMat ?? m });
  }
  return outward({ v, f });
}

/** An ellipsoid of radii `r` round `c`; `top` > 0 keeps only the upper part (a dome). */
export function ellipsoid(m: Mat, c: V3, r: V3, seg = 8, rings = 4, opts: { dome?: boolean; capMat?: Mat } = {}): Mesh {
  const v: V3[] = [];
  const f: Face[] = [];
  const lat0 = opts.dome ? 0 : -Math.PI / 2;
  const rows = opts.dome ? rings : rings * 2;
  // Rows of vertices from the bottom (or the equator, for a dome) to just under the top pole.
  for (let j = 0; j < rows; j++) {
    const lat = lat0 + ((j + (opts.dome ? 0 : 1)) / (rows + (opts.dome ? 0 : 1))) * (Math.PI / 2 - lat0);
    for (let k = 0; k < seg; k++) {
      const lon = (k / seg) * Math.PI * 2 + (j % 2) * (Math.PI / seg) * 0.5;
      v.push([c[0] + Math.cos(lat) * Math.cos(lon) * r[0], c[1] + Math.cos(lat) * Math.sin(lon) * r[1], c[2] + Math.sin(lat) * r[2]]);
    }
  }
  const top = v.push([c[0], c[1], c[2] + r[2]]) - 1;
  for (let j = 0; j < rows - 1; j++) {
    for (let k = 0; k < seg; k++) {
      const k2 = (k + 1) % seg;
      f.push({ i: [j * seg + k, j * seg + k2, (j + 1) * seg + k2, (j + 1) * seg + k], m });
    }
  }
  for (let k = 0; k < seg; k++) f.push({ i: [(rows - 1) * seg + k, (rows - 1) * seg + ((k + 1) % seg), top], m });
  if (opts.dome) {
    f.push({ i: Array.from({ length: seg }, (_, k) => k), m: opts.capMat ?? m });
  } else {
    const bottom = v.push([c[0], c[1], c[2] - r[2]]) - 1;
    for (let k = 0; k < seg; k++) f.push({ i: [k, (k + 1) % seg, bottom], m });
  }
  return outward({ v, f });
}

/**
 * An outline in the x-y plane (any winding) extruded from `z0` up to `z1`. `topScale` shrinks the
 * top face toward the outline's centre, for bevelled, tapering hulls.
 */
export function slab(m: Mat, poly: readonly (readonly [number, number])[], z0: number, z1: number, topScale = 1, opts: { topMat?: Mat; sideMat?: Mat } = {}): Mesh {
  // Counter-clockwise (seen from +z), so the side faces wind outward.
  let area = 0;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k];
    const b = poly[(k + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const pts = area < 0 ? [...poly].reverse() : [...poly];
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const n = pts.length;
  const v: V3[] = [
    ...pts.map(([x, y]): V3 => [x, y, z0]),
    ...pts.map(([x, y]): V3 => [cx + (x - cx) * topScale, cy + (y - cy) * topScale, z1]),
  ];
  const f: Face[] = [
    { i: Array.from({ length: n }, (_, k) => n - 1 - k), m },
    { i: Array.from({ length: n }, (_, k) => n + k), m: opts.topMat ?? m },
  ];
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    f.push({ i: [k, k2, n + k2, n + k], m: opts.sideMat ?? m });
  }
  return { v, f };
}

/** A flat panel (a thin slab) from an outline, `t` thick, centred on height `z`. */
export const plate = (m: Mat, poly: readonly (readonly [number, number])[], z: number, t = 1, topMat?: Mat) =>
  slab(m, poly, z - t / 2, z + t / 2, 1, { topMat });

/** An octahedron (a crystal) round `c`, `h` tall and `r` wide. */
export function crystal(m: Mat, c: V3, r: number, h: number, sides = 4, lean = 0): Mesh {
  const v: V3[] = [[c[0] + lean, c[1], c[2] + h / 2], [c[0], c[1], c[2] - h / 2]];
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2 + 0.3;
    v.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]);
  }
  const f: Face[] = [];
  for (let k = 0; k < sides; k++) {
    const a = 2 + k;
    const b = 2 + ((k + 1) % sides);
    f.push({ i: [a, b, 0], m }, { i: [b, a, 1], m });
  }
  return outward({ v, f });
}

/** Points along an arc in the x-y plane, from angle a0 to a1, for curved hulls. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps: number): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

/** A curved band (a ring segment) in the x-y plane: outer radius `r`, `w` wide, `t` thick at height z. */
export function band(m: Mat, cx: number, cy: number, r: number, w: number, a0: number, a1: number, steps: number, z: number, t: number, topMat?: Mat): Mesh {
  const outer = arc(cx, cy, r, a0, a1, steps);
  const inner = arc(cx, cy, r - w, a1, a0, steps);
  // A band is not convex, so it is built from one slab per step.
  const parts: Mesh[] = [];
  for (let k = 0; k < steps; k++) {
    parts.push(slab(m, [outer[k], outer[k + 1], inner[steps - k - 1], inner[steps - k]], z - t / 2, z + t / 2, 1, { topMat }));
  }
  return merge(...parts);
}

/** A ring (torus-like band) lying flat round (cx, cy). */
export const ring = (m: Mat, cx: number, cy: number, r: number, w: number, z: number, t: number, steps = 16, topMat?: Mat) =>
  band(m, cx, cy, r, w, 0, Math.PI * 2, steps, z, t, topMat);

/** A small deterministic random sequence for jitter (never Math.random, so the game's runs stay put). */
export function hashRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A lumpy rock: an ellipsoid with every vertex pushed in or out a little. */
export function rock(m: Mat, r: number, seed: number): Mesh {
  const rand = hashRandom(seed);
  const base = ellipsoid(m, [0, 0, 0], [r, r * 0.9, r * 0.75], 7, 3);
  return xform(base, ([x, y, z]) => {
    const k = 0.75 + rand() * 0.45;
    return [x * k, y * k, z * k];
  });
}
