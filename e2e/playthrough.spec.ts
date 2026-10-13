import { expect, test, type Page } from '@playwright/test';

// Plays the whole loop with real inputs (clicks to walk, as on a phone): harvest both gardens,
// refine, brew, sell at the counter until there are enough coins, then buy an upgrade.
// Game state is only read, through the `game` object the dev build puts on window.

type Point = { x: number; y: number };
type ItemId = string;
interface GameState {
  coins: number;
  carrying: ItemId[];
  plots: { plant: string; grown: number }[];
  refiner: { queue: ItemId[]; output: ItemId[] };
  cauldron: { contents: ItemId[]; brewing: unknown; output: ItemId[] };
  counter: { shelf: ItemId[]; till: number };
  upgrades: Record<'refiner' | 'cauldron' | 'counter', { level: number; paid: number }>;
  orders: { wants: ItemId[] }[];
}

// Floor spots in the 960x540 world, from src/scenes/layout.ts. Walking targets the doctor's feet.
const WHEAT_XS = [264, 174, 84];
const WHEAT_Y = 200;
const MANDRAKE = { x: 174, y: 430 };
const WALKWAY = { x: 340, y: 290 };
const REFINER = { drop: { x: 370, y: 178 }, work: { x: 450, y: 108 }, pickUp: { x: 530, y: 178 } };
const CAULDRON = { drop: { x: 370, y: 408 }, work: { x: 450, y: 482 }, pickUp: { x: 530, y: 408 } };
const SHOP_DOOR = { x: 600, y: 335 };
const COUNTER = { drop: { x: 645, y: 262 }, work: { x: 773, y: 302 }, coins: { x: 901, y: 262 }, upgrade: { x: 896, y: 468 } };

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

  /** Clicks the spot, like a tap, and waits for the doctor's feet to arrive. */
  async function walkTo(...route: Point[]) {
    for (const to of route) {
      const box = (await canvas.boundingBox())!;
      const scale = box.width / 960;
      await page.mouse.click(box.x + to.x * scale, box.y + to.y * scale);
      let at = await game.feet();
      const arrived = await play(15_000, async () => {
        at = await game.feet();
        return !at.moving && Math.hypot(at.x - to.x, at.y - to.y) < ARRIVED_PX;
      });
      expect(arrived, `walk to ${to.x},${to.y}; the doctor's feet are at ${JSON.stringify(at)}`).toBe(true);
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

  let cycle = 0;
  while ((await game.state()).coins < UPGRADE_COST) {
    cycle++;
    expect(cycle, 'cycles needed to earn an upgrade').toBeLessThanOrEqual(4);

    // Gardens: walk along the wheat row, then past one mandrake, until both hands are full.
    await until('a ripe wheat row', (s) => s.plots.slice(0, 3).every((p) => p.grown >= 8_000), 20_000);
    // Stop at each plant in turn, so a slow frame rate can't carry the doctor past one.
    for (const [i, x] of WHEAT_XS.entries()) {
      await walkTo({ x, y: WHEAT_Y });
      await until(`wheat ${i + 1} harvested`, (s) => (count(s.carrying).wheat ?? 0) >= i + 1);
    }
    expect(count((await game.state()).carrying)).toEqual({ wheat: 3 });
    await until('a ripe mandrake', (s) => s.plots[4].grown >= 14_000, 20_000);
    await walkTo(MANDRAKE);
    let s = await until('one mandrake harvested', (s) => s.carrying.length === 4);
    expect(count(s.carrying)).toEqual({ wheat: 3, mandrake: 1 });
    if (cycle === 1) await snap('1-harvested');

    // Refining table: drop the plants, work until they are refined, pick the goods up.
    await walkTo(WALKWAY, REFINER.drop);
    s = await until('plants dropped at the refining table', (s) => s.carrying.length === 0);
    expect(s.refiner.queue.length + s.refiner.output.length).toBe(4);
    await walkTo(REFINER.work);
    if (cycle === 1) await snap('2-refining');
    await until('plants refined', (s) => s.refiner.output.length === 4);
    await walkTo(REFINER.pickUp);
    s = await until('refined goods picked up', (s) => s.carrying.length === 4);
    expect(count(s.carrying)).toEqual({ flour: 3, mandrakeSeeds: 1 });

    // Cauldron: flour and seeds brew a Sleeping Tonic, two flour a Healing Draught.
    await walkTo({ x: REFINER.pickUp.x, y: WALKWAY.y }, { x: CAULDRON.drop.x, y: WALKWAY.y }, CAULDRON.drop);
    await until('goods in the cauldron', (s) => s.carrying.length === 0);
    await walkTo(CAULDRON.work);
    if (cycle === 1) await snap('3-brewing');
    await until('potions brewed', (s) => s.cauldron.output.length === 2);
    await walkTo(CAULDRON.pickUp);
    s = await until('potions picked up', (s) => s.carrying.length === 2);
    expect(count(s.carrying)).toEqual({ sleepingTonic: 1, healingDraught: 1 });

    // Storefront: stock the shelf and serve customers until the shelf is empty, then take the coins.
    await walkTo(SHOP_DOOR, COUNTER.drop);
    s = await until('potions on the shelf', (s) => s.carrying.length === 0);
    await walkTo(COUNTER.work);
    if (cycle === 1) await snap('4-serving');
    s = await until('customers served', (s) => s.counter.shelf.length === 0 || s.counter.till > 0, 45_000);
    if (s.counter.till > 0) {
      const before = s.coins + s.counter.till;
      await walkTo(COUNTER.coins);
      s = await until('coins collected', (s) => s.counter.till === 0);
      expect(s.coins).toBe(before);
    }
    // Back to the gardens for the next round, if needed.
    if (s.coins < UPGRADE_COST) await walkTo(SHOP_DOOR, WALKWAY);
  }

  // Upgrade: stand on the counter's upgrade marker until the next level is paid for.
  const rich = await game.state();
  expect(rich.upgrades.counter).toEqual({ level: 0, paid: 0 });
  await walkTo(COUNTER.upgrade);
  await until('counter upgraded', (s) => s.upgrades.counter.level === 1);
  await snap('5-upgraded');
  // Step off before more coins go towards the next level; whatever did is held in `paid`.
  await walkTo({ x: COUNTER.upgrade.x - 80, y: COUNTER.upgrade.y });
  const done = await game.state();
  expect(done.upgrades.counter.level).toBe(1);
  expect(done.coins + done.upgrades.counter.paid).toBe(rich.coins - UPGRADE_COST);

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
