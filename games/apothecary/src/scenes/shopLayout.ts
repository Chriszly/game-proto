import { BEDS, MAX_SHOP_PLACES, SHOPS, SHOP_GUILD, isLine2, line1Id, type GoodId, type RouteDef, type RouteEnd, type ShopGuild, type ShopId } from '../game/town';

// Where everything stands in a town shop's yard, worked out from its `ShopDef` and its `YardPlan`:
// its gardens (stacked at one side, or side by side along the top), its market (the outfitter and
// the study), its stations in two rows with the guild between them, and a small storefront at the
// end of the rows, open to the street along the bottom. Each shop has its own plan, so no two yards
// look alike. The doctor stays above the fence; customers come up from the street below it to the
// front of the counter. Phaser-free, since the sim reads the pixie routes' lengths from it.

export interface Point {
  x: number;
  y: number;
}

/**
 * How a shop's yard is laid out: `mirror` puts the gardens at the right and the storefront at the
 * left; `gardens` stacks them in a `column` at the side or sets them in a `row` along the top (the
 * rest of the yard then moves down); `lines` puts the first line in the `top` row or the `bottom`
 * one, next to the street.
 */
export interface YardPlan {
  mirror: boolean;
  gardens: 'column' | 'row';
  lines: 'top' | 'bottom';
}

export const YARD_PLANS: Record<ShopId, YardPlan> = {
  bakery: { mirror: false, gardens: 'column', lines: 'top' },
  chandlery: { mirror: true, gardens: 'column', lines: 'top' },
  dyeHouse: { mirror: false, gardens: 'row', lines: 'top' },
  smithy: { mirror: true, gardens: 'row', lines: 'bottom' },
  tavern: { mirror: false, gardens: 'column', lines: 'bottom' },
};

export const SHOP_HUD = 44;
const WORLD_H = 1010;
/** The doctor's side of the yard ends here, before a `row` plan moves it down; the counter's front and the street are below it. */
const FENCE_Y = 860;
/** The rows the stations stand in, with the guild between them, before a `row` plan moves them down. */
const TOP_ROW_Y = 270;
const BOTTOM_ROW_Y = 690;
const GUILD_Y = 492;
/** How far a `row` plan moves everything but its gardens down. */
const ROW_DROP = 270;
const BED = { w: 56, h: 44 };
/** Beds a garden has in a row; `BEDS` of them make it four by four. */
const BED_COLS = 4;
const GARDEN = { x: 40, top: 90, w: BED_COLS * BED.w, h: (BEDS / BED_COLS) * BED.h };
/** A `column` plan's gardens stand this far apart, one under the other; a `row` plan's side by side. */
const GARDEN_STEP = { column: GARDEN.h + 36, row: GARDEN.w + 56 };
/** Where the first station stands, after a `column` plan's gardens and market or a `row` plan's market. */
const STATION_X = { column: 790, row: 470 };
const STATION_GAP = 300;
/** How far a station's drop and pick-up markers stand from it, and its purple markers, whose captions are wider. */
const MARKER_GAP = 62;
const COINS_GAP = 92;
/** A row's drop, work and pick-up markers stand this far above it, its purple markers this far below. */
const HANDS_DY = 84;
const COINS_DY = 104;
/** The storefront: a room this big at the end of the rows, its counter along the fence. */
const STORE = { w: 300, h: 330 };
/** Its drop, level and hire markers stand outside its back wall, this far above it and apart. */
const STORE_YARD_DY = 70;
const STORE_MARKER_GAP = 92;

const plan = (id: ShopId) => YARD_PLANS[id];
const drop = (id: ShopId) => (plan(id).gardens === 'row' ? ROW_DROP : 0);
const stationX = (id: ShopId, i: number) => STATION_X[plan(id).gardens] + i * STATION_GAP;
const storeLeft = (id: ShopId) => stationX(id, SHOPS[id].stations.length - 1) + 170;
const fenceY = (id: ShopId) => FENCE_Y + drop(id);

/** The size of a shop's yard. */
export const shopWorld = (id: ShopId) => ({ w: storeLeft(id) + STORE.w + 40, h: WORLD_H + drop(id) });

/** Where the doctor's side of the yard ends: below it are the counter's front and the street. */
export const shopFence = (id: ShopId) => fenceY(id);

/**
 * Turns a layout worked out with the gardens at the left into the plan's own: mirrored left to
 * right when the plan says so, points and rectangles alike, in nested objects and in what functions
 * return.
 */
function placed<T>(id: ShopId, layout: T): T {
  if (!plan(id).mirror) return layout;
  const { w } = shopWorld(id);
  const flip = (v: unknown): unknown => {
    if (typeof v === 'function') return (...args: unknown[]) => flip((v as (...a: unknown[]) => unknown)(...args));
    if (!v || typeof v !== 'object') return v;
    const o = v as Record<string, unknown>;
    if (typeof o.x === 'number') return { ...o, x: typeof o.w === 'number' ? w - o.x - o.w : w - o.x };
    return Object.fromEntries(Object.entries(o).map(([k, inner]) => [k, flip(inner)]));
  };
  return flip(layout) as T;
}

/** A garden's top left corner, before mirroring. */
function gardenAt(id: ShopId, g: number): Point {
  return plan(id).gardens === 'row' ? { x: GARDEN.x + g * GARDEN_STEP.row, y: GARDEN.top } : { x: GARDEN.x, y: GARDEN.top + g * GARDEN_STEP.column };
}

