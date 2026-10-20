import { BEDS, MAX_SHOP_PLACES, SHOPS, SHOP_GUILD, isLine2, line1Id, type GoodId, type RouteDef, type RouteEnd, type ShopGuild, type ShopId } from '../game/town';

// Where everything stands in a town shop's yard. Each shop has its own hand-drawn `YardPlan`: where
// its gardens, stations, market, guild and storefront stand, and the scenery that makes it a place of
// its own (a pond, a river, a lake, terraces, woods). The pieces themselves (a station with its
// markers, a garden with its pixie markers, the storefront) are laid out the same way everywhere.
// The doctor stays above the fence; customers come up from the street below it to the front of the
// counter. Phaser-free, since the sim reads the pixie routes' lengths from it.

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A garden's top left corner, and the side its pixie route markers stand on. */
interface GardenSpot extends Point {
  routes: 'right' | 'left' | 'below';
}

export type PropKind = 'well' | 'table' | 'cloth' | 'rocks' | 'jetty' | 'wall' | 'reeds';

/** Painted scenery: earth, paths, paving, water, bridges and small props; `blocks` are what the doctor can't walk through. */
export interface YardScenery {
  /** Compressed earth: work yards, as polygons. */
  earth: Point[][];
  /** Footpaths, as lines walked along. */
  paths: Point[][];
  /** Cobbled ground. */
  cobbles: Rect[];
  /** Water: a stream's straight run, or a pond or lake when `round`. */
  water: (Rect & { round?: boolean })[];
  bridges: Rect[];
  /** Small painted things: a well, beer garden tables, a drying line of dyed cloth, rocks, a jetty, a terrace's stone wall (to `to`) and reeds. */
  props: { kind: PropKind; x: number; y: number; to?: Point }[];
  /** Trees and bushes, by texture and where their foot stands. */
  plants: { key: string; x: number; y: number }[];
  blocks: Rect[];
}

/**
 * A shop's yard: its size (the fence stands `STREET_H` above its bottom), its gardens, the first and
 * second line's stations, the outfitter's and the study's signs, the guild's join marker and its shape,
 * the second line's sign, the storefront's left edge, where the doctor starts, and its scenery.
 */
interface YardPlan {
  w: number;
  h: number;
  gardens: GardenSpot[];
  line1: Point[];
  line2: Point[];
  outfitter: Point;
  study: Point;
  guild: Point & { shape: 'row' | 'grid' };
  line2Sign: Point;
  store: number;
  start: Point;
  scenery: YardScenery;
}

const tree = (n: number, x: number, y: number) => ({ key: `tree-${n % 3}`, x, y });
const bush = (n: number, x: number, y: number) => ({ key: `bush-${n % 2}`, x, y });
const pts = (...xy: number[]): Point[] => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[2 * i], y: xy[2 * i + 1] }));

/**
 * The yards. The bakery is a village green: gardens across the top, a line down either side, the
 * guild on the green and a duck pond by the shop. The chandlery climbs a hillside in terraces, its
 * lines stepping down to the shop. The dye house has a river between its gardens and its works,
 * crossed by three bridges. The smithy's woods and mines feed a cobbled forge yard in the middle.
 * The tavern's lines run around a lake.
 */
