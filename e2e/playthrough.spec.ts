import { expect, test, type Page } from '@playwright/test';

// Plays the whole loop with real inputs (clicks to walk, as on a phone): harvest both gardens,
// refine, brew, sell at the counter until there are enough coins, then buy an upgrade. Sell more to
// buy the expansion's land, a field, a refining table and a cauldron, and play a round on that
// second line. Then kit the doctor out with a bigger pack, faster boots and a longer sickle, hire a
// craftsman for the refining table, buy the conveyor belt that carries plants from the gardens to the
// table and watch the craftsman refine them, and last drop everything carried with Drop all.
// Game state is only read, through the `game` object the dev build puts on window.

type Point = { x: number; y: number };
type ItemId = string;
interface GameState {
  coins: number;
  carrying: ItemId[];
  plots: { plant: string; grown: number }[];
  refiner: { queue: ItemId[]; output: ItemId[] };
  cauldron: { contents: ItemId[]; brewing: unknown; output: ItemId[] };
  refiner2: { queue: ItemId[]; output: ItemId[] };
  cauldron2: { contents: ItemId[]; brewing: unknown; output: ItemId[] };
  expansion: Record<'land' | 'refiner' | 'cauldron', { built: boolean; paid: number }> & { fields: { built: boolean; paid: number }[] };
  counter: { shelf: ItemId[]; till: number };
  upgrades: Record<string, { level: number; paid: number }>;
  craftsmen: Record<string, { level: number; paid: number }>;
  orders: { id: number; wants: ItemId[]; reward: number }[];
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
  hire: { x: 500, y: 470, cost: 30 },
};
/** From the table's hire marker, a way past its upgrade marker, work spot and drop-off to its left. */
const BELOW_REFINER_MARKERS = [{ x: 470, y: 510 }, { x: 250, y: 510 }];
const CAULDRON = { drop: { x: 380, y: 728 }, work: { x: 450, y: 650 }, pickUp: { x: 540, y: 728 } };
const SHOP_DOOR = { x: 600, y: 420 };
/** On the way out from the coins, a step towards the door that keeps clear of the upgrade marker. */
const LEAVE_SHOP = { x: 650, y: 330 };
/**
 * From either cauldron's pick-up, a step to the belt corner below the door, so the walk up to the door
 * keeps clear of the cauldrons' upgrade markers.
 */
const LEAVE_CAULDRONS = { x: 600, y: 690 };
const COUNTER = { drop: { x: 472, y: 282 }, work: { x: 520, y: 340 }, coins: { x: 728, y: 282 }, upgrade: { x: 710, y: 346 } };
const GARDEN_BELT = { x: 170, y: 500, cost: 60 };
// The expansion's second line on the right arm, mirroring the first.
const LAND = { x: 820, y: 430, cost: 100 };
// The outfitter's stall right of the shop, with the doctor's upgrades top to bottom.
const OUTFITTER = {
  pack: { x: 830, y: 140, cost: 30 },
  boots: { x: 830, y: 230, cost: 25 },
  sickle: { x: 830, y: 320, cost: 25 },
};
const MANDRAKE_XS = [162, 252, 72];
const WHEAT2_XS = [1038, 1128, 948];
const WHEAT2_FIELD = { x: 1038, y: 152, cost: 25 };
const REFINER2 = { drop: { x: 870, y: 468 }, work: { x: 770, y: 540 }, pickUp: { x: 870, y: 612 }, cost: 50 };
const CAULDRON2 = { drop: { x: 820, y: 728 }, work: { x: 750, y: 650 }, pickUp: { x: 660, y: 728 }, cost: 75 };

/** The Drop all button in the top bar, on screen rather than in the world. */
const DROP_ALL = { x: 296, y: 22 };

/**
 * The guild in the bottom-left corner of the yard: garden growth, belt speed, potion prices and an
 * extra order slot. It is reached along the bottom of the yard, clear of the cauldron's markers, and
 * left between its two rows of markers.
 */
const GUILD = {
  growth: { x: 190, y: 700, cost: 20 },
  belts: { x: 190, y: 800, cost: 30 },
  prices: { x: 90, y: 800, cost: 20 },
  slots: { x: 90, y: 700, cost: 30 },
};
const TO_GUILD = [{ x: 600, y: 690 }, { x: 240, y: 690 }];
const FROM_GUILD = [{ x: 90, y: 750 }, { x: 240, y: 750 }, { x: 240, y: 690 }, { x: 600, y: 690 }];
const POTION_PRICE: Record<string, number> = { healingDraught: 8, sleepingTonic: 15 };

const UPGRADE_COST = 20;
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
  };
}

