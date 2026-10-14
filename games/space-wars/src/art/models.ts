// The low-poly models of every faction's ships and buildings, and of the props on the map. Each
// faction has its own design language and materials, and keeps its faction colour on a stripe or
// a glow so it reads apart at phone size:
// - Nomad Freight: off-white fighters (an X-winged fighter and a twin-nacelle bomber), a saucer-cockpit
//   light freighter and a dagger-wedge destroyer with twin bridge towers, with amber stripes;
//   rounded modular bases.
// - Veil Syndicate: pale starships with glowing blue nacelle strips and violet bands, a different
//   silhouette per class: a boxy shuttle, a saucerless arrowhead escort, a saucer frigate with its
//   nacelles slung below and a rollbar, and a mobile ringed space station with warp nacelles;
//   mushroom starbases and an open spacedock.
// - Solar Concord: curved gold hulls round glowing blue crystal cores, arched carriers; pylons are
//   floating crystals.
// - Iron Dominion: dark iron warships with gold trim and ice-blue windows, each class from another
//   arm of the empire: a squat forge hauler with a cog crest and cranes, a winged assault gunship,
//   a rounded strike cruiser with flight bays and a dorsal cannon, and a vast cathedral battleship
//   with a ram prow, gun decks and spires, drawn a little larger than the other factions' ships.
// - Ferrox Hive: teal-and-bronze insects with glowing sacs.
// Models face +x, in display pixels; see mesh.ts.

import type { Role, UnitId } from '../game/factions';
import {
  band, box, crystal, ellipsoid, merge, move, pair, plate, ring, rock, scale, slab, tube, turn, xform,
  type Mesh, type V3,
} from './mesh';
import type { Materials } from './render3d';

export interface FactionArt {
  mats: Materials;
  units: Record<UnitId, Mesh>;
  buildings: Record<Role, Mesh>;
  /** The colour of the long exhaust flames, outer to inner. */
  flame: [number, number];
}

const Q = Math.PI / 2;

/** An arch standing in the y-z plane: a band of radius r built flat, then stood up. */
function arch(m: string, r: number, w: number, t: number, steps = 8): Mesh {
  return xform(band(m, 0, 0, r, w, 0, Math.PI, steps, 0, t), ([x, y, z]) => [z, x, y]);
}

/** Thin legs from a body out to the side, mirrored (insects). */
function legs(m: string, at: [number, number][], reachY: number, drop: number): Mesh {
  return pair(merge(...at.map(([x, y]) => tube(m, [x, y, 0], [x + (x > 0 ? 3 : -3), reachY, -drop], 0.7, 0.4, 4))));
}

/**
 * A hull section between two outlines with the same number of points: `lower` at height z0 and
 * `upper` at z1, joined by sloping side faces. Only the caps asked for are closed, so stacked
 * sections leave no hidden face between them for the painter's sort to get wrong.
 */
function loft(m: string, lower: [number, number][], z0: number, upper: [number, number][], z1: number, caps: { bottom?: boolean; top?: boolean } = {}): Mesh {
  let area = 0;
  lower.forEach((a, k) => {
    const b = lower[(k + 1) % lower.length];
    area += a[0] * b[1] - b[0] * a[1];
  });
  const [lo, up] = area < 0 ? [[...lower].reverse(), [...upper].reverse()] : [lower, upper];
  const n = lo.length;
  const v: V3[] = [...lo.map(([x, y]): V3 => [x, y, z0]), ...up.map(([x, y]): V3 => [x, y, z1])];
  const f = Array.from({ length: n }, (_, k) => ({ i: [k, (k + 1) % n, n + ((k + 1) % n), n + k], m }));
  if (caps.bottom) f.push({ i: Array.from({ length: n }, (_, k) => n - 1 - k), m });
  if (caps.top) f.push({ i: Array.from({ length: n }, (_, k) => n + k), m });
  return { v, f };
}

// ---------------------------------------------------------------- Nomad Freight (wing fighters)

