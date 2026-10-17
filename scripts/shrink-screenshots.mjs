// Turns PR screenshots into small WebP files: scaled down so the longer side is at most 960 pixels
// (or --max), encoded by Chromium at quality 80 (or --quality), written next to the source as
// <name>.webp, and the source deleted. Uses the Chromium Playwright already installs, so it needs
// no extra packages.
//
//   npm run screenshots -- games/apothecary/docs/screenshots/new-cauldron.png
//   npm run screenshots -- --max 1280 --keep shot.png other.png
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
let max = 960;
let quality = 80;
let keep = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max') max = Math.min(1280, Number(args[++i]));
  else if (args[i] === '--quality') quality = Number(args[++i]);
  else if (args[i] === '--keep') keep = true;
  else files.push(args[i]);
}
if (!files.length || !(max > 0) || !(quality > 0 && quality <= 100)) {
  console.error('Usage: npm run screenshots -- [--max 960] [--quality 80] [--keep] <image>...');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of files) {
  const out = file.replace(/\.[^./]+$/, '') + '.webp';
  const dataUrl = await page.evaluate(
    async ({ b64, max, quality }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes]));
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', quality / 100);
    },
    { b64: readFileSync(file).toString('base64'), max, quality },
  );
  const before = statSync(file).size;
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  if (!keep && out !== file) unlinkSync(file);
  console.log(`${out}: ${Math.round(before / 1024)} KB -> ${Math.round(statSync(out).size / 1024)} KB`);
}
await browser.close();
