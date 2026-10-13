import Phaser from 'phaser';
import { GOLD, INK, MARKER, STONE } from './palette';
import { PixelCanvas } from './pixelArt';

// Floor markers: a flagstone with a coloured inlay and a symbol. 44x44 on screen, drawn at 2x.

const SCALE = 2;

/** Scales each channel of `color` by `f`, for a darker or lighter shade of a marker colour. */
function shade(color: number, f: number) {
  const ch = (shift: number) => Math.min(255, Math.round(((color >> shift) & 0xff) * f));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// Symbols: X is the marker colour, x its shadow, h a highlight; G, g and H are the upgrade coin's gold.
const SYMBOLS: Record<string, string[]> = {
  // Arrow down: put things here.
  drop: [
    '...XXXX...',
    '...XhXx...',
    '...XhXx...',
    '...XhXx...',
    'XXXXhXXXXx',
    '.XXhXXXXx.',
    '..XXXXXx..',
    '...XXXx...',
    '....Xx....',
  ],
  // Arrow up: take things from here.
  pickUp: [
    '....Xx....',
    '...XhXx...',
    '..XhXXXx..',
    '.XhXXXXXx.',
    'XXXXhXXXXx',
    '...XhXx...',
    '...XhXx...',
    '...XhXx...',
    '...XXXx...',
  ],
  // Mortar and pestle: stand here to work.
  work: [
    '.......Xx.',
    '......Xx..',
    '.....Xx...',
    '....Xx....',
    'XXXXXXXXXx',
    'XhhXXXXXXx',
    '.XhXXXXXx.',
    '..XXXXXx..',
    '...xxxx...',
  ],
  // A coin with an arrow over it: pay here to upgrade.
  upgrade: [
    '....Xx....',
    '...XXXx...',
    '..XXXXXx..',
    '...gggg...',
    '..gGGGGg..',
    '.gGHGGGGg.',
    '.gGHGGGGg.',
    '..gGGGGg..',
    '...gggg...',
  ],
};

function bakePad(scene: Phaser.Scene, key: string, color: number, symbol: string[]) {
  const c = new PixelCanvas(22, 22);
  // Flagstone with chipped corners.
  c.rect(0, 0, 22, 22, STONE.mid);
  c.rect(0, 0, 22, 1, STONE.light).rect(0, 0, 1, 22, STONE.light);
  c.rect(0, 21, 22, 1, STONE.dark).rect(21, 0, 1, 22, STONE.dark);
  // Coloured inlay.
  c.frame(2, 2, 18, 18, shade(color, 0.6));
  c.frame(3, 3, 16, 16, color);
  c.rect(4, 4, 14, 14, shade(color, 0.35));
  for (const [x, y] of [[3, 3], [18, 3], [3, 18], [18, 18]]) c.px(x, y, shade(color, 1.3));
  // Symbol, outlined so it stands out from the inlay.
  const art = new PixelCanvas(12, 11).grid(1, 1, symbol, {
    X: color,
    x: shade(color, 0.7),
    h: shade(color, 1.35),
    G: GOLD.light,
    g: GOLD.dark,
    H: GOLD.shine,
  });
  art.outline(INK);
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 12; x++) {
      const p = art.get(x, y);
      if (p !== null) c.px(5 + x, 6 + y, p);
    }
  }
  c.frame(0, 0, 22, 22, INK);
  for (const [x, y] of [[0, 0], [21, 0], [0, 21], [21, 21]]) c.clear(x, y);
  c.bake(scene, key, SCALE);
}

export function bakeMarkers(scene: Phaser.Scene) {
  bakePad(scene, 'pad-in', MARKER.drop, SYMBOLS.drop);
  bakePad(scene, 'pad-out', MARKER.pickUp, SYMBOLS.pickUp);
  bakePad(scene, 'pad-work', MARKER.work, SYMBOLS.work);
  bakePad(scene, 'pad-up', MARKER.upgrade, SYMBOLS.upgrade);
}
