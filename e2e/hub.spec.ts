import { expect, test } from '@playwright/test';

// The hub lists every game and each card opens its game.
const GAMES = [
  { name: 'Apothecary', path: '/games/apothecary/' },
  { name: 'Rampart', path: '/games/rampart/' },
];

test('hub opens each game', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.game')).toHaveCount(GAMES.length);
  await expect(page.locator('.game img').first()).toHaveJSProperty('complete', true);
  testInfo.attach('hub', { body: await page.screenshot({ path: testInfo.outputPath('hub.png') }), contentType: 'image/png' });

  for (const { name, path } of GAMES) {
    await page.goto('/');
    await page.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('canvas')).toBeVisible();
  }
});
