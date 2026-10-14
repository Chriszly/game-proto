import { expect, test, type Page } from '@playwright/test';

// Plays the first round of a match with real inputs: picks the Warden, buys a Long Sword at the
// shop, walks down the middle lane, casts Slam at the first red tower on that lane and brings it
// down, which is the match's first objective. Then it clears the jungle camp the next objective
// marks, last-hits a gold-outlined minion in the middle lane and, on reaching level 2, picks the
// first upgrade card. Game state is only read, through the `game` object the dev build puts on
// window.

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
  xp: number;
  gold: number;
  items: string[];
  upgrades: string[];
  target: number | null;
  moveTo: { x: number; y: number } | null;
  cds: Record<'Q' | 'W' | 'E' | 'R', number>;
}
interface GameState {
  phase: 'pick' | 'playing' | 'won' | 'lost';
  time: number;
  winner: 'blue' | 'red' | null;
  units: Unit[];
  objective: { kind: 'tower' | 'camp' | 'champion'; target: number; title: string; gold: number; banner: string | null; startAt: number; endsAt: number } | null;
  objectivesDone: number;
  lastObjective: { title: string; done: boolean; gold: number; at: number } | null;
  siegeUntil: number;
  lastHitMark: number | null;
  lastHits: number;
  streak: number;
  bestStreak: number;
  upgradeOffers: { level: number; options: [string, string] }[];
}

