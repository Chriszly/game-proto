/**
 * Every upgrade a level-up card can offer: the heroes' own paths, the shared Blaster pool and the
 * Gear deck, each with five tiers, plus the capstones (a path at tier 5 and its gear piece) and the
 * crossovers (a pool skill held with a fitting path).
 */
import type { HeroId } from './heroes';

export type UpgradeKind = 'path' | 'pool' | 'gear';

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  name: string;
  /** The hero whose path this is (paths only). */
  hero?: HeroId;
  /** What the upgrade does, one short line. */
  blurb: string;
  /** What each of the five tiers adds, in order. */
  tiers: readonly [string, string, string, string, string];
}

export const MAX_TIER = 5;
/** A run holds at most this many abilities (paths and pool skills) and this many gear pieces. */
export const MAX_ABILITIES = 5;
export const MAX_GEAR = 4;

const defs: UpgradeDef[] = [
  // Captain Rook
  {
    id: 'gunslinger', kind: 'path', hero: 'rook', name: 'Gunslinger', blurb: 'Faster pistols, ricochets and a quick-draw burst.',
    tiers: ['+15% fire rate', 'Shots ricochet once', 'Quick-draw: 6 shots every 3 s', 'Each pistol fires two bolts', 'Quick-draw: 10 shots every 2 s, +1 ricochet'],
  },
  {
    id: 'commander', kind: 'path', hero: 'rook', name: 'Commander', blurb: 'Squad troopers follow you and shoot.',
    tiers: ['1 trooper joins', 'Troopers hit 30% harder and faster', '2 troopers', 'Troopers fire 2-shot bursts', '3 troopers'],
  },
  {
    id: 'demolitions', kind: 'path', hero: 'rook', name: 'Demolitions', blurb: 'Drop timed charges behind you.',
    tiers: ['A charge every 5 s', 'Charges hit 50% harder', 'Bigger blasts', 'Cluster: each blast throws 3 bomblets', 'A charge every 3 s, double damage'],
  },
  // Legionary TR-9
  {
    id: 'suppressor', kind: 'path', hero: 'tr9', name: 'Suppressor', blurb: 'A cone of fire ahead that slows droids.',
    tiers: ['Cone slows 30%', 'Cone slows 40%', 'Longer cone that burns', '+1 rifle bolt', 'Long cone, slows 55%, burns hot'],
  },
  {
    id: 'riot-shield', kind: 'path', hero: 'tr9', name: 'Riot Shield', blurb: 'A front shield that blocks, bashes and reflects.',
    tiers: ['Blocks hits from the front', 'Shield bash every 2.5 s', 'Reflect: blocked droids and shells hurt', 'Wider shield, bash hits twice as hard', 'Bash every 1.2 s'],
  },
  {
    id: 'drop-doctrine', kind: 'path', hero: 'tr9', name: 'Drop Doctrine', blurb: 'Sentry turrets and supply crates from orbit.',
    tiers: ['A sentry turret every 12 s', 'A supply crate every 20 s', 'Turrets last 15 s, 2 at once', 'Turrets hit 60% harder', '3 turrets, one every 8 s'],
  },
  // Corporal Bram-17
  {
    id: 'marksman', kind: 'path', hero: 'bram', name: 'Marksman', blurb: 'Bolts pierce through the line.',
    tiers: ['Bolts pierce 1 droid', '+25% damage', 'Pierce 3, 30% more range', 'Every 4th bolt is a heavy round', 'Pierce 5, +50% damage'],
  },
  {
    id: 'jump-trooper', kind: 'path', hero: 'bram', name: 'Jump Trooper', blurb: 'Jetpack dashes that leave fire, and mini rockets.',
    tiers: ['A jet dash every 5 s leaves fire', '2 mini rockets every 2 s', 'Dash every 3.5 s, hotter fire', '4 mini rockets', '6 mini rockets, dash every 2.5 s'],
  },
  {
    id: 'brothers', kind: 'path', hero: 'bram', name: 'Brothers in Arms', blurb: 'Identical brothers copy every shot.',
    tiers: ['1 brother at 60% damage', 'Brothers at 80% damage', '2 brothers', 'Brothers at full damage', '3 brothers'],
  },
  // The Blaster pool
  {
    id: 'ricochet', kind: 'pool', name: 'Ricochet Rounds', blurb: 'Bolts bounce on after a hit.',
    tiers: ['1 bounce', '2 bounces', 'Bounced bolts +25% damage', '3 bounces', '4 bounces'],
  },
  {
    id: 'overcharge', kind: 'pool', name: 'Overcharge', blurb: 'Bolts pierce droids.',
    tiers: ['Pierce 1', '+10% damage', 'Pierce 2', '+20% damage', 'Pierce 3'],
  },
  {
    id: 'thermal', kind: 'pool', name: 'Thermal Grenade', blurb: 'Lob grenades at nearby droids.',
    tiers: ['A grenade every 4 s', 'Every 3.6 s, harder', 'Every 3.2 s, wider', 'Every 2.8 s, harder', 'Every 2.4 s, big blasts'],
  },
  {
    id: 'stun', kind: 'pool', name: 'Stun Rounds', blurb: 'Hits slow droids down.',
    tiers: ['Slow 25%', 'Slow 30%', 'Slow 35% for longer', 'Slow 40%', 'Slow 50%'],
  },
  {
    id: 'reload', kind: 'pool', name: 'Quick Reload', blurb: 'Faster fire rate.',
    tiers: ['+10% fire rate', '+20% fire rate', '+30% fire rate', '+40% fire rate', '+55% fire rate'],
  },
  {
    id: 'drone', kind: 'pool', name: 'Covering Drone', blurb: 'A drone circles you and shoots.',
    tiers: ['1 drone', 'Fires faster', '2 drones', 'Fires faster again', '3 drones'],
  },
  {
    id: 'scatter', kind: 'pool', name: 'Scatter Shot', blurb: 'Extra bolts fan out from each shot.',
    tiers: ['2 side bolts at 50% damage', 'Side bolts at 70%', 'Side bolts at 85%', '4 side bolts', 'Side bolts at full damage'],
  },
  {
    id: 'callin', kind: 'pool', name: 'Call-In', blurb: 'A supply crate crashes down on droids.',
    tiers: ['A crate every 30 s', 'Every 27 s, harder', 'Every 24 s, harder', 'Every 21 s, harder', 'Every 18 s, harder'],
  },
  // The Gear deck
  { id: 'boots', kind: 'gear', name: 'Servo Boots', blurb: 'Walk faster.', tiers: ['+8% speed', '+16% speed', '+24% speed', '+32% speed', '+40% speed'] },
  { id: 'magnet', kind: 'gear', name: 'Magnet Coil', blurb: 'Pull lumen shards from further away.', tiers: ['+30% pickup range', '+60%', '+90%', '+120%', '+150%'] },
  { id: 'armour', kind: 'gear', name: 'Plate Armour', blurb: 'Take less damage, more health.', tiers: ['-8% damage, +10 health', '-16%, +20', '-24%, +30', '-32%, +40', '-40%, +50'] },
  { id: 'overclock', kind: 'gear', name: 'Overclock', blurb: 'Shorter cooldowns.', tiers: ['-7% cooldowns', '-14%', '-21%', '-28%', '-35%'] },
  { id: 'medpack', kind: 'gear', name: 'Medpack', blurb: 'Heal over time.', tiers: ['+0.5 health/s', '+1/s', '+1.5/s', '+2/s', '+2.5/s'] },
  { id: 'cell', kind: 'gear', name: 'Power Cell', blurb: 'More damage.', tiers: ['+10% damage', '+20%', '+30%', '+40%', '+50%'] },
  { id: 'lens', kind: 'gear', name: 'Lumen Lens', blurb: 'More from each lumen shard.', tiers: ['+10% XP', '+20%', '+30%', '+40%', '+50%'] },
  { id: 'chip', kind: 'gear', name: 'Targeting Chip', blurb: 'Critical hits do double damage.', tiers: ['6% crit chance', '12%', '18%', '24%', '30%'] },
];

