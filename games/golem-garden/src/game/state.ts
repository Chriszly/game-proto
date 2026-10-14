// The garden's state and the rules that change it. No Phaser: the scene calls these on taps and
// calls `tick` every frame with the game time that passed.
import { GARDENS, cellAt, cellCentre, pathPoint, type Garden } from './board';
import {
  BLOOM_GOAL,
  COMBO,
  EARLY_BONUS,
  GOLEM_INFO,
  MAX_LEVEL,
  MOVE_FEE,
  PEST_INFO,
  SLIME,
  START,
  UPGRADE_COST,
  UPROOT_REFUND,
  golemStats,
  waveBonus,
  waveFor,
  type GolemKind,
  type PestKind,
  type Spawn,
} from './data';

export interface Golem {
  id: number;
  kind: GolemKind;
  col: number;
  row: number;
  level: number;
  /** Time left until the seed has grown into a golem, in ms; 0 once it has. */
  growMs: number;
  /** Time left until it can throw again, in ms. */
  cooldownMs: number;
  /** Sap spent on it, its seed and its levels; uprooting gives back UPROOT_REFUND of it. */
  spent: number;
}

export interface Pest {
  id: number;
  kind: PestKind;
  hp: number;
  maxHp: number;
  /** Which of the garden's routes it walks (an index into `Garden.routes`). */
  route: number;
  /** How far along its route it has walked, in pixels. */
  dist: number;
  /** Underground in its tunnel (a mole), where no golem can reach it. */
  under: boolean;
  /** Time left on a moss golem's slow, in ms. */
  slowMs: number;
  slowFactor: number;
  /** Time left on its hit flash, in ms. */
  hitMs: number;
}

/** A thrown stone, moss clump or thorn in flight, drawn by the scene; its damage lands when thrown. */
export interface Shot {
  id: number;
  kind: GolemKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
  ms: number;
}

/** A pest just squashed: where, and the sap it dropped. The scene shows it and then empties the list. */
export interface Pop {
  x: number;
  y: number;
  sap: number;
}

/** A cell slimed by the Queen Slug: golems on it throw slower until it dries. */
export interface Slime {
  col: number;
  row: number;
  ms: number;
}

export interface GameState {
  /** Which garden this is, an index into GARDENS. */
  garden: number;
  /** The wave being fought, or the next one while building. */
  wave: number;
  /** 'build' between waves, 'wave' while pests come, 'over' once the Heartwood is eaten. */
  phase: 'build' | 'wave' | 'over';
  heart: number;
  sap: number;
  /** The seed the next tap on soil plants. */
  selected: GolemKind;
  golems: Golem[];
  pests: Pest[];
  /** Pests of the current wave still to come in. */
  queue: Spawn[];
  /** Pests come in so far this garden; they take the garden's routes in turn. */
  spawned: number;
  /** Cells the Queen Slug has slimed. */
  slime: Slime[];
  /** The speed button: the game plays FAST times quicker while it is on. */
  fast: boolean;
  /** Time since the current wave started, in ms. */
  waveMs: number;
  waveHpScale: number;
  shots: Shot[];
  kills: number;
  /** Buds open on the Heartwood, one per wave cleared or called early, up to BLOOM_GOAL; kept between gardens. */
  bloom: number;
  /** Pests squashed since the scene last looked. */
  pops: Pop[];
  /** The most waves cleared in any garden, this one included. */
  best: number;
  nextId: number;
}

/** The rules run in steps of at most this many ms, so a long frame plays like several short ones. */
const STEP_MS = 16;
/** How long a throw is in the air, in ms. */
export const SHOT_MS = 160;
/** How long a pest flashes after a hit, in ms. */
const HIT_MS = 120;

export function newGame(best: number, bloom = 0, garden = 0): GameState {
  return {
    garden: GARDENS[garden] ? garden : 0,
    wave: 1,
    phase: 'build',
    heart: START.heart,
    sap: START.sap,
    selected: 'pebble',
    golems: [],
    pests: [],
    queue: [],
    spawned: 0,
    slime: [],
    fast: false,
    waveMs: 0,
    waveHpScale: 1,
    shots: [],
    kills: 0,
    bloom: Math.min(BLOOM_GOAL, bloom),
    pops: [],
    best,
    nextId: 1,
  };
}

export const gardenOf = (s: GameState): Garden => GARDENS[s.garden];

/** Whether this seed can be picked: the Thorn golem only once the Heartwood is in full bloom. */
export const unlocked = (s: GameState, kind: GolemKind) => !GOLEM_INFO[kind].locked || s.bloom >= BLOOM_GOAL;

export function select(s: GameState, kind: GolemKind) {
  if (!unlocked(s, kind)) return false;
  s.selected = kind;
  return true;
}

export const golemAt = (s: GameState, col: number, row: number) => s.golems.find((g) => g.col === col && g.row === row);

/** Whether (col, row) is soil with no golem on it. */
export const freeSoil = (s: GameState, col: number, row: number) => gardenOf(s).map[row]?.[col] === 'soil' && !golemAt(s, col, row);

