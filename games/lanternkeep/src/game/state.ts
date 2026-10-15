import { byDifficulty } from '../../../../shared/settings';
import { CHAINS, LANTERN_SPOTS, mothRest } from './places';

// The rules in plain TypeScript, with no Phaser. Each night begins with a dusk: tap a lantern and
// an idle moth flies from the jar to light it, then flies home. A lit lantern burns its oil and
// goes out when the oil runs dry. When dusk ends, night falls and every lantern still lit pays;
// too few lit costs one of the keep's hearths. Between nights the coins buy upgrades. Each night
// the herald orders a bonus goal, gusts blow out lanterns no moth is sitting on, and a refill that
// saves a nearly dry lantern pays a little at once. Each night draws a kind (fog, a feast, a
// storm), bats come for the lanterns from the third night, lanterns side by side form chains that
// pay when all of them are lit, and ten nights kept reach the Great Festival, a win, with endless
// nights after.

export const UPGRADE_IDS = ['wick', 'oil', 'moths', 'wings', 'firefly'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface Upgrade {
  name: string;
  /** What one level does, shown on its button. */
  blurb: string;
  /** The cost of each level; its length is the most levels there are. */
  costs: readonly number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  wick: { name: 'Wicks', blurb: 'Lanterns catch 25% faster', costs: [10, 20, 35] },
  oil: { name: 'Oil', blurb: 'Lanterns burn 6s longer', costs: [10, 20, 35] },
  moths: { name: 'Moths', blurb: 'One more moth in the jar', costs: [15, 30, 50] },
  wings: { name: 'Wings', blurb: 'Moths fly 20% faster', costs: [10, 20, 35] },
  firefly: { name: 'Firefly', blurb: 'Lights two lanterns a flight', costs: [25, 45] },
};

/** The view's width in pixels, where bats come in and leave. */
const VIEW_W = 960;
/** How long each dusk lasts before night falls, in milliseconds. */
export const DUSK_MS = 45_000;
/** Hearths the keep starts with; a night with too few lanterns lit puts one out. */
export const LIVES = 3;
/** Coins for each lantern lit at nightfall, and the bonus when every one is. */
export const PAY_PER_LANTERN = 5;
export const ALL_LIT_BONUS = 10;
/** Moths in the jar, their speed (px/s) and how long a wick takes to catch, before upgrades. */
export const BASE_MOTHS = 3;
export const BASE_SPEED = 160;
export const BASE_LIGHT_MS = 1500;
/** How long a lantern burns on a full fill of oil, before upgrades: longer on Easy, shorter on Hard. */
export const baseBurnMs = () => byDifficulty(26_000, 20_000, 16_000);

/**
 * The three kinds of moth. The jar holds them in KIND_ORDER (fast, slow, heavy, fast, ...), so
 * the first night's three moths are one of each. Each multiplies the base speed, wick time and oil.
 */
export const MOTH_KINDS = {
  fast: { name: 'Fast', speed: 1.5, wick: 1.3, oil: 1 },
  slow: { name: 'Slow', speed: 0.75, wick: 0.7, oil: 1 },
  heavy: { name: 'Heavy', speed: 0.8, wick: 1, oil: 1.5 },
  /** Bought with the Firefly upgrade, not part of KIND_ORDER: lights a second lantern before flying home. */
  firefly: { name: 'Firefly', speed: 1.1, wick: 1, oil: 1 },
} as const;
export type MothKind = keyof typeof MOTH_KINDS;
export const KIND_ORDER: readonly MothKind[] = ['fast', 'slow', 'heavy'];
/** Lanterns a firefly lights in one flight. */
export const FIREFLY_LANTERNS = 2;
/** Taps kept while every moth is busy; a tap past this is lost. */
export const QUEUE_MAX = 2;

/** How long before a gust its warning shows the lantern it will blow out, in milliseconds. */
export const GUST_WARN_MS = 5_000;
/**
 * When each gust hits, as dusk left in milliseconds. Night 1 has one, nights 2 and 3 two, and
 * every night after three.
 */
export function gustsFor(night: number, kind: NightKind = 'clear') {
  const gusts = [34_000, 22_000, 10_000].slice(0, night === 1 ? 1 : night <= 3 ? 2 : 3);
  // A stormy night adds two gusts between them, still more than GUST_WARN_MS apart.
  return kind === 'storm' ? [...gusts, ...STORM_GUSTS].sort((a, b) => b - a) : gusts;
}

/**
 * The kinds of night. The first night is always clear; each later night's kind is drawn at the
 * nightfall before it, so the night panel can show what is coming.
 */
export const NIGHT_KINDS = {
  clear: { name: 'Clear night', blurb: 'Nothing stirs but the moths' },
  fog: { name: 'Foggy night', blurb: 'Oil burns 40% faster' },
  feast: { name: 'Feast night', blurb: 'Lanterns and chains pay double' },
  storm: { name: 'Stormy night', blurb: 'Two more gusts' },
} as const;
export type NightKind = keyof typeof NIGHT_KINDS;
export const NIGHT_KIND_IDS = Object.keys(NIGHT_KINDS) as NightKind[];
/** How much faster oil burns on a foggy night. */
export const FOG_BURN = 1.4;
/** What a feast night multiplies the lanterns', all-lit bonus's and chains' pay by. */
export const FEAST_PAY = 2;
/** The extra gusts of a stormy night, as dusk left. */
export const STORM_GUSTS = [28_000, 16_000];
/** Draws the kind of night `night`: clear on the first, any kind (clear too) after. */
export const drawKind = (night: number): NightKind => (night === 1 ? 'clear' : NIGHT_KIND_IDS[Math.floor(Math.random() * NIGHT_KIND_IDS.length)]);

/** How fast a bat flies, in pixels per second; it flees at BAT_FLEE times that. */
export const BAT_SPEED = 55;
export const BAT_FLEE = 1.6;
/** Where bats come in from the screen's edge, as a height in view pixels. */
export const BAT_Y = 140;
/**
 * When each bat comes, as dusk left in milliseconds: none on the first two nights, one on nights
 * 3 to 5, then two.
 */
export const batsFor = (night: number) => (night < 3 ? [] : night < 6 ? [28_000] : [30_000, 16_000]);

/** What each lantern chain with every lantern lit at nightfall pays. */
export const CHAIN_BONUS = 8;
/** The chains night `s` has every lantern of, by index into CHAINS. */
export const chainsFor = (s: GameState) => CHAINS.map((_, i) => i).filter((i) => CHAINS[i].lanterns.every((l) => l < s.lanterns.length));
/** True when every lantern of chain `i` is lit. */
export const chainLit = (s: GameState, i: number) => CHAINS[i].lanterns.every((l) => s.lanterns[l]?.lit);

/** Nights kept to reach the Great Festival, the win; the nights go on after it. */
export const FESTIVAL_NIGHTS = 10;
/** A refill of a lantern with less than this share of its oil left is a close call... */
export const CLOSE_CALL = 0.15;
/** ...and pays this many coins at once. */
export const CLOSE_CALL_PAY = 2;

/**
 * The herald's order: one bonus goal a night, paid at nightfall. `lit` names lanterns that must be
 * burning at nightfall; `closeCalls` and `shields` count close-call refills and gusts a moth
 * shielded during the dusk.
 */
export type OrderGoal = { kind: 'lit'; lanterns: readonly number[] } | { kind: 'closeCalls' | 'shields'; count: number };
export interface Order {
  text: string;
  goal: OrderGoal;
  reward: number;
}
/** The orders, one a night in this order, then round again. Each only names lanterns its night has. */
export const ORDERS: readonly Order[] = [
  { text: 'Both towers + keep lit at nightfall', goal: { kind: 'lit', lanterns: [0, 1, 2] }, reward: 15 },
  { text: 'The west wall lit at nightfall', goal: { kind: 'lit', lanterns: [0, 3, 5] }, reward: 15 },
  { text: 'Save two lanterns in a close call', goal: { kind: 'closeCalls', count: 2 }, reward: 15 },
  { text: 'The east wall lit at nightfall', goal: { kind: 'lit', lanterns: [1, 4, 6] }, reward: 15 },
  { text: 'Shield a lantern from a gust', goal: { kind: 'shields', count: 1 }, reward: 15 },
];
export const orderFor = (night: number) => ORDERS[(night - 1) % ORDERS.length];

/** How far the night's order has come: `done` of `of`. */
export function orderProgress(s: GameState) {
  const goal = s.order.goal;
  if (goal.kind === 'lit') return { done: goal.lanterns.filter((i) => s.lanterns[i]?.lit).length, of: goal.lanterns.length };
  return { done: Math.min(goal.count, goal.kind === 'closeCalls' ? s.closeCalls : s.shields), of: goal.count };
}

/** Lanterns to light on night `night`: five on the first, one more each night after. */
export const lanternsFor = (night: number) => Math.min(4 + night, LANTERN_SPOTS.length);
/** Lanterns that must be lit at nightfall to keep every hearth: three in five. */
export const requiredFor = (count: number) => Math.ceil(count * 0.6);

export interface Lantern {
  x: number;
  y: number;
  lit: boolean;
  /** Oil left while lit, in milliseconds of burning. */
  oilMs: number;
  /** The oil it was filled to, so the bar shows how much is left. */
  oilMaxMs: number;
  /** True while a moth is on its way to it or lighting it, so a second tap sends no other moth. */
  claimed: boolean;
}

export interface Moth {
  kind: MothKind;
  x: number;
  y: number;
  /**
   * Waiting in the jar, flying out, lighting a wick, guarding the lantern a gust is coming for
   * (it stays after lighting it until the gust has passed), chasing a bat, or flying home.
   */
  task: 'idle' | 'out' | 'lighting' | 'guard' | 'chase' | 'home';
  /** The lantern it is flying to or lighting, or -1. */
  target: number;
  /** How long it has been lighting, in milliseconds. */
  lightingMs: number;
  /** True when it found its lit lantern with under CLOSE_CALL of its oil left: a close call. */
  closeCall: boolean;
  /** The bat it is chasing (task `chase`), by id, or -1. */
  bat: number;
  /** More lanterns it lights on this flight before flying home: a firefly's second. */
  hops: number;
}

/** A bat flying to a lit lantern to snuff it, or fleeing off the screen. */
export interface Bat {
  id: number;
  x: number;
  y: number;
  /** The lantern it is flying to. */
  target: number;
  task: 'fly' | 'flee';
}

/** A gust on its way: the lantern it will blow out and when, as dusk left in milliseconds. */
export interface Gust {
  target: number;
  atMs: number;
}

/** Something that just happened, for the scene to show; it empties the list every frame. */
export type GameEvent =
  | { type: 'closeCall'; lantern: number; coins: number }
  | { type: 'gust'; lantern: number; shielded: boolean }
  /** A bat reached its lantern: it snuffed it, or a moth sitting on it drove the bat off. */
  | { type: 'bat'; lantern: number; snuffed: boolean }
  /** A moth caught up with a bat, which flees. */
  | { type: 'chased'; x: number; y: number };

/** What nightfall counted, shown until the next dusk. */
export interface NightReport {
  lit: number;
  count: number;
  required: number;
  earned: number;
  lostHearth: boolean;
  /** Whether the herald's order was met; its reward is part of `earned`. */
  orderMet: boolean;
  /** Lantern chains with every lantern lit; their bonus is part of `earned`. */
  chains: number;
  /** True on the nightfall that reached the Great Festival. */
  festival: boolean;
}

export interface GameState {
  night: number;
  /** `festival` is the night the Great Festival is reached: its panel shows before the night panel. */
  phase: 'dusk' | 'night' | 'festival' | 'over';
  /** Dusk left before night falls, in milliseconds. */
  duskMs: number;
  coins: number;
  lives: number;
  lanterns: Lantern[];
  moths: Moth[];
  levels: Record<UpgradeId, number>;
  report: NightReport | null;
  /** Nights the keep met its quota. */
  kept: number;
  /** The most nights kept in any game, saved in the browser. */
  best: number;
  /** Lantern taps kept while every moth was busy, oldest first, at most QUEUE_MAX. */
  queue: number[];
  /** The herald's order for this night. */
  order: Order;
  /** Gusts still to come this dusk, as dusk left when each hits, soonest first. */
  gusts: number[];
  /** The gust being warned about, or null. */
  gust: Gust | null;
  /** Close-call refills and gusts shielded this dusk, for the order. */
  closeCalls: number;
  shields: number;
  /** What happened since the scene last looked; the scene empties it. */
  events: GameEvent[];
  /** This night's kind, and the next night's, drawn at nightfall. */
  kind: NightKind;
  nextKind: NightKind;
  /** Bats still to come this dusk, as dusk left when each comes, soonest first. */
  batTimes: number[];
  /** Bats on the screen. */
  bats: Bat[];
  /** The id the next bat gets. */
  nextBat: number;
  /** Bats chased off this dusk. */
  chased: number;
  /** True once the Great Festival has been reached this game. */
  festival: boolean;
}

/** Moth count, flight speed, wick time and burn time with the bought upgrades. */
export function stats(s: GameState) {
  return {
    moths: BASE_MOTHS + s.levels.moths,
    fireflies: s.levels.firefly,
    speed: BASE_SPEED * (1 + 0.2 * s.levels.wings),
    lightMs: Math.round(BASE_LIGHT_MS * 0.75 ** s.levels.wick),
    burnMs: baseBurnMs() + 6_000 * s.levels.oil,
  };
}

/** How fast moth `m` flies, in pixels per second. */
export const mothSpeed = (s: GameState, m: Moth) => stats(s).speed * MOTH_KINDS[m.kind].speed;
/** How long moth `m` takes to catch a wick, in milliseconds. */
export const mothLightMs = (s: GameState, m: Moth) => Math.round(stats(s).lightMs * MOTH_KINDS[m.kind].wick);

function makeLanterns(night: number): Lantern[] {
  return LANTERN_SPOTS.slice(0, lanternsFor(night)).map(({ x, y }) => ({ x, y, lit: false, oilMs: 0, oilMaxMs: 0, claimed: false }));
}

/** `n` moths in KIND_ORDER, then `fireflies` fireflies, at rest on the jar. */
function makeMoths(n: number, fireflies: number): Moth[] {
  const total = n + fireflies;
  return Array.from({ length: total }, (_, i) => ({
    kind: i < n ? KIND_ORDER[i % KIND_ORDER.length] : ('firefly' as const),
    ...mothRest(i, total),
    task: 'idle' as const,
    target: -1,
    lightingMs: 0,
    closeCall: false,
    bat: -1,
    hops: 0,
  }));
}

export function newGame(best = 0): GameState {
  const s: GameState = {
    night: 1,
    phase: 'dusk',
    duskMs: DUSK_MS,
    coins: 0,
    lives: LIVES,
    lanterns: makeLanterns(1),
    moths: [],
    levels: { wick: 0, oil: 0, moths: 0, wings: 0, firefly: 0 },
    report: null,
    kept: 0,
    best,
    queue: [],
    order: orderFor(1),
    gusts: gustsFor(1),
    gust: null,
    closeCalls: 0,
    shields: 0,
    events: [],
    kind: 'clear',
    nextKind: 'clear',
    batTimes: batsFor(1),
    bats: [],
    nextBat: 0,
    chased: 0,
    festival: false,
  };
  const { moths, fireflies } = stats(s);
  s.moths = makeMoths(moths, fireflies);
  return s;
}

/**
 * Sends moth `moth` to light lantern `i`, or to refill it if it is already lit. A firefly leaving
 * the jar lights FIREFLY_LANTERNS on the flight; `hops` is how many more after this one.
 */
function dispatch(s: GameState, moth: Moth, i: number, hops = moth.kind === 'firefly' ? FIREFLY_LANTERNS - 1 : 0) {
  moth.task = 'out';
  moth.target = i;
  moth.hops = hops;
  s.lanterns[i].claimed = true;
}

/** A firefly's next stop after lighting a lantern: the oldest queued tap, else the nearest dark lantern no moth has, else -1. */
function nextHop(s: GameState, m: Moth) {
  const queued = s.queue.findIndex((i) => !s.lanterns[i].claimed);
  if (queued >= 0) return s.queue.splice(queued, 1)[0];
  let best = -1;
  let bestD = Infinity;
  s.lanterns.forEach((l, i) => {
    const d = Math.hypot(l.x - m.x, l.y - m.y);
    if (!l.lit && !l.claimed && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/**
 * Taps lantern `i`. The first idle moth goes to light it, or refill it if it is already lit. When
 * every moth is busy the tap waits in the queue (up to QUEUE_MAX) and a moth takes it when one
 * comes home. False when the tap was lost: another moth already has the lantern, the queue is full,
 * or it is not dusk.
 */
export function send(s: GameState, i: number) {
  const lantern = s.lanterns[i];
  if (s.phase !== 'dusk' || !lantern || lantern.claimed || s.queue.includes(i)) return false;
  // An idle firefly goes first, so its second lantern is not wasted.
  const moth = s.moths.find((m) => m.task === 'idle' && m.kind === 'firefly') ?? s.moths.find((m) => m.task === 'idle');
  if (moth) {
    dispatch(s, moth, i);
    return true;
  }
  if (s.queue.length >= QUEUE_MAX) return false;
  s.queue.push(i);
  return true;
}

/**
 * Sends an idle moth to chase bat `id` off. False when there is no such bat still coming, a moth
 * already chases it, or no moth is idle (a chase is never queued).
 */
export function chase(s: GameState, id: number) {
  const bat = s.bats.find((b) => b.id === id && b.task === 'fly');
  if (s.phase !== 'dusk' || !bat || s.moths.some((m) => m.task === 'chase' && m.bat === id)) return false;
  // A plain moth goes before a firefly, which is better kept for lanterns.
  const moth = s.moths.find((m) => m.task === 'idle' && m.kind !== 'firefly') ?? s.moths.find((m) => m.task === 'idle');
  if (!moth) return false;
  moth.task = 'chase';
  moth.bat = id;
  return true;
}

/** Moves a moth or bat `step` pixels towards (x, y); true once it is there. */
function flyTo(m: { x: number; y: number }, x: number, y: number, step: number) {
  const dx = x - m.x;
  const dy = y - m.y;
  const d = Math.hypot(dx, dy);
  if (d <= step) {
    m.x = x;
    m.y = y;
    return true;
  }
  m.x += (dx / d) * step;
  m.y += (dy / d) * step;
  return false;
}

/** True when a moth is sitting on lantern `i`: lighting it or guarding it. */
const sitting = (s: GameState, i: number) => s.moths.some((m) => m.target === i && (m.task === 'lighting' || m.task === 'guard'));

/** The lantern a gust warned now goes for: the lit one with the most oil left, or -1 if none is lit. */
function gustTarget(s: GameState) {
  let best = -1;
  s.lanterns.forEach((l, i) => {
    if (l.lit && (best < 0 || l.oilMs > s.lanterns[best].oilMs)) best = i;
  });
  return best;
}

/** The lantern a bat goes for: the lit one with the most oil, or -1 if none is lit. */
const batTarget = gustTarget;

/** Bats come in from the edges at their times, fly to a lit lantern and snuff it, unless chased off first. */
function raiders(s: GameState, dt: number) {
  if (s.batTimes.length && s.duskMs <= s.batTimes[0]) {
    s.batTimes.shift();
    const target = batTarget(s);
    // With no lantern lit there is nothing to snuff, and the bat stays away.
    if (target >= 0) {
      const fromLeft = (s.night + s.nextBat) % 2 === 0;
      s.bats.push({ id: s.nextBat++, x: fromLeft ? -24 : VIEW_W + 24, y: BAT_Y, target, task: 'fly' });
    }
  }
  for (const bat of s.bats) {
    if (bat.task === 'flee') {
      bat.x += ((bat.x < VIEW_W / 2 ? -1 : 1) * BAT_SPEED * BAT_FLEE * dt) / 1000;
      bat.y -= (BAT_SPEED * BAT_FLEE * 0.6 * dt) / 1000;
      continue;
    }
    // Its lantern went dark on its way: it turns to another lit one, or leaves.
    if (!s.lanterns[bat.target].lit) {
      const next = batTarget(s);
      if (next < 0) {
        bat.task = 'flee';
        continue;
      }
      bat.target = next;
    }
    const lantern = s.lanterns[bat.target];
    if (flyTo(bat, lantern.x, lantern.y - 6, (BAT_SPEED * dt) / 1000)) {
      const snuffed = !sitting(s, bat.target);
      if (snuffed) {
        lantern.lit = false;
        lantern.oilMs = 0;
      }
      s.events.push({ type: 'bat', lantern: bat.target, snuffed });
      bat.task = 'flee';
    }
  }
  s.bats = s.bats.filter((b) => b.x > -60 && b.x < VIEW_W + 60 && b.y > -60);
}

/** Sends a guarding moth home and frees its lantern. */
function release(m: Moth, s: GameState) {
  s.lanterns[m.target].claimed = false;
  m.task = 'home';
  m.target = -1;
}

/** Warns of the next gust when it is GUST_WARN_MS away, and blows it when it arrives. */
function wind(s: GameState) {
  if (!s.gust && s.gusts.length && s.duskMs <= s.gusts[0] + GUST_WARN_MS) {
    const atMs = s.gusts.shift()!;
    const target = gustTarget(s);
    // With no lantern lit the wind has nothing to blow out, and passes unannounced.
    if (target >= 0) s.gust = { target, atMs };
  }
  if (s.gust && s.duskMs <= s.gust.atMs) {
    const { target } = s.gust;
    const lantern = s.lanterns[target];
    const shielded = sitting(s, target);
    if (shielded) s.shields++;
    else if (lantern.lit) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
    s.events.push({ type: 'gust', lantern: target, shielded });
    s.gust = null;
    for (const m of s.moths) if (m.task === 'guard') release(m, s);
  }
}

/** Advances dusk by `dt` milliseconds: oil burns, moths fly and light, gusts blow, and night falls at the end. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'dusk') return;
  const { burnMs } = stats(s);
  const burn = s.kind === 'fog' ? FOG_BURN : 1;
  s.lanterns.forEach((lantern, i) => {
    // A moth refilling a lantern holds its flame, so it burns no oil meanwhile.
    if (!lantern.lit || sitting(s, i)) return;
    lantern.oilMs -= dt * burn;
    if (lantern.oilMs <= 0) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
  });
  s.moths.forEach((m, i) => {
    const step = (mothSpeed(s, m) * dt) / 1000;
    if (m.task === 'out') {
      const lantern = s.lanterns[m.target];
      if (flyTo(m, lantern.x, lantern.y - 4, step)) {
        m.task = 'lighting';
        m.lightingMs = 0;
        m.closeCall = lantern.lit && lantern.oilMs < lantern.oilMaxMs * CLOSE_CALL;
      }
    } else if (m.task === 'lighting') {
      m.lightingMs += dt;
      if (m.lightingMs >= mothLightMs(s, m)) {
        const lantern = s.lanterns[m.target];
        lantern.lit = true;
        lantern.oilMs = burnMs * MOTH_KINDS[m.kind].oil;
        lantern.oilMaxMs = lantern.oilMs;
        if (m.closeCall) {
          s.coins += CLOSE_CALL_PAY;
          s.closeCalls++;
          s.events.push({ type: 'closeCall', lantern: m.target, coins: CLOSE_CALL_PAY });
          m.closeCall = false;
        }
        // On the lantern a gust is coming for, the moth stays to shield it.
        if (s.gust?.target === m.target) m.task = 'guard';
        else {
          // A firefly with a lantern still to light flies on to it instead of going home.
          const next = m.hops > 0 ? nextHop(s, m) : -1;
          if (next >= 0) {
            s.lanterns[m.target].claimed = false;
            dispatch(s, m, next, m.hops - 1);
          } else release(m, s);
        }
      }
    } else if (m.task === 'chase') {
      const bat = s.bats.find((b) => b.id === m.bat && b.task === 'fly');
      if (!bat) {
        m.task = 'home';
        m.bat = -1;
      } else if (flyTo(m, bat.x, bat.y, step)) {
        bat.task = 'flee';
        s.chased++;
        s.events.push({ type: 'chased', x: bat.x, y: bat.y });
        m.task = 'home';
        m.bat = -1;
      }
    } else if (m.task === 'home') {
      const rest = mothRest(i, s.moths.length);
      if (flyTo(m, rest.x, rest.y, step)) m.task = 'idle';
    }
  });
  wind(s);
  raiders(s, dt);
  // A moth that has just come home takes the oldest queued tap.
  for (const moth of s.moths) {
    if (moth.task !== 'idle' || s.queue.length === 0) continue;
    const i = s.queue.shift()!;
    if (!s.lanterns[i].claimed) dispatch(s, moth, i);
  }
  s.duskMs = Math.max(0, s.duskMs - dt);
  if (s.duskMs === 0) nightfall(s);
}

function nightfall(s: GameState) {
  const count = s.lanterns.length;
  const lit = s.lanterns.filter((l) => l.lit).length;
  const required = requiredFor(count);
  const { done, of } = orderProgress(s);
  const orderMet = done >= of;
  const chains = chainsFor(s).filter((i) => chainLit(s, i)).length;
  const lanternPay = lit * PAY_PER_LANTERN + (lit === count ? ALL_LIT_BONUS : 0) + chains * CHAIN_BONUS;
  const earned = lanternPay * (s.kind === 'feast' ? FEAST_PAY : 1) + (orderMet ? s.order.reward : 0);
  const lostHearth = lit < required;
  s.queue = [];
  s.gust = null;
  s.gusts = [];
  s.batTimes = [];
  s.bats = [];
  s.coins += earned;
  if (lostHearth) s.lives--;
  else s.kept++;
  s.best = Math.max(s.best, s.kept);
  const festival = !s.festival && s.kept >= FESTIVAL_NIGHTS && s.lives > 0;
  if (festival) s.festival = true;
  s.report = { lit, count, required, earned, lostHearth, orderMet, chains, festival };
  s.nextKind = drawKind(s.night + 1);
  s.phase = s.lives <= 0 ? 'over' : festival ? 'festival' : 'night';
}

/** Leaves the Great Festival's panel for the night panel; the nights go on. */
export function carryOn(s: GameState) {
  if (s.phase !== 'festival') return false;
  s.phase = 'night';
  return true;
}

/** The cost of the next level of `id`, or null when it is maxed out. */
export const nextCost = (s: GameState, id: UpgradeId) => UPGRADES[id].costs[s.levels[id]] ?? null;

/** Buys the next level of an upgrade between nights; false if it is maxed or too dear. */
export function buy(s: GameState, id: UpgradeId) {
  const cost = nextCost(s, id);
  if (s.phase !== 'night' || cost === null || s.coins < cost) return false;
  s.coins -= cost;
  s.levels[id]++;
  return true;
}

/** Starts the next night's dusk, with one more lantern and every moth back in the jar. */
export function nextDusk(s: GameState) {
  if (s.phase !== 'night') return false;
  s.night++;
  s.phase = 'dusk';
  s.duskMs = DUSK_MS;
  s.lanterns = makeLanterns(s.night);
  const { moths, fireflies } = stats(s);
  s.moths = makeMoths(moths, fireflies);
  s.queue = [];
  s.report = null;
  s.order = orderFor(s.night);
  s.kind = s.nextKind;
  s.gusts = gustsFor(s.night, s.kind);
  s.batTimes = batsFor(s.night);
  s.bats = [];
  s.chased = 0;
  s.gust = null;
  s.closeCalls = 0;
  s.shields = 0;
  return true;
}
