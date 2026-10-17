import { byDifficulty } from '../../../../shared/settings';
import type { TextKey } from '../i18n';
import { DISTRICTS, type DistrictId, JARS, LANTERN_SPOTS, mothRest } from './places';

// The rules in plain TypeScript, with no Phaser. Each night begins with a dusk: tap a lantern and
// an idle moth flies from the jar to light it, then flies home. A lit lantern burns its oil and
// goes out when the oil runs dry. When dusk ends, night falls and every lantern still lit pays;
// too few lit costs one of the keep's hearths. Between nights the coins buy upgrades. Each night
// the herald orders a bonus goal, gusts blow out lanterns no moth is sitting on, and a refill that
// saves a nearly dry lantern pays a little at once. Each night draws a kind (fog, a feast, a
// storm), bats come for the lanterns from the third night, lanterns side by side form chains that
// pay when all of them are lit, and ten nights kept reach the Great Festival, a win, with endless
// nights after. From the second night cottage windows call for a named lantern, from the third
// refills draw on a cask of oil topped up between nights, from the fourth some spots hold a
// beacon, a candle or a bell, every fifth night the Great Owl sweeps a row of lanterns, and at
// every fifth nightfall the keep can move to another district with its own spots and rule. Late
// nights add tired moths (from the sixth), a second jar to buy, lost hearths to rekindle and, after
// the Festival, curses to pick that raise the pay.

