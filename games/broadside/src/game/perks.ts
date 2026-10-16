// The prize draft: after each wave the harbor offers three perks, and one is kept for the run.

export type PerkId = 'ricochet' | 'salvage' | 'gunners' | 'mortar' | 'grapnels' | 'swivels' | 'carronades';

export interface Perk {
  name: string;
  desc: string;
}

export const PERKS: Record<PerkId, Perk> = {
  ricochet: { name: 'Bouncing shot', desc: 'A ball that would splash skips once across the water and flies half as far again' },
  salvage: { name: 'Salvage', desc: 'Every ship sunk patches 6 hull' },
  gunners: { name: 'Prize gun crews', desc: 'Your prizes reload twice as fast' },
  mortar: { name: 'A mortar of your own', desc: 'Every 6 seconds a shell is lobbed at the nearest enemy in range' },
  grapnels: { name: 'Grapnels', desc: 'Boarding takes half the time and a prize needs half the crew' },
  swivels: { name: 'Swivel guns', desc: 'Broadsides train half as wide again either side' },
  carronades: { name: 'Carronades', desc: 'Shot at a ship inside half your reach hits 50% harder' },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

/** How many perks a draft offers. */
export const DRAFT_SIZE = 3;

/** The first wave's draft, so the first round plays the same every time. */
export const FIRST_DRAFT: PerkId[] = ['salvage', 'ricochet', 'mortar'];

/** Up to `DRAFT_SIZE` perks not yet taken, in a random order. Uses Math.random once per pick. */
export function drawDraft(taken: PerkId[]): PerkId[] {
  const left = PERK_IDS.filter((id) => !taken.includes(id));
  const draft: PerkId[] = [];
  while (left.length && draft.length < DRAFT_SIZE) draft.push(left.splice(Math.floor(Math.random() * left.length), 1)[0]);
  return draft;
}

/** How much hull a sunk ship patches with Salvage. */
export const SALVAGE_HULL = 6;
/** A ball with Bouncing shot flies this share of its range again after skipping. */
export const RICOCHET_FLIGHT = 0.5;
/** The player's own mortar: how often it fires, how far it reaches and what its shell does. */
export const OWN_MORTAR = { reloadMs: 6000, range: 360, damage: 22 };
/** How much wider the broadsides train with Swivel guns. */
export const SWIVEL_ARC = 1.5;
/** How much harder carronades hit a ship inside half the reach. */
export const CARRONADE_DAMAGE = 1.5;
