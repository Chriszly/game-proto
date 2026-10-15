// The world of a match: its units, projectiles and what the view should show. No Phaser here.

import {
  GANK,
  AbilityKey,
  BASE,
  CAMPS,
  CAMP,
  CHAMPIONS,
  ChampionDef,
  ENEMY_LANES,
  ALLY_LANES,
  ITEMS,
  LANES,
  LaneId,
  MINION,
  NEXUS_HP,
  NEXUS_RADIUS,
  START_GOLD,
  Team,
  TOWER,
  TOWERS,
  Vec,
  XP_FOR_LEVEL,
  MAX_LEVEL,
  WAVE_MS,
  ObjectiveKind,
  BEAST,
  INHIBITOR,
  INHIBITORS,
  SUPER_MINION,
} from './data';

export type Phase = 'pick' | 'playing' | 'won' | 'lost';
export type UnitKind = 'champion' | 'minion' | 'tower' | 'nexus' | 'camp' | 'beast' | 'inhibitor';
/** Camps and the beast belong to no team: every team's units may attack them. */
export type Side = Team | 'neutral';

export interface Unit {
  id: number;
  kind: UnitKind;
  side: Side;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  /** Time left on the shield, in ms; it is lost when this runs out. */
  shieldMs: number;
  dmg: number;
  armor: number;
  range: number;
  speed: number;
  attackMs: number;
  /** Time until this unit may attack again, in ms. */
  attackCd: number;
  /** Time left on a slow, in ms. */
  slowMs: number;
  /** Direction the unit faces, in radians. */
  facing: number;
  /** Distance walked, to drive the walk cycle. */
  walk: number;
  /** Time left on the attack swing animation, in ms. */
  swing: number;
  /** Time left on the hit flash, in ms. */
  flash: number;
  /** Time left on the cast pose after an ability, in ms (animation only). */
  castMs: number;
  /** Time left on a stun, in ms: a stunned unit neither moves nor attacks. */
  stunMs: number;
  /** Percent shorter ability cooldowns, from items. */
  cdr: number;
  dead: boolean;
  /** When a dead champion, minion or camp returns, in game time. */
  respawnAt: number;
  /** The unit this one attacks, or the one the player clicked. */
  target: number | null;
  /** The last unit to hurt this one; a camp fights back against it. */
  lastHitBy: number | null;
  /** Where a player's champion is walking to, if it was sent to a point. */
  moveTo: Vec | null;
  /** Lane walk: the points this unit follows, and the index it is walking toward. */
  path: Vec[] | null;
  wp: number;
  /** The lane a minion, a lane champion, a tower or an inhibitor belongs to. */
  lane: LaneId | null;
  /** A super minion's health and damage multiplier (1 for a plain one). */
  power: number;
  /** Time left on being seen while in a bush, after attacking or casting, in ms. */
  revealMs: number;
  // Champions only.
  champ: ChampionDef | null;
  player: boolean;
  level: number;
  xp: number;
  gold: number;
  items: string[];
  cds: Record<AbilityKey, number>;
  /** Ids of the upgrades the champion chose on its level ups (see `UPGRADES`). AI champions pick too. */
  upgrades: string[];
  /** Cooldowns of item actives, by active id. */
  activeCds: Record<string, number>;
  /** AI champions: falling back until this game time. */
  retreatUntil: number;
  /** AI champions: the enemy champion it left its lane to gang up on, and until when. */
  gankTarget: number | null;
  gankUntil: number;
}

export interface Projectile {
  x: number;
  y: number;
  /** Pixels per ms. */
  vx: number;
  vy: number;
  /** Distance it can still fly, in pixels. */
  left: number;
  side: Side;
  owner: number;
  damage: number;
  width: number;
  pierce: boolean;
  hit: number[];
  color: string;
  /** Stun in ms on whatever it hits. */
  stun: number;
}

