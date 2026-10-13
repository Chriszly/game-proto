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

export interface Settings {
  /** How hard every game plays; each game decides what that scales. Normal is the game as designed. */
  difficulty: Difficulty;
  /** The most frames per second a game updates and draws. */
  fps: FrameRate;
  /** Shows the frame rate a game reaches in its corner. */
  showFps: boolean;
  /** Turns off camera shake, flashes and blinking hit effects. */
  reduceMotion: boolean;
}

export const DEFAULTS: Settings = { difficulty: 'normal', fps: 60, showFps: false, reduceMotion: false };

/** One row of the hub's Settings panel. */
export type SettingField =
  | { key: keyof Settings; label: string; hint: string; kind: 'choice'; options: readonly { value: string | number; label: string }[] }
  | { key: keyof Settings; label: string; hint: string; kind: 'toggle' };

export const SETTING_FIELDS: readonly SettingField[] = [
  {
    key: 'difficulty',
    label: 'Difficulty',
    hint: 'Each game scales its own challenge: enemies, timers, patience or prices.',
    kind: 'choice',
    options: DIFFICULTIES.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) })),
  },
  {
    key: 'fps',
    label: 'Frame rate (FPS)',
    hint: 'The most frames per second a game draws. Lower saves battery.',
    kind: 'choice',
    options: FRAME_RATES.map((fps) => ({ value: fps, label: String(fps) })),
  },
  { key: 'showFps', label: 'Show FPS', hint: 'Shows the frame rate in the corner of every game.', kind: 'toggle' },
  { key: 'reduceMotion', label: 'Reduce motion', hint: 'Turns off screen shake, flashes and blinking hit effects.', kind: 'toggle' },
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
