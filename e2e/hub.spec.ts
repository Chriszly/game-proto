import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

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
  { name: 'Ninefold', path: '/games/ninefold/' },
  { name: 'Augury', path: '/games/augury/' },
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
  // Every card's cover loads, once it scrolls into view.
  const covers = page.locator('.game .cover');
  await expect(covers).toHaveCount(GAMES.length);
  for (const cover of await covers.all()) {
    await cover.scrollIntoViewIfNeeded();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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
    genreFilter: false,
    // Desktop Chromium can't tell WiFi from mobile data, so Wi-Fi only isn't offered.
    updates: 'auto',
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

  // Delete all progress clears the games' saves and Continue playing, keeps the settings, and leaves
  // other sites' keys on the same origin alone.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('apothecary-save', '{}');
    localStorage.setItem('other-site-data', '1');
  });
  await page.reload();
  const recent = page.getByRole('navigation', { name: 'Continue playing' });
  await expect(recent.getByRole('link')).toHaveText(['Apothecary']);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete all progress' }).click();
  expect((await page.evaluate(() => Object.keys(localStorage))).sort()).toEqual(['hub-settings', 'other-site-data']);
  await expect(recent).toBeHidden();

  await dialog.getByRole('button', { name: 'Restore defaults' }).click();
  await expect(choice('Difficulty', 'Normal')).toHaveAttribute('aria-pressed', 'true');
  await expect(choice('Show FPS', 'Off')).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
});

