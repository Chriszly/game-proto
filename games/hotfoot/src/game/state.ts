import { byDifficulty } from '../../../../shared/settings';
import { ARMOURY_EACH, noArmoury, type Armoury } from './armoury';
import { BOONS, type BoonId } from './boons';
import { pairsOf } from './pairs';

// The run in plain numbers. The course runs left to right along x in world pixels; heights are
// measured up from the road, so the knight's feet are at h = 0 when running on it and at a
// ledge's height when running on top of one.

/** The knight's box: its width, and its height standing and sliding. */
export const RUNNER = { w: 28, h: 60, slideH: 26 };
/** Pull of the ground, in pixels per second squared, and the speed a jump leaves the ground at. */
export const GRAVITY = 2400;
export const JUMP_V = 860;
/** Speed of a drop when sliding in the air: the knight falls fast and slides on landing. */
export const DROP_V = 1100;
export const SLIDE_MS = 620;
/** How long the knight can't be hurt again after a hit. */
export const HURT_MS = 1100;
/** Hearts at the start of a run: more on Easy, fewer on Hard. */
export const START_HEARTS = byDifficulty(5, 3, 2);
/** How near a coin has to be to the knight's box to be picked up. */
export const COIN_REACH = 14;
/** Length of a stage, from one checkpoint to the next, and the clear run at its start. */
export const STAGE_LEN = 3200;
export const LEAD_IN = 700;
/** Coins to buy the boon missed at the last checkpoint, to start the next run with it. */
export const BOON_PRICE = 30;

/**
 * The coin streak: every `step` coins taken in a row without a hit raise the multiplier by one, up
 * to `max`. A coin is worth its value times the multiplier reached before it.
 */
export const STREAK = { step: 10, max: 5 };
/** The coin multiplier after `streak` coins in a row, capped at `max` (the road's cap). */
export const streakMult = (streak: number, max = STREAK.max) => Math.min(max, 1 + Math.floor(streak / STREAK.step));

/**
 * The forked roads: from the checkpoint before stage `ROAD.from`, the knight also picks the road
 * the next stage runs on. The High Road has more coins and more foes, closer together, no shrine,
 * and a streak cap two higher; the Low Road is safer, with wider gaps, and has the shrine.
 */
export type Road = 'high' | 'low';
export const ROADS: Record<Road, { name: string; text: string }> = {
  high: { name: 'The High Road', text: 'More coins and more foes, closer together, and the streak climbs to x7. No shrine.' },
  low: { name: 'The Low Road', text: 'Fewer foes, further apart, and a wayside shrine to heal at.' },
};
export const ROAD = { from: 3, highStreak: 2, highGap: -40, lowGap: 40 };
/** The streak's cap on this road: `STREAK.max`, two more on the High Road. */
export const streakMax = (road: Road | null) => STREAK.max + (road === 'high' ? ROAD.highStreak : 0);

/**
 * The herald's dare: from stage `from`, each ordinary stage sets one (stomp foes, take no hit, take
 * coins, reach a streak), going round `kinds` by stage. Meeting it pays `reward` coins and puts a
 * third boon card on the stage's checkpoint.
 */
export type DareKind = 'stomp' | 'nohit' | 'coins' | 'streak';
export interface Dare {
  kind: DareKind;
  /** What counts as met: foes stomped, coins taken, the streak multiplier reached; 0 for no hit. */
  goal: number;
  progress: number;
  done: boolean;
  /** A no-hit dare lost to a hit. */
  failed: boolean;
}
export const DARE = { from: 2, reward: 20, kinds: ['stomp', 'nohit', 'coins', 'streak'] as DareKind[], goals: { stomp: 2, nohit: 0, coins: 20, streak: 3 } };
export function dareOf(stage: number): Dare {
  const kind = DARE.kinds[(stage - DARE.from) % DARE.kinds.length];
  return { kind, goal: DARE.goals[kind], progress: 0, done: false, failed: false };
}
/** A dare in the herald's words. */
export function dareText(d: Dare) {
  switch (d.kind) {
    case 'stomp':
      return `Stomp ${d.goal} foes`;
    case 'nohit':
      return 'Take no hit';
    case 'coins':
      return `Take ${d.goal} coins`;
    case 'streak':
      return `Reach a x${d.goal} streak`;
  }
}

