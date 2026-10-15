import { expect, test, type Browser } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

// Every game that uses `shared/scaling.ts` is opened on a range of screens, from an upright phone
// to a 4K monitor, and must be sharp and fill the screen on each, or ask to turn a phone that is
// held the wrong way. A game is picked up on its own once its `src/main.ts` calls `setupScaling`.
// `SCREENS_GAME` checks just that game, as the Screens workflow does with one job per changed game.
const ONLY = process.env.SCREENS_GAME;
const GAMES = readdirSync('games').filter((name) => {
  if (ONLY && name !== ONLY) return false;
  try {
    return readFileSync(`games/${name}/src/main.ts`, 'utf8').includes('setupScaling(game)');
  } catch {
    return false;
  }
});

/** The screens checked: CSS size, device pixels per CSS pixel, and whether it is a touch device. */
const SCREENS = [
  { name: 'phone-upright', width: 390, height: 844, dpr: 3, touch: true },
  { name: 'phone-sideways', width: 844, height: 390, dpr: 3, touch: true },
  { name: 'tablet', width: 1024, height: 768, dpr: 2, touch: true },
  { name: 'laptop', width: 1440, height: 900, dpr: 2, touch: false },
  { name: '4k', width: 3840, height: 2160, dpr: 1, touch: false },
];

async function open(browser: Browser, game: string, screen: (typeof SCREENS)[number]) {
  const size = { width: screen.width, height: screen.height };
  const context = await browser.newContext({
    viewport: size,
    screen: size,
    deviceScaleFactor: screen.dpr,
    isMobile: screen.touch,
    hasTouch: screen.touch,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/games/${game}/`);
  // The game is up once Phaser has booted; a phone held the wrong way shows the hint instead.
  await page.waitForFunction(() => (window as any).game?.isBooted);
  return { context, page, errors };
}

for (const game of GAMES) {
  for (const screen of SCREENS) {
    test(`${game} on ${screen.name}`, async ({ browser }, testInfo) => {
      const { context, page, errors } = await open(browser, game, screen);
      // A wide game (960x540) wants a sideways phone, a tall one (540x960) an upright phone.
      const wide = await page.evaluate(() => (window as any).game.config.width >= (window as any).game.config.height);
      const hint = page.locator('.turn-hint');
      const wrongWay = screen.touch && screen.height > screen.width === wide;
      if (wrongWay) {
        // A wide game on an upright phone (or the other way round) asks to turn it, and waits.
        await expect(hint, 'turn hint').toBeVisible();
        expect(await page.evaluate(() => (window as any).game.isPaused), 'paused while turned away').toBe(true);
      } else {
        await expect(hint, 'turn hint').toBeHidden();
        // Let a few frames draw, so the first scene is on screen for the screenshot.
        await page.waitForFunction(() => (window as any).game.scene.getScenes(true).length > 0);
        await page.waitForTimeout(500);
        const fit = await page.evaluate(() => {
          const canvas = (window as any).game.canvas as HTMLCanvasElement;
          const box = canvas.getBoundingClientRect();
          return {
            backing: { width: canvas.width, height: canvas.height },
            shown: { width: box.width * devicePixelRatio, height: box.height * devicePixelRatio },
            filled: Math.max(box.width / innerWidth, box.height / innerHeight),
            scrolls: document.scrollingElement!.scrollHeight > innerHeight || document.scrollingElement!.scrollWidth > innerWidth,
          };
        });
        // Sharp: the canvas has at least as many pixels as the screen area it is shown on.
        expect(fit.backing.width, `canvas pixels across for ${Math.round(fit.shown.width)} on screen`).toBeGreaterThanOrEqual(0.99 * fit.shown.width);
        expect(fit.backing.height, `canvas pixels down for ${Math.round(fit.shown.height)} on screen`).toBeGreaterThanOrEqual(0.99 * fit.shown.height);
        // As big as it fits: the view reaches two opposite edges of the screen.
        expect(fit.filled, 'share of the screen the view spans').toBeGreaterThan(0.99);
        expect(fit.scrolls, 'page scrolls').toBe(false);
      }
      expect(errors, 'page errors').toEqual([]);
      await testInfo.attach(`${game}-${screen.name}`, { body: await page.screenshot(), contentType: 'image/png' });
      await context.close();
    });
  }
}
