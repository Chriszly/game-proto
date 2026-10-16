import Phaser from 'phaser';
import { HAND } from '../scenes/layout';
import { addTexture, paint, sketch } from './paint';

// Card faces in the painterly style: parchment darkening at its edges, a coloured header for the
// name (crimson for an attack, blue for a skill, purple for a power, ash grey for a curse) and a
// dark window for the picture. Painted at
// twice the card's size and shown at half, so the strokes stay fine.

export const CARD_FRAME = { header: { y: 6, h: 30 }, art: { y: 40, h: 64 } };

const HEADERS = { attack: '#8a2e33', skill: '#2d4f86', power: '#5a3a86', curse: '#3a3640' };
/** A curse's parchment is stained grey. */
const PARCHMENT = { light: '#efe0bb', mid: '#ddc596', dark: '#a9854e' };
const STAINED = { light: '#b8b2a4', mid: '#9a9486', dark: '#5e5850' };

export const cardFrame = (kind: keyof typeof HEADERS) => `card-${kind}`;

export function bakeCardFrames(scene: Phaser.Scene) {
  const w = (HAND.w - 6) * 2;
  const h = (HAND.h - 6) * 2;
  for (const [kind, header] of Object.entries(HEADERS)) {
    const { canvas, ctx } = sketch(w, h);
    const tone = kind === 'curse' ? STAINED : PARCHMENT;
    const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, h * 0.68);
    g.addColorStop(0, tone.light);
    g.addColorStop(0.75, tone.mid);
    g.addColorStop(1, tone.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
    ctx.fillStyle = header;
    ctx.beginPath();
    ctx.roundRect(10, CARD_FRAME.header.y * 2, w - 20, CARD_FRAME.header.h * 2, 8);
    ctx.fill();
    ctx.fillStyle = '#2a2230';
    ctx.beginPath();
    ctx.roundRect(20, CARD_FRAME.art.y * 2, w - 40, CARD_FRAME.art.h * 2, 8);
    ctx.fill();
    addTexture(scene, cardFrame(kind as keyof typeof HEADERS), paint(canvas, { sizes: [6, 3, 1.4], seed: kind.length, grain: 0.1, cutout: true }));
  }
}
