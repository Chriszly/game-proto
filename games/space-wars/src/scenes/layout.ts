import type { Role, UnitId } from '../game/factions';

export const VIEW = { w: 960, h: 540 };
/** The top bar: the faction's crystal and counts. */
export const TOP = { h: 34 };
/** The command bar along the bottom: build and train buttons, and the messages. */
export const BAR = { y: 440, h: 100 };
export const FONT = 'monospace';

export const BUTTON = { w: 112, h: 30 };

export type ButtonKey = Role | UnitId;

export interface Button {
  kind: 'build' | 'train';
  key: ButtonKey;
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLUMN = 118;
const BUILD_ROW = 468;
const TRAIN_ROW = 504;
const BUILD_KEYS: Role[] = ['depot', 'barracks', 'turret'];
const TRAIN_KEYS: UnitId[] = ['harvester', 'scout', 'gunship', 'heavy'];

/** The buttons of the command bar, in the top-left corner of each one. */
export const BUTTONS: Button[] = [
  ...BUILD_KEYS.map((key, i): Button => ({ kind: 'build', key, x: 10 + i * COLUMN, y: BUILD_ROW, ...BUTTON })),
  ...TRAIN_KEYS.map((key, i): Button => ({ kind: 'train', key, x: 10 + i * COLUMN, y: TRAIN_ROW, ...BUTTON })),
];
