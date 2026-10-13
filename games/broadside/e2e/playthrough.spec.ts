import { expect, test, type Page } from '@playwright/test';

// Plays the first wave with real inputs: the helm buttons are held down to steer, as a thumb would
// on a phone, the broadsides fire on their own when an enemy is off either side, sunk ships leave
// loot to sail over, and the harbor opens once the wave is beaten, where one upgrade is bought
// before setting sail for wave 2.
// Game state is only read, through the `game` object the dev build puts on window.

interface Ship { id: number; kind: string; x: number; y: number; heading: number; hp: number; maxHp: number }
interface GameState {
  phase: 'break' | 'fighting' | 'harbor' | 'over';
  wave: number;
  toSpawn: string[];
  player: Ship;
  helm: number;
  enemies: Ship[];
  balls: { fromPlayer: boolean }[];
  loot: { x: number; y: number; gold: number }[];
  gold: number;
  plundered: number;
  sunk: number;
  ranks: Record<string, number>;
  bestWave: number;
}
type Button = { id: string; x: number; y: number; w: number; h: number };

const VIEW = { w: 960, h: 540 };
/** The helm buttons' centres, from src/scenes/layout.ts. */
const HELM = { port: { x: 86, y: 456 }, starboard: { x: 874, y: 456 } };
/** Wave 1 is two sloops, from src/game/waves.ts; each leaves 10 gold, from src/game/ships.ts. */
const WAVE_1 = ['sloop', 'sloop'];
const SLOOP_LOOT = 10;
/** The player's hull and Heavy Shot's first price, from src/game/state.ts and upgrades.ts. */
const HULL = 120;
const HEAVY_SHOT = 15;
/** How close a broadside's target must be, from PLAYER in state.ts, less a margin. */
const CLOSE_IN = 220;

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

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const bearing = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.y - from.y, to.x - from.x);
const nearest = <T extends { x: number; y: number }>(from: { x: number; y: number }, items: T[]) =>
  [...items].sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];

/**
 * Where to point the bow: sail at the nearest enemy, then turn side-on to it so a broadside bears,
 * whichever side is the shorter turn. With no enemy left, sail for the nearest loot.
 */
function course(s: GameState): number | null {
  const p = s.player;
  const enemy = nearest(p, s.enemies);
  if (enemy) {
    const b = bearing(p, enemy);
    if (Math.hypot(enemy.x - p.x, enemy.y - p.y) > CLOSE_IN) return b;
    const starboard = b - Math.PI / 2;
    const port = b + Math.PI / 2;
    return Math.abs(wrap(starboard - p.heading)) < Math.abs(wrap(port - p.heading)) ? starboard : port;
  }
  const loot = nearest(p, s.loot);
  return loot ? bearing(p, loot) : null;
}

function scene(page: Page) {
  const read = <T>(fn: (s: any) => T) =>
    page.evaluate(`(${fn.toString()})(window.game.scene.getScene('Game'))`) as Promise<T>;
  return {
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify(s.state))),
    /** Where the harbor's buttons are on screen, and what each does. */
    harbor: () => read<Button[]>((s) => s.harbor.buttons),
  };
}

