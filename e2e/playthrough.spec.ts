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
const WHEAT_ROW = { from: { x: 264, y: 200 }, to: { x: 84, y: 200 } };
const MANDRAKE = { x: 174, y: 430 };
const WALKWAY = { x: 340, y: 290 };
const REFINER = { drop: { x: 370, y: 178 }, work: { x: 450, y: 108 }, pickUp: { x: 530, y: 178 } };
const CAULDRON = { drop: { x: 370, y: 408 }, work: { x: 450, y: 482 }, pickUp: { x: 530, y: 408 } };
const SHOP_DOOR = { x: 600, y: 335 };
const COUNTER = { drop: { x: 645, y: 262 }, work: { x: 773, y: 302 }, coins: { x: 901, y: 262 }, upgrade: { x: 896, y: 468 } };

const UPGRADE_COST = 20;

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
  await page.goto('/');
  await page.waitForFunction(() => (window as any).game?.scene.getScene('Game')?.player);
  const game = scene(page);
  const canvas = page.locator('canvas');

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** Clicks the spot, like a tap, and waits for the doctor's feet to arrive. */
  async function walkTo(...route: Point[]) {
    for (const to of route) {
      const tap = async () => {
        const box = (await canvas.boundingBox())!;
        const scale = box.width / 960;
        await page.mouse.click(box.x + to.x * scale, box.y + to.y * scale);
      };
      await tap();
      // The doctor stops once the feet are within a few pixels, but at a low frame rate a step can
      // overshoot, stopping farther off or stepping back and forth over the spot. Floor markers are
      // 44px across, so close by counts as arrived, and a stop farther off gets another tap.
      let taps = 1;
      await expect
        .poll(async () => {
          const f = await game.feet();
          const d = Math.round(Math.hypot(f.x - to.x, f.y - to.y));
          if (d < 12 || (!f.moving && d < 16)) return 'arrived';
          if (f.moving) return `${d}px away, walking`;
          if (taps < 4) {
            taps++;
            await tap();
          }
          return `stopped ${d}px away after ${taps} taps`;
        }, { message: `walk to ${to.x},${to.y}`, timeout: 15_000 })
        .toBe('arrived');
    }
  }

  async function until(what: string, check: (s: GameState) => boolean, timeout = 30_000) {
    await expect.poll(async () => check(await game.state()), { message: what, timeout }).toBe(true);
    return game.state();
  }

  const start = await game.state();
  expect(start.coins).toBe(0);
  expect(start.carrying).toEqual([]);

  let cycle = 0;
  while ((await game.state()).coins < UPGRADE_COST) {
    cycle++;
    expect(cycle, 'cycles needed to earn an upgrade').toBeLessThanOrEqual(4);

    // Gardens: walk along the wheat row, then past one mandrake, until both hands are full.
    await until('a ripe wheat row', (s) => s.plots.slice(0, 3).every((p) => p.grown >= 8_000), 20_000);
    await walkTo(WHEAT_ROW.from, WHEAT_ROW.to);
    await until('three wheat harvested', (s) => count(s.carrying).wheat === 3);
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

  expect(errors).toEqual([]);
});
