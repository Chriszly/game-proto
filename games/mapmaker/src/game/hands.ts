// The hands a voyage can take on at the harbor: one of three offered, free, for that voyage only.
// Their effects are applied in src/game/sim.ts (`costOf`, `canSurvey`, `sightOf`, `chartOf`).

export type Hand = 'woodsman' | 'climber' | 'naturalist' | 'boatman';

export interface HandInfo {
  name: string;
  /** What the hand does, as printed on their card (it has room for about 26 characters). */
  text: string;
}

export const HANDS: Record<Hand, HandInfo> = {
  woodsman: { name: 'Woodsman', text: 'Forests cost 1 supply' },
  climber: { name: 'Climber', text: 'Peaks cost 1, sees further' },
  naturalist: { name: 'Naturalist', text: 'Caves pay double' },
  boatman: { name: 'Boatman', text: 'Sea is free and leads on' },
};

export const HAND_IDS = Object.keys(HANDS) as Hand[];
/** How many hands the harbor offers each voyage. */
export const HANDS_OFFERED = 3;
