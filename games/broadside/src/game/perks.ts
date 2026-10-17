// The prize draft: after each wave the harbor offers three perks, and one is kept for the run.
// Once few new perks are left, a draft also offers the second rank of a perk already held.

export type PerkId = 'ricochet' | 'salvage' | 'gunners' | 'mortar' | 'grapnels' | 'swivels' | 'carronades';

export interface Perk {
  name: string;
  desc: string;
  /** What its second rank does, for the card that offers it. */
  desc2: string;
}

export const PERKS: Record<PerkId, Perk> = {
  ricochet: { name: 'Bouncing shot', desc: 'A ball that would splash skips once across the water and flies half as far again', desc2: 'Your shot skips twice across the water' },
  salvage: { name: 'Salvage', desc: 'Every ship sunk patches 6 hull', desc2: 'Every ship sunk patches 12 hull' },
  gunners: { name: 'Prize gun crews', desc: 'Your prizes reload twice as fast', desc2: 'Your prizes reload three times as fast' },
  mortar: { name: 'A mortar of your own', desc: 'Every 6 seconds a shell is lobbed at the nearest enemy in range', desc2: 'The mortar fires every 4 seconds' },
  grapnels: { name: 'Grapnels', desc: 'Boarding takes half the time and a prize needs half the crew', desc2: 'Boarding takes a quarter of the time and a prize a quarter of the crew' },
  swivels: { name: 'Swivel guns', desc: 'Broadsides train half as wide again either side', desc2: 'Broadsides train twice as wide either side' },
  carronades: { name: 'Carronades', desc: 'Shot at a ship inside half your reach hits 50% harder', desc2: 'Shot at a ship inside half your reach hits 75% harder' },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

/** How many perks a draft offers. */
export const DRAFT_SIZE = 3;

/** The first wave's draft, so the first round plays the same every time. */
export const FIRST_DRAFT: PerkId[] = ['salvage', 'ricochet', 'mortar'];

/** The highest rank of a perk. */
export const MAX_PERK_RANK = 2;

/** How many times a perk has been taken: 0, 1 or 2 (`taken` lists a perk once per rank). */
export const perkRank = (taken: PerkId[], id: PerkId) => taken.filter((t) => t === id).length;

/**
 * Up to `size` perks in a random order: new ones first, and, once fewer new ones are left than
 * the draft has cards, the second rank of perks already held to fill it. Uses Math.random once per pick.
 */
export function drawDraft(taken: PerkId[], size = DRAFT_SIZE): PerkId[] {
  const draft: PerkId[] = [];
  const pick = (left: PerkId[]) => {
    while (left.length && draft.length < size) draft.push(left.splice(Math.floor(Math.random() * left.length), 1)[0]);
  };
  pick(PERK_IDS.filter((id) => perkRank(taken, id) === 0));
  pick(PERK_IDS.filter((id) => perkRank(taken, id) > 0 && perkRank(taken, id) < MAX_PERK_RANK));
  return draft;
}

// Each perk's numbers by rank: index 0 is rank 1, index 1 rank 2.

/** How much hull a sunk ship patches with Salvage. */
export const SALVAGE_HULL = [6, 12];
/** A ball with Bouncing shot flies this share of its range again after each skip. */
export const RICOCHET_FLIGHT = 0.5;
/** The player's own mortar: how often it fires (by rank), how far it reaches and what its shell does. */
export const OWN_MORTAR = { reloadMs: [6000, 4000], range: 360, damage: 22 };
/** How much faster prizes reload with Prize gun crews. */
export const GUNNERS_PACE = [2, 3];
/** The share of the boarding time and of the prize crew Grapnels leave. */
export const GRAPNELS = [0.5, 0.25];
/** How much wider the broadsides train with Swivel guns. */
export const SWIVEL_ARC = [1.5, 2];
/** How much harder carronades hit a ship inside half the reach. */
export const CARRONADE_DAMAGE = [1.5, 1.75];