function nomad(): FactionArt {
  const mats: Materials = {
    hull: { kind: 'paint', color: 0xece4d2, spec: 0.45 },
    hull2: { kind: 'paint', color: 0xb5ab9a, spec: 0.3 },
    dark: { kind: 'paint', color: 0x4c4540, spec: 0.2 },
    stripe: { kind: 'paint', color: 0xff9638, spec: 0.4 },
    chrome: { kind: 'chrome', color: 0xd8d6d0 },
    glass: { kind: 'glass', color: 0x1d2a48 },
    glow: { kind: 'glow', color: 0xff9a5a },
    glow2: { kind: 'glow', color: 0x9fdcff },
  };
  // Fighter: square fuselage, four wings in an X, wingtip cannons, amber wing stripes.
  const wing = merge(
    plate('hull', [[-9, 2.2], [-2, 2.2], [-4.6, 12], [-8.6, 12]], 0, 0.8),
    plate('stripe', [[-7.8, 5.5], [-4.2, 5.5], [-4.9, 8.6], [-8.2, 8.6]], 0.55, 0.3),
    tube('dark', [-8, 12.4, 0], [8, 12.4, 0], 0.65, 0.45, 4),
  );
  const scout = merge(
    tube('hull', [-9, 0, 0], [13, 0, 0], 2.6, 0.9, 4, { spin: Math.PI / 4 }),
    box('hull2', [-6.5, 0, 0], [6, 5.4, 4.2]),
    ellipsoid('glass', [2, 0, 1.4], [3, 1.3, 1.3], 6, 2, { dome: true }),
    box('stripe', [7, 0, 1.0], [3.6, 1.6, 0.5]),
    pair(merge(turn(wing, 'x', 0.3), turn(wing, 'x', -0.3))),
    pair(merge(tube('hull2', [-11, 2.6, 1.3], [-3, 2.6, 1.3], 1.3, 1.3, 6), tube('glow', [-11.7, 2.6, 1.3], [-11, 2.6, 1.3], 1.0, 1.0, 6))),
  );
  // A saucer-cockpit light freighter: round hull, twin mandibles, cockpit pod off to starboard.
  const gunship = merge(
    ellipsoid('hull', [-2, 0, 0], [12, 12, 3.2], 14, 3),
    ellipsoid('hull2', [-3, 0, 1.8], [6, 6, 2], 10, 2, { dome: true }),
    pair(box('hull', [11, 3.7, 0], [11, 3.4, 2.4])),
    pair(box('stripe', [12, 3.7, 1.3], [7, 1.2, 0.4])),
    tube('hull', [0, 9.5, 0.3], [9, 11.4, 0.3], 2.1, 1.7, 6),
    ellipsoid('glass', [9.4, 11.4, 0.6], [1.8, 1.6, 1.4], 6, 2),
    ellipsoid('chrome', [-1, -5.5, 2.6], [2.4, 2.4, 0.8], 8, 2, { dome: true }),
    plate('stripe', [[3, -8], [7.5, -4.4], [6.4, -3.2], [1.8, -6.8]], 2.5, 0.4),
    band('glow2', -2, 0, 12.2, 1.4, Math.PI - 0.75, Math.PI + 0.75, 6, 0, 2.2),
  );
  // A dagger-wedge destroyer: a long flat arrowhead hull, a dorsal flight deck split down the
  // forward centre line, twin bridge towers side by side on a raised stern superstructure, a row of
  // engine bells across the flat stern and amber stripes along the wedge's edges.
  const half = (pts: [number, number][]): [number, number][] => [...pts, ...pts.slice(1, -1).reverse().map(([x, y]): [number, number] => [x, -y])];
  const waist = half([[24, 0], [-15, 10.2], [-20.5, 9.6], [-20.5, 0]]);
  const deck = half([[20.5, 0], [-14, 7.2], [-19.5, 6.8], [-19.5, 0]]);
  const keel = half([[21, 0], [-14, 6.4], [-20, 5.8], [-20, 0]]);
  const deckEdge = (x: number) => (7.2 * (20.5 - x)) / 34.5;
  const edgeStripe: [number, number][] = [[19.6, 0.15], [-1, deckEdge(-1) - 0.3], [-1, deckEdge(-1) - 1.6], [17.4, 0.15]];
  const engines = merge(
    ...([[2.5, 0.4, 2.1], [6.6, 0.2, 1.5]] as const).map(([y, z, r]) =>
      pair(merge(
        tube('chrome', [-23.4, y, z], [-20, y, z], r * 1.12, r * 0.85, 8),
        tube('glow', [-23.8, y, z], [-23.4, y, z], r * 0.9, r * 0.9, 8),
      )),
    ),
  );
  const tower = (y: number) => merge(
    box('dark', [-15, y, 7.2], [2.2, 1.1, 4.2], 0.8),
    box('hull', [-14.6, y, 9.9], [5, 2.3, 1.5], 0.9),
    box('glass', [-12.1, y, 10], [0.3, 2, 0.7]),
    box('stripe', [-16.2, y, 10.7], [1.6, 2.1, 0.2]),
  );
  const heavy = merge(
    loft('hull2', keel, -2.2, waist, 0, { bottom: true }),
    loft('hull', waist, 0, deck, 3, { top: true }),
    // The flight deck: a dark recessed strip down the forward centre line between two armoured doors.
    plate('dark', [[19, 0.3], [-6, 1.3], [-6, -1.3], [19, -0.3]], 3.05, 0.1),
    pair(plate('hull2', [[18, 0.4], [-6, 1.4], [-6, 2.5], [16.5, 0.9]], 3.15, 0.3)),
    pair(plate('stripe', edgeStripe, 3.1, 0.2)),
    pair(plate('stripe', [[-8, 6], [-14, 7.0], [-14, 5.8], [-8, 4.9]], 3.1, 0.2)),
    // The raised superstructure at the stern and its twin command towers.
    box('hull', [-14, 0, 4], [11, 9, 2.4], 0.85),
    box('hull2', [-10, 0, 5.4], [3.5, 5.5, 0.8]),
    tower(2.9),
    tower(-2.9),
    engines,
  );
  // Twin-nacelle hauler: cockpit nose, cross spar and two long engine nacelles, cargo on its back.
  const harvester = merge(
    tube('hull', [0, 0, 0], [10, 0, 0], 2.6, 2.0, 6),
    tube('hull', [10, 0, 0], [13.5, 0, 0], 2.0, 0.7, 6),
    ellipsoid('glass', [6, 0, 1.6], [2.2, 1.4, 1.2], 6, 2, { dome: true }),
    box('stripe', [9, 0, 1.8], [2.5, 3, 0.5]),
    box('hull2', [-1, 0, 0], [3, 14, 1.4]),
    box('dark', [-5, 0, 1.4], [6, 4, 3]),
    pair(merge(
      tube('hull', [-13, 6.6, 0], [5, 6.6, 0], 1.6, 1.6, 6),
      tube('chrome', [-13, 6.6, 0], [-9, 6.6, 0], 1.95, 1.95, 6),
      tube('glow', [-13.7, 6.6, 0], [-13, 6.6, 0], 1.3, 1.3, 6),
    )),
  );

  // Rounded modular bases: domes linked by corridors on a round platform, amber bands.
  const modules = merge(
    ...[0, 1, 2, 3].map((k) => {
      const a = Math.PI / 4 + k * Q;
      const x = Math.cos(a) * 15;
      const y = Math.sin(a) * 15;
      return merge(
        ellipsoid('hull', [x, y, 1], [4.6, 4.6, 4.2], 8, 2, { dome: true }),
        tube('hull2', [x * 0.45, y * 0.45, 2], [x * 0.8, y * 0.8, 2], 1.6, 1.6, 6),
      );
    }),
  );
  const hub = merge(
    tube('hull2', [0, 0, -2.5], [0, 0, 1], 21, 20, 16),
    ellipsoid('hull', [0, 0, 1], [11, 11, 9], 12, 4, { dome: true }),
    ring('stripe', 0, 0, 11.6, 1.8, 2.4, 1.6, 16),
    modules,
    tube('chrome', [0, 0, 9.5], [0, 0, 16], 0.7, 0.4, 4),
    ellipsoid('chrome', [0, 0, 16], [3, 3, 1], 8, 2, { dome: true }),
    ring('glow2', 0, 0, 20.4, 0.9, 1.4, 0.4, 16),
  );
  const tank = (x: number, y: number, h: number) =>
    merge(tube('hull', [x, y, -2], [x, y, h], 4.4, 4.4, 8), ellipsoid('hull', [x, y, h], [4.4, 4.4, 2.4], 8, 2, { dome: true }), tube('stripe', [x, y, h - 3], [x, y, h - 1.6], 4.6, 4.6, 8));
  const depot = merge(tube('dark', [0, 0, -3], [0, 0, -1.6], 13, 13, 12), tank(-3.5, -3.5, 7), tank(4.5, -1, 5), tank(-1, 5, 4));
  const barracks = merge(
    tube('dark', [0, 0, -3.5], [0, 0, -2], 18, 18, 14),
    scale(tube('hull', [-12, 0, 0], [12, 0, 0], 9, 9, 10), [1, 1, 0.85]),
    scale(tube('stripe', [-4, 0, 0], [-1.5, 0, 0], 9.3, 9.3, 10), [1, 1, 0.85]),
    scale(tube('stripe', [3, 0, 0], [5.5, 0, 0], 9.3, 9.3, 10), [1, 1, 0.85]),
    tube('glow', [12, 0, 0], [12.6, 0, 0], 6.5, 6.5, 10),
    box('hull2', [-6, 11, 0], [8, 4, 3]),
  );
  const turret = merge(
    tube('hull2', [0, 0, -2], [0, 0, 4], 9, 6.5, 10),
    tube('stripe', [0, 0, 1], [0, 0, 2.4], 7.6, 7.2, 10),
    ellipsoid('hull', [0, 0, 4], [5.5, 5.5, 4], 8, 2, { dome: true }),
    pair(tube('dark', [2, 1.5, 6], [13, 1.5, 8.5], 0.9, 0.7, 4)),
  );
  return { mats, units: { harvester, scout, gunship, heavy }, buildings: { hub, depot, barracks, turret }, flame: [0xff7a3a, 0xffe2a8] };
}

