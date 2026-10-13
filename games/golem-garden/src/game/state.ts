// The garden's state and the rules that change it. No Phaser: the scene calls these on taps and
// calls `tick` every frame with the game time that passed.
import { MAP, PATH_LENGTH, cellCentre, pathPoint } from './board';
import {
  GOLEM_INFO,
  MAX_LEVEL,
  PEST_INFO,
  START,
  UPGRADE_COST,
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
}

export interface Pest {
  id: number;
  kind: PestKind;
  hp: number;
  maxHp: number;
  /** How far along the path it has walked, in pixels. */
  dist: number;
  /** Time left on a moss golem's slow, in ms. */
  slowMs: number;
  slowFactor: number;
  /** Time left on its hit flash, in ms. */
  hitMs: number;
}

/** A thrown stone or moss clump in flight, drawn by the scene; its damage lands when thrown. */
export interface Shot {
  id: number;
  kind: GolemKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
  ms: number;
}

export interface GameState {
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
  /** Time since the current wave started, in ms. */
  waveMs: number;
  waveHpScale: number;
  shots: Shot[];
  kills: number;
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

export function newGame(best: number): GameState {
  return {
    wave: 1,
    phase: 'build',
    heart: START.heart,
    sap: START.sap,
    selected: 'pebble',
    golems: [],
    pests: [],
    queue: [],
    waveMs: 0,
    waveHpScale: 1,
    shots: [],
    kills: 0,
    best,
    nextId: 1,
  };
}

export function select(s: GameState, kind: GolemKind) {
  s.selected = kind;
}

export const golemAt = (s: GameState, col: number, row: number) => s.golems.find((g) => g.col === col && g.row === row);

/** Whether the selected seed can be planted at (col, row) now. */
export function canPlant(s: GameState, col: number, row: number) {
  return s.phase !== 'over' && MAP[row]?.[col] === 'soil' && !golemAt(s, col, row) && s.sap >= GOLEM_INFO[s.selected].cost;
}

/** Plants the selected seed on an empty soil cell, if there is sap for it. */
export function plant(s: GameState, col: number, row: number) {
  if (!canPlant(s, col, row)) return false;
  const info = GOLEM_INFO[s.selected];
  s.sap -= info.cost;
  s.golems.push({ id: s.nextId++, kind: s.selected, col, row, level: 1, growMs: info.growMs, cooldownMs: 0 });
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
  g.level++;
  return true;
}

/** Sends the next wave in; only between waves. */
export function startWave(s: GameState) {
  if (s.phase !== 'build') return false;
  const { spawns, hpScale } = waveFor(s.wave);
  s.phase = 'wave';
  s.queue = spawns;
  s.waveHpScale = hpScale;
  s.waveMs = 0;
  return true;
}

/** Plays `dt` ms of game time. */
export function tick(s: GameState, dt: number) {
  for (let left = dt; left > 0 && s.phase !== 'over'; left -= STEP_MS) step(s, Math.min(STEP_MS, left));
}

function step(s: GameState, dt: number) {
  for (const shot of s.shots) shot.ms -= dt;
  s.shots = s.shots.filter((shot) => shot.ms > 0);

  if (s.phase === 'wave') {
    s.waveMs += dt;
    while (s.queue.length && s.queue[0].atMs <= s.waveMs) {
      const { kind } = s.queue.shift()!;
      const hp = Math.round(PEST_INFO[kind].hp * s.waveHpScale);
      s.pests.push({ id: s.nextId++, kind, hp, maxHp: hp, dist: 0, slowMs: 0, slowFactor: 1, hitMs: 0 });
    }
  }

  // Pests walk on; those reaching the Heartwood take a bite out of it and are gone.
  for (const p of s.pests) {
    const slowed = p.slowMs > 0 ? p.slowFactor : 1;
    p.dist += (PEST_INFO[p.kind].speed * slowed * dt) / 1000;
    p.slowMs = Math.max(0, p.slowMs - dt);
    p.hitMs = Math.max(0, p.hitMs - dt);
    if (p.dist >= PATH_LENGTH) {
      s.heart = Math.max(0, s.heart - PEST_INFO[p.kind].bite);
      p.hp = 0;
    }
  }
  s.pests = s.pests.filter((p) => p.dist < PATH_LENGTH);
  if (s.heart <= 0) {
    s.phase = 'over';
    return;
  }

  // Seeds grow; grown golems throw at the pest furthest along the path within reach.
  for (const g of s.golems) {
    if (g.growMs > 0) {
      g.growMs = Math.max(0, g.growMs - dt);
      continue;
    }
    g.cooldownMs = Math.max(0, g.cooldownMs - dt);
    if (g.cooldownMs > 0) continue;
    const { damage, range } = golemStats(g.kind, g.level);
    const at = cellCentre(g.col, g.row);
    let target: Pest | null = null;
    for (const p of s.pests) {
      if (p.hp <= 0) continue;
      const pos = pathPoint(p.dist);
      if (Math.hypot(pos.x - at.x, pos.y - at.y) > range) continue;
      if (!target || p.dist > target.dist) target = p;
    }
    if (!target) continue;
    target.hp -= damage;
    target.hitMs = HIT_MS;
    const slow = GOLEM_INFO[g.kind].slow;
    if (slow) {
      target.slowMs = slow.ms;
      target.slowFactor = slow.factor;
    }
    g.cooldownMs = GOLEM_INFO[g.kind].cooldownMs;
    const to = pathPoint(target.dist);
    s.shots.push({ id: s.nextId++, kind: g.kind, from: { x: at.x, y: at.y - 14 }, to: { x: to.x, y: to.y }, ms: SHOT_MS });
  }

  // Squashed pests drop their sap.
  for (const p of s.pests) {
    if (p.hp > 0) continue;
    s.sap += PEST_INFO[p.kind].bounty;
    s.kills++;
  }
  s.pests = s.pests.filter((p) => p.hp > 0);

  if (s.phase === 'wave' && !s.queue.length && !s.pests.length) {
    s.sap += waveBonus(s.wave);
    s.best = Math.max(s.best, s.wave);
    s.wave++;
    s.phase = 'build';
  }
}