export const YARD_PLANS: Record<ShopId, YardPlan> = {
  bakery: {
    w: 1560,
    h: 1150,
    gardens: [
      { x: 90, y: 90, routes: 'below' },
      { x: 668, y: 90, routes: 'below' },
      { x: 1246, y: 90, routes: 'below' },
    ],
    line1: pts(240, 540, 240, 830),
    line2: pts(1320, 540, 1320, 830),
    outfitter: { x: 491, y: 130 },
    study: { x: 1069, y: 110 },
    guild: { x: 780, y: 470, shape: 'row' },
    line2Sign: { x: 1320, y: 640 },
    store: 630,
    start: { x: 330, y: 580 },
    scenery: {
      earth: [pts(70, 400, 410, 400, 410, 990, 70, 990), pts(1150, 400, 1490, 400, 1490, 990, 1150, 990)],
      paths: [
        pts(202, 366, 202, 400),
        pts(780, 330, 780, 385),
        pts(1358, 366, 1358, 400),
        pts(480, 385, 1080, 385, 1080, 590, 480, 590, 480, 385),
        pts(410, 490, 480, 490),
        pts(1080, 490, 1150, 490),
        pts(780, 590, 780, 620),
        pts(410, 700, 620, 700),
        pts(940, 700, 1150, 700),
      ],
      cobbles: [],
      water: [{ x: 975, y: 750, w: 180, h: 180, round: true }],
      bridges: [],
      props: [{ kind: 'well', x: 470, y: 870 }, { kind: 'reeds', x: 990, y: 770 }, { kind: 'reeds', x: 1130, y: 900 }],
      plants: [tree(0, 440, 330), tree(1, 1110, 470), bush(0, 560, 975), bush(1, 1500, 975), tree(2, 40, 970), tree(0, 1525, 640), bush(0, 1180, 390)],
      blocks: [{ x: 995, y: 770, w: 140, h: 140 }, { x: 455, y: 855, w: 30, h: 20 }],
    },
  },
  chandlery: {
    w: 1680,
    h: 1350,
    gardens: [
      { x: 60, y: 90, routes: 'right' },
      { x: 60, y: 300, routes: 'right' },
      { x: 60, y: 510, routes: 'right' },
    ],
    line1: pts(560, 230, 860, 430, 1160, 630),
    line2: pts(520, 650, 820, 850, 1120, 1030),
    outfitter: { x: 1200, y: 110 },
    study: { x: 1500, y: 110 },
    guild: { x: 230, y: 900, shape: 'grid' },
    line2Sign: { x: 820, y: 780 },
    store: 1340,
    start: { x: 650, y: 270 },
    scenery: {
      earth: [
        pts(400, 100, 760, 100, 1340, 500, 1340, 800, 980, 800, 400, 400),
        pts(370, 520, 700, 520, 1300, 900, 1300, 1190, 940, 1190, 370, 820),
        pts(1050, 70, 1640, 70, 1640, 400, 1050, 400),
        pts(80, 780, 380, 780, 380, 1070, 80, 1070),
      ],
      paths: [pts(1340, 400, 1340, 470, 1400, 520, 1490, 780)],
      cobbles: [],
      water: [],
      bridges: [],
      props: [
        { kind: 'wall', x: 420, y: 430, to: { x: 1000, y: 820 } },
        { kind: 'wall', x: 380, y: 840, to: { x: 940, y: 1200 } },
        { kind: 'rocks', x: 1520, y: 520 },
      ],
      plants: [tree(0, 930, 220), tree(1, 840, 150), bush(0, 1400, 420), bush(1, 1640, 420), tree(2, 110, 1190), tree(0, 330, 1180), bush(0, 620, 1180), tree(1, 1620, 680)],
      blocks: [],
    },
  },
  dyeHouse: {
    w: 1640,
    h: 1200,
    gardens: [
      { x: 40, y: 90, routes: 'right' },
      { x: 40, y: 330, routes: 'right' },
      { x: 40, y: 570, routes: 'right' },
    ],
    line1: pts(800, 230, 800, 530, 800, 830),
    line2: pts(1110, 230, 1110, 530, 1110, 830),
    outfitter: { x: 180, y: 830 },
    study: { x: 430, y: 790 },
    guild: { x: 1450, y: 200, shape: 'grid' },
    line2Sign: { x: 1110, y: 480 },
    store: 1300,
    start: { x: 890, y: 270 },
    scenery: {
      earth: [pts(650, 80, 1620, 80, 1620, 1040, 650, 1040), pts(20, 780, 520, 780, 520, 1040, 20, 1040)],
      paths: [pts(360, 165, 700, 165), pts(360, 515, 700, 515), pts(330, 875, 700, 875)],
      cobbles: [],
      water: [{ x: 540, y: 0, w: 80, h: 1120 }],
      bridges: [{ x: 532, y: 130, w: 96, h: 70 }, { x: 532, y: 480, w: 96, h: 70 }, { x: 532, y: 840, w: 96, h: 70 }],
      props: [
        { kind: 'cloth', x: 1450, y: 500 },
        { kind: 'reeds', x: 530, y: 300 },
        { kind: 'reeds', x: 630, y: 700 },
        { kind: 'reeds', x: 530, y: 1000 },
      ],
      plants: [tree(0, 470, 120), tree(1, 450, 680), bush(0, 1600, 640), bush(1, 1300, 640)],
      blocks: [
        { x: 540, y: 0, w: 80, h: 130 },
        { x: 540, y: 200, w: 80, h: 280 },
        { x: 540, y: 550, w: 80, h: 290 },
        { x: 540, y: 910, w: 80, h: 210 },
      ],
    },
  },
  smithy: {
    w: 1700,
    h: 1250,
    gardens: [
      { x: 60, y: 90, routes: 'right' },
      { x: 1416, y: 90, routes: 'left' },
      { x: 1416, y: 760, routes: 'left' },
    ],
    line1: pts(560, 260, 1130, 260, 845, 560),
    line2: pts(500, 580, 1180, 570, 845, 880),
    outfitter: { x: 520, y: 900 },
    study: { x: 1160, y: 800 },
    guild: { x: 845, y: 130, shape: 'grid' },
    line2Sign: { x: 845, y: 830 },
    store: 60,
    start: { x: 650, y: 300 },
    scenery: {
      earth: [pts(400, 120, 1300, 120, 1300, 1080, 400, 1080), pts(1290, 300, 1680, 300, 1680, 1080, 1290, 1080)],
      paths: [pts(210, 280, 210, 700)],
      cobbles: [{ x: 690, y: 430, w: 310, h: 640 }],
      water: [],
      bridges: [],
      props: [
        { kind: 'rocks', x: 1500, y: 400 },
        { kind: 'rocks', x: 1600, y: 560 },
        { kind: 'rocks', x: 1380, y: 640 },
        { kind: 'well', x: 1010, y: 1060 },
      ],
      plants: [tree(0, 80, 400), tree(1, 210, 450), tree(2, 120, 560), tree(0, 300, 380), tree(1, 250, 640), bush(0, 60, 680), bush(1, 30, 300), bush(0, 360, 300)],
      blocks: [{ x: 995, y: 1045, w: 30, h: 20 }],
    },
  },
  tavern: {
    w: 1720,
    h: 1250,
    gardens: [
      { x: 60, y: 90, routes: 'right' },
      { x: 60, y: 330, routes: 'right' },
      { x: 60, y: 570, routes: 'right' },
    ],
    line1: pts(600, 230, 900, 230, 1200, 230),
    line2: pts(600, 880, 900, 880, 1200, 880),
    outfitter: { x: 1530, y: 450 },
    study: { x: 217, y: 820 },
    guild: { x: 1530, y: 200, shape: 'grid' },
    line2Sign: { x: 900, y: 800 },
    store: 1380,
    start: { x: 690, y: 270 },
    scenery: {
      earth: [pts(440, 80, 1360, 80, 1360, 420, 440, 420), pts(440, 760, 1360, 760, 1360, 1080, 440, 1080), pts(1370, 80, 1700, 80, 1700, 700, 1370, 700)],
      paths: [pts(420, 420, 420, 760), pts(1340, 420, 1340, 760)],
      cobbles: [],
      water: [{ x: 500, y: 450, w: 800, h: 280, round: true }],
      bridges: [],
      props: [
        { kind: 'jetty', x: 900, y: 690 },
        { kind: 'table', x: 1460, y: 650 },
        { kind: 'table', x: 1610, y: 650 },
        { kind: 'reeds', x: 540, y: 520 },
        { kind: 'reeds', x: 1250, y: 660 },
      ],
      plants: [tree(0, 60, 1090), tree(1, 380, 1090), bush(0, 1380, 1090), tree(2, 410, 330), bush(1, 470, 760)],
      blocks: [{ x: 540, y: 480, w: 720, h: 220 }],
    },
  },
};

