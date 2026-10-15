import { byDifficulty } from '../../../../shared/settings';
import { ENEMIES, type EnemyKind } from './enemies';
import { roadEffects, type RoadId } from './roads';

/** Every tenth wave brings a boss. */
export const BOSS_EVERY = 10;
/** Pause before each wave, with its banner. The first wave waits a little less. */
export const BREAK_MS = 3_000;
export const FIRST_BREAK_MS = 2_000;

export const isBossWave = (wave: number) => wave % BOSS_EVERY === 0;

/** The bosses at the end of each road of ten waves, in turn. */
export const BOSSES: EnemyKind[] = ['troll', 'ogre', 'giant'];

/** The boss that closes the road `wave` is on. */
export const bossOf = (wave: number) => BOSSES[Math.floor((wave - 1) / BOSS_EVERY) % BOSSES.length];

/**
 * The road of ten waves `wave` is on, shown as a track under the top bar: its first wave, its last
 * (the boss's, with the relic chest after it), the boss and how far along the hero is.
 */
export function waveTrack(wave: number) {
  const first = Math.floor((wave - 1) / BOSS_EVERY) * BOSS_EVERY + 1;
  return { first, last: first + BOSS_EVERY - 1, boss: bossOf(wave), step: wave - first + 1 };
}

/** How much more health foes have in a wave than in wave 1. */
export const hpScale = (wave: number) => 1 + 0.18 * (wave - 1) + 0.012 * (wave - 1) ** 2;

/** How many health bars a wave's boss has: three on wave 10, one more every ten waves after. */
export const bossBars = (wave: number) => 2 + Math.floor(wave / BOSS_EVERY);

/** Time between two foes coming on, in milliseconds. */
export const spawnInterval = (wave: number) => Math.max(320, 1_300 - 45 * wave);

/**
 * The foes of a wave in the order they come on. More come every wave; orcs join from the start,
 * harpies from wave 3, dark knights from wave 4, shield bearers from wave 5, shamans from wave 7,
 * and a boss closes every tenth wave. A Crowded Road brings 40% more of each.
 */
export function waveFoes(wave: number, road: RoadId | null = null): EnemyKind[] {
  const more = roadEffects(road).foes;
  const n = (count: number) => Math.floor(count * more);
  const goblins = n(2 + Math.floor(wave * 1.2));
  const orcs = n(3 + Math.floor(wave * 0.9));
  const knights = n(wave >= 4 ? Math.floor((wave - 2) / 2) : 0);
  const harpies = n(wave >= 3 ? Math.floor((wave - 1) / 2) : 0);
  const bearers = n(wave >= 5 ? Math.floor((wave - 3) / 2) : 0);
  const shamans = n(wave >= 7 ? Math.floor((wave - 3) / 4) : 0);
  const foes: EnemyKind[] = [
    ...Array<EnemyKind>(goblins).fill('goblin'),
    ...Array<EnemyKind>(orcs).fill('orc'),
    ...Array<EnemyKind>(knights).fill('knight'),
    ...Array<EnemyKind>(harpies).fill('harpy'),
    ...Array<EnemyKind>(bearers).fill('bearer'),
    ...Array<EnemyKind>(shamans).fill('shaman'),
  ];
  // Shuffled so the kinds come mixed, but the first foe of a wave is always an orc.
  for (let i = foes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [foes[i], foes[j]] = [foes[j], foes[i]];
  }
  foes.splice(foes.indexOf('orc'), 1);
  foes.unshift('orc');
  if (isBossWave(wave)) foes.push(bossOf(wave));
  return foes;
}

/**
 * A foe's full health in a wave, scaled by the hub's difficulty and the road's twist; a boss's is
 * spread over its bars.
 */
export function foeHp(kind: EnemyKind, wave: number, road: RoadId | null = null) {
  const type = ENEMIES[kind];
  const hp = Math.round(type.hp * hpScale(wave) * roadEffects(road).hp * byDifficulty(0.75, 1, 1.3));
  return type.boss ? hp * bossBars(wave) : hp;
}
