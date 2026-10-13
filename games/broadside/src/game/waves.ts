import type { EnemyKind } from './ships';

/** The ships a wave brings, in the order they come. */
export function waveShips(wave: number): EnemyKind[] {
  const ships: EnemyKind[] = [];
  const sloops = 1 + wave;
  const brigs = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  const galleons = wave >= 5 ? Math.floor((wave - 3) / 2) : 0;
  for (let i = 0; i < sloops; i++) ships.push('sloop');
  // The bigger ships come in among the sloops.
  for (let i = 0; i < brigs; i++) ships.splice(Math.min(ships.length, 1 + i * 2), 0, 'brig');
  for (let i = 0; i < galleons; i++) ships.splice(Math.min(ships.length, 2 + i * 3), 0, 'galleon');
  return ships;
}

/** Enemy ships get a little tougher every wave. */
export const hpScale = (wave: number) => 1 + 0.12 * (wave - 1);