export const SHOP_HUD = 44;
/** The street and the counter's front below the fence. */
const STREET_H = 150;
const BED = { w: 56, h: 44 };
/** Beds a garden has in a row; `BEDS` of them make it four by four. */
const BED_COLS = 4;
const GARDEN = { w: BED_COLS * BED.w, h: (BEDS / BED_COLS) * BED.h };
/** How far a station's drop and pick-up markers stand from it, and its purple markers, whose captions are wider. */
const MARKER_GAP = 62;
const COINS_GAP = 92;
/** A row's drop, work and pick-up markers stand this far above it, its purple markers this far below. */
const HANDS_DY = 84;
const COINS_DY = 104;
/** The storefront: a room this big, its counter along the fence. */
const STORE = { w: 300, h: 330 };
/** Its drop, level and hire markers stand outside its back wall, this far above it and apart. */
const STORE_YARD_DY = 70;
const STORE_MARKER_GAP = 92;

const plan = (id: ShopId) => YARD_PLANS[id];

/** The size of a shop's yard. */
export const shopWorld = (id: ShopId) => ({ w: plan(id).w, h: plan(id).h });

/** Where the doctor's side of the yard ends: below it are the counter's front and the street. */
export const shopFence = (id: ShopId) => plan(id).h - STREET_H;

