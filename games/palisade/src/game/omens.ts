// Omens: from wave 4 each break (but the one after a boss) names an omen for the next wave, which
// the hero may accept or refuse. An accepted omen makes the wave harder in its own way and pays
// more experience for it; a refused one (or one left alone until the break ends) changes nothing.

export type OmenId = 'night' | 'blood' | 'plunder';

export interface Omen {
  name: string;
  /** What it does to the wave. */
  text: string;
}

export const OMENS: Record<OmenId, Omen> = {
  night: { name: 'Night', text: 'Foes stay unseen, and out of the ranger’s aim, until they reach mid-field' },
  blood: { name: 'Blood Moon', text: 'Twice as many elite foes' },
  plunder: { name: 'Rich Plunder', text: 'Foes drop 50% more coins, but walk 25% faster' },
};

export const OMEN_IDS = Object.keys(OMENS) as OmenId[];

/** Omens are named from this wave's break on. */
export const OMEN_FROM_WAVE = 4;
/** A break with an omen up lasts this long, so there is time to read it; deciding cuts it short. */
export const OMEN_BREAK_MS = 6_000;
/** During a Night wave foes right of this line are hidden and cannot be aimed at. */
export const NIGHT_X = 580;
/** An accepted omen's wave gives this many times the experience. */
export const OMEN_XP = 1.3;

/** Whether the break before `wave` names an omen: from wave 4, but not the first wave of a road (the break after a boss has its relic chest and road choice). */
export const omenWave = (wave: number) => wave >= OMEN_FROM_WAVE && wave % 10 !== 1;

/** What the wave's omen changes, once accepted; no omen (or a refused one) changes nothing. */
export function omenEffects(omen: { id: OmenId; accepted: boolean } | null) {
  const on = omen?.accepted ? omen.id : null;
  return {
    /** Foes are hidden and out of aim right of this x. */
    sight: on === 'night' ? NIGHT_X : Infinity,
    /** Multiplies the chance of a foe coming on as an elite. */
    elites: on === 'blood' ? 2 : 1,
    coins: on === 'plunder' ? 1.5 : 1,
    speed: on === 'plunder' ? 1.25 : 1,
    xp: on ? OMEN_XP : 1,
  };
}
