import Phaser from 'phaser';
import { LOOKS } from '../game/state';
import { bake, glass, lit, paint, reseed, rect, ring, ctx } from './glass';

// The adventurers who come to the counter, as figures in a lancet window: a knight, a ranger, a
// viking and a mage, each from the waist up in leaded glass with painted faces.

/** The texture's size in view pixels; it sits 5px in from the desk's top left corner. */
export const ADVENTURER = { w: 84, h: 144, x: 5, y: 5 };

export const adventurerTexture = (look: number) => `adventurer-${look % LOOKS}`;

export function bakeAdventurers(scene: Phaser.Scene) {
  for (let look = 0; look < LOOKS; look++) {
    bake(scene, adventurerTexture(look), ADVENTURER.w, ADVENTURER.h, () => {
      reseed(60 + look);
      // The lancet light behind the figure.
      const h = ADVENTURER.h * 2;
      glass([[4, h - 6], [4, 70], [84, 6], [164, 70], [164, h - 6]], '#2c3c6c', { hi: 0.3, lw: 5 });
      figure(look, 82, h - 16);
    });
  }
}

/** A painted face on a round pane: brows, eyes, nose and mouth in grisaille lines. */
function face(x: number, y: number, skin: string) {
  glass(ring(x, y, 30, 12), skin, { lw: 4, hi: 0.4 });
  paint(() => {
    ctx.moveTo(x - 16, y - 4);
    ctx.lineTo(x - 6, y - 4);
    ctx.moveTo(x + 6, y - 4);
    ctx.lineTo(x + 16, y - 4);
  }, 3.5);
  paint(() => {
    ctx.moveTo(x - 14, y - 12);
    ctx.quadraticCurveTo(x - 10, y - 15, x - 4, y - 12);
    ctx.moveTo(x + 4, y - 12);
    ctx.quadraticCurveTo(x + 10, y - 15, x + 14, y - 12);
  }, 2);
  paint(() => {
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x - 3, y + 8);
    ctx.lineTo(x + 2, y + 9);
    ctx.moveTo(x - 7, y + 15);
    ctx.quadraticCurveTo(x, y + 18, x + 7, y + 15);
  }, 2.2);
}

/** Shoulders and chest in two panes, lit from the left. */
function body(x: number, y: number, col: string) {
  glass([[x - 58, y], [x - 52, y - 70], [x - 20, y - 92], [x, y - 92], [x, y]], col, { lw: 5 });
  glass([[x, y - 92], [x + 20, y - 92], [x + 52, y - 70], [x + 58, y], [x, y]], lit(col, -0.15), { lw: 5 });
}

function figure(look: number, x: number, y: number) {
  if (look === 0) {
    // Knight: a blue tabard with a gold chevron and a barred steel helm with a plume.
    body(x, y, '#5a6a8a');
    glass([[x - 24, y - 88], [x + 24, y - 88], [x + 20, y - 6], [x - 20, y - 6]], '#2a4aa0', { lw: 4 });
    glass([[x - 14, y - 60], [x, y - 72], [x + 14, y - 60], [x + 14, y - 50], [x, y - 62], [x - 14, y - 50]], '#f0c040', { lw: 3, flat: true });
    glass([[x - 40, y - 96], [x - 42, y - 150], [x - 24, y - 172], [x, y - 172], [x, y - 96]], '#aab4c8', { lw: 5 });
    glass([[x, y - 172], [x + 24, y - 172], [x + 42, y - 150], [x + 40, y - 96], [x, y - 96]], '#8a94aa', { lw: 5 });
    glass(rect(x - 34, y - 142, 68, 12), '#141018', { lw: 3, flat: true });
    paint(() => {
      for (let k = 0; k < 5; k++) {
        ctx.moveTo(x - 20 + k * 10, y - 120);
        ctx.lineTo(x - 20 + k * 10, y - 108);
      }
    }, 3);
    glass([[x - 6, y - 172], [x + 6, y - 172], [x + 4, y - 196], [x - 4, y - 196]], '#3a6ad0', { lw: 3 });
  } else if (look === 1) {
    // Ranger: a green hood and cloak with a bow strap across the chest.
    glass([[x - 48, y - 94], [x - 50, y - 150], [x - 20, y - 184], [x + 18, y - 186], [x + 50, y - 150], [x + 48, y - 94]], '#2e7a3a', { lw: 5 });
    body(x, y, '#3a8a44');
    face(x, y - 128, '#eebc94');
    glass([[x - 42, y - 84], [x - 32, y - 92], [x + 44, y - 18], [x + 34, y - 10]], '#7a4a26', { lw: 3 });
  } else if (look === 2) {
    // Viking: a fur collar, a braided orange beard and a horned helm.
    body(x, y, '#8a5a30');
    glass([[x - 54, y - 70], [x - 20, y - 94], [x + 20, y - 94], [x + 54, y - 70], [x + 30, y - 76], [x, y - 82], [x - 30, y - 76]], '#d8c8a0', { lw: 4 });
    face(x, y - 122, '#f0c09a');
    glass([[x - 32, y - 118], [x - 16, y - 108], [x + 16, y - 108], [x + 32, y - 118], [x + 28, y - 90], [x + 10, y - 64], [x - 10, y - 64], [x - 28, y - 90]], '#d0702a', { lw: 4 });
    paint(() => {
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(x + k * 8, y - 104);
        ctx.lineTo(x + k * 6, y - 72);
      }
    }, 2);
    glass([[x - 40, y - 138], [x - 32, y - 166], [x, y - 178], [x + 32, y - 166], [x + 40, y - 138]], '#8a94aa', { lw: 5 });
    glass([[x - 40, y - 140], [x - 70, y - 160], [x - 76, y - 198], [x - 56, y - 168], [x - 36, y - 154]], '#efe2c0', { lw: 4 });
    glass([[x + 40, y - 140], [x + 70, y - 160], [x + 76, y - 198], [x + 56, y - 168], [x + 36, y - 154]], '#d8c8a0', { lw: 4 });
  } else {
    // Mage: a violet robe, a white beard and a tall starry hat.
    body(x, y, '#5a3a8a');
    glass([[x - 10, y - 92], [x + 10, y - 92], [x + 8, y - 6], [x - 8, y - 6]], '#c8a040', { lw: 3, flat: true });
    face(x, y - 124, '#eebc94');
    glass([[x - 26, y - 116], [x + 26, y - 116], [x + 18, y - 84], [x, y - 66], [x - 18, y - 84]], '#efeaf4', { lw: 4 });
    glass([[x - 58, y - 148], [x + 58, y - 148], [x + 50, y - 136], [x - 50, y - 136]], '#4a2a7a', { lw: 4, flat: true });
    glass([[x - 40, y - 148], [x + 8, y - 236], [x + 40, y - 148]], '#6a44a8', { lw: 5 });
    glass([[x - 31, y - 164], [x + 31, y - 164], [x + 35, y - 156], [x - 35, y - 156]], '#f0c040', { lw: 3, flat: true });
    glass([[x + 2, y - 206], [x + 8, y - 196], [x + 2, y - 186], [x - 4, y - 196]], '#ffe58a', { lw: 2.5, flat: true });
  }
  // A belt with a gold buckle.
  glass(rect(x - 56, y - 30, 112, 12), '#3a2418', { lw: 3, flat: true });
  glass(rect(x - 8, y - 33, 16, 18), '#f0c040', { lw: 3, flat: true });
}
