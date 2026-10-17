import type { SharedKey } from './i18n/en';

/**
 * Settings shared by every game, set on the hub's Settings panel and read by each game when it
 * starts. They live under one storage key next to the games' own saves (every game shares the
 * hub's origin), so starting a new game in one of them keeps them.
 *
 * To add a setting: add it to `Settings` and `DEFAULTS`, describe it in `SETTING_FIELDS` so the hub
 * panel shows it, and honour it in the games (in `setupGame` when it can be done for all of them).
 */

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** The frame rates the frame cap offers. */
export const FRAME_RATES = [30, 60, 144, 160, 240, 320] as const;
export type FrameRate = (typeof FRAME_RATES)[number];

/**
 * The languages the hub and the shared screens speak; each game translates its own text
 * (`i18n.ts`). `en` is British English, the source every other language translates; `en-US` only
 * changes the spelling where it differs, and the numbers and dates.
 */
export const LANGUAGES = ['en', 'en-US', 'de'] as const;
export type Language = (typeof LANGUAGES)[number];
/** Each language's own name, the same whatever language is chosen. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English (UK)', 'en-US': 'English (US)', de: 'Deutsch' };

/** The browser's language when one is offered (en-US, or any German), else British English. */
function browserLanguage(): Language {
  const code = (typeof navigator === 'undefined' ? '' : navigator.language).toLowerCase();
  if (code === 'en-us') return 'en-US';
  return code.startsWith('de') ? 'de' : 'en';
}

export interface Settings {
  /** How hard every game plays; each game decides what that scales. Normal is the game as designed. */
  difficulty: Difficulty;
  /** The most frames per second a game updates and draws. */
  fps: FrameRate;
  /** Shows the frame rate a game reaches in its corner. */
  showFps: boolean;
  /** Turns off camera shake, flashes and blinking hit effects. */
  reduceMotion: boolean;
  /** The language of the hub, the shared screens and every game that has been translated. */
  language: Language;
}

export const DEFAULTS: Settings = { difficulty: 'normal', fps: 60, showFps: false, reduceMotion: false, language: browserLanguage() };

/**
 * One row of the hub's Settings panel. Labels and hints are keys of the shared texts
 * (`i18n/en.ts`), so the panel shows them in the chosen language; an option with `text` shows it as is.
 */
export type SettingOption = { value: string | number } & ({ label: SharedKey } | { text: string });
export type SettingField =
  | { key: keyof Settings; label: SharedKey; hint: SharedKey; kind: 'choice'; options: readonly SettingOption[] }
  | { key: keyof Settings; label: SharedKey; hint: SharedKey; kind: 'toggle' };

export const SETTING_FIELDS: readonly SettingField[] = [
  {
    key: 'language',
    label: 'settingLanguage',
    hint: 'settingLanguageHint',
    kind: 'choice',
    options: LANGUAGES.map((l) => ({ value: l, text: LANGUAGE_NAMES[l] })),
  },
  {
    key: 'difficulty',
    label: 'settingDifficulty',
    hint: 'settingDifficultyHint',
    kind: 'choice',
    options: DIFFICULTIES.map((d) => ({ value: d, label: d })),
  },
  {
    key: 'fps',
    label: 'settingFps',
    hint: 'settingFpsHint',
    kind: 'choice',
    options: FRAME_RATES.map((fps) => ({ value: fps, text: String(fps) })),
  },
  { key: 'showFps', label: 'settingShowFps', hint: 'settingShowFpsHint', kind: 'toggle' },
  { key: 'reduceMotion', label: 'settingReduceMotion', hint: 'settingReduceMotionHint', kind: 'toggle' },
];

export const SETTINGS_KEY = 'hub-settings';

/** Reads the settings, keeping only known keys with valid values. */
export function loadSettings(): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {};
  } catch {
    // Blocked storage (private mode) or a broken value: use the defaults.
  }
  return {
    difficulty: DIFFICULTIES.find((d) => d === saved.difficulty) ?? DEFAULTS.difficulty,
    fps: FRAME_RATES.find((f) => f === saved.fps) ?? DEFAULTS.fps,
    showFps: typeof saved.showFps === 'boolean' ? saved.showFps : DEFAULTS.showFps,
    reduceMotion: typeof saved.reduceMotion === 'boolean' ? saved.reduceMotion : DEFAULTS.reduceMotion,
    language: LANGUAGES.find((l) => l === saved.language) ?? DEFAULTS.language,
  };
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked (private mode); the settings last until the page closes.
  }
}

/** The settings as they were when the page loaded; games read these. */
export const settings: Readonly<Settings> = loadSettings();

/** Picks the value for the chosen difficulty, e.g. `byDifficulty(1.4, 1, 0.75)`. */
export function byDifficulty<T>(easy: T, normal: T, hard: T): T {
  return { easy, normal, hard }[settings.difficulty];
}
