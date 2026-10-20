/**
 * The Arcane Tarot look: night-sky purple, thin gold frames, pale violet ink and a cyan glow for
 * what is picked or done. Fonts are the device's own, so nothing is downloaded.
 */
export const FONT = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

export const C = {
  bgTop: 0x2c1f52,
  bgBottom: 0x0d0820,
  panel: 0x180f34,
  panelAlpha: 0.92,
  deep: 0x120b28,
  gold: 0xc9a24b,
  goldText: '#f2cf73',
  goldBright: 0xf2cf73,
  ink: '#e9dcff',
  inkDim: '#a99cc8',
  line: 0x4a3a7a,
  cyan: 0x9be7ff,
  cyanText: '#9be7ff',
  rose: 0xff8fc7,
  roseText: '#ff8fc7',
  key: 0x1c1338,
  keyHover: 0x2a1d50,
} as const;

/** One colour per path or glyph, all easy to tell apart on the dark ground (no red). */
export const PALETTE = [0xf2cf73, 0x9be7ff, 0xff8fc7, 0xb9a4ff, 0x8fe3b0, 0xffb36b, 0x7fb8ff, 0xe6a4ff] as const;

export const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
