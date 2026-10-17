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
  { name: 'Scrapyard Titans', path: '/games/scrapyard-titans/' },
  { name: 'Colonizer', path: '/games/colonizer/' },
  { name: 'Riftblade', path: '/games/riftblade/' },
  { name: 'Bramblecrest', path: '/games/bramblecrest/' },
];

// The games with a Watch AI mode (`?watch`, see shared/watch.ts); there is no hub link to it.
const WATCH = ['/games/colonizer/', '/games/space-wars/', '/games/lane-brawl/', '/games/scrapyard-titans/'];

// Every page links a favicon that loads.
async function expectFavicon(page: Page) {
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(href, 'favicon link').toBeTruthy();
  const icon = await page.request.get(new URL(href!, page.url()).href);
  expect(icon.ok(), `favicon ${href}`).toBe(true);
  // The dev server answers a missing file with the page itself, so check it is an image.
  expect(icon.headers()['content-type'], `favicon ${href}`).toContain('image/svg+xml');
}

test('hub lists every game', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.game')).toHaveCount(GAMES.length);
  await expectFavicon(page);
  // The cards are in alphabetical order.
  const names = (await page.locator('.game h2').allTextContents()).map((n) => n.trim());
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
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
});

// Each card opens its game, one test per game. `HUB_GAME` (a game's folder name) checks just that
// game, as the Hub workflow does with one job per changed game.
const ONLY = process.env.HUB_GAME;
for (const { name, path } of GAMES.filter((g) => !ONLY || g.path === `/games/${ONLY}/`)) {
  test(`hub opens ${name}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    // The game's own canvas; a page may also paint a decorative backdrop canvas, marked data-backdrop.
    await expect(page.locator('canvas:not([data-backdrop])')).toBeVisible();
    await expectFavicon(page);
    // Every game has a How to play behind its start and pause screens.
    await expect(page.locator('.game-help h2')).toHaveText(`How to play ${name}`);
    await expect(page.locator('.game-help li').first()).not.toBeEmpty();
    // A game with a watch mode shows the watch panel when opened with ?watch.
    if (!WATCH.includes(path)) return;
    await page.goto(`${path}?watch`);
    await expect(page.getByRole('region', { name: 'Watch AI' })).toBeVisible();
  });
}

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
  await dialog.getByRole('slider', { name: 'Music' }).fill('35');
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
    // British English is the default, whatever language the browser speaks.
    language: 'en',
    music: 35,
    effects: 80,
    muted: false,
  });
  await expect(dialog.getByRole('slider', { name: 'Music' })).toHaveValue('35');

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

// Every game has a sound button beside full screen and pause, and the M key: both switch the shared
// mute setting, which the next game keeps. The pause screen sets the music and effects volumes. The
// corner buttons keep clear of the screen's edges, for phones with rounded corners.
test('games have a sound button and volumes', async ({ page }) => {
  await page.addInitScript(() => Object.assign(window, { showStartScreen: true }));
  await page.goto('/games/apothecary/');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hub-settings') ?? '{}'));
  const sound = page.locator('.sound-button');
  await expect(sound).toHaveAttribute('aria-label', 'Mute (M)');
  // Full screen, sound and pause sit in one row, in that order, 12px from the edges.
  const corner = await page.locator('.game-corner').boundingBox();
  const view = page.viewportSize()!;
  expect(corner!.x).toBe(12);
  expect(view.height - corner!.y - corner!.height).toBe(12);
  await page.locator('.game-start-button').click();
  const order = await page.locator('.game-corner > button').evaluateAll((buttons) => buttons.map((b) => b.className.split(' ')[0]));
  expect(order).toEqual(['fullscreen-button', 'sound-button', 'pause-button']);

  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(sound).toHaveAttribute('aria-label', 'Sound on (M)');
  expect((await saved()).muted).toBe(true);
  await page.keyboard.press('m');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  expect((await saved()).muted).toBe(false);
  await page.keyboard.press('m');

  // The pause screen shows the volumes; moving one saves it and turns the sound back on.
  await page.locator('.pause-button').click();
  const effects = page.getByRole('slider', { name: 'Effects' });
  await expect(effects).toBeVisible();
  await effects.fill('40');
  await effects.dispatchEvent('change');
  expect(await saved()).toMatchObject({ effects: 40, muted: false });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');

  // Another game opens with the same settings.
  await page.keyboard.press('m');
  await page.goto('/games/hotfoot/');
  await expect(page.locator('.sound-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Effects', includeHidden: true })).toHaveValue('40');
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

// Every game loads behind a loading screen, waits on a start screen, and pauses with its button or P.
test('games have start and pause screens', async ({ page }, testInfo) => {
  // Under automation the start screen is skipped unless a test asks for it.
  await page.addInitScript(() => Object.assign(window, { showStartScreen: true }));
  await page.goto('/games/apothecary/');
  const overlay = page.locator('.game-overlay');
  const running = () => page.evaluate(() => (window as any).game.scene.getScene('Game')?.sys.isActive() === true);
  await expect(page.locator('.game-start-button')).toBeVisible();
  await expect(page.locator('.game-overlay-title')).toHaveText('Apothecary');
  expect(await running(), 'paused on the start screen').toBe(false);
  testInfo.attach('start', { body: await page.screenshot({ path: testInfo.outputPath('start.png') }), contentType: 'image/png' });

  // How to play opens from the start screen, keeps the game paused, and Esc goes back.
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('heading', { name: 'How to play Apothecary' })).toBeVisible();
  await expect(page.locator('.game-start-button')).toBeHidden();
  expect(await running(), 'paused while reading How to play').toBe(false);
  testInfo.attach('how to play', { body: await page.screenshot({ path: testInfo.outputPath('how-to-play.png') }), contentType: 'image/png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('.game-start-button')).toBeVisible();

  await page.locator('.game-start-button').click();
  await expect(overlay).toBeHidden();
  expect(await running(), 'playing after Start').toBe(true);

  await page.locator('.pause-button').click();
  await expect(page.locator('.game-resume-button')).toBeVisible();
  expect(await running(), 'paused by the button').toBe(false);
  testInfo.attach('paused', { body: await page.screenshot({ path: testInfo.outputPath('paused.png') }), contentType: 'image/png' });
  await page.keyboard.press(' ');
  await expect(overlay).toBeHidden();
  expect(await running(), 'playing after Space').toBe(true);

  await page.keyboard.press('p');
  await expect(page.locator('.game-resume-button')).toBeVisible();
  await page.keyboard.press('p');
  await expect(overlay).toBeHidden();
  expect(await running(), 'playing after P twice').toBe(true);
});

// The hub shows each game's play count from its counter (shared/playCount.ts), here answered by a
// stand-in so the test never reaches the real service. A game never played, or a counter that fails,
// shows no line.
test('hub shows play counts', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.assign(window, { showPlayCounts: true }));
  await page.route('https://abacus.jasoncameron.dev/get/**', (route) => {
    const game = new URL(route.request().url()).pathname.split('/').pop();
    if (game === 'deadline') return route.fulfill({ status: 404, json: { error: 'Key not found' } });
    if (game === 'palisade') return route.abort();
    return route.fulfill({ json: { value: game === 'apothecary' ? 1234 : 1 } });
  });
  await page.goto('/');
  const plays = (path: string) => page.locator(`.game a[href="${path.slice(1)}"] .plays`);
  await expect(plays('/games/apothecary/')).toHaveText('1,234 plays');
  await expect(plays('/games/tiny-kingdom/')).toHaveText('1 play');
  await expect(page.locator('.game .plays')).toHaveCount(GAMES.length - 2);
  await expect(plays('/games/deadline/')).toHaveCount(0);
  await expect(plays('/games/palisade/')).toHaveCount(0);
  testInfo.attach('play counts', {
    body: await page.locator('.game').first().screenshot({ path: testInfo.outputPath('play-counts.png') }),
    contentType: 'image/png',
  });
});

// The Language setting switches the hub at once, reaches the shared screens of a game opened
// afterwards, and formats numbers and dates to match (shared/i18n.ts).
test('hub switches language', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.assign(window, { showPlayCounts: true, showStartScreen: true }));
  await page.route('https://abacus.jasoncameron.dev/get/**', (route) => route.fulfill({ json: { value: 1234 } }));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Game hub');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  // A first visit is in British English, though the browser under test speaks US English.
  await expect(dialog.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'English (UK)' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Deutsch' }).click();

  // The hub switches without a reload: the page, the panel, the cards and the play counts.
  const einstellungen = page.getByRole('dialog', { name: 'Einstellungen' });
  await expect(einstellungen.getByRole('group', { name: 'Sprache' }).getByRole('button', { name: 'Deutsch' })).toHaveAttribute('aria-pressed', 'true');
  await expect(einstellungen.getByRole('group', { name: 'Schwierigkeit' }).getByRole('button', { name: 'Leicht' })).toBeVisible();
  await expect(page.locator('h1')).toHaveText('Spielesammlung');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.locator('.game a[href="games/apothecary/"] p').first()).toHaveText(/^Führe als Pestdoktor/);
  await expect(page.locator('.game a[href="games/apothecary/"] .plays')).toHaveText('1.234-mal gespielt');
  testInfo.attach('german settings', { body: await page.screenshot({ path: testInfo.outputPath('german-settings.png') }), contentType: 'image/png' });
  await einstellungen.getByRole('button', { name: 'Schließen' }).click();

  // It is kept, and a game opened now shows its start, pause and How to play screens in German.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Einstellungen' })).toBeVisible();
  await page.goto('/games/apothecary/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.locator('.game-overlay-hint')).toHaveText('P drücken zum Pausieren \u00b7 H für die Spielanleitung');
  await page.getByRole('button', { name: 'Spielanleitung' }).click();
  await expect(page.getByRole('heading', { name: 'Spielanleitung: Apothecary' })).toBeVisible();
  await expect(page.locator('.game-help h3').first()).toHaveText('Steuerung');
  testInfo.attach('german how to play', { body: await page.screenshot({ path: testInfo.outputPath('german-how-to-play.png') }), contentType: 'image/png' });

  // ?lang= shows another language without changing the setting.
  await page.goto('/?lang=en');
  await expect(page.locator('h1')).toHaveText('Game hub');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hub-settings')!).language)).toBe('de');

  // Numbers and dates: British English, US English and German.
  const formats = async (lang: string) => {
    await page.goto(`/?lang=${lang}`);
    return page.evaluate(async () => {
      const i18n = await import('/shared/i18n.ts' as string);
      return [i18n.formatNumber(1234.5), i18n.formatDate(new Date(2026, 9, 17))];
    });
  };
  expect(await formats('en')).toEqual(['1,234.5', '17/10/2026']);
  expect(await formats('en-US')).toEqual(['1,234.5', '10/17/2026']);
  expect(await formats('de')).toEqual(['1.234,5', '17.10.2026']);
});
