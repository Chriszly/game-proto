// The first playable version as data: each chapter is a strip of land and a list of events the
// scene's director runs one after another. No Phaser here; the text keys are in `i18n/en.ts`.

import type { TextKey } from '../i18n';
import type { FoeKind } from './forms';

export type ChapterId = 'hunt' | 'raid' | 'wake' | 'trail' | 'forest' | 'boss' | 'end';
export const CHAPTERS: ChapterId[] = ['hunt', 'raid', 'wake', 'trail', 'forest', 'boss', 'end'];

export type Speaker = 'bjarn' | 'father' | 'skarn' | 'ratatoskr' | 'torvald' | 'ulfgar' | 'sigrun';
export type NpcId = 'father' | 'skarn' | 'torvald' | 'sigrun' | 'warrior1' | 'warrior2' | 'ulfgarBody';
export type Theme = 'snow' | 'village' | 'fire' | 'dawn' | 'forest' | 'clearing';
export type ClueId = 'torn' | 'paws' | 'hut';
export type Line = [Speaker, TextKey];

/** A foe to spawn: at a place in the strip, or just off the edge of the screen on one side. */
export interface Spawn {
  kind: FoeKind;
  x?: number;
  side?: 'left' | 'right';
}

/**
 * One step of a chapter. The director starts it and waits until it is done:
 * - `say`: a dialog, which holds the world until every line is read;
 * - `hint`: a tutorial line under the HUD (empty text clears it), done at once;
 * - `reach`: until Bjarn walks past `x`;
 * - `wave`: spawns foes and, with `lock`, keeps Bjarn and the camera on this screen until they
 *   are beaten (`until: 'half'` stops when a boss is down to half its health instead);
 * - `clue`: a track to look at with E, then its lines;
 * - `herbs`: lays herbs on the ground, done at once;
 * - `hold`: Bjarn can't walk past `x` until the chapter ends, so he stays near a scene to come;
 * - `npc`, `npcTo`, `npcGone`: places a person, walks them to `x`, or takes them away (Bjarn
 *   stands still while someone walks, so the scene stays on screen);
 * - `script`: something only code can do (see `GameScene.runScript`);
 * - `toast`: a short message in the middle of the screen, done at once;
 * - `next`: on to the next chapter.
 */
export type Event =
  | { do: 'say'; lines: Line[] }
  | { do: 'hint'; text: TextKey | '' }
  | { do: 'reach'; x: number }
  | { do: 'wave'; foes: Spawn[]; lock?: boolean; until?: 'clear' | 'half' }
  | { do: 'clue'; id: ClueId; x: number; lines: Line[] }
  | { do: 'herbs'; xs: number[] }
  | { do: 'hold'; x: number }
  | { do: 'npc'; id: NpcId; x: number; facing?: 1 | -1 }
  | { do: 'npcTo'; id: NpcId; x: number }
  | { do: 'npcGone'; id: NpcId }
  | { do: 'script'; name: ScriptName }
  | { do: 'toast'; text: TextKey }
  | { do: 'next' };

export type ScriptName = 'fatherDies' | 'grief' | 'blackout' | 'wakeUp' | 'ratatoskr' | 'drill' | 'recipes' | 'giantWolf' | 'unlockShift' | 'ulfgarDown' | 'endCard';

export interface Chapter {
  id: ChapterId;
  title: TextKey;
  goal: TextKey;
  theme: Theme;
  /** The strip's width in pixels, and where Bjarn starts. */
  length: number;
  start: number;
  /** The tune while no foe is about: `calm` or `dark`; foes switch to `battle`, the boss to `boss`. */
  music: 'calm' | 'dark';
  events: Event[];
}