/** A short-lived visual the view turns into shapes: a ring, or a line between two points. */
export type Fx =
  | { kind: 'ring'; x: number; y: number; r: number; color: string; ms: number }
  | { kind: 'line'; x: number; y: number; x2: number; y2: number; color: string; ms: number }
  /** A slash: an arc of radius r around (x, y), centred on the angle a. */
  | { kind: 'arc'; x: number; y: number; r: number; a: number; color: string; ms: number }
  /** A coin that pops out of a minion the player last-hit, showing the gold it paid. */
  | { kind: 'coin'; x: number; y: number; gold: number; color: string; ms: number };

/** The goal the player's team is chasing now. `target` is the unit to bring down. */
export interface Objective {
  kind: ObjectiveKind;
  target: number;
  title: string;
  gold: number;
  banner: 'siege' | null;
  startAt: number;
  endsAt: number;
}

/** Two upgrades on offer after the player's champion reached `level`. */
export interface UpgradeOffer {
  level: number;
  options: [string, string];
}

export interface GameState {
  phase: Phase;
  time: number;
  nextWave: number;
  nextId: number;
  units: Unit[];
  projectiles: Projectile[];
  /** Visuals raised since the view last drained this list. */
  fx: Fx[];
  winner: Team | null;
  /** Multiplies the damage red's units deal, to make the match harder or easier. */
  enemyDamage: number;
  /** The player's champion's unit id. */
  player: number;
  /** The objective in progress, or null between two. */
  objective: Objective | null;
  /** Index into `OBJECTIVES` of the next objective to start, and when it starts. */
  objectiveIndex: number;
  nextObjectiveAt: number;
  objectivesDone: number;
  /** How the last objective ended, for the card's message. */
  lastObjective: { title: string; done: boolean; gold: number; at: number } | null;
  /** The siege banner lasts until this game time. */
  siegeUntil: number;
  /** The enemy minion the player's next hit would kill, outlined in gold. */
  lastHitMark: number | null;
  /** Last hits the player landed, the unbroken run of them now, and the best run. */
  lastHits: number;
  streak: number;
  bestStreak: number;
  /** Level-up upgrade choices still waiting for the player, the first one shown. */
  upgradeOffers: UpgradeOffer[];
  /** The guardian beast's unit id, and until when each team's minions are empowered by it. */
  beast: number;
  beastBuff: Record<Team, number>;
  /** Beasts each team slew. */
  beastKills: Record<Team, number>;
  /** The AI champions sent to fight over the beast now. */
  contesters: number[];
  /** Ids of the enemy champions each team can't see this tick (they hide in a bush). */
  hidden: Record<Team, number[]>;
  /** When the AI next sends gankers. */
  nextGank: number;
  /** Short messages for the player (the beast woke, an inhibitor fell), newest last. */
  notices: Notice[];
}

export interface Notice {
  text: string;
  color: string;
  at: number;
}

export function pathFor(lane: LaneId, team: Team): Vec[] {
  return team === 'blue' ? LANES[lane] : [...LANES[lane]].reverse();
}

export function blankUnit(
  s: GameState,
  kind: UnitKind,
  side: Side,
  x: number,
  y: number,
  stats: { hp: number; dmg: number; armor: number; range: number; speed: number; attackMs: number; radius: number },
): Unit {
  return {
    id: s.nextId++,
    kind,
    side,
    x,
    y,
    spawnX: x,
    spawnY: y,
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    shield: 0,
    shieldMs: 0,
    dmg: stats.dmg,
    armor: stats.armor,
    range: stats.range,
    speed: stats.speed,
    attackMs: stats.attackMs,
    attackCd: 0,
    slowMs: 0,
    facing: 0,
    walk: 0,
    swing: 0,
    flash: 0,
    castMs: 0,
    stunMs: 0,
    cdr: 0,
    dead: false,
    respawnAt: 0,
    target: null,
    lastHitBy: null,
    moveTo: null,
    path: null,
    wp: 0,
    lane: null,
    power: 1,
    revealMs: 0,
    champ: null,
    player: false,
    level: 1,
    xp: 0,
    gold: 0,
    items: [],
    cds: { Q: 0, W: 0, E: 0, R: 0 },
    upgrades: [],
    activeCds: {},
    retreatUntil: 0,
    gankTarget: null,
    gankUntil: 0,
  };
}

