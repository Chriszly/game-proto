import { distances, nextStep, UNREACHABLE } from './grid';
import { cellIndex, cellOf, MAPS, type MapDef } from './maps';
import {
  CHEW_GAIN, CHEW_TIME, COLS, EARLY_BONUS, FINAL_QUEEN, FOE, GROUP_GAP, HP_PER_WAVE, hpScale, MAX_LEVEL, ROWS,
  SECOND_GATE, SELL_BACK, SHOT_SPEED, START_GOLD, startLives, TOWER, upgradeCost, WAVES, waveReward,
  type FoeKind, type TowerKind,
} from './rules';

// A game of Mazewright, with no Phaser: the grid, the towers, the foes, the shots and the waves.
// The scene calls the actions (`build`, `upgrade`, `sell`, `startWave`) and `step` with fixed
// time steps, and drains `events` for sound and effects. Positions are in cells: (0.5, 0.5) is
// the middle of the top-left cell.

export interface Tower {
  id: number;
  kind: TowerKind;
  cell: number;
  level: number;
  /** Gold paid for it and its upgrades, for selling. */
  spent: number;
  /** Seconds until it can fire again. */
  cooldown: number;
  /** Which way it last aimed, in radians, for drawing. */
  aim: number;
}

export interface Foe {
  id: number;
  kind: FoeKind;
  hp: number;
  maxHp: number;
  /** The burrow it came out of. */
  gate: 0 | 1;
  /** Its position, in cells. */
  x: number;
  y: number;
  /** On the ground: the cell it left, the cell it is walking to and how far along (0 to 1). */
  from: number;
  to: number;
  t: number;
  /** The direction it last stepped in (an index into `DIRS`). */
  heading: number;
  /** Which way it faces, in radians, for drawing. */
  angle: number;
  /** Chilled by frost until this time, walking at `slowFactor` of its speed. */
  slowUntil: number;
  slowFactor: number;
  /** A mole chewing a hedge: the hedge's cell and the seconds left. */
  chew: { cell: number; left: number } | null;
  /** A mole chews one hedge in its life. */
  chewed: boolean;
  dead: boolean;
}

export interface Shot {
  kind: 'bow' | 'cannon';
  x: number;
  y: number;
  target: number;
  /** Where the target was last seen, so a shot whose target died still lands. */
  tx: number;
  ty: number;
  damage: number;
  splash: number;
}

export type GameEvent =
  | { type: 'built'; kind: TowerKind; cell: number }
  | { type: 'refused'; cell: number; reason: Refusal }
  | { type: 'upgraded'; cell: number }
  | { type: 'sold'; cell: number; gold: number }
  | { type: 'shot'; kind: 'bow' | 'cannon' }
  | { type: 'pulse'; x: number; y: number; r: number }
  | { type: 'boom'; x: number; y: number; r: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'kill'; kind: FoeKind; x: number; y: number; gold: number }
  | { type: 'leak'; kind: FoeKind; lives: number }
  | { type: 'chewing'; cell: number }
  | { type: 'chewed'; cell: number }
  | { type: 'wave'; wave: number; early: boolean }
  | { type: 'cleared'; wave: number; gold: number }
  | { type: 'won' }
  | { type: 'lost' };

/** Why a tile can't be built on. */
export type Refusal = 'blocks' | 'gold' | 'foe' | 'taken' | 'reserved';

export type Phase = 'build' | 'wave' | 'won' | 'lost';

export interface Game {
  map: MapDef;
  phase: Phase;
  /** The wave in play or last played, from 1; 0 before the first. */
  wave: number;
  /** The last wave whose reward has been paid. */
  paid: number;
  gold: number;
  lives: number;
  maxLives: number;
  /** Per cell: 0 free, 1 a rock, 2 a tower. */
  blocked: Uint8Array;
  towers: Tower[];
  /** The steps from every cell to the cottage. */
  dist: Int16Array;
  gates: [number, number];
  goal: number;
  foes: Foe[];
  shots: Shot[];
  /** Foes still to come out, by the time they do. */
  spawns: { kind: FoeKind; gate: 0 | 1; at: number; wave: number }[];
  /** Seconds of play so far. */
  clock: number;
  kills: number;
  leaks: number;
  /** How many placements were refused, for the test. */
  refusals: number;
  events: GameEvent[];
  nextId: number;
}