/**
 * The rockfall: on every `every`th stage a fall of boulders rolls in behind the knight, keeping
 * their pace and creeping up a little, and gains `hit` px on every hit and `skid` px on every skid.
 * It starts `start` px behind; when it catches the knight it costs a heart and falls back there.
 */
export interface Rockfall {
  /** Its leading edge along the course. */
  x: number;
}
export const ROCK = { every: 7, start: 240, creep: 10, hit: 90, skid: 45, r: 40 };
export const isRockStage = (stage: number) => stage % ROCK.every === 0 && !isBossStage(stage);

/** The Dragon's Keep: the first stage that starts at or past this many metres is the dragon's. */
export const DRAGON_AT = 1500;

/**
 * A wayside shrine: one stands on the road once a stage from stage `from`. Sliding into it trades
 * `price` run coins for one heart, when the knight has the coins and is below full hearts.
 */
export const SHRINE = { from: 2, price: 15, w: 46 };

/** Running speed on a stage, in pixels per second; `HARDER.speed` more once the dragon is beaten. */
export const speedOf = (stage: number, hard = false) => Math.min(480, 260 + 30 * (stage - 1)) + (hard ? HARDER.speed : 0);
/** How the run goes on after the dragon is beaten: faster, with the obstacles closer together. */
export const HARDER = { speed: 60, gap: -50 };

/**
 * The ground a stage is run on, each with its own rule: the old road (no rule), an icy pass where
 * slides run longer and landings skid, a fen where jumps are lower, and a windy pass whose headwind
 * pushes jumps back.
 */
export type Terrain = 'road' | 'ice' | 'marsh' | 'wind';
export const TERRAIN: Record<Terrain, { name: string; rule: string }> = {
  road: { name: 'The Old Road', rule: '' },
  ice: { name: 'The Frozen Pass', rule: 'Slides run long, and landings skid' },
  marsh: { name: 'The Fen', rule: 'The mire drags at the boots: jumps are lower' },
  wind: { name: 'The Windy Pass', rule: 'A headwind pushes every jump back' },
};
/** The terrains' numbers: ice slides longer and skids on landing (jumps wait out the skid), the fen jumps lower, the wind slows the knight in the air. */
export const ICE = { slide: 1.6, skidMs: 220 };
export const MARSH = { jump: 0.8 };
export const WIND = { air: 0.7 };

/** A Gatekeeper bars the road on every `BOSS_EVERY`th stage. */
export const BOSS_EVERY = 5;
export const isBossStage = (stage: number) => stage % BOSS_EVERY === 0;

/** Stage 1 and Gatekeeper stages run on the old road; the others go ice, fen, wind, ice and so on. */
export function terrainOf(stage: number): Terrain {
  if (stage === 1 || isBossStage(stage)) return 'road';
  return (['ice', 'marsh', 'wind'] as const)[(stage - 2) % 3];
}

export type TrapKind = 'spikes' | 'pit' | 'blade' | 'flames' | 'goblin' | 'bat' | 'barrel' | 'axe' | 'fire' | 'tail';
/** The traps that move along the course and can be stomped on from above. */
export const FOES: readonly TrapKind[] = ['goblin', 'bat'];

export interface Trap {
  id: number;
  kind: TrapKind;
  /** Left edge and width along the course. */
  x: number;
  w: number;
  /** Height of the ground it stands on, up from the road; a bat's is where it flies. */
  h: number;
  /** Speed along the course: a goblin's walk, a bat's flight, a thrown barrel, axe, gout of fire or tail lash (negative is towards the knight). */
  vx: number;
  /** A goblin walks back and forth between these; a fire vent starts its burn this far in. */
  from?: number;
  to?: number;
  phase?: number;
}

