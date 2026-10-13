import { expect, test, type Page } from '@playwright/test';

// Plays the first stage with real inputs: the knight runs on their own, and the test taps the top
// half of the screen to jump the spikes and pits and the bottom half to slide under the blades, as
// on a phone, picking up coins on the way. At the checkpoint the run waits on two boons; the test
// taps the first and checks it was taken and the second stage has begun.
// Game state is only read, through the `game` object the dev build puts on window.

type TrapKind = 'spikes' | 'pit' | 'blade';
interface GameState {
  stage: number;
  phase: 'running' | 'checkpoint' | 'over';
  distance: number;
  speed: number;
  runner: { h: number; vh: number; slideMs: number; jumps: number; hurtMs: number };
  hearts: number;
  coins: number;
  hits: number;
  ranks: Record<string, number>;
  choices: string[] | null;
  checkpointX: number;
  traps: { id: number; kind: TrapKind; x: number; w: number }[];
  course: { id: number; x: number; h: number }[];
}
type Card = { id: string; x: number; y: number; w: number; h: number };

const VIEW = { w: 960, h: 540 };
/** Where to tap to jump (top half of the screen) and to slide (bottom half), from layout.ts. */
const JUMP_AT = { x: 720, y: 120 };
const SLIDE_AT = { x: 720, y: 470 };
/** Half the knight's width, from RUNNER in src/game/state.ts. */
const HALF_W = 14;
/** Stage 1: 3 hearts, running at 260 px/s, 3200 px to the checkpoint (state.ts). */
const STAGE_1 = { hearts: 3, speed: 260, checkpointX: 3200 };
/**
 * How close a trap's edge has to come before the test reacts: jump spikes and pits a little way
 * out, and slide just before a blade.
 */
const REACT = { jump: 60, slide: 40 };

/**
 * Game time per animation frame, every frame the same length. Longer frames mean fewer to draw, so
 * the game can play at SPEED on a CI runner without a GPU.
 */
const FRAME_MS = 64;
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
    /** Where the boon cards are on screen, and the boon each offers. */
    cards: () => read<Card[]>((s) => s.boonCards.cards),
  };
}

test('plays the first stage', async ({ page }, testInfo) => {
  // A seeded Math.random keeps the course and the boons offered the same from run to run.
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
  // animation frame at a time, so the run plays the same on a slow runner as on a fast one.
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
  await page.goto('/games/rogue-runner/');
  const game = scene(page);
  const canvas = page.locator('canvas');

  let gameMs = 0;
  let startedAt = 0;

  /**
   * Advances game time a frame at a time until `done` holds; returns false if `ms` ran out first.
   * Once the game has started, each frame waits until real time catches up with game time / SPEED.
   */
  async function play(ms: number, done: () => Promise<boolean>) {
    for (let t = 0; t <= ms; t += FRAME_MS) {
      if (await done()) return true;
      await page.clock.runFor(FRAME_MS);
      if (!startedAt) continue;
      gameMs += FRAME_MS;
      const ahead = gameMs / SPEED - (Date.now() - startedAt);
      if (ahead > 0) await new Promise((r) => setTimeout(r, ahead));
    }
    return done();
  }

  expect(
    await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game')?.state)),
    'game started',
  ).toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** Taps the screen at a point in game pixels, as a player would. */
  async function tap(at: { x: number; y: number }) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    await page.mouse.click(box.x + at.x * scale, box.y + at.y * scale);
  }

  // A new run: stage 1, full hearts, no coins or boons, the knight running from the start.
  let s = await game.state();
  expect(s).toMatchObject({ stage: 1, phase: 'running', hearts: STAGE_1.hearts, coins: 0, hits: 0, ranks: {}, choices: null });
  expect(s.speed).toBe(STAGE_1.speed);
  expect(s.checkpointX).toBe(STAGE_1.checkpointX);
  const kinds = new Set(s.traps.map((t) => t.kind));
  expect(kinds, 'stage 1 has spikes, pits and blades').toEqual(new Set(['spikes', 'pit', 'blade']));
  await play(1_000, async () => false);
  s = await game.state();
  expect(s.distance, 'the knight runs on their own').toBeGreaterThan(200);

  // Run the stage: jump each spike row and pit, slide under each blade. Every trap is passed
  // without a hit, and each jump and slide shows in the knight's state.
  const passed = { spikes: 0, pit: 0, blade: 0 };
  let highest = 0;
  let slid = false;
  let snapped = false;
  const acted = new Set<number>();
  const ok = await play(20_000, async () => {
    s = await game.state();
    if (s.phase !== 'running') return true;
    highest = Math.max(highest, s.runner.h);
    slid ||= s.runner.slideMs > 0;
    const front = s.distance + HALF_W;
    const next = s.traps.find((t) => t.x + t.w > s.distance - HALF_W);
    for (const t of s.traps) if (t.x + t.w < s.distance - HALF_W && acted.has(t.id)) {
      passed[t.kind] += 1;
      acted.delete(t.id);
    }
    if (!next || acted.has(next.id)) return false;
    const gap = next.x - front;
    const grounded = s.runner.h <= 0;
    if (next.kind === 'blade' ? gap <= REACT.slide && grounded : gap <= REACT.jump && grounded) {
      acted.add(next.id);
      await tap(next.kind === 'blade' ? SLIDE_AT : JUMP_AT);
    }
    if (!snapped && s.runner.h > 60) {
      snapped = true;
      await snap('0-jump');
    }
    return false;
  });
  expect(ok, `reached the checkpoint; state ${JSON.stringify({ ...s, traps: undefined, course: undefined })}`).toBe(true);
  expect(s.phase).toBe('checkpoint');
  expect(s.hits, 'every trap dodged').toBe(0);
  expect(s.hearts).toBe(STAGE_1.hearts);
  expect(highest, 'a jump lifts the knight clear of the spikes').toBeGreaterThan(100);
  expect(slid, 'the knight slid').toBe(true);
  expect(passed.spikes + passed.pit, 'spikes and pits jumped').toBeGreaterThan(0);
  expect(passed.blade, 'blades slid under').toBeGreaterThan(0);
  expect(s.coins, 'coins picked up on the way').toBeGreaterThan(0);

  // At the checkpoint the run waits on a choice of two different boons.
  expect(s.distance).toBe(STAGE_1.checkpointX);
  expect(s.choices).toHaveLength(2);
  expect(new Set(s.choices).size).toBe(2);
  const cards = await game.cards();
  expect(cards.map((c) => c.id)).toEqual(s.choices);
  await play(1_000, async () => false);
  expect((await game.state()).distance, 'the run waits for the pick').toBe(STAGE_1.checkpointX);
  await snap('1-checkpoint');

  // Tapping a card takes its boon, and stage 2 starts, a little faster.
  const choice = cards[0].id;
  const coins = s.coins;
  await tap(cards[0]);
  await play(FRAME_MS, async () => false);
  s = await game.state();
  expect(s.ranks).toEqual({ [choice]: 1 });
  expect(s).toMatchObject({ stage: 2, phase: 'running', choices: null, coins });
  expect(s.speed).toBeGreaterThan(STAGE_1.speed);
  expect(s.checkpointX).toBeGreaterThan(STAGE_1.checkpointX);
  expect(s.traps.some((t) => t.x > STAGE_1.checkpointX), 'stage 2 laid out').toBe(true);
  await play(1_000, async () => false);
  s = await game.state();
  expect(s.distance, 'running again').toBeGreaterThan(STAGE_1.checkpointX + 200);
  await snap('2-stage-2');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