// A card's ⚙ deletes just that game's progress, a game played shows under Continue playing, and the
// genre filter (off by default) lists one genre's games.
test('hub game settings, continue playing and genre filter', async ({ page }, testInfo) => {
  await page.goto('/games/apothecary/');
  await expect(page.locator('canvas:not([data-backdrop])')).toBeVisible();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('apothecary-save', '{}');
    localStorage.setItem('apothecary-zoom', '2');
    localStorage.setItem('deadline-best', '3');
  });
  await page.reload();
  const recent = page.getByRole('navigation', { name: 'Continue playing' });
  await expect(recent.getByRole('link')).toHaveText(['Apothecary']);

  await page.getByRole('button', { name: 'Settings for Apothecary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apothecary' });
  await expect(dialog).toContainText('This game has progress saved on this device');
  await expect(dialog.getByRole('link', { name: 'Play' })).toHaveAttribute('href', 'games/apothecary/');
  await expect(dialog.getByRole('link', { name: 'Install' })).toHaveAttribute('href', 'games/apothecary/?install');
  testInfo.attach('game settings', { body: await dialog.screenshot({ path: testInfo.outputPath('game-settings.png') }), contentType: 'image/png' });
  page.once('dialog', (d) => d.accept());
  await dialog.getByRole('button', { name: "Delete this game's progress" }).click();
  await expect(dialog).toContainText('Nothing is saved for this game yet.');
  await expect(dialog.getByRole('button', { name: "Delete this game's progress" })).toBeDisabled();
  expect((await page.evaluate(() => Object.keys(localStorage))).sort()).toEqual(['deadline-best', 'hub-recent']);
  await expect(recent).toBeHidden();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // The genre filter shows once its setting is on.
  const genres = page.getByRole('group', { name: 'Genres' });
  await expect(genres).toBeHidden();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('group', { name: 'Genre filter' }).getByRole('button', { name: 'On' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Close' }).click();
  await genres.getByRole('button', { name: 'Puzzle' }).click();
  await expect(genres.getByRole('button', { name: 'Puzzle' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.game:visible h2')).toContainText(['Augury', 'Lanternkeep', 'Mapmaker', 'Ninefold', 'Shrine Stack', 'TinctureTinker', 'Tiny Kingdom', 'Wyrmrail']);
  await expect(page.locator('.game:visible')).toHaveCount(8);
  testInfo.attach('genre filter', { body: await page.screenshot({ path: testInfo.outputPath('genre-filter.png') }), contentType: 'image/png' });
  await genres.getByRole('button', { name: 'All' }).click();
  await expect(page.locator('.game:visible')).toHaveCount(GAMES.length);
});

// Every game has a sound button beside full screen and pause. It opens the sound menu, with the music
// and effects volumes and a Mute button; the M key mutes too, and the next game keeps the settings.
// The pause screen sets the same volumes. The corner buttons keep clear of the screen's edges, for
// phones with rounded corners.
test('games have a sound menu and volumes', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.assign(window, { showStartScreen: true }));
  await page.goto('/games/apothecary/');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hub-settings') ?? '{}'));
  const sound = page.locator('.sound-button');
  const menu = page.locator('.sound-menu');
  const mute = menu.locator('.sound-mute');
  await expect(sound).toHaveAttribute('aria-label', 'Sound');
  // Full screen, sound and pause sit in one row, in that order, 12px from the edges.
  const corner = await page.locator('.game-corner').boundingBox();
  const view = page.viewportSize()!;
  expect(corner!.x).toBe(12);
  expect(view.height - corner!.y - corner!.height).toBe(12);
  await page.locator('.game-start-button').click();
  const order = await page.locator('.game-corner > button').evaluateAll((buttons) => buttons.map((b) => b.className.split(' ')[0]));
  expect(order).toEqual(['fullscreen-button', 'sound-button', 'pause-button']);

  // The button opens the menu above the corner row, with a slider each for music and effects.
  await expect(menu).toBeHidden();
  await sound.click();
  await expect(menu).toBeVisible();
  await expect(sound).toHaveAttribute('aria-expanded', 'true');
  const menuBox = (await menu.boundingBox())!;
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(corner!.y);
  testInfo.attach('sound menu', { body: await page.screenshot({ path: testInfo.outputPath('sound-menu.png') }), contentType: 'image/png' });
  const music = menu.getByRole('slider', { name: 'Music' });
  await music.fill('30');
  await music.dispatchEvent('change');
  expect(await saved()).toMatchObject({ music: 30 });

  // Mute switches the shared setting, and so does M.
  await expect(mute).toHaveText('Mute (M)');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(mute).toHaveText('Sound on (M)');
  expect((await saved()).muted).toBe(true);
  await page.keyboard.press('m');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  expect((await saved()).muted).toBe(false);
  // Escape, or a tap anywhere else, closes the menu.
  await music.focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await sound.click();
  await page.mouse.click(view.width / 2, view.height / 2);
  await expect(menu).toBeHidden();
  await page.keyboard.press('m');

  // The pause screen shows the same volumes; moving one saves it, turns the sound back on and moves the menu's too.
  await page.locator('.pause-button').click();
  await expect(page.locator('.game-overlay').getByRole('slider', { name: 'Music' })).toHaveValue('30');
  const effects = page.locator('.game-overlay').getByRole('slider', { name: 'Effects' });
  await expect(effects).toBeVisible();
  await effects.fill('40');
  await effects.dispatchEvent('change');
  expect(await saved()).toMatchObject({ effects: 40, muted: false });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await expect(menu.getByRole('slider', { name: 'Effects', includeHidden: true })).toHaveValue('40');

  // Another game opens with the same settings.
  await page.keyboard.press('m');
  await page.goto('/games/hotfoot/');
  await expect(page.locator('.sound-mute')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sound-menu').getByRole('slider', { name: 'Effects', includeHidden: true })).toHaveValue('40');
});

// The first card shows a QR code of the hub's own address, drawn on load, so it fits wherever the hub is hosted.
test('hub shares its link as a QR code', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/index.html?from=test#top');
  const card = page.locator('.games > li').first();
  await expect(card.getByRole('heading')).toHaveText('Share the hub');
  // The link drops the query, the hash and index.html.
  await expect(card.locator('.share-link')).toHaveText('http://localhost:5173/');
  const qr = card.getByRole('img', { name: "QR code of the hub's link" });
  await expect(qr.locator('svg path')).toHaveCount(1);
  // Version 2 holds this link: 25 modules plus the 4-module margin on each side.
  await expect(qr.locator('svg')).toHaveAttribute('viewBox', '0 0 33 33');
  const box = (await qr.boundingBox())!;
  expect(box.width).toBeGreaterThan(120);
  testInfo.attach('share', { body: await page.screenshot({ path: testInfo.outputPath('share.png') }), contentType: 'image/png' });
  await card.getByRole('button', { name: 'Copy link' }).click();
  await expect(card.getByRole('button', { name: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:5173/');
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
  // Install shows only where the browser can install the page, which a test browser can't.
  await expect(page.getByRole('button', { name: 'Install as an app' })).toBeHidden();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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
  await expect(page.getByRole('button', { name: 'Einstellungen', exact: true })).toBeVisible();
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

// Progress files: a game's ⚙ exports just its progress to an encrypted file ending in .gh and the
// game's code, and imports it back; another game's file or an edited one is refused. Settings
// exports every game's progress and the settings to a .gh file and imports it back.
test('hub progress files', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('apothecary-save', '{"coins":42}');
    localStorage.setItem('palisade-best', '7');
    localStorage.setItem('other-site-data', '1');
  });
  await page.reload();
  const alerts: string[] = [];
  page.on('dialog', (d) => {
    if (d.type() === 'alert') alerts.push(d.message());
    d.accept();
  });
  const save = async (button: ReturnType<Page['getByRole']>) => {
    const download = page.waitForEvent('download');
    await button.click();
    const file = await download;
    return { name: file.suggestedFilename(), path: (await file.path())! };
  };
  const load = async (button: ReturnType<Page['getByRole']>, path: string) => {
    const chooser = page.waitForEvent('filechooser');
    await button.click();
    await (await chooser).setFiles(path);
  };
  const stored = (key: string) => page.evaluate((k) => localStorage.getItem(k), key);

  // One game's file holds its progress, encrypted.
  await page.getByRole('button', { name: 'Settings for Palisade' }).click();
  const palisade = page.getByRole('dialog', { name: 'Palisade' });
  const palisadeFile = await save(palisade.getByRole('button', { name: 'Export progress' }));
  expect(palisadeFile.name).toMatch(/^palisade-\d{4}-\d\d-\d\d\.ghpa$/);
  await palisade.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Settings for Apothecary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apothecary' });
  testInfo.attach('game progress file', { body: await dialog.screenshot({ path: testInfo.outputPath('game-progress-file.png') }), contentType: 'image/png' });
  const file = await save(dialog.getByRole('button', { name: 'Export progress' }));
  expect(file.name).toMatch(/^apothecary-\d{4}-\d\d-\d\d\.ghap$/);
  const bytes = readFileSync(file.path);
  expect(bytes.toString('latin1')).not.toContain('coins');

  // Importing it brings the progress back, and leaves the other games alone.
  await page.evaluate(() => {
    localStorage.setItem('apothecary-save', '{"coins":1}');
    localStorage.setItem('apothecary-extra', '1');
  });
  await load(dialog.getByRole('button', { name: 'Import progress' }), file.path);
  await expect.poll(() => stored('apothecary-save')).toBe('{"coins":42}');
  expect(await stored('apothecary-extra')).toBeNull();
  expect(await stored('palisade-best')).toBe('7');
  expect(alerts).toEqual([]);

  // Another game's file and an edited file are refused.
  await load(dialog.getByRole('button', { name: 'Import progress' }), palisadeFile.path);
  await expect.poll(() => alerts).toEqual(['This is not a progress file for Apothecary, or it was changed.']);
  const edited = testInfo.outputPath('edited.ghap');
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(edited, bytes);
  await load(dialog.getByRole('button', { name: 'Import progress' }), edited);
  await expect.poll(() => alerts.length).toBe(2);
  expect(await stored('apothecary-save')).toBe('{"coins":42}');
  await dialog.getByRole('button', { name: 'Close' }).click();

  // Export all and Import all carry every game and the settings, and nothing of other sites.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'Hard' }).click();
  const progressRow = settings.locator('.setting').filter({ has: page.locator('#export-progress') });
  testInfo.attach('progress files', { body: await progressRow.screenshot({ path: testInfo.outputPath('progress-files.png') }), contentType: 'image/png' });
  const all = await save(settings.getByRole('button', { name: 'Export all' }));
  expect(all.name).toMatch(/^game-hub-progress-\d{4}-\d\d-\d\d\.gh$/);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('other-site-data', '2');
  });
  // It reloads the hub, since the settings may have changed.
  const reloaded = page.waitForEvent('load');
  await load(settings.getByRole('button', { name: 'Import all' }), all.path);
  await reloaded;
  expect(await stored('palisade-best')).toBe('7');
  expect(await stored('apothecary-save')).toBe('{"coins":42}');
  expect(await stored('other-site-data')).toBe('2');
  expect(JSON.parse((await stored('hub-settings'))!).difficulty).toBe('hard');
  // A game's file is not a hub file.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await load(settings.getByRole('button', { name: 'Import all' }), file.path);
  await expect.poll(() => alerts.at(-1)).toBe('This is not a .gh progress file, or it was changed.');
});

// The hub and every game link their own web app manifest, so each installs as an app of its own.
test('hub and games install as apps', async ({ page, request }) => {
  for (const [path, name] of [['/', 'Game hub'], ...GAMES.map((g) => [g.path, g.name])]) {
    await page.goto(path);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const url = new URL(href!, page.url()).href;
    const manifest = await (await request.get(url)).json();
    expect(manifest.name).toBe(name);
    expect(new URL(manifest.start_url, url).pathname).toBe(path);
    // An id resolves against the origin, so a relative id would make every app the same one;
    // without an id the app's id is its start_url, which differs for each app.
    const id = manifest.id === undefined ? new URL(manifest.start_url, url) : new URL(manifest.id, new URL(url).origin);
    expect(id.pathname).toBe(path);
    for (const icon of manifest.icons) expect((await request.get(new URL(icon.src, url).href)).ok()).toBe(true);
  }
});

// The Install on a game's hub card opens the game with ?install: its start screen shows Install as
// the main button in every browser, and where the browser has no install prompt it says how.
test('a game installs from its start screen', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.assign(window, { showStartScreen: true }));
  await page.goto('/games/apothecary/?install');
  const install = page.getByRole('button', { name: 'Install as an app' });
  await expect(install).toBeVisible();
  await expect(install).toHaveClass(/game-overlay-button/);
  testInfo.attach('install', { body: await page.screenshot({ path: testInfo.outputPath('install.png') }), contentType: 'image/png' });
  let hint = '';
  page.once('dialog', (d) => {
    hint = d.message();
    d.accept();
  });
  await install.click();
  await expect.poll(() => hint).toBe("To install, pick Install app or Add to Home Screen in your browser's menu.");
  await page.locator('.game-start-button').click();
  await expect(install).toBeHidden();
});