export const UPGRADE_IDS = ['wick', 'oil', 'moths', 'wings', 'firefly', 'nectar', 'jar'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface Upgrade {
  name: TextKey;
  /** What one level does, shown on its button. */
  blurb: TextKey;
  /** The cost of each level; its length is the most levels there are. */
  costs: readonly number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  wick: { name: 'wickName', blurb: 'wickBlurb', costs: [10, 20, 35] },
  oil: { name: 'oilName', blurb: 'oilBlurb', costs: [10, 20, 35] },
  moths: { name: 'mothsName', blurb: 'mothsBlurb', costs: [15, 30, 50] },
  wings: { name: 'wingsName', blurb: 'wingsBlurb', costs: [10, 20, 35] },
  firefly: { name: 'fireflyName', blurb: 'fireflyBlurb', costs: [25, 45] },
  nectar: { name: 'nectarName', blurb: 'nectarBlurb', costs: [15, 30, 50] },
  jar: { name: 'jarName', blurb: 'jarBlurb', costs: [120] },
};

/**
 * Tired moths (LK13): from TIRED_NIGHT a moth that comes home from its TIRED_FLIGHTS-th flight of
 * the dusk rests TIRED_MS in the jar before it can fly again; each Nectar level takes NECTAR_MS off.
 */
export const TIRED_NIGHT = 6;
export const TIRED_FLIGHTS = 4;
export const TIRED_MS = 6_000;
export const NECTAR_MS = 1_500;
/** How long a tired moth rests, with the Nectar bought. */
export const restMs = (s: GameState) => Math.max(0, TIRED_MS - NECTAR_MS * s.levels.nectar);

/** Rekindle a hearth (LK12): between nights coins buy back a lost hearth, at these prices in turn. */
export const HEARTH_COSTS = [40, 80, 120] as const;
/** The price of rekindling a hearth now, or null when none is out or all three rekindles are spent. */
export const hearthCost = (s: GameState) => (s.lives < LIVES ? (HEARTH_COSTS[s.rekindled] ?? null) : null);

/**
 * Pick your peril (LK11): every nightfall before a night from PERIL_NIGHT offers two curses drawn
 * from CURSES. Each one taken lasts the rest of the game and adds PERIL_STEP to the multiplier on
 * what every nightfall pays; the best multiplier reached is saved.
 */
export const PERIL_NIGHT = 11;
export const PERIL_STEP = 0.25;
export const CURSES = {
  wet: { name: 'wetName', blurb: 'wetBlurb' },
  bats: { name: 'batsName', blurb: 'batsBlurb' },
  thin: { name: 'thinName', blurb: 'thinBlurb' },
  watch: { name: 'watchName', blurb: 'watchBlurb' },
} as const satisfies Record<string, { name: TextKey; blurb: TextKey }>;
export type CurseId = keyof typeof CURSES;
export const CURSE_IDS = Object.keys(CURSES) as CurseId[];
/** What each Wet wicks multiplies the wick time by, and each Thin oil the burn. */
export const WET_WICK = 1.5;
export const THIN_BURN = 1.25;
/** When the bats of Restless bats come, as dusk left, one more for each taken. */
export const RESTLESS_BATS = [22_000, 8_000, 36_000, 12_000, 26_000, 4_000];
/** What every nightfall's pay is multiplied by, for the curses taken. */
export const perilMult = (s: GameState) => 1 + PERIL_STEP * CURSE_IDS.reduce((n, id) => n + s.curses[id], 0);
/** Two different curses, drawn with Math.random. */
function drawOffer(): CurseId[] {
  const ids = [...CURSE_IDS];
  const first = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
  return [first, ids[Math.floor(Math.random() * ids.length)]];
}

/** The view's width in pixels, where bats and the owl come in and leave. */
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

/**
 * The kinds of lantern (LK6). From LANTERN_KINDS_NIGHT some spots hold one: a beacon holds 40% less
 * oil but pays triple at nightfall, a candle catches at once but holds half the oil, and a bell
 * stuns every bat within BELL_RANGE of it while it is lit. Each multiplies the oil a fill gives,
 * the wick time and the pay a lantern.
 */
export const LANTERN_KINDS = {
  plain: { name: 'plainName', oil: 1, wick: 1, pay: 1 },
  beacon: { name: 'beaconName', oil: 0.6, wick: 1, pay: 3 },
  candle: { name: 'candleName', oil: 0.5, wick: 0, pay: 1 },
  bell: { name: 'bellName', oil: 1, wick: 1, pay: 1 },
} as const satisfies Record<string, { name: TextKey; oil: number; wick: number; pay: number }>;
export type LanternKind = keyof typeof LANTERN_KINDS;
/** The kinds of lantern that spots hold, in the order nights deal them. */
export const SPECIAL_KINDS: readonly LanternKind[] = ['beacon', 'candle', 'bell'];
/** The first night with special lanterns, and the most of them a night has. */
export const LANTERN_KINDS_NIGHT = 4;
export const LANTERN_KINDS_MAX = 3;
/** How near a lit bell a bat must be to be stunned, in view pixels. */
export const BELL_RANGE = 150;
/**
 * The kind of each of the night's `count` lanterns: all plain before LANTERN_KINDS_NIGHT, then one
 * more special spot each night up to LANTERN_KINDS_MAX, dealt to spots that change with the night.
 */
export function lanternKindsFor(night: number, count: number): LanternKind[] {
  const kinds: LanternKind[] = Array.from({ length: count }, () => 'plain');
  if (night < LANTERN_KINDS_NIGHT) return kinds;
  const specials = Math.min(LANTERN_KINDS_MAX, night - LANTERN_KINDS_NIGHT + 1, count);
  for (let k = 0; k < specials; k++) {
    let spot = (night * 7 + k * 4) % count;
    while (kinds[spot] !== 'plain') spot = (spot + 1) % count;
    kinds[spot] = SPECIAL_KINDS[(night + k) % SPECIAL_KINDS.length];
  }
  return kinds;
}

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
 * The Great Owl (LK7): every OWL_EVERY nights it sweeps one row of lanterns, OWL_AT_MS of dusk
 * left, warned OWL_WARN_MS before, flying across at OWL_SPEED and snuffing every lit lantern on
 * the row it passes unless a moth sits on it.
 */
export const OWL_EVERY = 5;
export const OWL_AT_MS = 20_000;
export const OWL_WARN_MS = 6_000;
export const OWL_SPEED = 300;
/** When the owl comes on night `night`, as dusk left: one sweep every fifth night, else none. */
export const owlsFor = (night: number) => (night % OWL_EVERY === 0 ? [OWL_AT_MS] : []);

/**
 * Windows that call (LK8): from CALLS_NIGHT a cottage window asks for a named lantern to be lit
 * within CALL_MS, for CALL_PAY coins; a call that runs out costs nothing.
 */
export const CALLS_NIGHT = 2;
export const CALL_MS = 8_000;
export const CALL_PAY = 3;
/** When the windows call on night `night`, as dusk left: none on the first night, two after, three from night 6. */
export const callsFor = (night: number) => (night < CALLS_NIGHT ? [] : night < 6 ? [37_000, 23_000] : [37_000, 23_000, 11_000]);

/**
 * The oil cask (LK9): from CASK_NIGHT a refill of a lit lantern draws one fill from the cask,
 * which holds up to CASK_MAX and is topped up between nights at CASK_COST a fill. Lighting a dark
 * lantern is always free.
 */
export const CASK_NIGHT = 3;
export const CASK_START = 3;
export const CASK_MAX = 6;
export const CASK_COST = 3;
/** True once refills draw on the cask. */
export const usesCask = (s: GameState) => s.night >= CASK_NIGHT;

/** Districts (LK10): at every MOVE_EVERY nightfalls the keep can move to another district. */
export const MOVE_EVERY = 5;
/** The district the game is in. */
export const districtOf = (s: GameState) => DISTRICTS[s.district];
/** The chains of the district the game is in. */
export const chainsOf = (s: GameState) => districtOf(s).chains;

/**
 * The kinds of night. The first night is always clear; each later night's kind is drawn at the
 * nightfall before it, so the night panel can show what is coming.
 */
export const NIGHT_KINDS = {
  clear: { name: 'clearName', blurb: 'clearBlurb' },
  fog: { name: 'fogName', blurb: 'fogBlurb' },
  feast: { name: 'feastName', blurb: 'feastBlurb' },
  storm: { name: 'stormName', blurb: 'stormBlurb' },
} as const satisfies Record<string, { name: TextKey; blurb: TextKey }>;
export type NightKind = keyof typeof NIGHT_KINDS;
export const NIGHT_KIND_IDS = Object.keys(NIGHT_KINDS) as NightKind[];
/** How much faster oil burns on a foggy night. */
export const FOG_BURN = 1.4;
/** How much faster oil burns in the market. */
export const TRADE_BURN = 1.15;
/** What vespers add to each lantern's pay on Chapel Hill, and the share that must burn there. */
export const VESPERS_PAY = 2;
export const VESPERS_QUOTA = 0.75;
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
export const batsFor = (night: number, restless = 0) =>
  [...(night < 3 ? [] : night < 6 ? [28_000] : [30_000, 16_000]), ...RESTLESS_BATS.slice(0, restless)].sort((a, b) => b - a);

/** What each lantern chain with every lantern lit at nightfall pays. */
export const CHAIN_BONUS = 8;
/** The chains night `s` has every lantern of, by index into the district's chains. */
export const chainsFor = (s: GameState) => chainsOf(s).map((_, i) => i).filter((i) => chainsOf(s)[i].lanterns.every((l) => l < s.lanterns.length));
/** True when every lantern of chain `i` is lit. */
export const chainLit = (s: GameState, i: number) => chainsOf(s)[i].lanterns.every((l) => s.lanterns[l]?.lit);

/** Nights kept to reach the Great Festival, the win; the nights go on after it. */
export const FESTIVAL_NIGHTS = 10;
/** A refill of a lantern with less than this share of its oil left is a close call... */
export const CLOSE_CALL = 0.15;
/** ...and pays this many coins at once. */
export const CLOSE_CALL_PAY = 2;
/** What a close call pays here: double in the market. */
export const closeCallPay = (s: GameState) => CLOSE_CALL_PAY * (districtOf(s).rule === 'trade' ? 2 : 1);
/** What a window call pays here: double in the market. */
export const callPay = (s: GameState) => CALL_PAY * (districtOf(s).rule === 'trade' ? 2 : 1);

/**
 * The herald's order: one bonus goal a night, paid at nightfall. `lit` names lanterns that must be
 * burning at nightfall; `closeCalls` and `shields` count close-call refills and gusts a moth
 * shielded during the dusk.
 */
export type OrderGoal = { kind: 'lit'; lanterns: readonly number[] } | { kind: 'closeCalls' | 'shields'; count: number };
export interface Order {
  /** What the herald asks for, as named in the keep; `orderText` in the scene names another district's lanterns. */
  text: TextKey;
  goal: OrderGoal;
  reward: number;
}
/**
 * The orders, one a night in this order, then round again. Each only names lanterns its night has.
 * The texts name the keep's lanterns; in another district the scene names that district's.
 */
export const ORDERS: readonly Order[] = [
  { text: 'orderTowers', goal: { kind: 'lit', lanterns: [0, 1, 2] }, reward: 15 },
  { text: 'orderWest', goal: { kind: 'lit', lanterns: [0, 3, 5] }, reward: 15 },
  { text: 'orderCloseCalls', goal: { kind: 'closeCalls', count: 2 }, reward: 15 },
  { text: 'orderEast', goal: { kind: 'lit', lanterns: [1, 4, 6] }, reward: 15 },
  { text: 'orderShield', goal: { kind: 'shields', count: 1 }, reward: 15 },
];
export const orderFor = (night: number): Order => ORDERS[(night - 1) % ORDERS.length];

/** How far the night's order has come: `done` of `of`. */
export function orderProgress(s: GameState) {
  const goal = s.order.goal;
  if (goal.kind === 'lit') return { done: goal.lanterns.filter((i) => s.lanterns[i]?.lit).length, of: goal.lanterns.length };
  return { done: Math.min(goal.count, goal.kind === 'closeCalls' ? s.closeCalls : s.shields), of: goal.count };
}

/** Lanterns to light on night `night`: five on the first, one more each night after. */
export const lanternsFor = (night: number) => Math.min(4 + night, LANTERN_SPOTS.length);
/** Lanterns that must be lit at nightfall to keep every hearth: three in five, or three in four on Chapel Hill. */
export const requiredFor = (count: number, district: DistrictId = 'keep') => Math.ceil(count * (DISTRICTS[district].rule === 'vespers' ? VESPERS_QUOTA : 0.6));
/** Lanterns that must be lit tonight: the district's share, plus one for each Watchful lord taken. */
export const required = (s: GameState) => Math.min(s.lanterns.length, requiredFor(s.lanterns.length, s.district) + s.curses.watch);

export interface Lantern {
  x: number;
  y: number;
  /** A plain lantern, or one of the special kinds from night LANTERN_KINDS_NIGHT. */
  kind: LanternKind;
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
   * Waiting in the jar, flying out, lighting a wick, guarding the lantern a gust or the owl is
   * coming for (it stays after lighting it until the threat has passed), chasing a bat, flying
   * home, or resting in the jar once tired.
   */
  task: 'idle' | 'out' | 'lighting' | 'guard' | 'chase' | 'home' | 'rest';
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
  /** Flights out of the jar since it last rested this dusk, and the rest left while tired. */
  flights: number;
  restMs: number;
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

/** The Great Owl, warned for a row of lanterns and then sweeping across it. */
export interface Owl {
  /** The row it sweeps, as the lanterns' height, and the lanterns on it. */
  y: number;
  lanterns: number[];
  /** When it comes, as dusk left in milliseconds. */
  atMs: number;
  /** Where it is while sweeping, or null while only warned. */
  x: number | null;
  /** The lanterns it has passed on this sweep. */
  passed: number[];
}

/** A window calling for lantern `lantern` to be lit within `msLeft`. */
export interface Call {
  lantern: number;
  msLeft: number;
}

/** Something that just happened, for the scene to show; it empties the list every frame. */
export type GameEvent =
  | { type: 'closeCall'; lantern: number; coins: number }
  | { type: 'gust'; lantern: number; shielded: boolean }
  /** A bat reached its lantern: it snuffed it, or a moth sitting on it drove the bat off. */
  | { type: 'bat'; lantern: number; snuffed: boolean }
  /** A moth caught up with a bat, which flees. */
  | { type: 'chased'; x: number; y: number }
  /** The owl passed a lantern on its row: snuffed it, or a moth sitting on it kept it. */
  | { type: 'owl'; lantern: number; shielded: boolean }
  /** A window's call was answered in time (`coins` paid) or ran out. */
  | { type: 'call'; lantern: number; kept: boolean; coins: number }
  /** A moth came to refill a lantern and found the cask dry. */
  | { type: 'dry'; lantern: number };

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
  /**
   * `festival` is the night the Great Festival is reached: its panel shows before the night
   * panel. `move` is a fifth nightfall's choice of district and `peril` the curses offered from
   * PERIL_NIGHT, shown in that order before the night panel too.
   */
  phase: 'dusk' | 'night' | 'festival' | 'move' | 'peril' | 'over';
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
  /** The owl's sweeps still to come this dusk, as dusk left, and the one warned or flying. */
  owls: number[];
  owl: Owl | null;
  /** Window calls still to come this dusk, as dusk left, the one calling now, and those answered this dusk. */
  callTimes: number[];
  call: Call | null;
  callsKept: number;
  /** Fills of oil in the cask, which refills draw on from CASK_NIGHT. */
  cask: number;
  /** The district the keep stands in, and the one it moves to at the next dusk. */
  district: DistrictId;
  nextDistrict: DistrictId;
  /** True from a fifth nightfall until the district for the next night is chosen. */
  moveDue: boolean;
  /** Which jar each moth rests at, by index (0 the gate's, 1 the second jar's); kept from night to night. */
  homes: number[];
  /** Hearths rekindled this game. */
  rekindled: number;
  /** Curses taken, by id, and the two offered at this nightfall (empty when none). */
  curses: Record<CurseId, number>;
  offer: CurseId[];
  /** The curses' multiplier the last nightfall paid at. */
  paidMult: number;
  /** The best pay multiplier reached in any game, saved in the browser. */
  bestPeril: number;
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
/** How long moth `m` takes to catch a wick, in milliseconds: none at all on a candle. */
export const mothLightMs = (s: GameState, m: Moth) =>
  Math.round(stats(s).lightMs * MOTH_KINDS[m.kind].wick * LANTERN_KINDS[s.lanterns[m.target]?.kind ?? 'plain'].wick * WET_WICK ** s.curses.wet);

function makeLanterns(night: number, district: DistrictId): Lantern[] {
  const count = lanternsFor(night);
  const kinds = lanternKindsFor(night, count);
  return DISTRICTS[district].spots.slice(0, count).map(({ x, y }, i) => ({ x, y, kind: kinds[i], lit: false, oilMs: 0, oilMaxMs: 0, claimed: false }));
}

/** The jar moth `i` rests at. */
const homeOf = (s: GameState, i: number) => (s.levels.jar > 0 ? (s.homes[i] ?? 0) : 0);

/** Where moth `i` rests: spaced out on its jar's rim among the moths that share that jar. */
export function restOf(s: GameState, i: number) {
  const jar = homeOf(s, i);
  const mates = s.moths.map((_, k) => k).filter((k) => homeOf(s, k) === jar);
  return mothRest(mates.indexOf(i), mates.length, JARS[jar]);
}

/** The moths with the bought upgrades, `moths` in KIND_ORDER then the fireflies, at rest on their jars. */
function makeMoths(s: GameState) {
  const { moths: n, fireflies } = stats(s);
  s.moths = Array.from({ length: n + fireflies }, (_, i) => ({
    kind: i < n ? KIND_ORDER[i % KIND_ORDER.length] : ('firefly' as const),
    x: 0,
    y: 0,
    task: 'idle' as const,
    target: -1,
    lightingMs: 0,
    closeCall: false,
    bat: -1,
    hops: 0,
    flights: 0,
    restMs: 0,
  }));
  s.moths.forEach((m, i) => Object.assign(m, restOf(s, i)));
}

export function newGame(best = 0, bestPeril = 1): GameState {
  const s: GameState = {
    night: 1,
    phase: 'dusk',
    duskMs: DUSK_MS,
    coins: 0,
    lives: LIVES,
    lanterns: makeLanterns(1, 'keep'),
    moths: [],
    levels: { wick: 0, oil: 0, moths: 0, wings: 0, firefly: 0, nectar: 0, jar: 0 },
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
    owls: owlsFor(1),
    owl: null,
    callTimes: callsFor(1),
    call: null,
    callsKept: 0,
    cask: CASK_START,
    district: 'keep',
    nextDistrict: 'keep',
    moveDue: false,
    homes: [],
    rekindled: 0,
    curses: { wet: 0, bats: 0, thin: 0, watch: 0 },
    offer: [],
    paidMult: 1,
    bestPeril,
  };
  makeMoths(s);
  return s;
}

/**
 * Sends moth `moth` to light lantern `i`, or to refill it if it is already lit. A firefly leaving
 * the jar lights FIREFLY_LANTERNS on the flight; `hops` is how many more after this one.
 */
function dispatch(s: GameState, moth: Moth, i: number, hops = moth.kind === 'firefly' ? FIREFLY_LANTERNS - 1 : 0) {
  // Leaving the jar is a flight; a firefly flying on from its first lantern is the same one.
  if (moth.task === 'idle') moth.flights++;
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
 * it is not dusk, or it is lit and the cask is dry.
 */
export function send(s: GameState, i: number) {
  const lantern = s.lanterns[i];
  if (s.phase !== 'dusk' || !lantern || lantern.claimed || s.queue.includes(i)) return false;
  if (lantern.lit && usesCask(s) && s.cask <= 0) return false;
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
  moth.flights++;
  return true;
}

/**
 * Once the second jar is bought, sends idle moth `i` to rest at the other jar from now on (and on
 * later nights). False when there is no second jar, it is not dusk or the moth is not idle.
 */
export function swapJar(s: GameState, i: number) {
  const moth = s.moths[i];
  if (s.phase !== 'dusk' || s.levels.jar === 0 || moth?.task !== 'idle') return false;
  s.homes[i] = 1 - homeOf(s, i);
  moth.task = 'home';
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

/** True while a gust or the owl is coming for lantern `i`, so a moth that lights it stays to guard it. */
export const threatened = (s: GameState, i: number) => s.gust?.target === i || !!s.owl?.lanterns.includes(i);

/** The lantern a gust warned now goes for: the lit one with the most oil left, or -1 if none is lit. */
function gustTarget(s: GameState, except = -1) {
  let best = -1;
  s.lanterns.forEach((l, i) => {
    if (i !== except && l.lit && (best < 0 || l.oilMs > s.lanterns[best].oilMs)) best = i;
  });
  return best;
}

/** The lantern a bat goes for: the lit one with the most oil, or -1 if none is lit. */
const batTarget = (s: GameState) => gustTarget(s);

/** True while bat `bat` is within BELL_RANGE of a lit bell, which holds it still. */
export const stunned = (s: GameState, bat: Bat) => s.lanterns.some((l) => l.kind === 'bell' && l.lit && Math.hypot(l.x - bat.x, l.y - bat.y) <= BELL_RANGE);

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
    // A lit bell nearby holds it where it is.
    if (stunned(s, bat)) continue;
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

/** Sends home every guard whose lantern nothing is coming for any more. */
function releaseGuards(s: GameState) {
  for (const m of s.moths) if (m.task === 'guard' && !threatened(s, m.target)) release(m, s);
}

/** Blows out lantern `i` unless a moth sits on it; the gust's event says which. */
function blow(s: GameState, i: number) {
  const lantern = s.lanterns[i];
  const shielded = sitting(s, i);
  if (shielded) s.shields++;
  else if (lantern.lit) {
    lantern.lit = false;
    lantern.oilMs = 0;
  }
  s.events.push({ type: 'gust', lantern: i, shielded });
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
    blow(s, target);
    // The sea wind at the docks takes the next lantern too.
    if (districtOf(s).rule === 'seawind') {
      const second = gustTarget(s, target);
      if (second >= 0) blow(s, second);
    }
    s.gust = null;
    releaseGuards(s);
  }
}

/** The rows of lanterns: each height and the lanterns at it, top row first. */
function rows(s: GameState) {
  const byY = new Map<number, number[]>();
  s.lanterns.forEach((l, i) => byY.set(l.y, [...(byY.get(l.y) ?? []), i]));
  return [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([y, lanterns]) => ({ y, lanterns }));
}

/** Warns of the owl OWL_WARN_MS before its sweep of the row with the most lit lanterns, then flies it across. */
function greatOwl(s: GameState, dt: number) {
  if (!s.owl && s.owls.length && s.duskMs <= s.owls[0] + OWL_WARN_MS) {
    const atMs = s.owls.shift()!;
    const lit = (r: { lanterns: number[] }) => r.lanterns.filter((i) => s.lanterns[i].lit).length;
    const row = rows(s).reduce((best, r) => (lit(r) > lit(best) || (lit(r) === lit(best) && r.lanterns.length > best.lanterns.length) ? r : best));
    s.owl = { y: row.y, lanterns: row.lanterns, atMs, x: null, passed: [] };
  }
  const owl = s.owl;
  if (!owl) return;
  if (owl.x === null) {
    if (s.duskMs <= owl.atMs) owl.x = -40;
    else return;
  }
  owl.x += (OWL_SPEED * dt) / 1000;
  for (const i of owl.lanterns) {
    if (owl.passed.includes(i) || s.lanterns[i].x > owl.x) continue;
    owl.passed.push(i);
    const lantern = s.lanterns[i];
    const shielded = sitting(s, i);
    // A dark lantern with no moth on it is passed without a word.
    if (!lantern.lit && !shielded) continue;
    if (!shielded) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
    s.events.push({ type: 'owl', lantern: i, shielded });
  }
  if (owl.x > VIEW_W + 40) {
    s.owl = null;
    releaseGuards(s);
  }
}

/** The lantern a window calls for: a dark one no moth is going to, by the night and the call, else the lit one lowest on oil, else -1. */
function callTarget(s: GameState) {
  const n = s.lanterns.length;
  const start = (s.night * 3 + s.callsKept + s.callTimes.length) % n;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const l = s.lanterns[i];
    if (!l.lit && !l.claimed && !s.queue.includes(i)) return i;
  }
  let best = -1;
  s.lanterns.forEach((l, i) => {
    if (l.lit && !l.claimed && (best < 0 || l.oilMs < s.lanterns[best].oilMs)) best = i;
  });
  return best;
}

/** A window calls for a lantern at its times; the call runs out after CALL_MS. */
function windows(s: GameState, dt: number) {
  if (!s.call && s.callTimes.length && s.duskMs <= s.callTimes[0]) {
    s.callTimes.shift();
    const lantern = callTarget(s);
    if (lantern >= 0) s.call = { lantern, msLeft: CALL_MS };
  }
  if (!s.call) return;
  s.call.msLeft -= dt;
  if (s.call.msLeft <= 0) {
    s.events.push({ type: 'call', lantern: s.call.lantern, kept: false, coins: 0 });
    s.call = null;
  }
}

/** A moth has just lit (or refilled) lantern `i`: a window calling for it is answered. */
function answerCall(s: GameState, i: number) {
  if (s.call?.lantern !== i) return;
  const coins = callPay(s);
  s.coins += coins;
  s.callsKept++;
  s.events.push({ type: 'call', lantern: i, kept: true, coins });
  s.call = null;
}

/** Advances dusk by `dt` milliseconds: oil burns, moths fly and light, gusts blow, and night falls at the end. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'dusk') return;
  const { burnMs } = stats(s);
  const burn = (s.kind === 'fog' ? FOG_BURN : 1) * (districtOf(s).rule === 'trade' ? TRADE_BURN : 1) * THIN_BURN ** s.curses.thin;
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
        // A refill draws a fill from the cask; with the cask dry the moth leaves the lantern as it is.
        const refill = lantern.lit && usesCask(s);
        if (refill && s.cask <= 0) {
          s.events.push({ type: 'dry', lantern: m.target });
          m.closeCall = false;
        } else {
          if (refill) s.cask--;
          lantern.lit = true;
          lantern.oilMs = burnMs * MOTH_KINDS[m.kind].oil * LANTERN_KINDS[lantern.kind].oil;
          lantern.oilMaxMs = lantern.oilMs;
          if (m.closeCall) {
            const coins = closeCallPay(s);
            s.coins += coins;
            s.closeCalls++;
            s.events.push({ type: 'closeCall', lantern: m.target, coins });
            m.closeCall = false;
          }
          answerCall(s, m.target);
        }
        // On the lantern a gust or the owl is coming for, the moth stays to shield it.
        if (threatened(s, m.target)) m.task = 'guard';
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
      const rest = restOf(s, i);
      if (flyTo(m, rest.x, rest.y, step)) {
        // From TIRED_NIGHT a moth home from its fourth flight of the dusk rests a while.
        const tired = s.night >= TIRED_NIGHT && m.flights >= TIRED_FLIGHTS && restMs(s) > 0;
        m.task = tired ? 'rest' : 'idle';
        m.restMs = tired ? restMs(s) : 0;
        if (tired) m.flights = 0;
      }
    } else if (m.task === 'rest') {
      m.restMs -= dt;
      if (m.restMs <= 0) {
        m.restMs = 0;
        m.task = 'idle';
      }
    } else if (m.task === 'idle') {
      // A moth moved along the rim when another joins or leaves its jar.
      const rest = restOf(s, i);
      flyTo(m, rest.x, rest.y, step);
    }
  });
  wind(s);
  greatOwl(s, dt);
  raiders(s, dt);
  windows(s, dt);
  // A moth that has just come home takes the oldest queued tap.
  for (const moth of s.moths) {
    if (moth.task !== 'idle' || s.queue.length === 0) continue;
    const i = s.queue.shift()!;
    if (!s.lanterns[i].claimed) dispatch(s, moth, i);
  }
  s.duskMs = Math.max(0, s.duskMs - dt);
  if (s.duskMs === 0) nightfall(s);
}

/** What lantern `l` pays lit at nightfall, before the feast: its kind's share of PAY_PER_LANTERN, plus vespers on Chapel Hill. */
export const lanternPay = (s: GameState, l: Lantern) => PAY_PER_LANTERN * LANTERN_KINDS[l.kind].pay + (districtOf(s).rule === 'vespers' ? VESPERS_PAY : 0);

function nightfall(s: GameState) {
  const count = s.lanterns.length;
  const litLanterns = s.lanterns.filter((l) => l.lit);
  const lit = litLanterns.length;
  const need = required(s);
  const { done, of } = orderProgress(s);
  const orderMet = done >= of;
  const chains = chainsFor(s).filter((i) => chainLit(s, i)).length;
  const lanternPayTotal = litLanterns.reduce((sum, l) => sum + lanternPay(s, l), 0) + (lit === count ? ALL_LIT_BONUS : 0) + chains * CHAIN_BONUS;
  s.paidMult = perilMult(s);
  const earned = Math.round((lanternPayTotal * (s.kind === 'feast' ? FEAST_PAY : 1) + (orderMet ? s.order.reward : 0)) * perilMult(s));
  const lostHearth = lit < need;
  s.queue = [];
  s.gust = null;
  s.gusts = [];
  s.batTimes = [];
  s.bats = [];
  s.owl = null;
  s.owls = [];
  s.call = null;
  s.callTimes = [];
  s.coins += earned;
  if (lostHearth) s.lives--;
  else s.kept++;
  s.best = Math.max(s.best, s.kept);
  const festival = !s.festival && s.kept >= FESTIVAL_NIGHTS && s.lives > 0;
  if (festival) s.festival = true;
  s.report = { lit, count, required: need, earned, lostHearth, orderMet, chains, festival };
  s.nextKind = drawKind(s.night + 1);
  s.moveDue = s.lives > 0 && s.night % MOVE_EVERY === 0;
  s.offer = s.lives > 0 && s.night + 1 >= PERIL_NIGHT ? drawOffer() : [];
  s.phase = s.lives <= 0 ? 'over' : festival ? 'festival' : afterPanels(s);
}

/** The panel after the festival's: the choice of district if due, then the curses if offered, then the night panel. */
const afterPanels = (s: GameState): GameState['phase'] => (s.moveDue ? 'move' : s.offer.length ? 'peril' : 'night');

/** Leaves the Great Festival's panel for the choice of district or the night panel; the nights go on. */
export function carryOn(s: GameState) {
  if (s.phase !== 'festival') return false;
  s.phase = afterPanels(s);
  return true;
}

/** Takes curse `id` from this nightfall's offer: it lasts the rest of the game and raises the pay. */
export function takeCurse(s: GameState, id: CurseId) {
  if (s.phase !== 'peril' || !s.offer.includes(id)) return false;
  s.curses[id]++;
  s.offer = s.offer.filter((c) => c !== id);
  s.bestPeril = Math.max(s.bestPeril, perilMult(s));
  if (!s.offer.length) s.phase = 'night';
  return true;
}

/** Leaves the curses not taken and goes on to the night panel. */
export function endPeril(s: GameState) {
  if (s.phase !== 'peril') return false;
  s.offer = [];
  s.phase = 'night';
  return true;
}

/** Picks the district the keep stands in from the next dusk, at a fifth nightfall's choice. */
export function moveTo(s: GameState, district: DistrictId) {
  if (s.phase !== 'move') return false;
  s.nextDistrict = district;
  s.moveDue = false;
  s.phase = afterPanels(s);
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
  // The second jar takes every other moth to start with; a tap on a resting moth swaps it.
  if (id === 'jar') s.homes = s.moths.map((_, i) => i % 2);
  return true;
}

/** Rekindles a hearth that went out, between nights, for hearthCost; false when none is out, too dear or spent. */
export function rekindle(s: GameState) {
  const cost = hearthCost(s);
  if (s.phase !== 'night' || cost === null || s.coins < cost) return false;
  s.coins -= cost;
  s.lives++;
  s.rekindled++;
  return true;
}

/** Puts one fill of oil in the cask between nights, for CASK_COST; false when it is full or the coins are short. */
export function topUp(s: GameState) {
  if (s.phase !== 'night' || s.cask >= CASK_MAX || s.coins < CASK_COST) return false;
  s.coins -= CASK_COST;
  s.cask++;
  return true;
}

/** Starts the next night's dusk, with one more lantern and every moth back in the jar. */
export function nextDusk(s: GameState) {
  if (s.phase !== 'night') return false;
  s.night++;
  s.phase = 'dusk';
  s.duskMs = DUSK_MS;
  s.district = s.nextDistrict;
  s.lanterns = makeLanterns(s.night, s.district);
  makeMoths(s);
  s.queue = [];
  s.report = null;
  s.order = orderFor(s.night);
  s.kind = s.nextKind;
  s.gusts = gustsFor(s.night, s.kind);
  s.batTimes = batsFor(s.night, s.curses.bats);
  s.bats = [];
  s.chased = 0;
  s.gust = null;
  s.closeCalls = 0;
  s.shields = 0;
  s.owls = owlsFor(s.night);
  s.owl = null;
  s.callTimes = callsFor(s.night);
  s.call = null;
  s.callsKept = 0;
  return true;
}