/** The yard's scenery: the yard texture paints it, `ShopScene` plants the trees and walls off the blocks. */
export const yardScenery = (id: ShopId) => plan(id).scenery;

/** Where the doctor first stands in the yard. */
export const shopStart = (id: ShopId) => plan(id).start;

/** A garden's beds and sign, and the spots of its pixie routes' markers and where their pixies set off. */
export function gardenLayout(id: ShopId, g: number) {
  const { x, y, routes } = plan(id).gardens[g];
  const area = { x, y, w: GARDEN.w, h: GARDEN.h };
  const sign = { x: x + GARDEN.w / 2, y: y - 16 };
  if (routes === 'below') {
    // Its route markers stand below it, side by side, and pixies set off from its bottom edge.
    const below = y + GARDEN.h + 44;
    return { area, sign, route: { x: x + GARDEN.w / 2 - 50, y: below }, route2: { x: x + GARDEN.w / 2 + 50, y: below }, routeStart: { x: x + GARDEN.w / 2, y: y + GARDEN.h + 4 } };
  }
  const right = routes === 'right';
  const mx = right ? x + GARDEN.w + 44 : x - 44;
  return {
    area,
    sign,
    route: { x: mx, y: y + 50 },
    /** The second line's route marker, under the first's. */
    route2: { x: mx, y: y + 120 },
    routeStart: { x: right ? x + GARDEN.w + 8 : x - 8, y: y + GARDEN.h / 2 - 20 },
  };
}

/**
 * The market: the outfitter's sign with its pack, boots and sickle markers in a row below, and the
 * study's sign and desk with its two lessons and, below them, the marker for the next recipe it teaches.
 */
export function marketLayout(id: ShopId) {
  const { outfitter: o, study: s } = plan(id);
  return {
    outfitter: o,
    gear: { pack: { x: o.x - 90, y: o.y + 50 }, boots: { x: o.x, y: o.y + 50 }, sickle: { x: o.x + 90, y: o.y + 50 } },
    study: s,
    desk: { x: s.x, y: s.y + 38 },
    lessons: { craftOrder: { x: s.x - 55, y: s.y + 112 }, priceSigns: { x: s.x + 55, y: s.y + 112 } },
    recipe: { x: s.x, y: s.y + 200 },
  };
}

/** Where a bed's middle is: beds go row by row, `BED_COLS` to a row, in their garden. */
export function bedPosition(id: ShopId, bed: number): Point {
  const { x, y } = plan(id).gardens[Math.floor(bed / BEDS)];
  const i = bed % BEDS;
  return { x: x + (i % BED_COLS) * BED.w + BED.w / 2, y: y + Math.floor(i / BED_COLS) * BED.h + BED.h / 2 };
}

/** A station and its markers: drop, work and pick up north of it, its level, workers and pixies below. */
export function stationLayout(id: ShopId, station: string) {
  const i = SHOPS[id].stations.findIndex((s) => s.id === line1Id(station));
  const { x, y } = (isLine2(station) ? plan(id).line2 : plan(id).line1)[i];
  return {
    at: { x, y },
    drop: { x: x - MARKER_GAP, y: y - HANDS_DY },
    work: { x, y: y - HANDS_DY },
    pickUp: { x: x + MARKER_GAP, y: y - HANDS_DY },
    label: { x, y: y + 46 },
    /** Its "First:" sign, under its name, once the crafting order is learned. */
    priority: { x, y: y + 72 },
    level: { x: x - COINS_GAP, y: y + COINS_DY },
    hire: { x, y: y + COINS_DY },
    route: { x: x + COINS_GAP, y: y + COINS_DY },
    /** Where its in and out goods stand, one under the other. */
    stockIn: (k: number): Point => ({ x: x - 112, y: y - 22 + k * 26 }),
    stockOut: (k: number): Point => ({ x: x + 106, y: y - 22 + k * 26 }),
    /** Where its workers stand, either side of it, their feet on this spot. */
    workers: (k: number): Point => ({ x: x + (k === 0 ? -60 : 60), y: y + 22 }),
  };
}