// ---------------------------------------------------------------- Veil Syndicate (starships)

function veil(): FactionArt {
  const mats: Materials = {
    hull: { kind: 'paint', color: 0xe2deec, spec: 0.55 },
    hull2: { kind: 'paint', color: 0xa49eb8, spec: 0.35 },
    stripe: { kind: 'paint', color: 0xa86cff, spec: 0.45 },
    glow: { kind: 'glow', color: 0x58c8ff },
    glow2: { kind: 'glow', color: 0x7ef0ff },
    bussard: { kind: 'glow', color: 0xc89cff },
    chrome: { kind: 'chrome', color: 0xd8d4ec },
    glass: { kind: 'glass', color: 0x232048 },
  };
  /** A warp nacelle on a pylon: a long hull with a glowing blue strip and a violet cap. */
  const nacelle = (x0: number, x1: number, y: number, z: number, r: number) =>
    merge(
      tube('hull2', [x0, y, z], [x1, y, z], r, r, 6),
      box('glow', [(x0 + x1) / 2 - 0.5, y, z + r * 0.9], [x1 - x0 - 2, r * 0.75, 0.5]),
      tube('bussard', [x1, y, z], [x1 + 1.4, y, z], r * 0.95, r * 0.5, 6),
      box('hull2', [(x0 + x1) / 2 + 1, y * 0.55, z * 0.45], [3, Math.abs(y) * 0.8, 0.7]),
    );
  const saucer = (x: number, rx: number, ry: number, z: number) =>
    merge(
      ellipsoid('hull', [x, 0, z], [rx, ry, rx * 0.2], 14, 2),
      ring('stripe', x, 0, rx * 0.7, rx * 0.12, z + rx * 0.15, 0.4, 14),
      ellipsoid('hull2', [x, 0, z + rx * 0.16], [rx * 0.28, ry * 0.28, rx * 0.16], 8, 2, { dome: true }),
    );
  // Every class has its own silhouette. Scout: a compact arrowhead escort with no saucer and two
  // short nacelles tucked under its flanks.
  const scout = merge(
    slab('hull', [[11, 0], [3, 3.2], [-5, 4.6], [-8, 3.6], [-8, -3.6], [-5, -4.6], [3, -3.2]], -1.2, 1.6, 0.72),
    ellipsoid('glass', [2.5, 0, 1.6], [2, 1.2, 0.8], 6, 2, { dome: true }),
    pair(plate('stripe', [[9, 0.2], [3.4, 2.3], [2, 1.6], [7.2, 0.2]], 1.7, 0.25)),
    tube('glow2', [10.4, 0, -0.2], [11.2, 0, -0.2], 0.9, 0.5, 6),
    pair(merge(
      tube('hull2', [-9.5, 4.4, -0.8], [1, 4.4, -0.8], 1.3, 1.1, 6),
      box('glow', [-4.5, 5.6, -0.6], [8, 0.4, 0.8]),
      tube('bussard', [1, 4.4, -0.8], [2, 4.4, -0.8], 1.05, 0.5, 6),
    )),
    box('glow', [-8.1, 0, 0.2], [0.4, 5, 1]),
  );
  // Gunship: a frigate with a round saucer, the nacelles slung low beneath it and a weapons rollbar
  // arching over its back.
  const gunship = merge(
    saucer(4, 10, 10, 2.2),
    box('hull2', [-6, 0, 1.4], [6, 4.6, 2.2], 0.8),
    pair(merge(
      nacelle(-17, -3, 7.2, -3.4, 1.6),
      box('hull2', [-8, 4.6, -0.8], [3.2, 3.8, 0.8]),
    )),
    pair(move(turn(box('hull2', [0, 0, 0], [1.6, 1.2, 6]), 'x', -0.25), [-4.5, 5.2, 5.4])),
    box('hull2', [-4.5, 0, 8.4], [2.4, 14, 1.4]),
    box('stripe', [-4.5, 0, 9.4], [2.6, 5, 1.1], 0.8),
    pair(tube('glow2', [-3.6, 4.2, 9.3], [-2.6, 4.2, 9.3], 0.7, 0.7, 6)),
  );
  // Heavy: a mobile space station: a central core with an inner habitat ring, an outer docking
  // ring on three spokes with curved docking pylons rising and falling from it, and a pair of warp
  // nacelles on short pylons and glowing impulse engines at the back so it reads as a ship.
  const around = (k: number, n: number, offset = 0) => offset + (k / n) * Math.PI * 2;
  const spokes = [0, 1, 2].map((k) => turn(box('hull2', [10, 0, 0], [8.6, 1.5, 1.1]), 'z', around(k, 3)));
  const pylonArc = (a: number, up: number) => {
    const at = (r: number, z: number): V3 => [Math.cos(a) * r, Math.sin(a) * r, z * up];
    return merge(
      tube('hull', at(14.8, 0.4), at(17, 3.6), 0.95, 0.85, 5),
      tube('hull', at(17, 3.6), at(15.8, 8), 0.85, 0.6, 5),
      tube('glow2', at(15.8, 8), at(15.6, 8.8), 0.6, 0.3, 5),
    );
  };
  const heavy = merge(
    tube('hull2', [0, 0, -5.5], [0, 0, 5.5], 2.4, 2.4, 8),
    tube('hull', [0, 0, 5.5], [0, 0, 7.5], 2.4, 0.8, 8),
    tube('hull', [0, 0, -5.5], [0, 0, -7], 2.4, 0.8, 8),
    ellipsoid('hull', [0, 0, 0], [6.2, 6.2, 2.6], 14, 2),
    ring('hull', 0, 0, 9.4, 2.6, 0, 1.8, 18, 'hull'),
    ring('stripe', 0, 0, 8.6, 1, 1, 0.3, 18),
    ring('glow2', 0, 0, 9.5, 0.4, 0, 0.9, 18),
    ...spokes,
    ring('hull', 0, 0, 15.4, 1.8, 0, 1.4, 24),
    ring('glow', 0, 0, 15.5, 0.35, 0, 0.7, 24),
    ...[0, 1, 2].flatMap((k) => [pylonArc(around(k, 3, Math.PI / 3), 1), pylonArc(around(k, 3, Math.PI / 3), -1)]),
    // Warp nacelles and impulse engines at the back (-x).
    pair(merge(
      tube('hull2', [-27, 8.6, 1.6], [-11, 8.6, 1.6], 1.8, 1.8, 6),
      box('glow', [-19.5, 8.6, 3.2], [13, 1.3, 0.5]),
      tube('bussard', [-11, 8.6, 1.6], [-9.6, 8.6, 1.6], 1.7, 0.9, 6),
      move(turn(box('hull2', [0, 0, 0], [3, 5.2, 0.8]), 'z', -0.5), [-15.5, 6.6, 0.8]),
      box('glow', [-16.4, 3.2, 0], [0.5, 2.4, 1]),
    )),
    box('hull2', [-12.6, 0, 0], [7, 4.4, 2.2], 0.8),
    box('glow', [-16.2, 0, 0], [0.5, 3.6, 1.6]),
  );
  // Harvester: a boxy shuttlecraft with a sloped nose, side warp pods and a cargo pallet.
  const harvester = merge(
    box('hull', [0, 0, 0.4], [11, 6.4, 4.2], 0.82),
    slab('hull', [[5.5, -3.2], [8.4, -2.2], [8.4, 2.2], [5.5, 3.2]], -1.7, 1.2, 0.85),
    box('glass', [7.4, 0, 1.3], [1.6, 3.6, 0.6]),
    box('stripe', [-0.5, 0, 2.6], [5, 5, 0.4]),
    box('glow', [-5.6, 0, 0.6], [0.4, 4.8, 2.4]),
    pair(merge(tube('hull2', [-6.5, 4.4, -0.8], [3.5, 4.4, -0.8], 1.2, 1.2, 6), box('glow', [-1.5, 4.4, 0.3], [8, 0.8, 0.4]))),
  );

  // Starbases: a mushroom station on a stalk, a relay disc, an open spacedock, a mine lattice.
  const hub = merge(
    ellipsoid('hull', [0, 0, -3.5], [8, 8, 4], 10, 2),
    tube('hull2', [0, 0, -4], [0, 0, 8], 3.6, 3.6, 10),
    ellipsoid('hull', [0, 0, 9.5], [19, 19, 4.4], 18, 3),
    ring('stripe', 0, 0, 13.6, 2, 13.2, 0.6, 18),
    ring('glow', 0, 0, 19.3, 0.9, 9.6, 1, 20),
    ellipsoid('hull2', [0, 0, 13], [6, 6, 4], 10, 2, { dome: true }),
    tube('chrome', [0, 0, 16.5], [0, 0, 21], 0.8, 0.3, 4),
  );
  const depot = merge(
    tube('hull2', [0, 0, -3], [0, 0, 5], 2.2, 2.2, 8),
    ellipsoid('hull', [0, 0, 5], [11, 11, 2.6], 14, 2),
    ring('stripe', 0, 0, 8, 1.6, 7, 0.5, 14),
    ring('glow', 0, 0, 11.2, 0.8, 5, 0.8, 16),
  );
  const beam = (a: V3, b: V3) => tube('hull2', a, b, 0.9, 0.9, 4);
  const [dx, dy, dz] = [14, 9, 6];
  const corners: V3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push([sx * dx, sy * dy, sz * dz + 2]);
  const edges: Mesh[] = [];
  corners.forEach((a, i) => corners.forEach((b, j) => {
    const diff = [a[0] !== b[0], a[1] !== b[1], a[2] !== b[2]].filter(Boolean).length;
    if (j > i && diff === 1) edges.push(beam(a, b));
  }));
  const barracks = merge(
    ...edges,
    ...corners.filter((c) => c[2] > 2).map((c) => box('bussard', c, [1.8, 1.8, 1])),
    pair(box('stripe', [0, dy, dz + 2.8], [dx * 2, 1.4, 0.6])),
    ellipsoid('hull', [2, 0, 2], [7, 6, 1.6], 12, 2),
    tube('hull2', [-9, 0, 1], [-1, 0, 1], 1.8, 1.6, 6),
    pair(merge(tube('hull2', [-11, 3.6, 3], [-3, 3.6, 3], 1, 1, 6), box('glow', [-7, 3.6, 3.9], [6, 0.7, 0.4]))),
  );
  const lattice: Mesh[] = [];
  for (const k of [-8, 0, 8]) {
    lattice.push(box('hull2', [k, 0, 0], [1.4, 18, 1.4]), box('hull2', [0, k, 0], [18, 1.4, 1.4]));
  }
  const turret = merge(
    ...lattice,
    ...[[-8, -8], [8, -8], [-8, 8], [8, 8]].map(([x, y]) => ellipsoid('bussard', [x, y, 1], [2, 2, 2], 6, 2)),
    ellipsoid('hull', [0, 0, 1], [4.6, 4.6, 3.4], 8, 2, { dome: true }),
    ring('glow', 0, 0, 5.4, 1, 1.2, 0.6, 10),
  );
  return { mats, units: { harvester, scout, gunship, heavy }, buildings: { hub, depot, barracks, turret }, flame: [0x6a7cff, 0xc8f2ff] };
}

