// What each kind of tile is called, what it costs to survey and what it adds to a chart. Names are
// keys of `i18n/en.ts`, shown with `t`. The art for each is painted in src/art/map.ts.
import type { TextKey } from '../i18n';

export type Terrain = 'sea' | 'beach' | 'grass' | 'forest' | 'hills' | 'mountain' | 'river' | 'road' | 'village' | 'ruins' | 'port';

export interface TerrainInfo {
  /** As named on chart rows. */
  name: TextKey;
  /** A count of its tiles ("3 forests"), for commissions. */
  count: TextKey;
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
  sea: { name: 'seaName', count: 'seaCount', value: 1, cost: 1, sight: 0, shape: 'cross' },
  beach: { name: 'beachName', count: 'beachCount', value: 2, cost: 1, sight: 0, shape: 'cross' },
  grass: { name: 'grassName', count: 'grassCount', value: 2, cost: 1, sight: 0, shape: 'cross' },
  forest: { name: 'forestName', count: 'forestCount', value: 3, cost: 2, sight: 0, shape: 'cross' },
  hills: { name: 'hillsName', count: 'hillsCount', value: 4, cost: 1, sight: 1, shape: 'cross' },
  mountain: { name: 'mountainName', count: 'mountainCount', value: 6, cost: 2, sight: 1, shape: 'ring' },
  river: { name: 'riverName', count: 'riverCount', value: 1, cost: 0, sight: 0, shape: 'cross' },
  road: { name: 'roadName', count: 'roadCount', value: 1, cost: 0, sight: 0, shape: 'cross' },
  village: { name: 'villageName', count: 'villageCount', value: 10, cost: 1, sight: 0, shape: 'cross' },
  ruins: { name: 'ruinsName', count: 'ruinsCount', value: 12, cost: 1, sight: 0, shape: 'cross' },
  port: { name: 'portName', count: 'portCount', value: 0, cost: 0, sight: 0, shape: 'cross' },
};

/** The order chart rows are listed in. */
export const CHART_ORDER: Terrain[] = ['sea', 'beach', 'grass', 'forest', 'hills', 'mountain', 'river', 'road', 'village', 'ruins'];

/** Landmarks are what the Lodestone Compass shows through the fog. */
export const isLandmark = (t: Terrain) => t === 'village' || t === 'ruins';
