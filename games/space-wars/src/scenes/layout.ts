import type { Role, UnitId } from '../game/factions';
import { TRACKS, type Track } from '../game/research';
import type { Build } from '../game/world';

export const VIEW = { w: 960, h: 540 };
/** The top bar: the faction's crystal and counts. */
export const TOP = { h: 34 };
/** The command bar along the bottom: build and train buttons, and the messages. */
export const BAR = { y: 440, h: 100 };
/** The window of the battlefield on screen, between the bars; the camera scrolls inside it. */
export const MAP_VIEW = { x: 0, y: TOP.h, w: VIEW.w, h: BAR.y - TOP.h };
/** The cover's lettering: a geometric sans, bold italic for headings. System fonts only. */
export const FONT = '"Avenir Next", Futura, "Century Gothic", "Trebuchet MS", "Segoe UI", Inter, system-ui, sans-serif';

export const BUTTON = { w: 116, h: 30 };

export type ButtonKey = Role | UnitId | 'expansion' | Track | 'fallback';

/** The generic role of each building and unit type, as the buttons and hover labels name it. */
export const ROLE_LABEL: Record<ButtonKey, string> = {
  hub: 'Hub',
  depot: 'Depot',
  barracks: 'Barracks',
  turret: 'Turret',
  harvester: 'Harvester',
  scout: 'Scout',
  gunship: 'Gunship',
  heavy: 'Heavy',
  expansion: 'Expansion',
  hull: 'Research',
  weapons: 'Research',
  engines: 'Research',
  fallback: 'Command',
};

export interface Button {
  kind: 'build' | 'train' | 'research' | 'command';
  key: ButtonKey;
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLUMN = 120;
const BUILD_ROW = 468;
const TRAIN_ROW = 504;
const BUILD_KEYS: Build[] = ['depot', 'barracks', 'turret', 'expansion'];
const TRAIN_KEYS: UnitId[] = ['harvester', 'scout', 'gunship', 'heavy'];
/** The research column: three slim buttons stacked right of the build and train rows. */
export const RESEARCH_COLUMN = { x: 494, y: 446, w: 112, h: 26, gap: 3 };
/** The Fall back button, at the right end of the message line: sends the selected ships home to repair. */
export const FALL_BACK_BUTTON: Button = { kind: 'command', key: 'fallback', x: 868, y: 445, w: 84, h: 24 };

/** The buttons of the command bar, in the top-left corner of each one. */
export const BUTTONS: Button[] = [
  ...BUILD_KEYS.map((key, i): Button => ({ kind: 'build', key, x: 10 + i * COLUMN, y: BUILD_ROW, ...BUTTON })),
  ...TRAIN_KEYS.map((key, i): Button => ({ kind: 'train', key, x: 10 + i * COLUMN, y: TRAIN_ROW, ...BUTTON })),
  ...TRACKS.map((key, i): Button => {
    const c = RESEARCH_COLUMN;
    return { kind: 'research', key, x: c.x, y: c.y + i * (c.h + c.gap), w: c.w, h: c.h };
  }),
  FALL_BACK_BUTTON,
];
/** Where the message line and the contract panel start, right of the research column. */
export const PANEL_X = RESEARCH_COLUMN.x + RESEARCH_COLUMN.w + 8;
/** The rivals panel (truces and tribute), opened from the top bar's rivals or with T: its box on the map's top right, in view pixels. */
export const RIVALS_PANEL = { x: VIEW.w - 326, y: TOP.h + 8, w: 318, head: 24, row: 52 };
/** The part of the top bar that opens the rivals panel when tapped. */
export const RIVALS_TAB = { x: 798, w: VIEW.w - 798 };
