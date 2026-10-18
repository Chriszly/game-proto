import { BEDS, MAX_SHOP_PLACES, SHOPS, SHOP_GUILD, type GoodId, type RouteDef, type RouteEnd, type ShopGuild, type ShopId } from '../game/town';

// Where everything stands in a town shop's yard, worked out from its `ShopDef`: its gardens stacked
// at the left, its market (the outfitter and the study) right of them, its stations in a row along `LINE_Y`, and the shop at the right, open to the street
// along the bottom. The doctor stays above `FENCE_Y`; customers come up from the street below it to
// the front of the counter. Phaser-free, since the sim reads the pixie routes' lengths from it.

export interface Point {
  x: number;
  y: number;
}

export const SHOP_HUD = 44;
export const SHOP_WORLD_H = 720;
/** The doctor's side of the yard ends here; the counter's front and the street are below it. */
export const FENCE_Y = 570;
/** The row the stations stand in. */
export const LINE_Y = 270;
const GARDEN_X = 60;
const BED = { w: 56, h: 44 };
const STATION_X = 700;
const STATION_GAP = 300;
/** How far a station's drop, work and pick-up markers, and its purple markers, stand from it. */
const MARKER_GAP = 62;
const HANDS_Y = LINE_Y - 84;
const COINS_Y = LINE_Y + 104;
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
    route: { x: GARDEN_X + 3 * BED.w + 44, y: top + 1.5 * BED.h },
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

/** A station and its markers: drop, work and pick up north of it, its level, workers and pixies below. */
export function stationLayout(id: ShopId, station: string) {
  const i = SHOPS[id].stations.findIndex((s) => s.id === station);
  const x = stationX(i);
  return {
    at: { x, y: LINE_Y },
    drop: { x: x - MARKER_GAP, y: HANDS_Y },
    work: { x, y: HANDS_Y },
    pickUp: { x: x + MARKER_GAP, y: HANDS_Y },
    label: { x, y: LINE_Y + 46 },
    /** Its "First:" sign, under its name, once the crafting order is learned. */
    priority: { x, y: LINE_Y + 72 },
    level: { x: x - MARKER_GAP, y: COINS_Y },
    hire: { x, y: COINS_Y },
    route: { x: x + MARKER_GAP, y: COINS_Y },
    /** Where its in and out goods stand, one under the other. */
    stockIn: (k: number): Point => ({ x: x - 112, y: LINE_Y - 22 + k * 26 }),
    stockOut: (k: number): Point => ({ x: x + 106, y: LINE_Y - 22 + k * 26 }),
    /** Where its workers stand, either side of it, their feet on this spot. */
    workers: (k: number): Point => ({ x: x + (k === 0 ? -60 : 60), y: LINE_Y + 22 }),
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
    drop: { x: cx - 92, y: 452 },
    work: { x: cx, y: 452 },
    till: { x: cx + 92, y: 452 },
    counter: { x: cx, y: 530 },
    place: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 72, y: 606 }),
    street: (spot: number): Point => ({ x: cx + (spot - (MAX_SHOP_PLACES - 1) / 2) * 30, y: SHOP_WORLD_H + 30 }),
    shopkeeper: { x: cx + 40, y: 508 },
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

/** A pixie route's flight: from below its source's out goods to above its target's in goods, or the shelves. */
export function routePath(id: ShopId, route: RouteDef): [Point, Point] {
  const end = (e: RouteEnd, from: boolean): Point => {
    if (e === 'shelf') return { x: counterLayout(id).sign.x, y: 200 };
    if ('garden' in e) return gardenLayout(e.garden).routeStart;
    const s = stationLayout(id, e.station);
    return from ? { x: s.stockOut(0).x + 4, y: LINE_Y - 44 } : { x: s.stockIn(0).x + 4, y: LINE_Y - 44 };
  };
  return [end(route.from, true), end(route.to, false)];
}

/** How many milliseconds a pixie takes along a route, at `speed` pixels a second. */
export function routeMs(id: ShopId, route: RouteDef, speed: number) {
  const [a, b] = routePath(id, route);
  return (Math.hypot(b.x - a.x, b.y - a.y) / speed) * 1000;
}
