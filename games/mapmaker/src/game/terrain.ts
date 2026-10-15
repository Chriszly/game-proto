// What each kind of tile is called, what it costs to survey and what it adds to a chart. The art for
// each is painted in src/art/map.ts.

export type Terrain = 'sea' | 'beach' | 'grass' | 'forest' | 'hills' | 'mountain' | 'river' | 'road' | 'village' | 'ruins' | 'port';

export interface TerrainInfo {
  name: string;
  /** Plural, for chart rows and commissions. */
  plural: string;
  /** Coins a chart earns for each tile of it surveyed on a voyage. */
  value: number;
  /** Supplies it costs to survey: forests and peaks are hard going, rivers and roads are free to follow. */
  cost: number;
  /** How far the surveyor sees from it when it is surveyed (0: no further), before the Spyglass. */
  sight: number;
  /** Seen from it: 'cross' is the four tiles next to it, 'ring' all eight and further. */
  shape: 'cross' | 'ring';
}

export const TERRAIN: Record<Terrain, TerrainInfo> = {
  sea: { name: 'Sea', plural: 'sea', value: 1, cost: 1, sight: 0, shape: 'cross' },
  beach: { name: 'Beach', plural: 'beaches', value: 2, cost: 1, sight: 0, shape: 'cross' },
  grass: { name: 'Meadow', plural: 'meadows', value: 2, cost: 1, sight: 0, shape: 'cross' },
  forest: { name: 'Forest', plural: 'forests', value: 3, cost: 2, sight: 0, shape: 'cross' },
  hills: { name: 'Hills', plural: 'hills', value: 4, cost: 1, sight: 1, shape: 'cross' },
  mountain: { name: 'Peak', plural: 'peaks', value: 6, cost: 2, sight: 1, shape: 'ring' },
  river: { name: 'River', plural: 'rivers', value: 1, cost: 0, sight: 0, shape: 'cross' },
  road: { name: 'Road', plural: 'roads', value: 1, cost: 0, sight: 0, shape: 'cross' },
  village: { name: 'Village', plural: 'villages', value: 10, cost: 1, sight: 0, shape: 'cross' },
  ruins: { name: 'Ruins', plural: 'ruins', value: 12, cost: 1, sight: 0, shape: 'cross' },
  port: { name: 'Port', plural: 'ports', value: 0, cost: 0, sight: 0, shape: 'cross' },
};

/** The order chart rows are listed in. */
export const CHART_ORDER: Terrain[] = ['sea', 'beach', 'grass', 'forest', 'hills', 'mountain', 'river', 'road', 'village', 'ruins'];

/** Landmarks are what the Lodestone Compass shows through the fog. */
export const isLandmark = (t: Terrain) => t === 'village' || t === 'ruins';
