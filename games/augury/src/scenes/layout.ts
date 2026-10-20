// Where things are drawn, in the designed 960x540 frame. A screen of another shape grows the view
// around the frame (`viewFrame`); the backdrop fills the whole view and the camera keeps the frame
// in the middle.

export const VIEW = { w: 960, h: 540 };

/** The run screen: the bar along the top, the stage with the puzzle, and the side panel. */
export const TOP = { x: 24, y: 14, w: 912, h: 54 };
export const STAGE = { x: 24, y: 80, w: 620, h: 404 };
export const BOARD = { x: 44, y: 146, w: 580, h: 330 };
/** Undo, Hint and Skip under the stage, clear of the corner buttons at the bottom left. */
export const TOOLS = { xs: [244, 364, 484], y: 507, w: 110, h: 34 };
export const SIDE = { x: 660, y: 80, w: 276, h: 446 };
/** The Leave button at the right end of the top bar, by its centre. */
export const LEAVE = { x: 892, y: 41, w: 70, h: 30 };

/** The menu: the title, the mode cards (by their centres) and the Records button. */
export const MENU = {
  title: { x: 480, y: 64 },
  tagline: { x: 480, y: 108 },
  cards: { xs: [107, 256, 405, 554, 703, 852], y: 290, w: 136, h: 236 },
  records: { x: 480, y: 470, w: 180, h: 40 },
  line: { x: 480, y: 510 },
};

/** The practice picker: level buttons and the nine puzzle cards, by their centres. */
export const PRACTICE = {
  title: { x: 480, y: 46 },
  levels: { xs: [264, 408, 552, 696], y: 104, w: 132, h: 38 },
  cards: { xs: [180, 480, 780], ys: [196, 318, 440], w: 284, h: 106 },
};

export const BACK = { x: 84, y: 46, w: 110, h: 36 };

/** Cards dealt over the stage (a draft, relics) and the end card, by their centres. */
export const DEAL = { title: 150, xs2: [370, 590], xs3: [260, 480, 700], y: 320, w: 196, h: 260 };
export const END = { x: 480, y: 280, w: 520, h: 330 };
export const END_BUTTONS = { xs: [380, 580], y: 400, w: 170, h: 44 };

export const UI_DEPTH = 10;
