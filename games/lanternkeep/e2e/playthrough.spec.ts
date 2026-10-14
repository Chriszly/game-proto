import { expect, test, type Page } from '@playwright/test';

// Plays the first night with real inputs: taps a lantern so a moth flies out and lights it, watches
// its oil run dry, then taps the lanterns again late in the dusk so they are all lit when night
// falls, which pays coins and opens the night panel.
// Game state is only read, through the `game` object the dev build puts on window.

interface Lantern {
  x: number;
  y: number;
  lit: boolean;
  oilMs: number;
  claimed: boolean;
}
interface Moth {
  kind: 'fast' | 'slow' | 'heavy';
  x: number;
  y: number;
  task: 'idle' | 'out' | 'lighting' | 'home';
  target: number;
}
interface GameState {
  night: number;
  phase: 'dusk' | 'night' | 'over';
  duskMs: number;
  coins: number;
  lives: number;
  lanterns: Lantern[];
  moths: Moth[];
  queue: number[];
  report: { lit: number; count: number; required: number; earned: number; lostHearth: boolean } | null;
  kept: number;
}

const VIEW = { w: 960, h: 540 };
/** The first night's numbers, from src/game/state.ts (on Normal). */
const DUSK_MS = 45_000;
const LANTERNS = 5;
const REQUIRED = 3;
const MOTHS = 3;
const LIVES = 3;
const BURN_MS = 20_000;
/** Every lantern lit pays 5 coins each and a 10 coin bonus. */
const ALL_LIT_PAY = LANTERNS * 5 + 10;

/** Game time per animation frame, every frame the same length. */
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
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify(s.state))),
    /** True once the night panel is showing. */
    panelOpen: () => read<boolean>((s) => s.panelOpen),
  };
}

test('plays the first night', async ({ page }, testInfo) => {
  // Seeded like the other games' tests, so any randomness added later repeats from run to run.
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
  // animation frame at a time, so the dusk plays the same on a slow runner as on a fast one.
  const start = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1_000));
  await page.addInitScript((frameMs) => {
    window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), frameMs);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    // Phaser falls back to its canvas renderer, as CI has no GPU; the game looks the same either way.
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/i.test(id) ? null : getContext.call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  }, FRAME_MS);
  await page.goto('/games/lanternkeep/');
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
  /** Plays until `done` holds on the game state, failing with `what` and the state if it never does. */
  async function until(what: string, ms: number, done: (s: GameState) => boolean) {
    const ok = await play(ms, async () => done(await game.state()));
    expect(ok, `${what}; state: ${JSON.stringify(await game.state())}`).toBe(true);
  }

  expect(
    await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game')?.state)),
    'game started',
  ).toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** Where a point in the 960x540 view is on the page. */
  async function onPage(x: number, y: number) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    return { x: box.x + x * scale, y: box.y + y * scale };
  }
  /** Taps lantern `i`, as a player would, then lets a frame play. */
  async function tapLantern(i: number) {
    const l = (await game.state()).lanterns[i];
    const at = await onPage(l.x, l.y);
    await page.mouse.click(at.x, at.y);
    await play(FRAME_MS, async () => false);
  }
  const busy = (s: GameState) => s.moths.filter((m) => m.task !== 'idle').length;

  // The first dusk: five dark lanterns, three moths in the jar, three hearths and no coins.
  let s = await game.state();
  expect(s).toMatchObject({ night: 1, phase: 'dusk', coins: 0, lives: LIVES, kept: 0 });
  expect(s.duskMs).toBeGreaterThan(DUSK_MS - 1_000);
  expect(s.lanterns).toHaveLength(LANTERNS);
  expect(s.lanterns.every((l) => !l.lit)).toBe(true);
  expect(s.moths).toHaveLength(MOTHS);
  expect(s.moths.map((m) => m.kind)).toEqual(['fast', 'slow', 'heavy']);
  expect(s.queue).toEqual([]);
  expect(busy(s)).toBe(0);
  await snap('0-dusk');

  // A tap on a lantern sends one moth; a second tap on it sends no other.
  await tapLantern(0);
  s = await game.state();
  expect(busy(s), 'one moth sent').toBe(1);
  expect(s.lanterns[0].claimed).toBe(true);
  await tapLantern(0);
  expect(busy(await game.state()), 'still one moth').toBe(1);
  await until('moth lights lantern 0', 10_000, (s) => s.lanterns[0].lit);
  s = await game.state();
  expect(s.lanterns[0].oilMs).toBeGreaterThan(BURN_MS - 1_000);
  await snap('1-first-lantern');
  await until('moth flies home', 10_000, (s) => busy(s) === 0);

  // Its oil runs dry and it goes out well before night falls.
  await until('lantern 0 burns out', BURN_MS + 1_000, (s) => !s.lanterns[0].lit);
  s = await game.state();
  expect(s.phase).toBe('dusk');

  // Late in the dusk, light them all so they still burn at nightfall: three moths go at once. The
  // taps for lanterns 3 and 4 find every moth busy, so they wait in the queue, and a moth takes
  // each one as it comes home. A tap on a lantern a moth is already flying to is ignored.
  await until('16s of dusk left', DUSK_MS, (s) => s.duskMs <= 16_000);
  for (const i of [0, 1, 2]) await tapLantern(i);
  expect(busy(await game.state()), 'every moth out').toBe(MOTHS);
  await tapLantern(3);
  s = await game.state();
  expect(s.queue, 'tap kept in the queue').toEqual([3]);
  expect(s.lanterns[3].claimed, 'not claimed until a moth takes it').toBe(false);
  await tapLantern(4);
  expect((await game.state()).queue, 'second tap kept').toEqual([3, 4]);
  await tapLantern(2);
  expect((await game.state()).queue, 'tap on a claimed lantern ignored').toEqual([3, 4]);
  await until('every lantern lit', 12_000, (s) => s.lanterns.every((l) => l.lit));
  s = await game.state();
  expect(s.queue, 'queue emptied').toEqual([]);
  expect(s.phase).toBe('dusk');
  await snap('2-all-lit');

  // Night falls with every lantern lit: they pay, the bonus too, and no hearth goes out.
  await until('night falls', 16_000, (s) => s.phase === 'night');
  s = await game.state();
  expect(s.report).toEqual({ lit: LANTERNS, count: LANTERNS, required: REQUIRED, earned: ALL_LIT_PAY, lostHearth: false });
  expect(s).toMatchObject({ coins: ALL_LIT_PAY, lives: LIVES, kept: 1 });
  expect(await play(3_000, () => game.panelOpen()), 'night panel opens').toBe(true);
  await snap('3-night');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
