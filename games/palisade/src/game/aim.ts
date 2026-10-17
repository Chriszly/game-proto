import { ENEMIES } from './enemies';
import type { Enemy } from './state';
import type { TextKey } from '../i18n';

// Aim priority: who the ranger's arrows (and lightning) go at first. Nearest is how the game
// always shot; the toggle beside the caltrops button cycles through the rest.

export type AimMode = 'nearest' | 'strongest' | 'flyers' | 'healers';

export const AIM_MODES: AimMode[] = ['nearest', 'strongest', 'flyers', 'healers'];

export const AIMS: Record<AimMode, { name: TextKey; text: TextKey }> = {
  nearest: { name: 'nearestName', text: 'nearestText' },
  strongest: { name: 'strongestName', text: 'strongestText' },
  flyers: { name: 'flyersName', text: 'flyersText' },
  healers: { name: 'healersName', text: 'healersText' },
};

/** The foe after `mode` in the cycle. */
export const nextAim = (mode: AimMode) => AIM_MODES[(AIM_MODES.indexOf(mode) + 1) % AIM_MODES.length];

/** Sorts foes in view by the aim priority; the nearest first breaks every tie. */
export function sortTargets(foes: Enemy[], mode: AimMode) {
  const byX = (a: Enemy, b: Enemy) => a.x - b.x;
  if (mode === 'strongest') return foes.sort((a, b) => b.maxHp - a.maxHp || byX(a, b));
  if (mode === 'flyers') return foes.sort((a, b) => Number(!!ENEMIES[b.kind].flying) - Number(!!ENEMIES[a.kind].flying) || byX(a, b));
  if (mode === 'healers') return foes.sort((a, b) => Number(!!ENEMIES[b.kind].healer) - Number(!!ENEMIES[a.kind].healer) || byX(a, b));
  return foes.sort(byX);
}