/**
 * What height each trap fills, up from its own `h`: spikes on the ground, a blade hanging down
 * to `lo`, flames while lit, a goblin standing and a bat in flight.
 */
export const TRAP_SPAN: Record<Exclude<TrapKind, 'pit'>, { lo: number; hi: number }> = {
  spikes: { lo: 0, hi: 24 },
  blade: { lo: 34, hi: 1000 },
  flames: { lo: 0, hi: 64 },
  goblin: { lo: 0, hi: 34 },
  bat: { lo: 0, hi: 20 },
  barrel: { lo: 0, hi: 26 },
  axe: { lo: 0, hi: 18 },
  fire: { lo: 0, hi: 30 },
  tail: { lo: 0, hi: 18 },
};

/** Goblins and bats start moving once they are this close ahead, just off the right of the screen. */
export const AWAKE = 760;

/** A fire vent burns for `lit` ms of every `cycle`, and sputters for `warn` ms before. */
export const FLAMES = { cycle: 1800, lit: 800, warn: 300 };

/** Where a fire vent is in its burn: off, about to flare, or lit. */
export function flameOf(s: Pick<GameState, 'time'>, t: Trap): 'off' | 'warn' | 'lit' {
  const at = (s.time + (t.phase ?? 0)) % FLAMES.cycle;
  if (at < FLAMES.lit) return 'lit';
  return at >= FLAMES.cycle - FLAMES.warn ? 'warn' : 'off';
}

/** A raised stretch of ground: the knight jumps up onto it and drops off its far end. */
export interface Ledge {
  id: number;
  x: number;
  w: number;
  /** Height of its top above the road. */
  h: number;
}

/** Height of the ground under a stretch of course: the highest ledge over it, or the road. */
export function floorAt(s: Pick<GameState, 'ledges'>, x0: number, x1 = x0) {
  let h = 0;
  for (const l of s.ledges) if (x1 > l.x && x0 < l.x + l.w) h = Math.max(h, l.h);
  return h;
}

/** A wayside shrine on the road: `used` once it has traded a heart, `tried` once slid into without one. */
export interface Shrine {
  id: number;
  x: number;
  w: number;
  used: boolean;
  tried: boolean;
}

/**
 * The boss on a boss stage: the Gatekeeper, or the dragon of the Dragon's Keep. It waits on the
 * road, then keeps ahead of the knight throwing things back (barrels and axes, or fire and tail
 * lashes), tires and stands still to be stomped, and flees ahead after a stomp or a hit.
 */
export type BossKind = 'gate' | 'dragon';
export interface Boss {
  kind: BossKind;
  /** Left edge along the course, and width. */
  x: number;
  w: number;
  /** Stomps left to beat it. */
  hp: number;
  mode: 'wait' | 'throw' | 'tired' | 'flee' | 'down';
  /** Time to the next throw while throwing; while tired, above 0 until it has stopped to stand. */
  ms: number;
  /** Things thrown since it last started throwing. */
  thrown: number;
  /** Time left flashing after a stomp. */
  hurtMs: number;
}

export interface Coin {
  id: number;
  x: number;
  h: number;
  /** Set once a lodestone has caught it; it then flies to the knight. */
  pulled: boolean;
}

export interface Effect {
  id: number;
  kind: 'coin' | 'hit' | 'block' | 'dust' | 'skid' | 'stomp' | 'pop' | 'heal' | 'refuse';
  x: number;
  h: number;
  ms: number;
  total: number;
  /** The words of a `pop` ("+3") or a `refuse` ("Hearts full"). */
  text?: string;
}

