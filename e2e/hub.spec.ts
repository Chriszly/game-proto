import { expect, test, type Page } from '@playwright/test';

// The hub lists every game and each card opens its game.
const GAMES = [
  { name: 'Apothecary', path: '/games/apothecary/' },
  { name: 'Deadline', path: '/games/deadline/' },
  { name: 'Palisade', path: '/games/palisade/' },
  { name: 'Tiny Kingdom', path: '/games/tiny-kingdom/' },
  { name: 'Hotfoot', path: '/games/hotfoot/' },
  { name: 'Anvilheart', path: '/games/anvilheart/' },
  { name: 'Broadside', path: '/games/broadside/' },
  { name: 'TinctureTinker', path: '/games/tincture-tinker/' },
  { name: 'Catacomb', path: '/games/catacomb/' },
  { name: 'Golem Garden', path: '/games/golem-garden/' },
  { name: 'Beehive Baron', path: '/games/beehive-baron/' },
  { name: 'Wyrmrail', path: '/games/wyrmrail/' },
  { name: 'Shrine Stack', path: '/games/shrine-stack/' },
  { name: 'Mapmaker', path: '/games/mapmaker/' },
  { name: 'Lanternkeep', path: '/games/lanternkeep/' },
  { name: 'Space Wars', path: '/games/space-wars/' },
  { name: 'Lane Brawl', path: '/games/lane-brawl/' },
  { name: 'Colonizer', path: '/games/colonizer/' },
];

// Every page links a favicon that loads.
async function expectFavicon(page: Page) {
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(href, 'favicon link').toBeTruthy();
  const icon = await page.request.get(new URL(href!, page.url()).href);
  expect(icon.ok(), `favicon ${href}`).toBe(true);
  // The dev server answers a missing file with the page itself, so check it is an image.
  expect(icon.headers()['content-type'], `favicon ${href}`).toContain('image/svg+xml');
}

test('hub opens each game', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.game')).toHaveCount(GAMES.length);
  await expectFavicon(page);
  // Every card's cover loads.
  const covers = page.locator('.game .cover');
  await expect(covers).toHaveCount(GAMES.length);
  for (const cover of await covers.all()) {
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  // Each card shows its game's favicon next to the name.
  const icons = page.locator('.game h2 .icon');
  await expect(icons).toHaveCount(GAMES.length);
  for (const icon of await icons.all()) {
    await expect.poll(() => icon.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  testInfo.attach('hub', { body: await page.screenshot({ path: testInfo.outputPath('hub.png') }), contentType: 'image/png' });

  for (const { name, path } of GAMES) {
    await page.goto('/');
    await page.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    // The game's own canvas; a page may also paint a decorative backdrop canvas, marked data-backdrop.
    await expect(page.locator('canvas:not([data-backdrop])')).toBeVisible();
    await expectFavicon(page);
  }
});

// The hub's Settings panel saves the shared settings, and a game opened afterwards honours them.
test('hub settings reach the games', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  const choice = (setting: string, option: string) => dialog.getByRole('group', { name: setting }).getByRole('button', { name: option, exact: true });
  await expect(choice('Difficulty', 'Normal')).toHaveAttribute('aria-pressed', 'true');
  await expect(choice('Frame rate (FPS)', '60')).toHaveAttribute('aria-pressed', 'true');

  await choice('Difficulty', 'Hard').click();
  await choice('Frame rate (FPS)', '30').click();
  await choice('Show FPS', 'On').click();
  await expect(choice('Difficulty', 'Hard')).toHaveAttribute('aria-pressed', 'true');
  testInfo.attach('settings', { body: await page.screenshot({ path: testInfo.outputPath('settings.png') }), contentType: 'image/png' });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // The choices are kept across visits.
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(choice('Difficulty', 'Hard')).toHaveAttribute('aria-pressed', 'true');
  await expect(choice('Show FPS', 'On')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hub-settings')!))).toEqual({
    difficulty: 'hard',
    fps: 30,
    showFps: true,
    reduceMotion: false,
  });

  // A game opened now shows the FPS readout.
  await page.goto('/games/apothecary/');
  await expect(page.locator('.fps-readout')).toHaveText(/^\d+ FPS$/);

  // Every game has full screen: F toggles it, and so does the button, which then lets Enter and Space
  // through to the game instead of clicking itself again.
  const fullscreen = () => page.evaluate(() => document.fullscreenElement !== null);
  await page.keyboard.press('f');
  await expect.poll(fullscreen).toBe(true);
  await page.keyboard.press('f');
  await expect.poll(fullscreen).toBe(false);
  await page.locator('.fullscreen-button').click();
  await expect.poll(fullscreen).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(fullscreen).toBe(true);

  // Reset all progress clears the games' saves and keeps the settings.
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('apothecary-save', '{}'));
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Settings' }).click();
  await dialog.getByRole('button', { name: 'Reset all progress' }).click();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['hub-settings']);

  await dialog.getByRole('button', { name: 'Restore defaults' }).click();
  await expect(choice('Difficulty', 'Normal')).toHaveAttribute('aria-pressed', 'true');
  await expect(choice('Show FPS', 'Off')).toHaveAttribute('aria-pressed', 'true');
});

// The game grid fills the width: wide screens get more than three columns, a phone gets one and nothing scrolls sideways.
test('hub grid fills the screen width', async ({ page }) => {
  const columns = () => page.locator('.games').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  expect(await columns()).toBeGreaterThan(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await columns()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
