import type { Palette } from './pixelArt';

// Plague doctor, side view facing right: wide-brimmed hat, brass goggles, bone-white beak mask, long cloak.
export const DOCTOR_PALETTE: Palette = {
  K: 0x17141a, // hat
  H: 0x4a4050, // hat band
  C: 0x2a2430, // cloak
  c: 0x40384a, // cloak fold highlight
  G: 0xc9a040, // goggle rim
  R: 0xe2593f, // goggle lens
  M: 0xe3d8b8, // beak mask
  m: 0xa89c7c, // beak shadow
  L: 0x5a3a22, // leather gloves and boots
};

const BODY = [
  '................',
  '.....KKKKK......',
  '.....KKKKK......',
  '.....HHHHH......',
  '...KKKKKKKKK....',
  '.....CCCCC......',
  '.....CCCGG......',
  '.....CCGRGMM....',
  '.....CCCGMMMMM..',
  '.....CCCCmmmmmM.',
  '.....CCCCC......',
  '....CCCCCCC.....',
  '...CCcCCCCCC....',
  '...CCcCCCCLC....',
  '...CCcCCCCLL....',
  '...CCcCCCCCC....',
  '...CCcCCCCCC....',
  '..CCCcCCCCCCC...',
  '..CCCcCCCCCCC...',
  '..CCCCCCCCCCC...',
];

const LEGS_IDLE = [
  '....CC...CC.....',
  '....CC...CC.....',
  '....LL...LL.....',
  '....LLL..LLL....',
];

const LEGS_STRIDE = [
  '...CC.....CC....',
  '..CC.......CC...',
  '..LL.......LL...',
  '..LLL......LLL..',
];

const LEGS_PASS = [
  '.....CC.CC......',
  '.....CC.CC......',
  '.....LL.LL......',
  '.....LLLLLLL....',
];

/** Texture keys and pixel rows for the idle frame and the two walk frames. */
export const DOCTOR_FRAMES: Record<string, string[]> = {
  'doctor-idle': [...BODY, ...LEGS_IDLE],
  'doctor-stride': [...BODY, ...LEGS_STRIDE],
  'doctor-pass': [...BODY, ...LEGS_PASS],
};
