import { expect, test, type Page } from '@playwright/test';

// Plays the first round with real inputs: the crystal harvesters mine and carry crystal home, the
// player raises a Barracks beside the hub, trains a Lancer from it, and sends the Lancer to attack
// the nearest enemy base. Game state is only read, through the `game` object the dev build puts on
// window.

interface Unit {
  id: number;
  faction: number;
  type: string;
  x: number;
  y: number;
}
interface Building {
  id: number;
  faction: number;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  done: boolean;
}
interface Side {
  crystal: number;
  alive: boolean;
}
interface Button {
  kind: 'build' | 'train';
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface GameState {
  phase: 'playing' | 'won' | 'lost';
  elapsedMs: number;
  units: Unit[];
  buildings: Building[];
  sides: Side[];
}

const VIEW = { w: 960, h: 540 };
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
/** The player's faction index, from src/game/world.ts. */
const PLAYER = 0;
/** The Lancer is the first combat unit of the Solar Concord, and the Barracks is 100 crystal. */
const START_CRYSTAL = 120;
const SCOUT_COST = 35;

function scene(page: Page) {
  const read = <T>(fn: (s: any) => T) =>
    page.evaluate(`(${fn.toString()})(window.game.scene.getScene('Game'))`) as Promise<T>;
  return {
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify(s.state))),
    buttons: () => read<Button[]>((s) => JSON.parse(JSON.stringify(s.buttons))),
    /** Whether a Barracks can go at (x, y) for the player, from the game's own placement rule. */
    canPlace: (x: number, y: number) =>
      page.evaluate(
        ({ x, y }) => (window as any).game.scene.getScene('Game').state.placementProblem('barracks', x, y) === null,
        { x, y },
      ) as Promise<boolean>,
  };
}

test('plays the first round', async ({ page }, testInfo) => {
  // Seeded like the other games' tests, so the map and the AI repeat from run to run.
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
  // animation frame at a time, so the battle plays the same on a slow runner as on a fast one.
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
  await page.goto('/games/space-wars/');
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
  /** Taps a point in the view, as a player would, then lets a frame play. */
  async function tap(x: number, y: number) {
    const at = await onPage(x, y);
    await page.mouse.click(at.x, at.y);
    await play(FRAME_MS, async () => false);
  }
  const button = async (kind: string, key: string) => {
    const b = (await game.buttons()).find((btn) => btn.kind === kind && btn.key === key)!;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };
  const mine = (s: GameState, type: string) => s.units.filter((u) => u.faction === PLAYER && u.type === type);
  const barracks = (s: GameState) => s.buildings.find((b) => b.faction === PLAYER && b.type === 'barracks');

  // The first frames: two harvesters at the hub, 120 crystal, no Barracks yet.
  let s = await game.state();
  expect(s.phase).toBe('playing');
  expect(s.sides[PLAYER].crystal).toBe(START_CRYSTAL);
  expect(mine(s, 'harvester')).toHaveLength(2);
  // A few frames first, so the start screenshot shows the map drawn.
  await play(FRAME_MS * 4, async () => false);
  await snap('playthrough-0-start');

  // The harvesters mine the nearest crystal and carry it home, so the bank grows past the start.
  await until('crystal harvested and carried home', 60_000, (st) => st.sides[PLAYER].crystal >= START_CRYSTAL + 30);
  s = await game.state();
  await snap('playthrough-1-harvest');

  // Raise a Barracks: arm the button, then tap a spot the game says is clear beside the hub.
  const hub = s.buildings.find((b) => b.faction === PLAYER && b.type === 'hub')!;
  await tap(...(Object.values(await button('build', 'barracks')) as [number, number]));
  let spot: { x: number; y: number } | null = null;
  for (let d = 70; d <= 200 && !spot; d += 10) {
    for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const x = hub.x + Math.cos((a * Math.PI) / 180) * d;
      const y = hub.y + Math.sin((a * Math.PI) / 180) * d;
      if (await game.canPlace(x, y)) {
        spot = { x, y };
        break;
      }
    }
  }
  expect(spot, 'a clear spot for a Barracks beside the hub').not.toBeNull();
  await tap(spot!.x, spot!.y);
  await until('barracks built', 30_000, (st) => !!barracks(st)?.done);
  await snap('playthrough-2-barracks');

  // Train a Lancer from the Barracks.
  s = await game.state();
  expect(s.sides[PLAYER].crystal).toBeGreaterThanOrEqual(SCOUT_COST);
  await tap(...(Object.values(await button('train', 'scout')) as [number, number]));
  await until('lancer trained', 20_000, (st) => mine(st, 'scout').length > 0);
  // The trained Lancer comes out of the Barracks, so the production line works.
  s = await game.state();
  expect(mine(s, 'scout')).toHaveLength(1);

  // Select the Lancer, then tap the nearest enemy base to attack it.
  const lancer = mine(s, 'scout')[0];
  await tap(lancer.x, lancer.y);
  const enemyHub = s.buildings
    .filter((b) => b.faction !== PLAYER)
    .reduce((best, b) => (Math.hypot(b.x - lancer.x, b.y - lancer.y) < Math.hypot(best.x - lancer.x, best.y - lancer.y) ? b : best));
  const enemyStart = enemyHub.hp;
  await tap(enemyHub.x, enemyHub.y);
  await until('the enemy base takes damage', 120_000, (st) => {
    const b = st.buildings.find((x) => x.id === enemyHub.id);
    return !b || b.hp < enemyStart;
  });
  await snap('playthrough-3-attack');

  s = await game.state();
  expect(s.phase, `battle still on; state: ${JSON.stringify(s)}`).toBe('playing');
  expect(errors, 'page errors').toEqual([]);
  const speed = gameMs / ((Date.now() - startedAt) || 1);
  console.log(`Played ${(s.elapsedMs / 1000).toFixed(0)}s of game time at ${speed.toFixed(1)}x`);
});
