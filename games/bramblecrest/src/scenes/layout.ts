// Where things sit on the 960x540 screen, and how the knight moves and fights.

export const VIEW = { w: 960, h: 540 };

/** The knight's walking speed, in pixels a second. */
export const WALK_SPEED = 130;
/** A roll: how far and fast it goes, and how long before the next. */
export const ROLL_SPEED = 300;
export const ROLL_MS = 280;
export const ROLL_COOLDOWN_MS = 700;
/** A sword swing: how long it shows, how long before the next, and how far it reaches. */
export const SWING_MS = 220;
export const SWING_COOLDOWN_MS = 330;
export const SWING_REACH = 24;
export const SWING_RADIUS = 20;
/** The hookvine: its reach, and how fast it flies, comes back and pulls. */
export const VINE_RANGE = 228;
export const VINE_SPEED = 560;
export const PULL_SPEED = 400;
/** After a hit, how long the knight can't be hurt again. */
export const HURT_MS = 1000;
/** How close (in pixels) the knight's feet must be to pick something up. */
export const PICKUP_PX = 18;
/** The lantern the knight carries, and with the lantern oil from the shrine. */
export const LANTERN = 120;
export const LANTERN_OIL = 175;

/** Touch buttons, bottom right: sword, roll and hookvine. */
export const BUTTONS = {
  sword: { x: 880, y: 456, r: 34 },
  roll: { x: 800, y: 490, r: 28 },
  vine: { x: 812, y: 410, r: 28 },
};
