import { LANGUAGES, settings, type Language } from './settings';
import en from './i18n/en';
import enUS from './i18n/en-US';
import de from './i18n/de';

/**
 * Translations for the hub, the shared screens and the games. The language comes from the hub's
 * Settings panel (`settings.language`), or from `?lang=de` in the URL for a quick look without
 * changing the setting. Numbers and dates follow it too: British English (1,234.5 and 17/10/2026),
 * US English (1,234.5 and 10/17/2026) or German (1.234,5 and 17.10.2026).
 *
 * Every text set has its British English source in an `i18n/en.ts` and one file per other language
 * next to it: `i18n/de.ts`, typed with `Translation<typeof en>` so `npm run build` fails on a
 * missing or extra key, and `i18n/en-US.ts`, typed `Partial<Translation<typeof en>>`, with only
 * the texts whose US spelling differs (the rest falls back to `en.ts`). `scripts/check-translations.mjs` checks the rest on every PR: placeholders, plural
 * forms and texts left in English (a text that is the same in both languages goes in that file's
 * `keepEnglish`).
 *
 * A text is a string with `{name}` placeholders, or plural forms picked by the `n` value:
 * `{ one: '{n} play', other: '{n} plays' }`. Number values are formatted for the language.
 */
export type Text = string | { one: string; other: string };
export type Texts = Record<string, Text>;

/** A translation of the English texts `E`: the same keys, each a plain text or plural forms like its English one. */
export type Translation<E extends Texts> = { [K in keyof E]: E[K] extends string ? string : { one: string; other: string } };

/** The values a text's placeholders are filled with. */
export type Vars = Record<string, string | number>;

/** The locale for each language's numbers and dates. */
const LOCALES: Record<Language, string> = { en: 'en-GB', 'en-US': 'en-US', de: 'de-DE' };

let current: Language = fromUrl() ?? settings.language;

function fromUrl(): Language | undefined {
  const lang = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
  return LANGUAGES.find((l) => l === lang);
}

/** The language everything is shown in. */
export function language(): Language {
  return current;
}

/** Switches the language for texts asked for from now on; the hub calls it when the setting changes. */
export function setLanguage(lang: Language) {
  current = lang;
  document.documentElement.lang = locale();
}

/** The locale of the current language, for `Intl` and `toLocaleString`. */
export function locale(): string {
  return LOCALES[current];
}

/** A number in the current language: `formatNumber(1234.5)` is 1,234.5 in English and 1.234,5 in German. */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale(), options).format(n);
}

/** A date in the current language: 17/10/2026 in English and 17.10.2026 in German, unless `options` say otherwise. */
export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), options).format(date);
}

/**
 * A translator for one set of texts: `const t = translator({ en, 'en-US': enUS, de })`, then `t('plays', { n: 3 })`.
 * It reads the language on every call, so texts asked for after a switch come in the new language.
 */
export function translator<E extends Texts>(texts: { en: E } & Partial<Record<Language, Partial<Translation<E>>>>) {
  return (key: keyof E & string, vars: Vars = {}): string => {
    // A text missing from the language (US English only lists what differs) falls back to British English.
    const text: Text = (texts[current] as Texts | undefined)?.[key] ?? texts.en[key];
    const form = typeof text === 'string' ? text : new Intl.PluralRules(locale()).select(Number(vars.n)) === 'one' ? text.one : text.other;
    return form.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = vars[name];
      return value === undefined ? whole : typeof value === 'number' ? formatNumber(value) : value;
    });
  };
}

/** Picks the value for the current language, falling back to English: `byLanguage({ en: howToPlay, de: anleitung })`. */
export function byLanguage<T>(values: { en: T } & Partial<Record<Language, T>>): T {
  return values[current] ?? values.en;
}

/** The shared texts: the hub, its Settings panel and the loading, start, pause and How to play screens. */
export const t = translator({ en, 'en-US': enUS, de });

/**
 * Fills every element under `root` marked `data-i18n="key"` with that shared text, every
 * `data-i18n-alt="key"` with it as its alt text and every `data-i18n-label="key"` with it as its
 * `aria-label`. The hub page marks its text this way.
 */
export function translatePage(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n as keyof typeof en);
  for (const el of root.querySelectorAll<HTMLImageElement>('[data-i18n-alt]')) el.alt = t(el.dataset.i18nAlt as keyof typeof en);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel as keyof typeof en));
}