/** Recomputes a champion's stats from its level and items. Healing covers any new max health. */
export function refreshStats(u: Unit) {
  const c = u.champ;
  if (!c) return;
  const owned = ITEMS.filter((i) => u.items.includes(i.id));
  const sum = (key: 'hp' | 'dmg' | 'armor' | 'speed' | 'atk' | 'cdr') => owned.reduce((n, i) => n + (i[key] ?? 0), 0);
  const levels = u.level - 1;
  const maxHp = c.hp + levels * c.hpPerLevel + sum('hp');
  u.hp += maxHp - u.maxHp;
  u.maxHp = maxHp;
  u.dmg = c.dmg + levels * c.dmgPerLevel + sum('dmg');
  u.armor = c.armor + sum('armor');
  u.speed = c.speed + sum('speed');
  u.attackMs = c.attackMs / (1 + sum('atk') / 100);
  u.cdr = sum('cdr');
}

export function spawnChampion(s: GameState, def: ChampionDef, side: Team, x: number, y: number, player: boolean, lane: LaneId | null) {
  const u = blankUnit(s, 'champion', side, x, y, {
    hp: 0,
    dmg: def.dmg,
    armor: def.armor,
    range: def.range,
    speed: def.speed,
    attackMs: def.attackMs,
    radius: 22,
  });
  u.hp = 0;
  u.maxHp = 0;
  u.champ = def;
  u.player = player;
  u.level = 1;
  u.gold = START_GOLD;
  if (lane) {
    u.path = pathFor(lane, side);
    u.wp = 1;
    u.lane = lane;
  }
  refreshStats(u);
  u.hp = u.maxHp;
  s.units.push(u);
  return u;
}

/** A fresh match: the player's champion and four allies on blue, five champions on red, and the map. */
export function createGame(pick: ChampionDef, enemyDamage: number): GameState {
  const s: GameState = {
    phase: 'playing',
    time: 0,
    nextWave: 2000,
    nextId: 1,
    units: [],
    projectiles: [],
    fx: [],
    winner: null,
    enemyDamage,
    player: 0,
    objective: null,
    objectiveIndex: 0,
    nextObjectiveAt: 0,
    objectivesDone: 0,
    lastObjective: null,
    siegeUntil: 0,
    lastHitMark: null,
    lastHits: 0,
    streak: 0,
    bestStreak: 0,
    upgradeOffers: [],
    beast: 0,
    beastBuff: { blue: 0, red: 0 },
    beastKills: { blue: 0, red: 0 },
    contesters: [],
    hidden: { blue: [], red: [] },
    nextGank: GANK.firstAt,
    notices: [],
  };

  for (const team of ['blue', 'red'] as Team[]) {
    const nexus = blankUnit(s, 'nexus', team, BASE[team].x, BASE[team].y, {
      hp: NEXUS_HP,
      dmg: 0,
      armor: 0,
      range: 0,
      speed: 0,
      attackMs: 1000,
      radius: NEXUS_RADIUS,
    });
    s.units.push(nexus);
  }
  for (const t of TOWERS) {
    const tower = blankUnit(s, 'tower', t.team, t.x, t.y, {
        hp: TOWER.hp,
        dmg: TOWER.dmg,
        armor: 0,
        range: TOWER.range,
        speed: 0,
        attackMs: TOWER.attackMs,
        radius: TOWER.radius,
    });
    tower.lane = t.lane;
    s.units.push(tower);
  }
  for (const spot of INHIBITORS) {
    const inhib = blankUnit(s, 'inhibitor', spot.team, spot.x, spot.y, {
      hp: INHIBITOR.hp,
      dmg: 0,
      armor: 0,
      range: 0,
      speed: 0,
      attackMs: 1000,
      radius: INHIBITOR.radius,
    });
    inhib.lane = spot.lane;
    s.units.push(inhib);
  }
  for (const c of CAMPS) {
    s.units.push(
      blankUnit(s, 'camp', 'neutral', c.x, c.y, {
        hp: CAMP.hp,
        dmg: CAMP.dmg,
        armor: 0,
        range: CAMP.range,
        speed: 0,
        attackMs: CAMP.attackMs,
        radius: CAMP.radius,
      }),
    );
  }

  // The guardian beast sleeps until its first waking.
  const beast = blankUnit(s, 'beast', 'neutral', BEAST.x, BEAST.y, {
    hp: BEAST.hp,
    dmg: BEAST.dmg,
    armor: 10,
    range: BEAST.range,
    speed: 0,
    attackMs: BEAST.attackMs,
    radius: BEAST.radius,
  });
  beast.dead = true;
  beast.hp = 0;
  beast.respawnAt = BEAST.firstAt;
  beast.facing = Math.PI * 0.75;
  s.units.push(beast);
  s.beast = beast.id;

  const others = CHAMPIONS.filter((c) => c.id !== pick.id);
  const offsets: Vec[] = [
    { x: 70, y: -40 },
    { x: 40, y: -90 },
    { x: 110, y: -10 },
    { x: 70, y: 40 },
    { x: 40, y: 90 },
  ];
  const blueAt = (i: number) => ({ x: BASE.blue.x + offsets[i].x, y: BASE.blue.y + offsets[i].y });
  const redAt = (i: number) => ({ x: BASE.red.x - offsets[i].x, y: BASE.red.y - offsets[i].y });

  const player = spawnChampion(s, pick, 'blue', blueAt(0).x, blueAt(0).y, true, null);
  s.player = player.id;
  others.slice(0, 4).forEach((def, i) => {
    spawnChampion(s, def, 'blue', blueAt(i + 1).x, blueAt(i + 1).y, false, ALLY_LANES[i]);
  });
  CHAMPIONS.forEach((def, i) => {
    spawnChampion(s, def, 'red', redAt(i).x, redAt(i).y, false, ENEMY_LANES[i]);
  });

  return s;
}

