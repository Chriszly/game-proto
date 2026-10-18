import { BEDS, MAX_SHOP_PLACES, SHOPS, SHOP_GUILD, isLine2, line1Id, type GoodId, type RouteDef, type RouteEnd, type ShopGuild, type ShopId } from '../game/town';

// Where everything stands in a town shop's yard, worked out from its `ShopDef`: its gardens stacked
// at the left, its market (the outfitter and the study) right of them, its stations in a row along `LINE_Y`, the guild
// under them, the second line's stations in a row along `LINE2_Y` below that, and the shop at the right, open to the street
// along the bottom. The doctor stays above `FENCE_Y`; customers come up from the street below it to
// the front of the counter. Phaser-free, since the sim reads the pixie routes' lengths from it.

export interface Point {
  x: number;
  y: number;
}

export const SHOP_HUD = 44;
export const SHOP_WORLD_H = 1010;
/** The doctor's side of the yard ends here; the counter's front and the street are below it. */
export const FENCE_Y = 860;
/** The row the stations stand in. */
export const LINE_Y = 270;
/** The row the second line's stations stand in, below the guild. */
export const LINE2_Y = 690;
const GARDEN_X = 60;
const BED = { w: 56, h: 44 };
const STATION_X = 700;
const STATION_GAP = 300;
/** How far a station's drop, work and pick-up markers, and its purple markers, stand from it. */
const MARKER_GAP = 62;
/** A row's drop, work and pick-up markers stand this far above it, its purple markers this far below. */
const HANDS_DY = 84;
const COINS_DY = 104;
const SHOP_W = 300;

const gardenTop = (g: number) => 90 + g * 160;
const stationX = (i: number) => STATION_X + i * STATION_GAP;
const shopLeft = (id: ShopId) => stationX(SHOPS[id].stations.length) - 40;

export const shopWorld = (id: ShopId) => ({ w: shopLeft(id) + SHOP_W + 60, h: SHOP_WORLD_H });

/** A garden's beds and sign, and the spot of its pixie route's marker. */
export function gardenLayout(g: number) {
  const top = gardenTop(g);
  return {
    area: { x: GARDEN_X, y: top, w: 3 * BED.w, h: 3 * BED.h },
    sign: { x: GARDEN_X + 1.5 * BED.w, y: top - 16 },
    route: { x: GARDEN_X + 3 * BED.w + 44, y: top + 36 },
    /** The second line's route marker, under the first's. */
    route2: { x: GARDEN_X + 3 * BED.w + 44, y: top + 102 },
    routeStart: { x: GARDEN_X + 3 * BED.w + 8, y: top + 1.5 * BED.h - 20 },
  };
}

/**
 * The market between the gardens and the first station: the outfitter's sign with its pack, boots
 * and sickle markers in a row below, and under it the study's sign and desk with its two lessons
 * and, below them, the marker for the next recipe it teaches.
 */
export const MARKET = {
  outfitter: { x: 455, y: 100 },
  gear: { pack: { x: 365, y: 150 }, boots: { x: 455, y: 150 }, sickle: { x: 545, y: 150 } },
  study: { x: 455, y: 262 },
  desk: { x: 455, y: 300 },
  lessons: { craftOrder: { x: 400, y: 374 }, priceSigns: { x: 510, y: 374 } },
  recipe: { x: 455, y: 470 },
} as const;

/** Where a bed's middle is: beds go row by row, three to a row, gardens one under the other. */
export function bedPosition(bed: number): Point {
  const g = Math.floor(bed / BEDS), i = bed % BEDS;
  const top = gardenTop(g);
  return { x: GARDEN_X + (i % 3) * BED.w + BED.w / 2, y: top + Math.floor(i / 3) * BED.h + BED.h / 2 };
}

/**
 * A station and its markers: drop, work and pick up north of it, its level, workers and pixies
 * below. A second-line station stands under its first-line twin, in the row along `LINE2_Y`.
 */
