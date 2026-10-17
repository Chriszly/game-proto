import { t, type TextKey } from '../i18n';
import { MAX_TIER, swordOf } from './swords';

// The royal commissions: one long goal pinned in the top bar. Each asks the smithy to deliver a
// great sword (or several), dragged onto the banner, and pays a big purse and a guild star. Once
// it is done the next, harder one follows, up to the Crown Blade, which wins the smithy. From the
// second commission on the crown offers each one two ways: as it stands, or grand (gemmed) for
// much more. Each new charter after a win asks for one more sword per commission.

export interface Commission {
  /** The sword the crown wants delivered. */
  tier: number;
  /** How many of it must be delivered. */
  count: number;
  /** Whether each must have a gem set in it. */
  gem: boolean;
  /** Coins paid on completion, on top of a guild star. */
  reward: number;
  /** The banner's title, when it is not the sword's name, and the title of its grand (gemmed) way. */
  title?: TextKey;
  grandTitle?: TextKey;
}

export const COMMISSIONS: Commission[] = [
  { tier: 6, count: 1, gem: false, reward: 500 },
  { tier: 7, count: 1, gem: false, reward: 1200 },
  { tier: 8, count: 1, gem: false, reward: 3000 },
  { tier: 8, count: 2, gem: false, reward: 6000 },
  { tier: 8, count: 3, gem: false, reward: 9000 },
  // The last: an Anvilheart for the crown. Delivering it wins the smithy.
  { tier: MAX_TIER, count: 1, gem: false, reward: 20000, title: 'crownBlade', grandTitle: 'gemmedCrownBlade' },
];

/** What the grand (gemmed) way of a commission pays, against the plain one. */
export const GRAND_PAY = 2.5;

/**
 * The commission at `level` (0 for the first) in the smithy's `charter` (0 for the first), or null
 * once the Crown Blade is delivered. Each later charter asks for one more sword, paying as much
 * more, with no cap, so charters keep pace with the guild stars' price bonus.
 */
export function commissionAt(level: number, charter = 0): Commission | null {
  const base = COMMISSIONS[level];
  if (!base) return null;
  const count = base.count + charter;
  return { ...base, count, reward: Math.round((base.reward * count) / base.count) };
}

/** The grand way of a commission: every sword gemmed, for `GRAND_PAY` times the purse. */
export const grandOf = (c: Commission): Commission => ({ ...c, gem: true, reward: Math.round(c.reward * GRAND_PAY), title: c.grandTitle });

/** The banner's title for a commission, in the hub's language: "The Crown Blade", "Gemmed Runeblade" or "2 Dragonslayers" (the banner's sword shows the gem). */
export function commissionTitle(c: Commission) {
  if (c.title) return t(c.title);
  const sword = swordOf(c.tier);
  if (c.count > 1) return `${c.count} ${t(sword.plural)}`;
  return c.gem ? t('gemmed', { sword: t(sword.name) }) : t(sword.name);
}

/** Whether a commission's level is offered two ways: every one but the first. */
export const offered = (level: number) => level > 0;