/** Puts a wave of minions on each lane from both Nexuses. */
export function spawnWave(s: GameState) {
  for (const team of ['blue', 'red'] as Team[]) {
    for (const lane of ['top', 'mid', 'bottom'] as LaneId[]) {
      for (let i = 0; i < 3; i++) {
        const jitter = i * 12;
        const x = BASE[team].x + (team === 'blue' ? 1 : -1) * (30 + jitter);
        const y = BASE[team].y + (team === 'blue' ? -1 : 1) * (30 + jitter);
        // A lane whose enemy inhibitor has fallen sends super minions.
        const power = s.units.some((u) => u.kind === 'inhibitor' && u.dead && u.side !== team && u.lane === lane) ? SUPER_MINION : 1;
        const m = blankUnit(s, 'minion', team, x, y, {
          hp: MINION.hp * power,
          dmg: MINION.dmg * power,
          armor: 0,
          range: MINION.range,
          speed: MINION.speed,
          attackMs: MINION.attackMs,
          radius: MINION.radius,
        });
        m.path = pathFor(lane, team);
        m.wp = 1;
        m.lane = lane;
        m.power = power;
        s.units.push(m);
      }
    }
  }
  s.nextWave = s.time + WAVE_MS;
}

export function getUnit(s: GameState, id: number | null): Unit | null {
  if (id === null) return null;
  return s.units.find((u) => u.id === id) ?? null;
}

export function levelFor(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_FOR_LEVEL.length; i++) if (xp >= XP_FOR_LEVEL[i]) level = i + 1;
  return Math.min(level, MAX_LEVEL);
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The lane whose centre line runs nearest a point. */
export function laneNear(p: Vec): LaneId {
  let best: LaneId = 'mid';
  let bestD = Infinity;
  for (const [id, pts] of Object.entries(LANES) as [LaneId, Vec[]][]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
      const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
  }
  return best;
}
