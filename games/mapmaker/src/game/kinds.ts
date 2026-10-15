// The kinds of island a voyage can sail to, each with its own mix of terrain and its own colour of
// atlas page. `makeIsland` in island.ts reads the numbers; the first isle is always green.

export type IsleKind = 'green' | 'archipelago' | 'volcanic' | 'jungle';

export interface KindInfo {
  /** As printed on the sheet's header and the harbor. */
  name: string;
  /** Tiles between the height noise's random values: smaller breaks the land into islets. */
  cell: number;
  /** How much the height noise breaks up the isle's round shape. */
  rough: number;
  /** Height above which a tile is land. */
  shore: number;
  /** Fewest land tiles; smaller isles are rolled again. */
  minLand: number;
  /** Relief above which inland tiles become hills and peaks. */
  hillsAt: number;
  peakAt: number;
  /** Extra relief where the isle stands tall: a volcano's cone. */
  lift: number;
  /** Wood noise above which inland tiles become forest. */
  woods: number;
  /** Rivers running from the high ground to the sea, and roads from the port to a village. */
  rivers: number;
  roads: number;
  /** The colour of its atlas page. */
  page: string;
}

export const KINDS: Record<IsleKind, KindInfo> = {
  green: { name: 'Green isle', cell: 4, rough: 0.7, shore: 0.18, minLand: 45, hillsAt: 0.64, peakAt: 0.74, lift: 0, woods: 0.5, rivers: 1, roads: 1, page: '#1d2329' },
  // Islets joined by sandbars: lots of beach and shallow sea, few lookouts.
  archipelago: { name: 'Archipelago', cell: 2, rough: 1.5, shore: 0.3, minLand: 32, hillsAt: 0.7, peakAt: 0.8, lift: 0, woods: 0.55, rivers: 0, roads: 0, page: '#2f7fb8' },
  // High, bare ground: hills and peaks everywhere and little wood.
  volcanic: { name: 'Volcanic isle', cell: 4, rough: 0.7, shore: 0.16, minLand: 45, hillsAt: 0.5, peakAt: 0.68, lift: 0.15, woods: 0.75, rivers: 1, roads: 1, page: '#8a3a22' },
  // Thick forest cut by rivers, with no roads.
  jungle: { name: 'Jungle isle', cell: 4, rough: 0.7, shore: 0.18, minLand: 45, hillsAt: 0.7, peakAt: 0.8, lift: 0, woods: 0.28, rivers: 3, roads: 0, page: '#2f6a24' },
};

const ORDER: IsleKind[] = ['green', 'archipelago', 'volcanic', 'jungle'];

/** The kind of the n-th isle: green first, then each kind in turn. */
export const kindOf = (island: number): IsleKind => ORDER[(island - 1) % ORDER.length];
