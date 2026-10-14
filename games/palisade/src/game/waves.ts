import { byDifficulty } from '../../../../shared/settings';
import { ENEMIES, type EnemyKind } from './enemies';

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
 * dark knights from wave 4, and a boss closes every tenth wave.
 */
export function waveFoes(wave: number): EnemyKind[] {
  const goblins = 2 + Math.floor(wave * 1.2);
  const orcs = 3 + Math.floor(wave * 0.9);
  const knights = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;
  const foes: EnemyKind[] = [
    ...Array<EnemyKind>(goblins).fill('goblin'),
    ...Array<EnemyKind>(orcs).fill('orc'),
    ...Array<EnemyKind>(knights).fill('knight'),
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

/** A foe's full health in a wave, scaled by the hub's difficulty; a boss's is spread over its bars. */
export function foeHp(kind: EnemyKind, wave: number) {
  const type = ENEMIES[kind];
  const hp = Math.round(type.hp * hpScale(wave) * byDifficulty(0.75, 1, 1.3));
  return type.boss ? hp * bossBars(wave) : hp;
}