export function stationLayout(id: ShopId, station: string) {
  const i = SHOPS[id].stations.findIndex((s) => s.id === line1Id(station));
  const x = stationX(i);
  const y = isLine2(station) ? LINE2_Y : LINE_Y;
  return {
    at: { x, y },
    drop: { x: x - MARKER_GAP, y: y - HANDS_DY },
    work: { x, y: y - HANDS_DY },
    pickUp: { x: x + MARKER_GAP, y: y - HANDS_DY },
    label: { x, y: y + 46 },
    /** Its "First:" sign, under its name, once the crafting order is learned. */
    priority: { x, y: y + 72 },
    level: { x: x - MARKER_GAP, y: y + COINS_DY },
    hire: { x, y: y + COINS_DY },
    route: { x: x + MARKER_GAP, y: y + COINS_DY },
    /** Where its in and out goods stand, one under the other. */
    stockIn: (k: number): Point => ({ x: x - 112, y: y - 22 + k * 26 }),
    stockOut: (k: number): Point => ({ x: x + 106, y: y - 22 + k * 26 }),
    /** Where its workers stand, either side of it, their feet on this spot. */
    workers: (k: number): Point => ({ x: x + (k === 0 ? -60 : 60), y: y + 22 }),
  };
}

/** The shop at the right: its floor, the shelves along its back, the counter and the places in front of it. */
export function counterLayout(id: ShopId) {
  const left = shopLeft(id);
  const cx = left + SHOP_W / 2;
  const sells = Object.keys(SHOPS[id].sells) as GoodId[];
  const gap = sells.length > 2 ? 70 : 84;
  const shelfX = (good: GoodId) => cx + (sells.indexOf(good) - (sells.length - 1) / 2) * gap;
  return {
    floor: { x: left, y: 110, w: SHOP_W, h: FENCE_Y + 40 - 110 },
    sign: { x: cx, y: 96 },
    shelf: (good: GoodId): Point => ({ x: shelfX(good), y: 168 }),
    /** Each shelf's price sign, under its price, once the price signs are learned. */
    priceSign: (good: GoodId): Point => ({ x: shelfX(good), y: 246 }),
    level: { x: cx - 64, y: 330 },
    hire: { x: cx + 64, y: 330 },
    /** The drop marker that stocks the shelves, under them; serving and the till are at the counter. */
    drop: { x: cx, y: 452 },
    work: { x: cx - 64, y: FENCE_Y - 118 },
    till: { x: cx + 64, y: FENCE_Y - 118 },
    counter: { x: cx, y: FENCE_Y - 40 },
    place: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 72, y: FENCE_Y + 36 }),
    street: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 30, y: SHOP_WORLD_H + 30 }),
    shopkeeper: { x: cx + 40, y: FENCE_Y - 62 },
  };
}

/**
 * The guild, under the first two stations: its sign, the marker to join it and, once joined, a
 * row of its six upgrades.
 */
export function guildLayout(id: ShopId) {
  const cx = (stationX(0) + stationX(Math.min(1, SHOPS[id].stations.length - 1))) / 2;
  const y = 492;
  return {
    sign: { x: cx, y: y - 48 },
    join: { x: cx, y },
    upgrade: (u: ShopGuild): Point => ({ x: cx + (SHOP_GUILD.indexOf(u) - (SHOP_GUILD.length - 1) / 2) * 90, y }),
  };
}

/** The second line's sign and the marker that buys it, in the middle of its row until it is bought. */
export function line2Layout(id: ShopId) {
  const cx = (stationX(0) + stationX(SHOPS[id].stations.length - 1)) / 2;
  return { sign: { x: cx, y: LINE2_Y - 40 }, buy: { x: cx, y: LINE2_Y + 10 } };
}

/** A pixie route's flight: from below its source's out goods to above its target's in goods, or the shelves. */
export function routePath(id: ShopId, route: RouteDef): [Point, Point] {
  const end = (e: RouteEnd, from: boolean): Point => {
    if (e === 'shelf') return { x: counterLayout(id).sign.x, y: 200 };
    if ('garden' in e) return gardenLayout(e.garden).routeStart;
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