export const STORY: Record<ChapterId, Chapter> = {
  hunt: {
    id: 'hunt',
    title: 'huntTitle',
    goal: 'huntGoal',
    theme: 'snow',
    length: 2600,
    start: 120,
    music: 'calm',
    events: [
      { do: 'say', lines: [['bjarn', 'hunt1'], ['bjarn', 'hunt2']] },
      { do: 'hint', text: 'hintMove' },
      { do: 'reach', x: 600 },
      { do: 'hint', text: 'hintAttack' },
      { do: 'wave', foes: [{ kind: 'boar', side: 'right' }], lock: true },
      { do: 'hint', text: 'hintDefend' },
      { do: 'reach', x: 1300 },
      { do: 'wave', foes: [{ kind: 'boar', side: 'right' }, { kind: 'boar', side: 'left' }], lock: true },
      { do: 'hint', text: '' },
      { do: 'reach', x: 2100 },
      { do: 'say', lines: [['bjarn', 'hunt3']] },
      { do: 'reach', x: 2500 },
      { do: 'next' },
    ],
  },
  raid: {
    id: 'raid',
    title: 'raidTitle',
    goal: 'raidGoal',
    theme: 'fire',
    length: 2000,
    start: 120,
    music: 'dark',
    events: [
      { do: 'npc', id: 'father', x: 520, facing: -1 },
      { do: 'say', lines: [['father', 'raid1']] },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }], lock: true },
      { do: 'hint', text: 'hintRage' },
      { do: 'hold', x: 1380 },
      { do: 'reach', x: 900 },
      { do: 'npcTo', id: 'father', x: 1000 },
      { do: 'say', lines: [['father', 'raid2']] },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }, { kind: 'cultist', side: 'right' }], lock: true },
      { do: 'hint', text: '' },
      { do: 'npc', id: 'skarn', x: 1500, facing: -1 },
      { do: 'npcTo', id: 'skarn', x: 1250 },
      { do: 'say', lines: [['skarn', 'raid3'], ['father', 'raid4'], ['skarn', 'raid5']] },
      { do: 'script', name: 'fatherDies' },
      { do: 'say', lines: [['bjarn', 'raid6'], ['skarn', 'raid7']] },
      { do: 'npcTo', id: 'skarn', x: 2100 },
      { do: 'npcGone', id: 'skarn' },
      { do: 'script', name: 'grief' },
      { do: 'hint', text: 'hintGrief' },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }, { kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }], lock: true },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }], lock: true },
      { do: 'hint', text: '' },
      { do: 'script', name: 'blackout' },
      { do: 'next' },
    ],
  },
  wake: {
    id: 'wake',
    title: 'wakeTitle',
    goal: 'wakeGoal',
    theme: 'dawn',
    length: 1400,
    start: 260,
    music: 'calm',
    events: [
      { do: 'script', name: 'wakeUp' },
      { do: 'script', name: 'ratatoskr' },
      { do: 'say', lines: [['ratatoskr', 'wake1'], ['bjarn', 'wake2'], ['ratatoskr', 'wake3'], ['ratatoskr', 'wake4'], ['ratatoskr', 'wake5']] },
      { do: 'reach', x: 1300 },
      { do: 'next' },
    ],
  },
  trail: {
    id: 'trail',
    title: 'trailTitle',
    goal: 'trailGoal',
    theme: 'dawn',
    length: 3000,
    start: 120,
    music: 'calm',
    events: [
      { do: 'hint', text: 'hintTrail' },
      { do: 'clue', id: 'torn', x: 520, lines: [['bjarn', 'clueTorn1'], ['ratatoskr', 'clueTorn2']] },
      { do: 'clue', id: 'paws', x: 1000, lines: [['bjarn', 'cluePaws1'], ['ratatoskr', 'cluePaws2']] },
      { do: 'hint', text: '' },
      { do: 'reach', x: 1250 },
      { do: 'wave', foes: [{ kind: 'wolf', side: 'right' }, { kind: 'wolf', side: 'left' }], lock: true },
      { do: 'clue', id: 'hut', x: 1700, lines: [['bjarn', 'clueHut1'], ['bjarn', 'clueHut2']] },
      { do: 'npc', id: 'torvald', x: 2450, facing: -1 },
      { do: 'reach', x: 2250 },
      { do: 'say', lines: [['torvald', 'torvald1'], ['torvald', 'torvald2'], ['torvald', 'torvald3'], ['torvald', 'torvald4']] },
      { do: 'script', name: 'drill' },
      { do: 'say', lines: [['torvald', 'torvald5']] },
      { do: 'script', name: 'recipes' },
      { do: 'toast', text: 'toastRecipes' },
      { do: 'say', lines: [['torvald', 'torvald6']] },
      { do: 'reach', x: 2900 },
      { do: 'next' },
    ],
  },
  forest: {
    id: 'forest',
    title: 'forestTitle',
    goal: 'forestGoal',
    theme: 'forest',
    length: 3600,
    start: 120,
    music: 'dark',
    events: [
      { do: 'herbs', xs: [700, 1500, 2300, 3000] },
      { do: 'hint', text: 'hintHerbs' },
      { do: 'say', lines: [['ratatoskr', 'forest1']] },
      { do: 'reach', x: 600 },
      { do: 'hint', text: '' },
      { do: 'wave', foes: [{ kind: 'wolf', side: 'right' }, { kind: 'wolf', side: 'right' }], lock: true },
      { do: 'reach', x: 1400 },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }, { kind: 'wolf', side: 'right' }], lock: true },
      { do: 'say', lines: [['ratatoskr', 'forest2']] },
      { do: 'reach', x: 2300 },
      { do: 'wave', foes: [{ kind: 'cultist', side: 'right' }, { kind: 'wolf', side: 'left' }, { kind: 'cultist', side: 'right' }, { kind: 'wolf', side: 'right' }], lock: true },
      { do: 'say', lines: [['bjarn', 'forest3']] },
      { do: 'reach', x: 3500 },
      { do: 'next' },
    ],
  },
  boss: {
    id: 'boss',
    title: 'bossTitle',
    goal: 'bossGoal',
    theme: 'clearing',
    length: 1400,
    start: 200,
    music: 'dark',
    events: [
      { do: 'herbs', xs: [120, 1280] },
      { do: 'say', lines: [['ulfgar', 'boss1'], ['ulfgar', 'boss2']] },
      { do: 'wave', foes: [{ kind: 'ulfgar', x: 900 }, { kind: 'cultist', side: 'right' }, { kind: 'cultist', side: 'left' }], lock: true, until: 'half' },
      { do: 'say', lines: [['ulfgar', 'boss3']] },
      { do: 'script', name: 'giantWolf' },
      { do: 'say', lines: [['ratatoskr', 'boss4'], ['bjarn', 'boss5']] },
      { do: 'script', name: 'unlockShift' },
      { do: 'toast', text: 'toastShift' },
      { do: 'hint', text: 'hintShift' },
      { do: 'wave', foes: [], lock: true },
      { do: 'hint', text: '' },
      { do: 'script', name: 'ulfgarDown' },
      { do: 'say', lines: [['ulfgar', 'boss6']] },
      { do: 'toast', text: 'toastWolfTrail' },
      { do: 'next' },
    ],
  },
  end: {
    id: 'end',
    title: 'endTitle',
    goal: 'endGoal',
    theme: 'clearing',
    length: 1400,
    start: 500,
    music: 'calm',
    events: [
      { do: 'npc', id: 'ulfgarBody', x: 820, facing: -1 },
      { do: 'npc', id: 'sigrun', x: 1500, facing: -1 },
      { do: 'npc', id: 'warrior1', x: 1580, facing: -1 },
      { do: 'npc', id: 'warrior2', x: 1650, facing: -1 },
      { do: 'npcTo', id: 'sigrun', x: 760 },
      { do: 'npcTo', id: 'warrior1', x: 860 },
      { do: 'npcTo', id: 'warrior2', x: 940 },
      { do: 'say', lines: [['sigrun', 'end1'], ['sigrun', 'end2'], ['sigrun', 'end3'], ['bjarn', 'end4']] },
      { do: 'script', name: 'endCard' },
    ],
  },
};
