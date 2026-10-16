import { ENEMIES } from './enemies';
import type { Enemy } from './state';

// Aim priority: who the ranger's arrows (and lightning) go at first. Nearest is how the game
// always shot; the toggle beside the caltrops button cycles through the rest.

export type AimMode = 'nearest' | 'strongest' | 'flyers' | 'healers';

export const AIM_MODES: AimMode[] = ['nearest', 'strongest', 'flyers', 'healers'];

export const AIMS: Record<AimMode, { name: string; text: string }> = {
  nearest: { name: 'Nearest', text: 'The foe nearest the barricade first' },
  strongest: { name: 'Strongest', text: 'The foe with the most health first' },
  flyers: { name: 'Flyers', text: 'Harpies first, then the nearest' },
  healers: { name: 'Healers', text: 'Shamans first, then the nearest' },
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
