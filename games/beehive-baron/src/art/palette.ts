// Colours of the card stock, as CSS strings for the baked textures, plus the few numbers the scene
// draws with every frame (glowing comb edges, the ripening arc and the progress bars).

export const CARD = {
  sky: '#a9d6ee',
  sun: '#ffd76a',
  cloud: '#ffffff',
  farHill: '#a6d18a',
  nearHill: '#7fbf5c',
  grass: '#6aae4a',
  roof: '#c07a3e',
  roofTrim: '#d99456',
  box: '#e0a868',
  slat: '#d39a5a',
  recess: '#6a3f1c',
  slit: '#2e1a0a',
  landing: '#d6a062',
  plaque: '#fff1c8',
  wax: '#c98a3a',
  well: '#3f230c',
  nectar: '#f2a92e',
  ripe: ['#f29a26', '#f7b444'],
  capped: ['#f6dc94', '#fff0c2', '#fbe6a8'],
  preview: '#bfe8a0',
  previewLine: '#3f8a2e',
  stem: '#3e8a34',
  leaf: '#58a845',
  middle: '#f2b01e',
  middleShine: '#f8c84a',
  jar: '#f2a226',
  lid: '#a8743e',
  label: '#fff4d8',
  shelf: '#c98a4a',
  shelfLeg: '#a86e36',
  board: '#b07a44',
  boardInner: '#c48d55',
  hud: '#4a2e16',
  goal: '#fff4d6',
  away: '#34506e',
  tag: '#5a3e96',
  green: '#2f5a24',
  bee: '#f7c531',
  beeDark: '#2b2118',
};

/** Petal colours, one per flower: pinks, lilac, cream, blue and orange, never a red cross. */
export const PETALS = ['#ec7fa6', '#a888e0', '#f6f1e4', '#6c9ee8', '#f39a4c', '#f2c6e6'];

/** The meadows' card strips, by `MEADOWS` index: two alternating rows, and the blooms cut on them. */
export const MEADOW_CARD = [
  { rows: ['#b9a6e6', '#a48fd6'], bloom: ['#7d5cc4', '#c9b6f2'] },
  { rows: ['#f4d466', '#e8bd3a'], bloom: ['#ffd23a', '#7a4410'] },
  { rows: ['#dca3c9', '#c886b4'], bloom: ['#a2508a', '#f2c6e6'] },
];

export const LIVE = {
  edgeGlow: 0xffd640,
  edge: 0xffe070,
  edgeCore: 0xfff6c8,
  previewGlow: 0x9cf060,
  preview: 0xb8f57a,
  ripenArc: 0xfff4d0,
  cappedRim: 0xfff6dc,
  barTrack: 0xead9ad,
  bar: 0xf2b01e,
  awayTrack: 0x203448,
  trail: 0xffffff,
};