export function newGame(mapId: string): Game {
  const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];
  const blocked = new Uint8Array(COLS * ROWS);
  for (const rock of map.rocks) blocked[cellIndex(rock)] = 1;
  const goal = cellIndex(map.goal);
  const lives = startLives();
  return {
    map,
    phase: 'build',
    wave: 0,
    paid: 0,
    gold: START_GOLD,
    lives,
    maxLives: lives,
    blocked,
    towers: [],
    dist: distances(blocked, goal),
    gates: [cellIndex(map.gates[0]), cellIndex(map.gates[1])],
    goal,
    foes: [],
    shots: [],
    spawns: [],
    clock: 0,
    kills: 0,
    leaks: 0,
    refusals: 0,
    events: [],
    nextId: 1,
  };
}

export const towerAt = (g: Game, cell: number) => g.towers.find((t) => t.cell === cell);
const centre = (cell: number) => {
  const [x, y] = cellOf(cell);
  return { x: x + 0.5, y: y + 0.5 };
};
const over = (g: Game) => g.phase === 'won' || g.phase === 'lost';

/** Whether a field leaves both burrows, and every foe on the ground, a way to the cottage. */
function open(g: Game, dist: Int16Array) {
  if (dist[g.gates[0]] === UNREACHABLE || dist[g.gates[1]] === UNREACHABLE) return false;
  return g.foes.every((f) => f.dead || FOE[f.kind].flies || dist[f.to] !== UNREACHABLE);
}

/** Whether a `kind` tower can go on `cell` right now, and if not why. */
export function canBuild(g: Game, cell: number, kind: TowerKind): Refusal | null {
  if (cell === g.goal || g.gates.includes(cell)) return 'reserved';
  if (g.blocked[cell]) return 'taken';
  if (g.foes.some((f) => !f.dead && !FOE[f.kind].flies && (f.from === cell || f.to === cell))) return 'foe';
  if (wouldBlock(g, cell)) return 'blocks';
  if (g.gold < TOWER[kind].cost) return 'gold';
  return null;
}

/** Whether blocking `cell` would cut every way from a burrow, or from a foe, to the cottage. */
export function wouldBlock(g: Game, cell: number) {
  if (g.blocked[cell]) return false;
  const blocked = g.blocked.slice();
  blocked[cell] = 2;
  return !open(g, distances(blocked, g.goal));
}

export function build(g: Game, cell: number, kind: TowerKind): Refusal | null {
  if (over(g)) return 'taken';
  const refusal = canBuild(g, cell, kind);
  if (refusal) {
    if (refusal !== 'taken') g.refusals++;
    g.events.push({ type: 'refused', cell, reason: refusal });
    return refusal;
  }
  g.gold -= TOWER[kind].cost;
  g.towers.push({ id: g.nextId++, kind, cell, level: 1, spent: TOWER[kind].cost, cooldown: 0, aim: 0 });
  g.blocked[cell] = 2;
  g.dist = distances(g.blocked, g.goal);
  g.events.push({ type: 'built', kind, cell });
  return null;
}

/** The gold an upgrade of `tower` costs, or null when it can't go higher. */
export function nextUpgrade(tower: Tower) {
  return tower.kind === 'hedge' || tower.level >= MAX_LEVEL ? null : upgradeCost(tower.kind, tower.level);
}

export function upgrade(g: Game, cell: number) {
  const tower = towerAt(g, cell);
  const cost = tower && nextUpgrade(tower);
  if (!tower || cost === null || cost === undefined || g.gold < cost || over(g)) return false;
  g.gold -= cost;
  tower.spent += cost;
  tower.level++;
  g.events.push({ type: 'upgraded', cell });
  return true;
}

export const sellValue = (tower: Tower) => Math.floor(tower.spent * SELL_BACK);

/** Sells a tower; freeing a cell never closes a route, so it is always allowed. */
export function sell(g: Game, cell: number) {
  const tower = towerAt(g, cell);
  if (!tower || over(g)) return false;
  const gold = sellValue(tower);
  g.gold += gold;
  removeTower(g, tower);
  g.events.push({ type: 'sold', cell, gold });
  return true;
}

function removeTower(g: Game, tower: Tower) {
  g.towers.splice(g.towers.indexOf(tower), 1);
  g.blocked[tower.cell] = 0;
  g.dist = distances(g.blocked, g.goal);
}

/** Whether the next wave can be started: between waves, or once the wave in play is all out. */
export const canStartWave = (g: Game) => !over(g) && g.wave < WAVES.length && g.spawns.length === 0;

