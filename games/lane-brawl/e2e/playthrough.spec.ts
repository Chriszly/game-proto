import { expect, test, type Page } from '@playwright/test';

// Plays the first round of a match with real inputs: picks the Warden, buys a Long Sword at the
// shop, walks down the middle lane, casts Slam at the first red tower on that lane and brings it
// down. Game state is only read, through the `game` object the dev build puts on window.

interface Unit {
  id: number;
  kind: 'champion' | 'minion' | 'tower' | 'nexus' | 'camp';
  side: 'blue' | 'red' | 'neutral';
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  range: number;
  dead: boolean;
  player: boolean;
  level: number;
  gold: number;
  items: string[];
  target: number | null;
  moveTo: { x: number; y: number } | null;
  cds: Record<'Q' | 'W' | 'E' | 'R', number>;
}
interface GameState {
  phase: 'pick' | 'playing' | 'won' | 'lost';
  time: number;
  winner: 'blue' | 'red' | null;
  units: Unit[];
}

const VIEW = { w: 960, h: 540 };
/** The map area between the top and bottom bars, in view pixels. */
const MAP_TOP = 34;
const MAP_BOTTOM = 412;
/** The Warden's card on the pick screen (its centre). */
const WARDEN_CARD = { x: 120, y: 263 };
/** The Long Sword's row in the shop, opened from the B key. */
const SWORD_ROW = { x: 520, y: 180 };
/** The first red tower on the middle lane. */
const RED_MID_TOWER = { x: 1576, y: 584 };
/** Game time the round may take before the test gives up. */
const ROUND_LIMIT_MS = 240_000;

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
    state: () => read<GameState | null>((s) => JSON.parse(JSON.stringify(s.state))),
    camera: () => read<{ x: number; y: number }>((s) => ({ x: s.cameras.main.scrollX, y: s.cameras.main.scrollY })),
  };
}

test('plays the first round', async ({ page }, testInfo) => {
  // Seeded like the other games' tests. Lane Brawl draws no random numbers, so this only keeps
  // any randomness added later repeatable.
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
  // animation frame at a time, so a match plays the same on a slow runner as on a fast one.
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
  await page.goto('/games/lane-brawl/');
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
  /** Plays a little game time, letting the match and any pending clicks run. */
  const tick = (ms: number) => play(ms, async () => false);

  expect(
    await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game'))),
    'game started',
  ).toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  const box = async () => (await canvas.boundingBox())!;
  /** A point in the 960x540 view, on the page. */
  async function onPage(x: number, y: number) {
    const b = await box();
    const scale = b.width / VIEW.w;
    return { x: b.x + x * scale, y: b.y + y * scale };
  }
  /** Where a world point is in the view, given the camera. */
  async function onView(x: number, y: number) {
    const cam = await game.camera();
    return { x: x - cam.x, y: y - cam.y };
  }
  /** Whether a world point is in the map area, where a click reaches the map and not a bar. */
  async function onMap(x: number, y: number) {
    const v = await onView(x, y);
    return v.x >= 0 && v.x <= VIEW.w && v.y >= MAP_TOP && v.y <= MAP_BOTTOM;
  }
  async function clickView(x: number, y: number) {
    const at = await onPage(x, y);
    await page.mouse.click(at.x, at.y);
    await tick(FRAME_MS);
  }
  async function clickWorld(x: number, y: number) {
    const v = await onView(x, y);
    await clickView(v.x, v.y);
  }
  async function state() {
    return (await game.state())!;
  }
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  // The pick screen: the Warden starts the match.
  await tick(FRAME_MS);
  await snap('0-pick');
  await clickView(WARDEN_CARD.x, WARDEN_CARD.y);
  await tick(FRAME_MS);
  let s = await state();
  expect(s.phase, 'match playing').toBe('playing');
  const me = () => s.units.find((u) => u.player)!;
  const tower = () => s.units.find((u) => u.kind === 'tower' && u.side === 'red' && u.x === RED_MID_TOWER.x && u.y === RED_MID_TOWER.y)!;
  expect(me().items, 'no items at the start').toEqual([]);

  // The shop: a Long Sword from the base, opened and closed with B.
  await page.keyboard.press('b');
  await tick(FRAME_MS);
  await snap('1-shop');
  await clickView(SWORD_ROW.x, SWORD_ROW.y);
  await tick(FRAME_MS);
  s = await state();
  expect(me().items, 'Long Sword bought').toEqual(['sword']);
  await page.keyboard.press('b');
  await tick(FRAME_MS);

  // Walk down the middle lane toward the red tower, clicking the ground on the way and the tower
  // once in reach. Slam is cast when it is ready and the tower is inside its radius.
  let usedSlam = false;
  while ((await state()).time < ROUND_LIMIT_MS && !tower().dead) {
    s = await state();
    const p = me();
    const t = tower();
    if (p.dead) {
      await tick(STEP_MS);
      continue;
    }
    const d = dist(p, t) - t.radius;
    if (d <= p.range + 20) {
      if (p.target === null && (await onMap(t.x, t.y))) await clickWorld(t.x, t.y);
      if (p.cds.Q === 0 && d <= 170 && (await onMap(t.x, t.y))) {
        const v = await onView(t.x, t.y);
        const at = await onPage(v.x, v.y);
        await page.mouse.move(at.x, at.y);
        await page.keyboard.press('q');
        await tick(FRAME_MS);
        usedSlam = usedSlam || (await state()).units.find((u) => u.player)!.cds.Q > 0;
      }
    } else if (p.moveTo === null && p.target === null) {
      // A point along the way to the tower that is on the map, so the click lands on the ground.
      const len = dist(p, t);
      let point: { x: number; y: number } | null = null;
      for (const reach of [200, 150, 100, 60]) {
        const c = { x: p.x + ((t.x - p.x) / len) * reach, y: p.y + ((t.y - p.y) / len) * reach };
        if (await onMap(c.x, c.y)) {
          point = c;
          break;
        }
      }
      if (point) await clickWorld(point.x, point.y);
    }
    await tick(STEP_MS);
  }

  s = await state();
  expect(tower().dead, `red mid tower down; state: ${JSON.stringify(me())}`).toBe(true);
  expect(usedSlam, 'Slam cast on the tower').toBe(true);
  expect(s.phase, 'match not over yet').toBe('playing');
  await snap('2-tower-down');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
