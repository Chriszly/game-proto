import Phaser from 'phaser';
import { INK } from './palette';
import { PixelCanvas, type Palette } from './pixelArt';

// Customers: townsfolk seen from the front, 22x34 art pixels shown at 2x. Each look is a head
// (hooded or bare) on a shared tunic body, with its own colours.

export const CUSTOMER_LOOKS = 5;
export const customerTexture = (id: number) => `customer-${id % CUSTOMER_LOOKS}`;

const HOODED = [
  '......................',
  '........HHHHHH........',
  '.......HHHHHHHH.......',
  '......HHhhhhhhHH......',
  '......HhSSSSSShH......',
  '.....HHhSSSSSShHH.....',
  '.....HHSeSSSSeSHH.....',
  '.....HHSSSSSSSSHH.....',
  '.....HHSSSmmSSSHH.....',
  '.....HHHsSSSSsHHH.....',
  '....HHHHHssssHHHHH....',
  '....HHHHHHHHHHHHHH....',
];

const BARE = [
  '......................',
  '......................',
  '........hhhhhh........',
  '.......hHHHHHHh.......',
  '......hHHHHHHHHh......',
  '......HHSSSSSSHH......',
  '......HSSSSSSSSH......',
  '......HSeSSSSeSH......',
  '......HSSSSSSSSH......',
  '.......SSSmmSSS.......',
  '.......sSSSSSSs.......',
  '.........ssss.........',
];

const BODY = [
  '...tTTTTTTTTTTTTTTt...',
  '...tTTTTTTTTTTTTTTt...',
  '...TTTtTTTTTTTTtTTT...',
  '...TTTtTTTTTTTTtTTT...',
  '...TTTtTTTTTTTTtTTT...',
  '...TTTtTTTTTTTTtTTT...',
  '...TTTtBBBBkBBBtTTT...',
  '...SSStTTTTTTTTtSSS...',
  '...sSStTTTTTTTTtSSs...',
  '......TTTTTTTTTT......',
  '......TTTTTTTTTT......',
  '......tTTTTTTTTt......',
  '......tTTTTTTTTt......',
  '......tTTTTTTTTt......',
  '......tttttttttt......',
  '.......PP....PP.......',
  '.......PP....PP.......',
  '.......PP....PP.......',
  '.......PP....PP.......',
  '......FFF....FFF......',
  '......FFF....FFF......',
  '......................',
];

const SKIN = [
  { S: 0xe8c49a, s: 0xc89f74, m: 0xb07a5a },
  { S: 0xc68e5e, s: 0xa06e44, m: 0x7a4a30 },
  { S: 0x8d5a3a, s: 0x6e4228, m: 0x4e2c1a },
];

const LOOKS: { head: string[]; palette: Palette }[] = [
  // A monk in a brown habit.
  { head: HOODED, palette: { ...SKIN[0], H: 0x6b4a2c, h: 0x4a321d, T: 0x7a5a3a, t: 0x5c3a21, B: 0xd8cfa8, k: 0xd8cfa8 } },
  // A woman in a red dress with auburn hair.
  { head: BARE, palette: { ...SKIN[1], H: 0x8a4a22, h: 0x5e2e14, T: 0xb8343f, t: 0x7a2230, B: 0x3b2416, k: 0xc9a040 } },
  // A farmer in blue with straw-blond hair.
  { head: BARE, palette: { ...SKIN[0], H: 0xd9b24a, h: 0x9a7428, T: 0x4d7aa8, t: 0x33557a, B: 0x5c3a21, k: 0x8a8794 } },
  // A woodsman in a green hood.
  { head: HOODED, palette: { ...SKIN[2], H: 0x3f6a3a, h: 0x2a4a28, T: 0x5e8f62, t: 0x3f6a42, B: 0x3b2416, k: 0xc9a040 } },
  // A merchant in violet with dark hair.
  { head: BARE, palette: { ...SKIN[1], H: 0x2a2020, h: 0x16100f, T: 0x8f5a9e, t: 0x5f3a6a, B: 0xc9a040, k: 0xf5e3a0 } },
];

/** Craftsmen hired to work the stations: bare-headed, in work shirts under a leather apron. */
export const CRAFTSMAN_LOOKS = 2;
export const craftsmanTexture = (i: number) => `craftsman-${i % CRAFTSMAN_LOOKS}`;
const CRAFTSMEN: Palette[] = [
  { ...SKIN[0], H: 0x5c3a21, h: 0x3b2416, T: 0xd8cfa8, t: 0xa89c7c, B: 0x3b2416, k: 0xc9a040 },
  { ...SKIN[2], H: 0x16100f, h: 0x0c0808, T: 0x8a8794, t: 0x5d5a66, B: 0x3b2416, k: 0xc9a040 },
];
const APRON = { light: 0x9c6a3e, dark: 0x6b4426 };

export function bakeTownsfolk(scene: Phaser.Scene) {
  LOOKS.forEach(({ head, palette }, i) => {
    const rows = [...head, ...BODY];
    new PixelCanvas(22, rows.length)
      .grid(0, 0, rows, { ...palette, e: INK, P: 0x3a3040, F: 0x3b2416 })
      .outline(INK)
      .bake(scene, `customer-${i}`);
  });
  CRAFTSMEN.forEach((palette, i) => {
    const rows = [...BARE, ...BODY];
    const top = BARE.length;
    const c = new PixelCanvas(22, rows.length).grid(0, 0, rows, { ...palette, e: INK, P: 0x3a3040, F: 0x3b2416 });
    // A leather apron from the chest to the knees, on a strap round the neck.
    c.rect(7, top + 1, 8, 13, APRON.light).rect(7, top + 13, 8, 1, APRON.dark);
    c.rect(7, top, 1, 1, APRON.dark).rect(14, top, 1, 1, APRON.dark);
    c.rect(9, top + 6, 4, 2, APRON.dark);
    c.outline(INK).bake(scene, craftsmanTexture(i));
  });
}
