import { DIRS, distances, nextStep, route, UNREACHABLE } from './grid';
import { cellIndex, cellOf, inGrid, MAPS, type MapDef } from './maps';
import {
  AIMS, attacks, BIG, CABBAGE, RUSH, CHEW_GAIN, EMPRESS, HEAT, KING, KING_TRICKS, RUSH_KINDS, shellFactor, CHEW_TIME, COLS, EARLY_BONUS, FINAL_QUEEN, FOE, GROUP_GAP, HP_PER_WAVE, hpScale, MAX_LEVEL, ROWS,
  GROW_RATE, SECOND_GATE, SELL_BACK, WAVE_TIMER, SHOT_SPEED, SPREAD, START_GOLD, startLives, TOWER, upgradeCost, WAVES, waveReward,
  type Aim, type DamageKind, type FoeKind, type ShellKind, type ShotKind, type TowerKind,
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
  /** Bonfire and sunglass: the way it points, an index into `DIRS`. */
  face: number;
  /** Whirligig: how far it has spun up (0 to 1), and the seconds since its last shot. */
  spin: number;
  idle: number;
  /** How it picks a target (`AIMS`). */
  target: Aim;
  /** Seconds it still grows (built or upgraded), out of `growFull`; it doesn't fire while it grows. */
  grow: number;
  growFull: number;
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
  /** Set alight by a bonfire, or poisoned by a puffball, until these times, taking this much a second. */
  burnUntil: number;
  burnDps: number;
  poisonUntil: number;
  poisonDps: number;
  /** Puffball poison spreads to foes walking close; spores caught that way spread no further. */
  spreads: boolean;
  spreadAt: number;
  /** Sunglass and bonfire heat, 0 to 1; a fully heated foe takes double heat damage. */
  heat: number;
  /** A mole chewing a hedge: the hedge's cell and the seconds left. */
  chew: { cell: number; left: number } | null;
  /** Hedges a mole may still chew: one, or three for a king. */
  chews: number;
  /** A crowned king, and a bigger beetle's size (1, 2 or 3). */
  king: boolean;
  big: 1 | 2 | 3;
  /** Its body's radius in cells. */
  body: number;
  /** Gold when beaten and lives when it gets in. */
  gold: number;
  lives: number;
  /** Woodlice it splits into when beaten. */
  splits: number;
  /** Its shell now: its kind's, or the Empress's latest. */
  shell: ShellKind | undefined;
  /** Cabbages it carries off; once it has some (or found the patch empty) it walks home to its burrow. */
  carry: number;
  home: boolean;
  /** The Empress: when she next lays a beetle and turns her shell, and the damage she took since. */
  empress: { eggAt: number; turnAt: number; taken: Partial<Record<DamageKind, number>> } | null;
  dead: boolean;
}

/** Cabbages dropped by a beaten foe, rolling back to the patch until a foe picks them up. */
export interface Loose {
  id: number;
  n: number;
  x: number;
  y: number;
  /** On the ground like a foe: the cell it left, the cell it rolls to and how far along. In the air (off a moth) `from` is -1 and it rolls straight. */
  from: number;
  to: number;
  t: number;
}

export interface Shot {
  kind: ShotKind;
  x: number;
  y: number;
  target: number;
  /** Where the target was last seen, so a shot whose target died still lands. */
  tx: number;
  ty: number;
  damage: number;
  splash: number;
  hits: DamageKind;
}