/** Whether the selected seed can be planted at (col, row) now. */
export function canPlant(s: GameState, col: number, row: number) {
  return (
    s.phase !== 'over' &&
    freeSoil(s, col, row) &&
    unlocked(s, s.selected) &&
    s.sap >= GOLEM_INFO[s.selected].cost
  );
}

/** Plants the selected seed on an empty soil cell, if there is sap for it. */
export function plant(s: GameState, col: number, row: number) {
  if (!canPlant(s, col, row)) return false;
  const info = GOLEM_INFO[s.selected];
  s.sap -= info.cost;
  s.golems.push({ id: s.nextId++, kind: s.selected, col, row, level: 1, growMs: info.growMs, cooldownMs: 0, spent: info.cost });
  return true;
}

/** Sap to raise this golem a level, or null when it can't be raised (still growing or at the top). */
export function upgradeCost(g: Golem) {
  return g.growMs > 0 || g.level >= MAX_LEVEL ? null : UPGRADE_COST[g.level];
}

/** Raises a grown golem a level, if there is sap for it. */
export function upgrade(s: GameState, g: Golem) {
  const cost = upgradeCost(g);
  if (s.phase === 'over' || cost === null || s.sap < cost) return false;
  s.sap -= cost;
  g.spent += cost;
  g.level++;
  return true;
}

/** The sap uprooting this golem gives back. */
export const uprootValue = (g: Golem) => Math.floor(g.spent * UPROOT_REFUND);

/** Pulls a golem up, giving back UPROOT_REFUND of the sap spent on it. */
export function uproot(s: GameState, g: Golem) {
  if (s.phase === 'over' || !s.golems.includes(g)) return false;
  s.sap += uprootValue(g);
  s.golems = s.golems.filter((other) => other !== g);
  return true;
}

/** Whether this golem can move to (col, row) now: free soil, and MOVE_FEE sap. */
export const canMove = (s: GameState, g: Golem, col: number, row: number) =>
  s.phase !== 'over' && s.golems.includes(g) && s.sap >= MOVE_FEE && freeSoil(s, col, row);

/** Moves a golem, as it is (growing or grown, and its level), to another soil cell for MOVE_FEE sap. */
export function move(s: GameState, g: Golem, col: number, row: number) {
  if (!canMove(s, g, col, row)) return false;
  s.sap -= MOVE_FEE;
  g.col = col;
  g.row = row;
  return true;
}

/** The grown golems side by side with (col, row): one cell up, down, left or right. */
export function neighbours(s: GameState, col: number, row: number) {
  return s.golems.filter((o) => o.growMs === 0 && Math.abs(o.col - col) + Math.abs(o.row - row) === 1);
}

/**
 * What combo a golem of `kind` at (col, row) gets from its neighbours: a pebble golem next to a
 * moss golem hits slowed pests harder ('slowed'), a thorn golem next to one pricks twice ('twice').
 */
export function comboAt(s: GameState, kind: GolemKind, col: number, row: number): 'slowed' | 'twice' | null {
  if (kind === 'moss' || !neighbours(s, col, row).some((o) => o.kind === 'moss')) return null;
  return kind === 'pebble' ? 'slowed' : 'twice';
}

/** Whether (col, row) is slimed by the Queen Slug. */
export const slimed = (s: GameState, col: number, row: number) => s.slime.some((c) => c.col === col && c.row === row);

/** Whether the next wave can be called early: the current one has all come in but is still on the path. */
export const canCallEarly = (s: GameState) => s.phase === 'wave' && s.queue.length === 0;

/** The wave the wave button would send next. */
export const nextWave = (s: GameState) => (s.phase === 'build' ? s.wave : s.wave + 1);

function beginWave(s: GameState) {
  const { spawns, hpScale } = waveFor(s.wave);
  s.phase = 'wave';
  s.queue = spawns;
  s.waveHpScale = hpScale;
  s.waveMs = 0;
}

/** Counts wave `s.wave` as done: its bonus, a bud on the Heartwood and the best, and moves on. */
function finishWave(s: GameState) {
  s.sap += waveBonus(s.wave);
  s.bloom = Math.min(BLOOM_GOAL, s.bloom + 1);
  s.best = Math.max(s.best, s.wave);
  s.wave++;
}

/**
 * The wave button: between waves it sends the next wave in. During a wave whose pests have all come
 * in, it calls the next wave early: the current wave counts as done at once (its bonus and its bud)
 * plus EARLY_BONUS sap, and the next wave's pests start coming while the last ones are still walking.
 * Returns what it did.
 */
export function startWave(s: GameState): 'start' | 'early' | null {
  if (s.phase === 'build') {
    beginWave(s);
    return 'start';
  }
  if (!canCallEarly(s)) return null;
  finishWave(s);
  s.sap += EARLY_BONUS;
  beginWave(s);
  return 'early';
}

/** Slimes the cells round (col, row), the Queen Slug's cell, afresh. */
function spreadSlime(s: GameState, col: number, row: number) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc;
      const r = row + dr;
      const cell = s.slime.find((x) => x.col === c && x.row === r);
      if (cell) cell.ms = SLIME.ms;
      else s.slime.push({ col: c, row: r, ms: SLIME.ms });
    }
  }
}