// ---------------------------------------------------------------- Solar Concord (gold and crystal)

function solar(): FactionArt {
  const mats: Materials = {
    gold: { kind: 'chrome', color: 0xffc64a },
    gold2: { kind: 'paint', color: 0xe0a640, spec: 0.6 },
    trim: { kind: 'paint', color: 0x2a3060, spec: 0.5 },
    crystal: { kind: 'glow', color: 0x4cc4ff },
    stripe: { kind: 'paint', color: 0xffe08a, spec: 0.7 },
  };
  const scout = merge(
    ellipsoid('gold', [0, 0, 0.5], [6.4, 2.6, 2], 8, 2),
    crystal('crystal', [-0.5, 0, 2.6], 1.6, 3.4),
    pair(band('gold', -4, 0, 10.5, 2.4, 0.3, 1.35, 5, 0, 1.3, 'gold2')),
    pair(crystal('crystal', [6, 3.6, 0.2], 0.8, 1.6)),
    tube('crystal', [-7.2, 0, 0.5], [-6.2, 0, 0.5], 1.2, 1.2, 6),
  );
  const gunship = merge(
    band('gold', -2, 0, 12.5, 3.2, -2.1, 2.1, 9, 0, 2.4, 'gold2'),
    band('trim', -2, 0, 9.6, 0.9, -1.9, 1.9, 8, 1.3, 0.4),
    slab('gold2', [[2, 0], [-6, 2.4], [-13, 1.6], [-13, -1.6], [-6, -2.4]], -1, 1.6, 0.7),
    crystal('crystal', [1, 0, 1.4], 3.4, 6.5, 6),
    pair(crystal('crystal', [-12.5, 9, 0.2], 1, 2)),
  );
  const heavy = merge(
    slab('gold', [[19, 0], [10, 6], [-14, 8], [-19, 4], [-19, -4], [-14, -8], [10, -6]], -2, 2.4, 0.76, { sideMat: 'gold2' }),
    pair(band('gold', -3, 0, 17, 3.2, 0.55, 2.7, 9, 0.6, 2.2, 'gold2')),
    plate('trim', [[12, 0], [6, 2.4], [-12, 2.6], [-12, -2.6], [6, -2.4]], 2.6, 0.4),
    ...[8, 0, -8].map((x) => crystal('crystal', [x, 0, 4], 2, 4.4, 4)),
    pair(tube('crystal', [-20, 3, 0.2], [-19, 3, 0.2], 1.4, 1.4, 6)),
  );
  const harvester = merge(
    ellipsoid('gold', [0, 0, 0], [5, 4, 3], 8, 2),
    pair(tube('gold2', [-1, 2, -0.4], [-7.5, 4.6, -1.4], 0.9, 0.4, 4)),
    tube('gold2', [3, 0, -0.4], [8, 0, -1], 0.9, 0.4, 4),
    crystal('crystal', [0.5, 0, 3.8], 2, 4),
  );

  // A nexus with a crystal floating over it, a collector ring, a gateway arch and a crystal pylon.
  const hub = merge(
    slab('gold2', [[-16, -10], [-10, -16], [10, -16], [16, -10], [16, 10], [10, 16], [-10, 16], [-16, 10]], -3, 1.5, 0.86),
    ellipsoid('gold', [0, 0, 1.5], [12.5, 12.5, 7.5], 14, 3, { dome: true }),
    ring('trim', 0, 0, 13.6, 1.4, 2, 0.8, 16),
    ...[0, 1, 2, 3].map((k) => turn(move(arch('gold', 4, 1.6, 2, 6), [15.5, 0, 0.5]), 'z', Math.PI / 4 + k * Q)),
    crystal('crystal', [0, 0, 18], 5, 12, 6),
  );
  const depot = merge(
    ring('gold', 0, 0, 12.5, 3.2, 1, 2.6, 14, 'gold2'),
    ring('trim', 0, 0, 9.4, 0.8, 2.4, 0.4, 14),
    ellipsoid('gold2', [0, 0, -1], [7, 7, 3], 10, 2, { dome: true }),
    crystal('crystal', [0, 0, 5], 3, 7, 5),
  );
  const barracks = merge(
    slab('gold2', [[-14, -9], [14, -9], [16, 0], [14, 9], [-14, 9], [-16, 0]], -2.5, 1, 0.9),
    pair(box('gold', [0, 7.5, 5], [6, 4, 10], 0.7)),
    move(arch('gold', 10, 3, 5, 9), [0, 0, 6]),
    box('crystal', [0, 0, 6], [0.8, 11, 8]),
    pair(crystal('crystal', [-11, 6, 2], 1.4, 3)),
    plate('trim', [[-14, -2], [-6, -2], [-6, 2], [-14, 2]], 1.2, 0.4),
  );
  const turret = merge(
    slab('gold2', [[-5, -5], [5, -5], [7, 0], [5, 5], [-5, 5], [-7, 0]], -3, -1, 0.8),
    crystal('crystal', [0, 0, 9], 5, 15, 4),
    ring('gold', 0, 0, 7.6, 1.8, 9, 1.4, 12),
    ring('gold', 0, 0, 5, 1.2, 15, 1, 10),
  );
  return { mats, units: { harvester, scout, gunship, heavy }, buildings: { hub, depot, barracks, turret }, flame: [0x4c8cff, 0xd8f4ff] };
}

