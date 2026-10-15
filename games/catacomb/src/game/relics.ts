// Relics: passive bonuses that last the rest of the run. The merchant sells them, the first boss
// leaves one behind, and a mystery room can hold one. Each is owned at most once; `sim.ts` applies
// them where their text says.

export type RelicId = 'oakWard' | 'whetstone' | 'emberLantern' | 'mendingMoss' | 'goldenIdol' | 'boneCharm' | 'venomGland';

export interface Relic {
  name: string;
  text: string;
}

export const RELICS: Record<RelicId, Relic> = {
  oakWard: { name: 'Oak Ward', text: 'Start each turn with 3 block.' },
  whetstone: { name: 'Whetstone', text: 'Your attacks deal 2 more damage per hit.' },
  emberLantern: { name: 'Ember Lantern', text: 'Gain 1 more energy on the first turn of each fight.' },
  mendingMoss: { name: 'Mending Moss', text: 'Heal 5 after each fight you win.' },
  goldenIdol: { name: 'Golden Idol', text: 'Fights drop half as much gold again.' },
  boneCharm: { name: 'Bone Charm', text: 'Every foe starts each fight with 2 Vulnerable.' },
  venomGland: { name: 'Venom Gland', text: 'Poison you apply is 2 higher.' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
