import { expect, test, type Page } from '@playwright/test';

// Plays the first voyage with real inputs: the test taps fogged tiles next to the charted part of
// the island, as on a phone, nearest the surveyor first, while the supplies can pay for one (forests
// and peaks cost 2, rivers and roads are free), checking what each survey costs and what its finds
// add (a wreck's supplies, a cave's artifact, a storm's blocked tile). When nothing more can be paid
// for it heads back to port, and checks the chart adds up (tiles, commission, artifacts, unused
// supplies sold back and any isle milestone the voyage reached), taps Sell chart and checks the
// coins and the isle goal, then taps Set sail and checks the second voyage starts with full
// supplies on the same island. It pitches no camp, digs nothing and buys nothing at the harbor.
// Game state is only read, through the `game` object the dev build puts on window.

type Terrain = 'sea' | 'beach' | 'grass' | 'forest' | 'hills' | 'mountain' | 'river' | 'road' | 'village' | 'ruins' | 'port';
type Find = 'wreck' | 'cave' | 'storm';
interface Point {
  x: number;
  y: number;
}
interface GameState {
  island: number;
  kind: string;
  voyage: number;
  phase: 'survey' | 'chart' | 'harbor';
  tiles: { terrain: Terrain; revealed: boolean; find?: Find }[];
  port: Point;
  surveyor: Point;
  supplies: number;
  coins: number;
  ranks: Record<string, number>;
  surveyed: Point[];
  commission: { terrain: Terrain; need: number; bonus: number } | null;
  chart: {
    counts: Partial<Record<Terrain, number>>;
    base: number;
    ink: number;
    bonus: number;
    artifacts: number;
    artifactCoins: number;
    treasure: number;
    unused: number;
    sellBack: number;
    milestones: number;
    milestoneCoins: number;
    atlas: boolean;
    total: number;
  } | null;
  lastSale: number;
  milestones: number;
  isleStart: number;
  atlas: { island: number; kind: string; voyages: number; tiles: number }[];
  camps: Point[];
  storms: Point[];
  artifacts: number;
  treasure: number;
  riddle: { at: Point; clues: string[]; known: boolean; found: boolean } | null;
  dug: Point[];
}

const VIEW = { w: 960, h: 540 };
/** The island grid (GRID in src/game/state.ts) and where it is drawn (MAP in layout.ts). */
const GRID = { w: 15, h: 11 };
const MAP = { x: 24, y: 64, tile: 40 };
/** Supplies on Normal with no Provisions (BASE_SUPPLIES in state.ts). */
const SUPPLIES = 12;
/** What each tile adds to a chart (TERRAIN in src/game/terrain.ts). */
const VALUE: Record<Terrain, number> = { sea: 1, beach: 2, grass: 2, forest: 3, hills: 4, mountain: 6, river: 1, road: 1, village: 10, ruins: 12, port: 0 };
/** What each tile costs to survey (TERRAIN in src/game/terrain.ts). */
const COST: Record<Terrain, number> = { sea: 1, beach: 1, grass: 1, forest: 2, hills: 1, mountain: 2, river: 0, road: 0, village: 1, ruins: 1, port: 0 };
/** What finds add (WRECK_SUPPLIES, ARTIFACT_VALUE and SELL_BACK in state.ts). */
const WRECK_SUPPLIES = 3;
const ARTIFACT_VALUE = 15;
const SELL_BACK = 3;
/** The isle goal's milestones (MILESTONES in state.ts): percent charted and the coins each pays. */
const MILESTONES = [
  { pct: 50, coins: 20 },
  { pct: 75, coins: 40 },
  { pct: 100, coins: 0 },
];

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
    /** Where each button is on screen, by name. */
    spots: () => read<Record<string, Point>>((s) => JSON.parse(JSON.stringify(s.spots))),
  };
}

const at = (s: GameState, x: number, y: number) => s.tiles[y * GRID.w + x];
const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID.w && y < GRID.h;

/**
 * The fogged tiles next to a charted land tile that no storm blocks: the ones that glow and can be
 * surveyed (the test pitches no camps, so none are reached from one).
 */
function frontier(s: GameState): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      if (at(s, x, y).revealed || s.storms.some((p) => p.x === x && p.y === y)) continue;
      const next = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => {
        if (!inGrid(x + dx, y + dy)) return false;
        const t = at(s, x + dx, y + dy);
        return t.revealed && t.terrain !== 'sea';
      });
      if (next) out.push({ x, y });
    }
  }
  return out;
}