export type GameEvent =
  | { type: 'built'; kind: TowerKind; cell: number }
  | { type: 'refused'; cell: number; reason: Refusal }
  | { type: 'upgraded'; cell: number }
  | { type: 'sold'; cell: number; gold: number }
  | { type: 'shot'; kind: TowerKind }
  | { type: 'bolt'; points: { x: number; y: number }[] }
  | { type: 'flame'; x: number; y: number; angle: number; r: number; cone: number }
  | { type: 'beam'; x: number; y: number; x2: number; y2: number }
  | { type: 'puff'; x: number; y: number }
  | { type: 'apples'; cell: number; gold: number }
  | { type: 'pulse'; x: number; y: number; r: number }
  | { type: 'boom'; x: number; y: number; r: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'kill'; kind: FoeKind; x: number; y: number; gold: number }
  | { type: 'grab'; kind: FoeKind; n: number }
  | { type: 'leak'; kind: FoeKind; lives: number }
  | { type: 'drop'; x: number; y: number; n: number }
  | { type: 'pickup'; x: number; y: number }
  | { type: 'saved'; n: number }
  | { type: 'chewing'; cell: number }
  | { type: 'chewed'; cell: number }
  | { type: 'king'; kind: FoeKind }
  | { type: 'rush' }
  | { type: 'split'; x: number; y: number }
  | { type: 'egg'; x: number; y: number }
  | { type: 'shell'; shell: ShellKind }
  | { type: 'wave'; wave: number; early: boolean }
  | { type: 'cleared'; wave: number; gold: number }
  | { type: 'won' }
  | { type: 'lost' };

/** Why a tile can't be built on. */
export type Refusal = 'blocks' | 'gold' | 'foe' | 'taken' | 'reserved';

export type Phase = 'build' | 'wave' | 'won' | 'lost';

/** A foe still to come out of a burrow. */
export interface Spawn {
  kind: FoeKind;
  gate: 0 | 1;
  at: number;
  wave: number;
  big?: 2 | 3;
  king?: boolean;
  /** The first king of the last wave's rush. */
  rush?: boolean;
}

export interface Game {
  map: MapDef;
  phase: Phase;
  /** The wave in play or last played, from 1; 0 before the first. */
  wave: number;
  /** The last wave whose reward has been paid. */
  paid: number;
  gold: number;
  /** Cabbages in the patch by the cottage (the lives), and how many it started with. */
  lives: number;
  maxLives: number;
  /** Cabbages lying loose on the lawn. */
  loose: Loose[];
  /** Per cell: 0 free, 1 a rock, 2 a tower. */
  blocked: Uint8Array;
  towers: Tower[];
  /** The steps from every cell to the cottage, and to each burrow for foes carrying cabbages home. */
  dist: Int16Array;
  homeDist: [Int16Array, Int16Array];
  gates: [number, number];
  goal: number;
  foes: Foe[];
  shots: Shot[];
  /** Foes still to come out, by the time they do. */
  spawns: Spawn[];
  /** Calm: waves come only when started. Otherwise, after wave 1, the next comes by itself at `nextAt`. */
  calm: boolean;
  nextAt: number | null;
  /** Seconds of play so far. */
  clock: number;
  kills: number;
  leaks: number;
  /** How many placements were refused, for the test. */
  refusals: number;
  events: GameEvent[];
  nextId: number;
}

export function newGame(mapId: string, calm = false): Game {
  const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];
  const blocked = new Uint8Array(COLS * ROWS);
  for (const rock of map.rocks) blocked[cellIndex(rock)] = 1;
  const goal = cellIndex(map.goal);
  const lives = startLives();
  const gates: [number, number] = [cellIndex(map.gates[0]), cellIndex(map.gates[1])];
  return {
    map,
    phase: 'build',
    wave: 0,
    paid: 0,
    gold: START_GOLD,
    lives,
    maxLives: lives,
    loose: [],
    blocked,
    towers: [],
    dist: distances(blocked, goal),
    homeDist: [distances(blocked, gates[0]), distances(blocked, gates[1])],
    gates,
    goal,
    foes: [],
    shots: [],
    spawns: [],
    calm,
    nextAt: null,
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

/** Makes the walking fields again after a cell was blocked or freed. */
function refield(g: Game) {
  g.dist = distances(g.blocked, g.goal);
  g.homeDist = [distances(g.blocked, g.gates[0]), distances(g.blocked, g.gates[1])];
}

/** All the cabbages still in the game: in the patch, carried and loose. */
export const cabbagesLeft = (g: Game) => g.lives + g.foes.reduce((n, f) => n + (f.dead ? 0 : f.carry), 0) + g.loose.reduce((n, c) => n + c.n, 0);

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
  if (g.loose.some((c) => c.from === cell || c.to === cell)) return 'foe';
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
  const face = TOWER[kind].faces ? bestFace(g, cell, kind) : 0;
  g.towers.push({ id: g.nextId++, kind, cell, level: 1, spent: TOWER[kind].cost, cooldown: 0, aim: Math.atan2(DIRS[face][1], DIRS[face][0]), face, spin: 0, idle: 0, target: TOWER[kind].aim ?? 'first', grow: 0, growFull: 0 });
  growFor(g.towers[g.towers.length - 1], TOWER[kind].cost);
  g.blocked[cell] = 2;
  refield(g);
  g.events.push({ type: 'built', kind, cell });
  return null;
}