// ---------------------------------------------------------------- Iron Dominion (gothic cathedrals)

function iron(): FactionArt {
  const mats: Materials = {
    iron: { kind: 'paint', color: 0x5e5a6c, spec: 0.35 },
    iron2: { kind: 'paint', color: 0x3c3946, spec: 0.25 },
    gold: { kind: 'chrome', color: 0xe8b450 },
    glow: { kind: 'glow', color: 0x7fd4ff },
    stripe: { kind: 'paint', color: 0x6cc8ff, spec: 0.4 },
    glass: { kind: 'glass', color: 0x1c2a44 },
  };
  const spire = (x: number, y: number, z: number, r: number, h: number) =>
    merge(tube('iron2', [x, y, z], [x, y, z + h * 0.4], r, r * 0.8, 4, { spin: 0 }), tube('gold', [x, y, z + h * 0.4], [x, y, z + h], r * 0.85, 0, 4, { spin: 0 }));
  const buttress = (x: number, y: number) => move(turn(box('iron2', [0, 0, 0], [2, 1.2, 6.5], 0.8), 'x', -0.55), [x, y, 2.2]);
  /** A row of broadside gun decks along both flanks: an armoured strip, lit gun ports and barrels. */
  const broadside = (x0: number, x1: number, y: number, z: number, h: number) => {
    const guns: Mesh[] = [];
    for (let x = x0 + 1.5; x < x1 - 0.5; x += 3) guns.push(tube('gold', [x, y + 0.8, z], [x, y + 2.4, z], 0.45, 0.4, 4));
    return pair(merge(
      box('iron2', [(x0 + x1) / 2, y, z], [x1 - x0, 1.8, h]),
      box('glow', [(x0 + x1) / 2, y + 0.92, z + h * 0.18], [x1 - x0 - 1, 0.15, h * 0.32]),
      box('gold', [(x0 + x1) / 2, y + 0.4, z + h / 2 + 0.1], [x1 - x0, 1, 0.25]),
      ...guns,
    ));
  };
  /** A stepped cathedral castle at the stern: tiers narrowing upward, lit windows, a spire on top. */
  const castle = (x: number, w: number, z: number, tiers: number, spireH: number) => {
    const parts: Mesh[] = [];
    let zz = z;
    for (let k = 0; k < tiers; k++) {
      const s = 1 - k * 0.24;
      const h = 3.4 - k * 0.45;
      parts.push(box(k % 2 ? 'iron' : 'iron2', [x - k * 0.6, 0, zz + h / 2], [w * 1.25 * s, w * s, h], 0.86));
      parts.push(pair(box('glow', [x - k * 0.6, (w * s) / 2 + 0.05, zz + h * 0.55], [w * 1.25 * s * 0.7, 0.15, h * 0.3])));
      zz += h;
    }
    parts.push(spire(x - tiers * 0.6, 0, zz, w * 0.18 + 0.6, spireH));
    return merge(...parts);
  };
  /** An armoured ram prow: a gold wedge, flat beneath, sloping up to the hull. */
  const ram = (x0: number, x1: number, w: number, z0: number, z1: number) =>
    merge(
      slab('gold', [[x1, 0], [x0 + (x1 - x0) * 0.35, w * 0.7], [x0, w], [x0, -w], [x0 + (x1 - x0) * 0.35, -w * 0.7]], z0, z1, 0.55),
      box('iron2', [x0 + 0.6, 0, (z0 + z1) / 2 + 0.6], [1.2, w * 2.1, z1 - z0 + 1.4]),
    );
  const engines = (x: number, ys: number[], z: number, r: number) =>
    merge(...ys.map((y) => merge(tube('iron2', [x - 1.2, y, z], [x + 0.5, y, z], r * 1.15, r, 6), tube('glow', [x - 1.6, y, z], [x - 1.2, y, z], r * 0.9, r * 0.9, 6))));

  // Scout: a stubby assault gunship with broad straight wings, a cockpit, a tail fin and twin
  // engines on its back.
  const scout = merge(
    box('iron', [0, 0, 0], [16, 4.6, 3.6], 0.8),
    slab('iron', [[8, -2.3], [11.5, -1.2], [11.5, 1.2], [8, 2.3]], -1.6, 1.4, 0.8),
    box('glass', [9.2, 0, 1.6], [2, 2.6, 0.6]),
    pair(merge(
      plate('iron2', [[3, 2], [3, 10.5], [-3, 10.5], [-4.5, 2]], -0.4, 0.9),
      plate('gold', [[3.1, 2], [3.1, 10.5], [2.1, 10.5], [2.1, 2]], 0.15, 0.3),
      box('iron', [-0.8, 10.5, -0.4], [6.4, 1, 1.8]),
      box('glow', [-4, 10.5, -0.4], [0.4, 0.7, 1]),
      tube('iron2', [-9, 1.9, 2.4], [-1, 1.9, 2.4], 1.3, 1.3, 6),
      tube('glow', [-9.6, 1.9, 2.4], [-9, 1.9, 2.4], 1.1, 1.1, 6),
    )),
    box('stripe', [3, 0, 1.9], [4, 2.8, 0.3]),
    box('iron2', [-6, 0, 3.6], [3.6, 0.8, 4], 0.7),
    box('gold', [-6.4, 0, 5.7], [2.6, 0.9, 0.4]),
  );
  // Gunship: a bulky rounded armoured cruiser with a short blunt prow, lit flight bays in its flanks,
  // a big bombardment cannon on its back and a low bridge at the stern.
  const gunship = merge(
    scale(tube('iron', [-15, 0, 0], [9, 0, 0], 5.4, 4.8, 10), [1, 1, 0.8]),
    scale(ellipsoid('iron', [9, 0, 0], [4, 4.8, 3.8], 10, 2), [1, 1, 1]),
    slab('gold', [[16, -1.8], [16, 1.8], [11, 3.4], [11, -3.4]], -1.6, 1.8, 0.7),
    pair(merge(
      box('iron2', [-3, 4.9, 0], [10, 1.6, 3.2]),
      box('glow', [-3, 5.72, -0.2], [8, 0.1, 2]),
      box('gold', [-3, 5.2, 1.8], [10.4, 1, 0.3]),
    )),
    box('iron2', [2, 0, 4.4], [6, 4.6, 2], 0.8),
    tube('iron2', [2, 0, 5.8], [16, 0, 5.8], 1.5, 1.2, 8),
    tube('gold', [16, 0, 5.8], [17.6, 0, 5.8], 1.6, 1.6, 8),
    box('stripe', [-6, 0, 4.4], [5, 3, 0.3]),
    box('iron2', [-11, 0, 5], [5, 4.4, 3], 0.8),
    pair(box('glow', [-11, 2.05, 5.4], [3.4, 0.15, 0.8])),
    spire(-11.5, 0, 6.5, 1, 3.5),
    engines(-15.5, [-2.6, 0, 2.6], 0, 1.4),
  );
  // Heavy: a vast battleship-cathedral, a massive ram prow, three gun decks a side, a spine of
  // chapels and spires, buttresses and a towering stepped cathedral at the stern.
  const heavy = merge(
    slab('iron', [[17, 0], [12, 6.4], [-20, 7], [-24, 4.6], [-24, -4.6], [-20, -7], [12, -6.4]], -2.6, 3, 0.88),
    slab('iron2', [[12, 0], [8, 4.6], [-18, 5], [-18, -5], [8, -4.6]], 3, 4.4, 0.9),
    ram(15, 32, 4.6, -2.4, 2.6),
    box('stripe', [20, 0, 2.1], [6, 1.4, 0.3]),
    broadside(-19, 11, 6.6, 0.2, 3),
    broadside(-15, 6, 5, 4.3, 1.6),
    // Chapels and spires along the spine.
    box('iron', [4, 0, 5.4], [5, 3.4, 2], 0.8),
    spire(4, 0, 6.4, 1.3, 8),
    box('iron', [-4, 0, 5.6], [5, 4, 2.4], 0.8),
    pair(merge(spire(-4, 1.8, 6.8, 0.8, 6), spire(-21, 4.2, 4.4, 1, 8))),
    pair(merge(buttress(-9, 5.6), buttress(-17, 5.6), buttress(-1, 5.4))),
    castle(-14, 9, 4.4, 4, 13),
    box('stripe', [-14, 0, 4.6], [12, 11.4, 0.3]),
    engines(-24, [-3.2, 0, 3.2], 0.4, 1.7),
    pair(engines(-24, [5.4], 0.2, 1.1)),
  );
  // Harvester: a squat forge-priest hauler with a great cog crest standing on its back, manipulator
  // cranes and smoking stacks; no prow.
  const teeth = Array.from({ length: 10 }, (_, k) => turn(box('gold', [5.6, 0, 0], [1.6, 1.4, 1]), 'z', (k / 10) * Math.PI * 2));
  const cog = xform(merge(ring('gold', 0, 0, 5, 1.8, 0, 1, 14), ...teeth, tube('iron2', [0, 0, -0.8], [0, 0, 0.8], 1.6, 1.6, 8), box('glow', [0, 0, 0], [3.4, 0.5, 1.2])), ([x, y, z]) => [z, x, y]);
  const harvester = merge(
    box('iron', [0, 0, 0], [14, 9, 4.2], 0.85),
    box('iron2', [0, 0, 2.6], [10, 7, 1.2], 0.9),
    move(cog, [-1, 0, 8.4]),
    box('iron2', [-1, 0, 3.6], [2, 3, 1.4]),
    pair(merge(
      tube('gold', [5, 3.4, 2.6], [8.5, 5.4, 5], 0.45, 0.4, 4),
      tube('gold', [8.5, 5.4, 5], [10.5, 5.4, 1.5], 0.4, 0.35, 4),
      box('iron2', [10.5, 5.4, 1], [1.4, 1.4, 1]),
      tube('iron2', [-5.5, 3, 2], [-5.5, 3, 7.5], 0.9, 0.8, 6),
      tube('glow', [-5.5, 3, 7.5], [-5.5, 3, 8], 0.8, 0.8, 6),
      box('glow', [7.02, 3.3, 0.4], [0.1, 1.6, 1.2]),
    )),
    box('stripe', [3.5, 0, 3.3], [3, 6, 0.3]),
    engines(-7, [-2.6, 2.6], 0, 1.2),
  );
  // Iron Dominion ships are drawn a little larger than the others for their hit circles.
  const big = (m: Mesh) => scale(m, [1.12, 1.12, 1.12]);

  // A gothic fortress, a gantry yard, a forge hall with chimneys and a bastion with a big gun.
  const tower = (x: number, y: number, h: number) =>
    merge(tube('iron', [x, y, -2], [x, y, h], 3.6, 3, 6), tube('gold', [x, y, h], [x, y, h + 6], 3.7, 0, 6));
  const hub = merge(
    slab('iron2', [[-18, -18], [18, -18], [18, 18], [-18, 18]], -3, 1, 0.92),
    box('iron', [0, 0, 5], [17, 17, 8], 0.86),
    box('iron2', [0, 0, 11], [9, 9, 5], 0.8),
    spire(0, 0, 13, 3.4, 15),
    ...[[-14, -14], [14, -14], [-14, 14], [14, 14]].map(([x, y]) => tower(x, y, 7)),
    box('glow', [7.6, 0, 5], [0.4, 9, 2.2]),
    box('glow', [0, 7.6, 5], [9, 0.4, 2.2]),
    box('stripe', [0, 0, 9.2], [12, 12, 0.5]),
    ring('gold', 0, 0, 9.4, 1, 8.8, 0.6, 4),
  );
  const gantry = (x: number) =>
    merge(pair(box('iron', [x, 6, 3], [1.6, 1.6, 8])), box('iron2', [x, 0, 7.4], [2, 14, 1.6]), box('gold', [x + 2.5, 0, 6.2], [4, 1, 1]));
  const depot = merge(
    slab('iron2', [[-15, -6], [15, -6], [15, 6], [-15, 6]], -2.5, 0.5, 0.94),
    box('stripe', [0, 0, 0.7], [26, 1.6, 0.3]),
    gantry(-8),
    gantry(6),
    box('iron', [-1, -2, 2], [6, 4, 3], 0.85),
  );
  const barracks = merge(
    slab('iron', [[-16, -16], [-4, -16], [-4, 0], [16, 0], [16, 14], [-16, 14]], -2.5, 6, 0.94),
    box('iron2', [-10, 6, 8.4], [10, 12, 4], 0.7),
    box('glow', [16.1, 7, 2], [0.4, 8, 3]),
    box('stripe', [4, 7, 6.3], [18, 3, 0.4]),
    tube('iron2', [-10, -10, 5], [-10, -10, 15], 2.4, 2, 6),
    tube('glow', [-10, -10, 15], [-10, -10, 15.8], 1.8, 1.6, 6),
    tube('iron2', [8, 7, 5], [8, 7, 13], 2, 1.8, 6),
    tube('glow', [8, 7, 13], [8, 7, 13.8], 1.6, 1.4, 6),
    spire(-10, 6, 10, 1.8, 9),
  );
  const turret = merge(
    slab('iron', [[-12, -8], [-4, -12], [4, -12], [12, -8], [12, 8], [4, 12], [-4, 12], [-12, 8]], -2.5, 4, 0.84),
    box('iron2', [0, 0, 6], [8, 8, 4], 0.8),
    tube('iron2', [2, 0, 7], [17, 0, 10], 1.9, 1.5, 6),
    tube('gold', [15, 0, 9.6], [17.4, 0, 10.1], 2, 2, 6),
    box('glow', [4.1, 0, 6], [0.4, 4, 1.2]),
    ring('stripe', 0, 0, 10, 1.2, 4.2, 0.4, 8),
  );
  return { mats, units: { harvester: big(harvester), scout: big(scout), gunship: big(gunship), heavy: scale(heavy, [1.6, 1.6, 1.6]) }, buildings: { hub, depot, barracks, turret }, flame: [0x4aa8ff, 0xe0f6ff] };
}