/**
 * The storefront: its floor, the shelves along its back wall, the counter along the fence and the
 * places in front of it. Its drop, level and hire markers stand in the yard outside its back wall,
 * as the apothecary's do outside its north door.
 */
export function counterLayout(id: ShopId) {
  const left = plan(id).store;
  const cx = left + STORE.w / 2;
  const fence = shopFence(id);
  const top = fence + 40 - STORE.h;
  const sells = Object.keys(SHOPS[id].sells) as GoodId[];
  const gap = sells.length > 2 ? 70 : 84;
  const shelfX = (good: GoodId) => cx + (sells.indexOf(good) - (sells.length - 1) / 2) * gap;
  const shelfY = top + 50;
  return {
    floor: { x: left, y: top, w: STORE.w, h: STORE.h },
    sign: { x: cx, y: top - 2 },
    shelf: (good: GoodId): Point => ({ x: shelfX(good), y: shelfY }),
    /** Each shelf's price sign, under its price, once the price signs are learned. */
    priceSign: (good: GoodId): Point => ({ x: shelfX(good), y: shelfY + 78 }),
    /** Where the shelves' pixies bring their goods. */
    shelves: { x: cx, y: shelfY + 32 },
    level: { x: cx - STORE_MARKER_GAP, y: top - STORE_YARD_DY },
    hire: { x: cx + STORE_MARKER_GAP, y: top - STORE_YARD_DY },
    /** The drop marker that stocks the shelves, outside the back wall; serving and the till are at the counter. */
    drop: { x: cx, y: top - STORE_YARD_DY },
    work: { x: cx - 110, y: fence - 124 },
    till: { x: cx + 110, y: fence - 124 },
    counter: { x: cx, y: fence - 40 },
    place: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 72, y: fence + 36 }),
    street: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 30, y: plan(id).h + 30 }),
    /** Where the shopkeepers stand behind the counter, their feet on this spot. */
    shopkeepers: (k: number): Point => ({ x: cx + (k === 0 ? 40 : -40), y: fence - 62 }),
  };
}

/**
 * The guild: its sign, the marker to join it and, once joined, its seven upgrades in a `row` or in a
 * `grid` of rows of three, the last row's centred.
 */
export function guildLayout(id: ShopId) {
  const { x, y, shape } = plan(id).guild;
  const upgrade = (u: ShopGuild): Point => {
    const i = SHOP_GUILD.indexOf(u);
    if (shape === 'row') return { x: x + (i - (SHOP_GUILD.length - 1) / 2) * 90, y };
    const row = Math.floor(i / 3), inRow = Math.min(3, SHOP_GUILD.length - row * 3);
    return { x: x + ((i % 3) - (inRow - 1) / 2) * 92, y: y + row * 90 };
  };
  return { sign: { x, y: y - 48 }, join: shape === 'row' ? { x, y } : { x, y: y + 45 }, upgrade };
}

/** The second line's sign and the marker that buys it, where its stations will stand, until it is bought. */
export function line2Layout(id: ShopId) {
  const { x, y } = plan(id).line2Sign;
  return { sign: { x, y }, buy: { x, y: y + 50 } };
}

/** A pixie route's flight: from below its source's out goods to above its target's in goods, or the shelves. */
export function routePath(id: ShopId, route: RouteDef): [Point, Point] {
  const end = (e: RouteEnd, from: boolean): Point => {
    if (e === 'shelf') return counterLayout(id).shelves;
    if ('garden' in e) return gardenLayout(id, e.garden).routeStart;
    const s = stationLayout(id, e.station);
    return from ? { x: s.stockOut(0).x + 4, y: s.at.y - 44 } : { x: s.stockIn(0).x + 4, y: s.at.y - 44 };
  };
  return [end(route.from, true), end(route.to, false)];
}

/** How many milliseconds a pixie takes along a route, at `speed` pixels a second. */
export function routeMs(id: ShopId, route: RouteDef, speed: number) {
  const [a, b] = routePath(id, route);
  return (Math.hypot(b.x - a.x, b.y - a.y) / speed) * 1000;
}