// The Updates setting says when the installed apps download a new version, and Update now checks
// at once; the dev server has no service worker, so it says there is no app to update.
test('hub update settings', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const updates = page.getByRole('dialog', { name: 'Settings' }).getByRole('group', { name: 'Updates' });
  // Desktop Chromium can't tell WiFi from mobile data, so it isn't offered Wi-Fi only.
  await expect(updates.getByRole('button', { name: 'Automatic' })).toHaveAttribute('aria-pressed', 'true');
  await expect(updates.getByRole('button', { name: 'Wi-Fi only' })).toHaveCount(0);
  await updates.getByRole('button', { name: 'Off' }).click();
  await expect(updates.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  const row = updates.locator('xpath=..');
  testInfo.attach('updates', { body: await row.screenshot({ path: testInfo.outputPath('updates.png') }), contentType: 'image/png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hub-settings')!).updates)).toBe('off');
  let message = '';
  page.once('dialog', (d) => {
    message = d.message();
    d.accept();
  });
  await updates.getByRole('button', { name: 'Update now' }).click();
  await expect.poll(() => message).toBe('This browser has no app installed to update. Open the site online once to set up updates and offline play.');
});

// A browser that tells WiFi from mobile data, like Chrome on Android, offers Wi-Fi only and picks it first.
test('hub offers Wi-Fi only updates where the connection type is known', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = (navigator as { connection?: object }).connection!;
    Object.defineProperty(Object.getPrototypeOf(connection), 'type', { get: () => 'wifi', configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const updates = page.getByRole('dialog', { name: 'Settings' }).getByRole('group', { name: 'Updates' });
  await expect(updates.getByRole('button', { name: 'Wi-Fi only' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Wi-Fi only waits while you are on mobile data.', { exact: false })).toBeVisible();
});