export interface Runner {
  /** Height of the feet above the road, and upward speed. */
  h: number;
  vh: number;
  /** Time left on the current slide; 0 when not sliding. */
  slideMs: number;
  /** Slide as soon as the feet touch the ground (after a drop). */
  slideQueued: boolean;
  /** Jumps left before touching the ground again. */
  jumps: number;
  /** Time left unhurtable after a hit. */
  hurtMs: number;
  /** Time left skidding after landing on ice, and a jump waiting for the skid to end. */
  skidMs: number;
  jumpQueued: boolean;
}

export interface GameState {
  stage: number;
  /** The ground this stage is run on (`terrainOf(stage)`). */
  terrain: Terrain;
  phase: 'running' | 'checkpoint' | 'over';
  /** The road this stage runs on, picked at the checkpoint before it; null on stages 1 and 2 and boss stages. */
  road: Road | null;
  /** The two roads on offer at a checkpoint once the boon is taken, or null. */
  roads: Road[] | null;
  /** The herald's dare for this stage, or null (stage 1, boss stages). */
  dare: Dare | null;
  /** The rockfall behind the knight on a rockfall stage, or null. */
  rockfall: Rockfall | null;
  /** Whether the dragon of the Dragon's Keep is beaten this run; the run then goes on harder. */
  dragonBeaten: boolean;
  /** The lasting crown, won by beating the dragon in any run. */
  crown: boolean;
  /** Where the knight is along the course: the middle of their box. */
  distance: number;
  speed: number;
  runner: Runner;
  hearts: number;
  coins: number;
  /** The coins the run started with from the Squire's Purse; a fall banks only the coins above them. */
  purse: number;
  /** Coins taken in a row since the last hit; sets the coin multiplier (`streakMult`). */
  streak: number;
  /** Hits taken this run, blocked ones included. */
  hits: number;
  /** Goblins and bats stomped on this run. */
  stomps: number;
  /** Time spent running this run, in ms; fire vents burn by it. */
  time: number;
  /** Hits the aegis will still shrug off before the next checkpoint. */
  shields: number;
  ranks: Partial<Record<BoonId, number>>;
  /** The boons on offer at a checkpoint (two, or three after a met dare), or null while running. */
  choices: BoonId[] | null;
  /** Where the current stage started and where its checkpoint stands. */
  stageStart: number;
  checkpointX: number;
  traps: Trap[];
  ledges: Ledge[];
  shrines: Shrine[];
  /** The Gatekeeper or the dragon on a boss stage, until it is beaten and left behind. */
  boss: Boss | null;
  /** Gatekeepers beaten this run. */
  bosses: number;
  /** Where each checkpoint passed this run stood, in metres, for the run track. */
  banners: number[];
  course: Coin[];
  effects: Effect[];
  /** Best distance reached in any run, in metres. */
  best: number;
  /** Coins banked from finished runs, to spend between runs. */
  bank: number;
  /** A boon bought at the game-over screen, which the next ordinary run starts with (kept through daily runs). */
  pending: BoonId | null;
  /** The boon offered at the last checkpoint and not taken, or null before any checkpoint. */
  missed: BoonId | null;
  /** Levels bought in the armoury, kept between runs. */
  armoury: Armoury;
  /** The date of the daily course being run (`YYYY-MM-DD`), or null for an ordinary run. */
  daily: string | null;
  /** The daily course's random state; its course and boons are drawn from it instead of Math.random. */
  seed: number;
  nextId: number;
}

/** Pixels to a metre, for the distance shown. */
export const PX_PER_M = 32;
export const metres = (distance: number) => Math.floor(distance / PX_PER_M);

/**
 * The run track under the HUD, in metres: where the knight is, the best run to chase, a banner at
 * every checkpoint (every 100 m) up to the track's end, and how far the next banner is.
 */
export function trackOf(s: Pick<GameState, 'distance' | 'checkpointX' | 'best' | 'banners'>) {
  const at = metres(s.distance);
  const banner = metres(s.checkpointX);
  const length = Math.ceil((Math.max(s.best, at, banner) + 30) / 50) * 50;
  // The banners passed, the next one, and the ones after it every 100 m (a Gatekeeper's stage is
  // longer, so they don't always fall on hundreds).
  const banners = [...s.banners, banner];
  for (let m = banner + 100; m <= length; m += 100) banners.push(m);
  return { at, best: s.best, length, banners, next: banner - at };
}

