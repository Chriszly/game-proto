// The save: which chapter Bjarn reached and what he has learned. A fall or a reload starts that
// chapter over from its beginning.

import { CHAPTERS, type ChapterId } from './story';

export const SAVE_KEY = 'bearclaw-saga-save';

export interface SaveState {
  chapter: ChapterId;
  /** Torvald's recipes: herbs heal more. */
  recipes: boolean;
  /** Bjarn can call the hybrid at will (from the wolf fight on). */
  shift: boolean;
  /** How often Bjarn fell, and how many foes he beat, over the whole run. */
  falls: number;
  kills: number;
}

export function newSave(): SaveState {
  return { chapter: 'hunt', recipes: false, shift: false, falls: 0, kills: 0 };
}

export function loadSave(): SaveState {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!raw || !CHAPTERS.includes(raw.chapter)) return newSave();
    return { ...newSave(), ...raw };
  } catch {
    return newSave();
  }
}

export function writeSave(state: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Private windows may refuse storage; the run goes on unsaved.
  }
}
