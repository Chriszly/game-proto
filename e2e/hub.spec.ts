import { expect, test, type Page } from '@playwright/test';

// The hub lists every game and each card opens its game.
const GAMES = [
  { name: 'Apothecary', path: '/games/apothecary/' },
  { name: 'Deadline', path: '/games/deadline/' },
  { name: 'Palisade', path: '/games/palisade/' },
  { name: 'Tiny Kingdom', path: '/games/tiny-kingdom/' },
  { name: 'Rogue Runner', path: '/games/rogue-runner/' },
  { name: 'Merge Forge', path: '/games/merge-forge/' },
  { name: 'Pirate Raid', path: '/games/pirate-raid/' },
  { name: 'Potion Puzzle', path: '/games/potion-puzzle/' },
  { name: 'Delve', path: '/games/delve/' },
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
  await expect(page.locator('.game img').first()).toHaveJSProperty('complete', true);
  testInfo.attach('hub', { body: await page.screenshot({ path: testInfo.outputPath('hub.png') }), contentType: 'image/png' });

  for (const { name, path } of GAMES) {
    await page.goto('/');
    await page.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('canvas')).toBeVisible();
    await expectFavicon(page);
  }
});