/**
 * The knight's numbers with the boons taken so far (cursed ones included), the armoury bought (not
 * on a daily course, which everyone runs alike), and the rule of the ground underfoot.
 */
export function stats(s: Pick<GameState, 'ranks' | 'armoury' | 'terrain' | 'daily'>) {
  const r = (id: BoonId) => s.ranks[id] ?? 0;
  const a = s.daily ? noArmoury() : s.armoury;
  const pairs = pairsOf(s.ranks);
  // Jump height goes with the square of the speed off the ground.
  const height = (1 + 0.12 * r('boots') - 0.15 * r('oath')) * (s.terrain === 'marsh' ? MARSH.jump : 1);
  return {
    maxHearts: Math.max(1, START_HEARTS + r('heart') + a.heart * ARMOURY_EACH.heart - r('gilt')),
    jumpV: JUMP_V * Math.sqrt(height),
    jumps: 1 + r('double'),
    slideMs: SLIDE_MS * (1 + 0.3 * r('greaves')) * (1 + 0.6 * r('glass')) * (s.terrain === 'ice' ? ICE.slide : 1),
    hurtMs: HURT_MS * (1 + 0.5 * r('cloak')) * (r('glass') ? 0.5 : 1),
    reach: COIN_REACH + 45 * r('magnet') + a.magnet * ARMOURY_EACH.magnet,
    coinValue: (1 + r('greed')) * (r('gilt') ? 2 : 1),
    shields: r('aegis') + 2 * r('oath'),
    // The boon pairs' hidden bonuses.
    glide: pairs.includes('glide'),
    hoard: pairs.includes('hoard'),
    bulwark: pairs.includes('bulwark'),
  };
}

export function rankOf(s: Pick<GameState, 'ranks'>, id: BoonId) {
  return s.ranks[id] ?? 0;
}

export const canTake = (s: Pick<GameState, 'ranks'>, id: BoonId) => rankOf(s, id) < BOONS[id].maxRank;

/**
 * The next draw from the run's randomness: Math.random on an ordinary run, so a seeded test repeats,
 * and the daily course's own seeded sequence on a daily run, so everyone gets the same course.
 */
export function rand(s: Pick<GameState, 'daily' | 'seed'>) {
  if (!s.daily) return Math.random();
  // mulberry32
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The daily course's seed from its date. */
export function seedOf(date: string) {
  let h = 2166136261;
  for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
}

/** Today's date as `YYYY-MM-DD`, in the player's own time zone: the daily course's key. */
export function today(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function freshState(best = 0, bank = 0, armoury: Armoury = noArmoury(), daily: string | null = null, crown = false): GameState {
  return {
    stage: 1,
    terrain: terrainOf(1),
    phase: 'running',
    road: null,
    roads: null,
    dare: null,
    rockfall: null,
    dragonBeaten: false,
    crown,
    distance: 0,
    speed: speedOf(1),
    runner: { h: 0, vh: 0, slideMs: 0, slideQueued: false, jumps: 1, hurtMs: 0, skidMs: 0, jumpQueued: false },
    hearts: START_HEARTS,
    coins: 0,
    purse: 0,
    streak: 0,
    hits: 0,
    stomps: 0,
    time: 0,
    shields: 0,
    ranks: {},
    choices: null,
    stageStart: 0,
    checkpointX: STAGE_LEN,
    traps: [],
    ledges: [],
    shrines: [],
    boss: null,
    bosses: 0,
    banners: [],
    course: [],
    effects: [],
    best,
    bank,
    pending: null,
    missed: null,
    armoury: { ...armoury },
    daily,
    seed: daily ? seedOf(daily) : 0,
    nextId: 1,
  };
}
