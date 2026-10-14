import { expect, test, type Page } from '@playwright/test';

// Plays the first round on the island the seeded Math.random picks, with real inputs: taps a tile button to pick a building, hovers a cell to
// see what it would score, taps cells to place farms, houses and a tower, and reaches the round's
// goal, which brings round 2 and its tiles.
// Game state is only read, through the `game` object the dev build puts on window.

type Building = 'farm' | 'house' | 'tower';
type Cell = 'grass' | 'lake' | 'forest' | Building;
interface GameState {
  round: number;
  goal: number;
  score: number;
  pouch: Record<Building, number>;
  selected: Building | null;
  grid: Cell[][];
  placed: number;
  phase: 'playing' | 'over';
  best: number;
  island: number;
}
type TileButton = { kind: Building; x: number; y: number; w: number; h: number };

const VIEW = { w: 960, h: 540 };
/** The board, from src/scenes/layout.ts. */
const GRID = { x: 24, y: 46, cols: 10, rows: 7, cell: 64 };
/** The first round's tiles and goal, and what round 2 adds and asks, from src/game/state.ts. */
const FIRST_POUCH = { farm: 4, house: 4, tower: 2 };
const ROUND_POUCH = { farm: 3, house: 3, tower: 2 };
const GOALS = [20, 45];

/**
 * The island the seeded Math.random below picks, as islandMap in src/game/tiles.ts lays it out:
 * '.' grass, '~' lake, 'T' forest. Islands are random; the seed makes this run's the same each time.
 */
const ISLAND = 1990;
const MAP = [
  '.......TT.',
  '........T.',
  '~~...T....',
  '.~...T....',
  'TT...~~~..',
  '...~~.~...',
  '...~......',
];
const TERRAIN: Record<string, Cell> = { '.': 'grass', '~': 'lake', T: 'forest' };

/**
 * The first round's plan, as (col, row) cells on MAP, with what each placement adds to the score
 * under the rules in src/game/state.ts:
 * a farm scores 1 and 1 per lake beside it; a house 2 per farm, 1 per house or forest beside it;
 * a tower 2 per house in the eight cells around it.
 */
const PLAN: { kind: Building; col: number; row: number; gained: number; why: string }[] = [
  { kind: 'farm', col: 5, row: 5, gained: 4, why: 'three lakes beside it' },
  { kind: 'farm', col: 4, row: 4, gained: 3, why: 'two lakes beside it' },
  { kind: 'house', col: 4, row: 3, gained: 3, why: 'the farm below it and the forest beside it' },
  { kind: 'house', col: 3, row: 4, gained: 2, why: 'the farm beside it' },
  { kind: 'house', col: 3, row: 3, gained: 4, why: 'two houses beside it, which each gain a house' },
  { kind: 'tower', col: 2, row: 4, gained: 4, why: 'two houses around it' },
];

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
    /** The cell the pointer is over and what the selected building would add there. */
    preview: () => read<{ col: number; row: number; gained: number } | null>((s) => s.preview),
    /** Where the tile buttons are on screen. */
    buttons: () => read<TileButton[]>((s) => s.tileButtons),
  };
}

test('plays the first round', async ({ page }, testInfo) => {
  // Seeded like the other games' tests, so the game picks the same island (ISLAND) on every run.
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
  // animation frame at a time, so the popups play the same on a slow runner as on a fast one.
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
  await page.goto('/games/tiny-kingdom/');
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
  const cellPoint = (col: number, row: number) => onPage(GRID.x + (col + 0.5) * GRID.cell, GRID.y + (row + 0.5) * GRID.cell);

  /** Taps a point, as a player would, then lets a few frames play. */
  async function tap(at: { x: number; y: number }) {
    await page.mouse.click(at.x, at.y);
    await play(STEP_MS, async () => false);
  }
  async function pick(kind: Building) {
    const button = (await game.buttons()).find((b) => b.kind === kind)!;
    await tap(await onPage(button.x, button.y));
    expect((await game.state()).selected, `${kind} picked`).toBe(kind);
  }

  // A new kingdom on a random island: round 1, no score, the first round's tiles and nothing built yet.
  let s = await game.state();
  expect(s).toMatchObject({ round: 1, goal: GOALS[0], score: 0, pouch: FIRST_POUCH, selected: null, placed: 0, phase: 'playing' });
  expect(s.island, 'the island the seeded Math.random picks').toBe(ISLAND);
  expect(s.grid, `island ${ISLAND} laid out as MAP`).toEqual(MAP.map((row) => [...row].map((c) => TERRAIN[c])));
  await snap('0-start');

  // Picking the farm and hovering a cell shows what it would score there, without placing it.
  const first = PLAN[0];
  await pick(first.kind);
  const firstCell = await cellPoint(first.col, first.row);
  await page.mouse.move(firstCell.x, firstCell.y);
  await play(STEP_MS, async () => false);
  expect(await game.preview(), 'preview of the first farm').toEqual({ col: first.col, row: first.row, gained: first.gained });
  expect((await game.state()).score).toBe(0);
  await snap('1-preview');

  // Buildings only go on grass: a tap on a lake places nothing.
  await tap(await cellPoint(0, 2));
  s = await game.state();
  expect(s.grid[2][0]).toBe('lake');
  expect(s).toMatchObject({ score: 0, placed: 0, pouch: FIRST_POUCH });

  // Each placement adds what its neighbours are worth, and takes a tile from the pouch.
  let score = 0;
  const pouch = { ...FIRST_POUCH };
  for (const [i, step] of PLAN.entries()) {
    if ((await game.state()).selected !== step.kind) await pick(step.kind);
    await tap(await cellPoint(step.col, step.row));
    s = await game.state();
    score += step.gained;
    pouch[step.kind]--;
    expect(s.grid[step.row][step.col], `placement ${i + 1}`).toBe(step.kind);
    expect(s.score, `score after the ${step.kind} at ${step.col},${step.row}: ${step.why}`).toBe(score);
    expect(s.placed).toBe(i + 1);
    if (score < GOALS[0]) expect(s).toMatchObject({ round: 1, pouch });
  }

  // The tower reached the goal: round 2 begins with a higher goal and its tiles added to what is left.
  expect(score).toBeGreaterThanOrEqual(GOALS[0]);
  expect(s).toMatchObject({
    round: 2,
    goal: GOALS[1],
    phase: 'playing',
    pouch: { farm: pouch.farm + ROUND_POUCH.farm, house: pouch.house + ROUND_POUCH.house, tower: pouch.tower + ROUND_POUCH.tower },
  });
  await snap('2-round-2');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