test('plays the whole game loop', async ({ page }, testInfo) => {
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

  /** One round of the loop: harvest, refine, brew, sell and collect the coins. */
  let cycle = 0;
  async function playRound() {
    cycle++;
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
    if (cycle === 1) await snap('1-harvested');

    // Refining table: drop the plants, work until they are refined, pick the goods up.
    await walkTo(REFINER.drop);
    s = await until('plants dropped at the refining table', (s) => s.carrying.length === 0);
    expect(s.refiner.queue.length + s.refiner.output.length).toBe(4);
    // Each kind of plant goes on its own pallet beside the table.
    if (cycle === 1) {
      expect(await game.pallets('refiner')).toEqual({ in: { wheat: 3, mandrake: 1 }, out: { flour: 0, mandrakeSeeds: 0 } });
    }
    await walkTo(REFINER.work);
    if (cycle === 1) await snap('2-refining');
    await until('plants refined', (s) => s.refiner.output.length === 4);
    if (cycle === 1) {
      expect(await game.pallets('refiner')).toEqual({ in: { wheat: 0, mandrake: 0 }, out: { flour: 3, mandrakeSeeds: 1 } });
    }
    await walkTo(REFINER.pickUp);
    s = await until('refined goods picked up', (s) => s.carrying.length === 4);
    expect(count(s.carrying)).toEqual({ flour: 3, mandrakeSeeds: 1 });

    // Cauldron: flour and seeds brew a Sleeping Tonic, two flour a Healing Draught.
    await walkTo(CAULDRON.drop);
    await until('goods in the cauldron', (s) => s.carrying.length === 0);
    await walkTo(CAULDRON.work);
    if (cycle === 1) await snap('3-brewing');
    await until('potions brewed', (s) => s.cauldron.output.length === 2);
    if (cycle === 1) {
      expect(await game.pallets('cauldron')).toEqual({
        in: { flour: 0, mandrakeSeeds: 0 },
        out: { healingDraught: 1, sleepingTonic: 1 },
      });
    }
    await walkTo(CAULDRON.pickUp);
    s = await until('potions picked up', (s) => s.carrying.length === 2);
    // Down at the cauldron, the bottom of the U, the view has scrolled to the bottom edge of the world.
    expect((await game.view()).y).toBe(880 - VIEW.h);
    expect(count(s.carrying)).toEqual({ sleepingTonic: 1, healingDraught: 1 });

    await walkTo(LEAVE_CAULDRONS);
    await sell();
  }

  /** Storefront: stock the shelf and serve customers until the shelf is empty, then take the coins. */
  async function sell() {
    await walkTo(SHOP_DOOR, COUNTER.drop);
    let s = await until('potions on the shelf', (s) => s.carrying.length === 0);
    // The potions stand on their pallets behind the counter.
    const shelf = count(s.counter.shelf);
    expect((await game.pallets('counter')).in).toEqual({ healingDraught: shelf.healingDraught ?? 0, sleepingTonic: shelf.sleepingTonic ?? 0 });
    await walkTo(COUNTER.work);
    if (cycle === 1) await snap('4-serving');
    s = await until('customers served', (s) => s.counter.shelf.length === 0 || s.counter.till > 0, 45_000);
    if (s.counter.till > 0) {
      // Step off the work spot first, so no customer pays in while the doctor heads for the coins.
      await walkTo(LEAVE_SHOP);
      s = await game.state();
      const before = s.coins + s.counter.till;
      await walkTo(COUNTER.coins);
      s = await until('coins collected', (s) => s.counter.till === 0);
      expect(s.coins).toBe(before);
    }
  }

  /**
   * Plays rounds until there are `coins`, at most `max` of them. Rounds end in the shop; the first
   * starts from the shop too unless the doctor is out in the yard.
   */
  async function earn(coins: number, what: string, max: number, inShop = true) {
    const from = cycle;
    while ((await game.state()).coins < coins) {
      expect(cycle - from, `rounds needed to earn ${what}`).toBeLessThan(max);
      await walkTo(...(inShop || cycle > from ? [LEAVE_SHOP, SHOP_DOOR] : [SHOP_DOOR]));
      await playRound();
    }
  }

  /** Stands on a build marker until `built` holds, and checks it cost exactly `cost` coins. */
  async function buy(what: string, at: Point, cost: number, built: (s: GameState) => boolean) {
    const before = await game.state();
    expect(built(before), `${what} not built yet`).toBe(false);
    await walkTo(at);
    const s = await until(`${what} built`, built);
    expect(s.coins, `coins after buying ${what}`).toBe(before.coins - cost);
  }

  while ((await game.state()).coins < UPGRADE_COST) {
    expect(cycle, 'rounds needed to earn an upgrade').toBeLessThan(4);
    await playRound();
    // Back to the gardens for the next round, if needed.
    if ((await game.state()).coins < UPGRADE_COST) await walkTo(LEAVE_SHOP, SHOP_DOOR);
  }

  // Upgrade: stand on the counter's upgrade marker until the next level is paid for.
  const rich = await game.state();
  expect(rich.upgrades.counter).toEqual({ level: 0, paid: 0 });
  await walkTo(COUNTER.upgrade);
  await until('counter upgraded', (s) => s.upgrades.counter.level === 1);
  await snap('5-upgraded');
  // The next level isn't paid for until the doctor steps off the marker and back on.
  await play(1_000, async () => false);
  await walkTo({ x: COUNTER.upgrade.x - 90, y: COUNTER.upgrade.y });
  const done = await game.state();
  expect(done.upgrades.counter).toEqual({ level: 1, paid: 0 });
  expect(done.coins).toBe(rich.coins - UPGRADE_COST);

  // Expansion: buy the land on the grass right of the shop, which lays the right arm's yard.
  await earn(LAND.cost, 'the land', 6);
  await walkTo(LEAVE_SHOP, SHOP_DOOR);
  await buy('land', LAND, LAND.cost, (s) => s.expansion.land.built);
  await snap('6-land');

  // Then a cauldron, a refining table and a wheat field for the second line, each on its own marker.
  await earn(CAULDRON2.cost + REFINER2.cost + WHEAT2_FIELD.cost, 'the second line', 8, false);
  await walkTo(LEAVE_SHOP, SHOP_DOOR);
  await buy('cauldron', CAULDRON2.work, CAULDRON2.cost, (s) => s.expansion.cauldron.built);
  await buy('refining table', REFINER2.work, REFINER2.cost, (s) => s.expansion.refiner.built);
  await buy('wheat field', WHEAT2_FIELD, WHEAT2_FIELD.cost, (s) => s.expansion.fields[0].built);
  let s = await game.state();
  expect(s.expansion.fields[1].built).toBe(false);

  // A round on the second line: the new field starts ripe. Three wheat refine to three flour, two
  // of which brew a Healing Draught in the new cauldron.
  for (const [i, x] of WHEAT2_XS.entries()) {
    await walkTo({ x, y: WHEAT_Y });
    await until(`second line wheat ${i + 1} harvested`, (s) => (count(s.carrying).wheat ?? 0) >= i + 1);
  }
  // Up at the new field, the view has scrolled to the right edge of the world.
  expect((await game.view()).x).toBe(1200 - VIEW.w);
  await snap('7-second-field');
  await walkTo(REFINER2.drop);
  s = await until('wheat dropped at the second table', (s) => s.carrying.length === 0);
  expect(s.refiner2.queue).toEqual(['wheat', 'wheat', 'wheat']);
  await walkTo(REFINER2.work);
  await until('wheat refined at the second table', (s) => s.refiner2.output.length === 3);
  await walkTo(REFINER2.pickUp);
  await until('flour picked up', (s) => s.carrying.length === 3);
  await walkTo(CAULDRON2.drop);
  await until('flour in the second cauldron', (s) => s.carrying.length === 0);
  await walkTo(CAULDRON2.work);
  await snap('8-second-cauldron');
  s = await until('a potion brewed in the second cauldron', (s) => s.cauldron2.output.length === 1);
  expect(s.cauldron2.contents).toEqual(['flour']);
  await walkTo(CAULDRON2.pickUp);
  s = await until('potion picked up', (s) => s.carrying.length === 1);
  expect(s.carrying).toEqual(['healingDraught']);
  // The first line's stations stayed as they were.
  expect(s.refiner.queue.length + s.refiner.output.length + s.cauldron.output.length).toBe(0);
  await walkTo(LEAVE_CAULDRONS);
  await sell();

  // Outfitter, a craftsman and the conveyor belt: sell more rounds until all are affordable.
  const { pack, boots, sickle } = OUTFITTER;
  const guildCost = GUILD.growth.cost + GUILD.belts.cost + GUILD.prices.cost + GUILD.slots.cost;
  await earn(
    sickle.cost + boots.cost + pack.cost + guildCost + REFINER.hire.cost + GARDEN_BELT.cost,
    'the guild, the outfitter, a craftsman and the garden belt',
    14,
  );

  // The guild: faster growth, faster belts, higher prices and a fourth customer. Each is checked once
  // the belt runs at the end.
  await walkTo(LEAVE_SHOP, SHOP_DOOR, ...TO_GUILD);
  await buy('growth', GUILD.growth, GUILD.growth.cost, (s) => s.upgrades.growth.level === 1);
  await buy('belt speed', GUILD.belts, GUILD.belts.cost, (s) => s.upgrades.belts.level === 1);
  await buy('prices', GUILD.prices, GUILD.prices.cost, (s) => s.upgrades.prices.level === 1);
  // Customers who come in from here on pay the higher prices.
  const pricedFrom = (await game.state()).nextOrderId;
  await buy('order slot', GUILD.slots, GUILD.slots.cost, (s) => s.upgrades.slots.level === 1);

  // A longer sickle harvests from a quarter further away.
  await walkTo(...FROM_GUILD, SHOP_DOOR, { x: sickle.x, y: SHOP_DOOR.y });
  expect(await game.reach()).toBe(72);
  await buy('sickle', sickle, sickle.cost, (s) => s.upgrades.sickle.level === 1);
  expect(await game.reach()).toBe(90);

  await buy('boots', boots, boots.cost, (s) => s.upgrades.boots.level === 1);
  await buy('pack', pack, pack.cost, (s) => s.upgrades.pack.level === 1);
  // Down the gap between the shop wall and the outfitter's markers into the yard.
  await walkTo({ x: 785, y: pack.y }, { x: 785, y: SHOP_DOOR.y });

  // Faster boots: the doctor covers a fifth more ground in the same time. Head off along the top of
  // the yard and, once under way, measure how far five steps of game time take them.
  const strideBox = (await canvas.boundingBox())!;
  const view = await game.view();
  const away = { x: 400, y: SHOP_DOOR.y };
  await page.mouse.click(
    strideBox.x + ((away.x - view.x) * strideBox.width) / VIEW.w,
    strideBox.y + ((away.y - view.y) * strideBox.width) / VIEW.w,
  );
  await play(0, async () => false);
  const from = await game.feet();
  const ms = STEP_MS * 5;
  await play(ms - STEP_MS, async () => false); // one step per STEP_MS, and one more at the end
  const to = await game.feet();
  expect(to.moving).toBe(true);
  // Physics moves in its own fixed ticks, so allow a few pixels either way; without the boots it
  // would be 30 pixels short.
  const moved = Math.hypot(to.x - from.x, to.y - from.y);
  expect(moved).toBeGreaterThan((WALK_SPEED * 1.2 * ms) / 1000 - 5);
  expect(moved).toBeLessThan((WALK_SPEED * 1.2 * ms) / 1000 + 5);
  await walkTo(SHOP_DOOR);

  // A bigger pack carries five: the wheat row and two mandrakes, with no room for the third.
  await until('a ripe wheat row and mandrake patch', (s) => s.plots.slice(0, 6).every((p, i) => p.grown >= (i < 3 ? 8_000 : 14_000)), 20_000);
  for (const [i, x] of WHEAT_XS.entries()) {
    await walkTo({ x, y: WHEAT_Y });
    await until(`wheat ${i + 1} harvested into the bigger pack`, (s) => (count(s.carrying).wheat ?? 0) >= i + 1);
  }
  for (const [i, x] of MANDRAKE_XS.slice(0, 2).entries()) {
    await walkTo({ x, y: MANDRAKE.y });
    await until(`mandrake ${i + 1} harvested into the bigger pack`, (s) => (count(s.carrying).mandrake ?? 0) >= i + 1);
  }
  await walkTo({ x: MANDRAKE_XS[2], y: MANDRAKE.y });
  await play(1_000, async () => false);
  s = await game.state();
  expect(count(s.carrying)).toEqual({ wheat: 3, mandrake: 2 });
  expect(s.plots[3].grown).toBeGreaterThanOrEqual(14_000);
  await snap('9-outfitted');

  // A craftsman for the refining table, hired on the marker beside its upgrade marker, reached from
  // above so the walk keeps clear of the upgrade marker.
  await walkTo({ x: REFINER.hire.x - 20, y: REFINER.hire.y - 40 });
  await buy('craftsman', REFINER.hire, REFINER.hire.cost, (s) => s.craftsmen.refiner.level === 1);
  // Round the table's markers, keeping the plants in hand, to the garden belt's build marker.
  await walkTo(...BELOW_REFINER_MARKERS);

  // Conveyor belt: pay for it on its build marker. From then on ripe plants ride from the gardens to
  // the refining table by themselves, so the plants the doctor carries are cleared from their hands.
  const saved = await game.state();
  expect(saved.belts.garden).toEqual({ built: false, paid: 0, items: [] });
  expect(count(saved.carrying)).toEqual({ wheat: 3, mandrake: 2 });
  await walkTo(GARDEN_BELT);
  s = await until('garden belt built', (s) => s.belts.garden.built);
  expect(s.coins).toBe(saved.coins - GARDEN_BELT.cost);
  expect(s.carrying).toEqual([]);
  // Wait where the table's drop marker was, out of the mandrakes' reach, while the belt brings in the
  // plants; anything that reaches the table from here on came by belt. The doctor's hands stay empty:
  // the drop marker went away with the belt.
  const queued = s.refiner.queue.length + s.refiner.output.length;
  const refined = s.refiner.output.length;
  await walkTo(REFINER.drop);
  s = await until('a plant on the garden belt', (s) => s.belts.garden.items.length > 0, 20_000);
  // The faster belt carries it half again as far in the same time. Physics and frames run in their own
  // steps, so allow a little either way; at the old speed it would be 480 short.
  const span = STEP_MS * 5;
  const along = s.belts.garden.items[0].at;
  await play(span - STEP_MS, async () => false);
  s = await game.state();
  expect(s.belts.garden.items[0].at - along).toBeGreaterThan(span * 1.5 - 100);
  expect(s.belts.garden.items[0].at - along).toBeLessThan(span * 1.5 + 100);
  await snap('10-belt');
  s = await until('the belt delivered to the refining table', (s) => s.refiner.queue.length + s.refiner.output.length > queued, 20_000);
  expect(s.carrying).toEqual([]);
  // The craftsman refines what the belt brings while the doctor stays away from the work spot.
  s = await until('the craftsman refined a plant', (s) => s.refiner.output.length > refined, 20_000);
  const feet = await game.feet();
  expect(Math.hypot(feet.x - REFINER.drop.x, feet.y - REFINER.drop.y)).toBeLessThan(ARRIVED_PX);

  // Drop all: pick up refined goods, then tap the button in the top bar to empty the doctor's hands.
  await until('goods refined at the table', (s) => s.refiner.output.length >= 2, 20_000);
  await walkTo(REFINER.work, REFINER.pickUp);
  await until('refined goods in hand', (s) => s.carrying.length >= 2);
  await walkTo(REFINER.work);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + (DROP_ALL.x * box.width) / VIEW.w, box.y + (DROP_ALL.y * box.width) / VIEW.w);
  s = await until('hands emptied', (s) => s.carrying.length === 0, 1_000);
  // Tapping the top bar doesn't walk the doctor.
  expect((await game.feet()).moving).toBe(false);
  // Faster growth: a plot the belt picked grows a quarter faster than before.
  const growMs: Record<string, number> = { wheat: 8_000, mandrake: 14_000 };
  const regrowing = (p: { plant: string; grown: number }) => p.grown + span * 1.5 < growMs[p.plant];
  s = await until('a plot regrowing after the belt picked it', (s) => s.plots.slice(0, 6).some(regrowing));
  const plot = s.plots.findIndex((p, i) => i < 6 && regrowing(p));
  const grown = s.plots[plot].grown;
  await play(span - STEP_MS, async () => false);
  const regrown = (await game.state()).plots[plot].grown - grown;
  expect(regrown).toBeGreaterThan(span * 1.25 - 100);
  expect(regrown).toBeLessThan(span * 1.25 + 100);
  // Higher prices: customers since then pay a quarter more per potion, plus their tips.
  s = await until('a customer at the new prices', (s) => s.orders.some((o) => o.id >= pricedFrom), 30_000);
  for (const order of s.orders.filter((o) => o.id >= pricedFrom)) {
    const potions = order.wants.reduce((sum, p) => sum + Math.round(POTION_PRICE[p] * 1.25), 0);
    expect(order.reward).toBe(potions + order.wants.length * 2 * (s.upgrades.counter.level + 1));
  }
  // The extra order slot: with nobody serving, a fourth customer comes in to wait.
  s = await until('a fourth customer', (s) => s.orders.length === 4, 60_000);

  // Only what the playthrough meant to buy was paid for; no walk clipped another purple marker.
  const unpaid = { level: 0, paid: 0 };
  const bought = { level: 1, paid: 0 };
  expect(s.upgrades).toEqual({
    refiner: unpaid,
    cauldron: unpaid,
    refiner2: unpaid,
    cauldron2: unpaid,
    counter: bought,
    pack: bought,
    boots: bought,
    sickle: bought,
    growth: bought,
    belts: bought,
    prices: bought,
    slots: bought,
  });
  expect(s.craftsmen).toEqual({ refiner: bought, cauldron: unpaid, refiner2: unpaid, cauldron2: unpaid, counter: unpaid });

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