/** A tower starts growing for what it cost. */
function growFor(tower: Tower, cost: number) {
  tower.grow = tower.growFull = cost / GROW_RATE;
}

/** The route cells foes walk now, from both burrows. */
function routeCells(g: Game) {
  return new Set(g.gates.flatMap((gate) => route(g.dist, gate)));
}

/** The cells a sunglass on `cell` facing `face` shines over: up to the first rock or tower. */
export function beamCells(g: Game, cell: number, face: number) {
  const cells: number[] = [];
  let [x, y] = cellOf(cell);
  const [dx, dy] = DIRS[face];
  for (x += dx, y += dy; inGrid(x, y) && !g.blocked[y * COLS + x]; x += dx, y += dy) cells.push(y * COLS + x);
  return cells;
}

/** Whether a point (in cells) is in a bonfire's cone from `cell` facing `face`, within `extra` of its reach. */
export function inCone(cell: number, face: number, px: number, py: number, extra = 0) {
  const { x, y } = centre(cell);
  const d = Math.hypot(px - x, py - y);
  if (d > TOWER.bonfire.range + extra || d < 0.01) return false;
  const off = Math.atan2(py - y, px - x) - Math.atan2(DIRS[face][1], DIRS[face][0]);
  return Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) <= TOWER.bonfire.cone!;
}

/** The way a new bonfire or sunglass first points: where it covers the most of today's route. */
export function bestFace(g: Game, cell: number, kind: TowerKind) {
  const path = routeCells(g);
  let best = 0;
  let most = -1;
  DIRS.forEach((_, face) => {
    let n = 0;
    if (kind === 'sunglass') for (const c of beamCells(g, cell, face)) n += path.has(c) ? 1 : 0;
    else for (const c of path) {
      const m = centre(c);
      if (inCone(cell, face, m.x, m.y)) n++;
    }
    if (n > most) (most = n), (best = face);
  });
  return best;
}

/** Moves a tower's aim on to the next way of picking a target. */
export function setAim(g: Game, cell: number) {
  const tower = towerAt(g, cell);
  if (!tower || over(g)) return false;
  tower.target = AIMS[(AIMS.indexOf(tower.target) + 1) % AIMS.length];
  return true;
}

/** Turns a bonfire or sunglass a quarter round, clockwise. */
export function turn(g: Game, cell: number) {
  const tower = towerAt(g, cell);
  if (!tower || !TOWER[tower.kind].faces || over(g)) return false;
  tower.face = [1, 3, 0, 2][tower.face];
  tower.aim = Math.atan2(DIRS[tower.face][1], DIRS[tower.face][0]);
  return true;
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
  growFor(tower, cost);
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
  refield(g);
}

/** Whether the next wave can be started: between waves, or once the wave in play is all out. */
export const canStartWave = (g: Game) => !over(g) && g.wave < WAVES.length && g.spawns.length === 0;

/** Starts the next wave; called while foes are still out, it pays a small bonus. */
export function startWave(g: Game) {
  if (!canStartWave(g)) return false;
  const early = g.foes.length > 0;
  if (early) g.gold += EARLY_BONUS;
  g.nextAt = null;
  g.wave++;
  g.phase = 'wave';
  let at = g.clock + 0.5;
  let turn = 0;
  const gateFor = () => (g.wave >= SECOND_GATE ? ((turn++ % 2) as 0 | 1) : 0);
  for (const [kind, count, opts] of WAVES[g.wave - 1]) {
    for (let i = 0; i < count; i++) {
      g.spawns.push({ kind, gate: gateFor(), at, wave: g.wave, big: opts?.size, king: opts?.king });
      at += FOE[kind].gap * (opts?.king ? 2 : 1);
    }
    at += GROUP_GAP - FOE[kind].gap;
  }
  if (g.wave === WAVES.length) {
    // The rush: one king of every kind, a while after the queen is out.
    at += RUSH.delay;
    RUSH_KINDS.forEach((kind, i) => {
      g.spawns.push({ kind, gate: gateFor(), at, wave: g.wave, king: true, rush: i === 0 });
      at += RUSH.gap;
    });
  }
  g.events.push({ type: 'wave', wave: g.wave, early });
  return true;
}

