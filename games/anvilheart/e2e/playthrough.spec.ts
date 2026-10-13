import { expect, test, type Page } from '@playwright/test';

// Plays the first sale with real inputs: the first adventurer comes in for an Iron Shortsword, the
// forge makes two Rusty Daggers, one is dragged onto the other to merge them into a Shortsword,
// and the Shortsword is dragged onto the adventurer to sell it, as a player would with a finger.
// Game state is only read, through the `game` object the dev build puts on window.

interface Adventurer {
  id: number;
  desk: number;
  wants: number;
  patienceMs: number;
}
interface GameState {
  coins: number;
  slots: (number | null)[];
  adventurers: Adventurer[];
  heatMs: number;
  sold: number;
  walkedOff: number;
  bestTier: number;
  ranks: Record<string, number>;
}
type Spot = { x: number; y: number };

const VIEW = { w: 960, h: 540 };
/** The first adventurer always wants an Iron Shortsword (tier 2), worth 10 coins: src/game/state.ts and swords.ts. */
const FIRST_ORDER = 2;
const SHORTSWORD_PRICE = 10;

/**
 * Game time per animation frame, every frame the same length. Longer frames mean fewer to draw, so
 * the game can play at SPEED on a CI runner without a GPU.
 */
const FRAME_MS = 64;
/** Game time advanced between checks: a few animation frames. */
const STEP_MS = 192;
/**
 * How many times faster than real time the game plays, so the recorded video runs at that speed.
 * CI plays at 4x. A machine that can't keep up plays as fast as it can; the end of the run logs the
 * speed it reached.
 */
const SPEED = Number(process.env.PLAYTHROUGH_SPEED ?? 4);

function scene(page: Page) {
  const read = <T>(fn: (s: any) => T) =>
    page.evaluate(`(${fn.toString()})(window.game.scene.getScene('Game'))`) as Promise<T>;
  return {
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify({ ...s.state, events: undefined }))),
    /** Where the Forge button, each anvil's sword and each adventurer are on screen. */
    spots: () => read<{ forge: Spot; slots: Spot[]; desks: Spot[] }>((s) => s.spots()),
  };
}

test('plays the first sale', async ({ page }, testInfo) => {
  // A seeded Math.random keeps the adventurers and their orders the same from run to run.
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
  // The test owns the clock: game time only moves when the test advances it, one FRAME_MS
  // animation frame at a time, so the shop plays the same on a slow runner as on a fast one.
  const start = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1_000));
  await page.addInitScript((frameMs) => {
    window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), frameMs);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    // Phaser falls back to its canvas renderer. CI has no GPU, and WebGL in software is too slow to
    // play at SPEED; the game, its rules and the pixel art are the same either way.
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/i.test(id) ? null : getContext.call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  }, FRAME_MS);
  await page.goto('/games/anvilheart/');
  const game = scene(page);
  const canvas = page.locator('canvas');

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
  const wait = (ms: number) => play(ms, async () => false);

  expect(
    await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game')?.state)),
    'game started',
  ).toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** Plays on until `check` holds, for up to `ms` of game time. */
  async function until(what: string, check: (s: GameState) => boolean, ms = 30_000) {
    let state = await game.state();
    const ok = await play(ms, async () => check((state = await game.state())));
    if (!ok) throw new Error(`Timed out after ${ms}ms of game time waiting for: ${what}\nState ${JSON.stringify(state)}`);
    return state;
  }

  /** From a point in the 960x540 view to the page, wherever the canvas is scaled to. */
  async function toPage(spot: Spot) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    return { x: box.x + spot.x * scale, y: box.y + spot.y * scale };
  }

  async function tap(spot: Spot) {
    const p = await toPage(spot);
    await page.mouse.click(p.x, p.y);
    await wait(STEP_MS);
  }

  /** Presses on `from`, slides over to `to` a frame at a time and lets go, like a finger. */
  async function drag(from: Spot, to: Spot, midway?: () => Promise<unknown>) {
    const a = await toPage(from);
    const b = await toPage(to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await wait(STEP_MS);
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
      await wait(FRAME_MS);
      if (i === 6) await midway?.();
    }
    await page.mouse.up();
    await wait(STEP_MS);
  }

  // A new smithy: no coins, every anvil empty, nobody at the counter yet.
  let s = await game.state();
  expect(s).toMatchObject({ coins: 0, sold: 0, bestTier: 0, adventurers: [] });
  expect(s.slots.every((t) => t === null)).toBe(true);
  const spots = await game.spots();

  // The first adventurer walks up to the counter and asks for an Iron Shortsword.
  s = await until('the first adventurer', (s) => s.adventurers.length > 0, 5_000);
  const buyer = s.adventurers[0];
  expect(buyer).toMatchObject({ desk: 0, wants: FIRST_ORDER });

  // Tapping Forge makes a Rusty Dagger on the first anvil; the forge then has to heat up again.
  await tap(spots.forge);
  s = await game.state();
  expect(s.slots[0]).toBe(1);
  expect(s.heatMs).toBeGreaterThan(0);
  await tap(spots.forge);
  expect((await game.state()).slots[1], 'no second sword while the forge heats').toBeNull();
  await until('the forge is hot again', (s) => s.heatMs === 0, 5_000);
  await tap(spots.forge);
  s = await game.state();
  expect(s.slots.slice(0, 3)).toEqual([1, 1, null]);
  await wait(500);
  await snap('0-forged');

  // Dragging one dagger onto the other merges them into an Iron Shortsword.
  await drag(spots.slots[1], spots.slots[0], () => snap('1-dragging'));
  s = await game.state();
  expect(s.slots.slice(0, 2)).toEqual([FIRST_ORDER, null]);
  expect(s.bestTier).toBe(FIRST_ORDER);
  await wait(500);
  await snap('2-merged');

  // Dragging the Shortsword onto the adventurer sells it: they pay its price and leave.
  await drag(spots.slots[0], spots.desks[buyer.desk]);
  s = await game.state();
  expect(s.slots[0]).toBeNull();
  expect(s).toMatchObject({ coins: SHORTSWORD_PRICE, sold: 1, walkedOff: 0 });
  expect(s.adventurers.some((a) => a.id === buyer.id)).toBe(false);
  await wait(400);
  await snap('3-sold');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
