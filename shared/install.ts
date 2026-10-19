import { t } from './i18n';
import { gameOf } from './playCount';

/**
 * Installing the hub as an app (a PWA). The build's service worker (`scripts/pwa.ts`) caches every
 * game for offline play; the hub and every game register it, so a player who only ever opened one
 * game can still play the rest offline once it has loaded. Only the built site registers it, never
 * the dev server or browser automation, so tests always load fresh files.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || navigator.webdriver || !('serviceWorker' in navigator)) return;
  const root = gameOf(location.pathname) ? '../../' : './';
  navigator.serviceWorker.register(`${root}sw.js`, { scope: root }).catch(() => {});
  // An installed app asks the browser to keep its saves even when the device runs low on space.
  // Asking from a browser tab would show a prompt in some browsers, so only the app asks.
  if (installed()) navigator.storage?.persist?.().catch(() => {});
}

/** Whether the page runs as the installed app rather than in a browser tab. */
function installed() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Chromium's install prompt, which it offers once the page can be installed. */
interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
}

/**
 * Shows an Install button where the page can be installed: browsers built on Chromium offer their
 * install prompt, and on iPhones and iPads the button explains Add to Home Screen. With `always`
 * (a game opened with `?install` from the ⚙ on its hub card) it shows in every browser, and where
 * there is no prompt it says how to install from the browser's menu. In the installed app it stays
 * hidden. The hub has one next to Settings, and every game one on its start and pause screens.
 */
export function mountInstallButton(button: HTMLButtonElement, always = false) {
  if (installed()) return;
  let offer: InstallPrompt | undefined;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    offer = e as InstallPrompt;
    button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    offer = undefined;
    button.hidden = true;
  });
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (apple || always) button.hidden = false;
  button.addEventListener('click', async () => {
    if (!offer) {
      alert(t(apple ? 'installAppHint' : 'installAppMenuHint'));
      return;
    }
    await offer.prompt();
    offer = undefined;
    button.hidden = true;
  });
}

/** The files the installed app was opened with, in browsers that let an app open files. */
interface LaunchQueue {
  setConsumer(consumer: (params: { files: { getFile(): Promise<File> }[] }) => void): void;
}

/**
 * Calls `open` with a `.gh` progress file the player opened with the installed app (the
 * manifest's `file_handlers`; desktop browsers built on Chromium support it).
 */
export function onOpenFile(open: (file: File) => void) {
  const queue = (window as { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(async ({ files }) => {
    if (files[0]) open(await files[0].getFile());
  });
}