function spawn(g: Game, sp: Spawn) {
  const { kind, wave } = sp;
  const def = FOE[kind];
  const plain = { hp: 1, gold: 1, lives: 1, body: 1 };
  const sized = sp.big ? BIG[sp.big] : plain;
  const king = sp.king ? KING : plain;
  const empress = kind === 'queen' && wave === WAVES.length;
  const hp = Math.round(def.hp * (1 + HP_PER_WAVE * (wave - 1)) * hpScale() * (empress ? FINAL_QUEEN : 1) * sized.hp * king.hp);
  const cell = g.gates[sp.gate];
  const { x, y } = centre(cell);
  const f = makeFoe(g, kind, hp, sp.gate, x, y, cell);
  f.king = !!sp.king;
  f.big = sp.big ?? 1;
  f.body = def.size * sized.body * king.body;
  f.gold = def.gold * sized.gold * king.gold;
  f.lives = def.lives * sized.lives * king.lives;
  if (f.king) {
    f.chews = def.digs ? KING_TRICKS.chews : 0;
    f.splits = def.splits ? KING_TRICKS.splits : 0;
    g.events.push({ type: 'king', kind });
  }
  if (empress) f.empress = { eggAt: g.clock + EMPRESS.egg, turnAt: g.clock + EMPRESS.turn, taken: {} };
  if (sp.rush) g.events.push({ type: 'rush' });
}

/** A new foe of `kind` with `hp` at a point, standing on `cell`. */
function makeFoe(g: Game, kind: FoeKind, hp: number, gate: 0 | 1, x: number, y: number, cell: number): Foe {
  const def = FOE[kind];
  const f: Foe = {
    id: g.nextId++, kind, hp, maxHp: hp, gate, x, y, from: cell, to: cell, t: 1, heading: 0, angle: 0,
    slowUntil: 0, slowFactor: 1, burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0, spreads: false, spreadAt: 0, heat: 0,
    chew: null, chews: def.digs ? 1 : 0, king: false, big: 1, body: def.size, gold: def.gold, lives: def.lives,
    splits: def.splits ?? 0, shell: def.shell, carry: 0, home: false, empress: null, dead: false,
  };
  g.foes.push(f);
  return f;
}

/** A foe born from another (a split woodlouse, an egg, a king moth's moths), walking on from where it was. */
function offspring(g: Game, parent: Foe, kind: FoeKind, hp: number, lag: number) {
  const f = makeFoe(g, kind, hp, parent.gate, parent.x, parent.y, parent.from);
  if (!FOE[kind].flies && !FOE[parent.kind].flies) {
    f.from = parent.from;
    f.to = parent.to;
    f.t = Math.max(0, parent.t - lag);
    f.heading = parent.heading;
  } else if (!FOE[kind].flies) {
    // Off a flier, onto the cell under it.
    const cell = Math.floor(parent.y) * COLS + Math.floor(parent.x);
    f.from = f.to = g.blocked[cell] ? parent.from : cell;
  }
  f.angle = parent.angle;
  return f;
}

