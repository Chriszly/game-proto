import { expect, test, type Page } from '@playwright/test';

// Plays one round of the loop with real inputs (clicks to walk, as on a phone): open and close the
// recipes, harvest both gardens, refine, brew, sell potions to a customer and collect the coins.
// Game state is only read, through the `game` object the dev build puts on window.

type Point = { x: number; y: number };
type ItemId = string;
interface GameState {
  coins: number;
  carrying: ItemId[];
  plots: { plant: string; grown: number }[];
  refiner: { queue: ItemId[]; output: ItemId[] };
  cauldron: { contents: ItemId[]; brewing: { out: ItemId } | null; output: ItemId[] };
  refiner2: { queue: ItemId[]; output: ItemId[] };
  cauldron2: { contents: ItemId[]; brewing: unknown; output: ItemId[] };
  expansion: Record<'land' | 'refiner' | 'cauldron', { built: boolean; paid: number }> & { fields: { built: boolean; paid: number }[] };
  counter: { shelf: ItemId[]; till: number };
  upgrades: Record<string, { level: number; paid: number }>;
  craftsmen: Record<string, { level: number; paid: number }>;
  orders: { id: number; wants: ItemId[]; pay: Record<string, number>; patience: number }[];
  nextOrderId: number;
  belts: Record<string, { built: boolean; paid: number; items: { id: ItemId; at: number }[] }>;
}

// Floor spots in the 1200x880 world, from src/scenes/layout.ts. Walking targets the doctor's feet.
// The world is bigger than the 960x540 view; the camera follows the doctor.
const VIEW = { w: 960, h: 540, hud: 44 };
const WHEAT_XS = [252, 162, 72];
const WHEAT_Y = 178;
const MANDRAKE = { x: 162, y: 370 };
const REFINER = {
  drop: { x: 330, y: 468 },
  work: { x: 430, y: 540 },
  pickUp: { x: 330, y: 612 },
};
const CAULDRON = { drop: { x: 380, y: 728 }, work: { x: 450, y: 650 }, pickUp: { x: 540, y: 728 } };
const SHOP_DOOR = { x: 600, y: 420 };
/** On the way out from the coins, a step towards the door that keeps clear of the upgrade marker. */
const LEAVE_SHOP = { x: 650, y: 330 };
/**
 * From either cauldron's pick-up, a step to the belt corner below the door, so the walk up to the door
 * keeps clear of the cauldrons' upgrade markers.
 */
const LEAVE_CAULDRONS = { x: 600, y: 690 };
const COUNTER = { drop: { x: 472, y: 282 }, work: { x: 520, y: 340 }, coins: { x: 728, y: 282 } };
/** The Recipes button in the top bar, on screen rather than in the world. */
const RECIPES_BUTTON = { x: 219, y: 22 };

const POTION_PRICE: Record<string, number> = { healingDraught: 8, sleepingTonic: 15 };

/**
 * Game time per animation frame, every frame the same length. Longer frames mean fewer to draw, so
 * the game can play at SPEED on a CI runner without a GPU.
 */
const FRAME_MS = 64;
/** Game time advanced between checks: a few animation frames. */
const STEP_MS = 192;
/** The doctor's walking speed in pixels per second, from GameScene. */
const WALK_SPEED = 160;
/** The doctor stops within 4px of a tapped spot, but the last frame's step can carry the feet past it. */
const ARRIVED_PX = 4 + (WALK_SPEED * FRAME_MS) / 1000 + 2;
/**
 * How many times faster than real time the game plays, so the recorded video runs at that speed.
 * CI plays at 4x. A machine that can't keep up plays as fast as it can; the end of the run logs the
 * speed it reached.
 */
const SPEED = Number(process.env.PLAYTHROUGH_SPEED ?? 4);

/**
 * How many more of a potion customers want than the shop has ready, as the cauldron counts it when
 * it picks a recipe: on the shelf, in the doctor's hands and on the cauldrons' pallets.
 */
const shortfall = (s: GameState, potion: ItemId) =>
  s.orders.flatMap((o) => o.wants).filter((p) => p === potion).length -
  [...s.counter.shelf, ...s.carrying, ...s.cauldron.output, ...s.cauldron2.output].filter((p) => p === potion).length;

/** What a customer coming in now pays for a potion: its price with the guild's upgrade, and a tip. */
const potionPay = (s: GameState, potion: string) =>
  Math.round(POTION_PRICE[potion] * (1 + 0.25 * s.upgrades.prices.level)) + 2 * (s.upgrades.counter.level + 1);

