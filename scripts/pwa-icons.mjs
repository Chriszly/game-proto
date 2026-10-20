// Draws the app icons for the installable hub and games (see scripts/pwa.ts) from their favicons:
// the hub's into public/icons/ and each game's into public/icons/games/<name>-192.png and -512.png,
// on the game's background colour (from its index.html) with room around it, so phones can crop
// the icon to any shape. Run it once for a new game, or after a favicon changes:
//
//   node scripts/pwa-icons.mjs [game...]
//
// Uses the Chromium Playwright already installs, so it needs no extra packages.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';

const HUB_BACKGROUND = '#1b1410';
const games = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('games', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
async function draw(svgFile, out, size, padding, background) {
  const svg = readFileSync(svgFile, 'utf8');
  const inner = Math.round(size * (1 - 2 * padding));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${background}">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body>',
  );
  await page.screenshot({ path: out, omitBackground: background === 'transparent' });
  console.log(out);
}

mkdirSync('public/icons/games', { recursive: true });
if (!process.argv.slice(2).length) {
  await draw('favicon.svg', 'public/icons/icon-192.png', 192, 0.04, 'transparent');
  await draw('favicon.svg', 'public/icons/icon-512.png', 512, 0.04, 'transparent');
  await draw('favicon.svg', 'public/icons/icon-maskable-512.png', 512, 0.18, HUB_BACKGROUND);
  await draw('favicon.svg', 'public/icons/apple-touch-icon.png', 180, 0.1, HUB_BACKGROUND);
}
for (const game of games) {
  const html = readFileSync(`games/${game}/index.html`, 'utf8');
  const background = /background: *(#[0-9a-fA-F]{3,6})/.exec(html)?.[1] ?? HUB_BACKGROUND;
  for (const size of [192, 512]) await draw(`games/${game}/favicon.svg`, `public/icons/games/${game}-${size}.png`, size, 0.16, background);
}
await browser.close();