export const UPGRADES: Record<string, UpgradeDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const UPGRADE_IDS = defs.map((d) => d.id);

/** The card taken when nothing else is left to offer. */
export const FILLER = { id: 'ration', name: 'Field Ration', text: 'Heal 30% of your health' } as const;

export interface CapstoneDef {
  id: string;
  name: string;
  hero: HeroId;
  path: string;
  gear: string;
  text: string;
}

/** A path at tier 5 together with its gear piece (any tier) unlocks the path's capstone at once. */
export const CAPSTONES: readonly CapstoneDef[] = [
  { id: 'twin-storm', name: 'Twin Storm', hero: 'rook', path: 'gunslinger', gear: 'overclock', text: 'Both pistols fire every shot, +30% fire rate' },
  { id: 'last-company', name: 'Last Company', hero: 'rook', path: 'commander', gear: 'armour', text: '5 troopers that hit 50% harder' },
  { id: 'carpet-strike', name: 'Carpet Strike', hero: 'rook', path: 'demolitions', gear: 'magnet', text: 'A line of 6 blasts sweeps the thickest swarm every 6 s' },
  { id: 'hailstorm', name: 'Hailstorm', hero: 'tr9', path: 'suppressor', gear: 'overclock', text: 'A ring of 12 bolts every 1.5 s, +2 rifle bolts' },
  { id: 'phalanx', name: 'Phalanx', hero: 'tr9', path: 'riot-shield', gear: 'armour', text: 'Three shields orbit you, blocking and bashing' },
  { id: 'orbital-drop', name: 'Orbital Drop', hero: 'tr9', path: 'drop-doctrine', gear: 'boots', text: 'Every 8 s a turret slams down on the swarm' },
  { id: 'longshot', name: 'Longshot', hero: 'bram', path: 'marksman', gear: 'magnet', text: 'Bolts pierce everything, every 2nd is heavy' },
  { id: 'skyfall', name: 'Skyfall', hero: 'bram', path: 'jump-trooper', gear: 'boots', text: 'Dashes land with a blast, twice the rockets' },
  { id: 'the-batch', name: 'The Batch', hero: 'bram', path: 'brothers', gear: 'medpack', text: '5 brothers who also throw frags' },
];