const count = (items: ItemId[]) =>
  items.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});

function scene(page: Page) {
  const read = <T>(fn: (s: any) => T) =>
    page.evaluate(`(${fn.toString()})(window.game.scene.getScene('Game'))`) as Promise<T>;
  return {
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify(s.state))),
    feet: () => read<Point & { moving: boolean }>((s) => ({ x: s.player.x, y: s.player.body.center.y, moving: !!s.pointerTarget })),
    /** The top-left corner of the view in the world, which moves as the camera follows the doctor. */
    view: () => read<Point>((s) => ({ x: s.cameras.main.scrollX, y: s.cameras.main.scrollY })),
    /** How far from the doctor's centre ripe plants are harvested, in pixels. */
    reach: () => read<number>((s) => s.harvestReach()),
    /** How many items each of a station's pallets shows, by item, for goods coming in and going out. */
    pallets: (station: string) =>
      page.evaluate(
        (id) => {
          const p = (window as any).game.scene.getScene('Game').pallets[id];
          const shown = (row: { item: string; count: number }[]) => Object.fromEntries(row.map((x) => [x.item, x.count]));
          return { in: shown(p.in), out: shown(p.out) };
        },
        station,
      ) as Promise<{ in: Record<string, number>; out: Record<string, number> }>,
    /** Whether the recipe overview is open, and its lines. */
    recipes: () => read<{ open: boolean; lines: string[] }>((s) => ({ open: s.recipes.visible, lines: s.recipes.lines })),
  };
}

