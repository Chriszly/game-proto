import { t } from './i18n';

/**
 * Play counts per game, kept by Abacus, a free open source counter service that needs no account.
 * Each game has one public counter, `<game folder>` in the `NAMESPACE` namespace: `countPlay` adds
 * one when a game opens and the hub reads them all with `showPlayCounts`. Nothing else is sent.
 *
 * Only a built game counts, never the dev server, browser automation (the playthroughs and other
 * e2e tests) or a `?watch` match, and a reload in the same tab counts once. A counter that cannot be
 * reached just leaves the game, and the hub card, as they are.
 */
const API = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'chriszly-game-proto';

/** The game folder of a path like `/games/<name>/` or `games/<name>/`, or undefined. */
export function gameOf(path: string) {
  return /(?:^|\/)games\/([a-z0-9-]+)\//.exec(path)?.[1];
}

/** Adds one to this game's counter, once per tab. `setupGame` calls it. */
export function countPlay() {
  const game = gameOf(location.pathname);
  if (!game || !import.meta.env.PROD || navigator.webdriver) return;
  if (new URLSearchParams(location.search).has('watch')) return;
  const key = `${game}-play-counted`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage can be blocked; then every load counts.
  }
  fetch(`${API}/hit/${NAMESPACE}/${game}`).catch(() => {});
}

/**
 * Adds a "N plays" line to every hub card (`.game a`) whose game has been played. Browser automation
 * skips it, so the e2e tests never reach the service, unless the test sets `window.showPlayCounts`.
 */
export function showPlayCounts(cards: Iterable<HTMLAnchorElement>) {
  if (navigator.webdriver && !(window as { showPlayCounts?: boolean }).showPlayCounts) return;
  for (const card of cards) {
    const game = gameOf(card.getAttribute('href') ?? '');
    if (!game) continue;
    fetch(`${API}/get/${NAMESPACE}/${game}`)
      .then((res) => (res.ok ? res.json() : undefined))
      .then((data: { value?: unknown } | undefined) => {
        const value = data?.value;
        if (typeof value !== 'number' || value < 1) return;
        const line = document.createElement('p');
        line.className = 'plays';
        line.dataset.plays = String(value);
        line.textContent = t('plays', { n: value });
        card.append(line);
      })
      .catch(() => {});
  }
}