// ---------------------------------------------------------------- Ferrox Hive (insects)

function ferrox(): FactionArt {
  const mats: Materials = {
    chitin: { kind: 'paint', color: 0x2fae90, spec: 0.7 },
    chitin2: { kind: 'paint', color: 0x1d6e62, spec: 0.4 },
    bronze: { kind: 'paint', color: 0xcf8644, spec: 0.6 },
    sac: { kind: 'glow', color: 0x6dffc8 },
    eye: { kind: 'glow', color: 0xffd36a },
    wing: { kind: 'paint', color: 0xc8f2e4, spec: 0.9 },
  };
  const scout = merge(
    ellipsoid('chitin', [8, 0, 0.6], [3, 2.4, 2], 8, 2),
    pair(ellipsoid('eye', [9.4, 1.4, 1.4], [0.9, 0.7, 0.7], 6, 2)),
    ellipsoid('bronze', [3.2, 0, 0.8], [3.4, 2.6, 2.2], 8, 2),
    ellipsoid('chitin', [-5, 0, 0.6], [6, 3, 2.4], 8, 2),
    box('bronze', [-5, 0, 2.6], [2, 4, 0.6]),
    tube('bronze', [-10.6, 0, 0.6], [-15, 0, 0.2], 1.3, 0, 4),
    pair(plate('wing', [[5, 1.4], [2, 11], [-2.5, 10.5], [1.5, 1.4]], 2.8, 0.4)),
    pair(plate('wing', [[2, 1.4], [-3, 8.5], [-6, 7.5], [-1, 1.4]], 2.4, 0.4)),
    pair(tube('bronze', [10.4, 0.8, 0.2], [13, 1.6, 0], 0.6, 0.2, 4)),
  );
  const abdomen = ellipsoid('chitin', [-4, 0, 1], [11, 7, 5], 10, 3);
  const gunship = merge(
    abdomen,
    ...[-8, -3].map((x) => xform(tube('bronze', [x - 1, 0, 1], [x + 1, 0, 1], 7.3 - Math.abs(x + 4) * 0.3, 7.3 - Math.abs(x + 4) * 0.3, 10), ([a, b, c]) => [a, b, 1 + (c - 1) * 0.74])),
    pair(merge(ellipsoid('sac', [-6, 4.2, 3.6], [2, 1.6, 1.4], 6, 2), ellipsoid('sac', [0, 4, 3.6], [1.7, 1.4, 1.2], 6, 2))),
    ellipsoid('sac', [-10, 0, 4.4], [2, 2, 1.4], 6, 2),
    ellipsoid('bronze', [9, 0, 1], [4, 3.6, 2.8], 8, 2),
    pair(ellipsoid('eye', [11.6, 1.6, 1.8], [0.9, 0.8, 0.7], 6, 2)),
    legs('chitin2', [[4, 3], [-2, 5], [-8, 5]], 11, 1),
  );
  const heavy = merge(
    pair(ellipsoid('chitin', [-2, 5.4, 1], [15, 5.6, 7.6], 10, 3, { dome: true })),
    ellipsoid('bronze', [12, 0, 1.5], [5, 6, 4], 8, 2),
    tube('bronze', [14, 0, 3.5], [24, 0, 7], 2.6, 0, 6),
    pair(merge(ellipsoid('sac', [-8, 6, 5.4], [2, 1.6, 1.2], 6, 2), ellipsoid('sac', [2, 6.4, 5.2], [1.6, 1.4, 1], 6, 2))),
    pair(ellipsoid('eye', [15.6, 3, 2.4], [1, 0.9, 0.8], 6, 2)),
    legs('chitin2', [[6, 8], [-2, 10], [-10, 9]], 15, 1.5),
    pair(box('bronze', [-14, 5.4, 4], [3, 3, 1], 0.6)),
  );
  const harvester = merge(
    ellipsoid('chitin', [-1, 0, 0.5], [6, 5, 3.2], 8, 2),
    ellipsoid('sac', [-2, 0, 3.2], [2.4, 2.2, 1.4], 6, 2),
    ellipsoid('bronze', [5, 0, 0.5], [2.6, 2.6, 1.8], 8, 2),
    pair(ellipsoid('eye', [6.6, 1.2, 1.1], [0.7, 0.6, 0.5], 6, 2)),
    legs('chitin2', [[3, 3], [0, 4], [-3, 4]], 8.5, 1),
  );

  // A hive of domes and spikes, a spore nest, a brood pit of glowing eggs and a spine spire.
  const spike = (x: number, y: number, z: number, len: number) => {
    const l = Math.hypot(x, y) || 1;
    return tube('bronze', [x, y, z], [x + (x / l) * len, y + (y / l) * len, z + len * 0.8], 2, 0, 5);
  };
  const hub = merge(
    ellipsoid('chitin', [0, 0, -1], [13, 13, 11], 12, 3, { dome: true }),
    ...[0, 1, 2, 3, 4].map((k) => {
      const a = k * ((Math.PI * 2) / 5) + 0.4;
      return ellipsoid('chitin2', [Math.cos(a) * 14, Math.sin(a) * 14, -1.5], [6, 6, 5], 8, 2, { dome: true });
    }),
    ...[0, 1, 2, 3, 4].map((k) => {
      const a = k * ((Math.PI * 2) / 5) + 1;
      return spike(Math.cos(a) * 10, Math.sin(a) * 10, 4, 7);
    }),
    ...[0, 1, 2].map((k) => {
      const a = k * 2.1;
      return ellipsoid('sac', [Math.cos(a) * 6, Math.sin(a) * 6, 8], [2.4, 2.4, 1.8], 6, 2);
    }),
    ring('bronze', 0, 0, 4, 1.6, 9.8, 1, 10),
  );
  const depot = merge(
    ...[[-4, -3, 7], [5, -1, 5.5], [-1, 6, 5]].map(([x, y, h]) =>
      merge(ellipsoid('chitin', [x, y, -1], [5, 5, h], 8, 2, { dome: true }), ellipsoid('sac', [x, y, h - 1.4], [1.8, 1.8, 1.6], 6, 2))),
    spike(-8, 6, -1, 6),
  );
  const barracks = merge(
    ring('chitin2', 0, 0, 17, 6, 0, 4, 14, 'chitin'),
    ...[[-4, -3], [3, -4], [0, 4], [-6, 3], [6, 2]].map(([x, y]) => ellipsoid('sac', [x, y, 0], [3, 3, 4], 6, 2)),
    ...[0, 1, 2, 3, 4, 5].map((k) => {
      const a = k * (Math.PI / 3) + 0.3;
      return spike(Math.cos(a) * 15, Math.sin(a) * 15, 1.5, 5);
    }),
  );
  const turret = merge(
    ellipsoid('chitin', [0, 0, -2], [8, 8, 5], 8, 2, { dome: true }),
    ellipsoid('sac', [0, 0, 2.6], [3.2, 3.2, 2], 6, 2),
    tube('bronze', [0, 0, 2], [2, 0, 9], 3.6, 2.4, 6),
    tube('bronze', [2, 0, 9], [1.4, 0, 16], 2.4, 1.2, 6),
    tube('chitin', [1.4, 0, 16], [-1.6, 0, 22], 1.2, 0, 6),
  );
  return { mats, units: { harvester, scout, gunship, heavy }, buildings: { hub, depot, barracks, turret }, flame: [0x2fe0a0, 0xdcffe8] };
}