/** Plays `dt` ms of game time (twice as much with the speed button on: the scene passes it in). */
export function tick(s: GameState, dt: number) {
  for (let left = dt; left > 0 && s.phase !== 'over'; left -= STEP_MS) step(s, Math.min(STEP_MS, left));
}

function step(s: GameState, dt: number) {
  const { routes } = gardenOf(s);
  for (const shot of s.shots) shot.ms -= dt;
  s.shots = s.shots.filter((shot) => shot.ms > 0);
  for (const cell of s.slime) cell.ms -= dt;
  s.slime = s.slime.filter((cell) => cell.ms > 0);

  if (s.phase === 'wave') {
    s.waveMs += dt;
    while (s.queue.length && s.queue[0].atMs <= s.waveMs) {
      const { kind } = s.queue.shift()!;
      const hp = Math.round(PEST_INFO[kind].hp * s.waveHpScale);
      const route = s.spawned++ % routes.length;
      s.pests.push({ id: s.nextId++, kind, hp, maxHp: hp, route, dist: 0, under: false, slowMs: 0, slowFactor: 1, hitMs: 0 });
    }
  }

  // Pests walk on; those reaching the Heartwood take a bite out of it and are gone. A mole is
  // underground in its tunnel; the Queen Slug slimes the cells round the one she is on.
  const gone = (p: Pest) => p.dist >= routes[p.route].length;
  for (const p of s.pests) {
    const info = PEST_INFO[p.kind];
    const slowed = p.slowMs > 0 ? p.slowFactor : 1;
    p.dist += (info.speed * slowed * dt) / 1000;
    p.slowMs = Math.max(0, p.slowMs - dt);
    p.hitMs = Math.max(0, p.hitMs - dt);
    const length = routes[p.route].length;
    p.under = !!info.tunnel && p.dist >= info.tunnel[0] * length && p.dist < info.tunnel[1] * length;
    if (info.slime) {
      const pos = pathPoint(routes[p.route], p.dist);
      const at = cellAt(pos.x, pos.y);
      if (at) spreadSlime(s, at.col, at.row);
    }
    if (gone(p)) {
      s.heart = Math.max(0, s.heart - info.bite);
      p.hp = 0;
    }
  }
  s.pests = s.pests.filter((p) => !gone(p));
  if (s.heart <= 0) {
    s.phase = 'over';
    return;
  }

  // Seeds grow; grown golems throw at the pest furthest along the path within reach, or a thorn
  // golem pricks every pest within reach.
  for (const g of s.golems) {
    if (g.growMs > 0) {
      g.growMs = Math.max(0, g.growMs - dt);
      continue;
    }
    g.cooldownMs = Math.max(0, g.cooldownMs - dt * (slimed(s, g.col, g.row) ? SLIME.slow : 1));
    if (g.cooldownMs > 0) continue;
    const info = GOLEM_INFO[g.kind];
    const { damage, range } = golemStats(g.kind, g.level);
    const at = cellCentre(g.col, g.row);
    const inReach = s.pests.filter((p) => {
      if (p.hp <= 0 || p.under) return false;
      const pos = pathPoint(routes[p.route], p.dist);
      return Math.hypot(pos.x - at.x, pos.y - at.y) <= range;
    });
    if (!inReach.length) continue;
    const combo = comboAt(s, g.kind, g.col, g.row);
    const pricks = combo === 'twice' ? COMBO.thornPricks : 1;
    const targets = info.area ? inReach : [inReach.reduce((a, b) => (b.dist / routes[b.route].length > a.dist / routes[a.route].length ? b : a))];
    for (const target of targets) {
      const boost = combo === 'slowed' && target.slowMs > 0 ? COMBO.slowedDamage : 1;
      const armour = PEST_INFO[target.kind].armour ?? 0;
      target.hp -= pricks * Math.max(1, damage * boost - armour);
      target.hitMs = HIT_MS;
      if (info.slow) {
        target.slowMs = info.slow.ms;
        target.slowFactor = info.slow.factor;
      }
      const to = pathPoint(routes[target.route], target.dist);
      for (let k = 0; k < pricks; k++) {
        s.shots.push({ id: s.nextId++, kind: g.kind, from: { x: at.x, y: at.y - 14 }, to: { x: to.x, y: to.y }, ms: SHOT_MS + k * SHOT_MS * 0.5 });
      }
    }
    g.cooldownMs = info.cooldownMs;
  }

  // Squashed pests drop their sap.
  for (const p of s.pests) {
    if (p.hp > 0) continue;
    const bounty = PEST_INFO[p.kind].bounty;
    s.sap += bounty;
    s.kills++;
    const at = pathPoint(routes[p.route], p.dist);
    s.pops.push({ x: at.x, y: at.y, sap: bounty });
  }
  s.pests = s.pests.filter((p) => p.hp > 0);

  if (s.phase === 'wave' && !s.queue.length && !s.pests.length) {
    finishWave(s);
    s.phase = 'build';
  }
}