/** Starts the next wave; called while foes are still out, it pays a small bonus. */
export function startWave(g: Game) {
  if (!canStartWave(g)) return false;
  const early = g.foes.length > 0;
  if (early) g.gold += EARLY_BONUS;
  g.wave++;
  g.phase = 'wave';
  let at = g.clock + 0.5;
  let turn = 0;
  for (const [kind, count] of WAVES[g.wave - 1]) {
    for (let i = 0; i < count; i++) {
      const gate = g.wave >= SECOND_GATE ? ((turn++ % 2) as 0 | 1) : 0;
      g.spawns.push({ kind, gate, at, wave: g.wave });
      at += FOE[kind].gap;
    }
    at += GROUP_GAP - FOE[kind].gap;
  }
  g.events.push({ type: 'wave', wave: g.wave, early });
  return true;
}

function spawn(g: Game, kind: FoeKind, gate: 0 | 1, wave: number) {
  const def = FOE[kind];
  const hp = Math.round(def.hp * (1 + HP_PER_WAVE * (wave - 1)) * hpScale() * (kind === 'queen' && wave === WAVES.length ? FINAL_QUEEN : 1));
  const cell = g.gates[gate];
  const { x, y } = centre(cell);
  g.foes.push({
    id: g.nextId++, kind, hp, maxHp: hp, gate, x, y, from: cell, to: cell, t: 1, heading: 0, angle: 0,
    slowUntil: 0, slowFactor: 1, chew: null, chewed: false, dead: false,
  });
}

/** How far a foe still has to go, in cells: what towers aim by (the closest to the cottage first). */
export function remaining(g: Game, f: Foe) {
  if (FOE[f.kind].flies) {
    const goal = centre(g.goal);
    return Math.hypot(goal.x - f.x, goal.y - f.y);
  }
  if (f.chew) return g.dist[f.from];
  return g.dist[f.to] + (1 - f.t);
}

/** A hedge next to `from` whose removal would save a mole at least `CHEW_GAIN` steps, or -1. */
function hedgeToChew(g: Game, from: number) {
  const here = g.dist[from];
  const [x, y] = cellOf(from);
  let best = -1;
  let bestGain = CHEW_GAIN - 1;
  for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
    const hx = x + dx;
    const hy = y + dy;
    if (hx < 0 || hy < 0 || hx >= COLS || hy >= ROWS) continue;
    const hedge = hy * COLS + hx;
    if (towerAt(g, hedge)?.kind !== 'hedge') continue;
    // The best cell past the hedge, two steps from here.
    for (const [ex, ey] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const nx = hx + ex;
      const ny = hy + ey;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const past = g.dist[ny * COLS + nx];
      if (past === UNREACHABLE) continue;
      const gain = here - (past + 2);
      if (gain > bestGain) (bestGain = gain), (best = hedge);
    }
  }
  return best;
}

function hurt(g: Game, f: Foe, damage: number) {
  if (f.dead) return;
  f.hp -= damage;
  if (f.hp > 0) return;
  f.dead = true;
  const gold = FOE[f.kind].gold;
  g.gold += gold;
  g.kills++;
  g.events.push({ type: 'kill', kind: f.kind, x: f.x, y: f.y, gold });
}

function moveFoe(g: Game, f: Foe, dt: number) {
  const def = FOE[f.kind];
  const speed = def.speed * (g.clock < f.slowUntil ? f.slowFactor : 1);
  if (def.flies) {
    const goal = centre(g.goal);
    const dx = goal.x - f.x;
    const dy = goal.y - f.y;
    const d = Math.hypot(dx, dy);
    f.angle = Math.atan2(dy, dx);
    if (d <= speed * dt) return leak(g, f);
    f.x += (dx / d) * speed * dt;
    f.y += (dy / d) * speed * dt;
    return;
  }
  if (f.chew) {
    f.chew.left -= dt;
    if (f.chew.left > 0) return;
    const hedge = towerAt(g, f.chew.cell);
    if (hedge?.kind === 'hedge') {
      removeTower(g, hedge);
      g.events.push({ type: 'chewed', cell: f.chew.cell });
    }
    f.chew = null;
    f.chewed = true;
  }
  f.t += speed * dt;
  while (f.t >= 1) {
    f.t -= 1;
    f.from = f.to;
    if (f.from === g.goal) return leak(g, f);
    if (def.digs && !f.chewed) {
      const hedge = hedgeToChew(g, f.from);
      if (hedge >= 0) {
        f.chew = { cell: hedge, left: CHEW_TIME };
        f.t = 0;
        const [hx, hy] = cellOf(hedge);
        const [x, y] = cellOf(f.from);
        f.angle = Math.atan2(hy - y, hx - x);
        g.events.push({ type: 'chewing', cell: hedge });
        break;
      }
    }
    const step = nextStep(g.dist, f.from, f.heading);
    if (!step) {
      f.t = 0;
      break;
    }
    f.to = step.cell;
    f.heading = step.dir;
  }
  const a = centre(f.from);
  const b = centre(f.to);
  f.x = a.x + (b.x - a.x) * f.t;
  f.y = a.y + (b.y - a.y) * f.t;
  if (f.to !== f.from) f.angle = Math.atan2(b.y - a.y, b.x - a.x);
}