/** A garden's beds and sign, and the spots of its pixie routes' markers and where their pixies set off. */
export function gardenLayout(id: ShopId, g: number) {
  const { x, y } = gardenAt(id, g);
  const area = { x, y, w: GARDEN.w, h: GARDEN.h };
  const sign = { x: x + GARDEN.w / 2, y: y - 16 };
  if (plan(id).gardens === 'row') {
    // Its route markers stand below it, side by side, and pixies set off from its bottom edge.
    const below = y + GARDEN.h + 44;
    return placed(id, { area, sign, route: { x: x + GARDEN.w / 2 - 50, y: below }, route2: { x: x + GARDEN.w / 2 + 50, y: below }, routeStart: { x: x + GARDEN.w / 2, y: y + GARDEN.h + 4 } });
  }
  return placed(id, {
    area,
    sign,
    route: { x: x + GARDEN.w + 44, y: y + 50 },
    /** The second line's route marker, under the first's. */
    route2: { x: x + GARDEN.w + 44, y: y + 120 },
    routeStart: { x: x + GARDEN.w + 8, y: y + GARDEN.h / 2 - 20 },
  });
}

/**
 * The market: the outfitter's sign with its pack, boots and sickle markers in a row below, and
 * under it the study's sign and desk with its two lessons and, below them, the marker for the next
 * recipe it teaches. It stands between a `column` plan's gardens and its first station, or under
 * the first gardens of a `row` plan.
 */
export function marketLayout(id: ShopId) {
  const x = plan(id).gardens === 'row' ? 160 : 535;
  const dy = drop(id);
  return placed(id, {
    outfitter: { x, y: 100 + dy },
    gear: { pack: { x: x - 90, y: 150 + dy }, boots: { x, y: 150 + dy }, sickle: { x: x + 90, y: 150 + dy } },
    study: { x, y: 262 + dy },
    desk: { x, y: 300 + dy },
    lessons: { craftOrder: { x: x - 55, y: 374 + dy }, priceSigns: { x: x + 55, y: 374 + dy } },
    recipe: { x, y: 470 + dy },
  });
}

/** Where a bed's middle is: beds go row by row, `BED_COLS` to a row, in their garden. */
export function bedPosition(id: ShopId, bed: number): Point {
  const g = Math.floor(bed / BEDS), i = bed % BEDS;
  const { x, y } = gardenAt(id, g);
  return placed(id, { x: x + (i % BED_COLS) * BED.w + BED.w / 2, y: y + Math.floor(i / BED_COLS) * BED.h + BED.h / 2 });
}

/** The y of a line's row: the first line's in the plan's row, the second's in the other. */
function rowY(id: ShopId, line2: boolean) {
  const top = (plan(id).lines === 'top') !== line2;
  return (top ? TOP_ROW_Y : BOTTOM_ROW_Y) + drop(id);
}

/**
 * A station and its markers: drop, work and pick up north of it, its level, workers and pixies
 * below. A second-line station stands in the other row from its first-line twin.
 */
export function stationLayout(id: ShopId, station: string) {
  const i = SHOPS[id].stations.findIndex((s) => s.id === line1Id(station));
  const x = stationX(id, i);
  const y = rowY(id, isLine2(station));
  return placed(id, {
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
  });
}

/**
 * The storefront at the end of the rows: its floor, the shelves along its back wall, the counter
 * along the fence and the places in front of it. Its drop, level and hire markers stand in the
 * yard outside its back wall, as the apothecary's do outside its north door.
 */
export function counterLayout(id: ShopId) {
  const left = storeLeft(id);
  const cx = left + STORE.w / 2;
  const fence = fenceY(id);
  const top = fence + 40 - STORE.h;
  const sells = Object.keys(SHOPS[id].sells) as GoodId[];
  const gap = sells.length > 2 ? 70 : 84;
  const shelfX = (good: GoodId) => cx + (sells.indexOf(good) - (sells.length - 1) / 2) * gap;
  const shelfY = top + 50;
  return placed(id, {
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
    work: { x: cx - 110, y: fence - 110 },
    till: { x: cx + 110, y: fence - 110 },
    counter: { x: cx, y: fence - 40 },
    place: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 72, y: fence + 36 }),
    street: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 30, y: shopWorld(id).h + 30 }),
    /** Where the shopkeepers stand behind the counter, their feet on this spot. */
    shopkeepers: (k: number): Point => ({ x: cx + (k === 0 ? 40 : -40), y: fence - 62 }),
  });
}

/**
 * The guild, between the rows under the first two stations: its sign, the marker to join it and,
 * once joined, a row of its six upgrades.
 */
export function guildLayout(id: ShopId) {
  const cx = (stationX(id, 0) + stationX(id, Math.min(1, SHOPS[id].stations.length - 1))) / 2;
  const y = GUILD_Y + drop(id);
  return placed(id, {
    sign: { x: cx, y: y - 48 },
    join: { x: cx, y },
    upgrade: (u: ShopGuild): Point => ({ x: cx + (SHOP_GUILD.indexOf(u) - (SHOP_GUILD.length - 1) / 2) * 90, y }),
  });
}

/** The second line's sign and the marker that buys it, in the middle of its row until it is bought. */
export function line2Layout(id: ShopId) {
  const cx = (stationX(id, 0) + stationX(id, SHOPS[id].stations.length - 1)) / 2;
  const y = rowY(id, true);
  return placed(id, { sign: { x: cx, y: y - 40 }, buy: { x: cx, y: y + 10 } });
}

/** Where the yard's earth is painted, from the gardens to the far end, above the fence. */
export function yardGround(id: ShopId) {
  const { w } = shopWorld(id);
  const fence = fenceY(id);
  const left = plan(id).gardens === 'row' ? 20 : GARDEN.x + GARDEN.w + 20;
  const top = plan(id).gardens === 'row' ? GARDEN.top + GARDEN.h + 20 : SHOP_HUD + 70;
  return placed(id, { x: left, y: top, w: w - 20 - left, h: fence - 10 - top });
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
