import { ARENA, NODE_AMOUNT } from './arena';

export interface Point {
  x: number;
  y: number;
}

/** A random star map: where each faction's hub sits, crystal nodes, rock fields and nebulae. */
export interface MapLayout {
  homes: Point[];
  nodes: (Point & { amount: number })[];
  rocks: (Point & { r: number })[];
  nebulae: (Point & { r: number; color: number })[];
  stars: (Point & { a: number })[];
}

const EDGE = 60;

function randomIn(): Point {
  return {
    x: ARENA.x + EDGE + Math.random() * (ARENA.w - 2 * EDGE),
    y: ARENA.y + EDGE + Math.random() * (ARENA.h - 2 * EDGE),
  };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Homes spread out: each new one takes the best of a few random spots, the farthest from the rest. */
function placeHomes(count: number): Point[] {
  const homes: Point[] = [];
  for (let i = 0; i < count; i++) {
    let best = randomIn();
    let bestGap = -1;
    for (let tries = 0; tries < 40; tries++) {
      const candidate = randomIn();
      const gap = homes.length ? Math.min(...homes.map((h) => dist(h, candidate))) : Infinity;
      if (gap > bestGap) {
        best = candidate;
        bestGap = gap;
      }
    }
    homes.push(best);
  }
  return homes;
}

/** Makes a random map for `factionCount` hubs. Every call with the same Math.random gives the same map. */
export function generateMap(factionCount: number): MapLayout {
  const homes = placeHomes(factionCount);
  const nodes: MapLayout['nodes'] = [];

  // Three crystal nodes a short way from each hub, then a few loose ones across the field.
  for (const home of homes) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 95 + Math.random() * 60;
      nodes.push({ x: home.x + Math.cos(angle) * d, y: home.y + Math.sin(angle) * d, amount: NODE_AMOUNT });
    }
  }
  for (let i = 0; i < 6; i++) {
    let p = randomIn();
    for (let tries = 0; tries < 20 && homes.some((h) => dist(h, p) < 130); tries++) p = randomIn();
    nodes.push({ ...p, amount: NODE_AMOUNT });
  }

  // Rock fields: clusters of rocks that block where buildings can go.
  const rocks: MapLayout['rocks'] = [];
  for (let f = 0; f < 6; f++) {
    let center = randomIn();
    for (let tries = 0; tries < 20 && homes.some((h) => dist(h, center) < 140); tries++) center = randomIn();
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = Math.random() * 60;
      rocks.push({ x: center.x + Math.cos(angle) * d, y: center.y + Math.sin(angle) * d, r: 8 + Math.random() * 12 });
    }
  }

  const nebulaColors = [0x3a1d6e, 0x14406b, 0x5a1d4a, 0x1d5a4f];
  const nebulae: MapLayout['nebulae'] = [];
  for (let i = 0; i < 4; i++) {
    nebulae.push({ ...randomIn(), r: 120 + Math.random() * 90, color: nebulaColors[i] });
  }

  const stars: MapLayout['stars'] = [];
  for (let i = 0; i < 160; i++) {
    stars.push({ x: Math.random() * 960, y: ARENA.y + Math.random() * ARENA.h, a: 0.3 + Math.random() * 0.7 });
  }

  return { homes, nodes, rocks, nebulae, stars };
}
