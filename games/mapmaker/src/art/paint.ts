import Phaser from 'phaser';
import { renderScale } from '../../../../shared/scaling';

// The look of a modern topographic survey sheet: hypsometric tints, brown contours, hillshade and
// clean black map symbols, with the survey overprint (stations, values, the viewshed) in magenta.
// Everything is painted on 2D canvases in code and added as textures; no asset files. Textures are
// painted at HI times their size and shown at 1 / HI, so they stay smooth when the game is scaled.
// HI rises with the screen's `renderScale` (`sharpenArt`), so they stay sharp on big screens too.
// The dark theme is the same sheet at night: dark paper, light ink and deeper tints (`applyTheme`).

export type Ctx = CanvasRenderingContext2D;

/** How much finer than the game's pixels textures are painted; show them at 1 / HI. */
export let HI = 2;

/**
 * Paints textures at the screen's resolution once it is bigger than 2x: `renderScale` canvas pixels
 * per game pixel. No camera zooms in, so the art needs no more than that. Call before baking.
 */
export function sharpenArt() {
  HI = Math.max(2, renderScale);
}

/** The sheet's two looks: a white survey sheet by day, and a night sheet with light ink on dark paper. */
export type Theme = 'light' | 'dark';

const PALETTES = {
  light: {
    /** Type, rules, map symbols and buttons. */
    INK: '#1d2329',
    INK_LIT: '#38424c',
    /** Type on an ink fill (buttons, the commission's header, a picked card). */
    ON_INK: '#ffffff',
    ON_INK_SOFT: '#aab3ba',
    ON_INK_ACCENT: '#ffd9ec',
    MAGENTA: '#d6247f',
    BROWN: '#a8693a',
    BLUE: '#2f7fb8',
    GREEN: '#2f6a24',
    TREE: '#4c8a3a',
    GOLD_DARK: '#8a5f10',
    /** The survey sheet, and the halo round place names. */
    SHEET: '#fbfaf6',
    /** Blank drafting paper over uncharted tiles. */
    VELLUM: '#f6f5ef',
    /** The panel and overlay cards. */
    CARD: '#ffffff',
    /** The drafting table under the sheet, and its grid. */
    TABLE: '#dfe3e0',
    TABLE_LINE: '#506e78',
    GREY: '#6b7680',
    SLATE: '#4d5862',
    RULE: '#d5d9dc',
    TRACK: '#e3e6e8',
    /** A disabled button and its caption. */
    OFF: '#d5d9dc',
    OFF_TEXT: '#8a949c',
    /** The blank paper's grid, its UNSURVEYED lettering and the dashed survey limit. */
    FOG_LINE: '120,130,140',
    FOG_LETTER: 'rgba(110,120,130,0.35)',
    LIMIT: '#5b6670',
    /** The dim behind the overlays, and its alpha. */
    DIM: '#1d2329',
    DIM_ALPHA: 0.38,
  },
  dark: {
    INK: '#e4e8ec',
    INK_LIT: '#c3cad1',
    ON_INK: '#141a20',
    ON_INK_SOFT: '#56616b',
    ON_INK_ACCENT: '#b0186a',
    MAGENTA: '#f0479b',
    BROWN: '#c98a58',
    BLUE: '#5aa6dc',
    GREEN: '#7cc46a',
    TREE: '#86c070',
    GOLD_DARK: '#e0ac45',
    SHEET: '#18212a',
    VELLUM: '#1f2933',
    CARD: '#202a34',
    TABLE: '#0d1217',
    TABLE_LINE: '#7a95a3',
    GREY: '#909ba5',
    SLATE: '#b2bcc5',
    RULE: '#36414c',
    TRACK: '#2f3a45',
    OFF: '#36414c',
    OFF_TEXT: '#7b8690',
    FOG_LINE: '150,165,180',
    FOG_LETTER: 'rgba(150,165,180,0.22)',
    LIMIT: '#9aa6b1',
    DIM: '#000000',
    DIM_ALPHA: 0.55,
  },
} satisfies Record<Theme, Record<string, string | number>>;

/** The look being drawn; set by `applyTheme`. */
export let theme: Theme = 'light';
export let INK = PALETTES.light.INK;
export let INK_LIT = PALETTES.light.INK_LIT;
export let ON_INK = PALETTES.light.ON_INK;
export let ON_INK_SOFT = PALETTES.light.ON_INK_SOFT;
export let ON_INK_ACCENT = PALETTES.light.ON_INK_ACCENT;
export let MAGENTA = PALETTES.light.MAGENTA;
export let BROWN = PALETTES.light.BROWN;
export let BLUE = PALETTES.light.BLUE;
export let GREEN = PALETTES.light.GREEN;
export let TREE = PALETTES.light.TREE;
export let GOLD_DARK = PALETTES.light.GOLD_DARK;
export let SHEET = PALETTES.light.SHEET;
export let VELLUM = PALETTES.light.VELLUM;
export let CARD = PALETTES.light.CARD;
export let TABLE = PALETTES.light.TABLE;
export let TABLE_LINE = PALETTES.light.TABLE_LINE;
export let GREY = PALETTES.light.GREY;
export let SLATE = PALETTES.light.SLATE;
export let RULE = PALETTES.light.RULE;
export let TRACK = PALETTES.light.TRACK;
export let OFF = PALETTES.light.OFF;
export let OFF_TEXT = PALETTES.light.OFF_TEXT;
export let FOG_LINE = PALETTES.light.FOG_LINE;
export let FOG_LETTER = PALETTES.light.FOG_LETTER;
export let LIMIT = PALETTES.light.LIMIT;
export let DIM = PALETTES.light.DIM;
export let DIM_ALPHA = PALETTES.light.DIM_ALPHA;

/** Switches every colour above to `t`'s. Bake and draw again afterwards (BootScene does both). */
export function applyTheme(t: Theme) {
  const p = PALETTES[t];
  theme = t;
  ({ INK, INK_LIT, ON_INK, ON_INK_SOFT, ON_INK_ACCENT, MAGENTA, BROWN, BLUE, GREEN, TREE, GOLD_DARK } = p);
  ({ SHEET, VELLUM, CARD, TABLE, TABLE_LINE, GREY, SLATE, RULE, TRACK, OFF, OFF_TEXT } = p);
  ({ FOG_LINE, FOG_LETTER, LIMIT, DIM, DIM_ALPHA } = p);
}

/** Colours that stay the same in both looks. */
export const GOLD = '#e3a92a';
/** The surveyors' outline: they are figures on the map, not ink on the sheet. */
export const OUTLINE = '#1d2329';
/** Type on a magenta fill, and its softer second line. */
export const ON_MAGENTA = '#ffffff';
export const ON_MAGENTA_SOFT = '#ffd9ec';
export const SKIN = '#e37100';
export const MUZZLE = '#ffdcc7';

/** The same colours as numbers, for Phaser graphics. */
export const hex = (c: string) => parseInt(c.slice(1), 16);

/** A small seeded random, so the art is the same every time without touching Math.random. */
export function rng(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Paints a texture at HI and adds it under `key` (replacing an old one). */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * HI);
  canvas.height = Math.ceil(h * HI);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(HI, HI);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export function poly(ctx: Ctx, pts: [number, number][], fill?: string | null, stroke?: string | null, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill?: string | null, stroke?: string | null, lw = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A star with `n` points, used for the compass rose. */
export function star(ctx: Ctx, x: number, y: number, r1: number, r2: number, n: number, fill: string, stroke: string, lw = 1) {
  const pts: [number, number][] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / n;
    const r = k % 2 ? r2 : r1;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  poly(ctx, pts, fill, stroke, lw);
}