const VIEW = { w: 960, h: 540 };
/** The map area between the top and bottom bars, in view pixels. */
const MAP_TOP = 34;
const MAP_BOTTOM = 412;
/** The objective card at the top left of the map, which takes clicks (layout.ts OBJECTIVE_CARD). */
const OBJECTIVE_CARD = { x: 10, y: 42, w: 236, h: 62 };
/** The first upgrade card in the bottom bar (the centre of layout.ts upgradeCard(0)). */
const UPGRADE_CARD_1 = { x: 698, y: 461 };
/** The Warden's card on the pick screen (its centre). */
const WARDEN_CARD = { x: 120, y: 263 };
/** The Long Sword's row in the shop, opened from the B key. */
const SWORD_ROW = { x: 334, y: 129 };
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
    const c = OBJECTIVE_CARD;
    const onCard = v.x >= c.x - 4 && v.x <= c.x + c.w + 4 && v.y >= c.y - 4 && v.y <= c.y + c.h + 4;
    return v.x >= 0 && v.x <= VIEW.w && v.y >= MAP_TOP && v.y <= MAP_BOTTOM && !onCard;
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

  // The match opens with an objective: topple the red mid tower within 2:30 for 200 gold and the
  // siege banner. Its target is the tower this round brings down.
  expect(s.objective?.kind, 'first objective is a tower').toBe('tower');
  expect(s.objective?.title).toBe('Topple the red mid tower');
  expect(s.objective?.target, 'objective marks the red mid tower').toBe(tower().id);
  expect(s.objective!.endsAt - s.objective!.startAt).toBe(150_000);
  expect(s.objective?.gold).toBe(200);

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

  /** Clicks the ground at a point along the way from `p` to `t` that is on the map. */
  async function walkToward(p: { x: number; y: number }, t: { x: number; y: number }) {
    const len = Math.max(dist(p, t), 1);
    for (const reach of [200, 150, 100, 60]) {
      const c = { x: p.x + ((t.x - p.x) / len) * Math.min(reach, len), y: p.y + ((t.y - p.y) / len) * Math.min(reach, len) };
      if (await onMap(c.x, c.y)) {
        await clickWorld(c.x, c.y);
        return;
      }
    }
  }

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
      await walkToward(p, t);
    }
    await tick(STEP_MS);
  }

  s = await state();
  expect(tower().dead, `red mid tower down; state: ${JSON.stringify(me())}`).toBe(true);
  expect(usedSlam, 'Slam cast on the tower').toBe(true);
  expect(s.phase, 'match not over yet').toBe('playing');
  await tick(STEP_MS);
  s = await state();
  // The objective is done: 200 gold paid and the siege banner raised.
  expect(s.objectivesDone, 'tower objective done').toBe(1);
  expect(s.lastObjective, 'tower objective paid').toMatchObject({ title: 'Topple the red mid tower', done: true, gold: 200 });
  expect(s.siegeUntil, 'siege banner up').toBeGreaterThan(s.time);
  await snap('2-tower-down');

  // The next objective comes a few seconds later: clear the jungle camp nearest the Warden.
  expect(await play(10_000, async () => (await state()).objective !== null), 'second objective').toBe(true);
  s = await state();
  expect(s.objective?.kind, 'second objective is a camp').toBe('camp');
  const campId = s.objective!.target;
  const camp = () => s.units.find((u) => u.id === campId)!;
  const goldBeforeCamp = me().gold;
  while ((await state()).time < ROUND_LIMIT_MS && !camp().dead) {
    s = await state();
    const p = me();
    const c = camp();
    if (p.dead) {
      await tick(STEP_MS);
      continue;
    }
    if (p.target !== c.id && dist(p, c) < 330 && (await onMap(c.x, c.y))) await clickWorld(c.x, c.y);
    else if (p.target !== c.id && p.moveTo === null) await walkToward(p, c);
    await tick(STEP_MS);
  }
  await tick(STEP_MS);
  s = await state();
  expect(camp().dead, `camp cleared; state: ${JSON.stringify(me())}`).toBe(true);
  expect(s.objectivesDone, 'camp objective done').toBe(2);
  expect(me().gold - goldBeforeCamp, 'camp and objective gold').toBeGreaterThanOrEqual(80 + 120);

  // Farm the nearest lane: walk to the nearest red minion and click whichever one is outlined in
  // gold, the one the Warden's next hit kills, until a last hit lands and the Warden reaches level 2.
  while ((await state()).time < ROUND_LIMIT_MS) {
    s = await state();
    if (s.lastHits > 0 && s.upgradeOffers.length > 0) break;
    const p = me();
    if (p.dead) {
      await tick(STEP_MS);
      continue;
    }
    const mark = s.lastHitMark === null ? undefined : s.units.find((u) => u.id === s.lastHitMark);
    if (mark && p.target !== mark.id && (await onMap(mark.x, mark.y))) {
      await clickWorld(mark.x, mark.y);
    } else if (!mark && p.moveTo === null) {
      const foes = s.units.filter((u) => u.kind === 'minion' && u.side === 'red' && !u.dead);
      const near = foes.sort((a, b) => dist(p, a) - dist(p, b))[0];
      // Wait in reach of the nearest red minion, or walk up the middle lane toward the next wave.
      const goal = near ?? { x: 1700, y: 520 };
      if (dist(p, goal) > p.range + 40) await walkToward(p, goal);
    }
    await tick(STEP_MS);
  }
  s = await state();
  expect(s.lastHits, `a last hit; state: ${JSON.stringify({ time: s.time, me: me() })}`).toBeGreaterThanOrEqual(1);
  // Each last hit grows the streak the chip by the gold counter shows.
  expect(s.bestStreak, 'last-hit streak').toBeGreaterThanOrEqual(1);
  expect(me().level, 'level 2').toBe(2);

  // Level 2 offers two upgrades to Slam in the bottom bar: Wide Slam is the first card.
  expect(s.upgradeOffers[0], 'upgrade offer at level 2').toEqual({ level: 2, options: ['wide-slam', 'stun-slam'] });
  await snap('3-upgrade');
  await clickView(UPGRADE_CARD_1.x, UPGRADE_CARD_1.y);
  await tick(FRAME_MS);
  s = await state();
  expect(me().upgrades, 'Wide Slam chosen').toEqual(['wide-slam']);
  expect(s.upgradeOffers, 'no offer left').toEqual([]);
  expect(s.phase, 'match still playing').toBe('playing');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
