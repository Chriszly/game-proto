// Where things are drawn in the designed 960x540 frame. A wider or taller screen grows the view
// around this frame (`viewFrame`), and the camera keeps the frame in the middle.

export const VIEW = { w: 960, h: 540 };
/** The board: its top-left corner and side. */
export const BOARD = { x: 40, y: 22, size: 460 };
/** The panel right of the board. */
export const PANEL = { x: 540, y: 22, w: 386, h: 470 };
/** The number pad: its top-left key's corner, key size and gap. */
export const PAD = { x: PANEL.x + 24, y: PANEL.y + 148, w: 104, h: 62, gap: 13 };
/** The Notes, Erase and Hint buttons under the pad, by their centres. */
export const TOOLS = { xs: [PANEL.x + 76, PANEL.x + 193, PANEL.x + 310], y: PANEL.y + 394, w: 104, h: 40 };
/** The Menu button at the panel's top right, by its centre. */
export const MENU_BUTTON = { x: PANEL.x + PANEL.w - 58, y: PANEL.y + 34, w: 92, h: 32 };
/** The menu's buttons, by their centres. */
export const MENU = {
  title: { x: 480, y: 62 },
  box: { x: 120, y: 132, w: 720, h: 384 },
  daily: { x: 480, y: 186, w: 330, h: 54 },
  levels: { xs: [312, 480, 648], y: 270, w: 156, h: 54 },
  delve: { x: 480, y: 352, w: 330, h: 54 },
  styles: { x: 480, y: 430, w: 330, h: 50 },
  stats: { x: 480, y: 490 },
};
/** The style cards, three by three, by their centres, and the Back button. */
export const STYLE_CARDS = { xs: [180, 480, 780], ys: [150, 295, 440], w: 280, h: 128 };
export const BACK = { x: 90, y: 50, w: 120, h: 40 };
/** The end-of-board card, its buttons and the relic cards, by their centres. */
export const END = { x: 480, y: 270, w: 460, h: 280 };
export const END_BUTTONS = { xs: [380, 580], y: 360, w: 170, h: 46 };
export const RELIC_CARDS = { xs: [270, 480, 690], y: 300, w: 190, h: 200 };

export const UI_DEPTH = 1000;
