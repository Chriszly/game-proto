import { expect, test, type Page } from '@playwright/test';

// Plays the first wave with real inputs: the hero shoots the foes on their own, the first kills
// fill the experience bar, the level-up cards come up and one is tapped, as on a phone, and the
// wave is cleared with the barricade still standing.
// Game state is only read, through the `game` object the dev build puts on window.

type Kind = 'goblin' | 'orc' | 'knight' | 'troll';
interface GameState {
  level: number;
  xp: number;
  ranks: Record<string, number>;
  levelUps: number;
  bestWave: number;
  wave: number;
  phase: 'break' | 'fighting' | 'over';
  toSpawn: Kind[];
  barricade: { hp: number; max: number };
  enemies: { id: number; kind: Kind; x: number; y: number; hp: number; maxHp: number }[];
  missiles: { id: number; kind: string }[];
  choices: string[] | null;
  pickMs: number;
  kills: number;
}
type Card = { id: string; x: number; y: number; w: number; h: number };

const VIEW = { w: 960, h: 540 };
/** Experience for each kind of foe, from src/game/enemies.ts, and what each level costs, from state.ts. */
const XP: Record<Kind, number> = { goblin: 2, orc: 4, knight: 10, troll: 60 };
const xpToNext = (level: number) => 8 + 6 * (level - 1);
/** Wave 1 is three goblins and three orcs, from src/game/waves.ts; an orc always comes first. */
const WAVE_1 = { goblin: 3, orc: 3 };
/** How long a level-up waits for a tap before taking a card at random, from src/game/sim.ts. */
const AUTO_PICK_MS = 10_000;

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

const count = (items: string[]) =>
  items.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});

/** All the experience the hero has earned: what the levels gained cost, plus what is on the bar. */
const earned = (s: GameState) => {
  let xp = s.xp;
  for (let level = 1; level < s.level; level++) xp += xpToNext(level);
  return xp;
};

function scene(page: Page) {
  const read = <T>(fn: (s: any) => T) =>
    page.evaluate(`(${fn.toString()})(window.game.scene.getScene('Game'))`) as Promise<T>;
  return {
    state: () => read<GameState>((s) => JSON.parse(JSON.stringify(s.state))),
    /** Where the level-up cards are on screen, and the upgrade each offers. */
    cards: () => read<Card[]>((s) => s.levelUp.cards),
  };
}

test('plays the first wave', async ({ page }, testInfo) => {
  // A seeded Math.random keeps where the foes walk and the upgrades offered the same from run to run.
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
    // play at SPEED; the game, its rules and the pixel art are the same either way.
    const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return /webgl/i.test(id) ? null : getContext.call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  }, FRAME_MS);
  await page.goto('/games/palisade/');
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

  /** Plays on until `check` holds, for up to `ms` of game time. */
  async function until(what: string, check: (s: GameState) => boolean, ms = 30_000) {
    let state = await game.state();
    const ok = await play(ms, async () => check((state = await game.state())));
    if (!ok) {
      const { enemies, ...rest } = state;
      throw new Error(`Timed out after ${ms}ms of game time waiting for: ${what}\n` +
        `Foes ${JSON.stringify(enemies.map((e) => [e.kind, Math.round(e.x), Math.round(e.hp)]))}, state ${JSON.stringify(rest)}`);
    }
    return state;
  }

  /** Taps the middle of a level-up card, as a player would. */
  async function tapCard(card: Card) {
    const box = (await canvas.boundingBox())!;
    const scale = box.width / VIEW.w;
    await page.mouse.click(box.x + card.x * scale, box.y + card.y * scale);
    await play(STEP_MS, async () => false);
  }

  // A new hero: level 1, no upgrades, the barricade whole, and a short break before the first wave.
  let s = await game.state();
  expect(s).toMatchObject({ level: 1, xp: 0, ranks: {}, levelUps: 0, wave: 1, phase: 'break', kills: 0, choices: null });
  expect(s.barricade.hp).toBe(s.barricade.max);

  // The first wave comes on, an orc first, and the hero shoots at the foes without being told to.
  s = await until('the first wave came on', (s) => s.phase === 'fighting' && s.enemies.length > 0, 5_000);
  expect(count([...s.toSpawn, ...s.enemies.map((e) => e.kind)])).toEqual(WAVE_1);
  expect(s.enemies[0].kind).toBe('orc');
  s = await until('an arrow loosed', (s) => s.missiles.some((m) => m.kind === 'arrow'), 5_000);
  await snap('0-battle');
  await until('an arrow hit', (s) => s.enemies.some((e) => e.hp < e.maxHp) || s.kills > 0, 5_000);

  // Each kill fills the experience bar by that foe's experience.
  const killedXp = (s: GameState) => {
    const left = count([...s.toSpawn, ...s.enemies.map((e) => e.kind)]);
    return Object.entries(WAVE_1).reduce((sum, [kind, n]) => sum + (n - (left[kind] ?? 0)) * XP[kind as Kind], 0);
  };
  s = await until('the first foe slain', (s) => s.kills > 0);
  expect(earned(s)).toBe(killedXp(s));

  // A full bar is a level-up: the battle waits while three different upgrades are offered.
  s = await until('a level-up', (s) => s.choices !== null);
  expect(s.level).toBe(2);
  expect(earned(s)).toBe(killedXp(s));
  expect(new Set(s.choices).size).toBe(3);
  const cards = await game.cards();
  expect(cards.map((c) => c.id)).toEqual(s.choices);
  await play(1_000, async () => false);
  const waited = await game.state();
  expect(waited.enemies, 'the battle waits for the pick').toEqual(s.enemies);
  // A countdown runs while the cards are up, after which one is taken at random; this tap beats it.
  expect(s.pickMs).toBeLessThanOrEqual(AUTO_PICK_MS);
  expect(waited.pickMs).toBeLessThan(s.pickMs - 900);
  expect(waited.pickMs).toBeGreaterThan(0);
  await snap('1-level-up');

  // Tapping a card takes its upgrade and the battle goes on.
  const choice = cards[0].id;
  await tapCard(cards[0]);
  s = await game.state();
  expect(s.ranks).toEqual({ [choice]: 1 });
  expect(s.choices).toBeNull();
  expect(s.levelUps).toBe(0);

  // Clear the wave, taking the first card of any further level-up. The barricade holds.
  for (let picks = 0; ; picks++) {
    expect(picks, 'level-ups in wave 1').toBeLessThan(2);
    s = await until('wave 1 cleared or a level-up', (s) => s.wave === 2 || s.choices !== null, 60_000);
    if (s.wave === 2) break;
    await tapCard((await game.cards())[0]);
  }
  expect(s).toMatchObject({ phase: 'break', bestWave: 1, kills: 6 });
  expect(earned(s)).toBe(3 * XP.goblin + 3 * XP.orc);
  expect(s.barricade.hp).toBeGreaterThan(0);
  await snap('2-wave-cleared');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
