// The hands a voyage can take on at the harbor: one of three offered, free, for that voyage only.
// Their effects are applied in src/game/sim.ts (`costOf`, `canSurvey`, `sightOf`, `chartOf`). Names
// and texts are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type Hand = 'woodsman' | 'climber' | 'naturalist' | 'boatman';

export interface HandInfo {
  name: TextKey;
  /** What the hand does, as printed on their card (it has room for about 26 characters). */
  text: TextKey;
}

export const HANDS: Record<Hand, HandInfo> = {
  woodsman: { name: 'woodsmanName', text: 'woodsmanText' },
  climber: { name: 'climberName', text: 'climberText' },
  naturalist: { name: 'naturalistName', text: 'naturalistText' },
  boatman: { name: 'boatmanName', text: 'boatmanText' },
};

export const HAND_IDS = Object.keys(HANDS) as Hand[];
/** How many hands the harbor offers each voyage. */
export const HANDS_OFFERED = 3;