test('plays a round of the game loop', async ({ page }, testInfo) => {
  // A seeded Math.random keeps customer orders the same from run to run.
  await page.addInitScript(() => {
    let seed = 1234567;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  if (process.env.CPU_THROTTLE) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU_THROTTLE) });
  }
  // The test owns the clock: game time only moves when the test advances it, one 16ms animation
  // frame at a time, so walking, timers and customers behave the same on a slow runner as on a fast
  // one, and waiting on a timer costs no real time.
  const start = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1_000));
  await page.addInitScript((frameMs) => {
    // Animation frames come from the test's clock at a fixed step, so each one is FRAME_MS long.
    window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), frameMs);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    // Phaser falls back to its canvas renderer. CI has no GPU, and WebGL in software is too slow to
    // play at SPEED; the game, its rules and the pixel art are the same either way.
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/i.test(id) ? null : getContext.call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  }, FRAME_MS);
  await page.goto('/');
  const game = scene(page);
  const canvas = page.locator('canvas');

  /** Game time played since the game started, and the real time when it started. */
  let gameMs = 0;
  let startedAt = 0;

  /**
   * Advances game time in small steps until `done` holds; returns false if `ms` ran out first. Once
   * the game has started, each step waits until real time catches up with game time / SPEED.
   */
  async function play(ms: number, done: () => Promise<boolean>) {
    for (let t = 0; t <= ms; t += STEP_MS) {
      if (await done()) return true;
      await page.clock.runFor(STEP_MS);
      if (!startedAt) continue;
      gameMs += STEP_MS;
      const ahead = gameMs / SPEED - (Date.now() - startedAt);
      if (ahead > 0) await new Promise((r) => setTimeout(r, ahead));
    }
    return done();
  }

  expect(
    await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game')?.player)),
    'game started',
  ).toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** Taps a spot on screen, as a player would, and waits for the doctor's feet to arrive there. */
  async function tapAndWalk(to: Point) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    const view = await game.view();
    await page.mouse.click(box.x + (to.x - view.x) * scale, box.y + (to.y - view.y) * scale);
    let at = await game.feet();
    const arrived = await play(15_000, async () => {
      at = await game.feet();
      return !at.moving && Math.hypot(at.x - to.x, at.y - to.y) < ARRIVED_PX;
    });
    expect(arrived, `walk to ${to.x},${to.y}; the doctor's feet are at ${JSON.stringify(at)}`).toBe(true);
  }

  /**
   * Walks to each spot in turn. A spot outside the view is reached in hops: tap the farthest point
   * towards it that is on screen, let the camera follow, and tap again.
   */
  async function walkTo(...route: Point[]) {
    const margin = 40;
    for (const to of route) {
      for (let hop = 0; ; hop++) {
        expect(hop, `hops to reach ${to.x},${to.y}`).toBeLessThan(6);
        const view = await game.view();
        const left = view.x + margin, right = view.x + VIEW.w - margin;
        const top = view.y + VIEW.hud + margin, bottom = view.y + VIEW.h - margin;
        if (to.x >= left && to.x <= right && to.y >= top && to.y <= bottom) {
          await tapAndWalk(to);
          break;
        }
        // The farthest point on the straight line towards the spot that is still on screen.
        const from = await game.feet();
        const dx = to.x - from.x, dy = to.y - from.y;
        let t = 1;
        if (dx > 0) t = Math.min(t, (right - from.x) / dx);
        if (dx < 0) t = Math.min(t, (left - from.x) / dx);
        if (dy > 0) t = Math.min(t, (bottom - from.y) / dy);
        if (dy < 0) t = Math.min(t, (top - from.y) / dy);
        await tapAndWalk({ x: Math.round(from.x + dx * t), y: Math.round(from.y + dy * t) });
      }
    }
  }

  /** Plays on until `check` holds, for up to `ms` of game time. */
  async function until(what: string, check: (s: GameState) => boolean, ms = 30_000) {
    let state = await game.state();
    const ok = await play(ms, async () => check((state = await game.state())));
    if (!ok) {
      // Name where the doctor stood and what the world looked like when it gave up.
      const { orders, plots, ...rest } = state;
      throw new Error(`Timed out after ${ms}ms of game time waiting for: ${what}\n` +
        `Doctor at ${JSON.stringify(await game.feet())}, state ${JSON.stringify(rest)}`);
    }
    return state;
  }

  const fresh = await game.state();
  expect(fresh.coins).toBe(0);
  expect(fresh.carrying).toEqual([]);

  // The Recipes button opens an overview of what each station makes from what; tapping it closes it.
  // Neither tap walks the doctor.
  const box = (await canvas.boundingBox())!;
  const tapScreen = (p: Point) => page.mouse.click(box.x + (p.x * box.width) / VIEW.w, box.y + (p.y * box.width) / VIEW.w);
  await tapScreen(RECIPES_BUTTON);
  await play(STEP_MS, async () => false);
  expect(await game.recipes()).toEqual({
    open: true,
    lines: [
      'Wheat = Wheat Flour',
      'Mandrake = Mandrake Seeds',
      'Wheat Flour + Mandrake Seeds = Sleeping Tonic',
      'Wheat Flour + Wheat Flour = Healing Draught',
    ],
  });
  await snap('0-recipes');
  await tapScreen({ x: VIEW.w / 2, y: VIEW.h / 2 });
  await play(STEP_MS, async () => false);
  expect((await game.recipes()).open).toBe(false);
  expect((await game.feet()).moving).toBe(false);

  // One round of the loop: harvest, refine, brew, sell and collect the coins.
  // Gardens: walk along the wheat row, then past one mandrake, until both hands are full.
  await until('a ripe wheat row', (s) => s.plots.slice(0, 3).every((p) => p.grown >= 8_000), 20_000);
  // Stop at each plant in turn, so a slow frame rate can't carry the doctor past one.
  for (const [i, x] of WHEAT_XS.entries()) {
    await walkTo({ x, y: WHEAT_Y });
    await until(`wheat ${i + 1} harvested`, (s) => (count(s.carrying).wheat ?? 0) >= i + 1);
  }
  expect(count((await game.state()).carrying)).toEqual({ wheat: 3 });
  // The camera followed the doctor up to the wheat field, at the top-left corner of the world.
  expect(await game.view()).toEqual({ x: 0, y: 0 });
  await until('a ripe mandrake', (s) => s.plots[4].grown >= 14_000, 20_000);
  await walkTo(MANDRAKE);
  let s = await until('one mandrake harvested', (s) => s.carrying.length === 4);
  expect(count(s.carrying)).toEqual({ wheat: 3, mandrake: 1 });
  await snap('1-harvested');

  // Refining table: drop the plants, work until they are refined, pick the goods up.
  await walkTo(REFINER.drop);
  s = await until('plants dropped at the refining table', (s) => s.carrying.length === 0);
  expect(s.refiner.queue.length + s.refiner.output.length).toBe(4);
  // Each kind of plant goes on its own pallet beside the table.
  expect(await game.pallets('refiner')).toEqual({ in: { wheat: 3, mandrake: 1 }, out: { flour: 0, mandrakeSeeds: 0 } });
  await walkTo(REFINER.work);
  await snap('2-refining');
  await until('plants refined', (s) => s.refiner.output.length === 4);
  expect(await game.pallets('refiner')).toEqual({ in: { wheat: 0, mandrake: 0 }, out: { flour: 3, mandrakeSeeds: 1 } });
  await walkTo(REFINER.pickUp);
  s = await until('refined goods picked up', (s) => s.carrying.length === 4);
  expect(count(s.carrying)).toEqual({ flour: 3, mandrakeSeeds: 1 });

  // Cauldron: flour and seeds brew a Sleeping Tonic, two flour a Healing Draught.
  await walkTo(CAULDRON.drop);
  await until('goods in the cauldron', (s) => s.carrying.length === 0);
  // The cauldron picks its first recipe when work starts: the potion the shop is shortest of,
  // Sleeping Tonic on a tie. Three flour and a seed could make either.
  s = await game.state();
  expect(s.cauldron.brewing).toBeNull();
  const short = { healingDraught: shortfall(s, 'healingDraught'), sleepingTonic: shortfall(s, 'sleepingTonic') };
  await walkTo(CAULDRON.work);
  s = await until('a brew started', (s) => s.cauldron.brewing !== null);
  expect(s.cauldron.brewing!.out, `first brew with shortfalls ${JSON.stringify(short)}`).toBe(
    short.healingDraught > short.sleepingTonic ? 'healingDraught' : 'sleepingTonic',
  );
  await snap('3-brewing');
  await until('potions brewed', (s) => s.cauldron.output.length === 2);
  expect(await game.pallets('cauldron')).toEqual({
    in: { flour: 0, mandrakeSeeds: 0 },
    out: { healingDraught: 1, sleepingTonic: 1 },
  });
  await walkTo(CAULDRON.pickUp);
  s = await until('potions picked up', (s) => s.carrying.length === 2);
  // Down at the cauldron, the bottom of the U, the view has scrolled to the bottom edge of the world.
  expect((await game.view()).y).toBe(880 - VIEW.h);
  expect(count(s.carrying)).toEqual({ sleepingTonic: 1, healingDraught: 1 });
  await walkTo(LEAVE_CAULDRONS);

  // Storefront: stock the shelf, serve customers until one has paid, then take the coins.
  await walkTo(SHOP_DOOR, COUNTER.drop);
  s = await until('potions on the shelf', (s) => s.carrying.length === 0);
  // The potions stand on their pallets behind the counter.
  const shelf = count(s.counter.shelf);
  expect((await game.pallets('counter')).in).toEqual({ healingDraught: shelf.healingDraught ?? 0, sleepingTonic: shelf.sleepingTonic ?? 0 });
  await walkTo(COUNTER.work);
  await snap('4-serving');
  // Each customer pays for every potion they get, at the price they came in with. A customer who
  // came in and was served between two looks pays today's price.
  let prev = s;
  let owed = s.counter.till;
  s = await until(
    'customers served',
    (s) => {
      const served = count(prev.counter.shelf);
      for (const [p, n] of Object.entries(count(s.counter.shelf))) served[p] -= n;
      for (const order of prev.orders) {
        const now = s.orders.find((o) => o.id === order.id);
        // An order that is gone was filled, unless the customer ran out of patience.
        if (!now && order.patience < 5_000) continue;
        const left = [...(now?.wants ?? [])];
        for (const want of order.wants) {
          const i = left.indexOf(want);
          if (i >= 0) left.splice(i, 1);
          else {
            owed += order.pay[want];
            served[want]--;
          }
        }
      }
      for (const [p, n] of Object.entries(served)) owed += n * potionPay(s, p);
      prev = s;
      return s.counter.shelf.length === 0 || s.counter.till > 0;
    },
    45_000,
  );
  expect(s.counter.till, 'a customer paid').toBeGreaterThan(0);
  expect(s.counter.till, 'paid per potion').toBe(owed);
  // Step off the work spot first, so no customer pays in while the doctor heads for the coins.
  await walkTo(LEAVE_SHOP);
  s = await game.state();
  const earned = s.counter.till;
  await walkTo(COUNTER.coins);
  s = await until('coins collected', (s) => s.counter.till === 0);
  expect(s.coins).toBe(earned);
  // Nothing was bought along the way; no walk clipped a purple marker.
  for (const level of [...Object.values(s.upgrades), ...Object.values(s.craftsmen)]) expect(level).toEqual({ level: 0, paid: 0 });

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