function leak(g: Game, f: Foe) {
  f.dead = true;
  g.leaks++;
  const lives = FOE[f.kind].lives;
  g.lives = Math.max(0, g.lives - lives);
  g.events.push({ type: 'leak', kind: f.kind, lives });
}

function fire(g: Game, tower: Tower, dt: number) {
  const def = TOWER[tower.kind];
  tower.cooldown = Math.max(0, tower.cooldown - dt);
  if (tower.kind === 'hedge' || tower.cooldown > 0) return;
  const { x, y } = centre(tower.cell);
  const lvl = tower.level - 1;
  const inRange = g.foes.filter((f) => !f.dead && (def.air || !FOE[f.kind].flies) && Math.hypot(f.x - x, f.y - y) <= def.range);
  if (inRange.length === 0) return;
  tower.cooldown = def.reload[lvl];
  if (tower.kind === 'frost') {
    for (const f of inRange) {
      f.slowUntil = g.clock + def.slowFor!;
      f.slowFactor = def.slow![lvl];
      hurt(g, f, def.damage[lvl]);
    }
    g.events.push({ type: 'pulse', x, y, r: def.range });
    return;
  }
  let target = inRange[0];
  for (const f of inRange) if (remaining(g, f) < remaining(g, target)) target = f;
  tower.aim = Math.atan2(target.y - y, target.x - x);
  const kind = tower.kind === 'bow' ? 'bow' : 'cannon';
  g.shots.push({ kind, x, y, target: target.id, tx: target.x, ty: target.y, damage: def.damage[lvl], splash: def.splash ?? 0 });
  g.events.push({ type: 'shot', kind });
}

function moveShot(g: Game, s: Shot, dt: number) {
  const target = g.foes.find((f) => f.id === s.target && !f.dead);
  if (target) (s.tx = target.x), (s.ty = target.y);
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const d = Math.hypot(dx, dy);
  const travel = SHOT_SPEED[s.kind] * dt;
  if (d > travel) {
    s.x += (dx / d) * travel;
    s.y += (dy / d) * travel;
    return false;
  }
  if (s.kind === 'bow') {
    if (target) {
      hurt(g, target, s.damage);
      g.events.push({ type: 'hit', x: s.tx, y: s.ty });
    }
  } else {
    for (const f of g.foes) if (!f.dead && !FOE[f.kind].flies && Math.hypot(f.x - s.tx, f.y - s.ty) <= s.splash + FOE[f.kind].size) hurt(g, f, s.damage);
    g.events.push({ type: 'boom', x: s.tx, y: s.ty, r: s.splash });
  }
  return true;
}

/** Plays `dt` seconds. */
export function step(g: Game, dt: number) {
  if (over(g)) return;
  g.clock += dt;
  while (g.spawns.length && g.spawns[0].at <= g.clock) {
    const s = g.spawns.shift()!;
    spawn(g, s.kind, s.gate, s.wave);
  }
  for (const f of g.foes) if (!f.dead) moveFoe(g, f, dt);
  for (const t of g.towers) fire(g, t, dt);
  g.shots = g.shots.filter((s) => !moveShot(g, s, dt));
  g.foes = g.foes.filter((f) => !f.dead);
  if (g.lives <= 0) {
    g.phase = 'lost';
    g.events.push({ type: 'lost' });
    return;
  }
  if (g.phase === 'wave' && g.spawns.length === 0 && g.foes.length === 0) {
    let gold = 0;
    for (; g.paid < g.wave; g.paid++) gold += waveReward(g.paid + 1);
    g.gold += gold;
    g.shots = [];
    g.events.push({ type: 'cleared', wave: g.wave, gold });
    if (g.wave >= WAVES.length) {
      g.phase = 'won';
      g.events.push({ type: 'won' });
    } else g.phase = 'build';
  }
}

/** The cells of the route from a burrow to the cottage, as foes would walk it now. */
export function routeLength(g: Game, gate: 0 | 1) {
  return g.dist[g.gates[gate]];
}
