// The colours the scene draws with at runtime (the textures carry their own): the slate-and-gold
// HUD, health bars and the effects.

export const SLATE = { dark: 0x141820, mid: 0x262b36, light: 0x3a3348, panel: 0x222630 };
export const GOLD = { dark: 0xb8862c, mid: 0xe5b53a, light: 0xffcf4a, pale: 0xffe7a0 };
export const FIRE = { dark: 0xe0512a, mid: 0xf09a3a, light: 0xf8d460, white: 0xfff4d0 };
export const STORM = { mid: 0x9d90f0, light: 0xd9d2ff, white: 0xffffff };
export const XP = { fill: 0x3d8fd6, facet: 0x5aa8ea, shine: 0xa8d8ff, back: 0x2c3446 };

/** Health bar colours: green for a foe's bar, and one per boss bar, from the last bar up. */
export const BAR = { back: 0x1d2129, empty: 0x3a2f28, hp: 0x69d05a, hpShine: 0xa6ef8f, barricade: 0xc88a3a, barricadeShine: 0xe8b260 };
export const BOSS_BARS = [0xd8433f, 0xf09a3a, 0xe6c766, 0x7ccf5a, 0x5aa0d8, 0x9d90f0];

/** CSS colours for text. */
export const TEXT = { gold: '#ffcf4a', pale: '#ffe7a0', light: '#e9e4d8', dim: '#c9c3b6', blue: '#9fd3ff', ink: '#141820', orange: '#ff9b3a', green: '#8fdc6a' };
