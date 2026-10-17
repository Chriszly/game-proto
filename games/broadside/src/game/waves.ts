import { HUNTER_BRIGS, MERCHANTS, type CourseId } from './courses';
import type { EnemyKind } from './ships';

/**
 * The ships a wave brings, in the order they come, on the `course` chosen for it: the Merchant
 * lane adds merchantmen, the Hunter patrol more brigs.
 */
export function waveShips(wave: number, course: CourseId | null = null): EnemyKind[] {
  const ships: EnemyKind[] = [];
  const sloops = 1 + wave;
  const brigs = (wave >= 3 ? Math.floor((wave - 1) / 2) : 0) + (course === 'hunter' ? HUNTER_BRIGS : 0);
  const galleons = wave >= 5 ? Math.floor((wave - 3) / 2) : 0;
  const fireships = wave >= 3 ? Math.floor(wave / 3) : 0;
  const ketches = wave >= 4 ? Math.floor((wave - 1) / 3) : 0;
  for (let i = 0; i < sloops; i++) ships.push('sloop');
  // The bigger ships come in among the sloops.
  for (let i = 0; i < brigs; i++) ships.splice(Math.min(ships.length, 1 + i * 2), 0, 'brig');
  for (let i = 0; i < galleons; i++) ships.splice(Math.min(ships.length, 2 + i * 3), 0, 'galleon');
  for (let i = 0; i < fireships; i++) ships.splice(Math.min(ships.length, 2 + i * 3), 0, 'fireship');
  for (let i = 0; i < ketches; i++) ships.splice(Math.min(ships.length, 3 + i * 4), 0, 'ketch');
  if (course === 'merchant') for (let i = 0; i < MERCHANTS; i++) ships.splice(Math.min(ships.length, 1 + i * 3), 0, 'merchant');
  // Every fifth wave the enemy's flagship comes last, once its fleet is engaged; at the pirate
  // haven it is the admiral's own.
  if (wave === HAVEN_WAVE) ships.push('admiral');
  else if (wave % 5 === 0) ships.push('flagship');
  return ships;
}

/** The wave of the pirate haven: three shore forts and the admiral. Sinking the admiral wins the campaign. */
export const HAVEN_WAVE = 20;
/** The first wave on which an island may carry a shore fort. */
export const FIRST_FORT_WAVE = 6;

/** How many islands carry a shore fort on `wave`: from wave 6 one, from wave 12 two, three at the haven. */
export function fortsFor(wave: number) {
  if (wave === HAVEN_WAVE) return 3;
  if (wave < FIRST_FORT_WAVE) return 0;
  return Math.min(2, 1 + Math.floor((wave - FIRST_FORT_WAVE) / 6));
}

/** Enemy ships get a little tougher every wave. */
export const hpScale = (wave: number) => 1 + 0.12 * (wave - 1);