const revealedCount = (s: GameState) => s.tiles.filter((t) => t.revealed).length;

/** How much of the isle is charted, in whole percent: of its land and the sea beside land. */
function islePercent(s: GameState) {
  let all = 0;
  let done = 0;
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      const t = at(s, x, y);
      const byLand = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(
        ([dx, dy]) => inGrid(x + dx, y + dy) && at(s, x + dx, y + dy).terrain !== 'sea',
      );
      if (t.terrain === 'sea' && !byLand) continue;
      all += 1;
      if (t.revealed) done += 1;
    }
  }
  return done === all ? 100 : Math.min(99, Math.floor((100 * done) / all));
}

test('plays the first voyage', async ({ page }, testInfo) => {
  // A seeded Math.random keeps the island and the commission the same from run to run.
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
  await page.goto('/games/mapmaker/');
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
  async function tap(p: Point) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    await page.mouse.click(box.x + p.x * scale, box.y + p.y * scale);
  }
  const tileCentre = (p: Point) => ({ x: MAP.x + (p.x + 0.5) * MAP.tile, y: MAP.y + (p.y + 0.5) * MAP.tile });

  // A new game: the first island under fog but for its port, with full supplies and no coins.
  let s = await game.state();
  expect(s).toMatchObject({
    island: 1,
    voyage: 1,
    phase: 'survey',
    supplies: SUPPLIES,
    coins: 0,
    ranks: {},
    surveyed: [],
    chart: null,
    milestones: 0,
    isleStart: 1,
    atlas: [],
    kind: 'green',
    camps: [],
    storms: [],
    artifacts: 0,
    treasure: 0,
    dug: [],
  });
  expect(at(s, s.port.x, s.port.y)).toEqual({ terrain: 'port', revealed: true });
  expect(revealedCount(s), 'only the port is charted').toBe(1);
  expect(s.surveyor).toEqual(s.port);
  expect(frontier(s).length, 'tiles next to the port can be surveyed').toBeGreaterThan(0);
  await play(500, async () => false);
  await snap('0-start');

  // Survey while the supplies can pay: each tap reveals the tile, costs its terrain's supplies and
  // walks the surveyor over; hills and peaks reveal more tiles around them for free, and finds under
  // the revealed tiles turn up at once.
  let surveys = 0;
  let spent = 0;
  let wrecks = 0;
  let caves = 0;
  const affordable = () => frontier(s).filter((p) => COST[at(s, p.x, p.y).terrain] <= s.supplies);
  while (s.phase === 'survey' && affordable().length > 0) {
    const d = (p: Point) => Math.abs(p.x - s.surveyor.x) + Math.abs(p.y - s.surveyor.y);
    const target = affordable().sort((a, b) => d(a) - d(b) || a.y - b.y || a.x - b.x)[0];
    const before = { supplies: s.supplies, revealed: revealedCount(s), surveyed: s.surveyed.length, artifacts: s.artifacts };
    const fogAround = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(
      ([dx, dy]) => inGrid(target.x + dx, target.y + dy) && !at(s, target.x + dx, target.y + dy).revealed,
    );
    await tap(tileCentre(target));
    expect(
      await play(1_000, async () => (s = await game.state()).surveyed.length > before.surveyed),
      `survey ${target.x},${target.y}; state ${JSON.stringify({ ...s, tiles: undefined })}`,
    ).toBe(true);
    surveys += 1;
    const terrain = at(s, target.x, target.y).terrain;
    const fresh = s.surveyed.slice(before.surveyed);
    const found = (f: Find) => fresh.filter((p) => at(s, p.x, p.y).find === f).length;
    spent += COST[terrain];
    wrecks += found('wreck');
    caves += found('cave');
    expect(s.supplies, `${terrain} costs ${COST[terrain]}, a wreck adds ${WRECK_SUPPLIES}`).toBe(
      before.supplies - COST[terrain] + WRECK_SUPPLIES * found('wreck'),
    );
    expect(s.artifacts, 'a cave holds an artifact').toBe(before.artifacts + found('cave'));
    for (const p of s.storms) expect(frontier(s), 'a storm blocks its tile').not.toContainEqual(p);
    expect(at(s, target.x, target.y).revealed, `tile ${target.x},${target.y} revealed`).toBe(true);
    const gained = revealedCount(s) - before.revealed;
    expect(gained).toBeGreaterThanOrEqual(1);
    const lookout = terrain === 'hills' || terrain === 'mountain';
    if (lookout && fogAround) expect(gained, 'a hill or peak reveals the fog around it').toBeGreaterThan(1);
    if (!lookout) expect(gained, 'only hills and peaks reveal more').toBe(1);
    if (terrain !== 'sea') expect(s.surveyor, 'the surveyor walks onto the tile').toEqual(target);
    await play(400, async () => false);
    if (surveys === 6) await snap('1-surveying');
  }
  expect(surveys, 'surveys made').toBeGreaterThanOrEqual(SUPPLIES / 2);
  expect(spent, 'the supplies paid for the surveys').toBe(SUPPLIES + WRECK_SUPPLIES * wrecks - s.supplies);
  expect(s.surveyed.length, 'every revealed tile is on the chart').toBe(revealedCount(s) - 1);
  // Nothing left that the supplies can pay for: unless the voyage already ended on its own (it stays
  // open while a known riddle can still be dug), the surveyor heads back to port.
  if (s.phase === 'survey') {
    await tap((await game.spots()).return);
    expect(await play(1_000, async () => (s = await game.state()).phase === 'chart'), 'returned to port').toBe(true);
  }

  // Back at port with a chart: its rows add up to the tiles revealed.
  expect(s.phase).toBe('chart');
  const counts: Partial<Record<Terrain, number>> = {};
  for (const p of s.surveyed) counts[at(s, p.x, p.y).terrain] = (counts[at(s, p.x, p.y).terrain] ?? 0) + 1;
  const base = Object.entries(counts).reduce((sum, [t, n]) => sum + VALUE[t as Terrain] * n!, 0);
  const c = s.commission!;
  expect(c, 'the first voyage has a commission').not.toBeNull();
  const bonus = (counts[c.terrain] ?? 0) >= c.need ? c.bonus : 0;
  // Supplies too few for the stations left sell back, up to the tiles' worth; the voyage pays any
  // isle milestones it reached.
  const pct = islePercent(s);
  expect(pct, 'the first voyage charts part of the isle').toBeGreaterThan(0);
  expect(pct).toBeLessThan(100);
  const reached = MILESTONES.filter((m) => pct >= m.pct);
  const milestoneCoins = reached.reduce((sum, m) => sum + m.coins, 0);
  const unused = s.supplies;
  expect(unused, 'too few supplies for any station left').toBeLessThan(2);
  const sellBack = Math.min(unused * SELL_BACK, base);
  expect(s.chart).toEqual({
    counts,
    base,
    ink: 0,
    bonus,
    artifacts: caves,
    artifactCoins: caves * ARTIFACT_VALUE,
    treasure: 0,
    unused,
    sellBack,
    milestones: reached.length,
    milestoneCoins,
    atlas: false,
    total: base + bonus + caves * ARTIFACT_VALUE + sellBack + milestoneCoins,
  });
  expect(s.chart!.total).toBeGreaterThan(SUPPLIES);
  await play(500, async () => false);
  await snap('2-chart');

  // Selling the chart pays its total and opens the harbor.
  const total = s.chart!.total;
  let spots = await game.spots();
  await tap(spots.sell);
  expect(await play(1_000, async () => (s = await game.state()).phase === 'harbor'), 'chart sold').toBe(true);
  expect(s).toMatchObject({ coins: total, lastSale: total, chart: null, surveyed: [], artifacts: 0, milestones: reached.length, atlas: [] });
  await play(500, async () => false);
  await snap('3-harbor');

  // Setting sail starts the second voyage on the same island, with full supplies again.
  const charted = revealedCount(s);
  spots = await game.spots();
  await tap(spots.sail);
  expect(await play(1_000, async () => (s = await game.state()).phase === 'survey'), 'set sail').toBe(true);
  expect(s).toMatchObject({ island: 1, voyage: 2, supplies: SUPPLIES, coins: total, ranks: {}, isleStart: 1, storms: [], camps: [] });
  expect(s.surveyor).toEqual(s.port);
  expect(revealedCount(s), 'the chart so far is kept').toBe(charted);
  await play(500, async () => false);

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