export interface CrossoverDef {
  id: string;
  name: string;
  path: string;
  pool: string;
  text: string;
}

/** A pool skill held with a fitting path (any tiers) gives a bonus. */
export const CROSSOVERS: readonly CrossoverDef[] = [
  { id: 'seeking-ricochets', name: 'Seeking Ricochets', path: 'gunslinger', pool: 'ricochet', text: 'Ricochets seek new targets' },
  { id: 'stunning-bash', name: 'Stunning Bash', path: 'riot-shield', pool: 'stun', text: 'Shield bashes stun droids' },
  { id: 'shoulder-to-shoulder', name: 'Shoulder to Shoulder', path: 'brothers', pool: 'scatter', text: 'Brothers fire cones' },
  { id: 'cluster-grenades', name: 'Cluster Grenades', path: 'demolitions', pool: 'thermal', text: 'Grenades split into bomblets' },
];

/** The capstones a run's tiers and gear unlock. */
export function capstonesOf(ranks: Record<string, number>): CapstoneDef[] {
  return CAPSTONES.filter((c) => (ranks[c.path] ?? 0) >= MAX_TIER && (ranks[c.gear] ?? 0) > 0);
}

/** The crossovers a run's upgrades complete. */
export function crossoversOf(ranks: Record<string, number>): CrossoverDef[] {
  return CROSSOVERS.filter((c) => (ranks[c.path] ?? 0) > 0 && (ranks[c.pool] ?? 0) > 0);
}

/** The crossover an upgrade would complete (or does), for the card hint. */
export function crossoverFor(id: string): CrossoverDef | undefined {
  return CROSSOVERS.find((c) => c.path === id || c.pool === id);
}

/** The capstone an upgrade leads to, for the card hint. */
export function capstoneFor(id: string, hero: HeroId): CapstoneDef | undefined {
  return CAPSTONES.find((c) => c.hero === hero && (c.path === id || c.gear === id));
}

/** A level's per-tier value: `table[tier - 1]`, or `none` at tier 0. */
export function at<T>(table: readonly T[], tier: number, none: T): T {
  return tier <= 0 ? none : table[Math.min(tier, table.length) - 1];
}

export function countKinds(ranks: Record<string, number>) {
  let abilities = 0;
  let gear = 0;
  for (const id of Object.keys(ranks)) {
    if (UPGRADES[id]?.kind === 'gear') gear += 1;
    else if (UPGRADES[id]) abilities += 1;
  }
  return { abilities, gear };
}

/** Whether a card for this upgrade can be offered now. */
export function canOffer(id: string, hero: HeroId, ranks: Record<string, number>) {
  const def = UPGRADES[id];
  if (!def) return false;
  if (def.kind === 'path' && def.hero !== hero) return false;
  const rank = ranks[id] ?? 0;
  if (rank >= MAX_TIER) return false;
  if (rank > 0) return true;
  const { abilities, gear } = countKinds(ranks);
  return def.kind === 'gear' ? gear < MAX_GEAR : abilities < MAX_ABILITIES;
}

/**
 * Three different cards for a level-up, at least one from the hero's own paths while any can be
 * offered; the Field Ration fills in when fewer than three upgrades are left.
 */
export function rollChoices(hero: HeroId, ranks: Record<string, number>, count = 3): string[] {
  const open = UPGRADE_IDS.filter((id) => canOffer(id, hero, ranks));
  const own = open.filter((id) => UPGRADES[id].kind === 'path');
  const picks: string[] = [];
  const take = (pool: string[]) => {
    // Upgrades already held come up a little more often, so a build can be finished.
    const weights = pool.map((id) => ((ranks[id] ?? 0) > 0 ? 1.6 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };
  if (own.length) picks.push(take(own));
  while (picks.length < count) {
    const rest = open.filter((id) => !picks.includes(id));
    if (!rest.length) break;
    picks.push(take(rest));
  }
  if (picks.length < count) picks.push(FILLER.id);
  return picks;
}

/**
 * A free pick (the arena's reward): up to three upgrades already held that can still go up, filled
 * with a level-up's cards when fewer are held.
 */
export function rewardChoices(hero: HeroId, ranks: Record<string, number>): string[] {
  const held = Object.keys(ranks).filter((id) => ranks[id] < MAX_TIER);
  const picks: string[] = [];
  while (picks.length < 3 && held.length) picks.push(held.splice(Math.floor(Math.random() * held.length), 1)[0]);
  for (const id of rollChoices(hero, ranks)) {
    if (picks.length >= 3) break;
    if (!picks.includes(id) && (id !== FILLER.id || !picks.length)) picks.push(id);
  }
  return picks;
}
