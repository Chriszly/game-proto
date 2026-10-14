// The paperback cover's palette for the bars, buttons and labels: chocolate and mustard stripes,
// cream pills and tangerine accents.

export const INK = {
  chocolate: 0x2b1810,
  cocoa: 0x4a2a1a,
  tangerine: 0xe8742a,
  mustard: 0xf2b33d,
  cream: 0xf6ecd6,
  creamDim: 0xd2c4a6,
  rust: 0xc4561e,
  green: 0x4caf50,
  mint: 0x8dff9a,
  sky: 0x58b8ff,
};

/** The same colours as CSS strings, for text. */
export const INK_CSS = {
  chocolate: '#2b1810',
  cocoa: '#4a2a1a',
  tangerine: '#e8742a',
  mustard: '#f2b33d',
  cream: '#f6ecd6',
  creamDim: '#8f7f66',
  rust: '#c4561e',
  green: '#2e8a3c',
};

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
