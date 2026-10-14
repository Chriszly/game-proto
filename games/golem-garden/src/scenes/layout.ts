// Where things are drawn in the 960x540 view. The board itself is `GRID` in src/game/board.ts.
export { GRID, cellCentre } from '../game/board';

export const VIEW = { w: 960, h: 540 };
/** The clay strip across the top: its centre line, and the x of each tag's icon and number. */
export const HUD = {
  y: 32,
  wave: { x: 235, w: 105 },
  leaf: { x: 370, w: 75, icon: 392, text: 410 },
  sap: { x: 490, w: 80, icon: 512, text: 528 },
  bloom: { x: 583, w: 244, flowers: 605, gap: 19, text: 692 },
};
/** The side panel right of the board. */
export const PANEL = { x: 800, y: 64, w: 148, h: 448 };
/** The seed cards, by their centres, in the order of GOLEMS; the third (thorn) card is shorter. */
export const SEED_BUTTONS = { x: 874, ys: [130, 226, 311], hs: [84, 84, 68], w: 136 };
/** The next wave's preview, above the wave button. */
export const PREVIEW = { x: 808, y: 356, w: 132, h: 62 };
/** The one-line hint between the preview and the wave button. */
export const HINT = { y: 432 };
/** The button that sends the next wave, or calls it early. */
export const WAVE_BUTTON = { x: 874, y: 470, w: 136, h: 48 };
export const BUTTON = { w: 200, h: 44 };

export const UI_DEPTH = 10_000;
export const FONT = '"DejaVu Sans", "Trebuchet MS", Verdana, system-ui, sans-serif';
