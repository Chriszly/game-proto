import { expect, test, type Page } from '@playwright/test';

// Plays the first chapter, the hunt, with real key presses: Bjarn reads his opening lines, walks
// east, fights the boar and then the two boars, blocking whatever winds up near him and striking
// back, and walks on to the village, where the raid begins. Game state is only read, through the
// `game` object the dev build puts on window.

interface Bjarn {
  x: number;
  facing: number;
  form: string;
  hp: number;
  stamina: number;
  rage: number;
  burst: boolean;
}
interface Foe {
  kind: string;
  x: number;
  hp: number;
  state: string;
}
interface Save {
  chapter: string;
  kills: number;
  falls: number;
}

/** The hunt's foes, from src/game/story.ts: one boar, then two. */
const HUNT_BOARS = 3;
/** How close a foe must be before Bjarn strikes at it; the human's reach is 72 (src/game/forms.ts). */
const STRIKE_RANGE = 64;
/** A foe winding up this close gets blocked. */
const BLOCK_RANGE = 110;

/** Game time per animation frame, every frame the same length. */
const FRAME_MS = 64;
/** Game time advanced between checks: a few animation frames. */
const STEP_MS = 128;
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
    ready: () => read<boolean>((s) => !!s?.player),
    chapter: () => read<string>((s) => s.chapter.id),
    player: () => read<Bjarn>((s) => ({ x: s.player.x, facing: s.player.facing, form: s.player.form, hp: s.player.hp, stamina: s.player.stamina, rage: s.player.rage, burst: s.player.burst })),
    foes: () => read<Foe[]>((s) => s.foes.filter((f: any) => f.state !== 'dead').map((f: any) => ({ kind: f.kind, x: f.x, hp: f.hp, state: f.state }))),
    dialog: () => read<string | null>((s) => (s.dialog ? s.dialog.lines[s.dialog.i][1] : null)),
    save: () => read<Save>((s) => ({ chapter: s.save.chapter, kills: s.save.kills, falls: s.save.falls })),
  };
}

test('plays the hunt', async ({ page }, testInfo) => {
  // Seeded like the other games' tests, so where the foes come from repeats from run to run.
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
  // animation frame at a time, so the fights play the same on a slow runner as on a fast one.
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
  await page.goto('/games/bearclaw-saga/');
  const game = scene(page);

  let gameMs = 0;
  let startedAt = 0;

  /**
   * Advances game time in steps of `step` until `done` holds; returns false if `ms` ran out first. Once
   * the game has started, each step waits until real time catches up with game time / SPEED.
   */
  async function play(ms: number, done: () => Promise<boolean>, step = STEP_MS) {
    for (let t = 0; t <= ms; t += step) {
      if (await done()) return true;
      await page.clock.runFor(step);
      if (!startedAt) continue;
      gameMs += step;
      const ahead = gameMs / SPEED - (Date.now() - startedAt);
      if (ahead > 0) await new Promise((r) => setTimeout(r, ahead));
    }
    return done();
  }

  expect(await play(10_000, () => page.evaluate(() => !!(window as any).game?.scene.getScene('Game')?.player)), 'game started').toBe(true);
  startedAt = Date.now();

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }), contentType: 'image/png' });

  /** The keys held down right now, so each step only presses and lets go of what changed. */
  const held = new Set<string>();
  async function hold(keys: string[]) {
    for (const k of [...held]) if (!keys.includes(k)) {
      await page.keyboard.up(k);
      held.delete(k);
    }
    for (const k of keys) if (!held.has(k)) {
      await page.keyboard.down(k);
      held.add(k);
    }
  }
  /** Reads every line of the dialog that is open, pressing Space for each. */
  async function readDialog() {
    const lines: string[] = [];
    for (let line = await game.dialog(); line; line = await game.dialog()) {
      lines.push(line);
      expect(lines.length, `the talk moves on (${lines.join(', ')})`).toBeLessThan(20);
      await hold([]);
      await play(FRAME_MS * 4, async () => false, FRAME_MS);
      await page.keyboard.press('Space');
      await play(FRAME_MS * 2, async () => false, FRAME_MS);
    }
    return lines;
  }

  // A new run starts with Bjarn in the snowy woods, as a human at full health, and his thoughts.
  await play(STEP_MS * 2, async () => false);
  expect(await game.chapter()).toBe('hunt');
  let p = await game.player();
  expect(p).toMatchObject({ form: 'human', hp: 100, rage: 0, burst: false });
  await snap('0-start');
  expect(await readDialog()).toEqual(['hunt1', 'hunt2']);

  // The fight loop: walk east, and whenever a foe is about, block what winds up near Bjarn and
  // strike at what is in reach. It ends when the hunt gives way to the raid.
  let fought = false;
  let lastKills = 0;
  const reached = await play(120_000, async () => {
    if ((await game.chapter()) !== 'hunt') return true;
    if (await game.dialog()) {
      await readDialog();
      return false;
    }
    const kills = (await game.save()).kills;
    if (kills !== lastKills) {
      lastKills = kills;
      if (kills === HUNT_BOARS) await snap('2-boars');
    }
    p = await game.player();
    const foes = await game.foes();
    if (!foes.length) {
      await hold(['d']);
      return false;
    }
    if (!fought) {
      fought = true;
      await snap('1-boar');
    }
    const near = foes.reduce((a, b) => (Math.abs(b.x - p.x) < Math.abs(a.x - p.x) ? b : a));
    const toward = near.x < p.x ? 'a' : 'd';
    const threat = foes.find((f) => (f.state === 'windup' || f.state === 'strike') && Math.abs(f.x - p.x) < BLOCK_RANGE);
    if (threat) {
      await hold(['k', threat.x < p.x ? 'a' : 'd']);
    } else if (Math.abs(near.x - p.x) > STRIKE_RANGE) {
      await hold([toward]);
    } else {
      // Face the foe, then strike.
      if (Math.sign(near.x - p.x) !== p.facing) {
        await hold([toward]);
        await play(FRAME_MS, async () => false, FRAME_MS);
      }
      await hold([]);
      await page.keyboard.press('j');
    }
    return false;
  });
  await hold([]);
  p = await game.player();
  expect(reached, `the raid begins (Bjarn at ${Math.round(p.x)} with ${Math.round(p.hp)} health)`).toBe(true);

  // The boars are beaten, Bjarn never fell, and the run is saved at the raid.
  const save = await game.save();
  expect(save).toMatchObject({ chapter: 'raid', kills: HUNT_BOARS, falls: 0 });
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('bearclaw-saga-save')))!)).toMatchObject({ chapter: 'raid' });
  // The raid opens with the father calling Bjarn to his side.
  expect(await play(5_000, async () => (await game.dialog()) === 'raid1')).toBe(true);
  await snap('3-raid');

  const speed = gameMs / (Date.now() - startedAt);
  console.log(`Played ${Math.round(gameMs / 1000)}s of game time at ${speed.toFixed(1)}x (target ${SPEED}x).`);
  expect(errors).toEqual([]);
});