/** Every faction's art, by the faction's name. */
export const FACTION_ART: Record<string, () => FactionArt> = {
  'Solar Concord': solar,
  'Ferrox Hive': ferrox,
  'Iron Dominion': iron,
  'Veil Syndicate': veil,
  'Nomad Freight': nomad,
};

// ---------------------------------------------------------------- Props

export const PROP_MATS: Materials = {
  crys: { kind: 'paint', color: 0x4a9cff, spec: 1 },
  crys2: { kind: 'glow', color: 0x6cc4ff },
  core: { kind: 'glow', color: 0xa8ecff },
  rock: { kind: 'paint', color: 0x8c6a56, spec: 0.15 },
  rock2: { kind: 'paint', color: 0x6c4c3e, spec: 0.1 },
  chrome: { kind: 'chrome', color: 0xe8e4f0 },
  white: { kind: 'paint', color: 0xf4eee0, spec: 0.6 },
  beam: { kind: 'glow', color: 0xfff0b0 },
  shard: { kind: 'glow', color: 0xffd36a },
};

/** A cluster of crystals, leaning out from a common root. */
export function crystalCluster(seed: number): Mesh {
  const parts: Mesh[] = [crystal('core', [0, 0, 0], 2.2, 3, 5)];
  const n = 4 + (seed % 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + seed;
    const h = 7 + ((k * 7 + seed * 3) % 5);
    const c = crystal(k % 2 ? 'crys' : 'crys2', [0, 0, h / 2], 1.6 + (k % 2) * 0.5, h, 4);
    parts.push(move(turn(turn(c, 'y', 0.45), 'z', a), [Math.cos(a) * 2, Math.sin(a) * 2, -1]));
  }
  return merge(...parts);
}

/** The relay beacon: a white mast with a dish and a glowing lamp, on a chrome disc. */
export function beaconModel(): Mesh {
  return merge(
    tube('chrome', [0, 0, -2], [0, 0, 0.5], 9, 8, 14),
    ring('beam', 0, 0, 7, 1, 0.8, 0.4, 14),
    tube('white', [0, 0, 0], [0, 0, 14], 1.2, 0.8, 6),
    move(turn(ellipsoid('white', [0, 0, 0], [4.5, 4.5, 1.4], 10, 2, { dome: true }), 'y', -0.7), [-1, 0, 9]),
    ellipsoid('beam', [0, 0, 15], [2, 2, 2], 6, 2),
  );
}

/** A salvage shard: a small glowing gold crystal. */
export const shardModel = () => merge(crystal('shard', [0, 0, 0], 2.6, 7, 4), crystal('crys2', [1.8, 0.6, -1], 1, 3, 4));

/** A brown asteroid of radius r. */
export const rockModel = (r: number, seed: number) => rock(seed % 3 ? 'rock' : 'rock2', r, seed);
