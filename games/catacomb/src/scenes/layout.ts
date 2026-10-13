// Where things are drawn in the 960x540 view. The rooms' places on the map are in
// src/game/map.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;

/** Where the hero's feet stand in a fight. */
export const HERO_FEET = { x: 230, y: 330 };
/** Where the foes' feet stand, by how many there are. */
export const FOE_XS: Record<number, number[]> = { 1: [700], 2: [610, 800], 3: [560, 710, 860] };
export const FOE_FEET_Y = 330;
export const HP_BAR = { w: 112, h: 18, dy: 8 };

/** The hand, fanned along the bottom, by the cards' centres. */
export const HAND = { x: 480, y: 450, w: 124, h: 172, gap: 130, span: 620 };
/** The energy orb, bottom left. */
export const ENERGY_ORB = { x: 72, y: 430, r: 36 };
export const END_TURN = { x: 884, y: 420 };
/** The draw pile's count under the energy orb, the discard's under End turn. */
export const PILES_Y = 492;

/** The reward cards, by their centres, and the button to take none. */
export const REWARD = { xs: [300, 480, 660], y: 290, scale: 1.25 };
export const SKIP = { x: 480, y: 476 };
/** The button on the rest, defeat and victory panels. */
export const PANEL_BUTTON = { x: 480, y: 360 };

export const BUTTON = { w: 160, h: 44 };
export const ROOM_RADIUS = 32;

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