test('plays the first wave', async ({ page }, testInfo) => {
  // A seeded Math.random keeps where the enemy ships appear the same from run to run.
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
    // Phaser falls back to its canvas renderer. CI has no GPU, and WebGL in software is too slow to
    // play at SPEED; the game, its rules and the art are the same either way.
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/i.test(id) ? null : getContext.call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  }, FRAME_MS);
  await page.goto('/games/broadside/');
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

  /** A point in the game's 960x540 view, on the page. */
  async function onPage(x: number, y: number) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    return { x: box.x + x * scale, y: box.y + y * scale };
  }

  /** Holds down a helm button (or lets go, for 0), as a thumb on a phone would. */
  let held = 0;
  async function helm(dir: -1 | 0 | 1) {
    if (dir === held) return;
    if (held) await page.mouse.up();
    held = dir;
    if (!dir) return;
    const at = await onPage(...(Object.values(dir < 0 ? HELM.port : HELM.starboard) as [number, number]));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
  }

  /**
   * Plays on until `check` holds, for up to `ms` of game time, steering by the helm buttons along
   * `course` when given one.
   */
  async function until(what: string, check: (s: GameState) => boolean, ms = 30_000, steer?: (s: GameState) => number | null) {
    let state = await game.state();
    const ok = await play(ms, async () => {
      state = await game.state();
      if (check(state)) return true;
      if (!steer) return false;
      const want = steer(state);
      if (want === null) await helm(0);
      else {
        const diff = wrap(want - state.player.heading);
        await helm(Math.abs(diff) < 0.12 ? 0 : diff < 0 ? -1 : 1);
      }
      return false;
    });
    if (!ok) {
      const { enemies, player, ...rest } = state;
      throw new Error(`Timed out after ${ms}ms of game time waiting for: ${what}\n` +
        `Player ${JSON.stringify(player)}, enemies ${JSON.stringify(enemies.map((e) => [e.kind, Math.round(e.x), Math.round(e.y), e.hp]))}, state ${JSON.stringify(rest)}`);
    }
    return state;
  }

  /** Taps a harbor button, as a player would. */
  async function tap(button: Button) {
    const at = await onPage(button.x, button.y);
    await page.mouse.click(at.x, at.y);
    await play(STEP_MS, async () => false);
  }

  // A new voyage: wave 1 of two sloops on its way, a sound hull and an empty hold.
  let s = await game.state();
  expect(s).toMatchObject({ phase: 'break', wave: 1, gold: 0, sunk: 0, ranks: {}, helm: 0, enemies: [] });
  expect(s.toSpawn).toEqual(WAVE_1);
  expect(s.player.hp).toBe(HULL);

  // Holding the starboard button turns the ship to the right, letting go sails straight on, and
  // the port button turns it back to the left.
  const heading0 = s.player.heading;
  await helm(1);
  s = await until('turning to starboard', (s) => wrap(s.player.heading - heading0) > 0.5, 2_000);
  expect(s.helm).toBe(1);
  await helm(0);
  await play(STEP_MS, async () => false);
  s = await game.state();
  expect(s.helm).toBe(0);
  const heading1 = s.player.heading;
  await play(STEP_MS * 2, async () => false);
  expect((await game.state()).player.heading, 'straight on with the helm let go').toBeCloseTo(heading1, 5);
  await helm(-1);
  s = await until('turning to port', (s) => wrap(s.player.heading - heading1) < -0.5, 2_000);
  await helm(0);

  // The first enemy sloop comes over the horizon; close on it and turn side-on so a broadside bears.
  s = await until('the first sloop sighted', (s) => s.phase === 'fighting' && s.enemies.length > 0, 5_000);
  expect(s.enemies[0]).toMatchObject({ kind: 'sloop' });
  s = await until('a broadside fired', (s) => s.balls.some((b) => b.fromPlayer), 30_000, course);
  await snap('0-broadside');
  s = await until('an enemy hit', (s) => s.enemies.some((e) => e.hp < e.maxHp) || s.sunk > 0, 10_000, course);

  // A sunk ship leaves a barrel of loot floating behind.
  s = await until('a sloop sunk', (s) => s.sunk > 0, 60_000, course);
  expect(s.loot.length + (s.gold > 0 ? 1 : 0)).toBeGreaterThan(0);

  // Sink the other and sail over the loot: each barrel adds its gold to the hold. The harbor opens
  // once no ship or loot is left.
  s = await until('first loot picked up', (s) => s.gold > 0, 60_000, course);
  expect(s.gold).toBe(SLOOP_LOOT);
  await snap('1-loot');
  s = await until('wave 1 beaten', (s) => s.phase === 'harbor', 90_000, course);
  await helm(0);
  expect(s).toMatchObject({ wave: 1, sunk: 2, gold: 2 * SLOOP_LOOT, plundered: 2 * SLOOP_LOOT, bestWave: 1, enemies: [], loot: [] });
  expect(s.player.hp).toBeGreaterThan(0);
  await play(STEP_MS, async () => false);
  await snap('2-harbor');

  // At the harbor, buy Heavy Shot with the plunder, then set sail for wave 2.
  const buttons = await game.harbor();
  await tap(buttons.find((b) => b.id === 'shot')!);
  s = await game.state();
  expect(s.ranks).toEqual({ shot: 1 });
  expect(s.gold).toBe(2 * SLOOP_LOOT - HEAVY_SHOT);
  await tap(buttons.find((b) => b.id === 'sail')!);
  s = await game.state();
  expect(s).toMatchObject({ phase: 'break', wave: 2 });
  expect(s.toSpawn.length).toBeGreaterThan(WAVE_1.length);

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