/** How far a foe still has to go, in cells: what towers aim by (the closest to the cottage first). */
export function remaining(g: Game, f: Foe) {
  if (f.home) {
    // On its way out, a foe is as close as its way home is short.
    if (FOE[f.kind].flies) {
      const gate = centre(g.gates[f.gate]);
      return Math.hypot(gate.x - f.x, gate.y - f.y);
    }
    return g.homeDist[f.gate][f.to] + (1 - f.t);
  }
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

/** Takes `damage` of a kind off a foe: its shell lets some of it through, and heat doubles on a glowing foe. */
function hurt(g: Game, f: Foe, damage: number, kind: DamageKind) {
  if (f.dead) return;
  let dealt = damage * shellFactor(f.shell, kind);
  if (kind === 'heat' && f.heat >= 1) dealt *= HEAT.boost;
  f.hp -= dealt;
  if (f.empress) f.empress.taken[kind] = (f.empress.taken[kind] ?? 0) + dealt;
  if (f.hp > 0) return;
  f.dead = true;
  const gold = f.gold;
  g.gold += gold;
  g.kills++;
  g.events.push({ type: 'kill', kind: f.kind, x: f.x, y: f.y, gold });
  if (f.carry > 0) drop(g, f);
  if (f.splits > 0) {
    // A woodlouse falls apart into smaller ones, which split no further.
    for (let i = 0; i < f.splits; i++) {
      const child = offspring(g, f, 'woodlouse', Math.round(f.maxHp * (f.king ? 0.2 : 0.35)), i * 0.3);
      child.body = FOE.woodlouse.size * 0.65;
      child.gold = 1;
      child.splits = 0;
    }
    g.events.push({ type: 'split', x: f.x, y: f.y });
  }
  if (f.king && f.kind === 'moth') {
    const hp = Math.round(FOE.moth.hp * (1 + HP_PER_WAVE * (g.wave - 1)) * hpScale());
    for (let i = 0; i < KING_TRICKS.moths; i++) offspring(g, f, 'moth', hp, 0);
  }
}

function moveFoe(g: Game, f: Foe, dt: number) {
  const def = FOE[f.kind];
  const speed = def.speed * (f.king ? KING.speed : 1) * (g.clock < f.slowUntil ? f.slowFactor : 1);
  if (def.flies) {
    const goal = centre(f.home ? g.gates[f.gate] : g.goal);
    const dx = goal.x - f.x;
    const dy = goal.y - f.y;
    const d = Math.hypot(dx, dy);
    f.angle = Math.atan2(dy, dx);
    if (d <= speed * dt) return f.home ? leak(g, f) : grab(g, f);
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
    f.chews--;
  }
  f.t += speed * dt;
  while (f.t >= 1) {
    f.t -= 1;
    f.from = f.to;
    if (f.home ? f.from === g.gates[f.gate] : f.from === g.goal) {
      if (f.home) return leak(g, f);
      grab(g, f);
      if (f.dead) return;
    }
    if (f.chews > 0 && !f.home) {
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
    const step = nextStep(f.home ? g.homeDist[f.gate] : g.dist, f.from, f.heading);
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

/** A foe reaches the patch: it takes its share of cabbages (`lives`) and turns for home. */
function grab(g: Game, f: Foe) {
  g.leaks++;
  const n = Math.min(f.lives, g.lives);
  g.lives -= n;
  f.carry = n;
  f.home = true;
  f.chew = null;
  // An empty patch: it has nothing to take, and is gone.
  if (n === 0) f.dead = true;
  else g.events.push({ type: 'grab', kind: f.kind, n });
}

/** A foe gets back into its burrow, and the cabbages it carries are lost. */
function leak(g: Game, f: Foe) {
  f.dead = true;
  const lives = f.carry;
  f.carry = 0;
  g.events.push({ type: 'leak', kind: f.kind, lives });
}

/** A beaten foe drops its cabbages where it fell. */
function drop(g: Game, f: Foe) {
  const flier = FOE[f.kind].flies;
  g.loose.push({ id: g.nextId++, n: f.carry, x: f.x, y: f.y, from: flier ? -1 : f.from, to: flier ? -1 : f.to, t: flier ? 0 : f.t });
  g.events.push({ type: 'drop', x: f.x, y: f.y, n: f.carry });
  f.carry = 0;
}

/** Loose cabbages roll back to the patch, and a passing foe with free hands picks them up. */
function roll(g: Game, c: Loose, dt: number) {
  for (const f of g.foes) {
    if (f.dead || f.carry > 0 || Math.hypot(f.x - c.x, f.y - c.y) > CABBAGE.reach + f.body) continue;
    f.carry = c.n;
    f.home = true;
    f.chew = null;
    g.events.push({ type: 'pickup', x: c.x, y: c.y });
    return true;
  }
  const move = CABBAGE.speed * dt;
  if (c.from < 0) {
    const goal = centre(g.goal);
    const d = Math.hypot(goal.x - c.x, goal.y - c.y);
    if (d > move) {
      c.x += ((goal.x - c.x) / d) * move;
      c.y += ((goal.y - c.y) / d) * move;
      return false;
    }
  } else {
    c.t += move;
    while (c.t >= 1 && c.to !== g.goal) {
      c.t -= 1;
      c.from = c.to;
      const step = nextStep(g.dist, c.from);
      if (!step) break;
      c.to = step.cell;
    }
    if (c.to !== g.goal || c.t < 1) {
      c.t = Math.min(c.t, 1);
      const a = centre(c.from);
      const b = centre(c.to);
      c.x = a.x + (b.x - a.x) * c.t;
      c.y = a.y + (b.y - a.y) * c.t;
      return false;
    }
  }
  g.lives += c.n;
  g.events.push({ type: 'saved', n: c.n });
  return true;
}

/** Burning and poison, and poison spreading to the foes walking close. */
function afflict(g: Game, f: Foe, dt: number) {
  f.heat = Math.max(0, f.heat - HEAT.cool * dt);
  const heals = FOE[f.kind].heals;
  if (heals && g.clock >= f.slowUntil && g.clock >= f.poisonUntil) f.hp = Math.min(f.maxHp, f.hp + heals * f.maxHp * dt);
  if (f.empress) empress(g, f);
  if (g.clock < f.burnUntil) hurt(g, f, f.burnDps * dt, 'heat');
  if (g.clock >= f.poisonUntil) return;
  hurt(g, f, f.poisonDps * dt, 'poison');
  if (!f.spreads || g.clock < f.spreadAt) return;
  f.spreadAt = g.clock + SPREAD.every;
  for (const o of g.foes) {
    if (o === f || o.dead || FOE[o.kind].flies || Math.hypot(o.x - f.x, o.y - f.y) > SPREAD.reach || o.poisonUntil > g.clock) continue;
    o.poisonUntil = g.clock + 2;
    o.poisonDps = f.poisonDps;
    o.spreads = false;
  }
}

/** The shell that halves each damage kind, for the Empress to turn to. */
const RESISTS: Partial<Record<DamageKind, ShellKind>> = { sharp: 'hard', heat: 'waxy', blast: 'hairy', spark: 'rubbery' };

/** The Empress lays a beetle now and then, and turns her shell against what hurt her most. */
function empress(g: Game, f: Foe) {
  const e = f.empress!;
  if (g.clock >= e.eggAt && !FOE[f.kind].flies) {
    e.eggAt += EMPRESS.egg;
    offspring(g, f, 'beetle', Math.round(FOE.beetle.hp * (1 + HP_PER_WAVE * (g.wave - 1)) * hpScale()), 0.5);
    g.events.push({ type: 'egg', x: f.x, y: f.y });
  }
  if (g.clock < e.turnAt) return;
  e.turnAt += EMPRESS.turn;
  let top: DamageKind | undefined;
  for (const [kind, dealt] of Object.entries(e.taken) as [DamageKind, number][]) if (RESISTS[kind] && dealt > (e.taken[top!] ?? 0)) top = kind;
  e.taken = {};
  const shell = top && RESISTS[top];
  if (shell && shell !== f.shell) {
    f.shell = shell;
    g.events.push({ type: 'shell', shell });
  }
}

/** How much faster each tower reloads, from the beehives round it (the best one counts). */
function boosts(g: Game) {
  const out = new Map<number, number>();
  for (const hive of g.towers) {
    if (hive.kind !== 'beehive' || hive.grow > 0) continue;
    const [hx, hy] = cellOf(hive.cell);
    const boost = TOWER.beehive.boost![hive.level - 1];
    for (const t of g.towers) {
      const [x, y] = cellOf(t.cell);
      if (t !== hive && Math.abs(x - hx) <= 1 && Math.abs(y - hy) <= 1) out.set(t.id, Math.max(out.get(t.id) ?? 0, boost));
    }
  }
  return out;
}

/** The foe a tower aims at among `foes`, by its aim. */
function pick(g: Game, foes: Foe[], aim: Aim = 'first') {
  if (aim === 'fliers') {
    const fliers = foes.filter((f) => FOE[f.kind].flies);
    if (fliers.length) foes = fliers;
    aim = 'first';
  }
  const score = (f: Foe) => (aim === 'first' ? -remaining(g, f) : aim === 'last' ? remaining(g, f) : aim === 'strongest' ? f.hp : -f.hp);
  let target = foes[0];
  for (const f of foes) if (score(f) > score(target)) target = f;
  return target;
}

/** A sunglass or bonfire hit: heat damage, and heat that builds up on the foe. */
function scorch(g: Game, f: Foe, damage: number) {
  hurt(g, f, damage, 'heat');
  f.heat = Math.min(1, f.heat + HEAT.hit);
}

function fire(g: Game, tower: Tower, dt: number, boost: number) {
  const def = TOWER[tower.kind];
  if (tower.grow > 0) {
    tower.grow = Math.max(0, tower.grow - dt);
    return;
  }
  tower.cooldown = Math.max(0, tower.cooldown - dt * (1 + boost));
  if (!attacks(tower.kind)) return;
  if (tower.kind === 'whirligig' && (tower.idle += dt) > 1) tower.spin = Math.max(0, tower.spin - dt / def.spinUp!);
  if (tower.cooldown > 0) return;
  const { x, y } = centre(tower.cell);
  const lvl = tower.level - 1;
  const reaches = (f: Foe) => !f.dead && (def.air || !FOE[f.kind].flies);
  if (tower.kind === 'sunglass') {
    const cells = beamCells(g, tower.cell, tower.face);
    const lit = new Set(cells);
    const hit = g.foes.filter((f) => reaches(f) && lit.has(Math.floor(f.y) * COLS + Math.floor(f.x)));
    if (hit.length === 0) return;
    tower.cooldown = def.reload[lvl];
    for (const f of hit) scorch(g, f, def.damage[lvl]);
    const end = cells.length ? centre(cells[cells.length - 1]) : { x, y };
    const [dx, dy] = DIRS[tower.face];
    g.events.push({ type: 'beam', x, y, x2: end.x + dx * 0.5, y2: end.y + dy * 0.5 }, { type: 'shot', kind: 'sunglass' });
    return;
  }
  if (tower.kind === 'bonfire') {
    const hit = g.foes.filter((f) => reaches(f) && inCone(tower.cell, tower.face, f.x, f.y, f.body));
    if (hit.length === 0) return;
    tower.cooldown = def.reload[lvl];
    for (const f of hit) {
      scorch(g, f, def.damage[lvl]);
      f.burnUntil = g.clock + def.dotFor!;
      f.burnDps = def.dot![lvl];
    }
    g.events.push({ type: 'flame', x, y, angle: tower.aim, r: def.range, cone: def.cone! }, { type: 'shot', kind: 'bonfire' });
    return;
  }
  const inRange = g.foes.filter((f) => reaches(f) && Math.hypot(f.x - x, f.y - y) <= def.range);
  if (inRange.length === 0) return;
  tower.cooldown = def.reload[lvl];
  if (tower.kind === 'frost') {
    for (const f of inRange) {
      f.slowUntil = g.clock + def.slowFor!;
      f.slowFactor = def.slow![lvl];
      hurt(g, f, def.damage[lvl], 'cold');
    }
    g.events.push({ type: 'pulse', x, y, r: def.range });
    return;
  }
  if (tower.kind === 'storm') {
    // The bolt strikes the foe closest to the cottage, then jumps on to the nearest foe not yet struck.
    const struck = [pick(g, inRange, tower.target)];
    while (struck.length < def.chain![lvl]) {
      const last = struck[struck.length - 1];
      let next: Foe | undefined;
      let best = def.jump!;
      for (const f of g.foes) {
        const d = Math.hypot(f.x - last.x, f.y - last.y);
        if (reaches(f) && !struck.includes(f) && d <= best) (best = d), (next = f);
      }
      if (!next) break;
      struck.push(next);
    }
    const points = [{ x, y }, ...struck.map((f) => ({ x: f.x, y: f.y }))];
    for (const f of struck) hurt(g, f, def.damage[lvl], 'spark');
    tower.aim = Math.atan2(points[1].y - y, points[1].x - x);
    g.events.push({ type: 'bolt', points }, { type: 'shot', kind: 'storm' });
    return;
  }
  if (tower.kind === 'puffball') {
    // Spores for a foe not yet poisoned, if there is one.
    const clean = inRange.filter((f) => f.poisonUntil <= g.clock);
    const target = pick(g, clean.length ? clean : inRange, tower.target);
    target.poisonUntil = g.clock + def.dotFor!;
    target.poisonDps = def.dot![lvl];
    target.spreads = true;
    g.events.push({ type: 'puff', x: target.x, y: target.y }, { type: 'shot', kind: 'puffball' });
    return;
  }
  const target = pick(g, inRange, tower.target);
  tower.aim = Math.atan2(target.y - y, target.x - x);
  if (tower.kind === 'whirligig') {
    tower.cooldown = def.reload[lvl] + (def.spinTo![lvl] - def.reload[lvl]) * tower.spin;
    tower.spin = Math.min(1, tower.spin + tower.cooldown / def.spinUp!);
    tower.idle = 0;
  }
  const kind = tower.kind as ShotKind;
  g.shots.push({ kind, x, y, target: target.id, tx: target.x, ty: target.y, damage: def.damage[lvl], splash: def.splash ?? 0, hits: def.hits });
  g.events.push({ type: 'shot', kind: tower.kind });
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
  if (s.kind !== 'cannon') {
    if (target) {
      hurt(g, target, s.damage, s.hits);
      g.events.push({ type: 'hit', x: s.tx, y: s.ty });
    }
  } else {
    for (const f of g.foes) if (!f.dead && !FOE[f.kind].flies && Math.hypot(f.x - s.tx, f.y - s.ty) <= s.splash + f.body) hurt(g, f, s.damage, s.hits);
    g.events.push({ type: 'boom', x: s.tx, y: s.ty, r: s.splash });
  }
  return true;
}

/** Plays `dt` seconds. */
export function step(g: Game, dt: number) {
  if (over(g)) return;
  g.clock += dt;
  if (g.nextAt !== null && g.clock >= g.nextAt) startWave(g);
  while (g.spawns.length && g.spawns[0].at <= g.clock) {
    const s = g.spawns.shift()!;
    spawn(g, s);
  }
  for (const f of g.foes) if (!f.dead) moveFoe(g, f, dt);
  for (const f of g.foes) if (!f.dead) afflict(g, f, dt);
  g.loose = g.loose.filter((c) => !roll(g, c, dt));
  const boost = boosts(g);
  for (const t of g.towers) fire(g, t, dt, boost.get(t.id) ?? 0);
  g.shots = g.shots.filter((s) => !moveShot(g, s, dt));
  g.foes = g.foes.filter((f) => !f.dead);
  if (cabbagesLeft(g) <= 0) {
    g.phase = 'lost';
    g.events.push({ type: 'lost' });
    return;
  }
  if (g.phase === 'wave' && g.spawns.length === 0 && g.foes.length === 0) {
    let gold = 0;
    for (; g.paid < g.wave; g.paid++) gold += waveReward(g.paid + 1);
    g.gold += gold;
    for (const t of g.towers) {
      if (t.kind !== 'apple') continue;
      const apples = TOWER.apple.apples![t.level - 1];
      g.gold += apples;
      g.events.push({ type: 'apples', cell: t.cell, gold: apples });
    }
    g.shots = [];
    g.events.push({ type: 'cleared', wave: g.wave, gold });
    if (g.wave >= WAVES.length) {
      g.phase = 'won';
      g.events.push({ type: 'won' });
    } else g.phase = 'build';
  }
  // The wave timer starts once the last wave is all out.
  if (!g.calm && g.nextAt === null && g.wave >= 1 && canStartWave(g)) g.nextAt = g.clock + WAVE_TIMER;
}

/** The cells of the route from a burrow to the cottage, as foes would walk it now. */
export function routeLength(g: Game, gate: 0 | 1) {
  return g.dist[g.gates[gate]];
}
